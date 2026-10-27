/* LiveFile · personal archive UI. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { data: null, view: 'overview', output: '', outputName: 'archive-catalog.md', selected: null, filter: { q: '', type: '', collection: '' } };

  async function api(path, options = {}) {
    const res = await fetch(path, Object.assign({ headers: { 'content-type': 'application/json' } }, options));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  function toast(title, body) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = `<b>${esc(title)}</b><span>${esc(body || '')}</span>`;
    $('#toasts').appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(4px)'; setTimeout(() => el.remove(), 220); }, 3400);
  }
  function setStatus(text, kind) { const el = $('#status'); el.querySelector('span').textContent = text; el.classList.toggle('ok', kind === 'ok'); el.classList.toggle('err', kind === 'err'); }
  function themeSet(t, persist) {
    if (!['system', 'light', 'dark'].includes(t)) t = 'system';
    const mq = matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.mode = t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
    $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    if (persist) try { localStorage.setItem('livefile-theme', t); } catch (e) {}
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (document.documentElement.dataset.theme === 'system') themeSet('system', false); });
  function switchView(view) {
    state.view = view;
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    renderAll(); window.scrollTo({ top: 0 });
  }
  function renderAll() {
    if (!state.data) return;
    if (state.view === 'overview') overview();
    if (state.view === 'timeline') timeline();
    if (state.view === 'items') items();
    if (state.view === 'collections') collections();
    if (state.view === 'health') health();
    if (state.view === 'export') exportView();
  }
  function issueHtml(i) {
    return `<div class="issue ${esc(i.severity)}"><span class="sev">${esc(i.severity)}</span><div class="msg">${esc(i.message)}</div><code>${esc(i.code)}</code></div>`;
  }
  function dateLabel(s) { return s ? s.slice(0, 10) : '未知'; }
  function bytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 ** 2).toFixed(1)} MB`;
  }
  function fileUrl(path) { return '/files/' + String(path).split('/').map(encodeURIComponent).join('/'); }
  function isImage(item) { return /\.(svg|png|jpe?g|webp)$/i.test(item.path); }

  function overview() {
    const d = state.data;
    $('#health-score').textContent = d.health.score;
    $('#health-ring').style.setProperty('--p', String(d.health.score));
    $('#health-ring').style.setProperty('--ring', d.health.score >= 90 ? 'var(--green)' : d.health.score >= 70 ? 'var(--amber)' : 'var(--rust)');
    const label = d.health.score >= 90 ? '档案健康' : d.health.score >= 70 ? '需要收口' : '高风险';
    $('#health-label').textContent = label;
    $('#health-detail').textContent = `${d.health.errors} errors · ${d.health.warnings} warnings；先补来源/备份/继承。`;
    $('#item-count').textContent = `${d.stats.items} items`;
    $('#s-items').textContent = d.stats.items; $('#s-collections').textContent = d.stats.collections; $('#s-unmanaged').textContent = d.stats.unmanaged; $('#s-bytes').textContent = bytes(d.stats.bytes);
    $('#archive-id').textContent = d.root.split('/').pop();
    $('#archive-path').textContent = 'lab/livefile/archive';
    $('#node-version').textContent = d.runtime || 'local';
    $('#nav-items').textContent = d.stats.items; $('#nav-collections').textContent = d.stats.collections; $('#nav-issues').textContent = d.health.errors + d.health.warnings;
    $('#recent').innerHTML = d.items.slice(0, 6).map(i => `<div class="recent-row" data-item="${esc(i.id)}"><i style="background:${i.type === 'photo' ? 'var(--amber)' : i.type === 'legal' ? 'var(--rust)' : 'var(--teal)'}"></i><div><b>${esc(i.title)}</b><small>${esc(i.type)} · ${esc(i.collections.join(' / ') || '未归类')}</small></div><code>${esc(dateLabel(i.created))}</code></div>`).join('');
    $('#backup-card').innerHTML = `<div class="row"><span>上次备份</span><b>${esc(d.backup.lastBackup || '—')}</b></div><div class="row"><span>位置</span><b>${esc((d.backup.locations || []).join(' / ') || '—')}</b></div><div class="row"><span>恢复演练</span><b>${esc(d.backup.lastRestoreTest || '—')}</b></div><div class="row"><span>保管人</span><b>${esc(d.inheritance.custodian || '—')}</b></div><p class="note">${esc(d.backup.note || '')}</p>`;
    $('#backup-chip').textContent = d.health.issues.some(i => i.code.startsWith('backup')) ? 'needs backup' : 'ok';
    $('#overview-collections').innerHTML = d.collections.slice(0, 8).map(c => `<button class="collection-pill" data-collection="${esc(c.name)}" type="button">${esc(c.name)}<b>${c.count}</b></button>`).join('');
    bindItems($('#recent'));
  }
  function timeline() {
    const d = state.data;
    $('#timeline-count').textContent = `${d.items.length} items`;
    $('#timeline').innerHTML = d.timeline.map(y => `<section class="year-block"><h2>${esc(y.year)}</h2><div class="year-items">${y.items.map(i => `<div class="timeline-item" data-item="${esc(i.id)}"><time>${esc(dateLabel(i.created))}</time><div><b>${esc(i.title)}</b><small>${esc(i.collections.join(' / ') || '未归类')}</small></div><span class="type">${esc(i.type)}</span></div>`).join('')}</div></section>`).join('');
    bindItems($('#timeline'));
  }
  function filtered() {
    const d = state.data; const f = state.filter; const q = f.q.toLowerCase();
    return d.items.filter(i => (!f.type || i.type === f.type) && (!f.collection || i.collections.includes(f.collection)) && (!q || (i.title + i.tags.join(' ') + i.collections.join(' ') + i.preview).toLowerCase().includes(q)));
  }
  function items() {
    const d = state.data;
    const typeSelect = $('#type-filter');
    if (typeSelect.options.length === 1) {
      [...new Set(d.items.map(i => i.type))].sort().forEach(t => typeSelect.add(new Option(t, t)));
    }
    const colSelect = $('#collection-filter');
    if (colSelect.options.length === 1) d.collections.forEach(c => colSelect.add(new Option(c.name, c.name)));
    const list = filtered();
    $('#item-filter-count').textContent = `${list.length} / ${d.items.length}`;
    $('#item-grid').innerHTML = list.map(i => `<button class="item-card" data-item="${esc(i.id)}" type="button"><span class="type">${esc(i.type)}${i.isPublic ? ' · public' : ''}</span><h3>${esc(i.title)}</h3><p>${esc(i.collections.join(' / ') || '未归类')} · ${esc(i.tags.join(' / ') || '无标签')}</p><div class="foot"><span class="${i.hasMeta ? '' : 'missing'}">${i.hasMeta ? 'sidecar' : '缺元数据'}</span><span>${esc(dateLabel(i.created))}</span></div></button>`).join('') || '<div class="empty">没有匹配的条目。</div>';
    bindItems($('#item-grid'));
  }
  function collections() {
    const d = state.data;
    $('#collection-count').textContent = `${d.collections.length} collections`;
    $('#collection-grid').innerHTML = d.collections.map(c => `<button class="collection-card" data-collection="${esc(c.name)}" type="button"><span>COLLECTION</span><b>${esc(c.name)}</b><p>${c.count} 个条目；点击查看。</p></button>`).join('');
    $$('#collection-grid [data-collection]').forEach(b => b.addEventListener('click', () => { state.filter.collection = b.dataset.collection; state.filter.q = ''; state.view = 'items'; switchView('items'); }));
  }
  function health() {
    const d = state.data;
    $('#health-chip').textContent = `${d.health.score}/100`;
    $('#health-summary').innerHTML = `<div class="health-stat ok"><b>${d.health.score}</b><span>health</span></div><div class="health-stat error"><b>${d.health.errors}</b><span>errors</span></div><div class="health-stat warn"><b>${d.health.warnings}</b><span>warnings</span></div><div class="health-stat"><b>${d.stats.items}</b><span>items</span></div>`;
    $('#issue-count').textContent = `${d.health.issues.length} issues`;
    $('#issue-list').innerHTML = d.health.issues.map(issueHtml).join('') || '<div class="empty">没有发现问题。</div>';
    $('#inherit-card').innerHTML = `<div class="row"><span>保管人</span><b>${esc(d.inheritance.custodian || '—')}</b></div><div class="row"><span>访问范围</span><b>${esc(d.inheritance.access || '—')}</b></div><div class="row"><span>密钥保管</span><b>${esc(d.inheritance.keyCustodian || '—')}</b></div><div class="row"><span>上次复核</span><b>${esc(d.inheritance.lastReviewed || '—')}</b></div><div class="row"><span>备份位置</span><b>${esc((d.backup.locations || []).join(' / ') || '—')}</b></div><p class="note">${esc(d.inheritance.condition || '')}<br><br>${esc(d.inheritance.note || '')}</p>`;
    const dups = d.duplicates || [];
    $('#duplicate-count').textContent = `${dups.length} groups`;
    $('#duplicate-list').innerHTML = dups.length ? dups.map(g => `<div class="dup-group"><b>内容完全相同</b>${g.items.map(i => `<div>${esc(i.title)} <code>${esc(i.path)}</code></div>`).join('')}<code>sha256: ${esc(g.hash.slice(0, 16))}…</code></div>`).join('') : '<div class="empty">没有重复内容。</div>';
    if (!$('#backup-target').value) $('#backup-target').value = 'reports/backup';
    if (!$('#restore-source').value) $('#restore-source').value = 'reports/backup';
  }
  function exportView() {
    $('#output-preview').textContent = state.output || '选择一种输出。';
    $('#output-status').textContent = state.output ? '已生成' : '未生成';
    $('#output-title').textContent = state.outputName;
  }
  function openItem(id) {
    const item = state.data.items.find(i => i.id === id); if (!item) return;
    state.selected = item;
    $('#drawer-title').textContent = item.title;
    const preview = isImage(item) ? `<img src="${fileUrl(item.path)}" alt="${esc(item.title)}">` : `<div>${esc(item.preview || '（二进制/无文本预览）')}</div>`;
    const types = ['note', 'receipt', 'letter', 'legal', 'photo', 'audio', 'data', 'file'];
    $('#drawer-body').innerHTML = `<div class="preview">${preview}</div><p class="note">${item.hasMeta ? 'sidecar 已找到。修改会写回 sidecar；原始文件不动。' : '没有 sidecar：保存后会为这个文件创建 sidecar，原始文件不动。'}</p><form class="drawer-form" id="item-form" data-path="${esc(item.path)}"><label>标题<input name="title" required value="${esc(item.title)}"></label><label>类型<select name="type">${types.map(t => `<option value="${t}" ${t === item.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>日期<input name="created" type="date" value="${esc(item.created)}"></label><label>来源<input name="source" value="${esc(item.source)}" placeholder="现场 / 文档 / 访谈"></label><label>许可<input name="license" value="${esc(item.license)}" placeholder="private / CC-BY-4.0"></label><label>保留<input name="retention" value="${esc(item.retention)}" placeholder="permanent / 7y"></label><label class="wide">集合（逗号分隔）<input name="collections" value="${esc(item.collections.join(', '))}"></label><label class="wide">标签（逗号分隔）<input name="tags" value="${esc(item.tags.join(', '))}"></label><label class="wide check"><input name="public" type="checkbox" ${item.isPublic ? 'checked' : ''}> 在公开页显示（只导出标记为 public 的条目）</label><div class="wide"><div class="drawer-actions"><button class="btn primary" type="submit">保存 sidecar</button><button class="btn ghost" type="button" data-close-drawer>取消</button></div><p class="file-link">SHA ${esc(item.sha256.slice(0, 16))}… ｜ ${esc(item.path)}</p></div></form>`;
    $('#drawer').hidden = false;
  }
  async function saveItem(form) {
    const fd = new FormData(form);
    const meta = {
      title: String(fd.get('title') || '').trim(),
      type: String(fd.get('type') || 'file'),
      created: String(fd.get('created') || ''),
      source: String(fd.get('source') || '').trim(),
      license: String(fd.get('license') || '').trim(),
      retention: String(fd.get('retention') || '').trim(),
      collections: String(fd.get('collections') || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
      tags: String(fd.get('tags') || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
      public: fd.get('public') === 'on'
    };
    try {
      const r = await api('/api/item', { method: 'POST', body: JSON.stringify({ path: form.dataset.path, meta }) });
      state.data = r; closeDrawer(); renderAll(); toast('已保存', meta.title || form.dataset.path);
    } catch (e) { toast('保存失败', e.message); }
  }
  function closeDrawer() { $('#drawer').hidden = true; state.selected = null; }
  function bindItems(root) { $$('[data-item]', root).forEach(el => el.addEventListener('click', () => openItem(el.dataset.item))); }
  async function refresh() {
    try { setStatus('local archive', 'ok'); state.data = await api('/api/state'); renderAll(); }
    catch (e) { setStatus('offline', 'err'); toast('连接失败', e.message); }
  }
  async function scan() { try { await api('/api/scan', { method: 'POST', body: '{}' }); await refresh(); toast('Scan 完成', `${state.data.stats.items} items · ${state.data.health.warnings} warnings`); } catch (e) { toast('Scan 失败', e.message); } }
  async function exportOut(type) {
    try { const r = await api('/api/export', { method: 'POST', body: JSON.stringify({ type }) }); state.output = r.text; state.outputName = r.name; switchView('export'); toast('已生成', r.name); }
    catch (e) { toast('生成失败', e.message); }
  }
  function download(text, name, mime) { const blob = new Blob([text], { type: mime }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
  async function runBackupUi() {
    const target = $('#backup-target').value.trim();
    if (!target) { toast('需要目标目录', '例如 reports/backup'); return; }
    try { const r = await api('/api/backup', { method: 'POST', body: JSON.stringify({ target }) }); state.data = r; renderAll(); switchView('health'); toast(r.result.ok ? '备份已验证' : '备份有问题', `${r.result.files} files · ${r.result.target}`); }
    catch (e) { toast('备份失败', e.message); }
  }
  async function restoreCheckUi() {
    const source = $('#restore-source').value.trim();
    if (!source) { toast('需要备份目录', '填写含 backup-manifest.json 的目录'); return; }
    try { const r = await api('/api/restore-check', { method: 'POST', body: JSON.stringify({ source }) }); state.data = r; renderAll(); switchView('health'); toast(r.result.ok ? '恢复校验通过' : '恢复校验失败', `${r.result.checked} files · ${r.result.errors.length} errors`); }
    catch (e) { toast('校验失败', e.message); }
  }

  function bind() {
    document.addEventListener('click', e => {
      const v = e.target.closest('[data-view]'); if (v) { switchView(v.dataset.view); return; }
      const t = e.target.closest('[data-theme-set]'); if (t) { themeSet(t.dataset.themeSet, true); return; }
      if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
      if (e.target.id === 'run-scan') { scan(); return; }
      if (e.target.id === 'run-backup') { runBackupUi(); return; }
      if (e.target.id === 'restore-check') { restoreCheckUi(); return; }
      const ex = e.target.closest('[data-export]'); if (ex) { exportOut(ex.dataset.export); return; }
      if (e.target.id === 'download-output') { if (!state.output) { toast('还没有输出', '先生成一种输出。'); return; } download(state.output, state.outputName, state.outputName.endsWith('.json') ? 'application/json' : state.outputName.endsWith('.html') ? 'text/html' : 'text/markdown'); return; }
      const c = e.target.closest('[data-collection]'); if (c) { state.filter.collection = c.dataset.collection; state.filter.q = ''; switchView('items'); return; }
    });
    document.addEventListener('submit', e => { if (e.target.id === 'item-form') { e.preventDefault(); saveItem(e.target); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    $('#item-search')?.addEventListener('input', e => { state.filter.q = e.target.value; items(); });
    $('#type-filter')?.addEventListener('change', e => { state.filter.type = e.target.value; items(); });
    $('#collection-filter')?.addEventListener('change', e => { state.filter.collection = e.target.value; items(); });
    $$('[data-theme-set]').forEach(b => b.addEventListener('click', () => themeSet(b.dataset.themeSet, true)));
    themeSet(document.documentElement.dataset.theme || 'system', false);
  }
  bind(); refresh();
})();
