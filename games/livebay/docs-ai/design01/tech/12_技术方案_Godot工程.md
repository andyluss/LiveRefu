---
title: "12 · 技术方案：Godot 工程"
doc_type: "工程参考（非设计决定）"
status: "现行 v0.4（App + Router + Pages；v0.2 内容已落地）"
date: "2026-11-07"
source: "AI 起草，人类确认"
authority: "人类（范围）/ 工程（实现）"
rules:
  - "TECH-A1"
  - "TECH-A2"
  - "TECH-B1"
  - "TECH-B2"
upstream:
  - "../../../docs-human/概念设定.md"
related:
  - "04_塔防玩法.md"
  - "../../game/"
  - "11_待人类裁决清单.md"
---

# 12 · 技术方案：Godot 工程

> 本文说明工程「做到哪、怎么跑、怎么验收、怎么扩展」。**所有数值与名词都是占位**，人类改设定时只改 `data/*.json`，不改代码。

## 一、目标与非目标

### 1.1 当前目标（v0.2 切片）

在 Godot 4.7 上跑通一个**可玩、可验证、可扩展**的垂直切片：

- 3 张地图：外环 / 中环 / 湾口，各 8 波；
- 1 个示例职业；6 种塔、7 种敌人（含故障/护盾/分裂）；
- 3 份班次合同、12 张检查单/故障卡、3 名湾民、3 段音乐；
- 建造、升级、出售、加速、暂停、检查单、故障处置、档案、接班；
- 胜负、评级、存档、黑匣子回放；
- 无头测试 103 项，`./run.sh verify` 12 项全量验收。

> v0.1 的“1 图 / 5 波 / 3 塔 / 4 敌”仅作为历史基线保留，不再是当前事实。

### 1.2 非目标

- 不做正式美术、音频、动画；
- 不做移动端适配、手柄、本地化；
- 不做多职业、多地图、剧情；
- 不做联网、排行榜、内购；
- 不做复杂寻路、随机地图。

## 二、环境与运行

| 项 | 值 |
| --- | --- |
| 引擎 | Godot 4.7 stable |
| 渲染 | GL Compatibility |
| 分辨率 | 1280×720，`canvas_items` 拉伸 |
| 语言 | GDScript |
| 数据 | JSON（`game/data/`） |
| 用户数据 | `user://save.json`（HOME 指向 `games/.godot-home/`） |

命令（在 `games/livebay/` 下）：

```bash
./run.sh          # 启动 App → 主页
./run.sh game     # 直接进入游戏页，跳过主页（测试用）
./run.sh editor   # 打开编辑器
./run.sh test     # 无头模拟测试（103 项）
./run.sh verify   # 一键全量验收
./run.sh check    # 无头启动 180 帧，抓脚本错误
./run.sh perf     # 性能基线
```

## 三、目录结构

```text
game/
├── project.godot
├── scenes/
│   ├── app.tscn               # App 路由器（主页/实验/游戏）
│   └── main.tscn              # GamePage（游戏页）
├── scripts/
│   ├── app.gd                 # 页面路由
│   ├── main.gd                # GamePage 入口：连线/每帧/绘制
│   ├── presentation/
│   │   ├── home_page.gd       # 独立主页
│   │   ├── lab_page.gd        # 独立自由模式页
│   │   ├── game_hud.gd        # HUD
│   │   ├── game_flow_controller.gd
│   │   ├── game_command_controller.gd
│   │   ├── game_feedback.gd
│   │   ├── game_ui_presenter.gd
│   │   └── page_ui.gd
│   ├── lab/
│   │   └── lab_loader.gd      # 实验 JSON / 覆盖 / 候选
│   ├── core/
│   │   ├── data_loader.gd
│   │   └── sim.gd
│   └── autoload/
│       └── save_store.gd
├── data/
│   ├── lab/scenarios/         # 自由模式实验（不写主线）
│   ├── mission_pack.json      # schema 2 地图目录
│   ├── towers.json / enemies.json
│   ├── waves*.json / map_bay*.json
│   └── balance.json
├── tests/
│   └── run_sim.gd
└── run.sh
```

## 四、架构：模拟与视图分离

```text
App (scenes/app.tscn)
├── HomePage       主菜单：主线 / 自由模式
├── LabPage        标签筛选 / 候选 / 导出 / 导入
└── GamePage       游戏页（scenes/main.tscn）
        │
        ├── SessionController   数据/运行时生命周期
        ├── CommandController   按钮/输入 → Runtime
        ├── FeedbackController  信号 → 音效/音乐/toast/结算
        ├── UiPresenter         ReadModel → HUD
        ├── FlowController      地图/档案/简报/检查单/故障/结算
        └── HUD                 CanvasLayer
                │
                ↓
        MissionRuntime + Sim（纯逻辑、固定步长）
```

**为什么分离**：

- 无头测试可以直接跑 Sim，不需要窗口；
- 未来换 2D/2.5D 表现，逻辑不变；
- 数值调整只改 JSON；
- 职业/关卡扩展只加数据。

### 4.1 Sim 的职责

- 路径推进、距离计算；
- 敌人生成、受伤、死亡、漏过；故障反向移动与停塔；
- 塔的索敌、冷却、伤害、减速；
- 资源、波次、胜负；
- 发送信号给视图。

### 4.2 main.gd（GamePage）的职责

- 作为游戏页入口：创建 Session/Command/Feedback/UI/Flow/HUD；
- 每帧驱动 Runtime；
- 转交输入；
- `_draw()` 绘制入口；
- 不再直接处理建造/开波/切图/结算等业务命令。

### 4.3 App 与页面

- `app.tscn` 是项目主场景；
- 页面切换使用 add/queue_free，不使用 overlay 模拟页面；
- `HomePage` 不依赖 HUD；
- `LabPage` 读取 `game/data/lab/scenarios`，选择实验后进入 GamePage(lab)；
- `./run.sh game` 直接加载 `main.tscn`，跳过 App，便于测试；
- `F1` 从游戏页回主页；`Q` 退出确认。

### 4.4 自由模式边界

- 复用同一套 Sim/Data + 白名单覆盖；
- 实验使用独立运行时与空 ShiftMemory，不写主线存档；
- 候选写入 `user://lab/candidates/`，实验导出到 `user://lab/exports/`；
- 不支持脚本/MOD/在线分享；
- 真正的非塔防玩法需要 Mode Adapter，见 `lab/00_自由模式方案.md` 第十三节。

## 五、数据契约

### 5.1 `profession_guard.json`

```json
{
  "id": "guard",
  "name": "护湾卫兵",
  "ring": "outer",
  "description": "外环第七段的当班卫兵。",
  "start_energy": 90,
  "start_integrity": 100,
  "tower_cost_mult": 1.0
}
```

### 5.2 `towers.json`

```json
[
  {
    "id": "interceptor",
    "name": "拦截炮",
    "cost": 30,
    "range": 120,
    "damage": 10,
    "fire_rate": 1.2,
    "kind": "single",
    "color": "#D9622B",
    "description": "单体，优先最前的敌人。"
  }
]
```

`kind` 支持：`single`（单体）、`aoe`（范围 + 减速）、`supply`（产出/维修）。

### 5.3 `enemies.json`

```json
[
  {
    "id": "debris",
    "name": "碎片",
    "hp": 30,
    "speed": 45,
    "reward": 6,
    "leak_damage": 8,
    "radius": 9,
    "shape": "triangle",
    "color": "#8C4A32"
  },
  {
    "id": "fault",
    "name": "故障",
    "hp": 36,
    "speed": 58,
    "reward": 4,
    "leak_damage": 0,
    "radius": 8,
    "shape": "square",
    "color": "#3E6F6B",
    "behavior": "reverse",
    "disable_duration": 2.5,
    "disable_radius": 100,
    "disable_targets": 2
  }
]
```

`behavior` 默认 `forward`；`reverse` 表示从路径终点反向移动。`disable_duration` / `disable_radius` / `disable_targets` 只对反向故障生效：经过塔位时让该塔离线，最多影响 `disable_targets` 座塔。

### 5.4 `waves.json`

```json
[
  {
    "index": 1,
    "prep": 30.0,
    "groups": [
      { "enemy": "debris", "count": 6, "interval": 0.9, "delay": 0.0 }
    ]
  }
]
```

### 5.5 `map_bay01.json`

```json
{
  "id": "bay01",
  "name": "外环第七段",
  "path": [[-60, 540], [110, 505]],
  "slots": [[260, 590], [390, 530]],
  "base": { "pos": [1180, 505], "radius": 26 }
}
```

### 5.6 `balance.json`

```json
{
  "starting_energy": 90,
  "starting_integrity": 100,
  "sell_refund": 0.7,
  "max_tower_level": 3,
  "upgrade_cost_factor": 0.8,
  "upgrade_damage_factor": 0.25,
  "upgrade_range_factor": 0.05,
  "upgrade_income_factor": 0.5,
  "upgrade_repair_factor": 0.5,
  "prepare_time": 30.0,
  "between_wave_time": 20.0,
  "grade_s_ratio": 0.9,
  "grade_a_ratio": 0.7,
  "grade_b_ratio": 0.4
}
```

## 六、Sim 的关键规则

| 规则 | 实现 |
| --- | --- |
| 固定步长 | `step(dt)` 内按 1/60 切片，最多 8 片/帧 |
| 敌人移动 | 沿折线累计距离，按 `speed * dt` 推进 |
| 索敌 | 射程内「距基地最近」的敌人 |
| 伤害 | 即时结算；视图播放 0.08s 光束 |
| 减速 | 取最强的一次，不叠乘 |
| 供给 | 每 `income_interval` 秒 +`income × (1 + upgrade_income_factor × (level-1))` 供能 |
| 波次 | 准备 → 生成 → 清空 → 波间 → 下一波；`prep` 读波次表，缺省用 balance |
| 漏过 | 抵达终点扣 `leak_damage`，扣完判负 |
| 胜利 | 最后一波清空且保障度 > 0 |

## 七、测试

`tests/run_sim.gd` 是 SceneTree 脚本，不依赖窗口，当前 73 项断言：

1. **数据完整性**：6 个 JSON 可读；塔/敌人/波次引用存在；路径 ≥ 2 点；塔位 ≥ 1；评级阈值、波次 `prep` 数据驱动。
2. **胜利路径**：在 2 个塔位建塔，跑完 5 波，断言 `WON` 且保障度 > 0。
3. **失败路径**：不建塔，跑完 5 波，断言 `LOST`。
4. **经济**：建塔扣费；出售返还 70%。
5. **升级**：升级后伤害提高、费用扣除；补给塔升级后产出/维修提高。
6. **故障**：反向移动、停塔、逃逸不扣保障度。

运行：

```bash
./run.sh test
```

期望输出：每条 `PASS`，最后 `ALL TESTS PASSED`，退出码 0。

## 八、存档

- 路径：`user://save.json`；
- 内容：最高评级、最高保障度、通关次数、设置（速度/静音）；
- 写入时机：结算、退出；
- 损坏处理：解析失败则重置，不崩溃；
- 不存「不可恢复的进度」：第一版没有剧情锁。

## 九、扩展点

| 想加 | 改哪里 | 是否改代码 |
| --- | --- | --- |
| 新塔 | `towers.json` | 否 |
| 新敌人 | `enemies.json` | 否 |
| 新波次 | `waves.json` | 否 |
| 新地图 | 新 `map_*.json` + 选关 | 少量 |
| 新职业 | 新 `profession_*.json` + 塔/敌人映射 | 少量 |
| 新玩法 | 新场景 + 共享 SaveStore | 是 |
| 新语言 | 文本表 | 是（第一版不做） |

## 十、已知限制

- 敌人不寻路、不绕行；
- 没有元素/护甲/暴击等深度系统；
- 没有对象池，敌人数量大时可能卡（第一版 ≤ 60）；
- 视图与 Sim 用信号解耦，但 Sim 仍直接读数据字典；
- 中文依赖系统字体回退，未内置字体；
- 内部故障只实现「反向移动 + 经过塔位停塔」，没有故障链扩散、维修小游戏或永久损坏；这些留到后续版本。

## 十一、待裁决

- D14 平台：PC / 移动 / 双端（影响输入与性能）
- D18 语言：中文 / 中英（影响文本表）

> D16 已裁决为垂直切片；D02/D05/D04 已裁决。内部故障（C）已实现，下一步是 v0.2 护理师。

## 十二、模块化落地状态

截至 2026-11-07，App/Router/Pages 已落地，M1/M2 已落地：`MissionRuntime` 组合 `MissionClock`、`EventBus`、`CommandBus`、`BlackBox` 与 `Sim`；`Sim` 内部已使用 `MapModule` 与 `EconomyModule`（属性代理，行为不变）。M3–M7 仍按 [16](16_模块化技术架构_NASApunk.md) 推进。

## 十三、模块化演进参考

当前已是「MissionRuntime + 领域模块 + ReadModel/Presenter/Renderer + MissionPack」结构，仍在继续拆 Sim 的索敌/移动编排。若要继续拆分，见 [16 · 模块化技术架构](16_模块化技术架构_NASApunk.md)：ORU 模块、端口、命令/事件总线、MissionPack、黑匣子与迁移路线。该文是参考方案，未裁决、未实现，不改变本篇的现行事实。

（本篇完）
