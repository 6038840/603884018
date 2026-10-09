/* 项目指标详情页：基本信息 + 清单明细 */
(function () {
  const D = window.DATA, K = window.KB;
  K.renderFrame();
  const root = K.$("#page-content");

  const pid = K.qs("id") || D.projects[0].projectId;
  const p = D.projMap[pid];
  if (!p) { root.innerHTML = '<div class="table-card" style="padding:60px;text-align:center;color:#a8b3c5">项目不存在</div>'; return; }
  const myFx = D.quarters.map(q => D.fx.find(f => f.projectId === pid && f.quarter === q)).filter(Boolean);
  const state = { quarter: K.qs("quarter") || "2026年2季度", feeType: "", dim: "", kw: "", pg: { page: 1, size: 20 } };
  const curFx = myFx.find(f => f.quarter === state.quarter) || myFx[myFx.length - 1];

  root.innerHTML = `
    <div class="filter-bar">
      <button class="btn btn-default" id="btn-back">← 返回</button>
      <b style="font-size:15px">${p.projectName}</b>
      <span class="tag gray">${p.stage}</span>
      <span class="tag gray">${p.delay ? "延期" : "正常"}</span>
    </div>

    <div class="table-card" style="padding:16px">
      <div class="sec-title" style="margin-top:0">基本信息</div>
      <div class="desc">
        <div class="d-item"><span class="k">项目名称</span><span class="v">${p.projectName}</span></div>
        <div class="d-item"><span class="k">项目ID</span><span class="v">${p.projectId}</span></div>
        <div class="d-item"><span class="k">项目编码</span><span class="v">${p.projectCode}</span></div>
        <div class="d-item"><span class="k">标准项目编码</span><span class="v">${p.stdCode}</span></div>
        <div class="d-item"><span class="k">合同ID</span><span class="v">${p.contractId}</span></div>
        <div class="d-item"><span class="k">合同名称</span><span class="v">${p.contractName}</span></div>
        <div class="d-item"><span class="k">工程类型</span><span class="v">${p.engType}</span></div>
        <div class="d-item"><span class="k">项目规模</span><span class="v">${p.scale}</span></div>
        <div class="d-item"><span class="k">工程状态</span><span class="v">${p.engStatus}</span></div>
        <div class="d-item"><span class="k">商务状态</span><span class="v">${p.bizStatus}</span></div>
        <div class="d-item"><span class="k">实际开工时间</span><span class="v">${p.startDate}</span></div>
        <div class="d-item"><span class="k">自行施工金额(含税)</span><span class="v">${K.fmtAmt(p.selfBuildAmt)}</span></div>
        <div class="d-item"><span class="k">本期累计自施合同收入(不含税)</span><span class="v">${K.fmtAmt(curFx.income)}</span></div>
        <div class="d-item"><span class="k">项目管理平均人数</span><span class="v">${curFx.mgrCount} 人</span></div>
        <div class="d-item"><span class="k">所属组织</span><span class="v">${p.orgPath}</span></div>
      </div>
    </div>

    <div class="table-card" style="margin-top:12px">
      <div class="table-head">
        <span class="table-title">清单明细</span>
        <div class="table-ops">
          <div class="filter-item"><label>季度</label><div id="f-quarter"></div></div>
          <div class="filter-item"><label>费用类型</label><div id="f-fee"></div></div>
          <div class="filter-item"><label>分析维度</label><div id="f-dim"></div></div>
          <div class="filter-item"><div class="sel"><div class="sel-head" style="padding:0"><input id="f-kw" placeholder="清单名称/编码搜索" style="border:none;outline:none;height:28px;padding:0 8px;width:150px"></div></div></div>
          <button class="btn btn-default" id="btn-exp2">⭳ 导出清单</button>
        </div>
      </div>
      <div class="table-wrap" id="mx-wrap"></div>
      <div class="pager" id="mx-pager"></div>
    </div>`;

  K.$("#btn-back").onclick = () => history.back();

  /* ---------- 清单明细 ---------- */
  const curRows = () => D.mx.filter(r => r.fxId === curFx.fxId);
  const feeOpts = [{ v: "", t: "全部" }, ...[...new Set(curRows().map(r => r.fee))].map(o => ({ v: o, t: o }))];
  const dimOpts = [{ v: "", t: "全部" }, ...[...new Set(curRows().map(r => r.dim))].map(o => ({ v: o, t: o }))];
  K.dropdown(K.$("#f-quarter"), { options: D.quarters.map(q => ({ v: q, t: q })), value: curFx.quarter, onChange: v => { state.quarter = v; state.pg.page = 1; renderMx(); } });
  K.dropdown(K.$("#f-fee"), { options: feeOpts, value: "", onChange: v => { state.feeType = v; state.pg.page = 1; renderMx(); } });
  K.dropdown(K.$("#f-dim"), { options: dimOpts, value: "", onChange: v => { state.dim = v; state.pg.page = 1; renderMx(); } });
  K.$("#f-kw").oninput = (e) => { state.kw = e.target.value.trim(); state.pg.page = 1; renderMx(); };

  function mxRows() {
    const f = D.fx.find(x => x.projectId === pid && x.quarter === state.quarter);
    if (!f) return [];
    return D.mx.filter(r => r.fxId === f.fxId
      && (!state.feeType || r.fee === state.feeType)
      && (!state.dim || r.dim === state.dim)
      && (!state.kw || r.name.includes(state.kw) || r.code.includes(state.kw)));
  }
  function renderMx() {
    const rows = mxRows();
    const { page, size } = state.pg;
    const list = rows.slice((page - 1) * size, page * size);
    const sum = rows.reduce((s, r) => ({ t: s.t + r.target, a: s.a + r.actual, st: s.st + r.settle }), { t: 0, a: 0, st: 0 });
    K.$("#mx-wrap").innerHTML = `<table class="grid blue-head"><thead><tr>
      <th>序号</th><th>清单编码</th><th>清单名称</th><th>费用类型名称</th><th>分析维度</th><th>成本归口名称</th><th>计量单位</th>
      <th>累计目标成本合价</th><th>三同步后累计实际成本</th><th>累计结算数据金额</th><th>三同步口径差异</th></tr></thead><tbody>
      ${list.map((r, i) => `<tr><td>${(page - 1) * size + i + 1}</td><td>${r.code}</td><td style="text-align:left">${r.name}</td><td>${r.fee}</td><td>${r.dim}</td><td>${r.gb}</td><td>${r.unit}</td>
        <td class="num">${K.fmtAmt(r.target)}</td><td class="num">${K.fmtAmt(r.actual)}</td><td class="num">${K.fmtAmt(r.settle)}</td>
        <td class="num">${K.fmtAmt(r.actual - r.settle)}</td></tr>`).join("")}
      <tr class="total"><td colspan="7">合计（当前筛选 ${rows.length} 条）</td><td class="num">${K.fmtAmt(sum.t)}</td><td class="num">${K.fmtAmt(sum.a)}</td><td class="num">${K.fmtAmt(sum.st)}</td><td class="num">${K.fmtAmt(sum.a - sum.st)}</td></tr>
      </tbody></table>
      ${!rows.length ? '<div style="padding:30px;text-align:center;color:#a8b3c5">无匹配清单</div>' : ""}`;
    K.pager(K.$("#mx-pager"), rows.length, state.pg, renderMx);
  }

  /* ---------- 导出 ---------- */
  K.$("#btn-exp2").onclick = () => {
    const rows = mxRows();
    const txt = rows.map(r => [r.code, r.name, r.fee, r.dim, r.gb, r.unit, r.target, r.actual, r.settle].join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿清单编码,清单名称,费用类型名称,分析维度,成本归口名称,计量单位,累计目标成本合价,三同步后累计实际成本,累计结算数据金额\n" + txt], { type: "text/csv" }));
    a.download = `${p.projectName}_${state.quarter}_清单.csv`; a.click(); K.toast("已导出清单");
  };

  renderMx();
})();
