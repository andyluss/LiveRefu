// SPDX-License-Identifier: Apache-2.0
/* LiveDSO · local workbench UI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const loc = (en, zh) => (window.LiveDSO_I18N?.locale === 'en' ? en : zh);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { data: null, view: (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'overview'), error: null, report: '', css: '', selected: null, previewState: 'default', previewCard: '', adoption: null, compareA: '', compareB: '', history: [], diff: null, historyId: '', trends: null, overview: null, reportTemplate: 'health', skin: '', skinAudits: null };
  const THEME_LABEL = { system: '系统', light: '浅色', dark: '深色' };

  async function api(path, options) {
    const lang = window.LiveDSO_I18N?.locale || 'zh';
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${path}${sep}lang=${lang}`, Object.assign({ headers: { 'content-type': 'application/json' } }, options || {}));
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

  const ROUTES = new Set(['overview', 'tokens', 'contracts', 'preview', 'style-cards', 'checks', 'adoption', 'history', 'trends', 'vaults', 'report'])
  function routeFromHash() {
    const raw = (location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0]
    return ROUTES.has(raw) ? raw : 'overview'
  }
  function navigate(view) {
    if (!ROUTES.has(view)) view = 'overview'
    if (routeFromHash() === view && location.hash === `#/${view}`) switchView(view)
    else location.hash = `#/${view}`
  }
  function applyRoute() {
    const view = routeFromHash()
    if (location.hash !== `#/${view}`) history.replaceState(null, '', `#/${view}`)
    switchView(view)
    if (state.data && (view === 'history' || view === 'trends' || view === 'vaults')) {
      // async loaders are triggered by switchView
    }
  }

  function switchView(view) {
    if (!ROUTES.has(view)) view = 'overview'
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

  function renderSkinSelect() {
    const sel = $('#skin-select');
    if (!sel || !state.data) return;
    const current = state.skin || '';
    sel.innerHTML = '<option value="">默认</option>' + state.data.styleCards.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    sel.value = state.data.styleCards.some(c => c.id === current) ? current : '';
    state.skin = sel.value;
  }
  function syncSelectionUrl() {
    if (!state.data) return;
    const u = new URL(location.href);
    const vault = state.data.activeVault?.id || '';
    if (vault) u.searchParams.set('vault', vault); else u.searchParams.delete('vault');
    if (state.skin) u.searchParams.set('skin', state.skin); else u.searchParams.delete('skin');
    // ?lang is an input-only override; never add it here.
    history.replaceState(null, '', u);
  }
  function restoreSkin(allowStored = true) {
    let saved = state.skin || '';
    if (!saved && allowStored) { try { saved = localStorage.getItem('livedso-skin') || ''; } catch (e) {} }
    const card = state.data?.styleCards.find(c => c.id === saved);
    state.skin = card?.id || '';
    if (state.skin) applySkin(state.skin); else applySkin('');
    renderSkinSelect();
  }
  function applySkin(id) {
    const root = document.documentElement;
    const keys = ['--bg','--bg2','--bg-subtle','--surface','--surface2','--raised','--surface-hover','--text','--text-on-surface','--dim','--muted','--text-inverse','--text-link','--text-visited','--text-disabled','--line','--line2','--border-subtle','--divider','--accent','--accent-on','--accent-hover','--accent-pressed','--accent-disabled','--secondary','--secondary-on','--accent2','--warn','--danger','--danger-soft','--ok','--success','--success-soft','--warning-soft','--info','--info-soft','--focus','--glass','--shadow','--backdrop','--selection','--code-bg','--code-text','--chart-1','--chart-2','--chart-3','--chart-4','--chart-5','--chart-6'];
    for (const key of keys) root.style.removeProperty(key);
    if (!id) { state.skin = ''; root.style.removeProperty('color-scheme'); delete root.dataset.skinMode; try { localStorage.removeItem('livedso-skin'); } catch (e) {} syncSelectionUrl(); return; }
    const card = state.data?.styleCards.find(c => c.id === id);
    if (!card) {
      state.skin = ''; root.style.removeProperty('color-scheme'); delete root.dataset.skinMode;
      try { localStorage.removeItem('livedso-skin'); } catch (e) {}
      syncSelectionUrl();
      return;
    }
    const s = previewSkin(card);
    const map = {
      '--bg': s['--dso-sys-color-bg-base'], '--bg2': s['--dso-sys-color-bg-sunken'], '--surface': s['--dso-sys-color-bg-surface'],
      '--surface2': s['--dso-sys-color-bg-surface-raised'], '--raised': s['--dso-sys-color-bg-surface-raised'],
      '--text': s['--dso-sys-color-text-primary'], '--dim': s['--dso-sys-color-text-secondary'], '--muted': s['--dso-sys-color-text-muted'],
      '--line': s['--dso-sys-color-line-subtle'], '--line2': s['--dso-sys-color-line-strong'],
      '--bg-subtle': s['--dso-sys-color-bg-subtle'], '--surface-hover': s['--dso-sys-color-bg-surface-hover'],
      '--text-on-surface': s['--dso-sys-color-text-on-surface'],
      '--text-inverse': s['--dso-sys-color-text-inverse'], '--text-link': s['--dso-sys-color-text-link'],
      '--text-visited': s['--dso-sys-color-text-visited'], '--text-disabled': s['--dso-sys-color-text-disabled'],
      '--border-subtle': s['--dso-sys-color-border-muted'], '--divider': s['--dso-sys-color-divider'],
      '--accent': s['--dso-sys-color-action-primary'], '--accent-on': s['--dso-sys-color-action-on-primary'],
      '--accent-hover': s['--dso-sys-color-action-hover'], '--accent-pressed': s['--dso-sys-color-action-pressed'],
      '--accent-disabled': s['--dso-sys-color-action-disabled'],
      '--secondary': s['--dso-sys-color-action-secondary'], '--secondary-on': s['--dso-sys-color-action-on-secondary'],
      '--accent2': s['--dso-sys-color-feedback-danger'],
      '--warn': s['--dso-sys-color-feedback-warning'], '--danger': s['--dso-sys-color-feedback-danger'],
      '--danger-soft': s['--dso-sys-color-feedback-danger-subtle'],
      '--ok': s['--dso-sys-color-feedback-success'], '--success': s['--dso-sys-color-feedback-success'],
      '--success-soft': s['--dso-sys-color-feedback-success-subtle'], '--warning-soft': s['--dso-sys-color-feedback-warning-subtle'],
      '--info': s['--dso-sys-color-feedback-info'], '--info-soft': s['--dso-sys-color-feedback-info-subtle'],
      '--focus': s['--dso-sys-color-focus-ring'], '--glass': 'color-mix(in srgb, ' + s['--dso-sys-color-bg-surface'] + ' 86%, transparent)',
      '--shadow': s['--dso-shadow'], '--backdrop': colorLum(s['--dso-sys-color-bg-base']) > 0.45 ? 'rgba(40,30,10,.28)' : 'rgba(0,0,0,.48)',
      '--selection': s['--dso-sys-color-selection'], '--code-bg': s['--dso-sys-color-code-bg'], '--code-text': s['--dso-sys-color-code-text'],
      '--chart-1': s['--dso-sys-color-chart-1'], '--chart-2': s['--dso-sys-color-chart-2'], '--chart-3': s['--dso-sys-color-chart-3'],
      '--chart-4': s['--dso-sys-color-chart-4'], '--chart-5': s['--dso-sys-color-chart-5'], '--chart-6': s['--dso-sys-color-chart-6']
    };
    for (const [k, v] of Object.entries(map)) if (v) root.style.setProperty(k, v);
    const mode = colorLum(s['--dso-sys-color-bg-base']) > 0.45 ? 'light' : 'dark';
    root.style.colorScheme = mode;
    root.dataset.skinMode = mode;
    state.skin = id;
    try { localStorage.setItem('livedso-skin', id); } catch (e) {}
    syncSelectionUrl();
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
      state.skinAudits = null;
      renderOverview(); renderTokens(); renderContracts(); renderCards(); renderChecks(); renderPreview(); renderVaultSelect();
      restoreSkin();
      syncSelectionUrl();
      loadSkinAudits();
      if (state.view === 'vaults') loadVaultsOverview();
      toast('藏库已切换', `${data.activeVault?.name || id} · ${data.counts.tokens} ${loc('tokens','个 Token')}`);
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
    $('#token-count').textContent = `${d.counts.tokens} ${loc('tokens','个 Token')}`;
    $('#vault-path').textContent = d.root.replace(/^.*\/lab\/livedso\//, 'lab/livedso/');
    $('#node-version').textContent = 'Node: ' + (d.runtime || 'local');
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
      return `<tr data-token="${esc(t.path)}"><td>${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}<code>${esc(t.path)}</code></td><td><span class="tier ${esc(t.tier)}">${esc(t.tier)}</span></td><td><code>${esc(t.raw)}</code></td><td><code>${esc(t.resolved)}</code></td><td>${t.deprecated ? `<span class="lifecycle-badge">${loc('deprecated','已弃用')}</span>` : `<span class="lifecycle-active">${loc('active','活跃')}</span>`}</td><td><span class="ratio ${t.onBase == null ? '' : ratioClass}">${ratio}</span></td><td><code>${esc(t.source)}</code></td></tr>`;
    }).join('');
  }

  function requiredFields() { return ['anatomy', 'states', 'tokens', 'keyboard', 'a11y', 'do', 'dont']; }
  function renderContracts() {
    if (!state.data) return;
    const list = state.data.contracts;
    $('#contract-filter-count').textContent = `${list.length} ${loc('contracts','份契约')}`;
    const grid = $('#contract-grid');
    if (!list.length) { grid.innerHTML = '<div class="empty">没有契约。先加一个 button.contract.json。</div>'; return; }
    grid.innerHTML = list.map(c => {
      const required = requiredFields();
      const badges = required.map(k => `<span class="badge ${c[k] ? 'ok' : 'miss'}">${esc(k)}</span>`).join('');
      return `<article class="contract-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><h3>${esc(c.title)}</h3><button class="text-btn contract-edit" type="button" data-edit-contract="${esc(c.id)}">编辑 →</button><span class="chip">${esc(c.status || '—')}</span></div><p>${esc(c.summary || '没有说明。')}</p><div class="badges">${badges}</div><div class="contract-meta"><b>id</b><span><code>${esc(c.id)}</code></span><b>${loc('states','状态')}</b><span>${esc((c.states || []).join(' · ') || '—')}</span><b>tokens</b><span>${esc((c.tokens || []).join(' · ') || '—')}</span></div></article>`;
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
    const audits = state.skinAudits?.audits || [];
    const byId = new Map(audits.map(a => [a.id, a]));
    const grade = (a) => {
      if (!a) return { label: '…', cls: 'pending' };
      if (!a.ok) return { label: 'FAIL', cls: 'fail' };
      const ratio = (name) => a.pairs.find(p => p.name === name)?.ratio || 0;
      const aaa = ratio('text/surface') >= 7 && ratio('textMuted/surface') >= 7 && ratio('onAction/action') >= 7 && ratio('focus/surface') >= 4.5 && ratio('border/surface') >= 4.5;
      return { label: aaa ? 'AAA' : 'AA', cls: aaa ? 'aaa' : 'pass' };
    };
    $('#card-filter-count').textContent = `${cards.length} ${loc('cards','张卡')}`;
    const pass = audits.filter(a => a.ok).length, fail = audits.length - pass;
    const summary = $('#skin-audit-summary');
    if (summary) summary.textContent = audits.length ? `${pass}/${audits.length} ${loc('passing','通过')}${fail ? ` · ${fail} ${loc('failing','不达标')}` : ''}` : loc('Checking contrast…','检查对比度……');
    const grid = $('#card-grid');
    if (!cards.length) { grid.innerHTML = '<div class="empty">没有风格卡。</div>'; return; }
    grid.innerHTML = cards.map(c => {
      const a = byId.get(c.id); const g = grade(a);
      const detail = a ? a.pairs.map(p => `${p.name} ${p.ratio}:1${p.ok ? '' : ' ✗'}`).join(' · ') : '';
      return `<article class="style-card"><span class="skin-grade ${g.cls}" title="${esc(detail)}">${g.label}</span><div class="style-swatches">${(c.colors || []).map(color => `<i style="background:${esc(styleColor(color))}"></i>`).join('')}</div><div class="style-body"><div class="era">${esc(c.era || '—')}</div><h3>${esc(c.name)}</h3><p>${esc(c.note || '没有写维护/代价。')}</p><div class="badges" style="margin-top:7px">${(c.colors || []).map(x => `<span class="badge">${esc(x)}</span>`).join('')}</div></div></article>`;
    }).join('');
  }
  async function loadSkinAudits() {
    try {
      state.skinAudits = await api('/api/skins/audit');
    } catch (e) {
      state.skinAudits = null;
    }
    if (state.view === 'style-cards') renderCards();
  }
  function colorLum(hex) {
    const h = String(hex || '').replace('#', '');
    if (!/^[0-9a-f]{3,8}$/i.test(h)) return 0;
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
    const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrastHex(a, b) {
    const la = colorLum(a), lb = colorLum(b);
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  function textOn(hex) { return contrastHex('#0B0F14', hex) >= contrastHex('#F6F1E7', hex) ? '#0B0F14' : '#F6F1E7'; }
  function mixColor(a, b, pct) { return `color-mix(in srgb, ${a} ${pct}%, ${b})`; }
  function ensureContrast(fg, bg, min, fallback) { return contrastHex(fg, bg) + 0.005 >= min ? fg : fallback; }
  function previewSkin(card) {
    const palette = (card?.colors || []).map(styleColor).filter(c => c && c !== 'transparent');
    const role = card?.roles || {};
    const pick = (key, fallback) => role[key] ? (styleColor(role[key]) || fallback) : fallback;
    const bg = pick('bg', palette[0] || '#0B0F14');
    const surface = pick('surface', palette[1] || bg);
    const mode = card?.mode || (colorLum(bg) > 0.45 ? 'light' : 'dark');
    const text = pick('text', textOn(bg));
    const textOnSurface = pick('textOnSurface', text);
    const action = pick('action', palette[3] || palette[2] || '#4FD1C5');
    const focus = ensureContrast(pick('focus', palette[4] || action), surface, 3, text);
    const danger = pick('danger', '#FF6B35');
    const success = pick('success', action);
    const warning = pick('warning', focus);
    const info = pick('info', action);
    const muted = pick('textMuted', mixColor(text, bg, 85));
    const subtle = pick('textSubtle', mixColor(text, bg, 70));
    const border = pick('border', mixColor(text, surface, 70));
    const borderStrong = pick('borderStrong', mixColor(text, surface, 85));
    const raised = pick('surfaceRaised', mode === 'light' ? mixColor(text, surface, 4) : mixColor(text, surface, 8));
    const sunken = pick('surfaceSunken', mixColor(text, bg, 4));
    const onAction = pick('onAction', textOn(action));
    const secondaryAction = pick('secondaryAction', surface);
    const onSecondaryAction = pick('onSecondaryAction', textOn(secondaryAction));
    const onDanger = pick('onDanger', textOn(danger));
    const onSuccess = pick('onSuccess', textOn(success));
    const onWarning = pick('onWarning', textOn(warning));
    const onInfo = pick('onInfo', textOn(info));
    const vars = {
      '--dso-sys-color-bg-base': bg,
      '--dso-sys-color-bg-subtle': pick('bgSubtle', mixColor(text, bg, 4)),
      '--dso-sys-color-bg-surface': surface,
      '--dso-sys-color-bg-surface-raised': raised,
      '--dso-sys-color-bg-surface-sunken': sunken,
      '--dso-sys-color-bg-surface-hover': pick('surfaceHover', mixColor(text, surface, 8)),
      '--dso-sys-color-text-primary': text,
      '--dso-sys-color-text-on-surface': textOnSurface,
      '--dso-sys-color-text-secondary': muted,
      '--dso-sys-color-text-muted': subtle,
      '--dso-sys-color-text-inverse': pick('textInverse', textOn(surface)),
      '--dso-sys-color-text-link': pick('textLink', ensureContrast(action, bg, 4.5, text)),
      '--dso-sys-color-text-visited': pick('textVisited', mixColor(action, text, 35)),
      '--dso-sys-color-text-disabled': pick('textDisabled', mixColor(text, bg, 45)),
      '--dso-sys-color-border-subtle': border,
      '--dso-sys-color-border-strong': borderStrong,
      '--dso-sys-color-border-muted': pick('borderSubtle', mixColor(text, surface, 40)),
      '--dso-sys-color-divider': pick('divider', mixColor(text, surface, 30)),
      '--dso-sys-color-focus-ring': focus,
      '--dso-sys-color-action-primary': action,
      '--dso-sys-color-action-hover': pick('actionHover', mixColor(text, action, 12)),
      '--dso-sys-color-action-pressed': pick('actionPressed', mixColor(bg, action, 20)),
      '--dso-sys-color-action-disabled': pick('actionDisabled', mixColor(action, bg, 55)),
      '--dso-sys-color-action-on-primary': onAction,
      '--dso-sys-color-action-secondary': secondaryAction,
      '--dso-sys-color-action-on-secondary': onSecondaryAction,
      '--dso-sys-color-action-ghost': pick('ghostAction', text),
      '--dso-sys-color-feedback-danger': danger,
      '--dso-sys-color-feedback-on-danger': onDanger,
      '--dso-sys-color-feedback-danger-subtle': pick('dangerSubtle', mixColor(danger, bg, 12)),
      '--dso-sys-color-feedback-success': success,
      '--dso-sys-color-feedback-on-success': onSuccess,
      '--dso-sys-color-feedback-success-subtle': pick('successSubtle', mixColor(success, bg, 12)),
      '--dso-sys-color-feedback-warning': warning,
      '--dso-sys-color-feedback-on-warning': onWarning,
      '--dso-sys-color-feedback-warning-subtle': pick('warningSubtle', mixColor(warning, bg, 12)),
      '--dso-sys-color-feedback-info': info,
      '--dso-sys-color-feedback-on-info': onInfo,
      '--dso-sys-color-feedback-info-subtle': pick('infoSubtle', mixColor(info, bg, 12)),
      '--dso-sys-color-accent': pick('accent', action),
      '--dso-sys-color-accent-2': pick('accent2', danger),
      '--dso-sys-color-selection': pick('selection', mixColor(action, bg, 35)),
      '--dso-sys-color-code-bg': pick('codeBg', mixColor(text, bg, 5)),
      '--dso-sys-color-code-text': pick('codeText', text),
      '--dso-sys-color-chart-1': pick('chart1', action),
      '--dso-sys-color-chart-2': pick('chart2', focus),
      '--dso-sys-color-chart-3': pick('chart3', danger),
      '--dso-sys-color-chart-4': pick('chart4', success),
      '--dso-sys-color-chart-5': pick('chart5', warning),
      '--dso-sys-color-chart-6': pick('chart6', info),
      '--dso-shadow': mode === 'light' ? '0 24px 70px rgba(60,45,20,.16)' : '0 24px 70px rgba(0,0,0,.38)'
    };
    return vars;
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
      canvas.innerHTML = `<div class="pv-row">${btn('主按钮')}${btn('次要按钮', 'secondary')}${btn('幽灵按钮', 'ghost')}</div><label class="pv-field"><span>邮箱</span><input class="pv-input ${st === 'focus' ? 'focus' : ''}" value="you@example.com" ${st === 'disabled' ? 'disabled' : ''}><small class="pv-error">${st === 'disabled' ? '禁用时仍需说明原因。' : '错误用文本说明，不只靠颜色。'}</small></label><div class="pv-panel"><div><b>面板标题</b><small>这套 token 来自当前藏库，不是截图。</small></div><span class="pv-badge">${esc({ default: loc('default','默认'), hover: loc('hover','悬停'), focus: loc('focus','聚焦'), disabled: loc('disabled','禁用') }[st] || st)}</span></div>`;
    }
    $('#preview-token-count').textContent = `${d.tokens.filter(t => t.cssVar).length} ${loc('tokens','个 Token')}`;
    const rolePaths = [...new Set(Object.values(card?.roles || {}).filter(Boolean))];
    $('#preview-tokens').innerHTML = (rolePaths.length ? rolePaths : (card?.colors || [])).map(path => `<code>${esc(path)}</code>`).join('');
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
      summary.innerHTML = `<div class="adoption-stat ok"><b>${a.filesScanned}</b><span>${loc('files scanned','扫描文件')}</span></div><div class="adoption-stat ok"><b>${a.tokenRefs}</b><span>${loc('token refs','Token 引用')}</span></div><div class="adoption-stat warn"><b>${a.deprecatedRefs}</b><span>${loc('deprecated refs','弃用引用')}</span></div><div class="adoption-stat warn"><b>${a.rawColors}</b><span>${loc('raw colors','裸色')}</span></div><div class="adoption-stat warn"><b>${a.unknownRefs}</b><span>${loc('unknown vars','未知变量')}</span></div><div class="adoption-stat"><b>${a.filesWithTokens}</b><span>${loc('files using tokens','使用 Token 的文件')}</span></div>`;
    }
    $('#adoption-status').textContent = a.errors.length ? 'scan error' : 'scanned';
    $('#adoption-token-count').textContent = `${a.tokens.length} ${loc('tokens','个 Token')}`;
    $('#adoption-file-count').textContent = `${a.files.length} ${loc('files','个文件')}`;
    $('#adoption-tokens').innerHTML = a.tokens.length ? a.tokens.slice(0, 80).map(t => `<div class="adoption-row"><code>${esc(t.path)}</code><b>${t.count}×</b></div>`).join('') : '<div class="empty">没有发现 token 引用。</div>';
    const rows = a.files.slice(0, 100).map(f => `<div class="adoption-row"><code>${esc(f.path)}</code><span><b>${f.tokenRefs}</b> tok · <span class="${f.rawColors ? 'warn' : ''}">${f.rawColors}</span> raw${f.unknownRefs.length ? ` · <span class="bad">${f.unknownRefs.length}</span> unknown` : ''}</span></div>`).join('');
    $('#adoption-files').innerHTML = (a.deprecated.length ? `<div class="adoption-sub">弃用 token 引用</div>${a.deprecated.slice(0, 40).map(d => `<div class="adoption-row"><code>${esc(d.path)}</code><span class="warn">${esc(d.file)}</span></div>`).join('')}` : '') + (a.unknown.length ? `<div class="adoption-sub">未知 --dso- 变量</div>${a.unknown.slice(0, 40).map(u => `<div class="adoption-row"><code>${esc(u.name)}</code><span class="bad">${esc(u.file)}</span></div>`).join('')}` : '') + (rows || '<div class="empty">没有发现引用。</div>');
  }
  async function runAdoption() {
    const root = $('#adoption-root')?.value?.trim();
    if (!root) { toast('需要目录', '例如 ../../design 或 ../my-app'); return; }
    try {
      setStatus('ok', loc('Scanning','扫描中'));
      const a = await api('/api/adopt', { method: 'POST', body: JSON.stringify({ root }) });
      state.adoption = a;
      renderAdoption();
      setStatus('ok', loc('Local vault','本地藏库'));
      toast('扫描完成', `${a.filesScanned} files · ${a.tokenRefs} refs · ${a.rawColors} raw`);
    } catch (e) { setStatus('err', loc('Scan failed','扫描失败')); toast('扫描失败', e.message); }
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
    $('#history-count').textContent = `${list.length} ${loc('snapshots','份快照')}`;
    $('#history-status').textContent = list.length ? '本地已加载' : '还没有快照';
    $('#history-summary').innerHTML = `<div class="history-stat"><b>${list.length}</b><span>${loc('snapshots','快照')}</span></div><div class="history-stat"><b>${list[0]?.tokens ?? '—'}</b><span>${loc('latest tokens','最新 Token')}</span></div><div class="history-stat"><b>${list[0]?.deprecated ?? '—'}</b><span>${loc('deprecated','弃用')}</span></div><div class="history-stat"><b>${list[0]?.contracts ?? '—'}</b><span>${loc('latest contracts','最新契约')}</span></div><div class="history-stat"><b>${list[0]?.styleCards ?? '—'}</b><span>${loc('latest cards','最新卡')}</span></div>`;
    if (!el) return;
    const trend = list.slice().reverse();
    const maxTokens = Math.max(1, ...trend.map(x => x.tokens));
    $('#history-trend').innerHTML = trend.length ? `<div class="eyebrow">${loc('TREND · OLDEST → NEWEST','趋势 · 旧 → 新')}</div><div class="trend-bars">${trend.map(x => `<div class="trend-col" title="${esc(x.createdAt)}"><div class="trend-bar" style="height:${Math.max(4, Math.round(x.tokens / maxTokens * 100))}%"></div><span>${x.tokens}</span></div>`).join('')}</div><div class="trend-meta">${trend.length} ${loc('snapshots','份快照')} ｜ ${loc('latest deprecated','最新弃用')} ${trend[trend.length - 1]?.deprecated ?? 0}` : '';
    el.innerHTML = list.length ? list.map(x => `<button class="history-item ${state.historyId === x.id ? 'active' : ''}" data-history="${esc(x.id)}" type="button"><code>${esc(x.id)}</code><small>${esc(x.createdAt)} · ${x.tokens} ${loc('tokens','Token')} / ${x.contracts} ${loc('contracts','契约')}</small></button>`).join('') : '<div class="empty">点击“创建快照”生成第一份。</div>';
    if (!state.diff) $('#history-diff').innerHTML = '<div class="empty">选一个快照查看当前藏库与它的差异。</div>';
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
    const parts = [...d.addedTokens.map(x => row('add', '+', x)), ...d.removedTokens.map(x => row('remove', '−', x)), ...d.changedTokens.map(x => row('change', '~', x.path, `${x.before.raw} → ${x.after.raw}`)), ...d.addedContracts.map(x => row('add', '+', loc('contract ','契约 ') + x)), ...d.removedContracts.map(x => row('remove', '−', loc('contract ','契约 ') + x)), ...d.changedContracts.map(x => row('change', '~', loc('contract ','契约 ') + x)), ...d.addedStyleCards.map(x => row('add', '+', loc('style-card ','风格卡 ') + x)), ...d.removedStyleCards.map(x => row('remove', '−', loc('style-card ','风格卡 ') + x)), ...d.changedStyleCards.map(x => row('change', '~', loc('style-card ','风格卡 ') + x))];
    $('#history-diff').innerHTML = parts.join('') || '<div class="empty">当前藏库与这份快照没有差异。</div>';
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
    $('#trends-status').textContent = r ? `${r.vaults.length} ${loc('vaults','个藏库')}` : loc('Not loaded','未加载');
    if (!r?.vaults?.length) { $('#trends-grid').innerHTML = '<div class="empty">没有注册藏库。</div>'; return; }
    $('#trends-grid').innerHTML = r.vaults.map(v => {
      const max = Math.max(1, ...v.points.map(p => p.tokens));
      const latest = v.points[v.points.length - 1];
      return `<article class="trend-vault"><h3>${esc(v.name)}</h3><div class="meta">${esc(v.id)} · ${v.points.length} ${loc('snapshots','份快照')}</div>${v.error ? `<div class="err">${esc(v.error)}</div>` : v.points.length ? `<div class="bars">${v.points.map(p => `<div class="bar" title="${esc(p.createdAt)}" style="height:${Math.max(4, Math.round(p.tokens / max * 100))}%"></div>`).join('')}</div><div class="latest"><span>${latest?.tokens ?? '—'} ${loc('tokens','Token')}</span><span>${latest?.deprecated ?? '—'} ${loc('deprecated','弃用')}</span><span>${latest?.contracts ?? '—'} ${loc('contracts','契约')}</span><span>${latest?.styleCards ?? '—'} ${loc('cards','卡')}</span></div>` : '<div class="empty">还没有快照。</div>'}</article>`;
    }).join('') + (r.errors?.length ? `<div class="trend-vault"><div class="err">${r.errors.map(esc).join('<br>')}</div></div>` : '');
  }
  async function loadVaultsOverview() {
    try {
      const r = await api('/api/vaults/overview');
      state.overview = r;
      renderVaultsOverview();
    } catch (e) { toast('藏库总览加载失败', e.message); }
  }
  function renderVaultsOverview() {
    const r = state.overview;
    if (!r) return;
    $('#vaults-status').textContent = `${r.vaults.length} ${loc('vaults','个藏库')}`;
    $('#vaults-count').textContent = `${r.totals.tokens} ${loc('tokens','个 Token')}`;
    $('#vaults-grid').innerHTML = r.vaults.map(v => {
      const active = r.activeVault?.id === v.id;
      return `<article class="vault-card ${active ? 'active' : ''}"><h3>${esc(v.name)}</h3><div class="meta">${esc(v.id)} · ${esc(v.path)}</div><div class="score">${v.error ? '—' : v.score}<small>/100</small></div>${v.error ? `<div class="err">${esc(v.error)}</div>` : ''}<div class="facts"><span><b>${v.tokens}</b>${loc('tokens','Token')}</span><span><b>${v.contracts}</b>${loc('contracts','契约')}</span><span><b>${v.styleCards}</b>${loc('cards','卡')}</span><span><b>${v.warnings}</b>${loc('warnings','警告')}</span></div><div class="actions">${active ? '<span class="chip">当前</span>' : `<button class="text-btn" type="button" data-overview-switch="${esc(v.id)}">切换 →</button>`}<span class="chip">${v.errors} ${loc('errors','错误')}</span></div></article>`;
    }).join('');
  }
  function renderChecks() {
    if (!state.data) return;
    const c = state.data.checks;
    $('#check-score').textContent = `${c.score}/100`;
    $('#check-summary').innerHTML = `<div class="check-stat ok"><b>${c.score}</b><span>${loc('health score','健康分')}</span></div><div class="check-stat error"><b>${c.errors}</b><span>${loc('errors · block','错误 · 阻断')}</span></div><div class="check-stat warn"><b>${c.warnings}</b><span>${loc('warnings · record','警告 · 记录')}</span></div><div class="check-stat"><b>${c.infos}</b><span>${loc('info','信息')}</span></div>`;
    renderIssues($('#check-list'), c.issues, false);
  }
  function renderReport() {
    $('#report-heading').textContent = state.reportTemplate === 'health' ? loc('Health report','健康报告') : `${loc('Report','报告')} · ${state.reportTemplate || 'health'}`;
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
    $('#drawer-body').innerHTML = `<div class="field"><label>${loc('Tier / type','层级 / 类型')}</label><div class="value-box">${esc(t.tier)} / ${esc(t.type)}</div></div><div class="field"><label>${loc('Raw value (vault)','原始值（藏库）')}</label><div class="value-box">${esc(t.raw)}</div></div><div class="field"><label>${loc('Resolved','解析值')}</label><div class="value-box">${color ? `<i class="swatch" style="background:${esc(color)}"></i>` : ''}${esc(t.resolved)}</div></div><div class="field"><label>${loc('Alias','别名')}</label><div class="value-box">${esc(t.alias || '—')}</div></div><div class="field"><label>${loc('Contrast vs bg.base','对比度（相对背景）')}</label><div class="value-box">${t.onBase == null ? '—' : t.onBase + ':1'}</div></div><div class="field"><label>${loc('Lifecycle','生命周期')}</label><label class="check-row"><input id="token-deprecated" type="checkbox" ${t.deprecated ? 'checked' : ''}> ${loc('deprecated','已弃用')}</label><input id="token-replaced-by" placeholder="${loc('replacedBy token path','替代 Token 路径')}" value="${esc(t.replacedBy || '')}"><input id="token-note" placeholder="${loc('deprecation note','弃用说明')}" value="${esc(t.deprecationNote || '')}"></div><div class="field"><label>${loc('New value','新值')}</label><input id="token-value" value="${esc(t.raw)}" spellcheck="false"></div><div class="drawer-actions"><button class="btn" type="button" id="save-token">${loc('Save to vault','保存到藏库')}</button><button class="btn ghost" type="button" id="save-lifecycle">${loc('Save lifecycle','保存生命周期')}</button><button class="btn ghost" type="button" data-close-drawer>取消</button></div><p class="drawer-note">保存会写回源 JSON；${loc('LiveAtelier does not auto-commit to Git.','灵动构坊不自动提交 Git。')}真实项目中建议先开分支/PR。</p>`;
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
      setStatus('ok', loc('Saving','保存中'));
      const selectedPath = state.selected.path;
      const data = await api('/api/token', { method: 'POST', body: JSON.stringify({ path: selectedPath, value }) });
      state.data = data;
      closeDrawer();
      renderOverview(); renderTokens(); renderChecks();
      toast('Token 已保存', `${selectedPath} → ${value}`);
      setStatus('ok', loc('Local vault','本地藏库'));
    } catch (e) {
      setStatus('err', loc('Save failed','保存失败'));
      toast('保存失败', e.message);
    }
  }

  async function refresh() {
    try {
      setStatus('ok', loc('Local vault','本地藏库'));
      state.data = await api('/api/state');
      const params = new URLSearchParams(location.search);
      const requestedVault = params.get('vault');
      if (requestedVault && requestedVault !== state.data.activeVault?.id && state.data.vaults.some(v => v.id === requestedVault)) {
        const next = await api('/api/vault', { method: 'POST', body: JSON.stringify({ id: requestedVault }) });
        if (next) state.data = next;
      }
      if (params.has('skin')) state.skin = params.get('skin') || '';
      state.error = null;
      renderOverview(); renderTokens(); renderContracts(); renderCards(); renderChecks(); renderPreview(); renderVaultSelect();
      restoreSkin(!params.has('skin'));
      syncSelectionUrl();
      if (state.view === 'report') renderReport();
      loadSkinAudits();
    } catch (e) {
      state.error = e.message;
      setStatus('err', loc('Offline','离线'));
      $('#health-label').textContent = '无法连接本地藏库';
      $('#health-detail').textContent = e.message + ' — 运行 node src/cli.ts serve';
      toast('连接失败', e.message);
    }
  }

  async function runChecks() {
    try {
      setStatus('ok', loc('Checking','检查中'));
      await api('/api/check', { method: 'POST', body: '{}' });
      await refresh();
      switchView('checks');
      toast('Checks 完成', `${state.data.checks.errors} errors · ${state.data.checks.warnings} warnings`);
    } catch (e) { setStatus('err', loc('Check failed','检查失败')); toast('检查失败', e.message); }
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
      if (view) { navigate(view.dataset.view); return; }
      const theme = e.target.closest('[data-theme-set]');
      if (theme) {
        if (state.skin) { applySkin(''); const sk = $('#skin-select'); if (sk) sk.value = ''; toast('皮肤已重置', '主题切换优先于风格卡。'); }
        applyTheme(theme.dataset.themeSet, true); toast('外观', THEME_LABEL[theme.dataset.themeSet]); return;
      }
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
    document.addEventListener('livedso:locale', () => { if (state.data) refresh(); });
    document.addEventListener('change', (e) => { if (e.target.id === 'preview-card') { state.previewCard = e.target.value; renderPreview(); } if (e.target.id === 'report-template') { state.reportTemplate = e.target.value; } if (e.target.id === 'vault-select') switchVault(e.target.value); if (e.target.id === 'skin-select') applySkin(e.target.value); if (e.target.id === 'compare-a') { state.compareA = e.target.value; renderCompare(); } if (e.target.id === 'compare-b') { state.compareB = e.target.value; renderCompare(); } });
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

  window.addEventListener('hashchange', applyRoute);
  bind();
  refresh().then(applyRoute);
  setInterval(() => { if (state.data && state.view !== 'tokens') renderOverview(); }, 60000);
})();
