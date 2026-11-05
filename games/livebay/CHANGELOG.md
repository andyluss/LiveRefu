# LiveBay · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)。
> 时间取该版本最后一个提交的作者时间（东八区，精确到分）；版本头时间与 tag 对齐。

## [0.1.60] - 2026-11-05 13:47

### 新增

- 顶部「档案 (H)」按钮；
- 班次档案页：最近三班的评级、保障度、记录选择、低报标记；
- 档案打开时暂停 clock，关闭恢复；
- `expansions-check` 增至 **27 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 27/27；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

## [0.1.59] - 2026-11-05 13:46

### 新增

- 广播升级为顶部 `BROADCAST` 横幅（6 秒）；
- 故障命中时显示受影响塔位的琥珀色范围；
- 旁路扩散时显示源塔 160px 影响圈；
- 降级塔显示剩余秒数；
- W5 面板显示受影响塔位编号。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 26/26；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

## [0.1.58] - 2026-11-05 13:45

### 新增

- 连续 3 班低报进入「停班审计」；
- 停班审计期间下一班 **旁路被禁用**：
  - W5 UI 只显示隔离；
  - `Sim.fault_bypass_locked` 拒绝 bypass；
  - 旁路锁定与低报 carry 一起生效；
- `expansions-check` 增至 **26 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 26/26；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.57] - 2026-11-05 13:44

### 新增

- 连续 2 班低报：接班后顶部 toast 显示「广播：事故统计不一致」；
- 连续 3 班低报：升级为「停班审计」广播；
- `ShiftMemory.broadcast_text()` 统一简报/ toast 文案；
- `expansions-check` 增至 **24 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 24/24；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.56] - 2026-11-05 13:43

### 新增

- 降级塔视觉：琥珀色外环 + `DEGRADED` 标签；
- 与停塔的锈红 `!` 区分，降级不再看起来像离线；
- 文档同步 W5 旁路扩散的视觉状态。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 23/23；
- HTML R-016 48/48。

## [0.1.55] - 2026-11-05 13:42

### 新增

- 旁路后 4s，相邻 160px 内塔降级 4s；
- `Sim.pending_adjacent` 延迟队列 + `_update_adjacent_degradation`；
- 新增 `tower_degraded` 信号，HUD 提示「第 N 号塔降级」；
- `expansions-check` 增至 **23 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 23/23；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.54] - 2026-11-05 13:41

### 新增

- 低报连续计数：最近低报连续 N 班，下一班故障停塔 +Ns；
- 连续 2 班低报时，接班简报增加「广播：事故统计不一致」；
- W4 审计卡仍按低报存在替换；
- `expansions-check` 增至 **22 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 22/22；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.53] - 2026-11-05 13:40

### 新增

- `ShiftStore` 改为保留最近 **3 班**记录；
- 接班简报显示最近三班摘要；
- 低报 carry 增加 W4「交接审计」卡：
  - 配合审计 → 如实补记；
  - 按惯例 → 再记一笔低报；
  - 审计卡替换原 W4 检查单；
- `expansions-check` 增至 **20 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 20/20；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.52] - 2026-11-05 13:37

### 新增

- `ShiftStore`：上一班记录持久化到 `user://shift.json`；
- `ShiftMemory` 启动时读取上一班；重新打开游戏也能看到接班简报；
- 低报 carry：`low_report > 0` → 下一班 `fault_duration_bonus +1s`；
- 简报明确显示「审计备注：下次故障停塔 +1s」；
- `expansions-check` 增至 **18 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 18/18；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.51] - 2026-11-05 13:35

### 新增

- `ShiftMemory`：本局内记住上一班记录/低报；
- 结算记录提交后写入 ShiftMemory；
- 点「再来一班」显示「接班简报」，引用上一班选择；
- 简报只存在本局内存，不写长期存档；
- `expansions-check` 增至 **17 项**（报告选择 + 接班简报）。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 17/17；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

## [0.1.50] - 2026-11-05 13:34

### 新增

- W5 从「开波前预案」改为 **故障命中时暂停选择**：
  - `Sim.fault_choice_pending/fault_pending`；
  - `FaultModule.candidates/apply_slots` 分离；
  - 运行时发 `FaultChoiceRequested`，暂停 clock；
  - HUD 复用检查单遮罩，提供隔离/旁路；
  - `submit_fault_choice` 命令。
- 故障选择只对加载了 `procedure.fault_choice` 能力的扩展包启用；baseline 保持原自动停塔行为。

### 验证

- `./run.sh test` 73/73，标准班仍 B/40/59/9；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 15/15；
- `./run.sh editor-test` 通过。

### 边界

- W5 故障命中只暂停一次；相邻塔降级、伤害数字等表现未做；
- 事故记录仍未接下一班简报。

## [0.1.49] - 2026-11-05 13:32

### 新增

- L1 样例包增加结算事故记录：如实 / 按惯例（低报 +1）/ 待复查；
- `ProcedureModule.submit_report()` 与 runtime `submit_report` 命令；
- 结算面板动态显示记录按钮，提交后写回本班记录；
- `expansions-check` 增至 **18 项**。

### 边界

- W5 仍是开波前预案，不是故障命中时暂停；
- 事故记录只影响本局 `low_report`，未接下一班简报/长期档案；
- baseline 不加载扩展包，标准班不变。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 18/18；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.48] - 2026-11-05 13:31

### 新增

- L1 样例扩展到三个变体：A/B/C（`variant_group=L1.shift`）；
- W5「故障预案」检查单：隔离 / 旁路；
- `Sim.fault_bypass`；`FaultModule` 旁路时改为降级 8s（不再停塔）；
- `TowerModule` 支持 `degraded_timer/degraded_factor`，降级期间攻速/产出按 50%；
- `expansions-check` 增至 **17 项**（C 变体、W5 预案、旁路降级）。

### 边界

- W5 目前是「开波前预案」，不是故障命中时的瞬时暂停面板；
- 事故记录、下一班简报仍未做；
- baseline 不加载扩展包，标准班不变。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 17/17；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.47] - 2026-11-05 13:29

### 新增（E1 样例）

- `ProcedureModule`：W4 检查单请求/选项/效果；
- 扩展包 A/B content 增加 W4 检查单：
  - A「复查」→ 下次故障停塔 -1s；
  - B「按惯例」→ 低报 +1；
- `MissionRuntime` 在检查单打开时暂停 clock，`submit_checklist` 命令恢复；
- HUD 增加检查单遮罩/选项按钮；
- `Sim.fault_duration_bonus`、`low_report` 字段；
- `expansions-check` 增至 **12 项**。

### 边界

- 只做 W4 检查单样例；W5 隔离/旁路、事故记录仍未做；
- 这是扩展内容，baseline 不加载，标准班不变。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 12/12；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.46] - 2026-11-05 13:24

### 新增（E0.1）

- `ExpansionSet.apply_data()`：把扩展包的窄修正器应用到运行时数据；
- 当前只实现 `modifiers.starting_energy`，用于验证 A/B 变体确实能改变运行结果；
- L1 样例包：A 开局供能 95，B 开局供能 85（占位，不是正式 L1 机制）；
- `expansions-check` 增至 **10 项**：A/B 能量差异 + 完整 A/B 结果对比；
- `00` 架构文档增加 `modifiers` 字段和 E0.1 说明。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 10/10；
- `./run.sh editor-test` 通过；
- baseline 仍为 B/40/59/9，不受实验包影响。

### 边界

- 这不是 L1 班次玩法；只是可插拔运行时的 A/B 验证；
- 真正的检查单、故障处置、事故记录仍未实现。

## [0.1.45] - 2026-11-05 13:22

### 新增（E0 扩展运行时）

- `ExpansionManifest`：pack.json 解析/校验；
- `ExpansionRegistry`：扫描 `expansions/`、preset 解析、core_api 检查、依赖/冲突/变体组校验；
- `ExpansionSet`：启用集合、slot 选择、set hash；
- `FeatureFlags`：从 ExpansionSet 生成；
- `ExpansionBoot`：启动加载 baseline；
- `MissionRuntime` 接收 ExpansionSet，黑匣子 meta 记录 set hash；
- `main` 默认加载 `baseline`（无包），不影响标准班；
- 两个 no-op L1 实验包 A/B + baseline/A/B/invalid preset；
- `./run.sh expansions-check`：8 项校验（含同组互斥与 A/B 运行）。

### 文档

- `expansions/00_可插拔扩展架构` 升到 v0.3：E0 已实现，L1 内容未实现；
- `expansions/README` 说明运行时地基；
- README 增加 `expansions-check`。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 8/8；
- `./run.sh editor-test` 通过；
- 标准班仍 B/40/59/9。

## [0.1.44] - 2026-11-05 13:18

### 新增

- 可插拔扩展架构增加「多个 L1 变体」设计：
  - `variant_group`：同组互斥，空值表示 additive；
  - preset `slots`：同一组只选一个实现；
  - `l1_compare` 实验：同 Pack/seed/命令，仅切换 variant；
  - 对比指标：完成率、保障度、时长、检查单使用、故障选择；
  - 黑匣子记录 `set_hash`，保证可复现。
- 明确 additive / variant 两类包，以及「同组同时启用 → 拒绝，不静默叠加」；
- 建议默认 D17-X7（variant_group + slot）与 D17-X8（内部 compare CLI），尚未登记为正式裁决。

### 验证

- Markdown 链接 0 失效；
- HTML R-016 48/48；
- HTML 本地链接 2,292 个，0 失效；
- 未改游戏代码/数值；扩展运行时仍未实现。

## [0.1.43] - 2026-11-05 13:07

### 变更

- `expansions/06_Pluggable_Expansion_Architecture.md` 改为中文名 **`00_可插拔扩展架构.md`**，序号前移到架构级位置；
- 标题改为「可插拔扩展架构」，去掉英文文件名；
- 目录 `expansions/` 保持不变。

### 裁决

- **D17-X1–X6 全部按建议通过**：B / A / A / A / A / A；
- **E17-1–E17-8 全部按建议通过**：A / A / A / A / A / A / A / A；
- `11_待人类裁决清单` 升到 v0.9，新增 P5 扩展包架构、P6 玩法扩展切片与裁决记录；
- `00_可插拔扩展架构`、`05_版本切片与决策` 从「待拍板」改为「已裁决，未实现」；
- design01 总览升到 v0.9。

### 验证

- Markdown 链接 51 个，0 失效；
- HTML R-016 48/48；
- HTML 本地链接 0 失效；
- 未改游戏代码/数值。

## [0.1.42] - 2026-11-05 13:01

### 变更

- 玩法扩展目录由 `17_玩法扩展/` 改为长期英文名 **`expansions/`**，去掉了数字前缀；
- 文档标题中的 `17.xx` 编号同步去掉，保留文件名序号用于阅读顺序；
- HTML 阅读版路径改为 `html/expansions/`，旧路径不保留。

### 新增

- `expansions/06_Pluggable_Expansion_Architecture.md`：可插拔扩展包方案；
- Pack manifest（id/version/state/layer/core_api/requires/conflicts/provides/flags）；
- Preset（baseline / l1_experiment / release）与实验生命周期；
- 层依赖采用能力/软依赖，不强制 L1→L2→L3；
- 包命名空间、失败隔离、存档停用安全、构建期模块注册、发布 gate；
- D17-X1–X6 决策表。

### 验证

- Markdown 链接 55 个，0 失效；
- HTML R-016 48/48；
- HTML 本地链接 2,288 个，0 失效；
- 未改游戏代码/数值；现有 73 项测试不受影响。

## [0.1.41] - 2026-11-05 12:54

### 新增

- **17 玩法扩展目录**：`docs-ai/design01/17_玩法扩展/`，6 份分层文档：
  - 00 总览：L1 班次 / L2 岗位 / L3 城市；
  - L1：检查单、故障隔离/旁路、事故记录、3 班合同；
  - L2：塔座 2 槽、备件、3 名湾民、事故链；
  - L3：2 舱室、1 城市事件、职业执照、档案网络；
  - 05：E17-1–E17-8 决策表与版本切片。
- 17 目录接入 HTML 生成与融合阅读版；index / 04 / 09 / 10 增加入口。

### 变更

- design01 总览升到 v0.8；
- HTML 构建支持嵌套目录（`17_玩法扩展/*.html`），R-016 47/47；
- 新增文档 6 个，Markdown 内部链接 48 个、HTML 链接 2,193 个，均 0 失效。

### 备注

- 17 是参考方案，未写进 11 的裁决清单；等人类选择 E17-1–E17-8 后再登记。
- 未改游戏代码/数值。

## [0.1.40] - 2026-11-05 12:47

### 新增

- **编辑器 + 架构演示 v2**：`docs-ai/design01/shots/editor_usage_v2.mp4`，40 秒 / 1280×720 / 30fps / H.264；
- 前 32 秒沿用编辑器流程，最后 8 秒为模块化架构页（MissionRuntime / 7 模块 / Pack / 回放）；
- 新封面 `editor_usage_v2_poster.png`；
- **旧版 32 秒视频与封面保留**，未覆盖。

### 变更

- README / 15 / addon README / demo README 同时链接 v2 与旧版；
- 演示场景 960→1200 帧，新增 32–40s 架构段。

### 验证

- `avmediainfo`：H.264、1280×720、40.000s、30fps，0 error；
- 1200 帧，1.6 MB；
- `./run.sh test` 73/73；
- HTML R-016 41/41。

## [0.1.39] - 2026-11-05 12:44

### 新增（模块化 M3 完成）

- `EnemyModule.update()`：减速、移动、漏过/故障逃逸检测；
- `EnemyModule.cleanup()`：死亡清理；
- `Sim._tick()` 只处理模块返回的 leaked/escaped/active，并转成信号；
- 敌人移动/清理测试；
- 领域模块清单全部落地：Map / Economy / Wave / Mission / Fault / Enemy / Tower。

### 变更

- `16`：M3 标记完成；M4 标记核心完成（HUD 构建仍在 main，但不含规则）；
- 测试从 71 增至 **73 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.38] - 2026-11-05 12:43

### 新增（模块化 M3）

- `TowerModule.update()`：冷却、索敌、单体/范围伤害、减速、供给产出全部下沉；
- `TowerModule` 提供 `tower_damage/range/supply_income/supply_repair`；
- `Sim._update_towers()` 只接收模块结果并发 `tower_fired`/`energy_changed`；
- 测试仍 71 项，标准班结果不变。

### 变更

- `16`：M3 标记「塔逻辑已下沉；敌人移动/清理仍在 Sim」。

### 验证

- `./run.sh test` 71/71；
- `./run.sh check` 退出码 0；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.37] - 2026-11-05 12:42

### 新增（模块化 M6 完成）

- `tests/replay_blackbox.gd`：读取最新/指定黑匣子，重放命令并比对结果；
- `./run.sh replay [path]`；
- 回放输出 expected/actual 的 grade / integrity / kills，失败退出码 1；
- 实测：F / 0 / 30 与黑匣子结果一致。

### 变更

- `16`：M6 标记完成；
- README 命令列表加入 `replay`；
- 测试仍 71 项（新增为手动 CLI，不加入单测计数）。

### 验证

- `./run.sh replay` → `replay: OK`；
- `./run.sh test` 71/71；
- `./run.sh check` 退出码 0；
- 工作区干净。

## [0.1.36] - 2026-11-05 12:42

### 新增（模块化 M5 完成）

- `tools/export_mission_pack.py`：从 `numbers/` 编译 `game/data/mission_pack.json`；
- 清单含 `schema_version`、`pack_id`、`version`、sha256；`--check` 校验是否最新；
- `DataLoader.load_mission_pack()` 优先读取编译清单；
- `run.sh pack` / `pack-check`；`numbers` / `numbers-check` 同步编译/校验清单；
- 编辑器 Bridge 写回后自动重编译 MissionPack。

### 变更

- `16`：M5 标记为完成；
- 测试仍为 71 项（内容组织变化，不改规则）。

### 验证

- `./run.sh numbers-check`：表格一致 + 清单一致；
- `./run.sh pack-check`：清单一致；
- `./run.sh test` 71/71；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过。

## [0.1.35] - 2026-11-05 12:41

### 新增（模块化 M4）

- `presentation/game_renderer.gd`：路径/塔/敌人/光束/提示/暂停遮罩等绘制从 `main.gd` 拆出；
- `main._draw()` 只负责把 Sim 状态交给 Renderer；
- `main.gd` 从 816 行降到约 600 行，绘制不再和输入/HUD/规则混在一起。

### 变更

- `16`：M4 标记「大部分」：ReadModel/Presenter + InputController + GameRenderer 已拆；HUD 构建仍在 main；
- 测试仍为 71 项（绘制拆分不改规则）。

### 验证

- `./run.sh test` 71/71；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.34] - 2026-11-05 12:40

### 新增（模块化 M4）

- `presentation/game_input.gd`：InputEvent → 视图动作，不直接改 Sim；
- `main._unhandled_input` 改为动作分发；
- 新增 hover / start_wave / unknown tower key 输入测试。

### 变更

- `16`：M4 标记「ReadModel/Presenter + InputController 已拆；绘制仍在 main」；
- 测试从 68 增至 **71 项**。

### 验证

- `./run.sh test` 71/71；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.33] - 2026-11-05 12:39

### 新增（模块化 M6）

- 事件信封增加 `tick`；
- `MissionRuntime.dispatch()` 记录 `CommandIssued`（命令 + 载荷 + tick）；
- `MissionRuntime.replay(game_data, entries)`：按 tick 重放命令，并自动推进到结果；
- `BlackBox.read_events()`：读取 JSONL 会话；
- 测试：同一局命令日志重放后 integrity / grade 一致。

### 变更

- `16`：M6 标记「核心已通」，CLI 回放未接；
- 测试从 66 增至 **68 项**。

### 验证

- `./run.sh test` 68/68；
- `./run.sh check` 退出码 0；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.32] - 2026-11-05 12:39

### 新增（模块化 M3/M4）

- `domain/enemies/enemy_module.gd`：敌人实体、生成、位置查询；
- `domain/towers/tower_module.gd`：塔实体、建造/升级/出售、塔位查询；
- `Sim` 的敌人/塔实体与建造逻辑改由模块承载，外部读取不变；
- 编辑器内嵌预览改用 `LiveBayMissionRuntime`：建造/升级/出售发命令，不再直接改 Sim；
- 预览 `dispose` 清理 runtime，避免泄漏。

### 变更

- `16`：M3 标记「大部分」；M4 标记「部分」，编辑器已共用编排器；
- 测试从 61 增至 **66 项**。

### 验证

- `./run.sh test` 66/66；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.31] - 2026-11-05 12:37

### 新增（模块化 M3/M4 部分）

- `domain/faults/fault_module.gd`：故障命中判定、停塔时长、目标上限；`Sim` 只负责位移/信号；
- `application/mission_read_model.gd`：HUD 只读快照；
- `presentation/mission_presenter.gd`：快照 → 显示文本；
- `main` 的供能/保障度/波次/状态/速度改走 ReadModel + Presenter；
- 新增故障模块、读模型、Presenter 测试。

### 变更

- `16`：M3 标记 Wave/Mission/Fault 已拆；M4 标记为部分；
- 测试从 57 增至 **61 项**；`12`/`B2`/README 同步。

### 验证

- `./run.sh test` 61/61；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.30] - 2026-11-05 12:36

### 新增（模块化 M3 部分）

- `domain/waves/wave_module.gd`：准备计时、波次顺序、生成队列、下一波 prep；
- `domain/mission/mission_module.gd`：阶段、保障度、维修、评级、结算；
- `Sim` 通过属性代理使用 Wave/Mission，外部读取方式不变；
- 新增 Wave/Mission 模块测试。

### 变更

- `16` 的 M3 标记为「部分」：Wave/Mission 已拆，Enemy/Tower/Fault 仍在 `Sim`；
- 测试从 52 增至 **57 项**；`12`/`B2`/README 同步。

### 验证

- `./run.sh test` 57/57；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- 标准班仍为 B / 40 / 59 击杀 / 9 漏过。

## [0.1.29] - 2026-11-05 12:35

### 新增（模块化 M5 部分）

- `content/mission_pack.gd`：MissionPack 容器、`schema_version=1`、manifest、sha256 hash、基础校验；
- `DataLoader.load_mission_pack()`：在现有 JSON 加载之上生成任务包并校验；`main` 改走 Pack；
- 测试检查 Pack 版本与 hash；
- 运行行为不变，Pack 只是内容的组织层。

### 变更

- `16` 的 M5 标记为「部分」：manifest/schema 已接，独立编译器未接；
- 测试从 50 增至 **52 项**；`12`/`B2`/README 同步。

### 验证

- `./run.sh test` 52/52；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过；
- `./run.sh numbers-check` 全部一致。

## [0.1.28] - 2026-11-05 12:34

### 新增（模块化 M1）

- `kernel/result.gd`：统一成功/拒绝 Result；
- `kernel/mission_clock.gd`：暂停/倍速/模拟时间；
- `kernel/event_bus.gd`：带 seq/source/payload 的事件信封；
- `kernel/command_bus.gd`：命令注册、派发、拒绝原因；
- `platform/black_box.gd`：事件记录、最近 10 局、JSONL 落盘；
- `application/mission_runtime.gd`：组合 Sim + Clock + EventBus + CommandBus + BlackBox；
- `main.gd` 改走 runtime：建造/升级/出售/开波/暂停/倍速通过命令，视图仍直接读 Sim 状态；
- 运行时 `dispose()` 断开信号并清空命令/事件，避免退出泄漏。

### 新增（模块化 M2）

- `domain/map/map_module.gd`：路径几何、塔位、基地；
- `domain/economy/economy_module.gd`：供能余额与收支；
- `Sim` 通过属性代理使用 Map/Economy，外部字段读取方式不变；
- 新增 Map/Economy 模块测试。

### 变更

- 测试从 37 增至 **50 项**；`12`/`16`/`B2`/README 等同步；
- `16` 升到 v0.2：M1/M2 已落地，M3–M7 进行中；
- `12` 增加「模块化落地状态」。

### 验证

- `./run.sh test` 50/50；
- `./run.sh check` 退出码 0，无泄漏警告；
- `./run.sh editor-test` 通过；
- `./run.sh numbers-check` 全部一致。

### 备注

- 行为/数值未变；M3 领域拆分仍在进行；
- 黑匣子已记录事件，回放命令尚未接。

## [0.1.27] - 2026-11-04 22:32

### 新增

- **16 · 模块化技术架构：NASApunk 系统方案**（参考稿，未裁决、未实现）：
  - ORU 模块目录：Map / Wave / Enemy / Tower / Economy / Mission / Fault / Procedure / Modifier；
  - 内核：CompositionRoot、MissionClock、EventBus、CommandBus、Diagnostics、MissionPack；
  - 端口、命令、事件、依赖规则与 tick 顺序；
  - MissionPack / schema / 迁移、黑匣子与回放；
  - 模块准入检查单、迁移路线（M0–M7）与 D19-A–F 待拍板问题。
- 12 增加「模块化演进参考」链接；README 文档表加入 16；HTML 增加 16 页并重生成。

### 说明

- 16 是**供人类参考的工程方案**，不是决定，也不改变 12 的现行事实；
- 未改游戏代码、数值或编辑器功能；
- 未把 D19 写入待裁决清单，等人类先看方案。

### 验证

- Markdown 链接 44 个，0 失效；
- HTML R-016 41/41；
- HTML 本地链接 1,670 个，0 失效；
- `./run.sh test` 37/37；`./run.sh numbers-check` 全部一致。

## [0.1.26] - 2026-11-04 21:13

### 变更

- **替换编辑器演示视频**：`docs-ai/design01/shots/editor_usage.mp4` 更新为 32 秒版本；
- 新内容覆盖：内嵌预览建造/升级/出售/暂停/下一波、详细结算、数值表 `numbers/02–03`、历史分支保留、Phase 3 总结；
- 封面更新为数值表画面；`game/demo/README.md` 同步 960 帧 / 32 秒命令。

### 验证

- `avmediainfo`：H.264、1280×720、32.000s、30fps，0 error；
- 960 帧，1.4 MB，无音频；
- 文档中的 25 秒引用已同步为 32 秒。

## [0.1.25] - 2026-11-04 21:07

### 新增

- **内嵌预览完整操作**：左键建造/升级、右键出售、暂停/继续、下一波、后续波次连续预览；
- **详细结算**：WON/LOST 面板显示评级、保障度、击杀、漏过、建造、消耗、清波；
- **塔/敌人数值表**：`数值表` 按钮打开窗口，编辑 02 塔 / 03 敌人字段；写回 `numbers/` 并导出；
- **历史分支保留**：点击历史回到某动作之前时，后续历史以 `↳` 分支保留；下一次编辑才截断；
- 数值编辑进入撤销快照，覆盖地图 / 波次 / 塔 / 敌人。

### 变更

- Bridge 支持 towers / enemies 表读写，写回 02–05 后统一导出；
- `15_专用游戏编辑器方案` 升到 v0.7；
- addon README 更新预览、数值表、历史边界。

### 验证

- `./run.sh test` 37/37；
- `./run.sh editor-test`：7 塔位 / 3 塔 / 5 波 / 4 敌 + 内嵌预览通过；
- 数值表实测：塔 cost=31、敌人 hp=31 写回并导出；恢复后 02/03 无差异；
- 编辑器插件无头加载无解析错误；
- HTML R-016 40/40。

### 备注

- 数值表是字段级编辑，未做依赖校验 / 批量导入；
- 历史是单条可回退时间线 + 保留的后续分支，不是多分支树；
- 预览波间商店/HUD 仍后置。

## [0.1.24] - 2026-11-04 21:02

### 新增

- **内嵌预览可交互**：预览内点击塔位建造当前预览塔；点击已建塔升级（只影响预览，不写回）；
- **预览表现**：塔开火光束、击杀飘字、WON/LOST 后显示 grade / integrity / kills；
- **预览塔选择**：Dock 内单独选择预览塔类型；
- 内嵌预览信号 `status` 同步到编辑器状态栏。

### 变更

- `15_专用游戏编辑器方案` 升到 v0.6：可交互 SubViewport 预览；
- addon README 更新预览能力与边界。

### 验证

- 编辑器插件无头加载无解析错误；
- `./run.sh test` 37/37；`./run.sh editor-test` 内嵌预览 running=true；
- 预览塔仍使用真实 Sim，预览操作不写回 numbers。

## [0.1.23] - 2026-11-04 20:46

### 新增

- **编辑器使用演示视频**：`docs-ai/design01/shots/editor_usage.mp4`，25 秒 / 1280×720 / 30fps / H.264，无音频；
- 程序化演示场景：`game/demo/editor_demo.gd` + `editor_demo.tscn`，覆盖拖塔位、插路径点、波次时间轴、内嵌预览、保存、历史跳转；
- 封面 `editor_usage_poster.png`；演示说明与编码脚本在 `game/demo/`。

### 备注

- **不是桌面录屏**：当前 macOS `screencapture -v` 无法保存视频；本片用 Godot 重画编辑器界面与交互；
- 视频用于展示工作流，不作为编辑器已完成全部交互的证据。

### 验证

- `avmediainfo`：H.264、1280×720、25.000s、30fps，0 error；
- 视频 1.0 MB；750 帧；
- `./run.sh test` 37/37；`./run.sh editor-test` 通过。

## [0.1.22] - 2026-11-04 20:35

### 新增

- **SubViewport 内嵌预览**：`preview_viewport.gd` + `preview_canvas.gd`，用真实 `Sim` 跑选中波次，默认两塔，显示塔/敌人/保障度与 WON/LOST；
- **时间轴右缘拖拽**：拖敌人组横条右缘调整 `interval`；
- **历史列表跳转**：点击命名历史条目，回到该动作之前（丢弃其后的操作）；
- 编辑器测试加入内嵌预览冒烟断言。

### 变更

- `15_专用游戏编辑器方案` 升到 v0.5：Phase 1–3 + SubViewport 预览；
- addon README / 项目 README 同步预览、拖拽、历史跳转能力。

### 验证

- `./run.sh test` 37/37；
- `./run.sh editor-test` 读取 7 塔位 / 5 波 / 4 敌，内嵌预览 running=true；
- 编辑器插件无头加载无解析错误；
- 内嵌预览冒烟：W1 启动、0.25s 推进正常。

### 备注

- 内嵌预览默认两塔，只读；建造/升级/出售交互仍后置；
- 历史跳转会丢弃所选动作之后的编辑，没有分支树。

## [0.1.21] - 2026-11-04 20:31

### 新增

- **视口内波次预览**：选中波次后「预览本波」，在 2D 视口播放敌人沿路径移动；支持正/反向故障；不启动完整游戏；
- **时间轴拖动**：左右拖动敌人组横条调整 `delay`，0.1s 吸附；
- **命名撤销历史**：操作列表记录「拖动塔位 / 应用 W4 / 加组 / 删波」等动作；撤销/重做在状态栏显示名称；
- 撤销快照继续同时覆盖地图与波次。

### 变更

- `15_专用游戏编辑器方案` 升到 v0.4：Phase 1–3 MVP 已实现；完整 `SubViewport` 内嵌后置；
- addon README 与项目 README 同步 Phase 3 能力。

### 验证

- 编辑器插件无头加载无解析错误；
- `./run.sh test` 37/37；`./run.sh editor-test` 读取 7 塔位 / 5 波 / 4 敌，通过 numbers 校验；
- 波次表与地图表写回仍保持幂等。

### 备注

- 预览只画敌人位置与节奏，不含塔开火、伤害、结算；完整游戏内嵌留到后续。

## [0.1.20] - 2026-11-04 20:28

### 新增

- **波次时间轴**：`wave_timeline.gd` 按波次画敌人组，点击选中；颜色来自敌人配置；
- **波次数值面板**：准备 / 敌人 / 数量 / 间隔 / 延迟，「应用」写回；
- **组与波次增删**：加组 / 删组 / 加波 / 删波，自动重编号；
- Bridge 扩展：读写 `numbers/04_波次数值.md`，一次保存地图 + 波次并导出；
- 撤销 / 重做快照同时覆盖地图与波次。

### 变更

- `15_专用游戏编辑器方案` 升到 v0.3：Phase 2 MVP 已实现；
- addon README 与项目 README 同步波次编辑能力。

### 验证

- 无头加载编辑器插件：无解析错误；
- Bridge 读写波次表幂等；写入后导出 `game/data/waves.json` 一致；
- `./run.sh test` 37/37；`./run.sh editor-test` 通过；
- WaveTimeline 解析通过，编辑器插件可加载。

## [0.1.19] - 2026-11-04 20:25

### 新增

- LiveBay Tools 增加路径点 / 塔位的**插入与删除**；
- 增加**撤销 / 重做**（快照栈，最多 40 步；Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z）；
- 保存按钮显示 `保存 *` 未保存状态；插入/删除/拖动均进入历史；
- 数据桥测试覆盖增加点/塔位后的写回与恢复（临时数据，最终恢复原图）。

### 变更

- `game/addons/livebay_tools/README.md` 更新能力与边界；
- 无 LiveBay 之外的变更日志记录。

### 验证

- `./run.sh test` 37/37；
- `./run.sh editor-test` 读取 7 个塔位并通过 numbers 校验；
- 编辑器无头加载插件无解析错误；
- bridge 写入 11 路径点 / 8 塔位后导出成功，再恢复为 10 / 7。

## [0.1.18] - 2026-11-04 20:00

### 新增

- **LiveBay Tools 编辑器插件 MVP**：`game/addons/livebay_tools/`，在 Godot 2D 视口拖动路径点 / 塔位 / 基地，5px 吸附，塔射程预览；
- **Python 数据桥**：`bridge.py` 读写 `numbers/05_地图与塔位.md`，调用 `export_numbers.py` 导出并校验；编辑器不成为第二数据源；
- 插件 Dock：重载 / 保存 / 校验 / 运行游戏 / 塔预览选择 / 叠加层开关；
- `./run.sh editor-test`：数据桥冒烟测试（读取 7 个塔位 + numbers 校验）。
- 编辑器方案 E1–E4 按推荐通过：Godot 插件 / Markdown + bridge / 地图+塔位+预览 / 现在做 Phase 0+1。

### 变更

- `15_专用游戏编辑器方案` 状态升到 v0.2，记录 E1–E4 与 Phase 1 MVP；
- `11_待人类裁决清单` 升到 v0.8，P4 四项已裁决并追加记录；
- LiveBay README 增加编辑器插件入口；mainline 的 LiveBay 状态页同步。

### 验证

- `bridge.py read/write/check`：可读、可幂等写回、导出校验通过；
- `BridgeClient` 在 Godot 无头环境读取 7 个塔位并通过 `numbers` 校验；
- Godot 编辑器无头加载插件，无脚本解析错误；
- `./run.sh test` 37/37；HTML R-016 39/39。

### 备注

- 这是 Phase 1 MVP：添加/删除点、波次时间轴、撤销/重做、内嵌预览尚未做；
- 保存会直接改 `numbers/05`，建议先提交或备份。

## [0.1.17] - 2026-11-04 16:35

### 新增

- **单文件完整阅读版**：`docs-ai/design01/html/LiveBay-design01-all.html`，把 17 篇文档、20 条规则与 1 个规则总览融合成 38 个章节；
- 单文件内联全部 CSS / 主题脚本，保留系统 / 浅色 / 深色、打印、目录、元数据、表格与图片链接；
- 新增 `tools/merge_design_html.py`，`./run.sh merge` 可重新生成；HTML 首页增加「完整单页版」入口。

### 实现要点

- 每个原页面变成 `<section>`，所有 `id` 加章节前缀，避免跨页同名锚点冲突；
- 跨页链接重写为单文件内锚点，`url(#...)` 等 SVG 引用同步改名；
- 图片、视频、源 Markdown 链接按单文件位置重新计算相对路径；
- 单文件仍引用外部图片/视频，不内嵌大体积媒体。

### 验证

- R-016：40/40 个 HTML（39 个分页 + 单文件）通过；
- 全部 HTML 本地链接 1,566 个，0 失效；单文件 326 KiB。

## [0.1.16] - 2026-11-04 16:31

### 新增

- **专用游戏编辑器方案**：新增 `15_专用游戏编辑器方案.md`，比较 Godot 插件 / 独立 Web / 嵌入运行时 / 数据工具四条路线；
- 推荐「Godot EditorPlugin + Python 数据桥 + 分阶段 WYSIWYG」：先地图/塔位/预览，再波次时间轴，独立 Web 编辑器留到后期；
- 新增 E1–E4 待裁决：形态、数据主权、MVP 范围、时机。

### 变更

- `11_待人类裁决清单.md` 增加 P4（E1–E4 待裁决），状态升到 v0.7；
- design01 README 增加 15 号文档；HTML 阅读版页数增至 39（17 篇文档 + 规则总览 + 20 条规则）。

### 备注

- 本轮只做方案分析，**未实现编辑器**；
- 推荐先做 Phase 0（数据 bridge / live reload），再决定是否做视口编辑。

## [0.1.15] - 2026-11-04 13:08

### 新增

- **塔防 NASApunk 深化设计**：新增 `14_塔防NASApunk深化.md`，把「检查单 / 第 5 波降级故障 / 事故记录」轻量包写成可实现的机制规格；
- 新增 N1–N5 决策：N1 轻量包、N2 第 4 波教学 + 第 5 波降级、N3 模块化留 v0.2；N4/N5 为执行默认；
- 14 号文档与 HTML 阅读版页面同步加入。

### 变更

- `11_待人类裁决清单.md` 增加 P3 段与 N1–N3 裁决记录，状态升到 v0.6；
- `04_塔防玩法.md` 关联 14；design01 README 文档清单加入 14；
- HTML 阅读版页数增至 38（16 篇文档 + 规则总览 + 20 条规则）。

### 备注

- 本轮只做设计与裁决记录，**尚未改游戏代码**；
- 轻量包实现顺序：检查单 → 第 5 波降级 → 事故记录；每步先跑标准班回归（B / 40）。

## [0.1.14] - 2026-11-04 12:39

### 修复

- 规则总览关系图的图例矩形改为各自的层级色：a 底层（橙）、b 中层（青）、c 表层（琥珀），不再全部显示为黑色；
- 原因是 SVG 图例矩形直接带 `chip-a/b/c` 类，而 CSS 只匹配了父级 `g` 下的 `rect`；补充 `rect.chip-*` 选择器。

### 验证

- R-016：37/37 页通过；HTML 本地链接 1337 个，0 失效。

## [0.1.13] - 2026-11-04 12:31

### 新增

- **规则 HTML 阅读版**：`docs-ai/design01/html/rules/`，1 个总览 + 20 个规则单页；
- 总览包含：a/b/c 三层卡片、分类 × 层级矩阵、根 → 四类 → 规则的 SVG 关系图、关键依赖、全部规则卡片；
- 规则单页包含：规则 ID / 层级 / 类别 / 遵循规则元数据、正文、目录、上一条/下一条规则。

### 变更

- `tools/build_design_html.py` 支持递归读取 `rules/`、生成嵌套 HTML、按目标路径解析相对链接、渲染规则元数据；
- HTML 阅读版索引增加「规则体系」区块；项目 README 与 design01 README 增加规则 HTML 入口；
- 样式增加规则矩阵、层级卡片、关系图、规则卡片与依赖列表。

### 验证

- R-016：37/37 页通过（16 篇文档 + 规则总览 + 20 条规则）；
- HTML 本地链接 1336 个，0 失效；
- `./run.sh test` 37/37；`./run.sh numbers-check` 全部一致。

### 备注

- 规则 HTML 由 Markdown 生成，不要手改；改 `rules/` 或 `tools/build_design_html.py` 后重跑；
- 规则关系图只画「根 → 类别 → 规则」的主干与关键依赖，不是完整依赖图。

## [0.1.12] - 2026-11-04 10:22

### 新增

- **规则体系**：`docs-ai/design01/rules/`，20 条规则，分三层（a 底层 / b 中层 / c 表层）与四类（biz / design / art / tech），根规则直接放在 `rules/`；
- 每条规则包含：形式化表述、通俗解释、MUST/SHOULD/MAY 条款、判定与验收、反例、引用与变更；
- **规则引用**：17 篇设计/数值/艺术/小说文档的 YAML 增加 `rules` 字段；`sim.gd`、`data_loader.gd`、`main.gd`、`tests/run_sim.gd`、`export_numbers.py`、`make_art.py`、`run.sh` 文件头增加规则 ID；
- 规则索引：根 3 + 商业 3 + 设计 6 + 艺术 4 + 技术 4。

### 变更

- 项目 README 与 design01 README 增加规则体系入口；HTML 阅读版索引重新生成。

### 验证

- 20 个规则 ID 唯一；21 个规则文件 YAML 解析通过；规则与文档的 YAML 路径 0 缺失；
- Markdown 内部链接 233 个，0 失效；HTML R-016 16/16；
- `./run.sh test` 37/37；`./run.sh numbers-check` 全部一致；`./run.sh check` 退出码 0。

### 备注

- a 层规则（人类裁决、岗位人、三生、NASApunk、单一源、模拟/视图分离）暂不计划改动；改它们需人类裁决 + 版本升级；
- 规则不是排期；它约束“什么不能做”，不替决定“下一步做什么”。

## [0.1.11] - 2026-11-04 08:51

### 新增

- **小说集**：`docs-ai/design01/fictions/`，5 篇岗位短篇 + 索引——外环护卫兵、中环护理师、食堂后勤、采集兵、内环工程师；
- 每篇末尾附「场景卡」：玩法形态、玩家目标、核心动词、可复用系统、关键选择、分支后果、可复用资产；
- 小说覆盖塔防教学、故障停跳、沉浸选择、放置日常、限时采集、节点防御/故障链等场景方向。

### 变更

- 项目 README 与 design01 README 增加小说集入口；HTML 阅读版索引重新生成。

### 备注

- 小说人物、事件、对话均为 AI 虚构，**不是 canon**；与数值表冲突时以 `numbers/` 为准；
- 场景卡是提案，不是排期；人类可以只取其中一篇、一个选择或一个 UI 资产。

## [0.1.10] - 2026-11-04 08:30

### 新增

- **艺术设定图**：`docs-ai/design01/art/`，6 张 1600×1000 概念图——月牙城总览、三环剖面、中环养生舱、外环岗位防线、岗位控制台、岗位剪影；
- 每张图提供 SVG 矢量源与 PNG 导出；`art/README.md` 说明每张图的设定意图、配色与再生成方式；
- `tools/make_art.py` 生成 SVG，`tools/render_art.sh` 调用 rsvg-convert 导出 PNG。

### 变更

- 项目 README 与 design01 README 增加艺术设定图入口；
- HTML 阅读版随 README 索引更新重新生成。

### 备注

- 设定图是方向提案，不是最终美术；角色比例、细节、文案都可被推翻；
- 图中中文标签是概念说明，不是游戏内最终文案。

## [0.1.9] - 2026-11-04 08:21

### 新增

- **数值体系目录**：`docs-ai/design01/numbers/`，含 8 个文件（索引 + 总览/经济/塔/敌人/波次/地图/难度），覆盖当前游戏运行时的全部数值；
- **表格即源**：数值表用 `<!-- export: key -->` 标记；`tools/export_numbers.py` 从 Markdown 表格导出 `game/data/*.json`，`--check` 校验一致性；
- **数据驱动扩展**：评级阈值、波次 `prep`、补给塔升级产出/维修纳入 `balance`/`waves` 数据；补给塔升级不再是无效升级；
- `run.sh numbers` / `run.sh numbers-check` 入口。

### 变更

- `sim.gd`：评级阈值读 `balance`；波次准备时间读 `waves.prep`（缺省回退 balance）；补给塔按等级计算产出与维修；
- `data_loader.gd`：校验新增的 balance 字段；
- 测试增至 **37 项**：补充评级/波次 prep 数据检查、补给塔升级产出/维修检查；标准班仍为 B、保障度 40、击杀 59、漏过 9。

### 备注

- `game/data/*.json` 现在是导出物，不要手改；改数值请改 `numbers/` 表格后重跑导出；
- 数值仍是 v0.1 切片锁定值，不是最终平衡；真人试玩后再调。

## [0.1.8] - 2026-11-03 20:27

### 变更

- **Markdown 元数据改为 YAML frontmatter**：LiveBay 的 17 篇带元数据文档（项目 `README.md`、`docs-human/概念设定.md`、design01 的 14 篇 + README）统一使用 `title / doc_type / status / version / date / author / source / authority / scope / html / upstream / related` 字段；原先的引用块元数据已移除，避免预览时多行被合并；
- **HTML 生成器适配 YAML**：`tools/build_design_html.py` 读取 frontmatter，并把元数据渲染成页面顶部的结构化面板；HTML 阅读版 16 页已重新生成；
- 生成器与样式仍遵循 R-016 三态主题。

### 验证

- 17 个 YAML frontmatter 均通过 Ruby `YAML.safe_load` 解析；
- HTML 生成 16 页，R-016 检查 16/16 通过；
- 生成页面本地链接 520 个，0 失效。

## [0.1.7] - 2026-11-03 20:13

### 新增

- **design01 HTML 阅读版**：`docs-ai/design01/html/`，共 16 页（14 篇文档 + README + 索引），含左侧文档目录、本页目录、上一篇/下一篇、源 Markdown 入口；
- **共享样式与主题**：`assets/style.css` + `assets/theme.js`，系统 / 浅色 / 深色三态，默认系统，统一 `lrds-theme`；支持打印浅色、无 JS 阅读与移动端目录折叠；
- **生成器**：`tools/build_design_html.py` 从 Markdown 经 pandoc 生成 HTML；样式/脚本源在 `tools/design_html/`，生成物不要手改；
- 项目 README 与 design01 README 增加 HTML 阅读版入口。

### 验证

- `node design/tools/check_html_theme.ts docs-ai/design01/html/*.html`：16 个页面全部通过 R-016；
- 生成页面本地链接 520 个，0 失效；
- 浅色 / 深色 / 桌面 / 移动端截图检查通过。

## [0.1.6] - 2026-11-03 16:24

### 新增

- 实机演示视频 [`docs-ai/design01/shots/v0.1_gameplay.mp4`](docs-ai/design01/shots/v0.1_gameplay.mp4)：1280×720、30 FPS、H.264、约 50 秒、无音频；从第 1 波打到第 5 波，包含建造、故障停塔与结算；
- 视频封面 [`docs-ai/design01/shots/v0.1_gameplay_poster.png`](docs-ai/design01/shots/v0.1_gameplay_poster.png)，项目 README 增加可点击的演示入口。

### 修复

- **恢复 `main.gd` 的 `_process` 循环**：此前重构时被误删，导致场景能打开但模拟不推进；录制视频时发现，已修复并重新验证。

### 备注

- 视频由 Godot Movie Maker 录制 PNG 序列，再用本地 AVFoundation 编码为 H.264；没有加入音频；
- 录制用的临时 `--demo` 自动游玩代码已移除，仓库里只保留视频与封面。

## [0.1.5] - 2026-11-03 16:16

### 变更

- [11_待人类裁决清单](docs-ai/design01/11_待人类裁决清单.md) 的「裁决记录」增加「问题 / 原有选项」列，保留 D01–D16 的全部原始候选（含未采用项、人类补充与改判），最终选择单独成列，便于回顾；
- 清单升为 v0.5；只改记录格式，不改任何已裁决结论。

## [0.1.4] - 2026-11-03 16:14

### 变更

- 记录 P1 全部裁决：D06=200 年（第七代）、D07=双轨、D08=低报事故（只埋线索）、D09=弧形路径、D10=重试+可跳过复盘、D11=v0.1 L0 / v0.2 L1、D12=**买断+内购**、D13=2D 矢量/程序化、D15=叙事量中；
- [11_待人类裁决清单](docs-ai/design01/11_待人类裁决清单.md) 升为 v0.4：P0/P1 已清空，只剩 P2（D14/D17/D18）；
- 02 世界观落地 200 年、双轨、低报事故；05 社会系统同步双轨与低报事故；04 塔防标注弧形与失败处理；06 沉浸标注叙事量中；07/09 标注耦合阶段；08 标注 2D 矢量；10 增加「买断+内购」的商业模式边界；
- 00/01、design01 README、项目 README 与术语表同步裁决状态。

### 备注

- D12 的「内购」按既有非目标限定为**外观/扩展内容，不卖数值、不抽卡、不订阅**；具体内购品类后续再定。若人类要调整这个边界，改 D12 的补充说明即可；
- P2 只剩平台、更新节奏、语言三项，不阻塞当前垂直切片。

## [0.1.3] - 2026-11-03 15:32

### 新增

- **D04 裁决**：玩家身份定为 **C 无名岗位人**，不做固定姓名/外观；P0 已清空；
- **内部故障（C）落地**：新增敌人「故障」，从湾口沿外弧反向扩散，经过塔位时使该塔离线 2.5 秒，最多影响 2 座塔；不直接扣保障度，但会削弱防线；
- 第 4 波加入 1 个故障作为教学，第 5 波加入 1 个故障与外部压力叠加；
- HUD 增加「第 N 号塔故障」提示；故障塔改为暗色 + 红色警示环 + 「!」，故障本体用方形绘制。

### 变更

- 无头测试增至 **29 项**：新增「故障会停塔」「故障逃逸不扣保障度」断言；胜利路径仍可在 2 塔 + 补给/升级策略下完成，评级 B、保障度 40、击杀 59、漏过 9；
- 04/11/12/13、项目 README 与 design01 README 同步内部故障与 D04 的裁决状态。

### 备注

- 故障只实现「反向移动 + 经过塔位停塔」，暂无故障链扩散、维修小游戏或永久损坏；
- `docs-human/概念设定.md` 正文未改；D04 与 D03 的定义记录在 design01/11 与 05。

## [0.1.2] - 2026-11-03 14:15

### 变更

- 记录五项人类裁决：D01=B（有裂缝的善意）、D02=D（混合，首版 A+C）、D03=三生「生存/生活/生产」+ 慢好「慢+好」、D05=护卫兵 v0.1 / 护理师 v0.2、D16=垂直切片；
- 重写 [`docs-ai/design01/05_社会系统_慢好三生保障体系.md`](docs-ai/design01/05_社会系统_慢好三生保障体系.md)，按「生存/生活/生产」重排保障、配给、玩法接口与基调；
- 同步更新 00/01/02/03/04/06/07/08/10/12/13、design01 README 与项目 README 中的裁决状态、待裁决项与工程占位说明；
- [`docs-ai/design01/11_待人类裁决清单.md`](docs-ai/design01/11_待人类裁决清单.md) 升为 v0.2：新增「已裁决」与「裁决记录」，P0 只剩 D04。

### 备注

- D02 的 C（内部故障）尚未进入工程；当前 5 波仍全部是自然风险 A。下一步工程任务见 D02 与 [12 技术方案](docs-ai/design01/12_技术方案_Godot工程.md)；
- D03 的定义记录在 11 与 05；`docs-human/概念设定.md` 正文未改，是否把定义写进人类设定由人类决定。

## [0.1.1] - 2026-11-03 13:30

### 变更

- 统一项目文档中的术语：中文「NASA朋克」、英文「NASApunk」；
- 上游附录卷路径改为 `docs/retro-futurism/附录_NASA朋克卷/`；README、design01 与项目日志中的链接同步更新；
- 概念设定中的标准命名同步为「NASApunk / 附录_NASA朋克卷」，其余正文未改。

## [0.1.0] - 2026-11-03 13:24

### 新增

- **人类设定元数据**：`docs-human/概念设定.md` 补齐文档类型、版本、日期、来源、决策权、适用范围与关联链接；正文未改。
- **NASApunk 文集**：工作区 `docs/retro-futurism/附录_NASA朋克卷/` 建卷（9 篇 + README），作为本项目总体风格的上游参考。
- **策划文档集**：`docs-ai/design01/` 共 14 篇 + README：阅读指南、项目北极星、世界观、职业体系、塔防、社会系统、沉浸、放置、美术、联动、内容节奏、技术方案、待裁决清单、术语表；全部按「人类已定 / AI 候选 / AI 建议 / 工程占位 / 待裁决」标记。
- **Godot 工程**：`game/` 使用 Godot 4.7（GL Compatibility），数据驱动（6 个 JSON），模拟与视图分离；可玩闭环为 1 张月牙弧地图、7 个塔位、1 个示例职业、3 种塔、3 种敌人、5 波、建造/升级/出售/暂停/加速、胜负结算与最高记录。
- **测试与入口**：`game/tests/run_sim.gd` 24 项无头断言；`run.sh` 提供 run/editor/import/test/check；`HOME` 指向 `games/.godot-home/`。
- **画面留证**：`docs-ai/design01/shots/v0.1_combat.png`（程序化绘制，无外部美术）。

### 验证

- `./run.sh test`：24 项全部 PASS；胜利路径评级 B、保障度 56、击杀 61、漏过 7；无塔路径判定失败。
- `./run.sh check`：无头启动 180 帧，退出码 0，无脚本错误。
- 窗口化启动与截图确认：HUD、路径、塔位、敌人、光束、结算层均可显示。

### 备注

- 工程内所有中文名词与数值均为【工程占位】，不是设定定案；改设定优先改 `game/data/*.json`。
- 当前最高优先级待裁决：D01 基调、D02 敌人来源、D03「三生」定义、D05 第一职业、D16 范围；见 [`docs-ai/design01/11_待人类裁决清单.md`](docs-ai/design01/11_待人类裁决清单.md)。
- 尚未接入音频、正式美术、第二职业、沉浸/放置玩法与移动端适配。
