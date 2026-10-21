# Web Kit · 网页介质适配

> 消费 `design/tokens/dist/web/tokens.css`（由 `design/tools/build_tokens.ts` 生成）。
> 当前试点：[《未来档案》网站](../../../projects/website/README.md)。

## 一、产物

| 文件 | 内容 | 谁消费 |
| --- | --- | --- |
| `tokens/dist/web/tokens.css` | `sys.*` 语义变量（`--lr-*`）+ `product.future-archive.*` + 旧变量别名（`--bg` / `--teal` / …） | 网站、LiveFab、未来的 Web 应用 |
| `projects/website/app/assets/tokens.generated.css` | 上述文件的**产品副本**（生成物，勿手改） | 网站 Nuxt 构建 |

## 二、接入方式（以网站为例）

1. 把 `tokens.generated.css` 放在 `app/assets/`；
2. 在 `nuxt.config.ts` 的 `css` 数组里**排在主题之前**：
   ```ts
   css: ['~/assets/tokens.generated.css', '~/assets/theme.css'],
   ```
3. 主题里删除裸色值，改用：
   ```css
   :root {
     --focus-width: var(--lr-border-focus);
     --maxw: var(--lr-grid-web-max-width);
   }
   ```
4. 旧代码可继续用 `--bg` / `--teal` 等兼容别名；**新代码请直接用 `--lr-*`**，v0.2 会逐步移除别名。

## 三、规则

- **不要手改生成物**：改 `design/tokens/`，然后跑 `build_tokens.ts`。
- **不要在业务 CSS/Vue/TS 里写 `#hex`**：用 `--lr-*`；例外必须登记到 [`docs/exceptions.md`](../../docs/exceptions.md)。
- 焦点：`outline: 2px solid var(--lr-color-focus-ring); outline-offset: 1px;`，用 `:focus-visible`。
- 交互边框：用 `--lr-color-line-strong`，不要用 `--lr-color-line-subtle`（后者只用于装饰分隔线）。

## 四、验收

```bash
node --experimental-strip-types design/tools/build_tokens.ts --check
node --experimental-strip-types design/tools/check_contrast.ts
node --experimental-strip-types design/tools/check_no_raw_values.ts
cd projects/website && bun run build
```

> `check_no_raw_values` 的 v0.1 受检面是 `theme.css`；`GalleryGrid.vue` / `SearchDialog.vue` / `gallery/index.vue` 的裸色值已登记为设计债（见 exceptions）。
