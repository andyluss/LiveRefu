# Web Kit · 网页介质适配

> 消费 `design/tokens/dist/web/*.css`（由 `design/tools/build_tokens.ts` 生成）。
> 当前试点：[《未来档案》网站](../../../projects/website/README.md)、[LiveFab 门户](../../../projects/livefab/portal/src/layouts/Base.astro)。

## 一、产物

| 文件 | 内容 | 谁消费 |
| --- | --- | --- |
| `tokens/dist/web/future-archive.css` | `sys.*` + `product.future-archive.*` + 旧变量别名 | 网站 |
| `tokens/dist/web/livefab.css` | `sys.*` + `product.livefab.*` + 旧变量别名 | LiveFab 门户 |
| `projects/website/app/assets/tokens.generated.css` | `future-archive.css` 的**产品副本**（生成物，勿手改） | 网站 Nuxt 构建 |
| `projects/livefab/portal/src/assets/tokens.generated.css` | `livefab.css` 的**产品副本**（生成物，勿手改） | LiveFab Astro 构建 |

> 每个 Web 产品一份 CSS：`sys.*` 共享，`product.*` 与旧变量别名各自独立——避免两个产品的 `--bg` 互相覆盖。

## 二、接入方式

### 网站（Nuxt）

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

### LiveFab（Astro）

1. 把 `tokens.generated.css` 放在 `src/assets/`；
2. 在布局的 frontmatter 里 `import '../assets/tokens.generated.css'`；
3. 删除布局里的内联 `:root` 颜色，保留 `color-scheme` 等非颜色设置。

### 两个产品通用

- 旧代码可继续用 `--bg` / `--teal` 等兼容别名；**新代码请直接用 `--lr-*`**。
- 不要同时加载两个产品的生成 CSS——它们的旧变量别名会冲突。

## 三、规则

- **不要手改生成物**：改 `design/tokens/`，然后跑 `build_tokens.ts`。
- **不要在业务 CSS/Vue/TS 里写 `#hex` 或 `rgba()`**：用 `--lr-*`；例外必须登记到 [`docs/exceptions.md`](../../docs/exceptions.md)。
- 焦点：`outline: 2px solid var(--lr-color-focus-ring); outline-offset: 1px;`，用 `:focus-visible`。
- 交互边框：用 `--lr-color-line-strong`，不要用 `--lr-color-line-subtle`（后者只用于装饰分隔线）。
- 半透明遮罩/阴影用 8 位 hex token（`#RRGGBBAA`），不要把 `rgba()` 写回业务代码。

## 四、验收

```bash
node --experimental-strip-types design/tools/build_tokens.ts --check
node --experimental-strip-types design/tools/check_contrast.ts
node --experimental-strip-types design/tools/check_no_raw_values.ts
cd projects/website && bun run tools/verify-contrast.ts && bun run build
cd projects/livefab/portal && bun run build
```

> `check_no_raw_values` 的默认受检面是**整个网站 app**（26 个 CSS/Vue/TS 文件）；游戏脚本用 `--all` 只报告、不拦截。网站 6px 圆角仍是登记例外 `EX-20261021-02`。
