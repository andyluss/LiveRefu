# R-002 · Token 单一事实来源与三层结构

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：颜色、字体、字号、间距、尺寸、圆角、描边、动效、阴影、图标 ｜ **Owner**：设计主控
> **关联**：D3 / D4、[02 系统架构](../docs/02_系统架构.md)、[05 实现记录](../docs/05_实现记录_v0.1.md)

## 一、规则

**所有设计值只在 `design/tokens/` 的 JSON 中定义一次，经 `build_tokens.ts` 生成各端产物；业务代码不得写裸值，也不得维护第二套 token。**

## 二、要求

1. **三层**：`ref.*`（原始值）→ `sys.*`（通用语义）→ `product.*`（产品/纪元语义）；业务只消费 `sys`/`product`。
2. **源文件**：`tokens/core/*.tokens.json` 与 `tokens/products/*.tokens.json` 是唯一手写源；`tokens/dist/**` 是生成物。
3. **生成**：Web CSS、Godot JSON、App JSON、token 文档由 `tools/build_tokens.ts` 生成；生成物提交并纳入对账。
4. **不手改**：`dist/**`、`components.css`、Godot token 副本不得手改；改源后重跑。
5. **Schema**：新增字段/类型先改 `tokens/schema/tokens.schema.json`，再过校验。
6. **禁止裸值**：业务 CSS/TS/Vue/Godot 资源不得出现色值、字号、圆角、间距、动效时长裸值；例外必须登记。

## 三、验收

```bash
node design/tools/build_tokens.ts --check
node design/tools/check_tokens.ts
node design/tools/check_no_raw_values.ts --all
bash design/tools/check.sh
```

## 四、例外

- 编辑器/评审标注的辅助线不属于产品界面，可写裸值，但必须标注。
- 第三方品牌/平台强制值：登记来源、范围、到期，并在产品层隔离。

## 五、反例 / 迁移

- **反例**：业务 CSS 写 `#57d8c8`；在页面里维护第二套 `--color-*`；手改 `tokens/dist`；新增 token 不写 schema。
- **迁移**：先把裸值映射到最近的 `sys.*`/`product.*`，登记例外，替换后跑裸值闸门；旧别名保留一个 minor 周期。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 从 D3/D4 与 v0.1 实现固化为规则。 |
