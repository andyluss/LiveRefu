/* 青橙 OS · shell: boot, window manager, dock, menus, overlays, keyboard. */
(function () {
  const D = OS.data;
  const S = OS.state;
  const U = OS.ui;
  const h = OS.esc;
  const ic = OS.icon;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const windowsEl = $('#windows');
  const dockEl = $('#dock');
  let booted = false;
  let lastFocus = null;

  /* ---------------- boot ---------------- */
  function finishBoot() {
    if (booted) return;
    booted = true;
    $('#boot').classList.add('gone');
    setTimeout(() => { const b = $('#boot'); if (b) b.remove(); }, 600);
    openApp('finder');
    setTimeout(() => toast('青橙 OS', '⌘K 打开聚焦搜索；右上角「未来」切换世界。'), 800);
  }
  function startBoot() {
    if (S.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTimeout(finishBoot, 250);
      return;
    }
    let n = 0;
    const status = $('.boot-status');
    const lines = ['正在装载未来……', '检查可读退路……', '建立三张世界皮肤……', '准备桌面。'];
    const t = setInterval(() => { n += 1; if (status) status.textContent = lines[Math.min(n, lines.length - 1)]; }, 380);
    setTimeout(() => { clearInterval(t); finishBoot(); }, 1650);
  }

  /* ---------------- windows ---------------- */
  function appById(id) { return D.apps.find(a => a.id === id); }
  function rectFor(app, index) {
    const mobile = window.innerWidth < 760;
    if (mobile) return { left: 6, top: 6, width: window.innerWidth - 12, height: window.innerHeight - 110 };
    const maxW = Math.max(320, window.innerWidth - 48);
    const maxH = Math.max(240, window.innerHeight - 140);
    const width = Math.min(app.w || 680, maxW);
    const height = Math.min(app.h || 460, maxH);
    const offset = 22 + (index % 6) * 26;
    return {
      left: Math.max(14, Math.min(window.innerWidth - width - 18, Math.round((window.innerWidth - width) / 2) + offset - 70)),
      top: Math.max(12, Math.min(window.innerHeight - height - 90, 58 + (index % 5) * 20)),
      width, height
    };
  }
  function makeWindow(app) {
    const rec = { appId: app.id, el: null, min: false, max: false, z: ++U.z };
    const el = document.createElement('section');
    el.className = 'window';
    el.dataset.app = app.id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', app.title);
    el.innerHTML = `<div class="window-bar">
      <div class="traffic"><button type="button" data-win="close" aria-label="关闭 ${h(app.title)}">${ic('close')}</button><button type="button" data-win="min" aria-label="最小化 ${h(app.title)}">${ic('minus')}</button><button type="button" data-win="max" aria-label="最大化 ${h(app.title)}">${ic('max')}</button></div>
      <div class="win-title">${h(app.title)}</div>
      <div class="win-tools"><button class="icon-btn" type="button" data-win="min" aria-label="最小化">${ic('minus')}</button><button class="icon-btn" type="button" data-win="max" aria-label="最大化">${ic('max')}</button></div>
    </div><div class="window-body"></div><div class="resize" aria-hidden="true"></div>`;
    const r = rectFor(app, U.windows.size);
    Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: rec.z });
    windowsEl.appendChild(el);
    rec.el = el;
    U.windows.set(app.id, rec);
    renderWindow(rec);
    bindWindow(rec);
    return rec;
  }
  function renderWindow(rec) {
    const app = OSApps[rec.appId];
    if (!app) return;
    const body = rec.el.querySelector('.window-body');
    body.innerHTML = app.render();
    body.scrollTop = 0;
    if (app.mount) app.mount(body);
    const title = rec.el.querySelector('.win-title');
    if (title) title.textContent = app.title;
  }
  function bindWindow(rec) {
    const el = rec.el;
    el.addEventListener('pointerdown', () => focusWindow(rec.appId), { passive: true });
    el.querySelectorAll('[data-win]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = b.dataset.win;
      if (action === 'close') closeWindow(rec.appId);
      else if (action === 'min') minimizeWindow(rec.appId);
      else if (action === 'max') maximizeWindow(rec.appId);
    }));
    // drag
    const bar = el.querySelector('.window-bar');
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (window.innerWidth < 640 || el.classList.contains('maximized')) return;
      focusWindow(rec.appId);
      drag = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop };
      bar.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const nextLeft = Math.min(window.innerWidth - 120, Math.max(-el.offsetWidth + 120, drag.left + e.clientX - drag.x));
      const nextTop = Math.min(window.innerHeight - 80, Math.max(2, drag.top + e.clientY - drag.y));
      el.style.left = nextLeft + 'px'; el.style.top = nextTop + 'px';
    });
    const endDrag = () => { drag = null; el.classList.remove('dragging'); };
    bar.addEventListener('pointerup', endDrag); bar.addEventListener('pointercancel', endDrag);
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) maximizeWindow(rec.appId); });
    // resize
    const grip = el.querySelector('.resize');
    let resize = null;
    grip.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); focusWindow(rec.appId);
      resize = { x: e.clientX, y: e.clientY, w: el.offsetWidth, h: el.offsetHeight };
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', (e) => {
      if (!resize) return;
      el.style.width = Math.max(300, resize.w + e.clientX - resize.x) + 'px';
      el.style.height = Math.max(220, resize.h + e.clientY - resize.y) + 'px';
    });
    const endResize = () => { resize = null; };
    grip.addEventListener('pointerup', endResize); grip.addEventListener('pointercancel', endResize);
  }
  function openApp(id) {
    const base = appById(id);
    if (!base) return;
    const meta = OSApps[id];
    const app = meta ? { ...base, ...(meta.w ? { w: meta.w, h: meta.h, title: meta.title } : {}) } : base;
    closeOverlays();
    let rec = U.windows.get(id);
    if (!rec) rec = makeWindow(app);
    if (rec.min) { rec.min = false; rec.el.classList.remove('minimized'); }
    focusWindow(id);
    if (id === 'terminal') setTimeout(() => rec.el.querySelector('#term-input')?.focus(), 30);
    if (id === 'notes') setTimeout(() => rec.el.querySelector('#note-title')?.focus(), 30);
    syncDock();
    return rec;
  }
  function focusWindow(id) {
    const rec = U.windows.get(id);
    if (!rec) return;
    U.activeApp = id;
    U.z += 1;
    rec.el.style.zIndex = U.z;
    U.windows.forEach(r => r.el.classList.toggle('focused', r === rec));
    const app = appById(id);
    $('#active-app').textContent = app ? app.title : 'Finder';
    rec.el.focus({ preventScroll: true });
    syncDock();
  }
  function closeWindow(id) {
    const rec = U.windows.get(id);
    if (!rec) return;
    const app = OSApps[id];
    if (app && app.close) app.close();
    rec.el.classList.add('closing');
    setTimeout(() => rec.el.remove(), 150);
    U.windows.delete(id);
    const remaining = Array.from(U.windows.values()).sort((a, b) => b.z - a.z);
    if (remaining.length) focusWindow(remaining[0].appId);
    else { U.activeApp = ''; $('#active-app').textContent = 'Finder'; }
    syncDock();
  }
  function minimizeWindow(id) {
    const rec = U.windows.get(id);
    if (!rec) return;
    rec.min = true; rec.el.classList.add('minimized');
    const remaining = Array.from(U.windows.values()).filter(r => !r.min).sort((a, b) => b.z - a.z);
    if (remaining.length) focusWindow(remaining[0].appId);
    syncDock();
  }
  function maximizeWindow(id) {
    const rec = U.windows.get(id);
    if (!rec) return;
    rec.max = !rec.max; rec.el.classList.toggle('maximized', rec.max);
    const btn = rec.el.querySelector('[data-win="max"]');
    if (btn) btn.setAttribute('aria-label', rec.max ? '还原窗口' : '最大化窗口');
  }
  function refreshApp(id) {
    const rec = U.windows.get(id);
    if (rec) renderWindow(rec);
  }

  /* ---------------- dock ---------------- */
  function syncDock() {
    if (!dockEl) return;
    $$('.dock-app[data-app-id]', dockEl).forEach(b => {
      const id = b.dataset.appId;
      b.classList.toggle('running', U.windows.has(id));
      b.setAttribute('aria-label', `打开 ${b.dataset.appTitle || id}`);
    });
  }
  function buildDock() {
    dockEl.innerHTML = D.apps.map(a => `<button class="dock-app ${a.tone || ''}" type="button" data-app-id="${h(a.id)}" data-app-title="${h(a.title)}" aria-label="打开 ${h(a.title)}" title="${h(a.title)}"><span class="di">${ic(a.icon)}</span><span class="dl">${h(a.title)}</span><span class="dot"></span></button>`).join('') +
      `<span class="dock-divider" aria-hidden="true"></span><button class="dock-app" type="button" data-open-future="true" title="未来转盘" aria-label="打开未来转盘"><span class="di">${ic('future')}</span><span class="dl">未来</span><span class="dot"></span></button>`;
  }

  /* ---------------- menus ---------------- */
  const menuDefs = {
    file: [
      ['新建笔记', 'note-new'], ['写信', 'mail-compose'], ['分隔', ''], ['关闭窗口', 'close-window'], ['保存笔记', 'note-save']
    ],
    view: [
      ['最大化 / 还原', 'max-window'], ['最小化', 'min-window'], ['分隔', ''], ['未来转盘', 'future'], ['控制中心', 'control']
    ],
    future: [
      ['Archive · 现在', 'era-archive'], ['Solar · 提案', 'era-solar'], ['Cyber · 诊断', 'era-cyber'], ['分隔', ''], ['未来转盘…', 'future'], ['退出实验，回到现在', 'exit-future']
    ],
    help: [
      ['关于青橙 OS', 'about'], ['键盘快捷键', 'shortcuts'], ['可追溯状态', 'provenance'], ['分隔', ''], ['在 Terminal 里 help', 'open-terminal']
    ]
  };
  function closeMenus() {
    const old = $('.menu-pop'); if (old) old.remove();
    $$('.menus button, .brand-menu').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  function openMenu(anchor, name) {
    closeMenus();
    const defs = menuDefs[name] || menuDefs.file;
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.setAttribute('role', 'menu');
    pop.innerHTML = defs.map(([label, action]) => action === '' ? '<hr>' : `<button type="button" role="menuitem" data-menu-action="${h(action)}"><span>${h(label)}</span>${action === 'close-window' ? '<span>⌘W</span>' : action === 'future' ? '<span>⌘F</span>' : ''}</button>`).join('');
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.min(window.innerWidth - 220, Math.max(4, r.left)) + 'px';
    pop.style.top = (r.bottom + 4) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    $$('.menus button').forEach(b => b.setAttribute('aria-expanded', String(b === anchor)));
    pop.querySelectorAll('[data-menu-action]').forEach(b => b.addEventListener('click', () => { const a = b.dataset.menuAction; closeMenus(); runMenuAction(a); }));
    setTimeout(() => document.addEventListener('pointerdown', outsideMenu, { once: true }), 0);
  }
  function outsideMenu(e) { if (!e.target.closest('.menu-pop') && !e.target.closest('.menus') && !e.target.closest('.brand-menu')) closeMenus(); else if (e.target.closest('.menus') || e.target.closest('.brand-menu')) { /* let click handler reopen */ } }
  function runMenuAction(action) {
    const id = U.activeApp;
    if (action === 'note-new') { U.activeApp = 'notes'; openApp('notes'); setTimeout(() => document.querySelector('.window[data-app="notes"] [data-note-new]')?.click(), 60); }
    else if (action === 'note-save') document.querySelector('.window[data-app="notes"] [data-note-save]')?.click();
    else if (action === 'mail-compose') { openApp('mail'); U.mailCompose = true; refreshApp('mail'); }
    else if (action === 'close-window') { if (id) closeWindow(id); }
    else if (action === 'max-window') { if (id) maximizeWindow(id); }
    else if (action === 'min-window') { if (id) minimizeWindow(id); }
    else if (action === 'future') openFuture();
    else if (action === 'control') openControl();
    else if (action === 'about') openAbout();
    else if (action === 'exit-future') exitFuture();
    else if (action === 'provenance') openProvenance();
    else if (action === 'open-terminal') openApp('terminal');
    else if (action === 'shortcuts') toast('快捷键', '⌘K 搜索 · ⌘W 关闭 · ⌘M 最小化 · Esc 关闭浮层');
    else if (action.startsWith('era-')) { OS.setEra(action.slice(4)); closeMenus(); }
  }

  /* ---------------- overlays ---------------- */
  function openOverlay(id) {
    closeMenus();
    const el = document.getElementById(id);
    if (!el) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    const focusable = el.querySelector('input,button,[tabindex]');
    setTimeout(() => focusable && focusable.focus({ preventScroll: true }), 40);
  }
  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el || el.hidden) return;
    el.hidden = true;
    const expanded = { 'future-dial': 'era-pill', 'control-center': 'cc-btn', 'spotlight': 'spotlight-btn' }[id];
    if (expanded) document.getElementById(expanded)?.setAttribute('aria-expanded', 'false');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
  }
  function closeOverlays() { ['spotlight', 'control-center', 'future-dial', 'about', 'lightbox', 'provenance'].forEach(closeOverlay); }
  function openSpotlight() {
    closeOverlays();
    openOverlay('spotlight');
    const input = $('#spotlight-input'); if (input) { input.value = ''; input.focus(); }
    renderSpotlight('');
    $('#spotlight-btn')?.setAttribute('aria-expanded', 'true');
  }
  function openControl() { closeOverlays(); openOverlay('control-center'); $('#cc-btn')?.setAttribute('aria-expanded', 'true'); }
  function openFuture() { closeOverlays(); openOverlay('future-dial'); $('#era-pill')?.setAttribute('aria-expanded', 'true'); }
  function exitFuture() { OS.setEra('archive'); closeOverlay('future-dial'); toast('已退出未来层', '回到 Archive / 现在。你随时可以再进入。'); }
  function openAbout() { closeOverlays(); openOverlay('about'); }
  function openLightbox(index) {
    const g = D.gallery[index]; if (!g) return;
    closeOverlays();
    $('#lightbox-art').className = 'lightbox-art art ' + g.art;
    $('#lightbox-title').textContent = g.title;
    $('#lightbox-desc').textContent = g.desc;
    $('#lightbox-tags').innerHTML = g.tags.map(t => `<span>${h(t)}</span>`).join('');
    openOverlay('lightbox');
  }
  function openProvenance() {
    closeOverlays();
    let el = document.getElementById('provenance');
    if (!el) {
      el = document.createElement('div');
      el.id = 'provenance'; el.className = 'overlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'provenance-title');
      el.innerHTML = `<div class="about-panel provenance-panel"><div class="eyebrow">PROVENANCE / 可追溯状态</div><h2 id="provenance-title">每个现象，都能回到一条状态</h2><p class="about-lede">这不是“解释设计”，而是让视觉变化有数据链、让未来有代价、让退出有路径。</p><div class="prov-table" id="prov-table"></div><div class="about-actions"><button class="btn primary" type="button" data-close-overlay>知道了</button><button class="btn ghost" type="button" data-action="exit-future">回到 Archive</button></div><p class="fine">示例数据均为本地模拟；Storage 键：lrdos-state-v1。</p></div>`;
      $('#desktop').appendChild(el);
      el.addEventListener('click', (e) => { if (e.target === el) closeOverlay('provenance'); });
      el.querySelector('[data-close-overlay]')?.addEventListener('click', () => closeOverlay('provenance'));
      el.querySelector('[data-action="exit-future"]')?.addEventListener('click', () => { exitFuture(); closeOverlay('provenance'); });
    }
    $('#prov-table').innerHTML = [
      ['外观', `${OS.THEME_LABEL[S.settings.theme]} → ${OS.mode}`, '系统/浅色/深色三态；显式选择持久化'],
      ['未来层', `${OS.ERA_LABEL[S.settings.era].name} · ${OS.ERA_LABEL[S.settings.era].sub}`, '色板/材质/措辞；不换语法'],
      ['天气', `${D.weather.city} · ${D.weather.temp}°C`, '虚构气象站；Energy 分项显示代价'],
      ['电台', `${D.tracks[U.radioIndex].title} · ${U.radioPlaying ? '播放中' : '暂停'}`, '波形对应模拟播放进度，不是音频流'],
      ['窗口', `${U.windows.size} 个`, '应用数据本地持久化；窗口位置不持久化'],
      ['可访问性', `reduceMotion=${S.settings.reduceMotion} · highContrast=${S.settings.highContrast} · largeText=${S.settings.largeText}`, '全部可在控制中心关闭']
    ].map(([k, v, note]) => `<div class="prov-row"><div><b>${h(k)}</b><span>${h(note)}</span></div><code>${h(v)}</code></div>`).join('');
    openOverlay('provenance');
  }
  function openShortcuts() { toast('快捷键', '⌘K 搜索 · ⌘W 关闭 · ⌘M 最小化 · ⌘F 未来 · Esc 关闭'); }

  /* ---------------- spotlight ---------------- */
  function spotlightItems(q) {
    const query = q.trim().toLowerCase();
    const apps = D.apps.map(a => ({ type: 'app', id: a.id, title: a.title, sub: '应用', icon: a.icon, action: () => openApp(a.id) }));
    const files = D.files.map(f => ({ type: 'file', id: f.id, title: f.name, sub: f.kind + ' · ' + f.place, icon: f.icon || 'doc', action: () => OSApps.finder.openFile(f.id) }));
    const commands = [
      { title: '未来转盘', sub: '命令 · 切换世界', icon: 'future', action: openFuture },
      { title: '控制中心', sub: '命令 · 外观与可访问性', icon: 'control', action: openControl },
      { title: '可追溯状态', sub: '命令 · 看数据链', icon: 'shield', action: openProvenance },
      { title: 'Terminal help', sub: '命令 · 查看终端命令', icon: 'terminal', action: () => { openApp('terminal'); setTimeout(() => { OSApps.terminal.run('help'); refreshApp('terminal'); }, 20); } }
    ].map(x => ({ ...x, type: 'cmd', id: 'cmd-' + x.title }));
    return [...apps, ...files, ...commands].filter(x => !query || (x.title + ' ' + x.sub).toLowerCase().includes(query));
  }
  function renderSpotlight(q) {
    const items = spotlightItems(q);
    U.spotItems = items; U.spotIndex = 0;
    const box = $('#spotlight-results');
    box.innerHTML = items.length ? items.map((x, i) => `<button class="spotlight-item ${i === 0 ? 'active' : ''}" type="button" data-spot="${i}"><span class="si">${ic(x.icon)}</span><span class="st"><b>${h(x.title)}</b><small>${h(x.sub)}</small></span><span class="sk">${x.type === 'app' ? '打开' : x.type === 'file' ? '文件' : '命令'}</span></button>`).join('') : '<div class="spotlight-empty">没有结果。试试 “finder”“未来”“terminal”。</div>';
    box.querySelectorAll('[data-spot]').forEach(b => b.addEventListener('click', () => { const item = items[Number(b.dataset.spot)]; closeOverlay('spotlight'); item.action(); }));
  }
  function moveSpot(dir) {
    if (!U.spotItems.length) return;
    U.spotIndex = (U.spotIndex + dir + U.spotItems.length) % U.spotItems.length;
    $$('#spotlight-results .spotlight-item').forEach((b, i) => b.classList.toggle('active', i === U.spotIndex));
  }
  function runSpot() { const item = U.spotItems[U.spotIndex]; if (!item) return; closeOverlay('spotlight'); item.action(); }

  /* ---------------- toast ---------------- */
  function toast(title, body) {
    const el = document.createElement('div');
    el.className = 'toast'; el.innerHTML = `<b>${h(title)}</b><span>${h(body)}</span>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(8px)'; setTimeout(() => el.remove(), 240); }, 3600);
  }

  /* ---------------- context menu ---------------- */
  function openContext(x, y, items) {
    const menu = $('#context-menu');
    menu.innerHTML = items.map(([label, action, key]) => `<button type="button" data-context="${h(action)}"><span>${h(label)}</span>${key ? `<span>${h(key)}</span>` : ''}</button>`).join('');
    menu.hidden = false;
    menu.style.left = Math.min(window.innerWidth - 210, x) + 'px';
    menu.style.top = Math.min(window.innerHeight - 220, y) + 'px';
    menu.querySelectorAll('[data-context]').forEach(b => b.addEventListener('click', () => { const a = b.dataset.context; menu.hidden = true; if (a === 'close') closeWindow(U.activeApp); else if (a === 'min') minimizeWindow(U.activeApp); else if (a === 'future') openFuture(); else if (a === 'provenance') openProvenance(); else if (a === 'terminal') openApp('terminal'); else if (a === 'about') openAbout(); }));
  }

  /* ---------------- global events ---------------- */
  function bindGlobal() {
    document.addEventListener('click', (e) => {
      const appBtn = e.target.closest('[data-open-app]');
      if (appBtn) { if (appBtn.dataset.focusNote) U.noteId = appBtn.dataset.focusNote; if (appBtn.dataset.finderLocation) U.finderLocation = appBtn.dataset.finderLocation; openApp(appBtn.dataset.openApp); return; }
      if (e.target.closest('[data-open-future]')) { openFuture(); return; }
      if (e.target.closest('[data-open-file]')) { OSApps.finder.openFile(e.target.closest('[data-open-file]').dataset.openFile); return; }
      const closeBtn = e.target.closest('[data-close-overlay]');
      if (closeBtn) { const overlay = closeBtn.closest('.overlay'); if (overlay) closeOverlay(overlay.id); return; }
      const themeBtn = e.target.closest('[data-theme-set]');
      if (themeBtn) { OS.setTheme(themeBtn.dataset.themeSet); toast('外观', OS.THEME_LABEL[themeBtn.dataset.themeSet]); return; }
      const eraBtn = e.target.closest('[data-era-set]');
      if (eraBtn) { OS.setEra(eraBtn.dataset.eraSet); toast('未来层', `${OS.ERA_LABEL[eraBtn.dataset.eraSet].name} · ${OS.ERA_LABEL[eraBtn.dataset.eraSet].sub}`); syncEraCards(); return; }
      const info = e.target.closest('[data-file-info]'); if (info) { const f = D.files.find(x => x.id === info.dataset.fileInfo); if (f) toast('来源', `${f.name} · ${f.kind} / ${f.place} · ${f.meta}`); return; }
      const action = e.target.closest('[data-action]');
      if (action) { const a = action.dataset.action; if (a === 'about') openAbout(); else if (a === 'provenance') openProvenance(); else if (a === 'reset') { if (confirm('重置所有本地实验数据？')) OS.reset(); } else if (a === 'exit-future') exitFuture(); return; }
      if (e.target.closest('#brand-menu')) { openMenu($('#brand-menu'), 'help'); return; }
      const menuBtn = e.target.closest('[data-menu]');
      if (menuBtn) { openMenu(menuBtn, menuBtn.dataset.menu); return; }
      const dockBtn = e.target.closest('[data-app-id]');
      if (dockBtn) { openApp(dockBtn.dataset.appId); return; }
      const sp = e.target.closest('[data-spot]');
      if (sp) { const item = U.spotItems[Number(sp.dataset.spot)]; if (item) { closeOverlay('spotlight'); item.action(); } return; }
      if (!e.target.closest('.context-menu')) $('#context-menu').hidden = true;
      if (!e.target.closest('.menu-pop') && !e.target.closest('.menus') && !e.target.closest('.brand-menu')) closeMenus();
      if (e.target.classList.contains('overlay')) closeOverlay(e.target.id);
    });
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openSpotlight(); return; }
      if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); if (U.activeApp) closeWindow(U.activeApp); return; }
      if (mod && e.key.toLowerCase() === 'm') { e.preventDefault(); if (U.activeApp) minimizeWindow(U.activeApp); return; }
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); openFuture(); return; }
      if (e.key === 'Escape') {
        const open = ['spotlight', 'control-center', 'future-dial', 'about', 'lightbox', 'provenance'].map(id => document.getElementById(id)).find(el => el && !el.hidden);
        if (open) { e.preventDefault(); closeOverlay(open.id); }
        else closeMenus();
      }
      if (!$('#spotlight')?.hidden) {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveSpot(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); moveSpot(-1); }
        if (e.key === 'Enter') { e.preventDefault(); runSpot(); }
      }
      if (e.key === 'Escape') $('#context-menu').hidden = true;
    });
    $('#spotlight-input')?.addEventListener('input', (e) => renderSpotlight(e.target.value));
    $('#spotlight-btn')?.addEventListener('click', openSpotlight);
    $('#cc-btn')?.addEventListener('click', () => { const el = $('#control-center'); if (el.hidden) openControl(); else closeOverlay('control-center'); });
    $('#era-pill')?.addEventListener('click', () => { const el = $('#future-dial'); if (el.hidden) openFuture(); else closeOverlay('future-dial'); });
    $('#clock')?.addEventListener('click', () => openApp('calendar'));
    $('#boot-skip')?.addEventListener('click', finishBoot);
    document.addEventListener('change', (e) => { const input = e.target.closest('[data-setting]'); if (!input) return; OS.setSetting(input.dataset.setting, input.checked); toast('可访问性', `${input.closest('.switch-row')?.querySelector('span')?.textContent?.split(' ')[0] || input.dataset.setting}：${input.checked ? '开' : '关'}`); });
    // window right click
    windowsEl.addEventListener('contextmenu', (e) => { const win = e.target.closest('.window'); if (!win) return; e.preventDefault(); focusWindow(win.dataset.app); openContext(e.clientX, e.clientY, [['关闭窗口', 'close', '⌘W'], ['最小化', 'min', '⌘M'], ['—', ''], ['未来转盘', 'future'], ['可追溯状态', 'provenance']]); });
    // desktop right click
    $('#desktop').addEventListener('contextmenu', (e) => { if (e.target.closest('.window') || e.target.closest('.dock') || e.target.closest('.menubar') || e.target.closest('.overlay')) return; e.preventDefault(); openContext(e.clientX, e.clientY, [['关于青橙 OS', 'about'], ['未来转盘', 'future'], ['打开 Terminal', 'terminal'], ['—', ''], ['可追溯状态', 'provenance']]); });
    window.addEventListener('resize', () => { /* keep windows inside viewport */ U.windows.forEach(rec => { if (rec.max) return; const el = rec.el; const l = Math.min(window.innerWidth - 80, Math.max(-el.offsetWidth + 80, el.offsetLeft)); const t = Math.min(window.innerHeight - 60, Math.max(0, el.offsetTop)); el.style.left = l + 'px'; el.style.top = t + 'px'; }); });
    // clock
    function tick() { const d = new Date(); const t = `${OS.pad(d.getHours())}:${OS.pad(d.getMinutes())}`; const c = $('#clock'); if (c) c.textContent = t; }
    tick(); setInterval(tick, 15000);
  }
  function syncEraCards() {
    $$('.future-card').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.eraSet === OS.era)));
  }

  /* ---------------- app setting hook ---------------- */
  OS.afterSetting = (kind) => {
    if (kind === 'era') {
      syncEraCards();
      if (U.windows.has('weather')) refreshApp('weather');
      if (U.windows.has('gallery')) refreshApp('gallery');
      if (U.windows.has('settings')) refreshApp('settings');
    }
    if (kind === 'theme' && U.windows.has('settings')) refreshApp('settings');
  };
  OS.openApp = openApp;
  OS.closeWindow = closeWindow;
  OS.minimizeWindow = minimizeWindow;
  OS.maximizeWindow = maximizeWindow;
  OS.focusWindow = focusWindow;
  OS.refreshApp = refreshApp;
  OS.openFuture = openFuture;
  OS.openControl = openControl;
  OS.openAbout = openAbout;
  OS.openProvenance = openProvenance;
  OS.openLightbox = openLightbox;
  OS.notify = toast;

  /* ---------------- init ---------------- */
  function init() {
    buildDock();
    bindGlobal();
    syncEraCards();
    OS.apply();
    startBoot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
