/* 页面2：专项分析指标（按季度）— E列结果指标 + H列分子分母，层层穿透 */
(function () {
  const D = window.DATA, K = window.KB;
  K.renderFrame();
  const root = K.$("#page-content");

  const state = {
    quarter: K.qs("quarter") || "2026年2季度",
    engType: null, scales: [], stages: [], projects: [],
    tab: K.qs("tab") === "project" ? "project" : "org",
    fields: new Set(D.indicators.map(i => i.key)),
    expanded: new Set(),
    pg: { page: 1, size: 20 },
  };

  root.innerHTML = `
    <div class="filter-bar">
      <div class="filter-item"><label><span class="req">*</span>季度</label><div id="f-quarter"></div></div>
      <div class="filter-item"><label>工程类型</label><div id="f-eng"></div></div>
      <div class="filter-item"><label>项目规模</label><div id="f-scale"></div></div>
      <div class="filter-item"><label>建设阶段</label><div id="f-stage"></div></div>
      <div class="filter-item"><label>项目名称</label><div id="f-proj"></div></div>
      <div class="reset-wrap"><button class="btn btn-default" id="f-reset">重 置</button></div>
    </div>
    <div class="table-card">
      <div class="tabs">
        <span class="tab" data-tab="org">按组织汇总</span>
        <span class="tab" data-tab="project">项目明细</span>
      </div>
      <div class="table-head">
        <span class="table-title">专项分析项目季度指标情况<span class="q" title="每个指标展示【分子/分母/指标值】三列；蓝色指标值可点击下钻到分子清单明细">?</span></span>
        <div class="table-ops">
          <button class="btn btn-default" id="btn-export">⭳ 导出</button>
          <div id="field-sel" style="position:relative"></div>
        </div>
      </div>
      <div class="table-wrap" id="tbl-wrap"></div>
      <div class="pager" id="tbl-pager"></div>
    </div>`;

  /* ---------- 筛选器 ---------- */
  const ddQ = K.dropdown(K.$("#f-quarter"), { options: D.quarters.map(q => ({ v: q, t: q })), value: state.quarter, onChange: v => { state.quarter = v; render(); } });
  const ddEng = K.dropdown(K.$("#f-eng"), { options: [...new Set(D.projects.map(p => p.engType))].map(o => ({ v: o, t: o })), placeholder: "房屋建设项目", onChange: v => { state.engType = v; render(); } });
  const ddScale = K.dropdown(K.$("#f-scale"), { options: [...new Set(D.projects.map(p => p.scale))].map(o => ({ v: o, t: o })), multiple: true, placeholder: "请选择（多选）", onChange: v => { state.scales = v; render(); } });
  const ddStage = K.dropdown(K.$("#f-stage"), { options: [...new Set(D.projects.map(p => p.stage))].map(o => ({ v: o, t: o })), multiple: true, placeholder: "请选择（多选）", onChange: v => { state.stages = v; render(); } });
  const ddProj = K.dropdown(K.$("#f-proj"), { options: D.projects.map(p => ({ v: p.projectId, t: p.projectName })), multiple: true, placeholder: "请选择（多选）", onChange: v => { state.projects = v; render(); } });
  K.$("#f-reset").onclick = () => {
    Object.assign(state, { quarter: "2026年2季度", engType: null, scales: [], stages: [], projects: [] });
    ddQ.set(state.quarter); ddEng.set(null); ddScale.set([]); ddStage.set([]); ddProj.set([]);
    state.pg.page = 1; render(); K.toast("筛选条件已重置");
  };

  /* ---------- 已选字段 ---------- */
  function renderFieldSel() {
    const el = K.$("#field-sel");
    const nLeaf = selInds().length * 3;
    el.className = "sel";
    el.innerHTML = `<div class="sel-head" style="min-width:110px">已选字段(${(state.tab === "org" ? 2 : 9) + nLeaf})</div>
      <div class="sel-pop" style="right:0;left:auto;min-width:240px">
        <div class="sel-actions"><span data-a="all">全选</span><span data-a="clear">清空</span></div>
        ${D.indicators.map(i => `<div class="sel-opt ${state.fields.has(i.key) ? "checked" : ""}" data-v="${i.key}">
          <input type="checkbox" ${state.fields.has(i.key) ? "checked" : ""}>【${i.cat}】${i.name}</div>`).join("")}
      </div>`;
    el.querySelector(".sel-head").onclick = (e) => { e.stopPropagation(); el.classList.toggle("open"); };
    el.querySelectorAll(".sel-opt").forEach(o => o.onclick = (e) => {
      e.stopPropagation();
      const k = o.dataset.v;
      state.fields.has(k) ? state.fields.delete(k) : state.fields.add(k);
      renderFieldSel(); renderTable();
    });
    el.querySelector('[data-a="all"]').onclick = (e) => { e.stopPropagation(); state.fields = new Set(D.indicators.map(i => i.key)); renderFieldSel(); renderTable(); };
    el.querySelector('[data-a="clear"]').onclick = (e) => { e.stopPropagation(); state.fields.clear(); renderFieldSel(); renderTable(); };
    document.addEventListener("click", () => el.classList.remove("open"));
  }
  const selInds = () => D.indicators.filter(i => state.fields.has(i.key));

  /* ---------- 数据过滤 ---------- */
  function filteredFx() {
    return K.fxByQuarter(state.quarter).filter(f => {
      const p = D.projMap[f.projectId];
      if (state.engType && p.engType !== state.engType) return false;
      if (state.scales.length && !state.scales.includes(p.scale)) return false;
      if (state.stages.length && !state.stages.includes(p.stage)) return false;
      if (state.projects.length && !state.projects.includes(p.projectId)) return false;
      return true;
    });
  }

  /* ---------- 指标三列：分子(黑) / 分母(黑) / 指标值(蓝,可下钻) ---------- */
  function indCells(fids, key, ctx) {
    const ind = D.indicators.find(i => i.key === key);
    const v = K.indAgg(fids, key);
    return `<td class="num">${K.fmtAmt(v.num)}</td>
      <td class="num">${K.fmtDen(ind, v)}</td>
      <td class="num drill" data-ctx="${ctx}" data-key="${key}">${K.fmtVal(ind, v)}</td>`;
  }
  function groupHead() {
    const fixed = state.tab === "org" ? 2 : 9;
    return `<tr class="grp"><th colspan="${fixed}">项目/组织</th>${selInds().map(i => `<th colspan="3">${i.name}</th>`).join("")}</tr>`;
  }
  function subHead(cols) {
    return `<tr>${cols.map(c => `<th>${c}</th>`).join("")}${selInds().map(i => K.subCols(i).map(c => `<th>${c.t}</th>`).join("")).join("")}</tr>`;
  }

  /* ---------- Tab1：按组织汇总（组织下钻） ---------- */
  function buildTree(fxs) {
    const t = {};
    fxs.forEach(f => {
      const p = D.projMap[f.projectId];
      (t[p.org2] = t[p.org2] || {})[p.org3] = t[p.org2][p.org3] || {};
      t[p.org2][p.org3][p.org4] = t[p.org2][p.org3][p.org4] || [];
      t[p.org2][p.org3][p.org4].push(f);
    });
    return t;
  }
  function renderOrg(fxs) {
    const inds = selInds();
    const tree = buildTree(fxs);
    let rows = "", seq = 0;
    const allFids = fxs.map(f => f.fxId);
    function orgRow(level, name, fids, key, hasChild) {
      const open = state.expanded.has(key);
      const arrow = hasChild ? `<span class="exp-arrow ${open ? "open" : ""}" data-exp="${key}">▶</span>` : `<span style="display:inline-block;width:14px"></span>`;
      return `<tr class="lv${level}">
        ${level === 1 ? `<td>${++seq}</td>` : `<td></td>`}
        <td class="org-cell" style="text-align:left">${arrow}<span ${hasChild ? `data-exp="${key}" style="cursor:pointer"` : ""}>${name}</span></td>
        ${inds.map(i => indCells(fids, i.key, key)).join("")}</tr>`;
    }
    for (const [o2, l2] of Object.entries(tree)) {
      const f2 = Object.values(l2).flatMap(o3 => Object.values(o3).flat());
      rows += orgRow(1, o2, f2.map(f => f.fxId), "o2:" + o2, true);
      if (state.expanded.has("o2:" + o2)) for (const [o3, l3] of Object.entries(l2)) {
        const f3 = Object.values(l3).flat();
        rows += orgRow(2, o3, f3.map(f => f.fxId), "o3:" + o2 + o3, true);
        if (state.expanded.has("o3:" + o2 + o3)) for (const [o4, flist] of Object.entries(l3)) {
          rows += orgRow(3, o4, flist.map(f => f.fxId), "o4:" + o2 + o3 + o4, true);
          if (state.expanded.has("o4:" + o2 + o3 + o4)) flist.forEach(f => {
            const p = D.projMap[f.projectId];
            rows += `<tr class="lv4"><td></td>
              <td class="org-cell link" style="text-align:left" data-proj="${p.projectId}">${p.projectName}</td>
              ${inds.map(i => indCells([f.fxId], i.key, "fx:" + f.fxId)).join("")}</tr>`;
          });
        }
      }
    }
    rows += `<tr class="total"><td>${++seq}</td><td style="text-align:left">总计</td>${inds.map(i => indCells(allFids, i.key, "total")).join("")}</tr>`;
    return `<table class="grid"><thead>${groupHead()}${subHead(["序号", "公司"])}</thead><tbody>${rows}</tbody></table>`;
  }

  /* ---------- Tab2：项目明细 ---------- */
  const PJ_COLS = ["序号", "公司", "分公司", "城市公司", "项目ID", "标准项目编码", "项目名称", "开累成本分析编号", "工程类型"];
  function renderProj(fxs) {
    const inds = selInds();
    const { page, size } = state.pg;
    const list = fxs.slice((page - 1) * size, page * size);
    let rows = list.map((f, i) => {
      const p = D.projMap[f.projectId];
      return `<tr>
        <td>${(page - 1) * size + i + 1}</td><td>${p.org2}</td><td>${p.org3}</td><td>${p.org4}</td>
        <td>${p.projectId.replace("PRJ-", "100001")}</td><td>${p.stdCode}</td>
        <td class="link" data-proj="${p.projectId}" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${p.projectName}</td>
        <td>${f.fxId}</td><td>${p.engType}</td>
        ${inds.map(ind => indCells([f.fxId], ind.key, "fx:" + f.fxId)).join("")}</tr>`;
    }).join("");
    const allFids = fxs.map(f => f.fxId);
    rows += `<tr class="total"><td>${fxs.length + 1}</td><td>总计</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
      ${inds.map(i => indCells(allFids, i.key, "total")).join("")}</tr>`;
    return `<table class="grid"><thead>${groupHead()}${subHead(PJ_COLS)}</thead><tbody>${rows}</tbody></table>`;
  }

  /* ---------- 渲染 & 交互 ---------- */
  function renderTable() {
    const fxs = filteredFx();
    K.$("#tbl-wrap").innerHTML = state.tab === "org" ? renderOrg(fxs) : renderProj(fxs);
    K.$("#tbl-pager").style.display = state.tab === "project" ? "flex" : "none";
    if (state.tab === "project") K.pager(K.$("#tbl-pager"), fxs.length, state.pg, renderTable);

    K.$$("#tbl-wrap [data-exp]").forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      const k = el.dataset.exp;
      state.expanded.has(k) ? state.expanded.delete(k) : state.expanded.add(k);
      renderTable();
    });
    K.$$("#tbl-wrap [data-proj]").forEach(el => el.onclick = (e) => {
      e.stopPropagation();
      location.href = `project.html?id=${el.dataset.proj}&quarter=${encodeURIComponent(state.quarter)}`;
    });
    /* 蓝色指标值下钻：项目级→分子清单弹窗；组织级→跳到该组织项目明细 */
    K.$$("#tbl-wrap td.drill").forEach(el => el.onclick = () => {
      const ctx = el.dataset.ctx, key = el.dataset.key;
      if (ctx.startsWith("fx:")) openNumModal(ctx.slice(3), key);
      else if (ctx !== "total") {
        state.projects = collectCtxFids(ctx).map(fid => D.fxMap[fid].projectId);
        ddProj.set(state.projects);
        state.tab = "project"; state.pg.page = 1;
        render(); K.toast("已下钻到该组织的项目明细");
      }
    });
  }
  function collectCtxFids(ctx) {
    return filteredFx().filter(f => {
      const p = D.projMap[f.projectId];
      if (ctx.startsWith("o2:")) return "o2:" + p.org2 === ctx;
      if (ctx.startsWith("o3:")) return "o3:" + p.org2 + p.org3 === ctx;
      if (ctx.startsWith("o4:")) return "o4:" + p.org2 + p.org3 + p.org4 === ctx;
      return false;
    }).map(f => f.fxId);
  }

  /* ---------- 分子清单明细弹窗（指标值下钻到底） ---------- */
  function openNumModal(fxId, key) {
    const f = D.fxMap[fxId], p = D.projMap[f.projectId];
    const ind = D.indicators.find(i => i.key === key);
    const v = K.indVal(fxId, key);
    const rows = K.mxNumRows(fxId, key);
    const infoBar = `<div class="m-info">
      <span class="it">项目名称<b>${p.projectName}</b></span>
      <span class="it">分析期次<b>${f.quarter}</b></span>
      <span class="it">指标<b>【${ind.cat}】${ind.name}</b></span>
      <span class="it">计算公式<b>${ind.numName} ÷ ${ind.denName}${ind.unit === "%" ? " ×100%" : ""}</b></span>
      <span class="it">分子<b>${K.fmtAmt(v.num)}</b></span>
      <span class="it">分母<b>${K.fmtDen(ind, v)}</b></span>
      <span class="it">指标值<b style="color:#2f6bff">${K.fmtVal(ind, v)}${ind.unit === "%" ? "" : " " + ind.unit}</b></span>
    </div>`;
    if (rows === null) {
      const m = K.modal(`取数说明 — ${ind.name}`, infoBar + `
        <div style="padding:8px 4px;line-height:2">
          <b>该指标的分子分母均为项目级取数，无清单级明细：</b><br>
          分子「${ind.numName}」：经济活动分析 → 开累成本分析 → 合同收入计算（第二步）→ 基本信息【本期累计自施合同收入(不含税)】<br>
          分母「${ind.denName}」：经济活动分析 → 开累成本分析 → 成本对比分析（第六步）→ 指标基础信息【平均管理人数】（手工录入）
        </div>`, `<button class="btn btn-primary" id="m-ok">关 闭</button>`);
      m.querySelector("#m-ok").onclick = () => m.classList.remove("show");
      return;
    }
    const sum = rows.reduce((s, r) => ({ t: s.t + r.target, a: s.a + r.actual, st: s.st + r.settle }), { t: 0, a: 0, st: 0 });
    const body = infoBar + `
      <div class="sec-sub" style="margin-top:0">分子取数清单（${rows.length} 条）</div>
      <table class="grid blue-head"><thead><tr>
        <th>序号</th><th>清单编码</th><th>清单名称</th><th>费用类型名称</th><th>分析维度</th><th>成本归口名称</th><th>计量单位</th>
        <th>累计目标成本合价</th><th>三同步后累计实际成本</th><th>累计结算数据金额</th>
      </tr></thead><tbody>
        ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.code}</td><td style="text-align:left">${r.name}</td><td>${r.fee}</td><td>${r.dim}</td><td>${r.gb}</td><td>${r.unit}</td>
          <td class="num">${K.fmtAmt(r.target)}</td><td class="num">${K.fmtAmt(r.actual)}</td><td class="num">${K.fmtAmt(r.settle)}</td></tr>`).join("")}
        <tr class="total"><td colspan="7">合计</td><td class="num">${K.fmtAmt(sum.t)}</td><td class="num">${K.fmtAmt(sum.a)}</td><td class="num">${K.fmtAmt(sum.st)}</td></tr>
      </tbody></table>
      ${!rows.length ? '<div style="padding:30px;text-align:center;color:#a8b3c5">本期次该指标分子下无清单数据</div>' : ""}`;
    const m = K.modal(`清单明细 — ${ind.name}（分子：${ind.numName}）`, body,
      `<button class="btn btn-default" id="m-exp">⭳ 导出明细</button><button class="btn btn-primary" id="m-ok">关 闭</button>`);
    m.querySelector("#m-ok").onclick = () => m.classList.remove("show");
    m.querySelector("#m-exp").onclick = () => {
      const txt = rows.map(r => [r.code, r.name, r.fee, r.dim, r.gb, r.unit, r.target, r.actual, r.settle].join(",")).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["﻿清单编码,清单名称,费用类型名称,分析维度,成本归口名称,计量单位,累计目标成本合价,三同步后累计实际成本,累计结算数据金额\n" + txt], { type: "text/csv" }));
      a.download = `${p.projectName}_${f.quarter}_${ind.name}_分子清单.csv`; a.click();
      K.toast("已导出分子清单明细");
    };
  }

  /* ---------- 导出 CSV ---------- */
  K.$("#btn-export").onclick = () => {
    const fxs = filteredFx();
    const head = ["项目ID", "标准项目编码", "项目名称", "公司", "分公司", "城市公司", "工程类型", "分析期次"];
    selInds().forEach(i => head.push(`${i.numName}`, `${i.denName}`, `${i.name}`));
    const lines = fxs.map(f => {
      const p = D.projMap[f.projectId];
      const cols = [p.projectId, p.stdCode, p.projectName, p.org2, p.org3, p.org4, p.engType, f.quarter];
      selInds().forEach(i => { const v = K.indVal(f.fxId, i.key); cols.push(v.num, v.den, v.value === null ? "" : v.value); });
      return cols.join(",");
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + head.join(",") + "\n" + lines.join("\n")], { type: "text/csv" }));
    a.download = `专项分析季度指标_${state.quarter}.csv`; a.click();
    K.toast("已导出当前筛选结果");
  };

  /* ---------- 渲染入口 ---------- */
  function render() {
    K.$$(".tabs .tab").forEach(t => {
      t.classList.toggle("active", t.dataset.tab === state.tab);
      t.onclick = () => { state.tab = t.dataset.tab; state.pg.page = 1; render(); };
    });
    renderFieldSel(); renderTable();
  }
  render();
})();
