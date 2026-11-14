# LiveBay · game（Godot 工程）

> 《逍遥湾》岗位塔防的 Godot 4.7 工程。主场景是 App 路由器；游戏页、自由模式页与主模式分开。
>
> 面向工程：怎么跑、代码在哪、数据怎么流、怎么验证、怎么扩展。**策划设定不在这里**：见 [`../docs-ai/design01/README.md`](../docs-ai/design01/README.md)。

## 一、快速运行

在 `games/livebay/` 下：

```bash
./run.sh              # App → 主页
./run.sh game         # 直接进入游戏页（跳过主页）
./run.sh editor       # 打开 Godot 编辑器
./run.sh import       # 首次导入资源
./run.sh test         # 无头模拟测试（103 项）
./run.sh check        # 无头启动 180 帧
./run.sh verify       # 全量验收（14 项，含 game02）
```

首次运行前如未导入资源，先执行 `./run.sh import`。`HOME` 会自动指向 `games/.godot-home/`，不写用户目录。

## 二、页面结构

```text
scenes/app.tscn          App 路由器
├── HomePage            独立主页（scripts/presentation/home_page.gd）
├── LabPage             自由模式浏览（scripts/lab/lab_page.gd）
├── GamePage            主模式（scenes/main.tscn / scripts/main.gd）
└── LabGamePage         自由模式游戏（scenes/lab_game.tscn / scripts/lab/lab_game.gd）
```

- 页面切换使用 add/queue_free，不是 overlay；
- `./run.sh game` 直接加载 `main.tscn`，用于测试；
- 主模式不包含 lab HUD/会话/候选代码；
- 自由模式有自己的 `LabGame` + `LabHud`，共享 Sim/Data/Renderer/Audio。

## 三、目录

```text
game/
├── project.godot
├── scenes/              app / main / lab_game
├── scripts/
│   ├── app.gd           页面路由
│   ├── main.gd          主模式入口（连线/每帧/绘制）
│   ├── core/            DataLoader / Sim
│   ├── application/     MissionRuntime / ReadModel / ShiftMemory
│   ├── kernel/          Clock / EventBus / CommandBus / Result
│   ├── domain/          Map / Economy / Wave / Tower / Enemy / Fault / Procedure
│   ├── presentation/    HUD / 命令 / 流程 / 呈现 / 音频 / 渲染
│   ├── lab/             自由模式（LabPage / LabGame / LabHud / LabLoader / Survival）
│   ├── expansion/       manifest / registry / preset / feature flags
│   ├── content/         MissionPack
│   └── platform/        BlackBox / ShiftStore
├── data/                塔/敌/波/地图/合同/检查单/湾民/任务包/lab 场景
├── addons/livebay_tools 编辑器插件（地图/塔位/波次）
├── demo/                程序化演示场景
└── tests/               无头测试/回放/性能/扩展/编辑器桥
```

## 四、运行时

```text
DataLoader
  → MissionPack / data
  → MissionRuntime
      ├── MissionClock
      ├── EventBus / CommandBus
      ├── Sim（固定步长）
      └── BlackBox
  → ReadModel
  → Presenter
  → HUD / Renderer
```

- `Sim` 不依赖渲染；HUD 只读 ReadModel；
- 规则改动优先改 `data/*.json` 与 `numbers/`，不要直接改生成物；
- 主模式与自由模式共享 Sim/Data，但页面、HUD、输入、会话分离。

## 五、数据流

```text
docs-ai/design01/numbers/*.md
  → tools/export_numbers.py
  → game/data/*.json
  → tools/export_mission_pack.py
  → game/data/mission_pack.json
```

- `mission_pack.json` 是生成物，不要手改；
- 校验：

```bash
./run.sh numbers-check
./run.sh pack-check
```

- 扩展包在 `game/expansions/*/pack.json`；校验：

```bash
./run.sh expansions-check
```

## 六、验证

| 命令 | 内容 |
| --- | --- |
| `./run.sh test` | 103 项无头模拟断言 |
| `./run.sh check` | 180 帧无头启动，抓脚本错误 |
| `./run.sh editor-test` | 编辑器数据桥冒烟 |
| `./run.sh playtest` | 三张地图无头试玩 |
| `./run.sh replay` | 黑匣子回放最近一局 |
| `./run.sh perf` | 性能基线 |
| `./run.sh compare` | L1 A/B/C 对比 |
| `./run.sh verify` | 全量 14 项 |
| `./run.sh game02-test` | 独立生存原型（game02） |

## 七、存档与路径

| 路径 | 内容 |
| --- | --- |
| `user://save.json` | 最高记录/设置（`HOME=games/.godot-home/`） |
| `user://lab/candidates/` | 自由模式候选 diff |
| `user://lab/exports/` | 自由模式导出实验 |
| `user://blackbox/` | 黑匣子记录（按实现） |

自由模式不写主线存档；主线与实验的存档边界保持分离。

## 八、扩展点

| 想改 | 去哪 |
| --- | --- |
| 塔/敌/波/地图数值 | `data/*.json`，经 numbers 导出 |
| 新地图/波次 | `data/map_*.json` + `waves_*.json` + MissionPack |
| 新检查单/故障 | `data/procedures.json` + Domain |
| 新扩展包 | `expansions/<id>/pack.json` + `data/expansion_sets/` |
| 新自由模式实验 | `data/lab/scenarios/*.json` |
| HUD/页面 | `presentation/` / `app.gd` |
| 自由模式玩法 | `lab/`（独立于主模式） |

## 九、工程约束

- **TECH-A2**：模拟与视图分离；渲染不写规则；
- **TECH-A1 / 单一数据源**：数值从 numbers 导出，不手改生成物；
- **TECH-B2**：改动跑对应验收；不静默绕过失败；
- 主模式不得重新引入 lab 页面/HUD/会话代码；
- 任何新页面先走 App 路由，不用 overlay 模拟页面。

## 十、常见问题

- **启动黑屏/缺资源**：先 `./run.sh import`；
- **脚本错误**：`./run.sh check` 抓启动错误；
- **数字不一致**：`./run.sh numbers-check` / `pack-check`；
- **扩展包/变体冲突**：`./run.sh expansions-check`；
- **自由模式实验失败**：看 `./run.sh survival-test` 与 LabLoader 校验；
- **编辑器插件**：见 [`addons/livebay_tools/README.md`](addons/livebay_tools/README.md)。

## 十一、文档

- [项目总览](../README.md)
- [技术方案](../docs-ai/design01/tech/12_技术方案_Godot工程.md)
- [玩法目录](../docs-ai/design01/gameplay/README.md)
- [自由模式方案](../docs-ai/design01/lab/00_自由模式方案.md)
- [HUB](../briefing/HUB.html) · [GUIDE](../briefing/GUIDE.html)
- [变更日志](../CHANGELOG.md)
