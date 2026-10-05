# Refu Game 001 · 节点防线 · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循 Keep a Changelog 风格：
> `新增` / `变更` / `修复` / `移除`。项目结构见 [`README.md`](README.md)；文档入口 [`docs/`](docs/README.md)。
> 策划卷（设计源）在 [`doc/refu-game-001/`](../../doc/refu-game-001/README.md)，本项目是其实现物。

## [0.1.4] - 2026-09-16 15:44

### 变更

- **`projects/refu-game-001/` 结构重构：23 → 128 个 .gd，核心逻辑 ≤50 / 界面 ≤100 代码行**（注释与空行不计，物理行兜底）。
  新增执行器 [`tools/check_file_size.py`](../../projects/refu-game-001/tools/check_file_size.py)（`./run.sh lint`，已接入 `./run.sh check` 第一道闸门），
  把"一个文件只做一件事"从口号变成会让构建失败的门槛。主要动作：`core/battle.gd` 1462 行（1187 代码行）拆为
  `battle_state`（状态）→ `battle_api`（只读查询门面）→ `battle`（生命周期+命令）三层 + `core/battle/` 下 41 个静态系统
  （属性管线/钩子解释器/敌人行为/波次/放置/结算各自成文件，逻辑用组合而非继承）；`TowerUnit`/`EnemyUnit`/`BlockerUnit`
  各拆 `*_state.gd` + `*_unit.gd`（字段搬基类，`tw.hp` 这类字段直达写法零改动）；`view/` 拆六个 painter + 只读绘制上下文
  并把 `UiKit` 变成纯转发门面（颜色→`palette.gd`、控件→`widgets.gd`）；`app/battle_screen.gd` 744 行拆为装配+驱动 +
  `app/battle/` 各面板与弹窗；`tools/` 拆 `sim/`（用例/驱动/报告）、`auto_*`、`demo/`（时间轴/字幕/战斗驱动）、`shot/`。
  新增 [`docs/06_文件预算与拆分约定.md`](../../projects/refu-game-001/docs/06_文件预算与拆分约定.md) 与
  [`docs/07_代码地图.md`](../../projects/refu-game-001/docs/07_代码地图.md)（24 条"想改 X → 去哪个文件"）。**验证**：四道闸门全 PASS
  （数据 7 项 / 地图 6 张 / 资源 28 个 / 无头验收 19 项 + 预算 0 超），且验收数值与重构前逐字一致（漏怪 1、基地 19/20、用时 215s、评级 S 0.87）；
  表现层另做逐字节像素对照（三组截图 SHA256 与重构前相同）。中途发现并回退一处行为漂移：自动玩家的阻挡单位放置时机被拆分改动（204s ≠ 215s），已还原调用顺序。

## [0.1.3] - 2026-09-16 15:44

### 验证

- 数据表↔策划文档（7 项）、地图↔出图（6 张）、资源↔美术（28 个）三道闸门照旧 PASS；
- 无头验收 19/19 PASS，且**数值与重构前逐字一致**（漏怪 1、基地 19/20、用时 215s、评级 S 0.87）；
- 文件预算 PASS：128 个 .gd，超预算 0；
- 中间发现并回退一处**行为漂移**：自动玩家的"阻挡单位放置时机"被拆分改动（从无条件变成 attackers≥2 才放），
  导致验收用时 204s ≠ 215s，已还原调用顺序；
- 表现层做了逐字节像素对照：`level_select` / 战斗布防期 / 战斗 50s 实战三组截图 SHA256 与重构前完全相同。

## [0.1.2] - 2026-09-16 15:44

### 变更（结构重构：23 → 128 个 .gd，核心 ≤50 / 界面 ≤100 代码行）

**目标**：让"一个文件只做一件事"变成可执行的约定——核心逻辑 ≤50 代码行、界面 ≤100 代码行（注释与空行不计，
物理行兜底），由 `tools/check_file_size.py` 强制，超预算 `./run.sh check` 直接 FAIL。

- **执行器**：新增 [`tools/check_file_size.py`](../refu-game-001/tools/check_file_size.py)（`./run.sh lint`），
  已接入 `./run.sh check` 的第一道闸门；定义"代码行"口径（去空行/`#` 注释/三引号块）。
- **新增冒烟测试**（`./run.sh smoke`，也挂在 `check` 里）：无头把演示场景跑 4 秒，任何 `SCRIPT ERROR` 即 FAIL。
  加它的直接原因：拆分 `demo_director` 时漏声明了一个成员变量，19 条验收用例全过、但录像整段失败
  （Godot 回退录了 4 分半主菜单）——**用例只驱动 core/，接线错误得靠冒烟测试拦**。
  同时给 `tools/record_demo.sh` 加了帧数上限与异常帧数告警，避免再产出这种无用视频。
- **`core/battle.gd`：1462 行（1187 代码行）→ 拆成 `core/battle.gd` + `core/battle/` 下 41 个文件**：
  - 三层门面：`battle_state.gd`（状态字段）→ `battle_api.gd`（只读查询转发）→ `battle.gd`（生命周期 + 命令）；
  - 逻辑用**组合**（静态系统类）：`BattleStats`（属性管线，来源采集再分两层）、`BattleEffects`（钩子解释器，
    按 op 分三个文件）、`BattleEnemies`/`BattleBlocking`/`BattleFortAttack`、`BattleWaves`/`BattleWaveEnd`/`BattleSpawn`、
    `BattlePlacement`/`BattlePlaceTower`/`BattlePlaceUnit`/`BattlePlaceModifier`、`BattleDamage`/`BattleDestroy`、
    `BattleFields`、`BattleBonds`、`BattleRating`、`BattleQueries`/`BattleUiQueries`/`BattleFeedback` 等；
  - 字段直达（`battle.energy`、`tw.hp`）零改动：状态搬到基类，200+ 调用点无需修改。
- **单位类**：`TowerUnit`/`EnemyUnit`/`BlockerUnit` 各拆为 `*_state.gd`（字段）+ `*_unit.gd`（行为），同上保留字段直达。
- **路径与卡组**：`path_geom.gd` → `+ path_geom_math.gd`/`path_geom_distance.gd`（对外方法签名不变，改为转发）；
  `deck.gd` → `+ deck_draw.gd`。
- **数据与全局状态**：`game_data.gd` → `GameData` 门面 + `data/`（`data_loader` / `data_validator` / `data_queries`）；
  `app_state.gd` → `AppState` 门面 + `data/`（`deck_recipes` / `deck_rules` / `challenge_rules` / `progress` / `save_io`）。
- **表现层**（`view/`）：`battle_view.gd` 283 → 66，绘制拆成 `view/battle/` 六个 painter + 只读上下文
  `battle_paint_ctx.gd`；`ui_kit.gd` 变为**纯转发门面**（颜色/字号搬到 `palette.gd`、控件工厂搬到 `widgets.gd`），
  `UiKit.*` 的名字一个不少；`card_view.gd` 只留状态与交互，画法搬 `card_painter.gd`；形状工具 `draw_shapes.gd`。
- **界面层**（`app/`）：`battle_screen.gd` 744 → 装配与驱动，面板拆到 `app/battle/`（HUD / 手牌 / 波次条 / 底栏 /
  输入路由 / 五个弹窗 / 布局与时钟）；`level_select` / `deck_builder` / `codex` 同样按"列表 / 详情 / 弹窗"拆开。
- **工具层**（`tools/`）：无头验收拆 `sim/`（用例 `sim_suites*.gd` + 驱动 `sim_driver.gd` + 报告 `sim_report.gd` +
  对空用例 + 轨迹）；自动玩家拆 `auto_deploy`/`auto_support`/`auto_skills`/`auto_slots` + 门面；
  录像拆 `demo/`（时间轴 `demo_steps_ui`/`demo_steps_play` + 场景装载 + 战斗段驱动 + 字幕条）；
  截图拆 `shot/`（自动打 + 存盘）。
- **新增文档**：[06_文件预算与拆分约定](docs/06_文件预算与拆分约定.md)（预算口径、四种拆分手法、代价与维持方式）、
  [07_代码地图](docs/07_代码地图.md)（24 条"想改 X → 去哪个文件"对照表 + 四层目录与调用方向）；
  README / docs README / 02 工程结构 / 05 验收 / 00 里程碑同步更新。

## [0.1.1] - 2026-09-16 13:05

### 新增

- **完整流程演示录像** [`docs/video/demo_gameplay.mp4`](docs/video/demo_gameplay.mp4)（92.5 秒 / 720×1280 / 30fps / 7.3 MB，H.264）：主菜单 → 卡牌图鉴 → 关卡与挑战卡（加压+疾行，难度分 5）→ 卡组编辑 → 峡谷哨站 6 波交战 → 结算（评级 A、掉落 ×1.25），底部带分镜字幕，战斗段 4× 速。
- **录像管线（无 ffmpeg、无录屏权限依赖）**：`game/scripts/tools/demo_director.gd`（录像导演：按时间轴实例化各界面 + 自动玩家操盘 + 字幕，战斗字幕跟"当前波次"走）+ `game/scenes/tools/demo.tscn` + `game/run.sh demo` + `tools/record_demo.sh`（一键录制）+ [`tools/make_video.swift`](tools/make_video.swift)（AVFoundation 编码器：PNG 帧序列 → H.264 MP4，另含 `--probe` 探规格与 `--frames` 抽帧核对）。
- `docs/video/README.md`：片子内容表、重录方法与两个环境坑说明（Godot PNG 序列写入器不自建输出目录；Movie Maker 录制尺寸 = 窗口尺寸而非 viewport 尺寸）。
- 项目 README / docs README / 02 工程结构 / 05 验收 / 00 里程碑同步加入录像入口与"录像验收"小节。

## [0.1.0] - 2026-09-16 12:51 · M1 垂直切片可玩

### 新增（工程）

- **Godot 4.7 工程 `game/`**，竖屏 720×1280（窗口覆盖 540×960）、GL Compatibility（与工作区主线同后端），无第三方依赖；
- **纯逻辑战斗引擎 `scripts/core/`**：`battle.gd`（阶段机 / 能量 / 波次投放 / 伤害结算 / 事件钩子 / 羁绊 / 评级）、
  `tower_unit.gd`、`enemy_unit.gd`、`blocker_unit.gd`、`projectile.gd`、`path_geom.gd`（折线 + 环形）、`deck.gd`；
- **四层结构**：`core/`（纯逻辑）→ `view/`（只画）→ `app/`（界面与输入）→ `autoload/`（数据与全局状态）；
  逻辑层不依赖渲染，因此可在无头环境跑完整局；
- **数据表 `game/data/*.json`**：卡 12 / 敌方 6 / 地图 6 / 波次卡组 1 / 挑战卡 5 / 规则卡 1 / 关卡 2 / 平衡参数，
  另含三族 36 卡与其余 5 图的钩子 DSL、地形效果、事件槽字段（M2 可直接补数据）；
- **效果 DSL**：11 种 op（`energy` / `stat_buff` / `pierce_bonus` / `heal` / `shield` / `aura` / `slow_field` /
  `global_buff` / `add_tag` / `trigger` / `damage_field` / `summon` / `corrosion` / `resonance`），
  卡片只声明数据，引擎统一解释；
- **界面 6 个场景**：主菜单、关卡选择（含挑战卡自选与白名单拦截）、卡组编辑（20 张 / 同名 ≤2 / 标签校验）、
  战斗界面（HUD / 手牌 / 放置 / 施放 / 弹窗 / 结算）、卡牌图鉴、启动引导；
- **战斗表现层**：地图卡出图作底板 + 程序化绘制槽位/地形/塔（炮座与炮管）/敌人（按原型 6 种造型）/弹道（含穿透光束）/
  血条/护盾/射程圈/减速与腐蚀状态/飘字；
- **中文字体方案 `ui_font.gd`**：运行时从系统路径加载 CJK 字体并设为 `ThemeDB` 全局回退字体，
  仓库不放字体二进制（macOS/Linux 多候选 + `assets/fonts/` 兜底）；
- **工具链 `tools/`（Python，幂等）**：
  `sync_assets.py`（美术出图 → 工程资源，SHA256 比对）、`extract_map_data.py`（地图卡 SVG → 几何数据）、
  `verify_data.py`（游戏数据表 ↔ 策划文档**逐字段交叉校验**）；
- **无头验收 `run.sh check`**：19 条用例（数据装载 / 自动通关 / 空手必败 / 确定性 / 挑战卡 / 对空 / 白名单 / 能量经济）
  + 战况轨迹（调参用）；`run.sh shot` 支持引擎内截图与 `--autoplay` 自动打一局；
- **自动玩家 `auto_player.gd`**：验收与截图共用的"合格玩家"启发式（覆盖排序铺塔、对空优先、卡位预算给攻击塔）。

### 新增（文档）

- [`README.md`](README.md)：项目入口（能玩什么 / 没做什么 / 目录 / 运行 / 口径速查）；
- [`docs/00_实现范围与里程碑.md`](docs/00_实现范围与里程碑.md)：M1 交付清单、M2/M3 规划、技术债；
- [`docs/01_实现裁决记录.md`](docs/01_实现裁决记录.md)：**15 条实现裁决**（文档未定项与冲突处的取舍 + 理由 + 代价 + 翻案路径）；
- [`docs/02_工程结构与运行.md`](docs/02_工程结构与运行.md)：四层结构、文件地图、战斗主循环、运行方式、性能限制；
- [`docs/03_数据表与校验.md`](docs/03_数据表与校验.md)：数据管线、卡的三层九字段与效果 DSL、改数据标准流程；
- [`docs/04_调参与实测发现.md`](docs/04_调参与实测发现.md)：**7 条实测发现**（起手张数是难度旋钮、能量后期过剩、
  路障工事定位、磁轨钉枪强度、MAP-AST-01 塔位数不一致、基地生命口径冲突、第 4 波对空硬检查点）；
- [`docs/05_验收与测试.md`](docs/05_验收与测试.md)：19 条用例表、截图验收、三道闸门、已知缺口；
- [`docs/shots/`](docs/shots/)：6 张真实运行截图。

### 变更（对策划卷的反馈，未改文档）

- 发现并记录 2 处**文档/出图不一致**（`MAP-AST-01` 标准塔位 8 vs 10）与**文档内部口径冲突**
  （18 号规则卡"基地生命 20" vs 21 号模型"漏怪上限 3"），只提出不下结论，见
  [`docs/04_调参与实测发现.md`](docs/04_调参与实测发现.md) F5、F6；
- 依据实测标定 **`hand_size = 6`**（策划文档未定该参数）：起手 5 张 → 漏怪 9 / 评级 B；6 张 → 漏怪 1 / 评级 S。

### 修复（开发过程中发现并解决）

- **支援卡"在场时长"语义错误**：早期把 `stats.duration`（修理窗口 6s）当成单位寿命，导致
  `ANV-M01` 每 6 秒消失、`on_wave_end` 钩子永不触发、后勤链羁绊不可达；改为独立的 `stats.lifetime` 字段（裁决 A4）；
- **出牌未从手牌消耗**：早期版本打出卡后手牌不变，自动玩家反复重买同一张卡、能量被烧空；
  改为出牌即消耗 + 牌堆不足时重洗（doc 05"固定轮转"口径）；
- **自动玩家只在布防期建塔**：与真人玩法不符（塔防要能边打边补），并会带偏难度标定；
  改为波次中也可布防（[`docs/04`](docs/04_调参与实测发现.md) F1 注）；
- **塔属性管线口径错误**：基础值曾被混进"百分比累加器"，导致增益按 `base × (1 + base + buff)` 计算；
  改为 `final = base × (1 + Σ百分比)`，穿透单独作平坦值；
- Godot 无头运行的两处环境坑：用户数据目录不可写导致启动崩溃（`run.sh` 把 `HOME` 指向工作区内 `.godot-home/`）、
  新增 `class_name` 脚本未注册导致 `Identifier not declared`（`run.sh check` 先自动 `--import`）。
