# R-007 · 组件契约先于实现

> **状态**：`active` ｜ **级别**：MUST ｜ **生效**：2026-10-21
> **范围**：跨产品共享组件；单产品私有组件可简化 ｜ **Owner**：设计主控 + 工程
> **关联**：E04/E05/E06、[components/](../components/README.md)、[08 组件落地](../docs/08_组件落地_v0.2.md)

## 一、规则

**进入共享层前必须先有契约；契约至少覆盖解剖、状态、键盘/无障碍、Do/Don't、跨端与 token；没有契约不得新增共享组件。**

## 二、要求

1. **五节**：Anatomy / States / Keyboard & a11y / Do & Don't / Cross-platform & tokens。
2. **状态完整**：default / hover / active / focus-visible / disabled；表单另有 error/help/readonly。
3. **token 引用**：组件 CSS 只引用 `--lr-*`；不得写裸值；不得新增核心语义。
4. **真实消费者**：共享组件至少有一个真实产品使用；只有设计稿不算。
5. **变体克制**：变体由产品需求驱动；不为“以后可能用”预建。
6. **回归**：改契约/组件 CSS 必须跑契约与真实消费者审计。

## 三、验收

```bash
node --experimental-strip-types design/tools/check_component_contracts.ts
node --experimental-strip-types design/tools/check_component_usage.ts
node --experimental-strip-types design/tools/build_web_kit.ts --check
```

## 四、例外

- 单产品私有组件可只写使用说明；一旦跨产品复用，必须补契约。
- 平台原生组件（iOS/Android）由 App kit 映射，不重复造 Web 契约。

## 五、反例 / 迁移

- **反例**：先写组件 CSS 再补契约；为“以后可能用”预建 8 个变体；共享组件没有真实消费者。
- **迁移**：把私有组件先留在产品层，出现第二个消费者时补契约并迁入共享层。

## 六、变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-21 | v1.0 | 固化契约五节、状态、真实消费者与闸门。 |
