// SPDX-License-Identifier: Apache-2.0
/* LiveLand · world/era workbench UI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { data: null, view: 'overview', era: 'archive', output: '', outputName: 'world-bible.md', worlds: [], activeWorld: '', compareA: '', compareB: '' };
  const labels = { canon: 'canon', draft: 'draft', rumor: 'rumor' };

  async function api(path, options = {}) {
    const res = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, options));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function toast(title, body) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<b>${esc(title)}</b><span>${esc(body || '')}</span>`;
    $('#toasts').appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; setTimeout(() => el.remove(), 200); }, 3400);
  }
  function status(text, kind) { const el = $('#status'); el.querySelector('span').textContent = text; el.classList.toggle('ok', kind === 'ok'); el.classList.toggle('err', kind === 'err'); }
  function themeSet(t, persist) {
    if (!['system', 'light', 'dark'].includes(t)) t = 'system';
    const mq = matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.mode = t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    if (persist) try { localStorage.setItem('liveland-theme', t); } catch (e) {}
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (document.documentElement.dataset.theme === 'system') themeSet('system', false); });
  function switchView(view) {
    state.view = view;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    renderAll();
    window.scrollTo({ top: 0 });
  }
  function renderWorldSelect() {
    const sel = $('#world-select'); if (!sel) return;
    const list = state.data?.worlds || [];
    const active = state.data?.activeWorld?.id || '';
    sel.innerHTML = list.map(w => `<option value="${esc(w.id)}" ${w.id === active ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
  }
  async function switchWorld(id) {
    try {
      const data = await api('/api/world', { method: 'POST', body: JSON.stringify({ id }) });
      state.data = data;
      state.era = data.world.eras[0]?.id || '';
      renderAll(); renderWorldSelect();
      toast('世界已切换', `${data.world.title} · ${data.stats.canon} canon`);
    } catch (e) { toast('切换失败', e.message); renderWorldSelect(); }
  }
  function renderAll() {
    if (!state.data) return;
    if (state.view === 'overview') renderOverview();
    if (state.view === 'eras') renderEras();
    if (state.view === 'canon') renderCanon();
    if (state.view === 'entities') renderEntities();
    if (state.view === 'assets') renderAssets();
    if (state.view === 'lint') renderLint();
    if (state.view === 'outputs') renderOutputs();
  }
  function issueHTML(i, compact) {
    return `<div class="issue ${esc(i.severity)}"><span class="sev">${esc(i.severity)}</span><div class="msg">${esc(i.message)}${i.detail && !compact ? `<small>${esc(i.detail)}</small>` : ''}</div><code>${esc(i.code)}${i.path ? ' · ' + esc(i.path) : ''}</code></div>`;
  }
  function issues(target, list, compact) {
    target.innerHTML = list.length ? list.map(i => issueHTML(i, compact)).join('') : '<div class="empty">没有发现问题。</div>';
  }
  function healthText(score) {
    if (score >= 90) return ['可以继续写', '世界规则基本自洽；继续补资产与输出。'];
    if (score >= 70) return ['需要收口', '有矛盾/缺口；先处理错误，再继续扩展。'];
    return ['高风险', '不要发布；先修复 canon 冲突与来源缺口。'];
  }

  function renderOverview() {
    const { world, lint, stats } = state.data;
    $('#world-title').textContent = world.title;
    $('#world-premise').textContent = world.premise;
    $('#world-id').textContent = world.id;
    $('#era-count').textContent = `${stats.eras} eras`;
    $('#world-version').textContent = `v${world.version}`;
    $('#s-eras').textContent = stats.eras; $('#s-canon').textContent = stats.canon; $('#s-entities').textContent = stats.entities; $('#s-assets').textContent = stats.assets;
    $('#nav-eras').textContent = stats.eras; $('#nav-canon').textContent = stats.canon; $('#nav-entities').textContent = stats.entities; $('#nav-assets').textContent = stats.assets; $('#nav-issues').textContent = lint.errors + lint.warnings;
    $('#health-score').textContent = lint.score;
    $('#health-ring').style.setProperty('--p', String(lint.score));
    $('#health-ring').style.setProperty('--ring', lint.score >= 90 ? 'var(--green)' : lint.score >= 70 ? 'var(--amber)' : 'var(--danger)');
    const [h, d] = healthText(lint.score); $('#health-label').textContent = h; $('#health-detail').textContent = d;
    $('#constraints').innerHTML = world.constraints.map(c => `<div class="constraint"><b>${esc(c.label)}</b><span>${esc(c.statement)}</span></div>`).join('');
    $('#overview-eras').innerHTML = world.eras.map(e => `<div class="era-line"><i style="background:${esc(e.style.colors[1] || e.style.colors[0])}"></i><b>${esc(e.name)}</b><span>${esc(e.subtitle)}</span><code>${esc(e.from)}–${esc(e.to)}</code></div>`).join('');
    issues($('#overview-issues'), lint.issues.slice(0, 4), true);
  }

  function renderEras() {
    const { world } = state.data;
    $('#era-total').textContent = `${world.eras.length} eras`;
    $('#era-tabs').innerHTML = world.eras.map(e => `<button class="era-tab ${state.era === e.id ? 'active' : ''}" data-era="${esc(e.id)}" type="button"><small>${esc(e.from)}–${esc(e.to)}</small><b>${esc(e.name)}</b><small>${esc(e.subtitle)}</small></button>`).join('');
    const e = world.eras.find(x => x.id === state.era) || world.eras[0];
    const facts = world.canon.filter(c => c.era === e.id);
    const ents = world.entities.filter(x => x.era === e.id);
    $('#era-detail').innerHTML = `<article class="era-hero"><div class="sub">${esc(e.subtitle)}</div><h2>${esc(e.name)}</h2><div class="period">${esc(e.from)} – ${esc(e.to)}</div><p class="lede" style="margin:0 0 8px">${esc(e.summary)}</p><div class="swatches">${e.style.colors.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</div><div class="materials">${e.style.materials.map(m => `<span>${esc(m)}</span>`).join('')}</div><div class="era-meta"><b>技术</b><span>${esc(e.tech)}</span><b>维护</b><span>${esc(e.maintenance)}</span><b>代价</b><span>${esc(e.cost)}</span><b>光照</b><span>${esc(e.style.light)}</span></div></article><div class="era-side"><section class="panel"><div class="panel-head"><h2>本时代 canon</h2><span class="chip">${facts.length}</span></div><div class="mini-list">${facts.length ? facts.map(f => `<div><b>${esc(f.id)}</b><br>${esc(f.statement)}</div>`).join('') : '<div class="muted">暂无。</div>'}</div></section><section class="panel"><div class="panel-head"><h2>本时代实体</h2><span class="chip">${ents.length}</span></div><div class="mini-list">${ents.length ? ents.map(x => `<div><b>${esc(x.name)}</b> · ${esc(x.type)}<br>${esc(x.summary)}</div>`).join('') : '<div class="muted">暂无。</div>'}</div></section></div>`;
    $$('#era-tabs [data-era]').forEach(b => b.addEventListener('click', () => { state.era = b.dataset.era; renderEras(); }));
    renderEraCompare();
  }

  function renderEraCompare() {
    const eras = state.data.world.eras;
    const aSel = $('#era-compare-a'), bSel = $('#era-compare-b');
    if (!aSel || !bSel || eras.length < 2) return;
    const a = eras.some(e => e.id === state.compareA) ? state.compareA : eras[0].id;
    const b = eras.some(e => e.id === state.compareB) ? state.compareB : eras[1].id;
    aSel.innerHTML = eras.map(e => `<option value="${esc(e.id)}" ${e.id === a ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    bSel.innerHTML = eras.map(e => `<option value="${esc(e.id)}" ${e.id === b ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    state.compareA = a; state.compareB = b;
    const card = e => `<article class="compare-era"><div class="sub">${esc(e.from)}–${esc(e.to)}</div><h3>${esc(e.name)}</h3><p>${esc(e.summary)}</p><div class="compare-swatches">${e.style.colors.map(c => `<i style="background:${esc(c)}"></i>`).join('')}</div><dl><dt>技术</dt><dd>${esc(e.tech)}</dd><dt>维护</dt><dd>${esc(e.maintenance)}</dd><dt>代价</dt><dd>${esc(e.cost)}</dd><dt>材料</dt><dd>${esc(e.style.materials.join('、'))}</dd><dt>光照</dt><dd>${esc(e.style.light)}</dd></dl></article>`;
    $('#era-compare').innerHTML = card(eras.find(e => e.id === a)) + card(eras.find(e => e.id === b)) + `<div class="compare-meta">语法相同，皮肤不同；canon、信息位置、可读性不随时代变化。</div>`;
  }
  function filteredCanon() {
    const q = ($('#canon-search')?.value || '').toLowerCase();
    const era = $('#canon-era')?.value || '';
    const conf = $('#canon-confidence')?.value || '';
    return state.data.world.canon.filter(c => (!era || c.era === era) && (!conf || c.confidence === conf) && (!q || (c.id + c.statement + (c.sources || []).join(' ')).toLowerCase().includes(q)));
  }
  function renderCanon() {
    const world = state.data.world;
    $('#canon-count').textContent = `${filteredCanon().length} / ${world.canon.length}`;
    const eraSelect = $('#canon-era');
    const currentEra = eraSelect.value;
    eraSelect.innerHTML = '<option value="">全部时代</option>' + world.eras.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    eraSelect.value = currentEra;
    if ($('#canon-form [name="era"]').children.length === 0) $('#canon-form [name="era"]').innerHTML = world.eras.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    $('#canon-list').innerHTML = filteredCanon().map(c => {
      const bad = (c.conflictsWith || []).length || (c.dependsOn || []).some(d => !world.canon.some(x => x.id === d));
      return `<article class="canon-card ${bad ? 'error' : ''}"><div class="top"><span class="id">${esc(c.id)}</span><span class="era">${esc(c.era)}</span><span class="conf">${esc(c.confidence)}</span><span class="canon-actions"><button class="text-btn" type="button" data-canon-edit="${esc(c.id)}">编辑</button><button class="text-btn danger" type="button" data-canon-delete="${esc(c.id)}">删除</button></span></div><p>${esc(c.statement)}</p><div class="src">来源：${esc((c.sources || []).join('、') || '—')}${c.dependsOn?.length ? ` ｜ 依赖：${esc(c.dependsOn.join('、'))}` : ''}${c.conflictsWith?.length ? ` ｜ 冲突：${esc(c.conflictsWith.join('、'))}` : ''}</div></article>`;
    }).join('') || '<div class="empty">没有匹配的 canon。</div>';
  }

  function openCanonEdit(id) {
    const c = state.data.world.canon.find(x => x.id === id); if (!c) return;
    const form = $('#canon-edit-form'); form.hidden = false; form.dataset.id = id;
    form.querySelector('[name="era"]').innerHTML = state.data.world.eras.map(e => `<option value="${esc(e.id)}" ${e.id === c.era ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
    form.querySelector('[name="confidence"]').value = c.confidence;
    form.querySelector('[name="source"]').value = (c.sources || [])[0] || '';
    form.querySelector('[name="statement"]').value = c.statement;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function renderEntities() {
    const world = state.data.world;
    $('#entity-count').textContent = `${world.entities.length} entities`;
    $('#entity-grid').innerHTML = world.entities.map(e => `<article class="entity"><div class="type">${esc(e.type)}</div><h3>${esc(e.name)}</h3><p>${esc(e.summary)}</p><div class="era">${esc(e.era)}</div></article>`).join('');
  }
  function renderAssets() {
    const world = state.data.world;
    $('#asset-count').textContent = `${world.assets.length} assets`;
    $('#asset-rows').innerHTML = world.assets.map(a => `<tr><td><div class="asset-cell">${/^image$/.test(a.type) || /\.(svg|png|jpe?g|webp|gif)$/i.test(a.path) ? `<img class="asset-thumb" loading="lazy" src="/api/asset?path=${encodeURIComponent(a.path)}" alt="">` : '<span class="asset-thumb empty">·</span>'}<div><b>${esc(a.title)}</b><br><span class="muted">${esc(a.id)} · ${esc(a.path)}</span></div></div></td><td>${esc(a.era)}</td><td>${esc(a.type)}</td><td class="${a.source ? '' : 'bad'}">${esc(a.source || '缺来源')}</td><td class="${a.license ? 'good' : 'bad'}">${esc(a.license || '缺许可')}</td><td>${esc(a.status)}</td></tr>`).join('');
  }
  function renderLint() {
    const l = state.data.lint;
    $('#lint-score').textContent = `${l.score}/100`;
    $('#lint-summary').innerHTML = `<div class="lint-stat ok"><b>${l.score}</b><span>health</span></div><div class="lint-stat error"><b>${l.errors}</b><span>errors</span></div><div class="lint-stat warn"><b>${l.warnings}</b><span>warnings</span></div><div class="lint-stat"><b>${l.infos}</b><span>info</span></div>`;
    issues($('#lint-list'), l.issues, false);
  }
  function renderOutputs() {
    const world = state.data.world;
    $('#output-count').textContent = `${world.outputs.length} outputs`;
    $('#output-list').innerHTML = world.outputs.map(o => `<div><span>${esc(o.name)} <small>${esc(o.note)}</small></span><small>${esc(o.type)}</small><small>${esc(o.status)}</small></div>`).join('');
    $('#output-preview').textContent = state.output || '选择一种输出。';
    $('#output-status').textContent = state.output ? '已生成' : '未生成';
    $('#output-title').textContent = state.outputName;
  }

  async function deleteCanon(id) {
    if (!confirm(`删除 ${id}？`)) return;
    try {
      const r = await api('/api/canon/delete', { method: 'POST', body: JSON.stringify({ id }) });
      state.data.world = r.world; state.data.lint = r.lint; state.data.stats = r.stats;
      renderAll(); toast('Canon 已删除', id);
    } catch (e) { toast('删除失败', e.message); }
  }
  async function refresh() {
    try { status('local world', 'ok'); state.data = await api('/api/world'); $('#world-path').textContent = 'lab/liveland/world'; $('#node-version').textContent = state.data.runtime || 'local'; renderAll(); renderWorldSelect(); }
    catch (e) { status('offline', 'err'); toast('连接失败', e.message); }
  }
  async function runLint() {
    try { await api('/api/lint', { method: 'POST', body: '{}' }); await refresh(); switchView('lint'); toast('Lint 完成', `${state.data.lint.errors} errors · ${state.data.lint.warnings} warnings`); }
    catch (e) { toast('Lint 失败', e.message); }
  }
  async function exportOut(type) {
    try {
      const r = await api('/api/export', { method: 'POST', body: JSON.stringify({ type }) });
      state.output = r.text; state.outputName = r.name;
      switchView('outputs');
      toast('已生成', r.name);
    } catch (e) { toast('生成失败', e.message); }
  }
  function download(text, name, type) {
    const blob = new Blob([text], { type }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function bind() {
    document.addEventListener('click', e => {
      const v = e.target.closest('[data-view]'); if (v) { switchView(v.dataset.view); return; }
      const t = e.target.closest('[data-theme-set]'); if (t) { themeSet(t.dataset.themeSet, true); return; }
      const ex = e.target.closest('[data-export]'); if (ex) { exportOut(ex.dataset.export); return; }
      const ce = e.target.closest('[data-canon-edit]'); if (ce) { openCanonEdit(ce.dataset.canonEdit); return; }
      const cd = e.target.closest('[data-canon-delete]'); if (cd) { deleteCanon(cd.dataset.canonDelete); return; }
      if (e.target.id === 'run-lint') { runLint(); return; }
      if (e.target.id === 'download-output') {
        if (!state.output) { toast('还没有输出', '先生成一种输出。'); return; }
        download(state.output, state.outputName, state.outputName.endsWith('.json') ? 'application/json' : state.outputName.endsWith('.html') ? 'text/html' : 'text/markdown');
      }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { /* no drawer */ } });
    $('#canon-search')?.addEventListener('input', renderCanon);
    ['canon-era', 'canon-confidence'].forEach(id => $('#' + id)?.addEventListener('change', renderCanon));
    $('#era-compare-a')?.addEventListener('change', e => { state.compareA = e.target.value; renderEraCompare(); });
    $('#era-compare-b')?.addEventListener('change', e => { state.compareB = e.target.value; renderEraCompare(); });
    $('#canon-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const r = await api('/api/canon', { method: 'POST', body: JSON.stringify({ era: fd.get('era'), statement: fd.get('statement'), confidence: fd.get('confidence'), source: fd.get('source') }) });
        state.data.world = r.world; state.data.lint = r.lint; state.data.stats = r.stats;
        e.target.reset();
        $('#canon-form [name="era"]').value = state.era;
        renderAll();
        toast('Canon 已加入', r.fact.id);
      } catch (err) { toast('加入失败', err.message); }
    });
    $('#world-select')?.addEventListener('change', e => switchWorld(e.target.value));
    $('#cancel-canon-edit')?.addEventListener('click', () => { $('#canon-edit-form').hidden = true; });
    $('#canon-edit-form')?.addEventListener('submit', async e => {
      e.preventDefault(); const form = e.target; const fd = new FormData(form);
      try {
        const r = await api('/api/canon/update', { method: 'POST', body: JSON.stringify({ id: form.dataset.id, patch: { era: fd.get('era'), confidence: fd.get('confidence'), statement: fd.get('statement'), sources: [String(fd.get('source') || '').trim()].filter(Boolean) } }) });
        state.data.world = r.world; state.data.lint = r.lint; state.data.stats = r.stats; form.hidden = true; renderAll(); toast('Canon 已保存', form.dataset.id);
      } catch (err) { toast('保存失败', err.message); }
    });
    $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => themeSet(b.dataset.themeSet, true)));
    themeSet(document.documentElement.dataset.theme || 'system', false);
  }
  bind(); refresh();
})();
