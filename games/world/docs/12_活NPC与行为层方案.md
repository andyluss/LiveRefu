---
title: "12 · 活 NPC 与行为层方案"
doc_type: "方案（M3 候选）"
status: "方案，未实现；M1/M2 不依赖"
date: "2026-11-28"
source: "AI 起草，人类裁决"
authority: "人类（是否进入 M3）/ 工程（实现）"
upstream:
  - "01_世界模型与运行时.md"
  - "11_内核分层与迁移.md"
related:
  - "05_路线图与验收.md"
  - "07_M1实现与验收.md"
  - "09_M2适配器启动.md"
---

# 12 · 活 NPC 与行为层方案

> **一句话**：活 NPC 不是“更强的寻路”，而是 **L2 Agency 里的目标选择 + L0 的腿 + L1 的手 + L3/L4/L5 的上下文**。
>
> **状态**：本文只定方案，**不进入 M1/M2**，留到 **M3 的可选扩展**实现；不改变 M3 的三宿主退出标准。当前 `ScheduleEntry.target` + 路径跟随已经能表达“到点上班/开会”，但不是完整活 NPC。

## 一、为什么放到 M3

M1 已经证明：

- 内容包能驱动世界；
- 日程能切换行为；
- NPC 有 target 时会走导航路径；
- 旧包哈希仍稳定。

M2 已经证明：

- 同一个包在 Godot 与 Headless 跑同一局；
- 存档、事件、哈希、视图池都可跨宿主对齐。

“活 NPC”不改变这两条边界，但会引入新的持续状态、决策频率、感知与调参成本。如果在 M2 前做，容易把“适配器验收”拖成“AI 研究”。因此：

- **M1/M2 不做活 NPC**；
- 现有 schedule target 作为 M1 的 NPC 寻路基础；
- 本文作为 **M3 候选方案**，先冻结接口和验收，再实现。

## 二、目标与非目标

### 目标

1. NPC 能根据需求、日程、环境和社会关系选择下一步行动；
2. NPC 能走到目标点，并在目标点执行动作；
3. 决策可复现、可存档、可解释；
4. 内容作者能通过 JSON/TS 配需求、目标、权重；
5. 5k 场景下不是每 tick 全量决策；
6. 不破坏 M0/M1/M2 的旧包、哈希与适配器边界。

### 非目标

- 不追求通用行为树编辑器；
- 不做机器学习/LLM 驱动；
- 不做完整战斗 AI、战术寻路、群体编队；
- 不做跨 Zone 长期记忆/离线模拟；
- 不把路径规划搬到 L2；
- 不因为活 NPC 改 C ABI 或引擎适配器。

## 三、分层结论

```text
L3 Narrative      任务/对白/脚本 → 压力与目标候选
L4 Social         关系/阵营/声望 → 社会效用
L5 Systems        天气/能源/危险 → 环境效用
        │ 由 World 组合根收集成 AgentContext（普通数据）
        ▼
L2 Agency         需求 / 目标 / 活动 / 记忆 / 决策
        │ Intent（去哪、做什么、对谁）
        ▼
L1 Subject         动作前置条件与执行（talk/pickup/use door）
        │
        ▼
L0 Spacetime       空间查询、A*、移动、碰撞
```

### 3.1 每层做什么

| 层 | 活 NPC 中的职责 | 不该做什么 |
| --- | --- | --- |
| **L0 Spacetime** | 半径/视线查询；A*；路径跟随；碰撞；移动学 | 不知道“上班/社交/害怕” |
| **L1 Subject** | 距离、门锁、背包、可交互检查；执行 talk/pickup/use | 不选目标，不做长期计划 |
| **L2 Agency** | 需求、目标、活动、记忆、效用评分、计划、冷却 | 不直接改 transform，不复制门锁/背包逻辑 |
| **L3 Narrative** | 任务压力、剧情目标、对白入口 | 不逐 tick 命令 NPC 走路 |
| **L4 Social** | 关系/阵营/声望，给目标打分提供权重 | 不拥有行为选择 |
| **L5 Systems** | 天气、能源、危险、经济，给活动提供压力 | 不决定 NPC 个人目标 |

### 3.2 为什么不是 L3

如果把活 NPC 放进 L3，任务系统会逐渐接管所有 NPC 行为，导致：

- 非任务 NPC 没有行为；
- 任务作者要写 AI；
- 叙事改动引发行走路径变化；
- 旧包/旧对话更难保持兼容。

L3 只应该“影响”L2，不应该“成为”L2。

### 3.3 为什么不是 L4/L5

L4/L5 是**世界事实与效用输入**：

- 关系好 → 更愿意去社交；
- 能源低 → 更愿意去维修；
- 下雨 → 更愿意进屋。

它们提供权重，但不应该知道 A* 或 tick 路径。

## 四、核心模型

### 4.1 AgentState

建议在 L2 用独立状态存储，不把大量 AI 字段塞进 `Entity` DTO：

```text
AgentState
  content_id
  needs:
    energy, social, curiosity, stress
  goal:
    id, utility, source, started_tick
  activity:
    id, phase, target, started_tick
  cooldowns:
    map<activity_id, until_tick>
  memory:
    bounded ring of {tick, kind, subject, value}
  last_decision_tick
  last_path_request_tick
```

`AgentState` 可按 `content_id` 索引，和现有 `npc_paths` 一样避免 `EntityId` 作为 JSON map key。

### 4.2 目标与活动

不要一上来做大型行为树。建议：

```text
Goal      为什么去（eat / rest / work / socialize / investigate / flee）
Activity  怎么做（goto / wait / use / talk / inspect / patrol）
Action    具体原语（move_to / interact / talk / pickup）
```

示例：

```text
goal: socialize
  → activity: talk_to(npc.mayor)
    → L0 path to mayor
    → L1 can_talk(player, mayor)
    → L1 talk(player, mayor)
```

目标选择用**整数效用评分**，不是每帧浮点比较：

```text
score = base
      + need_pressure * need_weight
      + social_weight * relationship
      + environment_weight * world_state
      + quest_pressure
      - distance_penalty
      - cooldown_penalty
```

- 权重来自内容包；
- 评分用整数或定点；
- 平分时按 `entity index` / `content_id` 确定性 tie-break；
- 决策有 hysteresis（新目标必须超过当前目标一定阈值才切换），避免抖动。

### 4.3 日程的新位置

现有 `ScheduleEntry` 保留，但降级为**目标候选之一**：

- 日程提供 baseline（上班/开会/睡觉）；
- 紧急需求可以覆盖日程；
- 覆盖需要阈值 + 冷却，不能每秒反复横跳；
- 结束后回到日程 baseline。

这样不会破坏已有内容：没有 needs/goals 的旧包仍然只有日程，行为与哈希不变。

### 4.4 记忆

L2 保存**工作记忆**，不是叙事 flags：

- 最近见过谁；
- 最近一次交互成功/失败；
- 最近一次被阻挡/找不到路；
- 最近一次目标完成。

建议：

- 固定容量（例如 16/32 条）；
- 只存 content ID 与枚举，不存长文本；
- 快照可选字段，旧包省略；
- 不把完整对话历史塞进 AI 状态。

### 4.5 感知

分两层：

- **L0**：原始空间查询（半径、视线、最近可用点）；
- **L2**：决定“我知道什么”。

L2 的感知结果应受以下限制：

- 距离/视线；
- 是否在同一 Zone；
- 记忆衰减；
- 社会关系不直接等于“全知”（L4 只提供权重）。

不要做全图全知 NPC；否则寻路和任务会失去意义。

## 五、一次决策的顺序

建议把决策放在固定 tick 边界，而不是渲染帧：

```text
1. L0 推进移动/碰撞/路径
2. L1 执行上一 tick 排队动作
3. World 收集 AgentContext（L3/L4/L5 的只读快照）
4. L2 按 LOD 决定哪些 Agent 本 tick 决策
5. L2 选 goal / activity / target
6. L2 发出 Intent（不直接改 transform）
7. World 把 Intent 交给 L0 路径/L1 动作
8. 发事件
```

决策频率：

| 距离/状态 | 频率 | 说明 |
| --- | --- | --- |
| 玩家附近/战斗 | 5–10 Hz | 快速反应 |
| 同 Zone 中距离 | 1–2 Hz | 日程/社交 |
| 远距离/休眠 | 0.1–0.5 Hz | 只跑世界级系统 |
| 繁忙/阻塞 | 事件触发 | 不固定 tick 轮询 |

LOD 必须由确定性规则决定（距离阈值、Zone、tick 分桶），不能用墙钟或渲染帧率。

## 六、动作与路径边界

### L2 只发意图

```text
Intent {
  actor,
  kind: goto | talk | interact | wait | flee,
  target_entity?,
  target_point?,
  activity_id,
  priority
}
```

L2 不直接：

- 写 `transform.position`；
- 调 A*；
- 检查门锁；
- 改 inventory；
- 发对话事件。

### L0 负责路径

- L2 请求“去某点/某人附近”；
- L0 用当前门状态、动态障碍做 A*；
- L0 返回路径/失败；
- L2 记录 `last_path_request_tick`，失败后冷却重试，不能每 tick 重算。

### L1 负责动作

- L2 请求 `talk(target)`；
- L1 检查距离、门、背包、可交互；
- L1 成功/失败返回结果；
- L2 根据结果更新记忆与目标。

## 七、依赖方向

当前层规则是“上层依赖下层，下层不 import 上层”。因此 **L2 不能直接 import L3/L4/L5**。

推荐方式：

- `World` 作为组合根，收集 L3/L4/L5 的只读状态；
- 组装成 **普通 DTO** `AgentContext`；
- 传给 L2；
- L2 只依赖 DTO，不依赖上层模块。

```rust
// 只表达数据，不暴露上层类型
struct AgentContext {
    quest_pressure: Vec<(String, i32)>,
    social_weights: Vec<(String, i32)>,
    environment: EnvironmentFacts,
    nearby: Vec<NearbyEntity>,
}
```

这样既能让 L2 使用社会/环境信息，又不破坏 `check_layers`。

## 八、确定性与存档

### 必须

- 决策只在 tick 边界发生；
- 不使用墙钟/真实时间；
- 随机只来自世界 RNG 或显式 seed；
- 评分用整数/定点；
- tie-break 固定；
- LOD 由 tick/距离决定；
- Agent 状态在快照中可选，旧包省略；
- 路径失败/重试次数有上限；
- 决策不依赖迭代顺序（BTreeMap 或排序）。

### 快照

```text
Snapshot
  agents?: map<content_id, AgentSnapshot>
```

`agents` 为空时不序列化。旧包、M0/M1 golden 哈希不变。

新增测试：

- 同一 seed 跑两次，agent 决策序列一致；
- 存档/读档后位置、目标、记忆一致；
- 旧包不出现 `agents` 字段；
- 同一 tick 的决策不受 HashMap 迭代顺序影响。

## 九、内容作者

### 最小写法

```json
{
  "id": "brain.keeper",
  "needs": { "energy": 0.6, "social": 0.3 },
  "goals": [
    { "id": "work", "base": 40, "schedule": "schedule.keeper" },
    { "id": "eat", "base": 30, "need": "energy" },
    { "id": "talk", "base": 20, "need": "social" }
  ],
  "activities": {
    "work": { "kind": "goto", "target": [4, -2] },
    "eat": { "kind": "goto", "target": [-2, 4] },
    "talk": { "kind": "talk", "target": "nearest_friend" }
  }
}
```

### 作者原则

- 先写目标，不写行为树；
- 每个目标有清楚的效用来源；
- 权重可调，不要硬编码剧情；
- 用 `target` 表达地点，用 `target_entity` 表达人；
- 所有资源 ID 用逻辑 ID，不写引擎路径。

## 十、LOD 与性能

M3 不能把活 NPC 直接塞进 5k 全量每 tick 决策。

建议预算：

| 项 | 目标 |
| --- | --- |
| 决策频率 | 近 5–10Hz / 中 1–2Hz / 远 0.1Hz |
| 每 tick 决策数 | 有上限，超出按优先级降级 |
| 路径请求 | 每 tick 有预算队列 |
| 路径失败重试 | 冷却 0.5–2s，不每 tick 重算 |
| 5k 目标 | tick P95 不高于当前基线 +10% |
| 内存 | Agent 状态有界；记忆固定容量 |

优化顺序：

1. 事件驱动（互动/阻塞/任务变化）而不是全量轮询；
2. LOD；
3. 路径缓存/重试；
4. 最后才考虑并行/换 ECS。

## 十一、可观测性

没有观测的 AI 会变成“玄学”。至少需要：

- `agent_goal_changed`：谁、从什么到什么、分数；
- `agent_activity_started` / `finished`；
- `agent_path_failed`：目标、原因、重试次数；
- `agent_blocked`：被谁/什么挡住；
- 调试快照：当前 goal/activity/target/needs/最近记忆。

事件要低频率，不要每 tick 发。

## 十二、测试与验收

### M3 退出标准

1. 一个 8–12 NPC 的站点，有日程、需求、社交、环境压力；
2. 同一 seed 下，Headless 两次 replay 的 agent 决策/位置/事件一致；
3. 存档/读档后 agent 状态一致；
4. 旧 M0/M1/M2 包不出现 `agents`，哈希与事件不变；
5. 5k mixed load 下 tick P95 不高于当前基线 +10%；
6. 作者能通过 JSON/TS 新增一个 goal + activity，不需要改 Rust；
7. 调试面板/事件能解释“为什么这个 NPC 现在去这里”；
8. LOD 打开/关闭不改变最终位置（只改变计算路径）。

### 测试矩阵

- 需求触发：低能量 → 找食物；
- 日程 baseline：工作 → 开会 → 回家；
- 紧急覆盖：火灾/低电 → 优先级切换；
- 社交：关系高 → 更愿意聊天；
- 阻挡：门关 → 等待/重试；门开 → 通过；
- 寻路失败：不抖动、不刷路径；
- 存档：目标/记忆/路径恢复；
- 旧包：无 `agents`、无行为变化、哈希不变；
- 5k：决策预算与帧预算。

## 十三、实施阶段（M3）

### Phase 0 · 冻结接口

- 本文定稿；
- 确认 `AgentContext` 与 `AgentState` 边界；
- 确认 L2 不 import L3/L4/L5。

### Phase 1 · AgentState + schedule baseline

- 只做状态与快照；
- 行为仍由 schedule 决定；
- 旧包无变化。

### Phase 2 · 整数 utility + 目标选择

- needs / goals / weights；
- 决策 1–2Hz；
- 事件与调试快照。

### Phase 3 · 动作原语

- L1 提供 `can_*` / `do_*`；
- L2 发 Intent；
- 路径由 L0 负责。

### Phase 4 · 感知/记忆/社交/环境

- L0 范围查询；
- L2 记忆；
- L4/L5 通过 AgentContext 注入。

### Phase 5 · LOD + 5k

- 决策预算；
- 失败重试；
- 性能门。

### Phase 6 · 内容试点

- 8–12 NPC；
- 一个真实场景；
- 作者试用。

## 十四、风险

| 风险 | 后果 | 对策 |
| --- | --- | --- |
| 一上来做行为树 | 调参成本高、难验证 | 先整数 utility + activity |
| L2 直接 import L3/L4/L5 | 破坏层边界 | AgentContext DTO + 组合根 |
| 每 tick 全量决策 | 5k 性能崩溃 | LOD + 预算 + 事件驱动 |
| 浮点评分 | 跨宿主不稳定 | 整数/定点 + tie-break |
| 路径失败每 tick 重试 | CPU 抖动 | 冷却 + 上限 |
| 记忆无限增长 | 存档膨胀 | 固定容量 ring |
| 日程被频繁覆盖 | NPC 抖动 | hysteresis + 冷却 |
| 任务系统接管 AI | 内容与 AI 耦合 | 任务只提供压力 |
| 调试不可见 | 无法解释行为 | 事件 + 调试快照 |

## 十五、待拍板

1. utility 用整数分还是定点？
2. 记忆容量 16/32/64？
3. 日程覆盖阈值/冷却具体值？
4. LOD 的距离与频率？
5. 是否允许跨 Zone 目标？
6. 是否把社交权重从 L4 注入，还是 L2 只存关系 ID？
7. 5k 场景里活 NPC 的数量上限？
8. 是否需要在 M3 前先做作者试用？

## 十六、结论

- **活 NPC 的大脑放 L2 Agency**；
- **腿放 L0，手放 L1**；
- **L3/L4/L5 只提供上下文与效用**；
- **M3 先做整数 utility + activity + 记忆 + LOD**；
- **M1/M2 不依赖本文，现有 schedule target 已够用**。

相关文档：

- [11 · 内核分层与迁移](11_内核分层与迁移.md)
- [05 · 路线图与验收](05_路线图与验收.md)
- [07 · M1 实现与验收](07_M1实现与验收.md)
- [09 · M2 适配器启动](09_M2适配器启动.md)
