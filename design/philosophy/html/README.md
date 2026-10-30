# 青橙理念 · HTML 可视化

13 篇理念文章各一页静态可视化，另有一页索引。

- 入口：[`index.html`](index.html)
- 样式：[`philosophy.css`](philosophy.css)
- 生成：`node design/philosophy/tools/build-pages.mjs`
- 无外部字体、脚本或网络依赖，可直接双击打开。

每页包含：一句话命题、关系图、三个判断、文章地图、原文与上下篇链接。

## 主题

页面遵循 R-016：系统 / 浅色 / 深色三态，统一 `lrds-theme`，首屏预绘制，可离线切换。共享控制见 `philosophy-theme.js`。
