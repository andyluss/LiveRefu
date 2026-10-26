/* 青橙 OS · local state, persistence, theme resolution. */
(function () {
  const DATA = window.OS_DATA;
  const KEY = 'lrdos-state-v1';
  const THEME_LABEL = { system: '系统', light: '浅色', dark: '深色' };
  const ERA_LABEL = {
    archive: { name: 'Archive', sub: '现在' },
    solar: { name: 'Solar', sub: '提案' },
    cyber: { name: 'Cyber', sub: '诊断' }
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pad = (n) => String(n).padStart(2, '0');

  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function addDays(base, n) { const d = new Date(base.getFullYear(), base.getMonth(), base.getDate()); d.setDate(d.getDate() + n); return d; }
  function validTheme(t) { return t === 'system' || t === 'light' || t === 'dark'; }
  function validEra(e) { return e === 'archive' || e === 'solar' || e === 'cyber'; }

  function seedEvents() {
    const out = {};
    const today = new Date();
    for (const ev of DATA.calendarSeed) {
      const d = addDays(today, ev.offset);
      const key = dateKey(d);
      if (!out[key]) out[key] = [];
      out[key].push({ id: 'seed-' + ev.offset, time: ev.time, title: ev.title, tone: ev.tone, seed: true });
    }
    return out;
  }

  const fallback = {
    settings: { theme: 'system', era: 'archive', reduceMotion: false, highContrast: false, largeText: false },
    notes: DATA.notes.map(n => ({ ...n })),
    mails: DATA.mails.map(m => ({ ...m, folder: 'inbox' })),
    events: seedEvents()
  };

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }

  const state = {
    settings: Object.assign({}, fallback.settings, saved.settings || {}),
    notes: Array.isArray(saved.notes) && saved.notes.length ? saved.notes : fallback.notes,
    mails: Array.isArray(saved.mails) && saved.mails.length ? saved.mails : fallback.mails,
    events: saved.events && typeof saved.events === 'object' ? saved.events : fallback.events
  };
  if (!validTheme(state.settings.theme)) state.settings.theme = 'system';
  if (!validEra(state.settings.era)) state.settings.era = 'archive';
  for (const k of ['reduceMotion', 'highContrast', 'largeText']) state.settings[k] = Boolean(state.settings[k]);

  const ui = {
    activeApp: 'finder',
    noteId: 'welcome',
    fileId: 'f-welcome',
    galleryIndex: 0,
    mailId: 'm1',
    mailCompose: false,
    mailFolder: 'inbox',
    calMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    calSelected: dateKey(new Date()),
    radioIndex: 0,
    radioPlaying: false,
    radioElapsed: 0,
    termLines: [],
    termHistory: [],
    termHistoryIndex: 0,
    spotIndex: 0,
    spotItems: [],
    windows: new Map(),
    z: 20
  };

  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolveMode() {
    if (state.settings.theme === 'system') return mq && mq.matches ? 'dark' : 'light';
    return state.settings.theme;
  }

  function apply() {
    const root = document.documentElement;
    root.dataset.theme = state.settings.theme;
    root.dataset.mode = resolveMode();
    root.dataset.era = state.settings.era;
    root.classList.toggle('reduce-motion', state.settings.reduceMotion || (mq && mq.matches && false));
    root.classList.toggle('high-contrast', state.settings.highContrast);
    root.classList.toggle('large-text', state.settings.largeText);
    const themeLabel = document.getElementById('cc-theme-label');
    if (themeLabel) themeLabel.textContent = THEME_LABEL[state.settings.theme];
    const modeLabel = document.getElementById('cc-mode-label');
    if (modeLabel) modeLabel.textContent = root.dataset.mode;
    const eraCode = document.getElementById('cc-era-code');
    if (eraCode) eraCode.textContent = state.settings.era;
    const ccEra = document.getElementById('cc-era-label');
    if (ccEra) ccEra.textContent = `${ERA_LABEL[state.settings.era].name} · ${ERA_LABEL[state.settings.era].sub}`;
    const eraLabel = document.getElementById('era-label');
    if (eraLabel) eraLabel.textContent = ERA_LABEL[state.settings.era].name;
    const eraSub = document.querySelector('.era-sub');
    if (eraSub) eraSub.textContent = ERA_LABEL[state.settings.era].sub;
    document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === state.settings.theme)));
    document.querySelectorAll('[data-era-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.eraSet === state.settings.era)));
    document.querySelectorAll('[data-setting]').forEach(input => { if (input.dataset.setting in state.settings) input.checked = Boolean(state.settings[input.dataset.setting]); });
    document.querySelectorAll('.era-option').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.eraSet === state.settings.era)));
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ settings: state.settings, notes: state.notes, mails: state.mails, events: state.events }));
    } catch (e) { /* storage may be unavailable; keep in-memory */ }
  }

  function setTheme(t) {
    if (!validTheme(t)) return;
    state.settings.theme = t;
    save(); apply();
    if (window.OS && OS.afterSetting) OS.afterSetting('theme');
  }

  function setEra(e) {
    if (!validEra(e)) return;
    state.settings.era = e;
    save(); apply();
    if (window.OS && OS.afterSetting) OS.afterSetting('era');
  }

  function setSetting(k, v) {
    if (!(k in state.settings)) return;
    state.settings[k] = Boolean(v);
    save(); apply();
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function icon(name, cls) {
    const safe = String(name || 'doc').replace(/[^a-z0-9-]/gi, '');
    return `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${safe}"></use></svg>`;
  }

  function formatDateLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return `${y} 年 ${m} 月 ${d} 日`;
  }

  function notify(title, body) {
    if (window.OS && OS.notify) OS.notify(title, body);
  }

  // Keep system appearance live without changing the stored preference.
  if (mq) {
    const onChange = () => { if (state.settings.theme === 'system') apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  window.OS = {
    data: DATA, state, ui, KEY, THEME_LABEL, ERA_LABEL,
    clamp, pad, dateKey, addDays, save, apply, setTheme, setEra, setSetting, reset,
    esc: escapeHtml, icon, formatDateLabel, notify,
    get mode() { return document.documentElement.dataset.mode; },
    get era() { return state.settings.era; },
    get theme() { return state.settings.theme; }
  };
  apply();
})();
