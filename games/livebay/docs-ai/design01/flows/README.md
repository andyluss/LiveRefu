# flows · LiveBay 一局的静态流程图

> **一句话**：把 LiveBay 的动态操作流程压缩成稳定的状态、命令、事件和迁移；图由 `tools/build_flow.py` 生成，不手画。
>
> **不是**策划源，也不是规则权威；状态/命令/事件的真实来源是 `game/scripts/`。

## 一、这里有什么

```text
flows/
├── README.md        # 方法与维护说明（本文件）
├── game_flow.md     # 生成物：Mermaid 状态图 + 迁移表
├── game_flow.html   # 生成物：自包含 HTML 流程图 + 方法卡片
├── player_flow.*    # 玩家操作流程
├── wave_flow.*      # 波次生命周期
├── l1_flow.*        # L1 检查单/故障/记录
├── data_flow.*      # 数据到 MissionPack
├── extra_flows.html # 四张补充图的总览
└── (生成器)         # ../../../tools/build_flow.py + build_extra_flows.py
```

| 文件 | 谁维护 | 怎么产生 |
| --- | --- | --- |
| `game_flow.md` | 生成器 | `python3 tools/build_flow.py` |
| `game_flow.html` | 生成器 | 同上 |
| `player_flow.*` / `wave_flow.*` / `l1_flow.*` / `data_flow.*` | 生成器 | `python3 tools/build_extra_flows.py` |
| `extra_flows.html` | 生成器 | 同上，四图总览 |
| `README.md` | 人 | 手写方法说明 |

## 二、为什么要做静态流程图

动态流程是“每一帧都在变”的：建造、开波、敌人移动、塔开火、故障、检查单、结算。逐帧记录没有阅读价值；我们真正需要的是：

- 玩家在哪些**稳定状态**里做决定？
- 什么命令/事件能让状态改变？
- 哪些是玩家操作，哪些是系统自动发生？
- 哪些是等待态（检查单、故障选择），哪些是结束态？
- 哪些边是主循环，哪些是失败/重试/退出？

静态流程图回答的是**可验证的结构**，不是复刻每一秒的动画。

## 三、抽取四类元素

### 3.1 状态

状态必须“可停留”。LiveBay 的核心状态来自 `Sim.State`：

```text
PREP / WAVE / BETWEEN / WON / LOST
```

此外有两个**运行时等待态**，它们不是 `Sim.State` 的枚举值，而是流程上的暂停点：

```text
CHECKLIST  # 检查单等待
FAULT      # W5 故障选择等待
```

把它们画出来很重要，否则图会误以为系统一直在跑。

### 3.2 命令

玩家能主动发起：

- `build_tower` / `upgrade_tower` / `sell_tower`；
- `start_wave`；
- `set_pause` / `set_speed`；
- `submit_checklist`；
- `submit_fault_choice`；
- `submit_report`；
- `reset`。

命令是图上的**动作边**；不是每条命令都改变核心状态（暂停/倍速只改时钟）。

### 3.3 事件

系统自动产生：

- `WaveStarted` / `WaveCleared`；
- `ChecklistRequested` / `ChecklistResolved`；
- `FaultChoiceRequested` / `FaultResolved`；
- `ResultReady`；
- `MissionStarted` / `MissionReset`。

事件是**系统边**，通常不需要玩家点击。

### 3.4 守卫条件

每条边都要能回答“为什么能走”：

- `state == PREP`；
- `state == BETWEEN`；
- `wave_index == 4`；
- `fault_choice_pending`；
- `integrity == 0`；
- `last_wave_cleared`。

没有守卫条件的图只是故事梗概，不能用于实现或测试。

## 四、把动态流程静态化

### 4.1 按稳定状态截断

不记录每一秒，只记录状态改变：

```text
PREP --start_wave--> WAVE
WAVE --all_cleared--> BETWEEN
BETWEEN --start_wave--> WAVE
WAVE --integrity_zero--> LOST
WAVE --last_wave_cleared--> WON
```

这是最小状态机。

### 4.2 把循环折叠成回边

“建造→开波→整备→再开波”会重复多次。静态图不画五遍，只画一条回边，再标注“最多 5 波”：

```text
BETWEEN --start_wave--> WAVE
WAVE --cleared--> BETWEEN
```

### 4.3 把时间和随机性放到边上

- 超时：`timer <= 0 → auto_start`；
- 概率：`random < p → branch A / branch B`；
- 并行：`wave_spawn` 与 `tower_update` 是并行活动，不要强行串行。

### 4.4 用真实日志反推

最有效的办法不是手画，而是从黑匣子/事件日志生成。LiveBay 已有：

- `EventBus`；
- `CommandBus`；
- `BlackBox`；
- `./run.sh replay`。

把日志中的 `state_before → event/command → state_after` 聚合，就能得到真实迁移表；再用覆盖检查确认每条边都被走过。

## 五、生成与校验

```bash
cd games/livebay
python3 tools/build_flow.py           # 生成 game_flow.md / game_flow.html
python3 tools/build_extra_flows.py    # 生成四张补充图 / extra_flows.html
python3 tools/build_flow.py --check   # 只校验总图
python3 tools/build_extra_flows.py --check # 只校验补充图
```

生成器会：

1. 从 `sim.gd` 读 `State` 枚举；
2. 从 `mission_runtime.gd` 读命令与事件；
3. 用维护在生成器里的**迁移表**生成 Mermaid 与 SVG；
4. 检查迁移表引用的状态/命令是否存在；
5. `--check` 发现页面过期直接失败。

> 迁移表是“人写的模型”，状态/命令/事件是“代码事实”。模型可以变，但必须能通过生成器校验，不能凭空写一个不存在的命令。

## 六、怎么读图

- **实线**：核心状态迁移；
- **虚线**：等待态/覆盖态（检查单、故障选择）；
- **菱形/注释边**：守卫条件；
- **回边**：循环，不代表重复画五次；
- **WON/LOST**：结束态，但仍可通过 `reset` 回到 PREP。

建议先看 `game_flow.html` 的总图，再读 `game_flow.md` 的迁移表；表比图更适合查守卫条件。

## 七、常见错误

- 把每一帧画成节点：图会爆炸；
- 只画成功路径：失败、重试、退出才是流程关键；
- 把 UI 弹窗当状态：弹窗是表现，等待玩家选择才是状态；
- 不写守卫条件：图看起来对，但无法实现；
- 循环画成五条平行线：应该用回边 + 终止条件；
- 图和代码各维护一份：应从状态/命令/事件生成，至少用 `--check` 校验。

## 八、边界

- 流程图只表达**结构**，不表达数值平衡、动画、手感；
- 检查单/故障等待态是流程层概念，不是 `Sim.State` 的枚举值；
- 回合/波次的具体内容由数据表决定，流程图不复制波次数据；
- 变更状态/命令/事件后必须重跑 `build_flow.py`。

## 九、相关入口

- 工程结构：[`../tech/12_技术方案_Godot工程.md`](../tech/12_技术方案_Godot工程.md)
- 扩展架构：[`../tech/17_可插拔扩展架构.md`](../tech/17_可插拔扩展架构.md)
- 地图/波次：[`../numbers/05_地图与塔位.md`](../numbers/05_地图与塔位.md)
- 流程图生成器：`../../../tools/build_flow.py` / `../../../tools/build_extra_flows.py`
