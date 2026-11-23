# ADR-002 · 内容包 schema v0

- 状态：接受（M0 实现）
- 关联：[02 内容作者](../docs/02_内容作者与工具链.md)

## 决策

1. 内容包是一个目录，入口 `pack.json`；`world` 指向世界根，`zones/actors/props/items/rules/quests/dialogue/schedules/loc` 各自独立 JSON 文件。
2. `pack.json` 的 `schema = 1`；`tick_hz` 只允许 30/60/120；`sim_profile` 只允许 `arcade`/`engine_physics`。
3. placement 必须且只能指定 `actor`/`prop`/`item` 之一；`persistent_id` 全包唯一。
4. 所有定义文件的 `id` 必须与索引键一致；引用必须存在。
5. 规则 v0 用 JSON（`on`/`target`/`when`/`then`/`else`），TS DSL 在 M1 编译到同一规范化格式。
6. 校验错误码稳定：`E-SCHEMA-*`、`E-MANIFEST-*`、`E-REF-*`、`E-TIME-*`、`E-DLG-*`、`E-LOC-*`、`E-VALUE-*`、`E-RULE-*`。
7. 发布产物 `pack.data` 是 `Pack` 的确定性 JSON 序列化；`manifest.json` 另存 `pack_hash = sha256(pack.data)`。

## 理由

- JSON 在 M0 可读、可 diff、跨语言；它同时是 TS DSL 的编译目标，不会因 M1 引入 TS 而废弃。
- 严格校验先于运行时，避免内容错误变成引擎堆栈。

## 代价 / 后续

- 没有 TS 类型补全与编辑器表单（M1）。
- 没有内容迁移工具（M4）。
- `pack.data` 目前是 JSON；M2 基准后评估 CBOR/FlatBuffers。
