# ADR-008 · 真实 5k 玩法基准（v1）

- 状态：接受
- 日期：2026-11-26
- 关联：[05 §十 指标](../docs/05_路线图与验收.md#十指标与节奏)、[ADR-005 slab](ADR-005-slab-store.md)、[baseline](../docs/bench/real5k-baseline-m1pro.json)

## 决策

新增 `worldc bench --scenario real5k`：用确定性生成的真实内容场景，在正式 `World::from_pack` / `tick_once` / 规则 / 任务 / 导航 / ScriptHost 路径上跑 5,000 实体，输出 P50/P95/P99 与快照/存档成本。

不再把 `--synthetic 5000`（静态 Actor、无规则/命令/导航/脚本）当作“5k 玩法基准”；它只保留为微基准。

## 场景 v1（单 Zone，5,000 实体）

当前内核只加载起始 Zone，因此 v1 明确是 **单 Zone 5,000 resident**，不是 10 Zone/5k AI：

| 组成 | 数量 |
| --- | --- |
| 静态碰撞 Prop | 2,999 |
| 带日程 Actor | 1,500 |
| 可拾取 Item | 500 |
| 玩家 | 1 |
| **初始实体合计** | **5,000** |
| Zone / 导航 | 1 个 240×240 区域，1 张 240×240 网格 |
| 规则 / 任务 / 对话 / 日程 | 20 / 20 / 10 / 10 |
| ScriptHost 脚本 | 2 |

内容由 seed 确定性生成（`Pack::real5k`），有规则、任务、对话、日程、脚本、碰撞、导航；不是空 actor 网格。

## 工作负载

- 每 6 tick：玩家 `MoveTo`（A* + 碰撞）；
- 每 20 tick：`Interact` / `Talk` / `Pickup` 轮换；
- 每 120 tick：`bench.pulse` 事件，触发 2 个 QuickJS 脚本；
- 每 tick：5k 日程扫描、碰撞、命令管线；
- 每 tick 记录应用层查询（`find_by_content_id` ×2、实体计数、flag）；
- 每 60 tick：`state_hash`（全量 snapshot + JSON）；
- 每 600 tick：`save_bytes` + `load_bytes`；
- warmup 300 tick；默认 5 轮 × 6,000 tick。

**测量边界**：tick P95/P99 只统计 `World::tick_once`；查询、snapshot/hash、save/load 分开统计。

### ScriptHost 过滤

5k 场景中，日程/交互事件如果每次都给脚本，`script_context` 会为每个事件序列化 5k 实体，成本失真。基准通过
`World::set_script_event_filter(["bench.pulse"])` 只让脚本处理低频 pulse；其它事件仍正常进入世界事件流。
这是显式的性能配置，不是关闭 ScriptHost。

## 通过标准

- 初始 5,000 实体；
- tick **P95 ≤ 2 ms**、P99 ≤ 4 ms；
- snapshot/hash **P95 ≤ 5 ms**；
- 5 轮 final hash 一致；command_rejected=0；script_errors=0；
- 记录 save/load 与查询成本。

## M1 Pro release 基线（2026-11-26）

| 指标 | 结果 |
| --- | --- |
| 初始 / 结束实体 | 5,000 / 4,895（105 次拾取） |
| tick P50 / P95 / P99 | **0.184 / 0.239 / 0.580 ms** |
| tick max | 51.389 ms（首轮寻路/缓存冷启动） |
| query P95 | 0.0033 ms |
| snapshot/hash P95 | 3.086 ms |
| save P95 / load P95 | 7.287 / 12.737 ms |
| commands / events / rejected | 7,090 / 12,690 / 0 |
| final hash（seed 42） | `0x523160a40071cef5` |

结论：**slab 在 v1 5k mixed load 下 P95 远低于 2 ms；不触发 bevy_ecs 替换。**
真正的 ECS 复核留给 M2 真实 Adapter（更多组件变更/查询/5k AI）。

## 不包含

- 5,000 个 NPC 每 tick 决策/寻路（需要 NPC AI + 空间索引，v2）；
- 多 Zone 同时驻留/动态加载；
- 渲染、Godot、网络；
- 绝对跨机器阈值：CI 共享 runner 只跑正确性/哈希，性能基线在固定机器上比。

## 复跑

```bash
cd games/world
WORLDC_RELEASE=1 ./worldc bench --scenario real5k --ticks 6000 --runs 5 --json
```
