# R-004 · 字阶：UI 5 级 / Editorial 7 级

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：Web/App UI、编辑内容、卡面 ｜ **Owner**：设计主控
> **关联**：[02 §3.3](../docs/02_系统架构.md)、[04 视觉契约](../../projects/mainline/future-debris/docs/04_视觉语言与设计token.md)

## 一、规则

**UI 只用 5 级字阶；编辑内容用 7 级；不得为单个页面临时新增字号。**

## 二、要求

1. **UI 5 级**：`title-1` 28 / `title-2` 20 / `body` 16 / `caption` 14 / `number-lg` 32（px）。
2. **Editorial 7 级**：`display` 48 / `h1` 36 / `h2` 28 / `h3` 22 / `body` 16 / `caption` 14 / `footnote` 12。
3. **中文正文**：产品界面正文不低于 16px；14px 只能作标签/脚注；不得出现 13px 正文。
4. **行高/字重**：按 token；不得只改字号不改行高。
5. **等宽数字**：费用、计数、结算数字使用等宽/tabular-nums。
6. **新层级**：先改本规则 + token + 契约，再使用；不得就地写 `font-size: 13px`。

## 三、验收

```bash
node --experimental-strip-types design/tools/check_tokens.ts
node --experimental-strip-types design/tools/check_no_raw_values.ts --all
```

## 四、例外

- 评审标注/图表刻度可使用 8–12px，但必须显式标注“非产品界面”。
- 平台系统字号（iOS Dynamic Type）由 App kit 映射，不新增 UI 层级。

## 五、反例 / 迁移

- **反例**：正文 13px；为落地页新增 15.5px；只改字号不改行高；标题用非等宽数字。
- **迁移**：把 13–15px 正文归并到 `caption`/`body`，把临时层级并入最近的 5/7 级；在例外中登记过渡页。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化 5+7 字阶与中文字号下限。 |
