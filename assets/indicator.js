/* 专项指标项目明细（全景图卡片下钻页）：分子/分母/指标值三列 × 10指标，蓝头宽表，合并单元格，总计，分页 */
(function () {
  const D = window.DATA, K = window.KB;
  K.renderFrame();
  const root = K.$("#page-content");

  const state = {
    key: K.qs("key") || "machine",
    quarter: K.qs("quarter") || null,
    pg: { page: 1, size: 20 },
  };

  root.innerHTML = `
    <div class="filter-bar">
      <button class="btn btn-default" id="btn-back">← 返回全景图</button>
      <div class="filter-item"><label>季度</label><div id="f-quarter"></div></div>
      <div class="filter-item"><label>当前指标</label><div id="f-ind"></div></div>
      <span style="color:#a8b3c5">蓝色指标值可下钻到分子清单明细；点击项目名称查看项目指标详情</span>
      <div class="reset-wrap"><button class="btn btn-default" id="btn-export">⭳ 导出</button></div>
    </div>
    <div class="table-card">
      <div class="table-head"><span class="table-title">专项指标项目明细</span></div>
      <div class="table-wrap" id="tbl-wrap"></div>
      <div class="pager" id="tbl-pager"></div>
    </div>`;

  K.$("#btn-back").onclick = () => (location.href = "panorama.html");
  const ddQ = K.dropdown(K.$("#f-quarter"), {
    options: [{ v: "", t: "全部季度" }, ...D.quarters.map(q => ({ v: q, t: q }))],
    value: state.quarter || "", onChange: v => { state.quarter = v || null; state.pg.page = 1; renderTable(); },
  });
  K.dropdown(K.$("#f-ind"), {
    options: D.indicators.map(i => ({ v: i.key, t: `【${i.cat}】${i.name}` })),
    value: state.key, onChange: v => { state.key = v; state.pg.page = 1; renderTable(); },
  });

  function rows() {
    let list = state.quarter ? K.fxByQuarter(state.quarter) : D.fx.slice();
    const order = {}; D.quarters.forEach((q, i) => (order[q] = i));
    return list.sort((a, b) => {
      const pa = D.projMap[a.projectId], pb = D.projMap[b.projectId];
      return (pa.org2 + pa.org3 + pa.org4).localeCompare(pb.org2 + pb.org3 + pb.org4, "zh")
        || pa.projectId.localeCompare(pb.projectId) || order[a.quarter] - order[b.quarter];
    });
  }

  function cellHtml(fid, ind) {
    const v = K.indVal(fid, ind.key);
    return `<td class="num">${K.fmtAmt(v.num)}</td>
      <td class="num">${K.fmtDen(ind, v)}</td>
      <td class="num drill" data-fx="${fid}" data-key="${ind.key}">${K.fmtVal(ind, v)}</td>`;
  }

  function renderTable() {
    const list = rows();
    const { page, size } = state.pg;
    const pageRows = list.slice((page - 1) * size, page * size);
    const inds = D.indicators;

    /* 公司/分公司 rowspan */
    const rs = pageRows.map(() => ({ o2: 1, o3: 1 }));
    for (let i = 0; i < pageRows.length; i++) {
      const p = D.projMap[pageRows[i].projectId];
      if (i > 0) {
        const prev = D.projMap[pageRows[i - 1].projectId];
        if (prev.org2 === p.org2) {
          rs[i].o2 = 0;
          for (let j = i - 1; ; j--) { if (rs[j].o2 > 0) { rs[j].o2++; break; } }
          if (prev.org3 === p.org3) {
            rs[i].o3 = 0;
            for (let j = i - 1; ; j--) { if (rs[j].o3 > 0) { rs[j].o3++; break; } }
          }
        }
      }
    }

    const body = pageRows.map((f, i) => {
      const p = D.projMap[f.projectId];
      return `<tr>
        <td>${(page - 1) * size + i + 1}</td>
        ${rs[i].o2 ? `<td rowspan="${rs[i].o2}">${p.org2}</td>` : ""}
        ${rs[i].o3 ? `<td rowspan="${rs[i].o3}">${p.org3}</td>` : ""}
        <td>${f.quarter}</td>
        <td class="link" data-proj="${p.projectId}" data-q="${f.quarter}" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${p.projectName}</td>
        ${inds.map(ind => cellHtml(f.fxId, ind)).join("")}</tr>`;
    }).join("");

    const allFids = list.map(f => f.fxId);
    const total = `<tr class="total"><td>${list.length + 1}</td><td>总计</td><td>-</td><td>-</td><td>-</td>
      ${inds.map(ind => {
        const v = K.indAgg(allFids, ind.key);
        return `<td class="num">${K.fmtAmt(v.num)}</td><td class="num">${K.fmtDen(ind, v)}</td><td class="num">${K.fmtVal(ind, v)}</td>`;
      }).join("")}</tr>`;

    const grpHead = `<tr class="grp"><th colspan="5">项目</th>${inds.map(i => `<th colspan="3">${i.name}</th>`).join("")}</tr>`;
    const subHead = `<tr><th>序号</th><th>公司</th><th>分公司</th><th>分析周期</th><th>项目名称</th>
      ${inds.map(i => K.subCols(i).map(c => `<th>${c.t}</th>`).join("")).join("")}</tr>`;

    K.$("#tbl-wrap").innerHTML = `<table class="grid blue-head"><thead>${grpHead}${subHead}</thead><tbody>${body}${total}</tbody></table>`;
    K.pager(K.$("#tbl-pager"), list.length, state.pg, renderTable);

    K.$$("#tbl-wrap [data-proj]").forEach(el => el.onclick = () =>
      location.href = `project.html?id=${el.dataset.proj}&quarter=${encodeURIComponent(el.dataset.q)}`);
    K.$$("#tbl-wrap td.drill").forEach(el => el.onclick = () => openNum(el.dataset.fx, el.dataset.key));
  }

  function openNum(fxId, key) {
    const f = D.fxMap[fxId], p = D.projMap[f.projectId];
    const ind = D.indicators.find(i => i.key === key);
    const v = K.indVal(fxId, key);
    const rowsD = K.mxNumRows(fxId, key);
    const info = `<div class="m-info">
      <span class="it">项目名称<b>${p.projectName}</b></span><span class="it">分析期次<b>${f.quarter}</b></span>
      <span class="it">指标<b>【${ind.cat}】${ind.name}</b></span>
      <span class="it">分子<b>${K.fmtAmt(v.num)}</b></span><span class="it">分母<b>${K.fmtDen(ind, v)}</b></span>
      <span class="it">指标值<b style="color:#2f6bff">${K.fmtVal(ind, v)}${ind.unit === "%" ? "" : " " + ind.unit}</b></span></div>`;
    const tbl = rowsD === null
      ? `<div style="padding:8px 4px;line-height:2">分子「${ind.numName}」与分母「${ind.denName}」均为项目级取数，无清单级明细。</div>`
      : `<table class="grid blue-head"><thead><tr><th>序号</th><th>清单编码</th><th>清单名称</th><th>费用类型名称</th><th>分析维度</th><th>成本归口名称</th><th>累计目标成本合价</th><th>三同步后累计实际成本</th><th>累计结算数据金额</th></tr></thead>
        <tbody>${rowsD.map((r, i) => `<tr><td>${i + 1}</td><td>${r.code}</td><td style="text-align:left">${r.name}</td><td>${r.fee}</td><td>${r.dim}</td><td>${r.gb}</td>
          <td class="num">${K.fmtAmt(r.target)}</td><td class="num">${K.fmtAmt(r.actual)}</td><td class="num">${K.fmtAmt(r.settle)}</td></tr>`).join("")}</tbody></table>
        ${!rowsD.length ? '<div style="padding:30px;text-align:center;color:#a8b3c5">本期次该指标分子下无清单数据</div>' : ""}`;
    const m = K.modal(`清单明细 — ${ind.name}`, info + tbl, `<button class="btn btn-primary" id="m-ok">关 闭</button>`);
    m.querySelector("#m-ok").onclick = () => m.classList.remove("show");
  }

  K.$("#btn-export").onclick = () => {
    const list = rows();
    const head = ["序号", "公司", "分公司", "分析周期", "项目名称"];
    D.indicators.forEach(i => head.push(i.numName, i.denName, i.name));
    const lines = list.map((f, i) => {
      const p = D.projMap[f.projectId];
      const cols = [i + 1, p.org2, p.org3, f.quarter, p.projectName];
      D.indicators.forEach(ind => { const v = K.indVal(f.fxId, ind.key); cols.push(v.num, v.den, v.value === null ? "" : v.value); });
      return cols.join(",");
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + head.join(",") + "\n" + lines.join("\n")], { type: "text/csv" }));
    a.download = "专项指标项目明细.csv"; a.click();
    K.toast("已导出 专项指标项目明细.csv");
  };

  renderTable();
})();
