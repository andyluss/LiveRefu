/* SPDX-License-Identifier: Apache-2.0 */
/* LiveAtelier / LiveDSO · local UI localization. */
(function () {
  'use strict';
  const EN = {
    '工作台': 'Workbench', '审视': 'Review', '本地': 'Local', '输出': 'Output',
    '总览': 'Overview', '契约': 'Contracts', '预览': 'Preview', '风格卡': 'Style cards',
    '闸门': 'Gates', '采用扫描': 'Adoption', '历史': 'History', '趋势': 'Trends',
    '多库': 'Vaults', '报告/投影': 'Report / projection',
    '运行闸门': 'Run checks', '系统': 'System', '浅色': 'Light', '深色': 'Dark',
    '你的设计系统，': 'Your design system,', '现在是什么状态？': 'what state is it in?',
    '等待读取': 'Waiting for data', '启动本地 vault 后生成。': 'Generated after a local vault starts.',
    '查看问题 →': 'See issues →', '最需要处理的信号': 'Most urgent signals', '全部 →': 'All →',
    '一条可跑的链路': 'A runnable chain', 'token JSON / 语义分层': 'token JSON / semantic tiers',
    '组件承诺 + token 引用': 'component promises + token references',
    '对比度 / 裸值 / 别名 / 契约': 'contrast / raw values / aliases / contracts',
    '浏览 tokens': 'Browse tokens', '运行闸门': 'Run gates',
    '独立但相邻': 'Independent, adjacent',
    '看得到源、别名与解析值。语义层写裸色会被标出来；改值会写回 vault 文件。': 'See sources, aliases and resolved values. Raw colors in semantic tiers are flagged; edits write back to the vault.',
    '全部层': 'All tiers', '全部类型': 'All types', '全部生命周期': 'All lifecycles',
    '复制 CSS 投影': 'Copy CSS projection', '读取中……': 'Loading…',
    '没有匹配的 token。': 'No matching tokens.', '组件契约不是文档装饰：缺状态、缺 token、缺键盘说明都会被闸门看见。': 'Contracts are not documentation decoration: missing states, tokens or keyboard notes are caught by the gates.',
    '用 vault 里的真实 token 渲染组件，而不是看截图。预览只读取解析值，不写回。': 'Render components with real vault tokens, not screenshots. Preview is read-only.',
    '默认': 'Default', '悬停': 'Hover', '聚焦': 'Focus', '禁用': 'Disabled',
    '风格卡只换皮肤，不换语法。每张卡都应该写清谁维护、代价是什么。': 'Style cards change skin, not grammar. Every card should state who maintains it and what it costs.',
    '先跑闸门，再谈发布。错误阻断；警告必须记录取舍。': 'Run the gates before release. Errors block; warnings require a recorded trade-off.',
    '扫描一个代码目录，看它有没有真的在用 vault 的 token，以及哪里还在写裸色、引用了不存在的 --dso- 变量。只读，不改目标目录。': 'Scan a code directory for real token usage, raw colors, and unknown --dso- variables. Read-only.',
    '快照只写本地 vault 的': 'Snapshots are written only to the local vault’s',
    '不上传、不依赖 Git。对比只读，不会自动回滚。': 'No upload, no Git dependency. Diffs are read-only and never auto-rollback.',
    '把多个 vault 的快照放在一起看。只读本地': 'Compare snapshots across vaults. Reads local only',
    '一个本地总览：每个 vault 的健康分、错误/警告与资产数量。切换只影响当前本地服务。': 'A local overview: health score, errors/warnings and asset counts for every vault. Switching affects only this local service.',
    '健康报告与 CSS 投影都是生成物：可复制、可下载、可进 PR，不需要上传。': 'Health reports and CSS projections are generated locally: copy, download, or put in a PR. No upload.',
    '模板': 'Template', '生成报告': 'Generate report', '下载 .md': 'Download .md',
    '生成 CSS 投影': 'Generate CSS projection', '下载 .css': 'Download .css',
    '未生成': 'Not generated', '已生成': 'Generated', '点击“生成健康报告”。': 'Generate a health report.',
    '点击“生成 CSS 投影”。': 'Generate a CSS projection.', '还没有报告': 'No report yet',
    '先生成健康报告。': 'Generate a health report first.', '还没有 CSS': 'No CSS yet',
    '先生成 CSS 投影。': 'Generate a CSS projection first.',
    '未扫描': 'Not scanned', '未加载': 'Not loaded', '扫描': 'Scan', '刷新': 'Refresh',
    '创建快照': 'Create snapshot', '选择快照': 'Select snapshot', '快照': 'Snapshots',
    '差异': 'Diff', '还没有快照。': 'No snapshots yet.', '本地已加载': 'Loaded locally',
    '选一个快照查看当前 vault 与它的差异。': 'Select a snapshot to compare with the current vault.',
    '点击“创建快照”生成第一份。': 'Click “Create snapshot” to make the first one.',
    '当前': 'Current', '切换 →': 'Switch →', '没有注册 vault。': 'No registered vaults.',
    '没有风格卡。': 'No style cards.', '至少需要两张风格卡。': 'At least two style cards are required.',
    '卡 A': 'Card A', '卡 B': 'Card B', '共享色：': 'Shared colors: ',
    '无': 'None', '没有写维护/代价。': 'No maintenance/cost note.',
    '保存到 vault': 'Save to vault', '保存生命周期': 'Save lifecycle', '保存契约': 'Save contract',
    '取消': 'Cancel', '编辑 →': 'Edit →', '没有说明。': 'No description.',
    '邮箱': 'Email', '主按钮': 'Primary', '次要按钮': 'Secondary', '幽灵按钮': 'Ghost',
    '面板标题': 'Panel title', '这套 token 来自当前 vault，不是截图。': 'These tokens come from the current vault, not a screenshot.',
    '禁用时仍需说明原因。': 'Explain why when disabled.', '错误用文本说明，不只靠颜色。': 'Explain errors with text, not color alone.',
    '保存失败': 'Save failed', '创建失败': 'Create failed', '切换失败': 'Switch failed',
    '扫描失败': 'Scan failed', '检查失败': 'Check failed', '生成失败': 'Generate failed',
    '复制失败': 'Copy failed', '历史加载失败': 'History failed to load', '趋势加载失败': 'Trends failed to load',
    'Vault 总览加载失败': 'Vault overview failed to load', '需要目录': 'Directory required',
    '扫描完成': 'Scan complete', '快照已创建': 'Snapshot created', '对比失败': 'Diff failed',
    '连接失败': 'Connection failed', '无法连接本地 vault': 'Cannot connect to local vault',
    'Checks 完成': 'Checks complete', '报告已生成': 'Report generated', 'CSS 投影已生成': 'CSS projection generated',
    '已复制 CSS': 'CSS copied', '复制或下载。': 'Copy or download.', '可直接粘进项目。': 'Paste it into your project.',
    'Token 已保存': 'Token saved', '生命周期已保存': 'Lifecycle saved', '契约已保存': 'Contract saved',
    '外观': 'Appearance', '需要收口': 'Needs triage', '系统健康': 'System healthy',
    '可以开始把变更送进 CI。': 'You can start sending changes to CI.',
    '有警告/错误，先处理阻断项。': 'Warnings/errors exist; handle blockers first.',
    '不要发布；先修错误与契约缺口。': 'Do not release; fix errors and contract gaps first.',
    '没有发现问题。可以开始下一轮变更。': 'No issues found. Ready for the next change.',
    '没有契约。先加一个 button.contract.json。': 'No contracts. Add a button.contract.json first.',
    '输入目录后扫描。': 'Enter a directory to scan.',
    '被使用的 token': 'Tokens in use', '文件 / 裸色 / 未知引用': 'Files / raw colors / unknown refs',
    '弃用 token 引用': 'Deprecated token references', '未知 --dso- 变量': 'Unknown --dso- variables',
    '没有发现 token 引用。': 'No token references found.', '没有发现引用。': 'No references found.',
    '没有发现问题。': 'No issues found.', '还没有快照': 'No snapshots yet',
    '组件预览': 'Component preview', '健康报告': 'Health report', 'CSS 投影': 'CSS projection', '风格卡': 'Style cards', '质量闸门': 'Quality gates', '历史快照': 'History',
    '多库总览': 'Vault overview', '报告与投影': 'Report & projection',
    '风格卡对比': 'Style card comparison', '共享色：无 ｜ 语法相同，皮肤不同；不要用风格卡替代 token 语义。': 'Shared colors: none ｜ Same grammar, different skin. Do not replace token semantics with style cards.',
    '，不上传、不依赖 Git。对比只读，不会自动回滚。': '; no upload, no Git dependency. Diffs are read-only and never auto-rollback.',
    '，不上传、不依赖云。': '; no upload or cloud dependency.',
    '这是 AAA 目标，不阻断，但应记录取舍。': 'This is an AAA target; it does not block, but the trade-off should be recorded.',
    '健康报告与 CSS 投影都是生成物：': 'Health reports and CSS projections are generated locally: ',
    '不需要上传。': 'No upload required.',
    '本地读写；不上传。示例数据与 LRDS 解耦。': 'Local read/write; no upload. Sample data is decoupled from LRDS.',
    '查看健康报告 →': 'View health report →',
    '还没有快照': 'No snapshots yet',
    '还没有快照。': 'No snapshots yet.',
    '还没有 CSS': 'No CSS yet',
    '还没有报告': 'No report yet',
    '还没有快照' : 'No snapshots yet',
    '当前': 'Current',
    '全部生命周期': 'All lifecycles',
    '编辑 →': 'Edit →',
    '打开': 'Open',
    '皮肤': 'Skin', '主题': 'Theme', '应用风格卡到工作台': 'Apply a style card to the workbench',
    '切换语言': 'Switch language', '默认': 'Default',
    '搜索 path / value / alias': 'Search path / value / alias', '切换语言': 'Switch language',
    '应用风格卡到工作台': 'Apply a style card to the workbench', '主题': 'Theme', '皮肤': 'Skin',
    '全部': 'All', '项目': 'Project', '工作区': 'Workspace'
  };
  const ZH = {};
  for (const [zh, en] of Object.entries(EN)) ZH[en] = zh;
  const attrs = ['placeholder', 'aria-label', 'title', 'alt'];
  const attrOrig = new WeakMap();
  let locale = localStorage.getItem('livedso-locale') || (String(navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
  if (!['zh', 'en'].includes(locale)) locale = 'zh';
  let busy = false;
  const isChinese = s => /[\u4e00-\u9fff]/.test(s);

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const parent = node.parentElement;
    if (parent && parent.closest('script,style,pre,code,textarea')) return;
    const raw = node.nodeValue || '';
    const key = raw.trim();
    if (!key) return;
    if (locale === 'en') {
      if (!node.__zh) node.__zh = raw;
      if (EN[key]) node.nodeValue = raw.replace(key, EN[key]);
    } else if (node.__zh !== undefined) {
      node.nodeValue = node.__zh;
    }
  }
  function translateAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    let map = attrOrig.get(el);
    if (!map) { map = {}; attrOrig.set(el, map); }
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      const raw = el.getAttribute(attr);
      const key = raw.trim();
      if (!key) continue;
      if (map[attr] === undefined) map[attr] = raw;
      if (locale === 'en' && EN[key]) el.setAttribute(attr, raw.replace(key, EN[key]));
      else if (locale === 'zh') el.setAttribute(attr, map[attr]);
    }
  }
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) return translateTextNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) translateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) translateTextNode(n);
      else translateAttrs(n);
    }
    // brand/language-specific attributes
    document.querySelectorAll('[data-i18n-zh]').forEach(el => {
      const value = locale === 'zh' ? el.dataset.i18nZh : el.dataset.i18nEn;
      if (value !== undefined) el.textContent = value;
    });
  }
  function apply(root = document.body) {
    if (busy) return;
    busy = true;
    try { translateTree(root || document.body); } finally { busy = false; }
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    const btn = document.getElementById('lang-toggle');
    if (btn) { btn.textContent = locale === 'en' ? '中文' : 'EN'; btn.setAttribute('aria-label', locale === 'en' ? '切换到中文' : 'Switch to English'); }
    document.title = locale === 'en' ? 'LiveAtelier · Design System Operations' : 'LiveAtelier · 设计系统操作台';
  }
  function set(next) {
    locale = next === 'en' ? 'en' : 'zh';
    localStorage.setItem('livedso-locale', locale);
    apply(document.body);
    document.dispatchEvent(new CustomEvent('livedso:locale', { detail: { locale } }));
  }
  const observer = new MutationObserver(mutations => {
    if (busy || locale !== 'en') return;
    busy = true;
    try {
      for (const m of mutations) {
        for (const node of m.addedNodes) translateTree(node);
        if (m.type === 'characterData') translateTextNode(m.target);
      }
    } finally { busy = false; }
  });
  function boot() {
    apply(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.addEventListener('click', () => set(locale === 'zh' ? 'en' : 'zh'));
  }
  window.LiveDSO_I18N = { get locale() { return locale; }, set, apply, t: s => locale === 'en' ? (EN[s] || s) : s };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
