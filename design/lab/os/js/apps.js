/* 青橙 OS · nine apps. Rendering is plain HTML; state lives in OS.state. */
(function () {
  const D = OS.data;
  const S = OS.state;
  const U = OS.ui;
  const h = OS.esc;
  const ic = OS.icon;
  const nowStamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${OS.pad(d.getMonth() + 1)}-${OS.pad(d.getDate())} ${OS.pad(d.getHours())}:${OS.pad(d.getMinutes())}`;
  };
  const short = (s, n) => (s || '').length > n ? s.slice(0, n - 1) + '…' : s;
  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${OS.pad(sec % 60)}`;
  const activeNote = () => S.notes.find(n => n.id === U.noteId) || S.notes[0];
  const activeMail = () => S.mails.find(m => m.id === U.mailId) || S.mails[0];
  const fileIcon = (f) => ic(f.icon || 'doc');
  const toolbar = (inner) => `<div class="app-toolbar">${inner}</div>`;

  function md(text) {
    const lines = h(text || '').split('\n');
    let out = '', list = false;
    for (const line of lines) {
      if (/^###\s/.test(line)) { if (list) { out += '</ul>'; list = false; } out += `<h3>${line.replace(/^###\s/, '')}</h3>`; }
      else if (/^##\s/.test(line)) { if (list) { out += '</ul>'; list = false; } out += `<h2>${line.replace(/^##\s/, '')}</h2>`; }
      else if (/^#\s/.test(line)) { if (list) { out += '</ul>'; list = false; } out += `<h1>${line.replace(/^#\s/, '')}</h1>`; }
      else if (/^[-*]\s/.test(line)) { if (!list) { out += '<ul>'; list = true; } out += `<li>${line.replace(/^[-*]\s/, '')}</li>`; }
      else if (/^\d+\.\s/.test(line)) { if (!list) { out += '<ul>'; list = true; } out += `<li>${line.replace(/^\d+\.\s/, '')}</li>`; }
      else if (!line.trim()) { if (list) { out += '</ul>'; list = false; } }
      else { if (list) { out += '</ul>'; list = false; } out += `<p>${line}</p>`; }
    }
    if (list) out += '</ul>';
    return `<div class="md">${out}</div>`;
  }

  /* ============================ Finder ============================ */
  const finder = {
    title: 'Finder', icon: 'finder', tone: 'tone-finder', w: 790, h: 500,
    render() {
      const loc = U.finderLocation || '桌面';
      const q = (U.finderQuery || '').toLowerCase();
      const files = D.files.filter(f => (loc === '所有文件' || f.place === loc) && (!q || (f.name + f.kind + f.meta).toLowerCase().includes(q)));
      const selected = D.files.find(f => f.id === U.fileId) || files[0];
      return `<div class="app finder">
        <aside class="finder-side">
          <div class="side-title">位置</div>
          ${['桌面', '文档', '图像', '未来', '所有文件'].map(p => `<button class="side-item ${p === loc ? 'active' : ''}" data-finder-loc="${h(p)}" type="button">${ic(p === '桌面' ? 'finder' : p === '图像' ? 'image' : p === '未来' ? 'future' : 'folder')}${h(p)}</button>`).join('')}
          <div class="side-title">标签</div>
          ${['Archive', 'Solar', 'Cyber'].map(t => `<button class="side-item" data-finder-search="${t}" type="button">${ic(t === 'Archive' ? 'archive' : t === 'Solar' ? 'leaf' : 'shield')}${t}</button>`).join('')}
        </aside>
        <div class="finder-main">
          ${toolbar(`<button class="icon-btn" type="button" data-finder-back>${ic('chevron-left')}</button><div class="crumb"><b>${h(loc)}</b><span>·</span><span>${files.length} 项</span></div><span class="spacer"></span><label class="app-search">${ic('search')}<input id="finder-search" type="search" placeholder="搜索文件" value="${h(U.finderQuery || '')}"></label><button class="icon-btn" type="button" title="网格视图">${ic('grid')}</button>`)}
          <div class="finder-layout">
            <div class="finder-content">
              ${q || loc === '所有文件' ? `<div class="crumb">查询：<b>${h(q || '所有文件')}</b></div>` : ''}
              <div class="file-grid">
                ${files.length ? files.map(f => `<button class="file-card ${selected && selected.id === f.id ? 'selected' : ''}" type="button" data-file-id="${h(f.id)}"><span class="file-ico">${fileIcon(f)}</span><b>${h(f.name)}</b><small>${h(f.kind)}</small></button>`).join('') : `<div class="app-empty">没有匹配的文件。<br>试试“所有文件”或清空搜索。</div>`}
              </div>
            </div>
            ${selected ? `<aside class="preview"><div class="preview-art">${fileIcon(selected)}</div><h3>${h(selected.name)}</h3><p>${h(selected.meta)}</p><dl><dt>类型</dt><dd>${h(selected.kind)}</dd><dt>位置</dt><dd>${h(selected.place)}</dd><dt>打开</dt><dd>${h((D.apps.find(a => a.id === selected.app) || {}).title || '—')}</dd></dl><button class="btn primary small" type="button" data-open-file="${h(selected.id)}">打开</button><button class="btn small ghost" type="button" data-file-info="${h(selected.id)}">查看来源</button></aside>` : ''}
          </div>
          <div class="app-foot"><span>${h(loc)} · ${files.length} 项</span><span>文件为模拟数据</span></div>
        </div>
      </div>`;
    },
    mount(root) {
      root.querySelectorAll('[data-finder-loc]').forEach(b => b.addEventListener('click', () => { U.finderLocation = b.dataset.finderLoc; U.finderQuery = ''; U.fileId = null; OS.refreshApp('finder'); }));
      root.querySelectorAll('[data-finder-search]').forEach(b => b.addEventListener('click', () => { U.finderQuery = b.dataset.finderSearch; U.finderLocation = '所有文件'; OS.refreshApp('finder'); }));
      root.querySelectorAll('[data-file-id]').forEach(b => b.addEventListener('click', () => { U.fileId = b.dataset.fileId; OS.refreshApp('finder'); }));
      const search = root.querySelector('#finder-search');
      if (search) search.addEventListener('input', () => { U.finderQuery = search.value; clearTimeout(finder._t); finder._t = setTimeout(() => OS.refreshApp('finder'), 180); });
      const back = root.querySelector('[data-finder-back]');
      if (back) back.addEventListener('click', () => { U.finderLocation = '桌面'; U.finderQuery = ''; U.fileId = null; OS.refreshApp('finder'); });
    },
    openFile(id) {
      const f = D.files.find(x => x.id === id);
      if (!f) return;
      U.fileId = id;
      if (f.app === 'notes') { U.noteId = f.note || 'welcome'; OS.openApp('notes'); return; }
      if (f.app === 'gallery') { OS.openApp('gallery'); setTimeout(() => OS.openLightbox(f.gallery || 0), 120); return; }
      if (f.app === 'mail') { U.mailId = f.mail || (S.mails[0] && S.mails[0].id); OS.openApp('mail'); return; }
      OS.openApp(f.app);
    }
  };

  /* ============================ Notes ============================ */
  const notes = {
    title: 'Notes', icon: 'notes', tone: 'tone-notes', w: 720, h: 500,
    render() {
      const n = activeNote();
      if (!n) return `<div class="app-empty">没有笔记。</div>`;
      return `<div class="app notes-app">
        <aside class="notes-side">
          <div class="notes-side-head"><label class="app-search">${ic('search')}<input id="note-search" type="search" placeholder="搜索笔记" value="${h(U.noteQuery || '')}"></label><button class="icon-btn" type="button" data-note-new title="新建笔记">${ic('plus')}</button></div>
          <div class="note-list">${S.notes.filter(x => !U.noteQuery || (x.title + x.body).toLowerCase().includes(U.noteQuery.toLowerCase())).map(x => `<button class="note-item ${x.id === n.id ? 'active' : ''}" type="button" data-note-select="${h(x.id)}"><b>${h(x.title || '无标题')}</b><small>${h(x.updated)} · ${h(x.tag || '笔记')}</small></button>`).join('')}</div>
          <div class="app-foot"><span>${S.notes.length} 篇</span><span>本地保存</span></div>
        </aside>
        <section class="note-editor">
          <div class="app-toolbar"><span class="chip">${h(n.tag || '笔记')}</span><span class="spacer"></span><button class="btn small" type="button" data-note-save>保存</button><button class="btn small ghost" type="button" data-note-export>导出 .md</button><button class="icon-btn" type="button" data-note-delete title="删除">${ic('trash')}</button></div>
          <input class="note-title" id="note-title" value="${h(n.title)}" aria-label="笔记标题">
          <textarea class="note-body" id="note-body" aria-label="笔记正文">${h(n.body)}</textarea>
          <div class="note-foot"><span id="note-status">已保存 · ${h(n.updated)}</span><span class="spacer"></span><span>${n.body.length} 字符</span></div>
        </section>
      </div>`;
    },
    mount(root) {
      const n = activeNote();
      if (!n) return;
      const title = root.querySelector('#note-title');
      const body = root.querySelector('#note-body');
      const status = root.querySelector('#note-status');
      const touch = () => { n.updated = nowStamp(); status.textContent = '未保存 · ' + n.updated; };
      if (title) title.addEventListener('input', () => { n.title = title.value; touch(); });
      if (body) body.addEventListener('input', () => { n.body = body.value; touch(); });
      root.querySelector('[data-note-save]')?.addEventListener('click', () => { OS.save(); n.updated = nowStamp(); status.textContent = '已保存 · ' + n.updated; OS.notify('Notes', '已保存到本地。'); OS.refreshApp('notes'); });
      root.querySelector('[data-note-new]')?.addEventListener('click', () => {
        const id = 'note-' + Date.now();
        S.notes.unshift({ id, title: '未命名笔记', body: '', updated: nowStamp(), tag: '草稿' });
        U.noteId = id; OS.save(); OS.refreshApp('notes');
      });
      root.querySelector('[data-note-delete]')?.addEventListener('click', () => {
        if (S.notes.length <= 1) { OS.notify('Notes', '至少保留一篇笔记。'); return; }
        S.notes = S.notes.filter(x => x.id !== n.id); U.noteId = S.notes[0].id; OS.save(); OS.refreshApp('notes');
      });
      root.querySelector('[data-note-export]')?.addEventListener('click', () => {
        const blob = new Blob([`# ${n.title}\n\n${n.body}`], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (n.title || 'note').replace(/[\\/:*?"<>|]/g, '_') + '.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
      });
      const search = root.querySelector('#note-search');
      if (search) search.addEventListener('input', () => { U.noteQuery = search.value; clearTimeout(notes._t); notes._t = setTimeout(() => OS.refreshApp('notes'), 180); });
      root.querySelectorAll('[data-note-select]').forEach(b => b.addEventListener('click', () => { U.noteId = b.dataset.noteSelect; OS.refreshApp('notes'); }));
    }
  };

  /* ============================ Settings ============================ */
  const settings = {
    title: 'Settings', icon: 'settings', tone: 'tone-settings', w: 660, h: 500,
    render() {
      const s = S.settings;
      return `<div class="app settings">
        <aside class="settings-nav">
          <div class="side-title">设置</div>
          ${['外观', '未来层', '可访问性', '系统'].map((x, i) => `<button class="side-item ${i === 0 ? 'active' : ''}" type="button" data-settings-section="${['appearance','future','a11y','system'][i]}">${ic(i === 0 ? 'sun' : i === 1 ? 'future' : i === 2 ? 'shield' : 'settings')}${x}</button>`).join('')}
        </aside>
        <div class="settings-main">
          <h2>外观与未来</h2>
          <p class="muted" style="margin:0 0 7px">当前：${h(OS.THEME_LABEL[s.theme])} / ${h(OS.ERA_LABEL[s.era].name)} · 存储键 <code>lrdos-state-v1</code></p>
          <h3 id="set-appearance">主题（系统 → 浅色 → 深色）</h3>
          <div class="setting-card"><div class="segmented" role="group" aria-label="主题"><button type="button" data-theme-set="system">系统</button><button type="button" data-theme-set="light">浅色</button><button type="button" data-theme-set="dark">深色</button></div><p class="setting-note">系统跟随 macOS/Windows 的 prefers-color-scheme；显式选择会持久化。</p></div>
          <h3 id="set-future">未来层（同一套语法）</h3>
          <div class="era-options">
            ${[
              ['archive', 'Archive', '现在 / 档案、维修、可读'],
              ['solar', 'Solar', '提案 / 本地能源、社区'],
              ['cyber', 'Cyber', '诊断 / 效率、监控、外包']
            ].map(([id, name, desc]) => `<button class="era-option" type="button" data-era-set="${id}" aria-pressed="${s.era === id}"><span class="sw"><i></i><i></i><i></i></span><b>${name}</b><small>${desc}</small></button>`).join('')}
          </div>
          <h3 id="set-a11y">可访问性</h3>
          <div class="setting-card">
            <label class="switch-row"><span>减少动态 <small>关闭窗口/波形/引导动效</small></span><input type="checkbox" data-setting="reduceMotion" ${s.reduceMotion ? 'checked' : ''}><i></i></label>
            <label class="switch-row"><span>高对比 <small>更强的边框与文本对比</small></span><input type="checkbox" data-setting="highContrast" ${s.highContrast ? 'checked' : ''}><i></i></label>
            <label class="switch-row"><span>大字号 <small>根字号提升到 16px</small></span><input type="checkbox" data-setting="largeText" ${s.largeText ? 'checked' : ''}><i></i></label>
          </div>
          <h3 id="set-system">系统</h3>
          <div class="setting-card danger-zone"><div class="setting-row"><div><b>重置实验数据</b><small>笔记、邮件、日历、设置会恢复初始值。</small></div><button class="btn small" type="button" data-action="reset">重置</button></div></div>
          <div class="setting-card"><div class="setting-row"><div><b>青橙 OS · 实验 01</b><small>9 个应用 / 3 个未来层 / 0 外部依赖。</small></div><button class="btn small ghost" type="button" data-action="about">关于</button></div></div>
        </div>
      </div>`;
    },
    mount(root) {
      root.querySelectorAll('[data-settings-section]').forEach(b => b.addEventListener('click', () => {
        const target = root.querySelector('#set-' + b.dataset.settingsSection);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        root.querySelectorAll('[data-settings-section]').forEach(x => x.classList.toggle('active', x === b));
      }));
    }
  };

  /* ============================ Gallery ============================ */
  const gallery = {
    title: 'Gallery', icon: 'gallery', tone: 'tone-gallery', w: 700, h: 470,
    render() {
      const era = OS.era;
      return `<div class="app gallery-app">
        ${toolbar(`<span class="chip">${h(OS.ERA_LABEL[era].name)}</span><span class="muted" style="font-size:10.5px">每张影像都有一段可追溯的设定</span><span class="spacer"></span><span class="chip">${D.gallery.length} 张</span>`)}
        <div class="gallery-scroll"><div class="gallery-note">点击查看大图与“它对应什么状态”。所有影像为 CSS 生成的虚构场景。</div><div class="gallery-grid">
          ${D.gallery.map((g, i) => `<button class="art-card" type="button" data-gallery="${i}"><span class="art ${g.art}"></span><span class="art-meta"><b>${h(g.title)}</b><small>${h(g.era)} · ${h(g.tags[0])}</small></span></button>`).join('')}
        </div></div>
      </div>`;
    },
    mount(root) { root.querySelectorAll('[data-gallery]').forEach(b => b.addEventListener('click', () => OS.openLightbox(Number(b.dataset.gallery)))); }
  };

  /* ============================ Radio ============================ */
  const radio = {
    title: 'Radio', icon: 'radio', tone: 'tone-radio', w: 660, h: 410,
    render() {
      const t = D.tracks[U.radioIndex] || D.tracks[0];
      const pct = Math.min(100, (U.radioElapsed / t.dur) * 100);
      return `<div class="app radio-app ${U.radioPlaying ? 'playing' : ''}">
        <section class="radio-now">
          <div class="radio-cover"><b>橙波<br>CITRUS WAVE</b></div>
          <div><h3>正在接收 · ${h(t.tag)}</h3><p class="track-title">${h(t.title)}</p><p class="muted" style="font-size:10.5px;margin:2px 0 0">${h(t.artist)}</p></div>
          <div class="wave" aria-hidden="true">${Array.from({ length: 38 }, (_, i) => `<i style="--h:${18 + (i * 17) % 75}%"></i>`).join('')}</div>
          <div class="radio-progress"><span style="width:${pct}%"></span></div>
          <div class="radio-time"><span id="radio-elapsed">${fmtTime(U.radioElapsed)}</span><span>${fmtTime(t.dur)}</span></div>
          <div class="radio-controls"><button class="icon-btn" type="button" data-radio="prev" aria-label="上一首">${ic('chevron-left')}</button><button class="play" type="button" data-radio="toggle" aria-label="${U.radioPlaying ? '暂停' : '播放'}">${ic(U.radioPlaying ? 'pause' : 'play')}</button><button class="icon-btn" type="button" data-radio="next" aria-label="下一首">${ic('chevron')}</button><span class="spacer"></span><span class="chip">模拟信号</span></div>
        </section>
        <section class="radio-side">
          <div class="app-toolbar"><b style="font-size:11px">节目单</b><span class="spacer"></span><span class="muted" style="font-size:9px">无真实音频</span></div>
          <div class="radio-list">${D.tracks.map((x, i) => `<button class="track-item ${i === U.radioIndex ? 'active' : ''}" type="button" data-radio-track="${i}"><span class="num">0${i + 1}</span><span><b>${h(x.title)}</b><small>${h(x.artist)}</small></span><span class="dur">${fmtTime(x.dur)}</span></button>`).join('')}</div>
          <div class="radio-disclaimer">波形与进度是模拟的，对应“播放位置”这一状态；它们不是音频流，也不伪造真实电台。</div>
        </section>
      </div>`;
    },
    mount(root) {
      const timer = radio._timer;
      if (timer) clearInterval(timer);
      radio._timer = null;
      if (U.radioPlaying) radio.startTimer();
      root.querySelector('[data-radio="toggle"]')?.addEventListener('click', () => {
        U.radioPlaying = !U.radioPlaying;
        if (U.radioPlaying) { radio.startTimer(); OS.notify('Radio', '模拟信号已开始。'); } else radio.stopTimer();
        OS.refreshApp('radio');
      });
      root.querySelector('[data-radio="next"]')?.addEventListener('click', () => { U.radioIndex = (U.radioIndex + 1) % D.tracks.length; U.radioElapsed = 0; OS.refreshApp('radio'); });
      root.querySelector('[data-radio="prev"]')?.addEventListener('click', () => { U.radioIndex = (U.radioIndex - 1 + D.tracks.length) % D.tracks.length; U.radioElapsed = 0; OS.refreshApp('radio'); });
      root.querySelectorAll('[data-radio-track]').forEach(b => b.addEventListener('click', () => { U.radioIndex = Number(b.dataset.radioTrack); U.radioElapsed = 0; OS.refreshApp('radio'); }));
    },
    startTimer() {
      radio.stopTimer();
      radio._timer = setInterval(() => {
        if (!U.radioPlaying) return radio.stopTimer();
        U.radioElapsed += 1;
        const t = D.tracks[U.radioIndex];
        if (U.radioElapsed >= t.dur) { U.radioIndex = (U.radioIndex + 1) % D.tracks.length; U.radioElapsed = 0; }
        const win = document.querySelector('.window[data-app="radio"]');
        if (win) {
          const fill = win.querySelector('.radio-progress span');
          const el = win.querySelector('#radio-elapsed');
          if (fill) fill.style.width = Math.min(100, (U.radioElapsed / D.tracks[U.radioIndex].dur) * 100) + '%';
          if (el) el.textContent = fmtTime(U.radioElapsed);
          const title = win.querySelector('.track-title');
          if (title) title.textContent = D.tracks[U.radioIndex].title;
        }
      }, 1000);
    },
    stopTimer() { if (radio._timer) clearInterval(radio._timer); radio._timer = null; },
    close() { radio.stopTimer(); }
  };

  /* ============================ Terminal ============================ */
  const terminal = {
    title: 'Terminal', icon: 'terminal', tone: 'tone-terminal', w: 650, h: 410,
    init() {
      if (U.termLines.length) return;
      U.termLines = [
        { text: '青橙 OS 0.1 · LRDS LAB / 2026-10-26', cls: 'dim' },
        { text: '一个用于提问的桌面。输入 help 查看可用命令。', cls: 'dim' },
        { text: '' }
      ];
    },
    render() {
      terminal.init();
      return `<div class="app terminal-app">
        <div class="term-head"><span>guest@citrus — zsh — 80×24</span><span>本地 / 无网络</span></div>
        <div class="term-out" id="term-out">${U.termLines.map(l => `<div class="term-line ${l.cls || ''}">${h(l.text)}</div>`).join('')}</div>
        <div class="term-prompt"><span>guest@citrus ~ %</span><input id="term-input" class="term-input" autocomplete="off" spellcheck="false" aria-label="终端命令"></div>
      </div>`;
    },
    mount(root) {
      const input = root.querySelector('#term-input');
      const out = root.querySelector('#term-out');
      if (out) out.scrollTop = out.scrollHeight;
      if (!input) return;
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = input.value;
          input.value = '';
          terminal.run(cmd);
          OS.refreshApp('terminal');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!U.termHistory.length) return;
          U.termHistoryIndex = Math.max(0, U.termHistoryIndex - 1);
          input.value = U.termHistory[U.termHistoryIndex] || '';
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          U.termHistoryIndex = Math.min(U.termHistory.length, U.termHistoryIndex + 1);
          input.value = U.termHistory[U.termHistoryIndex] || '';
        }
      });
    },
    append(text, cls) { U.termLines.push({ text, cls: cls || '' }); },
    run(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      U.termHistory.push(cmd); U.termHistoryIndex = U.termHistory.length;
      terminal.append(`guest@citrus ~ % ${cmd}`, 'cmd');
      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(' ');
      switch (head) {
        case 'help':
          terminal.append('可用命令：help / about / status / ls / cat <file> / open <app> / era <archive|solar|cyber> / theme <system|light|dark> / future / date / whoami / clear');
          break;
        case 'about':
          terminal.append('青橙 OS 0.1 · 9 应用 · 3 未来层 · 0 外部依赖。实验原型，不是生产系统。');
          break;
        case 'status':
          terminal.append(`theme=${S.settings.theme} mode=${OS.mode} era=${S.settings.era} storage=localStorage windows=${U.windows.size}`, 'ok');
          terminal.append(`reduceMotion=${S.settings.reduceMotion} highContrast=${S.settings.highContrast} largeText=${S.settings.largeText}`);
          break;
        case 'ls':
          D.files.forEach(f => terminal.append(`  ${f.name.padEnd(26, ' ')} ${f.kind}  ${f.place}`));
          break;
        case 'cat': {
          const f = D.files.find(x => x.name.includes(arg) || x.id === arg);
          if (!f) { terminal.append(`cat: ${arg || '缺少文件名'}: 没有这个文件`, 'err'); break; }
          if (f.note) { const n = S.notes.find(x => x.id === f.note); terminal.append(`# ${n ? n.title : f.name}\n${n ? n.body : f.meta}`); }
          else terminal.append(`${f.name}\n类型：${f.kind}\n位置：${f.place}\n来源：模拟数据\n说明：${f.meta}`);
          break;
        }
        case 'open': {
          const app = D.apps.find(a => a.id === arg || a.title.toLowerCase() === arg.toLowerCase());
          if (!app) { terminal.append(`open: ${arg || '缺少应用名'}: 可用 finder notes settings gallery radio terminal calendar mail weather`, 'err'); break; }
          OS.openApp(app.id); terminal.append(`已打开 ${app.title}`, 'ok');
          break;
        }
        case 'era':
          if (!['archive', 'solar', 'cyber'].includes(arg)) { terminal.append('era: 需要 archive / solar / cyber', 'err'); break; }
          OS.setEra(arg); terminal.append(`未来层 → ${OS.ERA_LABEL[arg].name}。可随时运行 era archive 退出。`, 'ok');
          break;
        case 'theme':
          if (!['system', 'light', 'dark'].includes(arg)) { terminal.append('theme: 需要 system / light / dark', 'err'); break; }
          OS.setTheme(arg); terminal.append(`主题 → ${OS.THEME_LABEL[arg]}。`, 'ok');
          break;
        case 'future': OS.openFuture(); terminal.append('已打开未来转盘。', 'ok'); break;
        case 'date': terminal.append(new Date().toString()); break;
        case 'whoami': terminal.append('guest · 一个有退出权的人'); break;
        case 'clear': U.termLines = []; break;
        default: terminal.append(`zsh: command not found: ${head}。输入 help。`, 'err');
      }
      terminal.append('');
    }
  };

  /* ============================ Calendar ============================ */
  const calendar = {
    title: 'Calendar', icon: 'calendar', tone: 'tone-calendar', w: 780, h: 500,
    render() {
      const m = U.calMonth;
      const year = m.getFullYear(), month = m.getMonth();
      const first = new Date(year, month, 1);
      const start = (first.getDay() + 6) % 7;
      const days = new Date(year, month + 1, 0).getDate();
      const prevDays = new Date(year, month, 0).getDate();
      const cells = [];
      for (let i = 0; i < start; i++) cells.push({ day: prevDays - start + i + 1, other: true });
      for (let d = 1; d <= days; d++) cells.push({ day: d, other: false });
      while (cells.length % 7) cells.push({ day: cells.length - start - days + 1, other: true });
      const sel = U.calSelected;
      const dayEvents = S.events[sel] || [];
      const monthName = `${year} 年 ${month + 1} 月`;
      return `<div class="app cal-app">
        <div class="cal-head"><button class="icon-btn" type="button" data-cal-prev aria-label="上个月">${ic('chevron-left')}</button><h3>${monthName}</h3><button class="icon-btn" type="button" data-cal-next aria-label="下个月">${ic('chevron')}</button><span class="spacer"></span><button class="btn small ghost" type="button" data-cal-today>今天</button><span class="chip">${Object.values(S.events).flat().length} 个事件</span></div>
        <div class="cal-body">
          <div class="cal-grid-wrap"><div class="cal-week">${['一','二','三','四','五','六','日'].map(d => `<span>${d}</span>`).join('')}</div><div class="cal-grid">
            ${cells.map(c => {
              const key = c.other ? '' : `${year}-${OS.pad(month + 1)}-${OS.pad(c.day)}`;
              const evs = key ? (S.events[key] || []) : [];
              return `<button class="cal-day ${c.other ? 'other' : ''} ${key === U.todayKey ? 'today' : ''} ${key === sel ? 'selected' : ''}" type="button" ${key ? `data-cal-day="${key}"` : 'disabled'}><span class="d">${c.day}</span>${evs.slice(0, 2).map(e => `<span class="ev">${h(e.title)}</span>`).join('')}</button>`;
            }).join('')}
          </div></div>
          <aside class="cal-side"><h4>${h(OS.formatDateLabel(sel))}</h4>
            ${dayEvents.length ? dayEvents.map(e => `<div class="event-item"><span class="dot"></span><div><b>${h(e.title)}</b><small>${h(e.time)} · ${h(e.tone)}</small></div><button type="button" data-cal-delete="${h(e.id)}" aria-label="删除事件">×</button></div>`).join('') : '<p class="muted" style="font-size:10px">这一天没有事件。</p>'}
            <h4 style="margin-top:8px">添加维护/事件</h4>
            <form class="cal-form" id="cal-form"><input name="title" placeholder="事件名称" maxlength="50" required><input name="time" type="time" value="14:00" required><textarea name="note" rows="2" placeholder="谁维护 / 代价（可选）"></textarea><button class="btn small primary" type="submit">加入日历</button></form>
          </aside>
        </div>
      </div>`;
    },
    mount(root) {
      root.querySelector('[data-cal-prev]')?.addEventListener('click', () => { U.calMonth = new Date(U.calMonth.getFullYear(), U.calMonth.getMonth() - 1, 1); OS.refreshApp('calendar'); });
      root.querySelector('[data-cal-next]')?.addEventListener('click', () => { U.calMonth = new Date(U.calMonth.getFullYear(), U.calMonth.getMonth() + 1, 1); OS.refreshApp('calendar'); });
      root.querySelector('[data-cal-today]')?.addEventListener('click', () => { const d = new Date(); U.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); U.calSelected = OS.dateKey(d); OS.refreshApp('calendar'); });
      root.querySelectorAll('[data-cal-day]').forEach(b => b.addEventListener('click', () => { U.calSelected = b.dataset.calDay; OS.refreshApp('calendar'); }));
      root.querySelectorAll('[data-cal-delete]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.calDelete; Object.keys(S.events).forEach(k => { S.events[k] = S.events[k].filter(e => e.id !== id); if (!S.events[k].length) delete S.events[k]; }); OS.save(); OS.refreshApp('calendar'); }));
      const form = root.querySelector('#cal-form');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault(); const fd = new FormData(form); const title = String(fd.get('title') || '').trim(); if (!title) return;
        const key = U.calSelected; if (!S.events[key]) S.events[key] = [];
        S.events[key].push({ id: 'ev-' + Date.now(), time: String(fd.get('time') || '14:00'), title, tone: 'archive' });
        OS.save(); OS.refreshApp('calendar'); OS.notify('Calendar', '事件已加入本地日历。');
      });
    }
  };

  /* ============================ Mail ============================ */
  const mail = {
    title: 'Mail', icon: 'mail', tone: 'tone-mail', w: 780, h: 500,
    render() {
      const folder = U.mailFolder || 'inbox';
      const list = S.mails.filter(m => (m.folder || 'inbox') === folder);
      const m = activeMail();
      return `<div class="app mail-app">
        <aside class="mail-side">
          <div class="app-toolbar" style="min-height:31px;padding:4px 6px"><button class="btn small primary" type="button" data-mail-compose>${ic('plus')} 写信</button><span class="spacer"></span></div>
          <div class="mail-side-head"><div class="segmented" style="width:100%"><button type="button" data-mail-folder="inbox" aria-pressed="${folder === 'inbox'}">收件箱</button><button type="button" data-mail-folder="sent" aria-pressed="${folder === 'sent'}">已发送</button></div></div>
          <div class="mail-list">${list.length ? list.map(x => `<button class="mail-item ${x.id === (m && m.id) ? 'active' : ''} ${x.unread ? 'unread' : ''}" type="button" data-mail-id="${h(x.id)}"><span class="from">${h(x.from)}</span><span class="date">${h(x.date)}</span><span class="subj">${h(x.subject)}</span>${x.unread ? '<span class="unread-dot"></span>' : '<span></span>'}</button>`).join('') : '<div class="app-empty" style="height:120px">没有邮件。</div>'}</div>
          <div class="app-foot"><span>${list.length} 封</span><span>本地</span></div>
        </aside>
        <section class="mail-read">
          ${U.mailCompose ? `<div class="compose"><b style="font-size:11px">新邮件</b><div class="row"><input id="mail-to" placeholder="收件人" value=""><input id="mail-subject" placeholder="主题" value=""></div><textarea id="mail-body" rows="6" placeholder="写点什么……"></textarea><div class="row"><button class="btn small primary" type="button" data-mail-send>${ic('send')} 发送</button><button class="btn small ghost" type="button" data-mail-cancel>取消</button></div></div>` : (m ? `<div class="mail-read-head"><h3>${h(m.subject)}</h3><div class="mail-meta"><span>${h(m.from)} &lt;${h(m.address)}&gt;</span><span>${h(m.date)}</span>${m.unread ? '<span class="chip warn">未读</span>' : ''}</div></div><div class="mail-content">${h(m.body)}</div><div class="mail-actions"><button class="btn small" type="button" data-mail-reply>回复</button><button class="btn small ghost" type="button" data-mail-delete>删除</button></div>` : '<div class="app-empty">选择一封邮件。</div>')}
        </section>
      </div>`;
    },
    mount(root) {
      root.querySelectorAll('[data-mail-folder]').forEach(b => b.addEventListener('click', () => { U.mailFolder = b.dataset.mailFolder; U.mailId = null; U.mailCompose = false; OS.refreshApp('mail'); }));
      root.querySelectorAll('[data-mail-id]').forEach(b => b.addEventListener('click', () => { U.mailId = b.dataset.mailId; const m = S.mails.find(x => x.id === U.mailId); if (m) m.unread = false; U.mailCompose = false; OS.save(); OS.refreshApp('mail'); }));
      root.querySelector('[data-mail-compose]')?.addEventListener('click', () => { U.mailCompose = true; OS.refreshApp('mail'); });
      root.querySelector('[data-mail-cancel]')?.addEventListener('click', () => { U.mailCompose = false; OS.refreshApp('mail'); });
      root.querySelector('[data-mail-send]')?.addEventListener('click', () => {
        const to = root.querySelector('#mail-to')?.value.trim() || '未填写收件人';
        const subject = root.querySelector('#mail-subject')?.value.trim() || '(无主题)';
        const body = root.querySelector('#mail-body')?.value.trim() || '';
        S.mails.unshift({ id: 'mail-' + Date.now(), from: '你', address: to, subject, date: '刚刚', unread: false, body, folder: 'sent' });
        OS.save(); U.mailFolder = 'sent'; U.mailCompose = false; U.mailId = S.mails[0].id; OS.refreshApp('mail'); OS.notify('Mail', '已放入“已发送”（模拟，不会真的发出）。');
      });
      root.querySelector('[data-mail-reply]')?.addEventListener('click', () => { U.mailCompose = true; OS.refreshApp('mail'); });
      root.querySelector('[data-mail-delete]')?.addEventListener('click', () => { const m = activeMail(); if (!m) return; S.mails = S.mails.filter(x => x.id !== m.id); U.mailId = S.mails[0]?.id || null; OS.save(); OS.refreshApp('mail'); });
    }
  };

  /* ============================ Weather ============================ */
  const weather = {
    title: 'Weather', icon: 'weather', tone: 'tone-weather', w: 580, h: 585,
    render() {
      const w = D.weather;
      const unit = U.tempUnit || 'C';
      const t = (n) => unit === 'C' ? `${n}°` : `${Math.round(n * 9 / 5 + 32)}°`;
      const energy = w.energy.find(e => e[0] === OS.era) || w.energy[0];
      const condIcon = w.condition.includes('云') ? 'cloud' : 'sun';
      return `<div class="app weather-app">
        <div class="weather-hero"><div><div class="weather-place">${h(w.city)}</div><div class="weather-temp">${t(w.temp)}<sup>${unit}</sup></div><div class="weather-cond">${h(w.condition)} · 最高 ${t(w.high)} / 最低 ${t(w.low)}</div></div><div class="weather-art">${ic(condIcon)}</div></div>
        <div class="weather-stats">${w.stats.map(([k, v]) => `<div class="wstat"><b>${h(v)}</b><small>${h(k)}</small></div>`).join('')}</div>
        <div class="weather-section"><h3>接下来</h3><div class="hourly">${w.hourly.map(([time, temp, icon]) => `<div class="hour"><small>${h(time)}</small><b>${t(temp)}</b>${ic(icon)}</div>`).join('')}</div></div>
        <div class="weather-section"><h3>五日</h3><div class="days">${w.days.map(([day, hi, lo, icon]) => `<div class="day-forecast"><small>${h(day)}</small>${ic(icon)}<b>${t(hi)} / ${t(lo)}</b></div>`).join('')}</div></div>
        <div class="weather-section"><h3>能源结构 · ${h(OS.ERA_LABEL[OS.era].name)}</h3><div class="energy-box"><b>${h(energy[1])}</b><div class="energy-bar">${energy[3].map(n => `<i style="width:${n}%"></i>`).join('')}</div>${h(energy[2])}<div class="weather-note">数据来源：社区气象站 / 模拟。${OS.era === 'solar' ? '本地能源更高，但依赖参与者维护。' : OS.era === 'cyber' ? '外部电网效率高，代价是依赖与夜间维护外包。' : '现在：低密度、可读，但需要手工维护。'}</div></div></div>
        <div class="app-toolbar" style="border:0;background:transparent;padding:7px 0 0"><button class="btn small ghost" type="button" data-weather-unit>切换 °C / °F</button><span class="spacer"></span><span class="chip">模拟气象站</span></div>
      </div>`;
    },
    mount(root) { root.querySelector('[data-weather-unit]')?.addEventListener('click', () => { U.tempUnit = (U.tempUnit || 'C') === 'C' ? 'F' : 'C'; OS.refreshApp('weather'); }); }
  };

  window.OSApps = { finder, notes, settings, gallery, radio, terminal, calendar, mail, weather, md };
})();
