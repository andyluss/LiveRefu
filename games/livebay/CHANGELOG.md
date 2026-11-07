# LiveBay · 项目日志（CHANGELOG）

> 记录本项目的里程碑、关键决策与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)。
> 时间取该版本最后一个提交的作者时间（东八区，精确到分）；版本头时间与 tag 对齐。

## [0.1.123] - 2026-11-07 17:14

### 修复

- App 根 Control 设为 `MOUSE_FILTER_IGNORE`，不再拦截 GamePage 的塔位点击；
- 点击塔位现在能建造/选中；冒烟：slot 0 → 1 塔、selected_slot=0；
- 选塔效果增强：
  - 选中按钮改为橙色底 + `▶` 前缀；
  - 未选中按钮恢复纸色；
  - 塔位选中加橙色外环；已建塔选中显示「选中」；
- 增加倒计时：
  - 首波显示「首波倒计时 30s」；
  - 准备/整备 state 显示「准备 30s / 整备 18s」；
  - 波次文本保留波次进度。

### 验证

- 无头点击冒烟：塔位点击可建造；
- 首波倒计时/准备倒计时读取通过；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.122] - 2026-11-07 17:09

### 修复

- 游戏底栏提示文字改为深色 `ink`（不再白色低对比）；
- 字号 13→14；
- 提示文字上移到游戏区底部，并加半透明纸色背景条；
- 避免与底栏按钮文字重叠。

### 验证

- 无头 HUD 冒烟：提示色为深色，y=601；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.121] - 2026-11-07 17:05

### 新增

- 所有可关闭弹层右上角增加 `×` 按钮：
  - 地图、档案、合同、湾民日志、自由模式、候选、退出确认；
  - 结算层；
  - 逻辑与 `Esc` 一致，调用 `cancel_modal`；
- 检查单/故障是强制选择，不显示关闭按钮；
- 关闭按钮带 `关闭 (Esc)` 提示。

### 验证

- 地图弹层 `×`：关闭并恢复运行；
- 检查单：不显示 `×`，Esc/取消不会静默跳过；
- 结算层 `×`：关闭；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.120] - 2026-11-07 17:03

### 修复

- `Esc` 现在关闭当前可关闭的弹层；
- 覆盖地图、档案、合同、湾民日志、自由模式、候选、退出确认、结算；
- 检查单/故障是强制选择，`Esc` 只提示，不静默跳过；
- 无弹层时 `Esc` 仍用于清除选中；
- 操作提示补 `Esc 关层`。

### 验证

- 地图弹层 Esc：关闭并恢复运行；
- 退出确认 Esc：关闭；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.119] - 2026-11-07 16:58

### 修复

- App 根节点改为 Control，page_host 使用完整 rect；
- HomePage / LabPage 使用 `set_anchors_and_offsets_preset(FULL_RECT)`；
- 页面现在覆盖 1280×720 全屏，不再缩成小卡片；
- 主页与自由模式页增加全屏渐变背景；
- 冒烟尺寸：app/page 均为 1280×720。

### 验证

- 无头页面尺寸冒烟通过；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.118] - 2026-11-07 16:55

### 新增 / 优化

- 主页与自由模式页统一主题：
  - 深色页面、奶油字、青绿/橙色按钮；
  - 主页卡片、实验列表、筛选按钮样式统一；
  - 页面字体/颜色不再依赖默认 Godot 主题；
- 自由模式增加：
  - `capabilities` 白名单校验；
  - 覆盖前 `duplicate(true)`，不在共享数据上原地改；
  - `towers.disabled` 动态塔位，游戏内隐藏禁用塔；
  - 实验 HUD 提示前缀 `实验 · 名称`；
- 新增第 4 个实验「无补给外环」；
- 测试 103 不变（实验数量断言 4）。

### 验证

- `./run.sh test`：103/103；
- App 路由/退出确认/动态塔位冒烟通过；
- `./run.sh verify`：PASS 12 · FAIL 0；
- `tech/12` 更新为 App + Router + Pages 现行架构。

## [0.1.117] - 2026-11-07 16:48

### 新增

- 游戏退出确认新增「返回主页」：
  - 确认退出 / 返回主页 / 取消；
  - App 路由回 HomePage；直接游戏页提示无主页；
- 自由模式方案补充「复用 Sim/Data 的取舍」：
  - 优点：规则一致、修一处两边受益、数据管线复用、候选 diff 有意义；
  - 缺点：规则词汇受限、HUD 固定、覆盖冲突、标签失真；
  - 改进：Mode Adapter、capability、不可变覆盖、动态阵容、实验 HUD、黄金 trace；
- HUB 自由模式页增加取舍说明。

### 验证

- 退出确认冒烟：3 个按钮，返回主页路由通过；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.116] - 2026-11-07 16:44

### 重构

- 新增 `App` 路由器（`scenes/app.tscn`）：
  - `HomePage` 独立主页；
  - `LabPage` 独立自由模式页；
  - `GamePage` 当前游戏场景；
  - 页面切换使用 add/queue_free，不再用 overlay 模拟页面；
- 删除旧 `home_screen.gd` 覆盖层；
- GamePage 移除主页构建，接受 `launch_lab` 启动实验；
- `F1` 从游戏页回主页；`L` 从游戏页回实验页；
- 保留 App 外旧 overlay 路径作为直接游戏页 fallback；
- 新增 `./run.sh game`：直接进入游戏页，跳过主页，便于测试；
- 主页/实验页/游戏页生命周期分离；Home 不再依赖 HUD。

### 验证

- App 路由冒烟：home → game → home → lab → game(lab) 通过；
- 直接游戏页 headless 启动通过；
- `./run.sh test`：103/103；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.115] - 2026-11-07 16:29

### 文档

- HUB 新增「自由模式」Tab（`#lab`，位于概览右侧）：
  - 主页/入口/操作；
  - 3 个实验与标签筛选；
  - P1–P3 状态；
  - 候选/导出/导入路径；
  - 边界：不写主线、无脚本/在线；
- HUB 其他 Tab 序号顺延为 03–14；
- README 更新为 6 塔/7 敌/8 波/3 合同/12 卡/3 湾民/3 音乐；
- README 操作补 F1/Q/L/C/V；
- 自由模式方案文档同步实际实现。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过。

## [0.1.114] - 2026-11-07 16:25

### 新增

- 游戏场景顶栏增加「退出 (Q)」；
  - 弹出确认层：确认退出 / 取消；
  - 取消会恢复暂停前状态；
- 自由模式 P3：
  - 每个实验可「导出」到 `user://lab/exports/`；
  - 「导入实验」打开文件对话框，导入本地 JSON；
  - 导入时校验 schema/id/base/overrides；重复 id 覆盖内存列表；
  - 不写主线数据/存档；
- 测试 101→103。

### 验证

- `./run.sh test`：103/103；
- 无头 UI 冒烟：主页/退出确认取消/实验导出/导入/回主线通过；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.113] - 2026-11-07 16:20

### 新增

- 游戏主页：
  - 启动先进入「今晚，守哪一段？」；
  - 两个入口：主线班次 / 自由模式；
  - `F1` 随时回主页并暂停；
  - 主线入口继续当前班次，首次进入显示接班简报；
- 自由模式 P1：
  - `L` 打开外环试验场；
  - 3 个实验、主轴/难度筛选、JSON 覆盖；
  - 实验独立运行时/空 ShiftMemory，不写主线存档；
- 自由模式 P2：
  - 每个实验可「候选」；
  - 生成 diff 与 `user://lab/candidates/*.json`；
  - 候选不自动进入主线；
- 测试 99→101。

### 验证

- `./run.sh test`：101/101；
- 无头 UI 冒烟：主页/主线/实验浏览器/候选/实验/回主线通过；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.112] - 2026-11-07 16:10

### 新增（自由模式 P1）

- 游戏内按 `L` 打开「自由模式 · 外环试验场」；
- 3 个 JSON 实验方案：
  - 紧缩外环（hard / tower_defense）；
  - 维护环慢班（easy / idle）；
  - 湾口故障潮（extreme / fault）；
- 标签筛选：主轴 + 难度；
- 白名单覆盖：初始供能/保障度、敌人 HP/速度、波次数量、故障加成；
- 实验使用独立运行时与空 ShiftMemory，不写主线存档；
- 实验浏览器支持试玩、返回主线；
- 新增 `game/scripts/lab/lab_loader.gd` 与 `game/data/lab/scenarios/*.json`；
- 测试 95→99。

### 边界

- P2 候选/diff/导入导出未实现；
- 不支持脚本/MOD/在线分享；
- 实验仍使用主线地图与塔/敌数据，只做白名单覆盖。

### 验证

- `./run.sh test`：99/99；
- 无头 UI 冒烟：实验浏览器/筛选/进入实验/返回主线通过。

## [0.1.111] - 2026-11-07 15:12

### 文档

- 新增 `lab/00_自由模式方案.md`：
  - 自由模式定位为并行实验场，不做第二套主线；
  - 实验方案 = 元数据 + 标签 + 白名单 JSON 覆盖；
  - 标签：主轴/难度/主题/机制/时长/保真/状态；
  - 独立存档、候选 diff、人类评审后进入主线；
  - P1 本地实验场 + P2 候选晋升，暂不做在线/脚本；
- design01 索引增加入口；HUB 暂不加内容。

### 验证

- `check_links --sub games/livebay`：0 失效；
- `briefing-check`：通过。

## [0.1.110] - 2026-11-06 16:22

### 文档

- HUB「概览」右侧新增「存续力」Tab（`#sustainability`）：
  - 3.15 / 5（C+，约 63/100）；
  - 十二维评分；
  - 存续资产、脆弱点；
  - 三种存续情景；
  - 90 天计划；
  - 链接完整评估文档。
- HUB 其他 Tab 序号顺延为 03–13。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过。

## [0.1.109] - 2026-11-06 16:16

### 文档

- 新增 `assessments/00_工程力评估.md`：3.93 / 5（B+），架构/数据/测试/性能/发布；
- 新增 `assessments/01_设计力评估.md`：3.70 / 5（B），主题/循环/系统/内容/留存；
- 新增 `assessments/02_存续力评估.md`：3.15 / 5（C+），范围/资金/单点/发布/缓冲；
- 三份均含评分口径、债务、下一步与边界；
- design01 索引增加入口；HUB 内容暂不改。

### 验证

- `check_links --sub games/livebay`：0 失效；
- `briefing-check`：通过。

## [0.1.108] - 2026-11-06 13:58

### 重构

- 公共 UI 常数抽到 `shared/constants.gd`：
  - `PALETTE`；
  - `TOWER_ORDER`；
  - `VIEW_SIZE` / `TOP_BAR_H` / `BOTTOM_BAR_H`；
- main / HUD / renderer / command / UI presenter 统一引用，删除 5 处重复定义；
- main 226→**210** 行，继续只作为入口。

### 验证

- `./run.sh verify`：PASS 12 · FAIL 0；
- 无头 UI 冒烟：6 塔按钮/地图/湾民日志通过；
- R-016：60 个页面通过。

## [0.1.107] - 2026-11-06 13:52

### 重构

- `main.gd` 548→**226** 行，定位为入口：
  - 启动/数据/音频/HUD/控制器连线；
  - 每帧驱动 Runtime；
  - 输入转交 InputController；
  - 绘制入口。
- 新增 `presentation/game_command_controller.gd`：建造/开波/升级/出售/暂停/倍速/切图/合同/检查单/故障/重开；
- 新增 `presentation/game_feedback.gd`：模拟信号 → 音效/音乐/toast/结算/报告；
- 新增 `presentation/game_ui_presenter.gd`：ReadModel → HUD 文本/按钮状态；
- Session 连接 Feedback，Runtime 事件连接 CommandController；
- 修复合同 `energy_delta` 未作用到职业初始供能的问题（审计班 90→80）。

### 验证

- `./run.sh test`：95/95；
- `./run.sh verify`：PASS 12 · FAIL 0；
- 无头 UI 冒烟：地图/合同/湾民/切图/重开通过；
- R-016：60 个页面通过。

## [0.1.106] - 2026-11-06 13:50

### 新增

- 12 个环境/故障音：ambient_hum / wind / dock / alarm，fault_spark / short / arc / lock，ui_hover / confirm，wave_warning，result_stamp；
- 按 `V` 打开「湾民 · 值班日志」，可回看阿岚/老周/小满完整台词；
- 主游戏在准备/切图/故障/结算时播放对应环境音；
- 湾民日志是独立可关闭层，不是分支对话；
- 内容文档同步。

### 验证

- `./run.sh test`：95/95；
- `./run.sh verify`：PASS 12 · FAIL 0；
- GUIDE 重建。

## [0.1.105] - 2026-11-06 13:48

### 新增

- 3 名湾民与波次台词：
  - 阿岚（调度员）：第 2/6 波；
  - 老周（焊工）：第 3/7 波；
  - 小满（湾民学生）：第 4/8 波；
- 3 段循环音乐：准备/交战/结算；
- 12 个环境/故障音：hum/wind/dock/alarm + spark/short/arc/lock 等；
- 新音效：resident、ambient_alarm；
- AudioDirector 支持 `play_music` / `stop_music` / `set_muted`；
- 主游戏按状态切换音乐，静音同时停音乐；
- 按 `V` 打开「湾民 · 值班日志」，三名湾民的完整台词可回看；
- `residents.json` 纳入 MissionPack；
- 测试 94→95。

### 边界

- 湾民日志是台词/档案层，不是分支对话；
- 音乐为程序生成占位，不是最终配乐。

### 验证

- `./run.sh test`：95/95；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.104] - 2026-11-06 13:45

### 新增（v0.2 核心内容）

- 塔 4→6：
  - 焊补塔（低产出、高维修）；
  - 信标塔（标记目标 +25% 伤害，2s）；
- 敌人 5→7：
  - 护盾载体（受到伤害 ×0.65）；
  - 分裂残片（死亡分裂为 2 个碎片）；
- 波次 5→8/图：三张地图各加 3 波，加入新塔/敌与故障组合；
- 检查单/故障卡 2→12：默认班次可触发；
- 班次合同 3：稳定班 / 审计班 / 故障潮；`C` 打开合同，主界面提示更新；
- HUD 塔按钮扩到 6，热键 `1–6`；
- `procedures.json` / `contracts.json` 纳入 MissionPack；
- 无头测试 88→94；
- 数值表、GUIDE、模拟器、trace、性能基线同步。

### 边界

- 3 名湾民、3 段音乐、12 个环境音尚未实现；
- 8 波平衡是 headless 标准班结果，仍需人类试玩；
- 合同/卡牌的文本与后果需要下一轮内容验证。

### 验证

- `./run.sh test`：94/94；
- `./run.sh pack-check`：通过；
- `./run.sh playtest`：三图可完成（B/S/A）；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.103] - 2026-11-06 13:33

### 文档

- 新增 `content/00_内容厚度建议.md`：
  - 定义决策/组合/情境/叙事/复玩五种厚度；
  - 当前基线：1 职业 / 3 图 / 5 波 / 4 塔 / 5 敌；
  - 推荐 v0.2「三班制」：3 合同 / 6 塔 / 7 敌 / 8 波 / 12 卡 / 3 湾民 / 3 段音乐；
  - 内容矩阵、版本切片、验收指标、不做什么、拍板项；
  - 明确“先做厚一班，再做 L2/L3”；
- design01 索引与 HUB 设计力页增加入口。

### 验证

- `check_links --sub games/livebay`：0 失效；
- `briefing-check`：通过；
- HUB R-016：通过。

## [0.1.102] - 2026-11-06 13:25

### 文档

- HUB「概览」右侧新增「设计力」Tab（`#design`）；
- 设计力自评：3.59 / 5（B，约 72/100），L2+ 垂直切片；
- 12 个维度：主题、叙事、循环、系统、数值、地图、UX、美术、留存、可访问性、内容、设计流程；
- 设计承诺 vs 当前可玩物：岗位感、城市系统、夜班节奏、故障选择、放置养成；
- 全设计覆盖面、五个设计债、下一步；
- HUB 其他 Tab 序号顺延为 03–12。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过；
- HUB 11 facts：通过。

## [0.1.101] - 2026-11-06 13:17

### 性能基准扩展

- `perf` 增加：
  - CPU 绘制命令生成（1,000 帧、176 draw calls/帧）；
  - 静态内存：标准班、长跑、100–2,000 实体；
  - 音频驱动/通道/混音率/输出延迟（headless Dummy）；
- `game_renderer.gd` 的 canvas 改为接口式 `Variant`，允许性能基准用 FakeCanvas 测 CPU 绘制成本；
- 性能报告补齐渲染/GPU/音频/内存边界；
- 阈值：标准班 p95 <1 ms、2,000 实体 p95 <10 ms、地图 p95 <5 ms、长跑 <1 s、CPU draw p95 <1 ms。

### 结果

- 5 波 p95：0.099 ms；
- 2,000 实体 p95：8.178 ms（max 25.091 ms 尖峰）；
- 长跑：196.86 ms；
- 地图加载 p95：≤4.311 ms；
- CPU draw p95：0.092 ms；
- 静态内存：约 23.9 → 26.16 MB（2,000 实体）。

### 边界

- GPU 帧时间未测（headless 无真实 adapter）；
- 音频为 Dummy，未测真实输出；
- 不伪造 GPU/音频数字。

### 验证

- `./run.sh perf`：通过；
- `./run.sh verify`：PASS 12 · FAIL 0。

## [0.1.100] - 2026-11-06 13:11

### 修复

- `mission_pack.json` 从“单 bay01 清单”升级为 **schema 2 地图目录**：
  - `default_map` 明确默认入口；
  - `packs` 下 bay01/02/03 各有独立 `pack_id`、`map_id`、`version`、`hash`；
- `DataLoader.load_mission_pack(map_id)` 按 map_id 选择条目并校验归属，不再把 bay01 清单套到 bay02/03；
- 旧 schema 1 只允许 bay01，其他地图明确报错；
- `MissionPack` schema 2；`pack_id`/`map_id` 与地图一致；
- 新增 5 项跨地图 pack 断言，测试 83→88；
- 新增技术说明 `tech/19_任务包目录与跨地图语义.md`；
- HUB 数据/测试行同步更新。

### 验证

- `./run.sh pack-check`：三图目录一致；
- `./run.sh test`：88/88；
- `./run.sh verify`：PASS 12 · FAIL 0；
- HUB 11 facts：通过。

## [0.1.99] - 2026-11-06 13:08

### 新增

- `./run.sh perf` 性能基准：
  - 5 波标准班帧步进；
  - 100 / 500 / 1,000 / 2,000 实体压力；
  - 18,000 帧（5 分钟）长跑；
  - 三张地图加载；
  - 输出 `docs-ai/design01/performance/bench.json`；
- 性能基线文档：`docs-ai/design01/performance/README.md`；
- HUB 工程力页性能分 2.5→3.0，综合 3.85→3.88（78/100）；
- README / design01 索引增加性能入口。

### 关键结果（headless）

- 5 波 p95：0.077 ms/step；
- 2,000 实体 p95：6.3 ms/step；
- 5 分钟长跑：187.6 ms wall；
- 地图加载 p95：≤0.97 ms。

### 验证

- `./run.sh perf`：通过；
- `./run.sh briefing-check`：通过；
- HUB R-016：通过。

## [0.1.98] - 2026-11-06 13:07

### 重构

- `main.gd` 从 600 行继续降到 498 行；
- 新增 `presentation/game_input_controller.gd`：
  - InputEvent → 语义动作；
  - 悬停/点击/选塔/开波/暂停/地图/档案/重开/升级/出售；
- 新增 `presentation/game_session_controller.gd`：
  - 数据/运行时/模拟的创建、重开、切图、释放；
  - 信号连接/断开；
  - 班次记忆与地图加载；
- Main 保留 UI 刷新、信号反馈、绘制与少量命令包装；
- HUD/流程/输入/会期四层分离。

### 验证

- `./run.sh verify`：PASS 12 · FAIL 0；
- 无头 UI 冒烟：HUD/地图切换/重开通过；
- R-016：60 个受管页面通过。

## [0.1.97] - 2026-11-06 13:01

### 重构

- `main.gd` 收口：966 → 600 行；
- 新增 `presentation/game_hud.gd`（HUD Presenter）：
  - 顶栏/底栏/结算层/检查单层/广播横幅；
  - 按钮与 label 构建、样式与回调连接；
- 新增 `presentation/game_flow_controller.gd`（Flow Controller）：
  - 地图选择、班次档案、接班简报；
  - 检查单、故障选择、结算与报告按钮；
  - 档案分页/筛选状态；
- Main 保留输入、命令、模拟生命周期与信号路由；
- HUD/流程 UI 冒烟测试通过。

### 验证

- `./run.sh verify`：PASS 12 · FAIL 0；
- R-016：60 个受管页面通过；
- 无头 UI 冒烟：HUD/地图/档案/检查单/结算均可见。

## [0.1.96] - 2026-11-06 12:56

### 新增

- `./run.sh verify`：一键全量验收；
  - test / expansions-check / editor-test / playtest；
  - numbers-check / pack-check；
  - flow-check / simulator-check / briefing-check；
  - 无头启动 180 帧；
  - Markdown 内部链接；
  - R-016（设计文档 + briefing + flows + simulator + 工作区 HUB）。
- 失败项继续跑完，最后汇总 PASS/FAIL；
- HUB 工程力页更新“一键验收已实现”。

### 验证

- `./run.sh verify`：**PASS 12 · FAIL 0**；
- R-016：60 个受管页面通过。

## [0.1.95] - 2026-11-06 12:14

### 文档

- HUB「概览」右侧新增「工程力」Tab（`#engineering`）；
- 工程力自评：3.85 / 5（B+，约 77/100），L2+ 垂直切片；
- 九个维度评分：架构、数据、测试、文档、工具、维护、性能、可观测、交付；
- 评分依据表：证据 + 为什么不是满分；
- 下一步：全量 verify、性能基准、收口 main.gd、内容厚度；
- HUB 其他 Tab 序号顺延为 03–11。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过；
- HUB 11 facts：通过。

## [0.1.94] - 2026-11-05 23:10

### 新增（P4）

- 数值沙盘新增「P4 离散小模拟」：
  - 固定 1/60 s 步长；
  - 敌人沿路径移动；
  - 塔索敌/单体/范围/减速；
  - 故障反向移动与停塔；
  - 漏过/供能/每波清空/评级；
  - 结果表与逐波统计；
- 仍使用当前地图、塔位和塔等级；
- README / HUB / tech18 状态同步；
- 版本 0.1.94。

### 验证

- 沙盘 R-016：通过；
- 沙盘内联 JS：语法通过；
- `simulator-check`：通过。

### 边界

- P4 是近似离散模拟，不是完整 Godot 复刻；
- 逐帧目标选择、相邻塔降级等细节仍以 Godot 为准。

## [0.1.93] - 2026-11-05 23:09

### 新增（P3）

- `./run.sh sim-trace`：导出三张地图的 Godot 标准场景 `traces.json`；
- trace 包含 grade / 保障度 / 击杀 / 漏过 / 建造花费 / 时长，以及路径长度、塔位、波数、敌人总数、波次 HP；
- 数值沙盘内置 trace，也支持导入新的 `traces.json`；
- 沙盘新增「Godot 对账」区：静态事实逐项比对；逐局结果仅显示 Godot 参考值，不冒充解析预测；
- `traces.json` 纳入模拟器生成检查；
- HUB 模拟器 Tab 与 README 更新。

### 验证

- `./run.sh sim-trace`：通过；
- `./run.sh simulator-check`：通过；
- 沙盘 R-016：通过；
- 沙盘内联 JS：语法通过。

### 边界

- P3 对账的是静态事实 + Godot 参考；解析沙盘不产生逐局 grade；
- P4（离散事件小模拟）仍未实现。

## [0.1.92] - 2026-11-05 23:00

### 新增

- HUB 在「概览」右侧增加「模拟器」Tab（路由 `#simulator`）；
- 概要介绍数值沙盘：
  - 能调地图/波次/塔位/等级/敌速；
  - 能看覆盖、DPS、波次压力、供能；
  - 公式口径与边界；
  - 链接模拟器 HTML、README、tech/18 方案与生成命令；
- HUB 其他 Tab 序号顺延为 03–10。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过；
- 模拟器 HTML 链接存在。

## [0.1.91] - 2026-11-05 22:52

### 新增

- `docs-ai/design01/simulator/index.html`：离线数值沙盘（P1–P2）；
- 支持地图/波次/塔位/等级/敌速调整；
- 实时计算覆盖弦长、DPS、波次压力、供能与地图修正；
- 场景写入 URL hash，可刷新/分享恢复；
- `./run.sh simulator` / `simulator-check`；
- `simulator/README.md` 说明公式与边界；
- HUB / README / design01 索引增加入口；
- 沙盘纳入 pre-commit 过期检查。

### 边界

- 解析估算，不是完整战斗模拟；
- P3 `sim-trace` 对账尚未实现；
- 不修改游戏数据、不启后端。

## [0.1.90] - 2026-11-05 22:42

### 文档

- 新增 `tech/18_HTML数值模拟器方案.md`：
  - 四种路线：纯解析计算器 / Godot Web / 混合 C-lite / 本地服务；
  - 推荐 C-lite：浏览器数值沙盘 + Godot trace 对账；
  - 第一版范围、界面、数据流、验收、风险、拍板项；
  - 明确“不是浏览器版游戏”；
- design01 索引增加入口。

### 验证

- `check_links --sub games/livebay`：0 失效；
- HUB 11 facts：通过（版本 0.1.90）。

## [0.1.89] - 2026-11-05 22:30

### 新增

- `flows/swimlane_flow.md/html`：玩家/UI、Runtime/Clock、Sim/Domain、扩展/内容四条泳道；
- `extra_flows.html` 升级为五图总览；
- HUB「流程图」Tab 增加泳道图与 Mermaid 链接；
- flows README 与 design01 索引同步。

### 验证

- `flow-check`：通过；
- 流程图 R-016：7/7；
- HUB + GUIDE R-016：2/2。

## [0.1.88] - 2026-11-05 22:06

### 重构

- `tools/build_extra_flows.py` 合并进 `tools/build_flow.py`；
- 一个生成器现在负责：
  - 一局总状态机；
  - 玩家操作、波次、L1、数据四张补充图；
  - `extra_flows.html` 总览；
- `./run.sh flow` / `flow-check` 只调用一个脚本；
- pre-commit、flows README、生成页署名同步更新。

### 验证

- `./run.sh flow-check`：通过；
- 所有流程图生成物与代码一致；
- R-016：6/6。

## [0.1.87] - 2026-11-05 22:01

### 修复

- `build_extra_flows.py` 现在为四张补充图分别生成独立 HTML：
  - `player_flow.html`
  - `wave_flow.html`
  - `l1_flow.html`
  - `data_flow.html`
- 每页自包含 SVG、三态主题、Mermaid 链接与四图导航；
- `extra_flows.html` 的条目补上单页链接；
- HUB 中四张图的链接现在都有实际文件。

### 验证

- `./run.sh flow-check`：通过；
- 流程图 R-016：6/6；
- 四张补充 HTML 的 JS 语法检查：通过。

## [0.1.86] - 2026-11-05 21:57

### 变更

- HUB 的「流程图」Tab 移到「概览」右侧，成为第 2 个 Tab；
- 所有 Tab 增加 URL 路由：
  - `#overview` / `#flow` / `#run` / `#status` / `#decisions`
  - `#content` / `#architecture` / `#media` / `#risks`
- 支持刷新直达、复制链接、浏览器前进/后退；
- 兼容旧的 `#p1` … `#p9` 链接；
- 键盘左右方向键 / Home / End 可切换 Tab；
- `file://` 等不允许 pushState 的环境回退到 hash。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过；
- HUB JS 语法检查通过。

## [0.1.85] - 2026-11-05 21:55

### 文档

- HUB 新增「流程图」Tab：
  - 整合静态流程图方法：四类元素、四种静态化方法、读图方式、常见错误、边界；
  - 链接总状态机、玩家操作、波次、L1、数据到 MissionPack、四图总览；
  - 链接各图的 Mermaid / Markdown 版本；
  - 标注 `./run.sh flow` / `flow-check` 与 Graphviz 依赖。

### 验证

- `briefing-check`：通过；
- HUB R-016：通过；
- 测试 83/83 不变。

## [0.1.84] - 2026-11-05 21:48

### 新增

- `flows/` 增加四张补充流程图：
  - 玩家操作流程；
  - 波次生命周期；
  - L1 检查单/故障/记录；
  - 数据到 MissionPack；
- `extra_flows.html`：四图总览，Graphviz 预渲染 SVG；
- `tools/build_extra_flows.py`；
- `./run.sh flow` / `flow-check` 同时生成/校验总图与补充图；
- HUB/README/design01 索引增加入口。

### 验证

- `flow-check`：通过；
- 流程图 R-016：2/2；
- HUB + GUIDE R-016：2/2。

## [0.1.83] - 2026-11-05 21:40

### 新增

- `docs-ai/design01/flows/`：
  - `README.md`：静态流程图方法；
  - `game_flow.md`：Mermaid 状态图 + 迁移表；
  - `game_flow.html`：自包含 SVG 流程图与方法卡片；
- `tools/build_flow.py`：从状态/命令/事件 + 迁移模型生成；
- `./run.sh flow` / `./run.sh flow-check`；
- HUB/README 增加流程图入口。

### 验证

- `flow-check`：通过；
- 流程图 R-016：1/1；
- HUB + GUIDE R-016：2/2。

## [0.1.82] - 2026-11-05 18:47

### 新增

- 地图修正 `modifiers`：
  - bay02：供能 -15、最大保障度 -10、敌速 ×1.15、塔伤 ×0.80；
  - bay03：供能 +10、最大保障度 -15；
- `Sim` 应用地图修正；
- `TowerModule` / `EnemyModule` 支持地图伤害与速度倍率；
- 新增 `./run.sh playtest`：三图基础策略无头试玩；
- 文档补全地图修正与试玩结果。

### 试玩

| 地图 | grade | 保障度 | 击杀 | 漏过 | 时长 |
| --- | --- | ---: | ---: | ---: | ---: |
| bay01 | C | 32 | 61 | 10 | 165.5 s |
| bay02 | S | 85/90 | 90 | 1 | 316.3 s |
| bay03 | A | 69/85 | 58 | 2 | 170.6 s |

### 验证

- `./run.sh test`：83/83；
- `./run.sh playtest`：三图均完成；
- `./run.sh briefing-check`：通过；
- `numbers-check`：通过。

## [0.1.81] - 2026-11-05 18:42

### 文档

- 重写 `numbers/04_波次数值.md`：
  - 增加三图波次总览；
  - 补齐 bay02 / bay03 的预算、节奏、故障投放；
  - 修正 bay01 旧的时长与预算细节；
  - 增加三图横向对比；
  - 标出 bay02 “偏长，待压缩”与 bay03 “偏紧”的不同问题；
  - 增加验证边界与按地图的调参旋钮。

### 验证

- `./run.sh numbers-check`：通过；
- `./run.sh briefing-check`：通过；
- `check_links --sub games/livebay`：0 失效。

## [0.1.80] - 2026-11-05 18:40

### 新增

- 三张地图使用各自的波次表：
  - `waves.json`（bay01）；
  - `waves_bay02.json`（中环维护环：91 敌 / 3182 HP）；
  - `waves_bay03.json`（湾口对接臂：60 敌 / 2062 HP）；
- `numbers/04_波次数值.md` 增加 map02/map03 波次表与预算；
- `export_numbers.py` 支持多波次表；
- `DataLoader` 按 `map_id` 加载对应波次；
- 无头断言 81 项。

### 验证

- `./run.sh numbers-check` / `pack-check`：通过；
- `./run.sh test`：81/81；
- `./run.sh check`：退出码 0；
- `./run.sh briefing-check`：通过；
- 默认 bay01 标准班仍 B/40/60/9。

## [0.1.79] - 2026-11-05 18:37

### 文档

- 重写 `numbers/05_地图与塔位.md`：
  - 增加三图速览；
  - 补齐 bay02 / bay03 的路径、塔位、基地与覆盖率；
  - 增加三图对比（路径长度、平均距离、强位/弱位）；
  - 修正原有重复章节编号；
  - 增加地图选择、验收与边界。

### 验证

- `./run.sh numbers-check`：通过；
- `./run.sh briefing-check`：通过；
- R-016：51/51。

## [0.1.78] - 2026-11-05 18:35

### 新增

- 第三张地图「湾口对接臂」（bay03）：8 点短路径、5 个塔位；
- `numbers/05_地图与塔位.md` 增加 map3 表格；
- `export_numbers.py` / `DataLoader` 支持第三张图；
- HUB / GUIDE / README 更新为 **3 图 / 4 塔 / 5 敌**；
- 无头断言 79 项。

### 验证

- `numbers-check` / `pack-check`：通过；
- `./run.sh test`：79/79；
- `./run.sh check`：退出码 0；
- `./run.sh briefing-check`：通过；
- R-016：51/51。

## [0.1.77] - 2026-11-05 18:32

### 新增

- 第二张地图「中环维护环」（bay02）：27 点回环维护路径、9 个塔位；
- `numbers/05_地图与塔位.md` 增加 map2 表格；
- `export_numbers.py` 支持多地图导出；
- `DataLoader` 加载 `maps` 字典与 `map_id`，默认 bay01；
- 顶部「地图 (G)」切换地图，切换会重开一班，保留接班记录与低报 carry；
- HUB / GUIDE / README 更新为 **2 图 / 4 塔 / 5 敌**；
- 无头断言 77 项。

### 验证

- `numbers-check` / `pack-check`：通过；
- `./run.sh test`：77/77；
- `./run.sh check`：退出码 0；
- `./run.sh editor-test`：通过；
- `./run.sh briefing-check`：通过；
- R-016：51/51。

## [0.1.76] - 2026-11-05 18:30

### 新增

- 新塔「牵引锚」：55 供能，范围强减速，低伤害；
- 新敌人「装甲片」：60 HP、慢速、漏过 16，进入第 4 波；
- 单位数更新为 **4 塔 / 5 敌**；无头断言 75 项；
- 数值源 `numbers/`、`game/data`、MissionPack、HUB、GUIDE 同步；
- 标准班结果更新为 **B / 40 / 60 击杀 / 9 漏过**。

### 验证

- `./run.sh numbers-check`：通过；
- `./run.sh test`：75/75；
- `./run.sh editor-test`：通过；
- `./run.sh expansions-check`：34/34；
- `./run.sh briefing-check`：通过。

## [0.1.75] - 2026-11-05 18:22

### 文档结构

- `tech/00_可插拔扩展架构.md` 更名为 `tech/17_可插拔扩展架构.md`；
- HTML 页与生成器/合并器同步为 `tech/17_可插拔扩展架构.html`；
- 更新 expansions、11、16 的引用与导航。

### 验证

- design01 HTML R-016：49/49；
- `check_links --sub games/livebay`：0 失效；
- briefing HUB 11 facts 通过。

## [0.1.74] - 2026-11-05 18:16

### 新增

- HUB 标题旁增加「玩法说明 GUIDE」与「design01 文档」入口；
- design01 入口链接到 `docs-ai/design01/html/index.html`。

### 验证

- `./run.sh briefing-check`；
- HUB + GUIDE R-016；
- HUB 11 个 fact 对账。

## [0.1.73] - 2026-11-05 18:12

### 文档结构

- 艺术设定图移入 `docs-ai/design01/art/images/`：
  - 6 张 PNG + 6 个 SVG；
  - `make_art.py` / `render_art.sh` 输出路径同步；
  - `art/README.md` 图片引用改为 `images/...`。
- 可插拔扩展架构从 `expansions/00_可插拔扩展架构.md` 移到 `tech/00_可插拔扩展架构.md`：
  - 同步 expansion/11/16 的引用；
  - HTML 生成器/合并器与导航同步；
  - 生成页移到 `html/tech/00_可插拔扩展架构.html`。
- HTML 重新生成：49 个受管页面。

### 验证

- `./run.sh briefing-check`：通过；
- HUB + GUIDE R-016：2/2；
- design01 HTML R-016：49/49；
- `check_links --sub games/livebay`：0 失效。

## [0.1.72] - 2026-11-05 18:11

### 变更

- `briefing/build_guide.py` → `briefing/build_guide.ts`；
- `briefing/check_hub.py` → `briefing/check_hub.ts`；
- 两个脚本可直接用 Node 24+ 运行（`.ts` 类型剥离），支持 `--check` / `--self-test`；
- `run.sh`、pre-commit、briefing README 同步改为 `node`；
- 修复 GUIDE 锚点跳转被 sticky 顶栏遮住：`section[id]` 增加 `scroll-margin-top`，移动端用更大偏移。

### 验证

- `node briefing/build_guide.ts --check`；
- `node briefing/check_hub.ts`；
- `node briefing/check_hub.ts --self-test` 9/9；
- HUB + GUIDE R-016 2/2。

## [0.1.71] - 2026-11-05 17:47

### 修复

- GUIDE 左上标题改为回到页面顶部（`#top`）；
- 另加独立「项目 HUB ↗」链接，保留回 HUB 的入口；
- GUIDE 顶栏与正文继续统一 1180px 容器。

### 验证

- `./run.sh briefing-check`；
- R-016：HUB + GUIDE；
- GUIDE 与数据一致。

## [0.1.70] - 2026-11-05 17:43

### 修复

- HUB 三态主题按钮组移到顶栏最右（时间戳在左，按钮组在右）；
- GUIDE 顶栏与正文统一为 1180px 容器，左右内边距一致；
- GUIDE 左上标题明确链接回 HUB，并补 `title` / `aria-label`。

### 验证

- `./run.sh briefing-check` 通过；
- HUB + GUIDE R-016 2/2；
- GUIDE 与数据一致。

## [0.1.69] - 2026-11-05 17:39

### 新增

- `briefing/` 导览层：
  - `HUB.html`：项目状态、决策、玩法、架构、素材、风险与下一步；
  - `GUIDE.html`：从 `game/data/*.json` 生成的第一次上手说明；
  - `theme.css` / `theme.js`：HUB/GUIDE 三态主题；
  - `build_guide.py`：GUIDE 生成与 `--check`；
  - `check_hub.py`：11 个 `data-fact` 对账 + 素材存在性检查。
- `./run.sh briefing` / `./run.sh briefing-check`；
- HUB 数字从工程现读：地图/塔/敌人/波次/塔位/职业/变体/测试/扩展检查/文档页/版本；
- GUIDE 的塔、敌人、波次、地图、资源全部来自数据，禁止手改。

### 验证

- `build_guide.py --check`：通过；
- `check_hub.py`：通过（11 facts / 素材）；
- `check_hub.py --self-test`：9/9；
- R-016：HUB + GUIDE 通过；
- 游戏 73/73、扩展 34/34 保持不变。

## [0.1.68] - 2026-11-05 14:00

### 文档结构

- 技术文档移入 `docs-ai/design01/tech/`：
  - `12_技术方案_Godot工程.md`
  - `15_专用游戏编辑器方案.md`
  - `16_模块化技术架构_NASApunk.md`
- 艺术与音频文档移入 `docs-ai/design01/art/`：
  - `08_美术与音频方向.md`
- 同步更新：
  - 文档索引、规则引用、expansions 引用、根 README、NASApunk 上游引用；
  - HTML 生成器/合并器路径；
  - `06_实现对照与验收` 的文档地图。
- HTML 重新生成：49 个受管页面。

### 验证

- `python3 tools/check_links.py --sub games/livebay`：0 失效；
- `python3 tools/check_links.py --sub docs/retro-futurism`：0 失效；
- R-016：49/49；
- 游戏测试 73/73、扩展 34/34（本次未改运行时代码）。

## [0.1.67] - 2026-11-05 13:56

### 新增

- 10 个程序生成短音效：UI、建造、升级、出售、检查单、故障、降级、广播、胜利、失败；
- `AudioDirector` 4 通道音效池；
- HUD 事件接入音效：
  - 建造/升级/出售；
  - W4 检查单、W5 故障；
  - 广播、塔降级；
  - 结算胜负。
- `M` 切换静音，状态用 toast 提示。

### 文档

- `expansions/06_实现对照与验收` 增加音效映射；
- 已知缺口从「没有音效」改为「没有音乐/音量滑杆」。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 34/34；
- `./run.sh compare` A/B/C 正常；
- HTML R-016 49/49。

## [0.1.66] - 2026-11-05 13:54

### 新增

- `./run.sh compare` 增加 `--json` / `--csv` 输出；
- A/B/C preset 增加 `choices`：
  - A：W4 review / W5 isolate；
  - B：W4 custom / W5 isolate；
  - C：W4 sign / W5 bypass；
- 对比表增加 W4/W5 列，当前结果：
  - A B/40/61/9；
  - B B/40/59/9；
  - C C/34/59/10。
- 新增 `expansions/06_实现对照与验收.md`：设计文档 → 代码 → 测试 → 当前缺口的映射。

### 文档

- 回答「功能设计文档在哪里」：`expansions/00–05` + `14` + `16`；实现映射见 `expansions/06`；
- HTML 阅读版增加 `06` 页；R-016 49/49。

### 验证

- `./run.sh test` 73/73；
- `./run.sh expansions-check` 34/34；
- `./run.sh compare` 输出 A/B/C 差异；
- `./run.sh check` 退出码 0；
- `./run.sh editor-test` 通过。

## [0.1.65] - 2026-11-05 13:52

### 新增

- `./run.sh compare`：同一张图、同一命令脚本，跑 A/B/C 三个 L1 变体；
- 输出 grade / integrity / kills / leaked / energy / duration；
- 使用标准班建造策略，结果可读；
- README / expansions README / 架构文档同步。

### 验证

- `./run.sh compare`：A/B/C 均 B / 40 / 59 / 9；
- `./run.sh test` 73/73；
- `./run.sh expansions-check` 34/34；
- HTML R-016 48/48。

## [0.1.64] - 2026-11-05 13:51

### 新增

- 班次档案筛选：全部 / 低报 / 如实 / 按惯例；
- 筛选与分页组合：筛选后重新计算页数；
- 无结果时显示「没有符合条件的班次」；
- `expansions-check` 增至 **34 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 34/34；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

## [0.1.63] - 2026-11-05 13:50

### 新增

- 班次档案分页：每页 5 班，共最多 10 班；
- 「上一页 / 下一页」按钮；
- 档案页显示当前页码与总页数；
- `expansions-check` 增至 **33 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 33/33；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

## [0.1.62] - 2026-11-05 13:49

### 新增

- 停班审计从「下一班」改为持续 **2 班**；
- `ShiftMemory.audit_remaining` 持久化在最近班次记录中；
- 审计期间即使如实记录，也要跑完剩余审计班数；
- 审计剩余班数显示在简报与广播；
- `expansions-check` 增至 **32 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 32/32；
- `./run.sh editor-test` 通过；
- baseline 仍 B/40/59/9。

## [0.1.61] - 2026-11-05 13:48

### 新增

- 班次档案保留最近 **10 班**（原 3 班）；
- 停班审计增加 **下一班准备时间 -5s**（与禁用旁路、故障 +Ns 同时生效）；
- 广播横幅加入打字机逐字显示；
- `expansions-check` 增至 **29 项**。

### 验证

- `./run.sh test` 73/73；
- `./run.sh check` 退出码 0；
- `./run.sh expansions-check` 29/29；
- `./run.sh editor-test` 通过；
- HTML R-016 48/48。

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

- D02 的 C（内部故障）尚未进入工程；当前 5 波仍全部是自然风险 A。下一步工程任务见 D02 与 [12 技术方案](docs-ai/design01/tech/12_技术方案_Godot工程.md)；
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
