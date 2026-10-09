/* 商务看板2.0 原型公共逻辑：布局 / 指标计算(分子÷分母) / 组件 */
(function () {
  const D = window.DATA;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  /* ---------- 格式化 ---------- */
  function fmtAmt(v) {
    if (v === null || v === undefined || isNaN(v)) return "-";
    const a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toFixed(2) + "亿";
    if (a >= 1e4) return (v / 1e4).toFixed(2) + "万";
    return v.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
  }
  function fmtPct(r) { return (r === null || r === undefined || isNaN(r)) ? "-" : (r * 100).toFixed(2) + "%"; }
  function fmtInt(v) { return (v === null || v === undefined) ? "-" : Number(v).toLocaleString("zh-CN"); }
  function fmtWanRen(v) { return (v === null || v === undefined || isNaN(v)) ? "-" : v.toFixed(1); }

  /* ---------- 指标取值：结果 = 分子 ÷ 分母 ---------- */
  function indVal(fid, key) {
    const spec = D.indicators.find(i => i.key === key);
    const a = (D.ind[fid] || {})[key];
    if (!a || !a.den) return { num: a ? a.num : 0, den: a ? a.den : 0, value: null };
    const value = spec.unit === "%" ? a.num / a.den : a.num / 1e4 / a.den;
    return { num: a.num, den: a.den, value };
  }
  function indAgg(fids, key) {
    const spec = D.indicators.find(i => i.key === key);
    let num = 0, den = 0;
    fids.forEach(fid => { const a = (D.ind[fid] || {})[key]; if (a) { num += a.num; den += a.den; } });
    const value = !den ? null : (spec.unit === "%" ? num / den : num / 1e4 / den);
    return { num, den, value };
  }
  function fmtVal(spec, v) {
    if (!v || v.value === null) return "-";
    return spec.unit === "%" ? fmtPct(v.value) : fmtWanRen(v.value);
  }
  function fmtDen(spec, v) { return spec.denKey === "mgr" ? fmtInt(v.den) + " 人" : fmtAmt(v.den); }

  /* 表格子列：分子 / 分母 / 指标值（指标值蓝色可下钻） */
  function subCols(spec) {
    return [
      { k: "num", t: spec.numName },
      { k: "den", t: spec.denName },
      { k: "value", t: spec.name, drill: true },
    ];
  }

  /* ---------- 框架渲染 ---------- */
  const TOP_MENUS = ["商务全景图", "大商务管理看板", "成本看板", "专项分析看板", "分包看板", "确权看板", "工程结算看板", "重计量看板", "创效看板", "负效化解看板", "总部例会", "项目数据湖"];
  /* 左侧菜单树：保留截图全部菜单 + 新增【基础设施专项分析】承载原型两页 */
  const SIDE_TREE = [
    { type: "item", name: "专项成本分析全景图" },
    {
      type: "group", name: "专项成本分析", open: false, children: [
        { name: "专项分析指标（按季度）" }, { name: "专项分析指标（全量项目）" },
        { name: "主材分析" }, { name: "措施费分析" }, { name: "管理费分析" },
      ],
    },
    {
      type: "group", name: "基础设施专项分析", open: true, ours: true, children: [
        { name: "专项成本分析全景图", href: "panorama.html", key: "panorama" },
        { name: "专项分析指标（按季度）", href: "quarterly.html", key: "quarterly" },
      ],
    },
  ];

  function renderFrame() {
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="editor-bar">
        <div class="crumb"><b>商务看板2.0</b>&nbsp;预览</div>
        <div class="right">
          <span class="icon-btn" title="桌面预览">🖥</span>
          <span class="icon-btn" title="移动端预览">📱</span>
          <button class="btn btn-plain" id="btn-edit">✎ 继续编辑</button>
          <button class="btn btn-primary" id="btn-save">保 存</button>
          <span class="icon-btn">⋮</span>
        </div>
      </div>
      <div class="topnav">
        <div class="logo">商务看板</div>
        <div class="menus">${TOP_MENUS.map(m => `<span class="menu-item ${m === "专项分析看板" ? "active" : ""}" data-m="${m}">${m}</span>`).join("")}</div>
        <div class="avatar">李</div>
      </div>
      <div class="layout">
        <div class="sidebar">
          <div class="search"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5c6b84" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="menu-search" placeholder="搜索菜单名称"></div>
          <div id="side-list"></div>
        </div>
        <div class="content" id="page-content"></div>
      </div>`);
    renderSide("");
    $("#menu-search").addEventListener("input", (e) => renderSide(e.target.value.trim()));
    $("#btn-save").addEventListener("click", () => toast("已保存（原型演示）"));
    $("#btn-edit").addEventListener("click", () => toast("原型演示环境，编辑功能略"));
    $$(".menu-item").forEach(el => el.addEventListener("click", () => {
      if (el.dataset.m !== "专项分析看板") toast(`「${el.dataset.m}」为演示占位菜单`);
    }));
  }
  function renderSide(kw) {
    const cur = document.body.dataset.page;
    const html = [];
    SIDE_TREE.forEach(node => {
      if (node.type === "item") {
        if (!kw || node.name.includes(kw))
          html.push(`<div class="side-item" data-ph="${node.name}">${node.name}</div>`);
      } else {
        const kids = node.children.filter(c => !kw || c.name.includes(kw));
        const selfHit = node.name.includes(kw);
        if (kw && !kids.length && !selfHit) return;
        const open = kw ? true : node.open;
        html.push(`<div class="side-item side-grp ${open ? "open" : ""}" data-grp="${node.name}">
          <span class="grp-arrow">${open ? "▾" : "▸"}</span>${node.name}</div>`);
        if (open) (kw ? kids : node.children).forEach(c => {
          html.push(`<div class="side-item side-child ${c.key === cur ? "active" : ""}" ${c.href ? `data-href="${c.href}"` : `data-ph="${c.name}"`}>${c.name}</div>`);
        });
      }
    });
    $("#side-list").innerHTML = html.join("") || `<div class="side-item" style="cursor:default">无匹配菜单</div>`;
    $$("#side-list .side-grp").forEach(el => el.onclick = () => {
      const node = SIDE_TREE.find(n => n.name === el.dataset.grp);
      node.open = !node.open; renderSide($("#menu-search").value.trim());
    });
    $$("#side-list [data-href]").forEach(el => el.onclick = () => (location.href = el.dataset.href));
    $$("#side-list [data-ph]").forEach(el => el.onclick = () => toast(`「${el.dataset.ph}」为既有看板菜单（占位，非本原型范围）`));
  }

  /* ---------- 下拉组件（单选/多选） ---------- */
  function dropdown(el, { options, multiple = false, value, placeholder = "请选择", onChange }) {
    el.classList.add("sel");
    let val = multiple ? new Set(value || []) : (value ?? null);
    function headText() {
      if (multiple) {
        if (!val.size) return `<span class="ph">${placeholder}</span>`;
        if (val.size === options.length && options.length > 2) return "全部";
        const arr = options.filter(o => val.has(o.v)).map(o => o.t);
        return arr.join("、").length > 22 ? arr[0] + ` 等${val.size}项` : arr.join("、");
      }
      const o = options.find(o => o.v === val);
      return o ? o.t : `<span class="ph">${placeholder}</span>`;
    }
    function render() {
      el.innerHTML = `<div class="sel-head ${(!multiple && val === null) || (multiple && !val.size) ? "placeholder" : ""}">${headText()}</div>
        <div class="sel-pop">
          ${multiple ? `<div class="sel-actions"><span data-a="all">全选</span><span data-a="clear">清空</span></div>` : ""}
          ${options.map(o => {
            const ck = multiple ? val.has(o.v) : o.v === val;
            return `<div class="sel-opt ${ck ? "checked" : ""}" data-v="${o.v}">${multiple ? `<input type="checkbox" ${ck ? "checked" : ""}>` : ""}${o.t}</div>`;
          }).join("")}
        </div>`;
    }
    render();
    el.addEventListener("click", (e) => {
      const head = e.target.closest(".sel-head");
      if (head) { const was = el.classList.contains("open"); $$(".sel.open").forEach(s => s.classList.remove("open")); if (!was) el.classList.add("open"); return; }
      const act = e.target.closest("[data-a]");
      if (act) {
        if (act.dataset.a === "all") val = new Set(options.map(o => o.v));
        else val = new Set();
        render(); el.classList.add("open"); onChange && onChange(multiple ? [...val] : val); return;
      }
      const opt = e.target.closest(".sel-opt");
      if (opt) {
        const v = opt.dataset.v;
        if (multiple) { val.has(v) ? val.delete(v) : val.add(v); render(); el.classList.add("open"); }
        else { val = v; render(); }
        onChange && onChange(multiple ? [...val] : val);
      }
    });
    document.addEventListener("click", (e) => { if (!el.contains(e.target)) el.classList.remove("open"); });
    return { get: () => (multiple ? [...val] : val), set: (v) => { val = multiple ? new Set(v || []) : v; render(); } };
  }

  /* ---------- Toast / 弹窗 ---------- */
  function toast(msg) {
    let t = $("#toast");
    if (!t) { document.body.insertAdjacentHTML("beforeend", `<div id="toast"></div>`); t = $("#toast"); }
    t.textContent = msg; t.style.display = "block";
    clearTimeout(t._tm); t._tm = setTimeout(() => (t.style.display = "none"), 2200);
  }
  function modal(title, bodyHtml, footHtml) {
    let m = $("#mask");
    if (!m) { document.body.insertAdjacentHTML("beforeend", `<div class="mask" id="mask"><div class="modal"><div class="m-head"><span class="m-title"></span><span class="m-close">✕</span></div><div class="m-body"></div><div class="m-foot"></div></div></div>`); m = $("#mask"); }
    $(".m-title", m).innerHTML = title; $(".m-body", m).innerHTML = bodyHtml;
    const foot = $(".m-foot", m); foot.innerHTML = footHtml || ""; foot.style.display = footHtml ? "flex" : "none";
    m.classList.add("show");
    $(".m-close", m).onclick = () => m.classList.remove("show");
    m.onclick = (e) => { if (e.target === m) m.classList.remove("show"); };
    return m;
  }

  /* ---------- 分页 ---------- */
  function pager(el, total, state, onPage) {
    const size = state.size;
    const pages = Math.max(1, Math.ceil(total / size));
    state.page = Math.min(state.page, pages);
    let nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) nums.push(i);
    nums = nums.filter((n, i) => n !== nums[i - 1]);
    let html = `共 ${total} 条 `;
    html += `<button class="pg-btn" data-p="prev" ${state.page <= 1 ? "disabled" : ""}>‹</button>`;
    nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) html += `<span>…</span>`; html += `<button class="pg-btn ${n === state.page ? "cur" : ""}" data-p="${n}">${n}</button>`; });
    html += `<button class="pg-btn" data-p="next" ${state.page >= pages ? "disabled" : ""}>›</button>`;
    html += ` <select id="pg-size">${[10, 20, 50].map(s => `<option ${s === size ? "selected" : ""}>${s}</option>`).join("")}</select> 条/页`;
    html += ` 跳至 <input id="pg-jump" style="width:44px"> 页`;
    el.innerHTML = html;
    el.querySelectorAll(".pg-btn[data-p]").forEach(b => b.onclick = () => {
      const p = b.dataset.p;
      if (p === "prev") state.page--; else if (p === "next") state.page++; else state.page = +p;
      onPage();
    });
    el.querySelector("#pg-size").onchange = (e) => { state.size = +e.target.value; state.page = 1; onPage(); };
    el.querySelector("#pg-jump").onkeydown = (e) => { if (e.key === "Enter") { state.page = Math.max(1, Math.min(pages, +e.target.value || 1)); onPage(); } };
  }

  /* ---------- 数据访问 ---------- */
  D.fxMap = {}; D.fx.forEach(f => (D.fxMap[f.fxId] = f));
  D.projMap = {}; D.projects.forEach(p => (D.projMap[p.projectId] = p));
  function fxByQuarter(q) { return D.fx.filter(f => f.quarter === q); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }

  /* 指标分子的清单下钻过滤；percap 分子为合同收入（无清单）返回 null */
  function mxNumRows(fxId, key) {
    const spec = D.indicators.find(i => i.key === key);
    const src = spec.numSrc;
    if (src.mode === "fx") return null;
    const col = { fee: "fee", dim: "dim", gb: "gb" }[src.mode];
    return D.mx.filter(r => r.fxId === fxId && r[col] === src.val);
  }

  window.KB = { $, $$, fmtAmt, fmtPct, fmtInt, fmtWanRen, indVal, indAgg, fmtVal, fmtDen, subCols, renderFrame, dropdown, toast, modal, pager, fxByQuarter, qs, mxNumRows };
})();
