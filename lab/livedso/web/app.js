/* LiveDSO · local workbench UI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { data: null, view: 'overview', error: null, report: '', css: '', selected: null };
  const THEME_LABEL = { system: '系统', light: '浅色', dark: '深色' };

  async function api(path, options) {
    const res = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, options || {}));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function toast(title, body) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<b>${esc(title)}</b><span>${esc(body || '')}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; setTimeout(() => el.remove(), 220); }, 3600);
  }
  function setStatus(kind, text) {
    const el = $('#status-chip');
    el.classList.toggle('ok', kind === 'ok');
    el.classList.toggle('err', kind === 'err');
    el.querySelector('span').textContent = text;
  }
  function scoreLabel(score) {
    if (score >= 90) return ['系统健康', '可以开始把变更送进 CI。'];
    if (score >= 70) return ['需要收口', '有警告/错误，先处理阻断项。'];
    return ['高风险', '不要发布；先修错误与契约缺口。'];
  }
  function issueHTML(issue, compact) {
    return `<div class="issue ${esc(issue.severity)}"><span class="sev">${esc(issue.severity)}</span><div class="msg">${esc(issue.message)}${issue.detail && !compact ? `<small>${esc(issue.detail)}</small>` : ''}</div><code>${esc(issue.code)}${issue.path ? ` · ${esc(issue.path)}` : ''}</code></div>`;
  }
  function renderIssues(target, issues, compact) {
    if (!issues.length) { target.innerHTML = '<div class="empty">没有发现问题。可以开始下一轮变更。</div>'; return; }
    target.innerHTML = issues.map(i => issueHTML(i, compact)).join('');
  }

  function applyTheme(theme, persist) {
    if (!['system', 'light', 'dark'].includes(theme)) theme = 'system';
    const mq = matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
    if (persist) { try { localStorage.setItem('livedso-theme', theme); } catch (e) {} }
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (document.documentElement.dataset.theme === 'system') applyTheme('system', false);
  });

  function switchView(view) {
    state.view = view;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'overview') renderOverview();
    if (view === 'tokens') renderTokens();
    if (view === 'contracts') renderContracts();
    if (view === 'style-cards') renderCards();
    if (view === 'checks') renderChecks();
    if (view === 'report') renderReport();
    window.scrollTo({ top: 0 });
  }

  function renderOverview() {
    if (!state.data) return;
    const d = state.data;
    const score = d.checks.score;
    const [label, detail] = scoreLabel(score);
    $('#health-score').textContent = score;
    $('#health-ring').style.setProperty('--p', String(score));
    $('#health-ring').style.setProperty('--ring', score >= 90 ? 'var(--ok)' : score >= 70 ? 'var(--warn)' : 'var(--danger)');
    $('#health-label').textContent = label;
    $('#health-detail').textContent = detail;
    $('#m-tokens').textContent = d.counts.tokens;
    $('#m-contracts').textContent = d.counts.contracts;
    $('#m-cards').textContent = d.counts.styleCards;
    $('#m-issues').textContent = d.counts.errors + d.counts.warnings;
    $('#nav-tokens').textContent = d.counts.tokens;
    $('#nav-contracts').textContent = d.counts.contracts;
    $('#nav-cards').textContent = d.counts.styleCards;
    $('#nav-issues').textContent = d.counts.errors + d.counts.warnings;
    $('#vault-meta').textContent = d.meta.name || 'vault';
    $('#token-count').textContent = `${d.counts.tokens} tokens`;
    $('#vault-path').textContent = d.root.replace(/^.*\/lab\/livedso\//, 'lab/livedso/');
    $('#node-version').textContent = d.runtime || 'local';
    renderIssues($('#overview-issues'), d.checks.issues.slice(0, 5), true);
  }

  function tokenColor(value) {
    return /^#([0-9a-f]{3,8})$/i.test(String(value || '')) ? value : null;
  }
  function resolvedColor(t) {
    if (tokenColor(t.resolved)) return t.resolved;
    if (tokenColor(t.raw)) return t.raw;
    return 'transparent';
  }

  function filteredTokens() {
    if (!state.data) return [];
    const q = ($('#token-search')?.value || '').trim().toLowerCase();
    const tier = $('#tier-filter')?.value || '';
    const type = $('#type-filter')?.value || '';
    return state.data.tokens.filter(t => (!tier || t.tier === tier) && (!type || t.type === type) && (!q || (t.path + t.resolved + (t.alias || '')).toLowerCase().includes(q)));
  }
  function renderTokens() {
    if (!state.data) return;
    const rows = filteredTokens();
    $('#token-filter-count').textContent = `${rows.length} / ${state.data.tokens.length}`;
    const tbody = $('#token-rows');
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">没有匹配的 token。</td></tr>'; return; }
    tbody.innerHTML = rows.map(t => {
      const color = tokenColor(t.resolved) || tokenColor(t.raw);
      const ratio = t.onBase == null ? '—' : `${t.onBase}:1`;
      const ratioClass = t.onBase != null && t.onBase >= 4.5 ? 'ok' : 'low';
      return `<tr data-token="${esc(t.path)}"><td>${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}<code>${esc(t.path)}</code></td><td><span class="tier ${esc(t.tier)}">${esc(t.tier)}</span></td><td><code>${esc(t.raw)}</code></td><td><code>${esc(t.resolved)}</code></td><td><span class="ratio ${t.onBase == null ? '' : ratioClass}">${ratio}</span></td><td><code>${esc(t.source)}</code></td></tr>`;
    }).join('');
  }

  function requiredFields() { return ['anatomy', 'states', 'tokens', 'keyboard', 'a11y', 'do', 'dont']; }
  function renderContracts() {
    if (!state.data) return;
    const list = state.data.contracts;
    $('#contract-filter-count').textContent = `${list.length} contracts`;
    const grid = $('#contract-grid');
    if (!list.length) { grid.innerHTML = '<div class="empty">没有契约。先加一个 button.contract.json。</div>'; return; }
    grid.innerHTML = list.map(c => {
      const required = requiredFields();
      const badges = required.map(k => `<span class="badge ${c[k] ? 'ok' : 'miss'}">${esc(k)}</span>`).join('');
      return `<article class="contract-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><h3>${esc(c.title)}</h3><span class="chip">${esc(c.status || '—')}</span></div><p>${esc(c.summary || '没有说明。')}</p><div class="badges">${badges}</div><div class="contract-meta"><b>id</b><span><code>${esc(c.id)}</code></span><b>states</b><span>${esc((c.states || []).join(' · ') || '—')}</span><b>tokens</b><span>${esc((c.tokens || []).join(' · ') || '—')}</span></div></article>`;
    }).join('');
  }
  function styleColor(value) {
    if (tokenColor(value)) return value;
    if (typeof value === 'string' && value.includes('.')) {
      const t = state.data.tokens.find(x => x.path === value);
      return t ? (tokenColor(t.resolved) || tokenColor(t.raw) || 'transparent') : 'transparent';
    }
    return value || 'transparent';
  }
  function renderCards() {
    if (!state.data) return;
    const order = { archive: 0, solar: 1, cyber: 2 };
    const cards = [...state.data.styleCards].sort((a, b) => (order[a.id] ?? 9) - (order[b.id] ?? 9) || a.name.localeCompare(b.name));
    $('#card-filter-count').textContent = `${cards.length} cards`;
    const grid = $('#card-grid');
    if (!cards.length) { grid.innerHTML = '<div class="empty">没有风格卡。</div>'; return; }
    grid.innerHTML = cards.map(c => `<article class="style-card"><div class="style-swatches">${(c.colors || []).map(color => `<i style="background:${esc(styleColor(color))}"></i>`).join('')}</div><div class="style-body"><div class="era">${esc(c.era || '—')}</div><h3>${esc(c.name)}</h3><p>${esc(c.note || '没有写维护/代价。')}</p><div class="badges" style="margin-top:7px">${(c.colors || []).map(x => `<span class="badge">${esc(x)}</span>`).join('')}</div></div></article>`).join('');
  }
  function renderChecks() {
    if (!state.data) return;
    const c = state.data.checks;
    $('#check-score').textContent = `${c.score}/100`;
    $('#check-summary').innerHTML = `<div class="check-stat ok"><b>${c.score}</b><span>health score</span></div><div class="check-stat error"><b>${c.errors}</b><span>errors · block</span></div><div class="check-stat warn"><b>${c.warnings}</b><span>warnings · record</span></div><div class="check-stat"><b>${c.infos}</b><span>info</span></div>`;
    renderIssues($('#check-list'), c.issues, false);
  }
  function renderReport() {
    $('#report-output').textContent = state.report || '点击“生成健康报告”。';
    $('#css-output').textContent = state.css || '点击“生成 CSS 投影”。';
    $('#report-status').textContent = state.report ? '已生成' : '未生成';
    $('#css-status').textContent = state.css ? '已生成' : '未生成';
  }

  function openDrawer(path) {
    if (!state.data) return;
    const t = state.data.tokens.find(x => x.path === path);
    if (!t) return;
    state.selected = t;
    $('#drawer-title').textContent = t.path;
    const color = tokenColor(t.resolved) || tokenColor(t.raw);
    $('#drawer-body').innerHTML = `<div class="field"><label>tier / type</label><div class="value-box">${esc(t.tier)} / ${esc(t.type)}</div></div><div class="field"><label>raw value（vault）</label><div class="value-box">${esc(t.raw)}</div></div><div class="field"><label>resolved</label><div class="value-box">${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}${esc(t.resolved)}</div></div><div class="field"><label>alias</label><div class="value-box">${esc(t.alias || '—')}</div></div><div class="field"><label>contrast vs bg.base</label><div class="value-box">${t.onBase == null ? '—' : t.onBase + ':1'}</div></div><div class="field"><label>new value</label><input id="token-value" value="${esc(t.raw)}" spellcheck="false"></div><div class="drawer-actions"><button class="btn" type="button" id="save-token">保存到 vault</button><button class="btn ghost" type="button" data-close-drawer>取消</button></div><p class="drawer-note">保存会写回源 JSON；LiveDSO 不自动提交 Git。真实项目中建议先开分支/PR。</p>`;
    $('#token-drawer').hidden = false;
    setTimeout(() => $('#token-value')?.focus(), 30);
  }
  function closeDrawer() { $('#token-drawer').hidden = true; state.selected = null; }

  async function saveSelected() {
    if (!state.selected) return;
    const value = $('#token-value')?.value;
    if (value === undefined) return;
    try {
      setStatus('ok', 'saving');
      const selectedPath = state.selected.path;
      const data = await api('/api/token', { method: 'POST', body: JSON.stringify({ path: selectedPath, value }) });
      state.data = data;
      closeDrawer();
      renderOverview(); renderTokens(); renderChecks();
      toast('Token 已保存', `${selectedPath} → ${value}`);
      setStatus('ok', 'local vault');
    } catch (e) {
      setStatus('err', 'save failed');
      toast('保存失败', e.message);
    }
  }

  async function refresh() {
    try {
      setStatus('ok', 'local vault');
      state.data = await api('/api/state');
      state.error = null;
      renderOverview(); renderTokens(); renderContracts(); renderCards(); renderChecks();
      if (state.view === 'report') renderReport();
    } catch (e) {
      state.error = e.message;
      setStatus('err', 'offline');
      $('#health-label').textContent = '无法连接本地 vault';
      $('#health-detail').textContent = e.message + ' — 运行 node src/cli.ts serve';
      toast('连接失败', e.message);
    }
  }

  async function runChecks() {
    try {
      setStatus('ok', 'checking');
      await api('/api/check', { method: 'POST', body: '{}' });
      await refresh();
      switchView('checks');
      toast('Checks 完成', `${state.data.checks.errors} errors · ${state.data.checks.warnings} warnings`);
    } catch (e) { setStatus('err', 'check failed'); toast('检查失败', e.message); }
  }
  async function generateReport() {
    try {
      const r = await api('/api/report', { method: 'POST', body: '{}' });
      state.report = r.markdown;
      renderReport();
      toast('报告已生成', '可下载 .md 或复制进 PR。');
    } catch (e) { toast('生成失败', e.message); }
  }
  async function generateCss() {
    try {
      const r = await api('/api/projection', { method: 'POST', body: '{}' });
      state.css = r.css;
      renderReport();
      toast('CSS 投影已生成', '复制或下载。');
    } catch (e) { toast('生成失败', e.message); }
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function bind() {
    document.addEventListener('click', (e) => {
      const view = e.target.closest('[data-view]');
      if (view) { switchView(view.dataset.view); return; }
      const theme = e.target.closest('[data-theme-set]');
      if (theme) { applyTheme(theme.dataset.themeSet, true); toast('外观', THEME_LABEL[theme.dataset.themeSet]); return; }
      if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
      const row = e.target.closest('[data-token]');
      if (row) { openDrawer(row.dataset.token); return; }
      if (e.target.id === 'save-token') { saveSelected(); return; }
      if (e.target.closest('#run-checks') || e.target.closest('#quick-check')) { runChecks(); return; }
      if (e.target.id === 'gen-report') { generateReport(); return; }
      if (e.target.id === 'gen-css') { generateCss(); return; }
      if (e.target.id === 'download-report') { state.report ? download('livedso-health.md', state.report, 'text/markdown') : toast('还没有报告', '先生成健康报告。'); return; }
      if (e.target.id === 'download-css') { state.css ? download('livedso-tokens.css', state.css, 'text/css') : toast('还没有 CSS', '先生成 CSS 投影。'); return; }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
    ['token-search', 'tier-filter', 'type-filter'].forEach(id => $('#' + id)?.addEventListener('input', renderTokens));
    $('#copy-css')?.addEventListener('click', async () => {
      try {
        const r = await api('/api/projection', { method: 'POST', body: '{}' });
        await navigator.clipboard.writeText(r.css);
        toast('已复制 CSS', '可直接粘进项目。');
      } catch (e) { toast('复制失败', e.message); }
    });
    $('#token-search')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; renderTokens(); } });
    $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.themeSet, true)));
    applyTheme(document.documentElement.dataset.theme || 'system', false);
  }

  bind();
  refresh();
  setInterval(() => { if (state.data && state.view !== 'tokens') renderOverview(); }, 60000);
})();
