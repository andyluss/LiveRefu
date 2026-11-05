---
title: "16 · 模块化技术架构：NASApunk 系统方案"
doc_type: "工程参考（非设计决定）"
status: "参考 v0.2（M1–M2 已实现；M3–M7 进行中）"
date: "2026-11-04"
source: "AI 起草，人类参考"
authority: "人类（是否采纳）/ 工程（实现）"
rules:
  - "TECH-A1"
  - "TECH-A2"
  - "TECH-B1"
  - "TECH-B2"
upstream:
  - "12_技术方案_Godot工程.md"
  - "14_塔防NASApunk深化.md"
related:
  - "../../../../docs/retro-futurism/附录_NASA朋克卷/09_软与硬_生物可塑性与机械模块化.md"
  - "../../game/"
  - "11_待人类裁决清单.md"
---

# 16 · 模块化技术架构：NASApunk 系统方案

> **一句话**：把现在的「Sim / View 两层」推进成「**任务编排器 + 可替换模块 + 标准接口 + 总线 + 黑匣子**」的模块化单体。
>
> **不是** ECS，**不是**微服务，**不是**重写；是把现有规则拆成能单独测试、替换、降级的 ORU（轨道替换单元），让 NASApunk 的工程感进入代码结构，而不只停在界面。

> **状态**：参考方案；**M1 内核与 M2 Map/Economy 已落地**，M3–M7 进行中。本文不改变 [12](12_技术方案_Godot工程.md) 的现行事实，也不把任何「AI 建议」写成决定。

## 一、为什么现在还不够

现行架构已经做对了最重要的一件事：**模拟与视图分离**（[TECH-A2](rules/tech/a02_模拟与视图分离.md)）。`sim.gd` 不依赖窗口，`main.gd` 只负责画和输入，`run_sim.gd` 可以无头跑完 5 波。这是继续模块化的地基，不是要推翻的东西。

但按 2026-11-04 的实际代码量看：

| 文件 | 行数 | 当前职责 |
| --- | ---: | --- |
| `game/scripts/core/sim.gd` | 473 | 路径、波次、敌人生成/移动、塔索敌/伤害、经济、故障、胜负、评级、信号 |
| `game/scripts/main.gd` | 790 | 输入、绘制、HUD、按钮、结算、提示、存档调用 |
| `game/addons/livebay_tools/plugin.gd` | 1264 | 编辑器 Dock、地图编辑、波次编辑、数值表、预览、历史、bridge 调用 |
| `game/scripts/core/data_loader.gd` | 130 | 一次加载全部 JSON、做最小校验 |
| `game/scripts/autoload/save_store.gd` | 65 | 最高记录与设置，全局单例 |

问题不在「文件有多大」，而在**变化会横穿多少边界**：

- 加一条「旁路降级」规则，要改 `sim.gd` 的敌人、塔、经济、信号，再改 `main.gd` 的面板；
- 改一次「检查单」时机，要把波次、准备时间、UI、结算都碰一遍；
- 编辑器预览直接重建了一套 `PreviewViewport`，和 `main.gd` 的视图逻辑平行生长；
- `DataLoader` 返回一个大字典，模块之间靠「都认识这个字典」协作，而不是靠契约；
- 测试只有一个 `run_sim.gd`，无法单独验证「地图」「经济」「故障」；
- 没有黑匣子：出现「为什么这波漏了」只能复现，不能回放。

所以下一步不是「再加一层抽象」，而是把**变化点**做成模块，把**模块之间**做成标准接口。

### 1.1 当前落地进度（2026-11-05）

| 阶段 | 状态 | 落点 |
| --- | --- | --- |
| M1 内核 | ✅ 已实现 | `kernel/result`、`mission_clock`、`event_bus`、`command_bus`、`platform/black_box`、`application/mission_runtime` |
| M2 Map / Economy | ✅ 已实现 | `domain/map/map_module.gd`、`domain/economy/economy_module.gd`，`Sim` 通过属性代理使用 |
| M3 Wave / Enemy / Tower / Mission / Fault | 🟡 部分 | Wave/Mission/Fault 已拆；Enemy/Tower 仍由 `sim.gd` 承担 |
| M4 ReadModel / Presenter | 🟡 部分 | ReadModel/Presenter 已接 HUD；视图细节仍直接读 Sim |
| M5 MissionPack / schema | 🟡 部分 | `MissionPack` 已生成 manifest/hash 并接入 `DataLoader`；独立编译器未接 |
| M6 黑匣子回放 | 🟡 部分 | 黑匣子已记录事件；回放命令未接 |
| M7 Procedure/Fault 模块 | ⏳ 未开始 | 对应 [14](14_塔防NASApunk深化.md) |

## 二、NASApunk 的工程类比

NASApunk 的模块化不是「把东西拆小」，而是「让系统坏得起、换得动、查得清」。对应到代码：

| NASApunk 概念 | 架构落点 | 在 LiveBay 里是什么 |
| --- | --- | --- |
| ORU（轨道替换单元） | 可替换模块 | 地图、波次、敌人、塔、经济、故障、检查单 |
| 对接接口 | 稳定契约 | `MapPort`、`EnemyPort`、`TowerPort`、`EconomyPort` |
| 数据总线 | 事件总线 | `EnemySpawned`、`TowerFired`、`FaultHit`、`ResultReady` |
| 飞行规则 | 阶段状态机 + 规则数据 | `PREP → WAVE → BETWEEN → REPORT → DEBRIEF` |
| 检查单 | 模块准入 + 任务流程 | 模块上线检查单；第 4/5 波班前检查单 |
| 遥测 / 黑匣子 | 事件日志与回放 | 每个 tick 的序号、命令、事件、哈希 |
| 冗余 / 降级 | 失败隔离与 fallback | 音频/特效可关；核心规则不可静默绕过 |
| 双时钟 | 模拟 tick / 表现帧 / 编辑时间 | 60Hz 固定步长；表现插值；编辑器撤销栈 |
| 配置控制 | 数据包清单与迁移 | `manifest + schema_version + hash` |
| 平铺测试台（flat-sat） | 无头组合根 | 不启动场景即可组装任务并跑 5 波 |

### 2.1 硬接口，软表面

这是本文最重要的一条设计约束：

```text
硬：ID、命令、端口、事件、数据 schema、阶段、tick、失败语义
软：布局、动画、文案、颜色、输入映射、编辑器面板、预览表现
```

「硬接口」让模块能换、能测、能回放；「软表面」让美术、UI、编辑器可以快速试错。**不要把 UI 的柔软性带进规则契约，也不要把规则的刚性带进界面。**

## 三、目标与非目标

### 3.1 目标

1. **可替换**：任何一个领域模块可以在不改其他模块的情况下替换实现（例如把 `Tower` 的索敌从「最前」换成「最高血」）。
2. **可测试**：每个模块有独立契约测试；任务有 golden run；故障可注入。
3. **可降级**：可选模块失败时，任务能进入明确的降级模式；核心模块失败时，启动即失败，不带着坏规则跑。
4. **可观测**：每局有黑匣子，能回答「第 137 tick 为什么漏了」。
5. **可复用**：游戏视图、编辑器预览、未来回放/测试台共用同一套任务组装与读模型。
6. **可迁移**：从现行架构分阶段走，不要求一次性重写，不改变现有 61 项验收的行为。

### 3.2 非目标

- 不做 ECS；塔防实体数量 ≤ 60，ECS 的复杂度不划算。
- 不做微服务/多进程；仍是 Godot 单进程模块化单体。
- 不做完整事件溯源（event sourcing）；只做**事件日志 + 快照**，够回放即可。
- 不做通用插件热插拔；模块在编译期注册，运行期按清单启用/停用。
- 不把 `main.gd` 拆成几十个只有一行的文件；拆到「职责边界」为止。
- 不为了「看起来架构」而引入第三方框架。

## 四、目标架构总览

```text
┌─────────────────────────────────────────────────────────────┐
│ K0 Composition Root / Boot                                  │
│  读取 MissionPack、校验、注册模块、创建 MissionContext       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ MissionOrchestrator（任务编排器）                            │
│  阶段状态机、命令校验、tick 顺序、暂停/倍速、结算            │
└───────┬───────────────┬───────────────┬─────────────────────┘
        │ CommandBus    │ EventBus      │ ReadModel
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌─────────────────────────┐
│ 领域模块       │ │ 领域模块       │ │ 表现适配器               │
│ Map           │ │ Wave          │ │ GameView / HUD          │
│ Enemy         │ │ Tower         │ │ EditorPreview           │
│ Economy       │ │ Mission       │ │ ReplayView              │
│ Fault         │ │ Procedure     │ │ TelemetryOverlay        │
└───────────────┘ └───────────────┘ └─────────────────────────┘
        │               │               │
        └───────────────┴───────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│ 平台适配器：ContentPack / Save / Telemetry / EditorBridge    │
└─────────────────────────────────────────────────────────────┘
```

**控制流**：视图只发命令，不直接改状态；模块只通过端口/事件协作；编排器决定顺序；读模型只读。

**数据流**：`numbers/*.md → 编译器 → MissionPack → 模块`；`MissionPack` 是唯一运行时内容入口。

## 五、模块目录（建议的 ORU 清单）

### 5.1 内核（Kernel）

| ID | 模块 | 职责 | 不做什么 |
| --- | --- | --- | --- |
| K0 | `CompositionRoot` | 启动、组装、注册、生命周期 | 不写玩法规则 |
| K1 | `MissionClock` | 固定 tick、暂停、倍速、模拟时间 | 不画动画 |
| K2 | `EventBus` | 事件信封、序号、订阅、调试追踪 | 不做业务判断 |
| K3 | `CommandBus` | 命令校验、排队、派发、拒绝原因 | 不直接改模块字段 |
| K4 | `Diagnostics` | 黑匣子、计数器、tick 预算、调试 overlay | 不参与胜负 |
| K5 | `MissionPack` | 内容清单、schema 校验、版本、迁移 | 不做运行时规则 |

### 5.2 领域模块（Domain）

| ID | 模块 | 核心状态 | 公开端口 | 主要事件 |
| --- | --- | --- | --- | --- |
| D1 | `MapModule` | 路径点、累计距离、塔位、基地 | `MapPort` | `MapLoaded` |
| D2 | `WaveModule` | 当前波、准备计时、生成队列、清波 | `WavePort` | `WaveStarted`、`WaveCleared` |
| D3 | `EnemyModule` | 敌人列表、血量、距离、状态 | `EnemyPort` | `EnemySpawned`、`EnemyKilled`、`EnemyLeaked` |
| D4 | `TowerModule` | 塔列表、等级、冷却、索敌 | `TowerPort` | `TowerBuilt`、`TowerFired`、`TowerSold` |
| D5 | `EconomyModule` | 供能、收入、维修、花费 | `EconomyPort` | `EnergyChanged` |
| D6 | `MissionModule` | 阶段、保障度、胜负、评级 | `MissionPort` | `PhaseChanged`、`ResultReady` |
| D7 | `FaultModule` | 故障注入、目标、隔离/旁路、降级 | `FaultPort` | `FaultHit`、`FaultResolved` |
| D8 | `ProcedureModule` | 检查单、记录、低报标记 | `ProcedurePort` | `ChecklistRequested`、`ReportSubmitted` |
| D9 | `ModifierModule` | 职业/关卡修正器（可选） | `ModifierPort` | `ModifiersChanged` |

> D9 先保留为「空模块 + 接口」；没有多职业前不要把它做成复杂系统。

### 5.3 表现与适配器

| ID | 模块 | 职责 |
| --- | --- | --- |
| P1 | `MissionReadModel` | 从模块状态生成只读快照（UI 需要的字段） |
| P2 | `MissionPresenter` | 把快照翻译成 HUD/结算/提示所需的显示数据 |
| P3 | `Renderers` | 地图、塔、敌人、光束、特效；只读快照 |
| P4 | `InputController` | 键鼠/触屏 → 命令；不直接改状态 |
| P5 | `Theme/Audio` | 色板、字体、音效；可降级 |
| A1 | `SaveAdapter` | profile / settings / records 分离、原子写、迁移 |
| A2 | `ContentCompiler` | Markdown → MissionPack；校验/哈希 |
| A3 | `EditorBridge` | 编辑器读写 numbers；不复制规则 |
| A4 | `PreviewHarness` | 用真实编排器 + 内存 Pack 跑预览 |

## 六、模块契约

### 6.1 生命周期

每个领域模块实现同一组方法；内核只认这组方法：

```gdscript
class_name MissionModule
extends RefCounted

func configure(ctx: MissionContext) -> Result:
    return Result.ok()

func on_start() -> Result:
    return Result.ok()

func step(tick: Tick) -> void:
    pass

func snapshot() -> Dictionary:
    return {}

func restore(state: Dictionary) -> void:
    pass

func diagnostics() -> Dictionary:
    return {}
```

约束：

- `configure` 只接收 `MissionContext`（端口、事件、时钟、随机流、数据包），不接收别的模块实例。
- `step` 必须是确定性的；不得读 `Time.get_ticks_msec()`、不得用全局随机。
- `snapshot/restore` 用于回放、测试、预览重置；不是存档格式承诺。
- `dispose` 可选；模块不得依赖全局单例。

### 6.2 端口

端口是「插座」，不是「另一个模块」：

```gdscript
# 只读查询
class_name MapPort:
    func path_point(distance: float) -> Vector2: ...
    func path_length() -> float: ...
    func slot_position(slot: int) -> Vector2: ...
    func base_position() -> Vector2: ...

class_name EnemyPort:
    func enemies_in_range(center: Vector2, radius: float) -> Array: ...
    func damage(enemy_id: int, amount: float, source: String) -> void: ...
    func front_enemy() -> Variant: ...

class_name EconomyPort:
    func can_afford(cost: int) -> bool: ...
    func spend(cost: int, reason: String) -> bool: ...
    func earn(amount: int, reason: String) -> void: ...
```

约束：

- `TowerModule` 不得 `preload("res://domain/enemy/enemy_module.gd")`；它只依赖 `EnemyPort`。
- `EnemyModule` 不得认识 `TowerModule`；伤害由端口进入，击杀事件由总线出去。
- 端口由编排器在组装时注入，模块不自己 `new` 别的模块。

### 6.3 命令

所有玩家/编辑器动作都变成命令；命令先校验，再执行：

```gdscript
BuildTower { slot: int, tower_id: String, request_id: int }
UpgradeTower { slot: int, request_id: int }
SellTower { slot: int, request_id: int }
StartWave { request_id: int }
RespondFault { fault_id: int, choice: "isolate" | "bypass", request_id: int }
SubmitChecklist { card_id: String, choice: "sign" | "review" | "custom", request_id: int }
SetPause { paused: bool }
SetSpeed { multiplier: float }
```

- 视图发命令，不读内部字段做「预判」；是否可建造由 `TowerModule` 返回 `Result`。
- 命令带 `request_id`，用于 UI 去重和黑匣子关联。
- 拒绝也要有明确原因：`insufficient_energy`、`slot_occupied`、`wrong_phase`、`max_level`。

### 6.4 事件

事件是「已经发生的事实」，不是「请求别人做事」：

```text
EventEnvelope {
  seq: int,
  tick: int,
  type: StringName,
  source: StringName,
  payload: Dictionary,
  trace_id: int
}
```

首批事件：

| 事件 | 载荷 | 主要消费者 |
| --- | --- | --- |
| `MissionPhaseChanged` | `from/to` | HUD、输入、音频 |
| `WaveStarted` | `index` | HUD、检查单 |
| `EnemySpawned` | `id, enemy_id, distance` | 渲染、黑匣子 |
| `TowerFired` | `from, to, kind, tower_id` | 渲染、音频 |
| `EnemyKilled` | `id, reward` | 经济、HUD、飘字 |
| `EnemyLeaked` | `id, damage` | 任务、HUD、震动 |
| `FaultHit` | `fault_id, slot, targets` | 面板、检查单 |
| `ChecklistRequested` | `card_id, wave` | 面板、暂停 |
| `ResultReady` | `result` | 结算、存档、黑匣子 |

### 6.5 依赖规则

```text
imports(M) ⊆ Kernel ∪ Contracts
sibling_import(Mi, Mj) = false
cycle(modules) = false
```

- 允许：`D4 Tower → EnemyPort`、`D4 Tower → EconomyPort`、`D4 Tower → MapPort`。
- 禁止：`D4 Tower → D3 EnemyModule` 的具体类，或 `D3 → D4` 的反向引用。
- 编排器是唯一知道「谁先 tick」的地方；模块不知道彼此的顺序。

## 七、任务编排与阶段

### 7.1 阶段状态机

```text
BOOT
 → VALIDATE
 → BRIEFING
 → PREP ⇄ CHECKLIST
 → WAVE
 → BETWEEN ⇄ CHECKLIST
 → REPORT
 → DEBRIEF
 → DONE
```

- `PAUSED` / `SPEED` 不是阶段，是 `MissionClock` 的修饰；暂停不改变阶段。
- 检查单打开时暂停 prep 计时（对应 [14](14_塔防NASApunk深化.md)）。
- `REPORT` 阶段只接收记录选择，不推进波次。
- `LOST/WON` 是 `MissionModule` 的结果，不是视图判断。

### 7.2 Tick 顺序

固定顺序，先输入后规则，先移除后生成：

```text
1. CommandBus 清空本 tick 命令
2. WaveModule   推进准备/生成
3. EnemyModule  移动、状态、漏过
4. TowerModule  索敌、开火、伤害（通过 EnemyPort）
5. EconomyModule 收入/维修结算
6. MissionModule 检查胜负/阶段
7. FaultModule  故障命中/降级计时
8. ProcedureModule 检查单/记录
9. 生成 MissionReadModel
10. 发布本 tick 事件摘要
```

> 具体顺序可以调整，但必须**写死在一个地方**，并用 golden run 锁住；不要让模块自己在 `_process` 里互相抢。

### 7.3 两个时钟

| 时钟 | 频率/单位 | 用途 | 禁止 |
| --- | --- | --- | --- |
| 模拟 tick | 60Hz 固定 | 规则、伤害、波次 | 读真实时间 |
| 表现帧 | 渲染帧率 | 插值、动画、粒子 | 改规则 |
| 编辑时间 | 用户操作 | 撤销/重做、预览播放 | 写回规则 |

视图用快照做插值；模拟不等待动画。预览可以用 `sim.step(1/60)` 快进，但不能把预览的暂停状态写回任务。

## 八、数据与内容包

### 8.1 为什么需要 Pack

现在 `DataLoader` 一次读 6 个 JSON，模块共享同一个大字典；加一个字段，所有模块都可能受影响。建议引入**任务包**（MissionPack）作为运行时唯一内容入口：

```json
{
  "schema_version": 1,
  "pack_id": "livebay.bay01",
  "version": "0.1.0",
  "hash": "sha256:...",
  "mission": {
    "map": "maps/bay01.json",
    "waves": "waves/bay01_standard.json",
    "profession": "professions/guard.json",
    "tower_roster": ["interceptor", "pulse", "supply"],
    "modifiers": [],
    "procedures": ["checklist_w4", "checklist_w5", "report_default"]
  }
}
```

- `MissionPack` 由 `ContentCompiler` 从 `numbers/` 生成；编辑器写源表，编译器产出 Pack。
- `schema_version` 与迁移函数绑定；旧 Pack 必须能 `migrate` 或明确拒绝。
- `hash` 用于黑匣子/回放校验：同 seed + 同 pack hash ⇒ 同结果。
- 模块只接收自己需要的子契约（`MapDef`、`WaveDef`），不接收整个 Pack 字典。

### 8.2 内容契约

| 契约 | 字段 | 校验 |
| --- | --- | --- |
| `MapDef` | path、slots、base | ≥2 点、≥1 塔位、路径长度 >0 |
| `WaveDef` | index、prep、groups | 引用敌人存在、count>0、interval>0 |
| `TowerDef` | id、cost、range、damage、fire_rate、kind | 必填、cost>0、kind 枚举 |
| `EnemyDef` | id、hp、speed、reward、leak_damage | 必填、hp>0、speed>0 |
| `ProcedureDef` | card、wave、choices | 选项存在、收益可计算 |

> 沿用 [TECH-A1](rules/tech/a01_单一数据源.md)：Markdown 仍是源，JSON/Pack 是导出物；`numbers-check` 仍是硬门槛。

## 九、故障、冗余与降级

### 9.1 失败分类

| 类型 | 例子 | 策略 |
| --- | --- | --- |
| 启动失败 | Pack 缺字段、地图 <2 点 | **fail fast**，不进入任务 |
| 核心运行失败 | Enemy 状态损坏、塔伤害 NaN | 停止任务，写黑匣子，进入 `LOST/ERROR` |
| 可选模块失败 | 音频设备、粒子、编辑器预览 | 降级/关闭，任务继续 |
| 数据保存失败 | 磁盘满、权限 | 提示，内存记录继续，不崩溃 |
| 视图异常 | 字体缺失、贴图缺失 | 占位/回退，不影响模拟 |

### 9.2 降级模式

```text
DEGRADED_AUDIO   无音频
DEGRADED_FX      无粒子/光束，只保留必要反馈
DEGRADED_PREVIEW 编辑器预览退回轻量视口
READ_ONLY        回放/调试，只读黑匣子
```

- 降级必须显示在状态栏/诊断面板，不能静默。
- 核心规则模块**不允许**「降级运行」；宁可失败，也不带错误规则继续。
- 对应 NASApunk 的「隔离 vs 旁路」：隔离是停掉可选模块，旁路是换轻量实现；两者都要有明确日志。

### 9.3 熔断与预算

- 每个模块有 `tick_budget_ms` 和 `event_budget`；超预算记录 warning，不直接崩。
- 事件总线有环形缓冲；可选消费者（音频/特效）掉帧时丢弃低优先级事件。
- 诊断面板显示：tick p50/p95、事件数、模块耗时、最近错误。

## 十、黑匣子、回放与验收

### 10.1 黑匣子

每局写 `user://blackbox/last_shift.jsonl`（环形，保留最近 N 局）：

```text
{"seq":1,"tick":0,"type":"MissionPhaseChanged","payload":{"to":"PREP"},"hash":"..."}
{"seq":2,"tick":0,"type":"BuildTower","payload":{"slot":2,"tower":"interceptor"},"request_id":1}
{"seq":3,"tick":137,"type":"EnemyLeaked","payload":{"enemy":"hulk","damage":18}}
```

- 记录**命令 + 事件 + Pack hash + seed**，不记录每帧画面。
- 回放 = 同 Pack + 同 seed + 同命令序列；断言最终 result 与 hash 一致。
- 崩溃时保留最后 5 秒；不包含隐私数据。

### 10.2 测试金字塔

| 层 | 数量目标 | 例子 |
| --- | --- | --- |
| 模块单测 | 每模块 3–8 | 经济扣费、塔索敌、路径插值 |
| 契约测试 | 每端口 2–3 | 端口只读、命令拒绝原因 |
| 场景/golden | 3–5 | 标准班 B/40/59、失败班、旁路班 |
| 集成 | 1–2 | 无头组装 + 5 波 |
| 视图 smoke | 2–3 | 启动、结算、编辑器预览 |
| 故障注入 | 3–5 | 数据损坏、模块异常、存档损坏 |

验收命令沿用 [TECH-B2](rules/tech/b02_验收与不回归.md)，新增：

```bash
./run.sh test          # 模块 + golden + 集成
./run.sh numbers-check # Pack 与 numbers 一致
./run.sh check         # 无头启动
./run.sh trace-check   # 黑匣子回放一致（新增）
```

## 十一、视图与编辑器

### 11.1 视图拆分

`main.gd` 建议拆为：

```text
presentation/
  mission_view.gd      # 根节点，只组装
  mission_presenter.gd # 快照 → 显示数据
  map_renderer.gd
  tower_renderer.gd
  enemy_renderer.gd
  effects.gd
  hud.gd
  result_overlay.gd
  input_controller.gd
  theme.gd
```

约束：

- 视图只读 `MissionReadModel`，不读 `sim` 内部字段。
- 视图不做索敌/伤害/波次判断；按钮可用性由 presenter 根据命令校验结果给出。
- 动画/插值属于视图时间，不回写模拟。

### 11.2 编辑器

编辑器不是第二套游戏，而是**另一个适配器**：

```text
EditorPlugin → EditorBridge → ContentCompiler → MissionPack
             → PreviewHarness → MissionOrchestrator → MissionReadModel
```

- 预览使用真实模块与真实编排器；只把数据源换成内存 Pack。
- 地图/波次/数值编辑仍写 `numbers/`，不直接写 `game/data`。
- 预览里的建造/升级/出售发命令，不直接改 `Sim` 字段。
- 这样「编辑器能跑」和「游戏能跑」共享同一套规则，避免两边漂移。

## 十二、建议目录

```text
game/
├── src/
│   ├── kernel/
│   │   ├── composition_root.gd
│   │   ├── mission_clock.gd
│   │   ├── event_bus.gd
│   │   ├── command_bus.gd
│   │   ├── result.gd
│   │   └── diagnostics.gd
│   ├── domain/
│   │   ├── map/
│   │   ├── waves/
│   │   ├── enemies/
│   │   ├── towers/
│   │   ├── economy/
│   │   ├── mission/
│   │   ├── faults/
│   │   └── procedures/
│   ├── application/
│   │   ├── mission_orchestrator.gd
│   │   ├── commands/
│   │   └── read_models/
│   ├── presentation/
│   │   ├── game/
│   │   ├── hud/
│   │   ├── renderers/
│   │   └── theme/
│   ├── content/
│   │   ├── pack_loader.gd
│   │   ├── schema/
│   │   └── migrations/
│   └── platform/
│       ├── save/
│       ├── telemetry/
│       └── editor_bridge/
├── data/                 # 编译产物；不手改
├── tests/
│   ├── unit/
│   ├── contract/
│   ├── golden/
│   ├── fixtures/
│   └── run_all.gd
└── project.godot
```

不必一次搬完；迁移期间可以保留 `scripts/core/sim.gd` 作为适配层，逐步把内部职责搬走。

## 十三、迁移路线（每步可回退）

| 阶段 | 内容 | 预估 | 验收 | 回退 |
| --- | --- | --- | --- | --- |
| M0 | 冻结行为：记录 3 个 golden（标准/失败/旁路占位） | 1 天 | 结果与迁移前 37 项一致 | 无代码变更 |
| M1 | 内核：`Result`、`Tick`、`EventBus`、`CommandBus`、`CompositionRoot`；把现有 `Sim` 包成一个模块 | 2–3 天 | 61/61 + 事件日志 | 开关回旧 `Sim` |
| M2 | 拆 `Map` / `Enemy` / `Economy` | 3–5 天 | 模块单测 + golden 不变 | 旧 `Sim` 保留 |
| M3 | 拆 `Wave` / `Tower` / `Mission` / `Fault` | 3–5 天 | 端口契约 + 故障注入 | 逐步切换 |
| M4 | `ReadModel` + presenter + 视图拆分 | 3–5 天 | 视图 smoke + 截图对比 | 旧 `main` 入口 |
| M5 | `MissionPack` + schema + 编译器 + 编辑器共用 | 3–5 天 | `numbers-check` + Pack 校验 | 旧 DataLoader |
| M6 | 黑匣子 / 回放 / 诊断面板 | 2–3 天 | `trace-check` | 关闭日志 |
| M7 | 把 [14](14_塔防NASApunk深化.md) 的检查单/旁路/记录做成 `Procedure`/`Fault` 模块 | 3–5 天 | 8–10 条新断言 | 功能开关 |

> 总计约 3–4 周（单人、非全职估算）；如果只做 M0–M3，先把规则模块化，也能获得大部分收益。

## 十四、风险与取舍

| 风险 | 表现 | 缓解 |
| --- | --- | --- |
| 过度设计 | 每个模块只有 20 行，接口 100 行 | 以「变化点」拆，不以「文件小」拆 |
| 事件面条 | 一个事件 10 个消费者，顺序不可控 | 事件只描述事实；顺序由编排器固定 |
| 双份状态 | ReadModel 与模块状态不同步 | ReadModel 每 tick 重建；视图不缓存规则 |
| GDScript 动态类型 | 端口传错类型 | 契约测试 + `Result` + 运行时校验 |
| 迁移踩坏 | 旧行为变了 | M0 golden + 每阶段开关 + 61 项回归 |
| 编辑器再次分叉 | 预览又写一套规则 | 预览只走 `MissionOrchestrator`，禁止直接改 Sim |
| 性能 | 事件/快照每 tick 分配 | 对象池、只读快照、预算与 p95 监控 |
| 团队认知负担 | 模块太多 | 先 6 个核心模块；D9/Procedure 后置 |

### 不推荐现在做

- ECS：实体数量小，收益低于迁移成本；
- 完整事件溯源：回放用「命令 + 事件 + 快照」足够；
- 运行时插件热插拔：编辑器插件 ≠ 游戏模块；
- 把 `numbers/` 改成数据库：Markdown 的可读性是当前优势；
- 微服务/多进程：单机塔防不需要。

## 十五、需要人类拍板的问题

> 以下是**建议**，不是决定。人类可以只采纳其中一部分。

| ID | 问题 | 选项 | AI 建议 | 代价 |
| --- | --- | --- | --- | --- |
| D19-A | 模块粒度 | A 6 个粗模块 / B 9 个领域模块 / C 3 个大层 | **B**，但 D9 先留空 | 模块多，测试也多 |
| D19-B | 模块通信 | A 直接引用 / B 内核事件总线 / C 每个模块自定义信号 | **B**，事件带信封 | 需要纪律，否则事件面条 |
| D19-C | 数据入口 | A 继续多 JSON / B MissionPack + schema / C 数据库 | **B**，保留 Markdown 源 | 编译器与迁移成本 |
| D19-D | 视图 | A 继续 `main.gd` / B ReadModel + presenter / C 多场景 | **B**，先拆 HUD/渲染 | 中短期 UI 改动变慢 |
| D19-E | 编辑器 | A 独立预览 / B 共用编排器 | **B**，长期避免规则漂移 | 需要 PreviewHarness |
| D19-F | 黑匣子 | A 不做 / B 最近 10 局 / C 全量 | **B** | 存储与隐私边界 |

建议先只拍 **D19-A/B/C**：模块粒度、通信方式、数据入口。这三项决定其余设计。

## 十六、模块准入检查单（Pre-flight Checklist）

每个新模块/大改，上线前逐项打勾：

- [ ] 单一职责：能用一句话说清；没有「顺便」。
- [ ] 公开契约：端口/命令/事件有文档；没有让别的模块读内部字段。
- [ ] 依赖合法：只依赖 Kernel/Contracts；没有 sibling import。
- [ ] 可测试：有独立单测；不启动场景即可跑。
- [ ] 可快照：`snapshot/restore` 可复现。
- [ ] 可诊断：有 `diagnostics()` 与关键计数器。
- [ ] 有预算：tick/事件/内存有上限；超限有日志。
- [ ] 可降级/可关闭：可选模块能关；核心失败有明确错误。
- [ ] 数据契约：schema 版本、校验、迁移。
- [ ] 有回退：开关/旧实现/提交回滚。
- [ ] 文档：更新 `12`/`16`/模块 README。
- [ ] 验收：`test`、`numbers-check`、`check` 全过。

## 十七、与现有文档的关系

- [12](12_技术方案_Godot工程.md) 是**现行**工程事实；本文是**下一阶段参考**，不替代 12。
- [14](14_塔防NASApunk深化.md) 的检查单/降级/记录，是本文 `FaultModule` 与 `ProcedureModule` 的第一批真实需求；先有机制，再有模块。
- [15](15_专用游戏编辑器方案.md) 的编辑器，是本文 `PreviewHarness` + `EditorBridge` 的第一个适配器；不应再复制规则。
- [TECH-A1](rules/tech/a01_单一数据源.md) 仍是数据主权；MissionPack 只是导出物的组织方式，不是新源。
- [TECH-A2](rules/tech/a02_模拟与视图分离.md) 仍是底线；本文只是把「模拟」内部再分舱。

## 十八、一句话总结

> 不是把 LiveBay 做成 NASA 的软件，而是让它在**坏一半的时候还能飞**：  
> 模块能换，接口不飘，故障能隔离，黑匣子能回放，编辑器不再另造一套规则。

（本篇完）
