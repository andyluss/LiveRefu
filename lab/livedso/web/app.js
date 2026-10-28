// SPDX-License-Identifier: Apache-2.0
/* LiveDSO · local workbench UI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { data: null, view: 'overview', error: null, report: '', css: '', selected: null, previewState: 'default', previewCard: '', adoption: null, compareA: '', compareB: '', history: [], diff: null, historyId: '', trends: null, overview: null, reportTemplate: 'health' };
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
    if (view === 'preview') renderPreview();
    if (view === 'adoption') renderAdoption();
    if (view === 'history') loadHistory();
    if (view === 'trends') loadTrends();
    if (view === 'vaults') loadVaultsOverview();
    if (view === 'style-cards') renderCards();
    if (view === 'checks') renderChecks();
    if (view === 'report') { loadReportTemplates(); renderReport(); }
    window.scrollTo({ top: 0 });
  }

  function renderVaultSelect() {
    const select = $('#vault-select');
    if (!select || !state.data?.vaults) return;
    const active = state.data.activeVault?.id || '';
    select.innerHTML = state.data.vaults.map(v => `<option value="${esc(v.id)}" ${v.id === active ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
  }
  async function switchVault(id) {
    try {
      const data = await api('/api/vault', { method: 'POST', body: JSON.stringify({ id }) });
      state.data = data;
      state.previewCard = '';
      renderOverview(); renderTokens(); renderContracts(); renderCards(); renderChecks(); renderPreview(); renderVaultSelect();
      if (state.view === 'vaults') loadVaultsOverview();
      toast('Vault 已切换', `${data.activeVault?.name || id} · ${data.counts.tokens} tokens`);
      return data;
    } catch (e) { toast('切换失败', e.message); renderVaultSelect(); return null; }
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
    const lifecycle = $('#lifecycle-filter')?.value || '';
    return state.data.tokens.filter(t => (!tier || t.tier === tier) && (!type || t.type === type) && (!lifecycle || (lifecycle === 'deprecated' ? !!t.deprecated : !t.deprecated)) && (!q || (t.path + t.resolved + (t.alias || '')).toLowerCase().includes(q)));
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
      return `<tr data-token="${esc(t.path)}"><td>${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}<code>${esc(t.path)}</code></td><td><span class="tier ${esc(t.tier)}">${esc(t.tier)}</span></td><td><code>${esc(t.raw)}</code></td><td><code>${esc(t.resolved)}</code></td><td>${t.deprecated ? `<span class="lifecycle-badge">deprecated</span>` : '<span class="lifecycle-active">active</span>'}</td><td><span class="ratio ${t.onBase == null ? '' : ratioClass}">${ratio}</span></td><td><code>${esc(t.source)}</code></td></tr>`;
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
      return `<article class="contract-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><h3>${esc(c.title)}</h3><button class="text-btn contract-edit" type="button" data-edit-contract="${esc(c.id)}">编辑 →</button><span class="chip">${esc(c.status || '—')}</span></div><p>${esc(c.summary || '没有说明。')}</p><div class="badges">${badges}</div><div class="contract-meta"><b>id</b><span><code>${esc(c.id)}</code></span><b>states</b><span>${esc((c.states || []).join(' · ') || '—')}</span><b>tokens</b><span>${esc((c.tokens || []).join(' · ') || '—')}</span></div></article>`;
    }).join('');
    renderCompare();
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
  function colorLum(hex) {
    const h = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{3,8}$/i.test(h)) return 0;
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
    const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function textOn(hex) { return colorLum(hex) > 0.45 ? '#0B0F14' : '#F6F1E7'; }
  function previewSkin(card) {
    const palette = (card?.colors || []).map(styleColor).filter(c => c && c !== 'transparent');
    const role = card?.roles || {};
    const bg = styleColor(role.bg) || palette[0] || '#0B0F14';
    const surface = styleColor(role.surface) || palette[1] || bg;
    const action = styleColor(role.action) || palette[3] || palette[2] || '#4FD1C5';
    const focus = styleColor(role.focus) || palette[4] || action;
    const danger = styleColor(role.danger) || '#FF6B35';
    const text = styleColor(role.text) || textOn(bg);
    return {
      '--dso-sys-color-bg-base': bg,
      '--dso-sys-color-bg-surface': surface,
      '--dso-sys-color-bg-raised': surface,
      '--dso-sys-color-bg-sunken': bg,
      '--dso-sys-color-text-primary': text,
      '--dso-sys-color-text-secondary': text,
      '--dso-sys-color-text-muted': text,
      '--dso-sys-color-action-primary': action,
      '--dso-sys-color-action-on-primary': textOn(action),
      '--dso-sys-color-focus-ring': focus,
      '--dso-sys-color-feedback-danger': danger,
      '--dso-sys-color-line-subtle': surface,
      '--dso-sys-color-line-strong': text
    };
  }
  function renderPreview() {
    if (!state.data) return;
    const d = state.data;
    const cards = d.styleCards || [];
    const select = $('#preview-card');
    if (select) {
      const current = state.previewCard || cards[0]?.id || '';
      select.innerHTML = cards.map(c => `<option value="${esc(c.id)}">${esc(c.name)}${c.era ? ' · ' + esc(c.era) : ''}</option>`).join('');
      select.value = cards.some(c => c.id === current) ? current : (cards[0]?.id || '');
      state.previewCard = select.value;
    }
    const card = cards.find(c => c.id === state.previewCard) || cards[0];
    const tokenVars = Object.fromEntries(d.tokens.filter(t => t.cssVar && t.resolved).map(t => [t.cssVar, t.resolved]));
    const vars = Object.entries({ ...tokenVars, ...previewSkin(card) }).map(([k, v]) => `${k}:${v}`).join(';');
    const st = state.previewState;
    const btn = (label, extra = '') => `<button class="pv-btn ${extra} ${st}" type="button" ${st === 'disabled' ? 'disabled' : ''}>${label}</button>`;
    const canvas = $('#preview-canvas');
    if (canvas) {
      canvas.setAttribute('style', vars);
      canvas.innerHTML = `<div class="pv-row">${btn('主按钮')}${btn('次要按钮', 'secondary')}${btn('幽灵按钮', 'ghost')}</div><label class="pv-field"><span>邮箱</span><input class="pv-input ${st === 'focus' ? 'focus' : ''}" value="you@example.com" ${st === 'disabled' ? 'disabled' : ''}><small class="pv-error">${st === 'disabled' ? '禁用时仍需说明原因。' : '错误用文本说明，不只靠颜色。'}</small></label><div class="pv-panel"><div><b>面板标题</b><small>这套 token 来自当前 vault，不是截图。</small></div><span class="pv-badge">${esc(st)}</span></div>`;
    }
    $('#preview-token-count').textContent = `${d.tokens.filter(t => t.cssVar).length} tokens`;
    $('#preview-tokens').innerHTML = ['sys.color.action.primary','sys.color.action.onPrimary','sys.color.focus.ring','sys.color.text.primary','sys.color.feedback.danger'].map(path => `<code>${esc(path)}</code>`).join('');
    $('#preview-palette').innerHTML = (card?.colors || []).map(c => `<i style="background:${esc(styleColor(c))}"></i>`).join('');
    $$('[data-preview-state]').forEach(b => b.classList.toggle('active', b.dataset.previewState === st));
  }
  function openContract(id) {
    const c = state.data?.contracts.find(x => x.id === id); if (!c) return;
    $('#contract-drawer-title').textContent = c.title || c.id;
    const arr = v => Array.isArray(v) ? v.join('\n') : '';
    $('#contract-drawer-body').innerHTML = `<form class="contract-form" id="contract-form" data-id="${esc(c.id)}"><div class="row2"><label>标题<input name="title" value="${esc(c.title || '')}" required></label><label>状态<select name="status">${['draft','stable','deprecated'].map(x => `<option value="${x}" ${x === (c.status || 'draft') ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div><label>说明<textarea name="summary" rows="3">${esc(c.summary || '')}</textarea></label><div class="row2"><label>anatomy（每行一项）<textarea name="anatomy" rows="4">${esc(arr(c.anatomy))}</textarea></label><label>states（每行一项）<textarea name="states" rows="4">${esc(arr(c.states))}</textarea></label></div><label>tokens（每行一个 token path）<textarea name="tokens" rows="4">${esc(arr(c.tokens))}</textarea></label><div class="row2"><label>keyboard<textarea name="keyboard" rows="3">${esc(c.keyboard || '')}</textarea></label><label>a11y<textarea name="a11y" rows="3">${esc(c.a11y || '')}</textarea></label></div><div class="row2"><label>do（每行一项）<textarea name="do" rows="3">${esc(arr(c.do))}</textarea></label><label>dont（每行一项）<textarea name="dont" rows="3">${esc(arr(c.dont))}</textarea></label></div><p class="hint">保存会写回 contracts/${esc(c.id)}.contract.json；不自动提交 Git。</p><div class="drawer-actions"><button class="btn" type="submit">保存契约</button><button class="btn ghost" type="button" data-close-contract>取消</button></div></form>`;
    $('#contract-drawer').hidden = false;
  }
  function closeContract() { $('#contract-drawer').hidden = true; }
  async function saveContract(form) {
    const lines = v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    const fd = new FormData(form);
    const patch = { title: String(fd.get('title') || '').trim(), status: String(fd.get('status') || 'draft'), summary: String(fd.get('summary') || '').trim(), anatomy: lines(fd.get('anatomy')), states: lines(fd.get('states')), tokens: lines(fd.get('tokens')), keyboard: String(fd.get('keyboard') || '').trim(), a11y: String(fd.get('a11y') || '').trim(), do: lines(fd.get('do')), dont: lines(fd.get('dont')) };
    try {
      const data = await api('/api/contract', { method: 'POST', body: JSON.stringify({ id: form.dataset.id, patch }) });
      state.data = data; closeContract(); refresh();
      toast('契约已保存', `${patch.title} · ${patch.states.length} states`);
    } catch (e) { toast('保存失败', e.message); }
  }
  function renderAdoption() {
    const a = state.adoption;
    if (!a) return;
    const summary = $('#adoption-summary');
    if (summary) {
      summary.innerHTML = `<div class="adoption-stat ok"><b>${a.filesScanned}</b><span>files scanned</span></div><div class="adoption-stat ok"><b>${a.tokenRefs}</b><span>token refs</span></div><div class="adoption-stat warn"><b>${a.deprecatedRefs}</b><span>deprecated refs</span></div><div class="adoption-stat warn"><b>${a.rawColors}</b><span>raw colors</span></div><div class="adoption-stat warn"><b>${a.unknownRefs}</b><span>unknown vars</span></div><div class="adoption-stat"><b>${a.filesWithTokens}</b><span>files using tokens</span></div>`;
    }
    $('#adoption-status').textContent = a.errors.length ? 'scan error' : 'scanned';
    $('#adoption-token-count').textContent = `${a.tokens.length} tokens`;
    $('#adoption-file-count').textContent = `${a.files.length} files`;
    $('#adoption-tokens').innerHTML = a.tokens.length ? a.tokens.slice(0, 80).map(t => `<div class="adoption-row"><code>${esc(t.path)}</code><b>${t.count}×</b></div>`).join('') : '<div class="empty">没有发现 token 引用。</div>';
    const rows = a.files.slice(0, 100).map(f => `<div class="adoption-row"><code>${esc(f.path)}</code><span><b>${f.tokenRefs}</b> tok · <span class="${f.rawColors ? 'warn' : ''}">${f.rawColors}</span> raw${f.unknownRefs.length ? ` · <span class="bad">${f.unknownRefs.length}</span> unknown` : ''}</span></div>`).join('');
    $('#adoption-files').innerHTML = (a.deprecated.length ? `<div class="adoption-sub">弃用 token 引用</div>${a.deprecated.slice(0, 40).map(d => `<div class="adoption-row"><code>${esc(d.path)}</code><span class="warn">${esc(d.file)}</span></div>`).join('')}` : '') + (a.unknown.length ? `<div class="adoption-sub">未知 --dso- 变量</div>${a.unknown.slice(0, 40).map(u => `<div class="adoption-row"><code>${esc(u.name)}</code><span class="bad">${esc(u.file)}</span></div>`).join('')}` : '') + (rows || '<div class="empty">没有发现引用。</div>');
  }
  async function runAdoption() {
    const root = $('#adoption-root')?.value?.trim();
    if (!root) { toast('需要目录', '例如 ../../design 或 ../my-app'); return; }
    try {
      setStatus('ok', 'scanning');
      const a = await api('/api/adopt', { method: 'POST', body: JSON.stringify({ root }) });
      state.adoption = a;
      renderAdoption();
      setStatus('ok', 'local vault');
      toast('扫描完成', `${a.filesScanned} files · ${a.tokenRefs} refs · ${a.rawColors} raw`);
    } catch (e) { setStatus('err', 'scan failed'); toast('扫描失败', e.message); }
  }
  function styleCardById(id) { return (state.data?.styleCards || []).find(c => c.id === id); }
  function renderCompare() {
    const cards = state.data?.styleCards || [];
    const aSel = $('#compare-a'), bSel = $('#compare-b');
    if (!aSel || !bSel) return;
    if (!cards.length) { $('#compare-grid').innerHTML = '<div class="empty">没有风格卡。</div>'; return; }
    const currentA = state.compareA || cards[0]?.id || '';
    const currentB = state.compareB || cards[1]?.id || cards[0]?.id || '';
    const options = (sel, current) => { sel.innerHTML = cards.map(c => `<option value="${esc(c.id)}" ${c.id === current ? 'selected' : ''}>${esc(c.name)}</option>`).join(''); sel.value = current; };
    options(aSel, cards.some(c => c.id === currentA) ? currentA : cards[0].id);
    options(bSel, cards.some(c => c.id === currentB) ? currentB : cards[0].id);
    state.compareA = aSel.value; state.compareB = bSel.value;
    const a = styleCardById(state.compareA), b = styleCardById(state.compareB);
    if (!a || !b) return;
    const c = x => (x.colors || []).map(v => `<i style="background:${esc(styleColor(v))}"></i>`).join('');
    const ta = new Set(a.colors || []), tb = new Set(b.colors || []);
    const shared = [...ta].filter(x => tb.has(x));
    $('#compare-grid').innerHTML = `<article class="compare-card"><div class="era">${esc(a.era || '—')}</div><h3>${esc(a.name)}</h3><div class="compare-swatches">${c(a)}</div><p>${esc(a.note || '没有写维护/代价。')}</p><div class="compare-token">${(a.colors || []).map(x => esc(x)).join('<br>') || '—'}</div></article><article class="compare-card"><div class="era">${esc(b.era || '—')}</div><h3>${esc(b.name)}</h3><div class="compare-swatches">${c(b)}</div><p>${esc(b.note || '没有写维护/代价。')}</p><div class="compare-token">${(b.colors || []).map(x => esc(x)).join('<br>') || '—'}</div></article><div class="compare-shared">共享色：${shared.length ? esc(shared.join('、')) : '无'} ｜ 语法相同，皮肤不同；不要用风格卡替代 token 语义。</div>`;
  }
  async function loadHistory() {
    try {
      const r = await api('/api/history');
      state.history = r.snapshots || [];
      renderHistory();
    } catch (e) { toast('历史加载失败', e.message); }
  }
  function renderHistory() {
    const list = state.history || [];
    const el = $('#history-list');
    $('#history-count').textContent = `${list.length} snapshots`;
    $('#history-status').textContent = list.length ? '本地已加载' : '还没有快照';
    $('#history-summary').innerHTML = `<div class="history-stat"><b>${list.length}</b><span>snapshots</span></div><div class="history-stat"><b>${list[0]?.tokens ?? '—'}</b><span>latest tokens</span></div><div class="history-stat"><b>${list[0]?.deprecated ?? '—'}</b><span>deprecated</span></div><div class="history-stat"><b>${list[0]?.contracts ?? '—'}</b><span>latest contracts</span></div><div class="history-stat"><b>${list[0]?.styleCards ?? '—'}</b><span>latest cards</span></div>`;
    if (!el) return;
    const trend = list.slice().reverse();
    const maxTokens = Math.max(1, ...trend.map(x => x.tokens));
    $('#history-trend').innerHTML = trend.length ? `<div class="eyebrow">TREND · OLDEST → NEWEST</div><div class="trend-bars">${trend.map(x => `<div class="trend-col" title="${esc(x.createdAt)}"><div class="trend-bar" style="height:${Math.max(4, Math.round(x.tokens / maxTokens * 100))}%"></div><span>${x.tokens}</span></div>`).join('')}</div><div class="trend-meta">${trend.length} 份快照 ｜ 最新 deprecated ${trend[trend.length - 1]?.deprecated ?? 0}` : '';
    el.innerHTML = list.length ? list.map(x => `<button class="history-item ${state.historyId === x.id ? 'active' : ''}" data-history="${esc(x.id)}" type="button"><code>${esc(x.id)}</code><small>${esc(x.createdAt)} · ${x.tokens} tokens / ${x.contracts} contracts</small></button>`).join('') : '<div class="empty">点击“创建快照”生成第一份。</div>';
    if (!state.diff) $('#history-diff').innerHTML = '<div class="empty">选一个快照查看当前 vault 与它的差异。</div>';
  }
  async function snapshotNow() {
    try {
      const r = await api('/api/history', { method: 'POST', body: '{}' });
      state.history = r.snapshots || [];
      state.historyId = r.snapshot.id;
      await diffHistory(r.snapshot.id);
      toast('快照已创建', r.snapshot.id);
    } catch (e) { toast('创建失败', e.message); }
  }
  async function diffHistory(id) {
    try {
      const d = await api('/api/history/diff', { method: 'POST', body: JSON.stringify({ id }) });
      state.diff = d; state.historyId = id;
      renderHistory(); renderDiff();
    } catch (e) { toast('对比失败', e.message); }
  }
  function renderDiff() {
    const d = state.diff; if (!d) return;
    $('#diff-status').textContent = `+${d.counts.added} −${d.counts.removed} ~${d.counts.changed}`;
    const row = (cls, sign, text, detail = '') => `<div class="diff-row ${cls}"><span class="sign">${sign}</span><div><code>${esc(text)}</code>${detail ? `<div class="diff-detail">${esc(detail)}</div>` : ''}</div></div>`;
    const parts = [...d.addedTokens.map(x => row('add', '+', x)), ...d.removedTokens.map(x => row('remove', '−', x)), ...d.changedTokens.map(x => row('change', '~', x.path, `${x.before.raw} → ${x.after.raw}`)), ...d.addedContracts.map(x => row('add', '+', 'contract ' + x)), ...d.removedContracts.map(x => row('remove', '−', 'contract ' + x)), ...d.changedContracts.map(x => row('change', '~', 'contract ' + x)), ...d.addedStyleCards.map(x => row('add', '+', 'style-card ' + x)), ...d.removedStyleCards.map(x => row('remove', '−', 'style-card ' + x)), ...d.changedStyleCards.map(x => row('change', '~', 'style-card ' + x))];
    $('#history-diff').innerHTML = parts.join('') || '<div class="empty">当前 vault 与这份快照没有差异。</div>';
  }
  async function loadTrends() {
    try {
      const r = await api('/api/trends');
      state.trends = r;
      renderTrends();
    } catch (e) { toast('趋势加载失败', e.message); }
  }
  function renderTrends() {
    const r = state.trends;
    $('#trends-status').textContent = r ? `${r.vaults.length} vaults` : '未加载';
    if (!r?.vaults?.length) { $('#trends-grid').innerHTML = '<div class="empty">没有注册 vault。</div>'; return; }
    $('#trends-grid').innerHTML = r.vaults.map(v => {
      const max = Math.max(1, ...v.points.map(p => p.tokens));
      const latest = v.points[v.points.length - 1];
      return `<article class="trend-vault"><h3>${esc(v.name)}</h3><div class="meta">${esc(v.id)} · ${v.points.length} snapshots</div>${v.error ? `<div class="err">${esc(v.error)}</div>` : v.points.length ? `<div class="bars">${v.points.map(p => `<div class="bar" title="${esc(p.createdAt)}" style="height:${Math.max(4, Math.round(p.tokens / max * 100))}%"></div>`).join('')}</div><div class="latest"><span>${latest?.tokens ?? '—'} tokens</span><span>${latest?.deprecated ?? '—'} deprecated</span><span>${latest?.contracts ?? '—'} contracts</span><span>${latest?.styleCards ?? '—'} cards</span></div>` : '<div class="empty">还没有快照。</div>'}</article>`;
    }).join('') + (r.errors?.length ? `<div class="trend-vault"><div class="err">${r.errors.map(esc).join('<br>')}</div></div>` : '');
  }
  async function loadVaultsOverview() {
    try {
      const r = await api('/api/vaults/overview');
      state.overview = r;
      renderVaultsOverview();
    } catch (e) { toast('Vault 总览加载失败', e.message); }
  }
  function renderVaultsOverview() {
    const r = state.overview;
    if (!r) return;
    $('#vaults-status').textContent = `${r.vaults.length} vaults`;
    $('#vaults-count').textContent = `${r.totals.tokens} tokens`;
    $('#vaults-grid').innerHTML = r.vaults.map(v => {
      const active = r.activeVault?.id === v.id;
      return `<article class="vault-card ${active ? 'active' : ''}"><h3>${esc(v.name)}</h3><div class="meta">${esc(v.id)} · ${esc(v.path)}</div><div class="score">${v.error ? '—' : v.score}<small>/100</small></div>${v.error ? `<div class="err">${esc(v.error)}</div>` : ''}<div class="facts"><span><b>${v.tokens}</b>tokens</span><span><b>${v.contracts}</b>contracts</span><span><b>${v.styleCards}</b>cards</span><span><b>${v.warnings}</b>warnings</span></div><div class="actions">${active ? '<span class="chip">当前</span>' : `<button class="text-btn" type="button" data-overview-switch="${esc(v.id)}">切换 →</button>`}<span class="chip">${v.errors} errors</span></div></article>`;
    }).join('');
  }
  function renderChecks() {
    if (!state.data) return;
    const c = state.data.checks;
    $('#check-score').textContent = `${c.score}/100`;
    $('#check-summary').innerHTML = `<div class="check-stat ok"><b>${c.score}</b><span>health score</span></div><div class="check-stat error"><b>${c.errors}</b><span>errors · block</span></div><div class="check-stat warn"><b>${c.warnings}</b><span>warnings · record</span></div><div class="check-stat"><b>${c.infos}</b><span>info</span></div>`;
    renderIssues($('#check-list'), c.issues, false);
  }
  function renderReport() {
    $('#report-heading').textContent = state.reportTemplate === 'health' ? 'Health report' : `Report · ${state.reportTemplate || 'health'}`;
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
    $('#drawer-body').innerHTML = `<div class="field"><label>tier / type</label><div class="value-box">${esc(t.tier)} / ${esc(t.type)}</div></div><div class="field"><label>raw value（vault）</label><div class="value-box">${esc(t.raw)}</div></div><div class="field"><label>resolved</label><div class="value-box">${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}${esc(t.resolved)}</div></div><div class="field"><label>alias</label><div class="value-box">${esc(t.alias || '—')}</div></div><div class="field"><label>contrast vs bg.base</label><div class="value-box">${t.onBase == null ? '—' : t.onBase + ':1'}</div></div><div class="field"><label>lifecycle</label><label class="check-row"><input id="token-deprecated" type="checkbox" ${t.deprecated ? 'checked' : ''}> deprecated</label><input id="token-replaced-by" placeholder="replacedBy token path" value="${esc(t.replacedBy || '')}"><input id="token-note" placeholder="deprecation note" value="${esc(t.deprecationNote || '')}"></div><div class="field"><label>new value</label><input id="token-value" value="${esc(t.raw)}" spellcheck="false"></div><div class="drawer-actions"><button class="btn" type="button" id="save-token">保存到 vault</button><button class="btn ghost" type="button" id="save-lifecycle">保存生命周期</button><button class="btn ghost" type="button" data-close-drawer>取消</button></div><p class="drawer-note">保存会写回源 JSON；LiveDSO 不自动提交 Git。真实项目中建议先开分支/PR。</p>`;
    $('#token-drawer').hidden = false;
    setTimeout(() => $('#token-value')?.focus(), 30);
  }
  function closeDrawer() { $('#token-drawer').hidden = true; state.selected = null; }

  async function saveLifecycle() {
    if (!state.selected) return;
    const path = state.selected.path;
    const deprecated = $('#token-deprecated')?.checked || false;
    const replacedBy = $('#token-replaced-by')?.value || '';
    const note = $('#token-note')?.value || '';
    try {
      const data = await api('/api/token/lifecycle', { method: 'POST', body: JSON.stringify({ path, deprecated, replacedBy, note }) });
      state.data = data; closeDrawer();
      renderOverview(); renderTokens(); renderChecks(); renderPreview();
      toast('生命周期已保存', `${path} · ${deprecated ? 'deprecated' : 'active'}`);
    } catch (e) { toast('保存失败', e.message); }
  }
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
      renderOverview(); renderTokens(); renderContracts(); renderCards(); renderChecks(); renderPreview(); renderVaultSelect();
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
  async function loadReportTemplates() {
    try {
      const r = await api('/api/report/templates');
      const sel = $('#report-template');
      if (!sel) return;
      const current = state.reportTemplate || 'health';
      sel.innerHTML = r.templates.map(t => `<option value="${esc(t.id)}" ${t.id === current ? 'selected' : ''}>${esc(t.name)}${t.custom ? ' · custom' : ''}</option>`).join('');
      sel.value = r.templates.some(t => t.id === current) ? current : 'health';
      state.reportTemplate = sel.value;
    } catch { /* templates are optional */ }
  }
  async function generateReport() {
    try {
      const r = await api('/api/report', { method: 'POST', body: JSON.stringify({ template: state.reportTemplate || 'health' }) });
      state.report = r.markdown;
      renderReport();
      toast('报告已生成', `${state.reportTemplate || 'health'} · 可下载 .md 或复制进 PR。`);
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
      if (e.target.closest('[data-close-contract]')) { closeContract(); return; }
      const ec = e.target.closest('[data-edit-contract]'); if (ec) { openContract(ec.dataset.editContract); return; }
      const ps = e.target.closest('[data-preview-state]'); if (ps) { state.previewState = ps.dataset.previewState; renderPreview(); return; }
      const row = e.target.closest('[data-token]');
      if (row) { openDrawer(row.dataset.token); return; }
      if (e.target.id === 'save-token') { saveSelected(); return; }
      if (e.target.id === 'save-lifecycle') { saveLifecycle(); return; }
      if (e.target.closest('#run-checks') || e.target.closest('#quick-check')) { runChecks(); return; }
      if (e.target.id === 'run-adoption') { runAdoption(); return; }
      if (e.target.id === 'snapshot-now') { snapshotNow(); return; }
      if (e.target.id === 'refresh-trends') { loadTrends(); return; }
      if (e.target.id === 'refresh-vaults') { loadVaultsOverview(); return; }
      const vs = e.target.closest('[data-overview-switch]'); if (vs) { switchVault(vs.dataset.overviewSwitch).then(() => loadVaultsOverview()); return; }
      const hi = e.target.closest('[data-history]'); if (hi) { diffHistory(hi.dataset.history); return; }
      if (e.target.id === 'gen-report') { generateReport(); return; }
      if (e.target.id === 'gen-css') { generateCss(); return; }
      if (e.target.id === 'download-report') { state.report ? download(`livedso-${state.reportTemplate || 'health'}.md`, state.report, 'text/markdown') : toast('还没有报告', '先生成健康报告。'); return; }
      if (e.target.id === 'download-css') { state.css ? download('livedso-tokens.css', state.css, 'text/css') : toast('还没有 CSS', '先生成 CSS 投影。'); return; }
    });
    document.addEventListener('submit', (e) => { if (e.target.id === 'contract-form') { e.preventDefault(); saveContract(e.target); } });
    document.addEventListener('change', (e) => { if (e.target.id === 'preview-card') { state.previewCard = e.target.value; renderPreview(); } if (e.target.id === 'report-template') { state.reportTemplate = e.target.value; } if (e.target.id === 'vault-select') switchVault(e.target.value); if (e.target.id === 'compare-a') { state.compareA = e.target.value; renderCompare(); } if (e.target.id === 'compare-b') { state.compareB = e.target.value; renderCompare(); } });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
    ['token-search', 'tier-filter', 'type-filter', 'lifecycle-filter'].forEach(id => $('#' + id)?.addEventListener('input', renderTokens));
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
