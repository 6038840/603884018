/* 页面1：专项成本分析全景图（基础设施专项分析）— 指标以《第一批看板改造》E列为准 */
(function () {
  const D = window.DATA, K = window.KB;
  K.renderFrame();
  const root = K.$("#page-content");

  const CATS = ["机械设备类", "技术措施费指标", "费用类指标"];

  const state = { org: [], quarter: "2026年2季度", projects: [], stage: null, engType: null };

  root.innerHTML = `
    <div class="filter-bar">
      <div class="filter-item"><label>所属组织</label><div id="f-org"></div></div>
      <div class="filter-item"><label><span class="req">*</span>季度</label><div id="f-quarter"></div></div>
      <div class="filter-item"><label>项目名称</label><div id="f-proj"></div></div>
      <div class="filter-item"><label>建设阶段</label><div id="f-stage"></div></div>
      <div class="filter-item"><label><span class="req">*</span>工程类型</label><div id="f-eng"></div></div>
      <div class="reset-wrap"><button class="btn btn-default" id="f-reset">重 置</button></div>
    </div>
    <div class="sec-title">结果类指标</div>
    <div id="cat-sections"></div>`;

  const ddOrg = K.dropdown(K.$("#f-org"), { options: [...new Set(D.projects.map(p => p.org2))].map(o => ({ v: o, t: o })), multiple: true, placeholder: "请选择", onChange: v => { state.org = v; renderAll(); } });
  const ddQ = K.dropdown(K.$("#f-quarter"), { options: D.quarters.map(q => ({ v: q, t: q })), value: state.quarter, onChange: v => { state.quarter = v; renderAll(); } });
  const ddProj = K.dropdown(K.$("#f-proj"), { options: D.projects.map(p => ({ v: p.projectId, t: p.projectName })), multiple: true, placeholder: "请选择（多选）", onChange: v => { state.projects = v; renderAll(); } });
  const ddStage = K.dropdown(K.$("#f-stage"), { options: [...new Set(D.projects.map(p => p.stage))].map(o => ({ v: o, t: o })), placeholder: "请选择（单选）", onChange: v => { state.stage = v; renderAll(); } });
  const ddEng = K.dropdown(K.$("#f-eng"), { options: [...new Set(D.projects.map(p => p.engType))].map(o => ({ v: o, t: o })), placeholder: "房屋建设项目", onChange: v => { state.engType = v; renderAll(); } });

  K.$("#f-reset").onclick = () => {
    state.org = []; state.quarter = "2026年2季度"; state.projects = []; state.stage = null; state.engType = null;
    ddOrg.set([]); ddQ.set(state.quarter); ddProj.set([]); ddStage.set(null); ddEng.set(null);
    renderAll(); K.toast("筛选条件已重置");
  };

  function filteredFx() {
    return K.fxByQuarter(state.quarter).filter(f => {
      const p = D.projMap[f.projectId];
      if (state.org.length && !state.org.includes(p.org2)) return false;
      if (state.projects.length && !state.projects.includes(p.projectId)) return false;
      if (state.stage && p.stage !== state.stage) return false;
      if (state.engType && p.engType !== state.engType) return false;
      return true;
    });
  }

  function renderCats(fxs) {
    const fids = fxs.map(f => f.fxId);
    K.$("#cat-sections").innerHTML = CATS.map(cat => {
      const cards = D.indicators.filter(i => i.cat === cat).map(ind => {
        const v = K.indAgg(fids, ind.key);
        return `<div class="card" data-ind="${ind.key}">
          <div class="c-title">${ind.name}<span class="q" title="计算口径：${ind.numName} ÷ ${ind.denName}">?</span></div>
          <div class="c-value">${K.fmtVal(ind, v)}<span class="unit">${ind.unit === "%" ? "" : " " + ind.unit}</span></div>
        </div>`;
      }).join("");
      return `<div class="sec-sub">${cat}专项成本指标</div><div class="card-grid">${cards}</div>`;
    }).join("");
    K.$$("#cat-sections .card").forEach(el => el.onclick = () => {
      location.href = `indicator.html?key=${el.dataset.ind}&quarter=${encodeURIComponent(state.quarter)}`;
    });
  }

  function renderAll() {
    const fxs = filteredFx();
    if (!fxs.length) K.toast("当前筛选无数据");
    renderCats(fxs);
  }
  renderAll();
})();
