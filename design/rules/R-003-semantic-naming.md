# R-003 · 语义命名：先角色，后色值

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：token、CSS 变量、组件、产品样式 ｜ **Owner**：设计主控
> **关联**：D3、[02 §三](../docs/02_系统架构.md)、[E01](../docs/00_决策总表.md)

## 一、规则

**命名先回答“这个值扮演什么角色”，再决定它长什么样；禁止用颜色/尺寸词承载业务语义。**

## 二、要求

1. **角色名**：`sys.color.action.primary`、`sys.color.feedback.danger`、`sys.color.focus.ring`，不得写 `sys.color.teal`。
2. **焦点独立**：焦点环不得复用 action/danger/power 等语义色；必须有独立 token（E01）。
3. **产品语义**：产品差异用 `product.<product>.*`，不得把产品名塞进 `sys.*`。
4. **状态完整**：交互组件至少定义 default / hover / active / focus-visible / disabled；不得只定义 default。
5. **别名可追**：允许 alias，但必须能追溯到 `ref`；不得形成循环。
6. **跨端同名**：Web CSS / Godot / App 使用同一语义路径；只允许介质前缀差异。

## 三、验收

```bash
node --experimental-strip-types design/tools/check_tokens.ts
node --experimental-strip-types design/tools/check_contrast.ts
bash design/tools/check.sh
```

## 四、例外

- `ref.*` 可以使用色相/尺度名，因为它只描述原始值。
- 第三方 API 强制字段名：在 adapter 内映射，不泄漏到 `sys.*`。

## 五、反例 / 迁移

- **反例**：`--teal` 当行动色；`--danger` 同时表示品牌强调；焦点环复用行动色；只定义 default 状态。
- **迁移**：为旧别名建立 `旧名 → 新语义名` 映射表，产品逐页替换，保留 alias 一个 minor 周期。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化为规则；焦点环独立来自 E01。 |
