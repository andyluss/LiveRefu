# R-016 · 生成式 HTML 必须三态：系统 / 浅色 / 深色

> **状态**：`active`（2026-10-30 用户批准） ｜ **级别**：MUST ｜ **生效**：2026-10-30
> **范围**：所有由脚本、模板、生成器或 AI 产出的 HTML 页面（HUB / GUIDE / 看板 / 报告 / 可视化 / 单页演示 / 离线页面），不论是否属于 LRDS ｜ **Owner**：设计主控 + 各页面生成者
> **关联**：[R-001 三态主题](R-001-theme-modes.md)、[R-006 无障碍](R-006-accessibility.md)、[R-009 生成物](R-009-generated-artifacts.md)、[AGENTS.md](../../AGENTS.md)

## 一、规则

**任何新生成或重新生成的 HTML 页面都必须支持 `system` / `light` / `dark` 三态，默认 `system`，顺序固定为“系统、浅色、深色”；用户显式选择写入统一键 `lrds-theme`，不得只输出暗色或亮色单态页面。**

这条规则是 [R-001](R-001-theme-modes.md) 在“生成式 HTML”上的执行细则：R-001 定义三态的语义与 token 纪律，R-016 定义生成器必须交付什么、怎么验收、哪些情况可例外。

## 二、要求

### A. 三态与顺序

1. 页面必须有且只有三种用户可见选择：**系统 / 浅色 / 深色**；顺序固定，不得改成“深色 / 浅色”二态开关。
2. 首次访问默认 `system`：跟随 `prefers-color-scheme`；系统切换时实时响应，不需要刷新。
3. 用户显式选择持久化到 `localStorage['lrds-theme']`，值只能是 `system`、`light`、`dark`；不得新增页面级 key（如 `philosophy-theme`、`refu-hub-theme`）。
4. 清除存储后回到 `system`；不得把上一次选择写回默认值。

### B. 生成物必须自包含

5. 生成的 HTML 必须在 `<head>` 中、**CSS 加载之前**内联一段预绘制脚本，先设置 `<html data-theme="system|light|dark">` 与 `<html data-theme-choice="system|light|dark">`，避免首屏闪烁（FOUC）。
6. 每个页面都必须包含三态控件；控件可以是按钮组、radio group 或菜单，但必须有可见文本、可键盘操作、当前项有 `aria-pressed="true"`（或 radio 的 `checked`）。
7. 控件与切换逻辑必须随页面一起交付；不得依赖外部 CDN、在线脚本或某个站点壳。页面离线打开时，三态仍可用。
8. 允许共用一份 `theme.js` / `theme.css`，但每个 HTML 仍要自带预绘制内联脚本和控件，不能假设宿主页面会注入。

### C. 两种外观必须同构

9. 两种外观使用**同一套 DOM、同一套类名、同一套语义 token 名**；不得为了深色复制一份 HTML，也不得只替换背景图。
10. 不得用 `data-theme="dark"` 改变信息语义（如“深色=危险”“浅色=安全”）；颜色不是唯一信息载体。
11. `color-scheme` 必须跟随：`light` 设 `light`，`dark` 设 `dark`，`system` 设 `light dark`；表单控件、滚动条、系统 UI 跟随。
12. 两种外观都要满足 [R-006](R-006-accessibility.md)：正文对比度、焦点环、禁用态、选中态、图表/代码/表格都可读；不能只测深色。
13. 图片、图标、截图、代码高亮、数据图在两种外观下都可读；确有必要的资产提供双份并登记来源，不得依赖纯白或纯黑背景。
14. 打印强制浅色/白底，不继承屏幕主题；打印样式不得把深色背景带进纸面。

### D. 无 JS 与降级

15. 禁用 JavaScript 时，页面内容必须仍可读；CSS 至少用 `@media (prefers-color-scheme: dark)` 提供系统态回退。
16. 控件在无 JS 时可以隐藏或禁用，但不得出现“看起来可点、实际无效”的三态按钮。
17. 生成器若检测到无法安全注入脚本（CSP、邮件、第三方嵌入），按第五节登记例外，不得静默生成单态页面。

## 三、参考实现

生成器必须产出等价于下面结构的最小实现（可抽成模板；不得省掉顺序或预绘制）：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script>
    (function () {
      var KEY = 'lrds-theme';
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var choice = 'system';
      try {
        var saved = localStorage.getItem(KEY);
        if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
      } catch (e) {}
      function apply() {
        var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
        document.documentElement.dataset.theme = mode;
        document.documentElement.dataset.themeChoice = choice;
      }
      apply();
      if (choice === 'system') {
        try { mql.addEventListener('change', apply); } catch (e) {}
      }
    })();
  </script>
  <link rel="stylesheet" href="./theme.css">
</head>
<body>
  <div class="theme-switch" role="group" aria-label="主题">
    <button type="button" data-theme-choice="system" aria-pressed="true">系统</button>
    <button type="button" data-theme-choice="light" aria-pressed="false">浅色</button>
    <button type="button" data-theme-choice="dark" aria-pressed="false">深色</button>
  </div>
  <script>
    (function () {
      var KEY = 'lrds-theme';
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-theme-choice]'));
      function apply() {
        var choice = document.documentElement.dataset.themeChoice || 'system';
        var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
        document.documentElement.dataset.theme = mode;
        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice));
        });
      }
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          var choice = b.dataset.themeChoice;
          document.documentElement.dataset.themeChoice = choice;
          try { localStorage.setItem(KEY, choice); } catch (e) {}
          apply();
        });
      });
      try { mql.addEventListener('change', apply); } catch (e) {}
      apply();
    })();
  </script>
</body>
</html>
```

配套 CSS 至少包含：

```css
:root { color-scheme: light dark; }
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { color-scheme: dark; /* 系统态回退 */ }
}
```

## 四、验收

### 手动

1. 首次打开：跟随系统深/浅；
2. 依次点击系统、浅色、深色：顺序正确、选中态正确、页面即时变化；
3. 刷新：选择保持；清空 `localStorage['lrds-theme']`：回到系统态；
4. 系统切换深/浅：页面实时跟随（选择为系统时）；
5. 两种外观都检查正文、表格、代码、图表、焦点、禁用、弹层、滚动条；
6. 打印预览：白底浅色，不继承屏幕深色。

### 机器 / 评审

```bash
# 所有受管生成式 HTML 的机器检查（优先用检查器，不要只 grep）
node design/tools/check_html_theme.ts --self-test
node design/tools/check_html_theme.ts
# 指定页面
node design/tools/check_html_theme.ts path/to/page.html

# 兼容说明：检查器接受新页面的 data-theme-choice，也接受
# design/HUB.html 与 design/GUIDE.html 既有的 data-theme-set；
# 新页面一律使用 data-theme-choice。
```

- 两套外观各跑一次对比度闸门；
- 两套外观各截一张图，检查焦点/禁用/表格/图表；
- 生成器模板评审：新模板未包含三态，不得合入。

## 五、例外

- **可登记例外**：打印/PDF、邮件 HTML、OG/社交分享图、嵌入第三方页面且宿主完全控制主题、必须锁定暗色的沉浸式游戏界面。
- **不可登记例外**：普通 HUB / GUIDE / 报告 / 看板 / 文档站 / 可视化页 / 单页演示。
- 例外必须写入 [`../docs/exceptions.md`](../docs/exceptions.md)，包含：理由、范围、到期、替代可读方案、批准人。
- 沉浸式游戏锁定暗色按 [R-001](R-001-theme-modes.md) 第四节处理；生成式看板不在豁免范围。
- 例外由设计主控批准；用户可推翻（D7）。

## 六、存量迁移

- 本规则生效前生成的 HTML 不要求一次性回填；**任何实质修改、重新生成或复制为新页面时，必须同时补齐三态**。
- **2026-10-30 已完成**：`design/philosophy/html/`（13 篇 + 索引）、`games/refu-game-001/HUB.html`、`games/refu-game-001/GUIDE.html`。
- **仍待迁移**：各项目 `可视化/` 生成页、历史报告/单页；修改时按本规则补齐，不要求一次性重做。
- 迁移顺序：先把生成器/模板改成三态，再重新生成；不要逐页手改后留下模板分叉。
- 旧 key（如 `*-theme`）读取后写入 `lrds-theme`，再删除旧 key；不得保留两套 key。

## 七、反例

- 只做深/浅二态开关，或把“系统”做成第三个装饰按钮但不生效；
- 每个页面使用不同 key（`philosophy-theme`、`refu-hub-theme`）；
- 只在 `<body>` 末尾切 class，首屏先闪一下深色；
- 深色只换背景，表格、代码、图表仍是浅色底；
- 用主题表达危险/成功/权限；
- 生成器输出单态页面，靠使用者“自己加主题”；
- 只在深色下测对比度，浅色下焦点环消失；
- 把三态控件放在页面底部、不可键盘访问，或没有 `aria-pressed`。

## 八、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-30 | v1.0 | **用户批准**；R-016 生效：所有生成式 HTML 强制 system / light / dark，统一 `lrds-theme`，补预绘制、控件顺序、无 JS 回退、验收与存量迁移策略。 |
