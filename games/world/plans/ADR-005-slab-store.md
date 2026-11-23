# ADR-005 · M0 先用 slab 存储，bevy_ecs 延后

- 状态：接受（临时偏差，M1 复核）
- 关联：[01 §八](../docs/01_世界模型与运行时.md#八确定性契约)

## 决策

M0 的 `world-core` 使用确定性的 slab 存储（`Vec<Slot>` + 世代 + 空闲列表），不引入 `bevy_ecs`。
`World` 的门面（spawn/entity/entities/find_by_content_id）保持与 ECS 可替换。

## 理由

- M0 要验证「C ABI + 确定性 + 内容闭环」；同时引入 ECS 会把两个变量混在一起。
- `bevy_ecs` 的 archetype 迭代顺序会随组件增删变化，必须先有排序门面；M0 先把这个门面写出来。
- 3 个实体的 Demo 不需要 ECS 的查询性能。

## M1 复核问题

1. 门面是否足以承载 `interaction/stats/inventory/quest` 的查询需求？
2. 是否真的需要 archetype 的性能，还是 slab + 索引已足够？
3. 若引入 `bevy_ecs`，如何保证所有玩法遍历物化 + 按 `EntityId` 排序？

结论写入本 ADR 的「M1 复核」小节，再决定是否替换。

## M1 复核（2026-11-23）

- 新增 `worldc bench --synthetic 5000 --ticks 6000`：Apple M1 Pro / macOS 27.2.1 / release，
  5,000 个静态 Actor 跑 6,000 tick，**0.0078 ms/tick**（约 0.47 s 总计）。
- 该基准只覆盖 tick、日程扫描、空命令队列与快照哈希，不覆盖复杂查询/战斗；但它说明
  「5k 实体」本身不构成替换 ECS 的理由。
- **结论：M1 保留 slab；M2 在真实游戏切片（查询/战斗/大量组件变更）上再复核。**
  若届时每 tick 的排序/物化成本超过预算，再引入 `bevy_ecs` 并保留排序门面。
