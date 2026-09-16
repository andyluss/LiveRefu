# Refu Game 001 · 节点防线（可运行工程）

> 卡面：用途＝项目入口 ｜ 依赖：[`doc/refu-game-001/`](../../doc/refu-game-001/README.md) 策划卷 ｜ 状态：M1 垂直切片可玩 · 2026-09-16
> 一句话：把策划卷的"卡片即规则"落成一个**真能玩、能验收**的 Godot 4.7 竖屏塔防——铁砧联邦 12 卡 + 峡谷哨站 6 波 + 挑战卡 + 评级结算。

| 我要…… | 去哪 |
| --- | --- |
| 立刻玩一局 | [`game/`](game/) 用 Godot 4.7 打开，或跑 `game/run.sh run` |
| 看它算得对不对 | `game/run.sh check`（无头验收 19 项，见 [验收文档](docs/05_验收与测试.md)） |
| **看完整流程** | [`docs/video/demo_gameplay.mp4`](docs/video/demo_gameplay.mp4)（92 秒一镜到底，含分镜字幕） |
| 看界面长什么样 | [docs/shots/](docs/shots/)（6 张真实运行截图） |
| 改数值 / 加卡 | [数据表与校验](docs/03_数据表与校验.md)（改 `game/data/*.json`，有脚本对账策划文档） |
| 知道哪些地方是我拍的板 | [实现裁决记录](docs/01_实现裁决记录.md)（15 条） |
| 知道实测踩了什么坑 | [调参与实测发现](docs/04_调参与实测发现.md)（7 条，含 2 条文档冲突） |

## 一、这一版做了什么（M1 范围）

- **一局的完整闭环**：主菜单 → 关卡/挑战卡 → 卡组编辑 → 布防 → 6 波交战 → 结算评级 → 再来一局；
- **全卡系统**：槽位（标准/支援/路径/修饰）、费用与能量、修饰卡挂载与叠层、技能卡施放、羁绊、
  事件钩子（on_kill / on_hit / on_deploy / on_wave_start / on_wave_end / on_destroy / on_expire / on_cast / on_attach）、
  人口上限、路径阻挡、对空规则、腐蚀/减速/护盾状态、回收返还；
- **内容**：铁砧联邦 12 卡（含齿轮帮支援 3 张）、敌方 6 原型、地图卡 MAP-ANV-01 峡谷哨站、
  波次卡组 WAV-ANV-A（B=158 = B_ref）、规则卡 RUL-BASE、挑战卡 5 张（含双入口白名单拦截）；
- **表现**：直接复用策划卷出的美术（36 卡面 / 6 地图 / 10 单位设定 PNG），战场用地图卡做底板 +
  程序化绘制塔/敌/弹道/血条/射程；界面全中文（运行时加载系统中文字体，仓库不塞字体二进制）。

## 二、没做什么（诚实清单）

- 涌潮虫群 / 星辉议会的 24 张卡、其余 5 张地图、第 2–5 章、事件卡、进化枝、共鸣计数、
  Roguelike 远征、异步 PvP、编辑器与 UGC —— 全部**未实现**（数据结构已预留，见 [里程碑](docs/00_实现范围与里程碑.md)）；
- 音效 / BGM / 粒子特效 / 正式 UI 美术——M1 只做"能读、能点、能玩"；
- 战场单位与塔用的是程序化绘制的几何体（美术出图里没有战斗 sprite 图集），卡面与地图用真出图。

## 三、目录结构

```
projects/refu-game-001/
├── README.md            # 本文件
├── CHANGELOG.md         # 项目日志（对外视角）
├── docs/                # 设计与验收文档
│   ├── 00_实现范围与里程碑.md
│   ├── 01_实现裁决记录.md      # ★ 文档没说清、我拍的板（含理由与代价）
│   ├── 02_工程结构与运行.md
│   ├── 03_数据表与校验.md      # ★ 数据怎么从策划文档进到引擎
│   ├── 04_调参与实测发现.md    # ★ 实测踩到的坑与给策划的建议
│   ├── 05_验收与测试.md
│   ├── shots/           # 真实运行截图（6 张）
│   └── video/           # ★ 完整流程演示录像（92 秒，含录制脚本说明）
├── game/                # ★ Godot 4.7 工程
│   ├── project.godot
│   ├── run.sh           # 统一入口：run / editor / check / import / shot
│   ├── assets/          # 从 doc/ 美术出图同步来的 PNG（cards/maps/units）
│   ├── data/            # ★ 数据表（JSON）：cards/enemies/maps/waves/challenges/rules/balance
│   ├── scripts/
│   │   ├── autoload/    # GameData（数据装载）/ AppState（选择与进度）/ UiFont（中文字体）
│   │   ├── core/        # ★ 纯逻辑：battle / enemy_unit / tower_unit / blocker_unit / projectile / path_geom / deck
│   │   ├── view/        # 表现层：battle_view / card_view / ui_kit
│   │   ├── app/         # 场景控制：main_boot / main_menu / level_select / deck_builder / codex / battle_screen
│   │   └── tools/       # headless_sim（验收）/ auto_player（自动玩家）/ screenshot（截图）/ demo_director（录像导演）
│   └── scenes/
└── tools/               # 数据管线（Python）
    ├── sync_assets.py       # 美术出图 → game/assets
    ├── extract_map_data.py  # 地图卡出图 → maps.json（几何抽取）
    ├── verify_data.py       # ★ 游戏数据表 ↔ 策划文档 逐字段交叉校验
    ├── record_demo.sh       # 录制完整流程演示视频（Godot 帧序列 → H.264 MP4）
    └── make_video.swift     # 帧序列 → MP4 编码器（AVFoundation，无 ffmpeg 依赖）
```

## 四、运行方式

```bash
cd projects/refu-game-001/game

./run.sh run       # 开一局（Godot 窗口，竖屏 540×960）
./run.sh editor    # 用 Godot 编辑器打开工程
./run.sh check     # 无头验收：19 项用例，PASS/FAIL 看退出码
./run.sh shot --scene=res://scenes/battle/battle.tscn --out=/tmp/x.png --autoplay=120 --speed=8
./run.sh demo       # 跑一遍"完整流程演示"（配 tools/record_demo.sh 录制）
```

录制演示视频（不需要屏幕录制权限、不需要联网）：

```bash
cd projects/refu-game-001
tools/record_demo.sh                 # 默认 720×1280 @30fps → docs/video/demo_gameplay.mp4
```

> `run.sh` 会把 `HOME` 指到工作区内的 `.godot-home/`：Godot 默认往 `~/Library/Application Support` 写日志与存档，
> 指过去既避免污染真实用户目录，也让沙箱/CI 不需要额外权限。

数据管线（改策划文档或美术后）：

```bash
cd projects/refu-game-001
python3 tools/sync_assets.py          # 美术：出图 → 工程
python3 tools/extract_map_data.py --write   # 地图：出图 → maps.json
python3 tools/verify_data.py          # 数据表 ↔ 策划文档 逐字段对账
```

## 五、坐标与口径速查

- **世界坐标**：地图卡原始像素 980×660；网格 10 列 × 8 行，单元格 90×72；**1 格 = 90px**（射程/半径以格为单位）；
- **敌方移速**：移速 1.0 = 20.75 px/s（= MAP-ANV-01 路径全长 830px ÷ 19 号卡表"约 40s 通行"）；
- **基准关卡**：B_ref = 158 = WAV-ANV-A 六波威胁值合计（与策划 数值/04 一致，`verify_data.py` 每次校验）；
- **数值来源**：卡/敌人/波次/挑战卡/规则卡数值**一律照策划文档**，未定项与派生值集中在
  `game/data/balance.json` 与 `game/data/rules.json`（见 [裁决记录](docs/01_实现裁决记录.md) A1）。

## 六、与策划卷的关系

- 本工程是 [`doc/refu-game-001/`](../../doc/refu-game-001/README.md) 的**实现物**，不是新的设计源：
  规则冲突以策划文档为准，实测反馈写进 [04_调参与实测发现](docs/04_调参与实测发现.md) 供策划裁决；
- 实现过程中发现的 **2 处文档/出图不一致** 已逐条记录（未擅改文档），见同文件 F5、F6。
