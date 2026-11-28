# RefuWorld · 项目日志（CHANGELOG）

> 记录 `games/world/` 世界系统中间层的方案与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)。
> 时间取该版本最后一个提交的作者时间（东八区，精确到分）；未发布改动集中在 `[未发布]`。

## [未发布]

### 新增
- **L5 世界系统控制室**：新增 `data/demo.systems` 与 `web/systems.html`；修正 60Hz 能量积分、策略水耗/AI 负载、低量警告；新增初始电量/水量、`set_system_policy` wasm/trace；只有 L5 运行。
- **L4 社会关系室**：新增 `data/demo.society` 与 `web/society.html`；补齐差异化社会动作、目标 faction trust 变化与 `faction_trust_changed`；`social_action` 增加距离门槛并接入 wasm/trace；L5 为空。
- **L3 叙事实验室**：新增 `data/demo.narrative` 与 `web/narrative.html`；补 `ChooseDialogue` 命令（core / trace / wasm），展示对话分支、规则、任务目标、flags 与 ScriptHost `ctx.after`；L2 日程和 L4/L5 为空。
- **L2 行为实验室**：新增 `data/demo.agency`（core + agency）与 `web/agency.html`；3 个 NPC 的日程时间窗驱动 behavior/target/A* 路径；时间加速、schedule HUD、L3–L5 为空证明；`web/test_l2.cjs` 验证 08:00 换班与移动。
- **L0 动态障碍可视化**：L0 沙盒增加「移动障碍」按钮与实时 nav 快照；`MoveProp` 后页面重绘 blocked 格，A* 使用更新后的网格。
- **L1 主体交互室**：新增 `data/demo.subject`（core + interaction + inventory）与 `web/subject.html`；`WorldDef.interaction_range` 可选距离门槛（旧包默认无限）；`web/test_l1.cjs` 验证拾取/背包/门锁/超距拒绝，L2–L5 为空。
- **L0 时空沙盒**：新增 `data/demo.spacetime`（仅 core kit）与 `web/spacetime.html`；展示固定 tick、Zone、A*、碰撞、路径与哈希，HUD 实时证明 L1–L5 为空；`web/test_l0.cjs` 验证移动/重置哈希与上层内容为空。
- **ScriptHost 真异步/定时器收尾**：`ctx.delay` 挂起 Promise、`globalThis.setTimeout` 映射 tick、命令 timer 跨 reload、`on_tick` has_work 短路；模块循环依赖可读错误。仍无真实墙钟计时/函数 timer 迁移。
- **ScriptHost 模块循环诊断**：加载前遍历 import 图，发现循环时返回可读链路（如 `a -> b -> a`），避免 QuickJS 只报泛化加载错误。
- **ScriptHost 跨 tick async**：`ctx.delay(ticks)` Promise 在后续 tick 恢复；`globalThis.setTimeout` 映射到 60Hz tick；命令 timer 跨热重载迁移；`on_tick` 驱动到期任务并 drain async 结果。仍不支持真实墙钟计时。
- **ScriptHost 确定性 tick timer**：`ctx.after(ticks, commands)` / `ctx.setTimeout(fn, ticks)`；World 每 tick 调 `ScriptHost::on_tick` 投递到期命令；跨 tick 测试通过。
- **ScriptHost 模块/异步/热重载**：支持 ES module import（`scripts/lib/*.js`，demo.orbit 已启用）、`async onEvent` 微任务、`ScriptHost::reload`/`World::reload_scripts` 保留 `ctx.state`；仍无真实定时器/跨 tick Promise。
- **M1 剩余项补做**：`Command::MoveProp` + 局部 nav 重建；编辑器 v0.6 递归 Schema 表单；2D/2.5D/3D 浏览器运行时 CI；`real5k-v2` 基准（4 NPC 路径 + 动态 Prop）；ScriptHost 每脚本持久状态/快照与 100ms 墙钟护栏。
- **M3 活 NPC 方案**：新增 `docs/12_活NPC与行为层方案.md`；确定 L2 负责需求/目标/活动/记忆，L0 负责路径与移动，L1 负责动作，L3/L4/L5 只通过 `AgentContext` 提供上下文；含 LOD、确定性、存档、验收与分阶段计划。
- **Lab · Godot 落块版**：`lab/tetris/godot/` 使用同一 `lab.tetris` 包与落块规则，通过 `world_godot` GDExtension 接入 L0/L3/L5；新增 `command_json` 通用命令入口；Godot 4.7 Control 三栏 UI、键盘操作、任务/能源面板、构建与 headless 测试。
- **Lab · RefuWorld 落块变体**：`lab/tetris/refuworld.html` 复用 NEON DRIFT 玩法，通过 `refuworld-bridge.mjs` 接入 L0 固定 tick、L3 公共任务、L5 光伏/风电/电池/负载/天气；不硬塞 L1/L2/L4；`data/lab.tetris` 生成独立 `refuworld.pack.data`。
- **Lab · NEON DRIFT 方块坠落**：`lab/tetris/` 完整可发布落块游戏；Canvas 2D、7-bag、SRS 踢墙、Hold/Next/Ghost、Lock Delay、T-Spin、Combo/B2B、等级/重力、最高分；WebAudio 合成音效、触屏、R-016 三态、PWA 离线；10 条逻辑测试与静态契约。

- **M2 完成：Godot 逻辑适配器**：新增 `world-abi` 与独立 `godot-extension`（godot 0.5.6 / api-4-7）；`WorldNode` 通过 C ABI 完成 load/tick/interact/talk/pickup/set_move/sync_views/save/load；Godot 4.7 headless 600 tick 哈希 `0x3606a221e9990561`、save/load 同哈希、拾取后视图池回收为 8 个节点、移动 x=0.667；新增 Camera3D/日光/地面与 WASD `play.tscn`；`cts.sh` 的 L/T/I/E/V/S/X/D 基础组全 PASS；`world.yml` 增加 Godot 4.7 CTS job，run 45765036657 通过。HUB/GUIDE/Demo 索引里的 Demo 链接改为 `http://127.0.0.1:8787/web/...`（编辑器为 `:8788`），避免直接以静态文件打开时 wasm 加载失败；Demo 体系扩到 20 个玩法 Demo / 14 个内容包（新增 dock/kitchen/clinic/tram/library/rooftop/archive/blackout/farm/station 2D 场景，archive 覆盖 ScriptHost；新增 5 个通用 3D 场景页 dock/tram/station/blackout/archive，共 7 个 3D 入口）；视图按 kind 选 Capsule/Box/Sphere；`entity_visual_source` 从 pack 解析每个实体 visual source，play 注册 keeper/airlock/keycard 全部 GLB scene；`sync_views_at` 插值、`clear_views`/`unregister_visual` 卸载；MultiMesh 批渲染 prop/item、`set_move_2d`/`set_move_iso` 轴映射；play 增加 E/F/T、Quest+背包 HUD、InputMap 键盘/手柄/触屏、港湾家具/灯带/几何；`world_ui_state` ABI；5k CPU benchmark 600 tick（sync P95 0.656ms）、macOS Metal 窗口帧时间（P95 3.557ms）与 Xvfb 软件 GL CI 帧时间（ci-ubuntu-xvfb P95 12.5ms）；CI 中先构建再切 Godot HOME，避免 rustup 找不到默认 toolchain。`airlock_open.wav` 经事件播放；CTS 增加 Z/A。记录见 [09 · M2 适配器启动](docs/09_M2适配器启动.md)；更多内容量与资源预算未做（现有 2 actor / 3 prop / 3 item / 2 quest / 8 placement）。
- **M0 可运行实现**：新增 `code/` Rust workspace（`world-pack`、`world-core`、`world-ffi`、`world-host-headless`、`world-cli`、`world-script`、`world-script-wasm`）。
- **「港湾值班室」内容包**：`data/demo.harbor/`，含 1 区、NPC、气闸、钥匙卡、规则、任务、对话、日程、文案与 600 tick trace。
- **C ABI v0 + C 冒烟宿主**：`code/include/world.h`、`code/hosts/c/main.c`；C 宿主与 Headless 同哈希。
- **wasm32 + QuickJS spike**：`world-script-wasm` 在 Node 中执行一条规则条件并返回 1。
- **CLI `worldc`**：`validate`/`build`/`test`/`replay`/`demo`/`bench`/`new`/`header`/`explain`。
- **验收脚本与 fixture**：`test/run_m0.sh`；6 个坏包 fixture；核心/ABI/校验/QuickJS 测试。
- **ADR-001…006**：拍板结果、包 schema、确定性、ABI、ECS 偏差、QuickJS spike。
- **M0 记录**：[06 · M0 实现与验收](docs/06_M0实现与验收.md)。
- **M1 切片：TypeScript DSL**：`packages/world-authoring`、`src/content/demo.harbor/*.ts`、`tools/ts-build.mjs`、`worldc ts-build`；TS 编译包与 JSON 包同哈希。
- **M1 切片：Web 预览**：`world-wasm`（wasm-bindgen）+ `web/`（Canvas 2D、点击/键盘交互、任务/事件 HUD、M0 trace 回放、R-016 三态主题）；截图见 `docs/shots/`。
- **M1 记录**：[07 · M1 切片](docs/07_M1实现与验收.md)。
- **M1 剩余：移动/碰撞**：`Command::Move`、`move_intent`、圆形玩家 vs 圆形/AABB 障碍、`open_door` 规则动作；关闭的门挡住玩家，开门后可通过。
- **M1 剩余：Web 编辑器 v0.5**：`web/editor.html`、`tools/editor-server.mjs`、`worldc editor`；拖动摆放、字段/定义/规则编辑、校验、构建并试玩。
- **M1 剩余：内容测试**：`worldc content-test` + `data/demo.harbor/tests/*.test.json`；`first_shift`、`airlock_locked_without_key`、`pickup_keycard`。
- **M1 剩余：sourcemap / 热重载**：TS 编译生成 `sourcemap.json`；预览轮询 `/api/pack-version`，编辑器构建后自动刷新。
- **M1 剩余：5k 合成基准**：`worldc bench --synthetic 5000 --ticks 6000`，Apple M1 Pro release ≈ 0.01 ms/tick。
- **真实 5k v1 基准（ADR-008）**：`worldc bench --scenario real5k`；单 Zone 5,000 实体（2,999 Prop / 1,500 带日程 Actor / 500 Item），规则/任务/日程/脚本/导航；M1 Pro release tick P95 0.239 ms、snapshot P95 3.086 ms。
- **M1 剩余：导航/寻路**：`worldc bake nav` 从 Zone/Prop AABB 烘焙 40×40 网格；核心 4 邻接确定性 A* + `Command::MoveTo`；预览点击地面沿虚线路径移动；编辑器「烘焙导航」。
- **M1 剩余：资产依赖**：`assets/assets.index.json`、actor/prop/item `visual` 引用、校验与 `world_zone_assets` ABI；C ABI 返回 3 个逻辑资产 ID。
- **3D 沉浸式演示**：`web/demo3d.html` + `demo3d.js`；本地 Three.js r187、第三人称/轨道相机、WASD/点击寻路、气闸滑门、对话字幕、程序化海面/雨/货轮/灯塔、Bloom/尘埃/可选 WebAudio；同一 wasm 状态与哈希。
- **M1 剩余：编辑器 v0.5**：字段表单、对话图（节点/边、编辑/新增/删除）、撤销/重做；保存仍走「先写后校验，失败回滚」。
- **M1 剩余：类型检查与开发监听**：`worldc ts-check`/`npm run check`（TypeScript devDependency）、`npm run dev`（TS 监听→构建→复制 pack.data）。
- **M1 剩余：第三条内容测试与两小时教程**：`pickup_keycard`；[08 · 两小时教程](docs/08_两小时教程.md)（真实作者试用待做）。
- **ScriptHost（QuickJS）**：`world-script` 实现 `ScriptHost`，核心定义「事件上下文 JSON → 命令数组」；含 `scripts/*.js` 加载、内存/栈/命令/中断预算、`script_error` 隔离；wasm/C/CLI/headless 注入。Demo `demo.orbit/scripts/reactor.js` 监听开门事件写脚本 flag。
- **多 Demo 体系**：`web/demos.html` 索引 + 2.5D 等距 `web/iso.html` + 3D 环形站 `web/orbit3d.html`；新增 `demo.market`、`demo.greenhouse`、`demo.orbit` 内容包（各带导航/规则/对话/任务/内容测试）。
- **项目 HUB 与用户指南**：`brief/HUB.html`、`brief/GUIDE.html`、`brief/theme.css`、`brief/theme.js`、`brief/README.md`；项目状态/架构/3D/决策/路线图/风险中心 + 内容作者上手路径，R-016 三态主题。

### 修复
- **EntityStore 存档恢复槽位**：`from_entities` 改为按原 `EntityId.index/generation` 回填列，而不是重新 append；修复 Godot CTS `S hash roundtrip` 失败（存档恢复后实体 ID/player 引用变化）。
- **Godot CI 的 headless `--import` core dump**：Linux runner 上 Godot 4.7 `--import` 会崩溃；`godot/build.sh` 改为直接写 `.godot/extension_list.cfg`，`test.sh`/`cts.sh` 去掉 import；本地 clean 目录重跑 test/CTS 通过。
- **TS 构建门禁**：`worldc ts-build` 在本地存在 TypeScript 时先跑 `tsc --noEmit`，失败即停止；`npm run dev` 同样先类型检查。

- **Demo 索引缩略图 404**：`web/demos.html` 改用本地 `web/images/demos/*.jpg`，避免从 `web/` 根目录服务时 `../docs/shots` 越界；README 统一从 `games/world` 根目录启动静态服务器。

### 新增
- **NPC 日程寻路**：`ScheduleEntry.target` 可选 X/Z；Agency 在行为切换时产出 target；World 用门感知 A* 生成路径，逐 tick 沿路移动并写入 `npc_paths` 快照（旧包空 map 省略，哈希不变）；solarfarm 默认启用；新增 `npc_path.rs` 移动/存档/旧 pack 哈希测试。
- **M1 开门动态寻路**：A* 新增 `find_path_with_open`；门打开后按 AABB 临时放行烘焙 nav 格子，门未开仍绕行；world `MoveTo` 收集已开门 AABB；新增开/关两态测试。
- **M2 资源预算门**：`test/m2_budget.mjs` 检查适配器 ≤2,000 行/不 import core/pack、pack ≤10MB、CI/GPU 5k 帧 P95 ≤16.67ms；纳入 `godot/test.sh`。
- **HUB 顶栏与「案例」页**：顶栏收敛为 GUIDE / Demo / Lab / README 四个主入口，避免换行；「06 3D 演示」改为「06 案例」，加入 NEON DRIFT、GRID//SIGNAL、19 Demo 导览，并保留原 3D 与 L4/L5 对照内容。
- **brief 同步最新架构**：HUB 架构图改为 L0–L5 分层 + EntityStore 列存储，实现页补 L4 社会/L5 系统、组件列与命令；GUIDE/README 更新 34 Rust 测试、19 条内容测试、19 Demo、太阳城/霓虹下城与 5k 0.129/0.18ms 口径。
- **L4 社会关系层 + L5 世界系统层**：新增 `layers/social`（factions/relationships/reputation，talk 自动记录，SocialAction 支持大会提案）与 `layers/systems`（天气、光伏、风电、储能、水循环、AI 负载、energy_updated/weather_changed、能源策略）；`Snapshot` 增加可选 social/systems 字段，旧包省略、哈希/存档不变。
- **5k 热路径优化**：L0 运动改用 `Body` 轻量视图，避免每 tick 物化完整 Entity；碰撞障碍改用可复用缓冲 `for_each_obstacle`；L2 行为变化改用 `changes_into` 复用 Vec；`Collider` 改为 Copy。p50 0.139→0.129ms，p95 在 0.17–0.19ms 波动，无 M0/M1/哈希回归。
- **霓虹下城赛博朋克对照 Demo**：新增 `demo.cybercity`（3 人类 + 3 城市 AI + 广告牌/配电站/无人机/贩卖机/轨道电梯）；`web/cybercity3d.html` 用雨夜、霓虹、垂直楼群、企业租界、私有电网与信用社会对比太阳城；L4 信用/关系、L5 公司优先/公共供电/算力优先全部接同一 wasm。
- **太阳城农场旗舰 Demo**：新增 `demo.solarfarm` 内容包（3 人类 + 3 公共 AI + 光伏 canopy/风轮机/储能/滴灌/大会堂/水循环）与 `web/solarfarm3d.html`；L4 社会面板、L5 能源面板、大会提案、灌溉/储能/算力策略全部接同一 wasm 状态；Demo 索引 18 个玩法 Demo。
- **Dock 07 环境音与镜头演出**：新增 WebAudio 程序化环境（雨声/低频码头嗡鸣/雾笛/货舱门伺服），默认关闭、点击启用；四段式镜头（码头全景→堆场→B-07→夜班）2.8–4.6s 推入，支持重看演出与拖动取消；不用外部音频文件。
- **Entity 组件列拆分**：新增 `EntityStore` SoA 存储（core/transform/collider/speed/inventory/interactable/door/schedule/behavior/dialogue 分列）；`Entity` 保留为 Snapshot/C ABI DTO；`EntityView`/`EntityMut` 作为运行时扁平读写视图；`EntityId` 代际、spawn/despawn、快照往返与黄金哈希保持；5k tick P95 0.165ms。
- **夜班货运旗舰 3D（Dock 07）**：专用 `web/dock3d.html` + `dock3d.js`，集装箱堆场、吊机、B-07 货舱门、雨夜/灯光/水洼/码头仓库与低模工人；任务/门禁/拾取全部来自 `demo.dock` wasm 状态；5 个通用 `scene3d` 原型从 Demo 索引移除（文件保留为实验），索引收敛到 17 个玩法 Demo。
- **内核分层 Phase 5（边界门）**：新增 `test/check_layers.mjs`，静态拒绝 L0/L1/L2/L3 向上 import；接入 `run_m1.sh` 与 RefuWorld CI；为 Narrative 补 flags/脚本过滤单测。四层边界与黄金门全部绿。
- **内核分层 Phase 4（L3 叙事/规则层）**：新增 `layers/narrative`，持有 flags/quests/rules/quest_defs/dialogues/ScriptHost；`World` 仅做命令、事件与快照编排，`flags()`/`quests()` 改为只读访问；M0/M1、哈希与 19 个事件保持。
- **内核分层 Phase 3（L2 行为/能动层）**：新增 `layers/agency`，持有日程定义并从世界时间计算行为变化；`World` 只应用 behavior 与发事件；跨夜时段、重复计划有单测；哈希/事件保持。
- **内核分层 Phase 2（L1 主体交互层）**：新增 `layers/subject`，收拢背包、拾取、门/锁、开门与物品转移；`Entity` 只保留数据，原方法移入 L1；规则/任务/对话仍留在上层，黄金哈希与事件序列保持。
- **内核分层 Phase 1（L0 时空物理层）**：新增 `layers/spacetime`，收拢固定 tick/时钟、Zone 边界、运动积分、路径跟随、碰撞与 A*；`World` 保留门面并委托；`World::tick()` 取代公开字段，Rust 调用点同步；黄金哈希、600 tick 事件序列与 M0/M1 全部保持。
- **新增小鲸鱼娘 3D 角色展示**：基于社区公开母题写提示词/美术规格（蓝发渐变、鲸鱼耳鳍与尾鳍、女仆长裙、傲娇懒散），用 Blender 5.3 程序化生成原创 GLB，Three.js 展示页提供自动环绕、缩放、摆尾/发梢呼吸动画、主题切换与非官方声明。资料与提示词见 [10 · 小鲸鱼娘](docs/10_3D角色_小鲸鱼娘提示词.md)。
- **HUB 新增「04 实现」标签页**：tick 流水线 SVG、内容→pack→宿主 SVG、数据模型/C ABI/Godot 适配器图文、代码片段与源码阅读路径；后续标签顺延为 05–09，保持 R-016 三态与打印。
- **HUB 架构标签页可视化**：五层架构改为内联 SVG 架构图（作者工具 → 内容包 → world-core → world-ffi → 宿主适配器），带命令/事件流向、ABI 边界、验证回路与内容/内核/宿主约束标签；全部使用主题 token，支持三态、打印与移动端横向滚动。
- **Web 静态预览服务改为 Node**：新增共享 `tools/serve-static.mjs`，`games/world/tools/serve-web.mjs` 作为兼容包装（无第三方依赖，支持 root/port/bind、目录 index、MIME、路径穿越拒绝）；`package.json` 增加 `npm run serve`；文档与构建脚本不再依赖 `python3 -m http.server`；新增 `test/serve_web_check.mjs` 并接入 world CI。

- README 状态改为 **M0 已通过 + M1 主要切片已通过**；项目名统一为 **RefuWorld**。
- [05](docs/05_路线图与验收.md) 的待拍板问题改为已拍板结论，并补 M0 验收结果表。
- 新增 CI workflow（当时 `world-m0.yml`，现 `world.yml`）：三 OS `cargo test`、C ABI 冒烟、wasm core 构建。
- 新增 `test/run_m1.sh`、`web/build.sh`、`web/README.md`、`tools/editor-server.mjs`；`worldc` 增加 `ts-build`/`content-test`/`editor`。
- 黄金哈希因 `collider`/`move_intent`/`open_door`/`path`/`nav`/`assets` 更新：包 `sha256:21569377…b7d5f9`，600 tick `0x3606a221e9990561`。

### 验证

- `cargo test --workspace`：19 个测试通过。
- Headless 600 tick 双跑：`0x3606a221e9990561`。
- C ABI 宿主：同 `0x3606a221e9990561`。
- 坏包：`E-SCHEMA-001`/`E-REF-001`/`E-REF-002`/`E-TIME-001`/`E-DLG-001`/`E-LOC-001`。
- `wasm_quickjs result=1`；release bench ≈ 0.1 µs/tick（Demo 规模，不代表上限）。
- M1：`worldc ts-build --compare data/demo.harbor` PASS；TS 包 600 tick = `0x3606a221e9990561`；Node wasm 预览 replay/preview 同哈希；浏览器 CDP 实测任务完成与三态主题。
- GitHub Actions `RefuWorld CI`：[run 45757232197](https://github.com/andyluss/LiveRefu/actions/runs/45757232197) 在 Ubuntu/macOS/Windows 三平台全绿；8 个 job 覆盖全部内容包、R-016 8 页、Demo 静态契约、real5k smoke 与 `world-wasm` QuickJS 构建。
- M1 剩余：`content-test` 6 条 PASS；编辑器保存/校验/构建 API 通过；移动碰撞 z=5.40；5k v1 real P95 0.239 ms/tick；R-016 八个页面通过。

## [0.1.0] - 2026-11-23 12:17

### 新增

- **新增 `games/world/` 世界系统中间层方案**：定位为「介于游戏引擎与游戏内容之间」的跨游戏、跨引擎层；
  目标包括内容作者无需引擎知识、同一内容包跨宿主一致、上层玩法机制可复用、引擎可替换。
  见 [README](README.md)。
- **新增 6 篇方案文档**：
  - [00 · 方案总览](docs/00_方案总览.md)：问题、目标/非目标、十条原则、五层架构、一次 tick 的完整路径；
  - [01 · 世界模型与运行时](docs/01_世界模型与运行时.md)：World/Zone/Session、实体/组件、空间、时间、命令/事件、确定性、存档、脚本边界；
  - [02 · 内容作者与工具链](docs/02_内容作者与工具链.md)：内容包结构、TS DSL 示例、校验、Web 编辑器、CLI、两小时教程；
  - [03 · 引擎适配与替换](docs/03_引擎适配与替换.md)：C ABI、表现同步、资产、Godot/Unity/Unreal/Web/Bevy、适配器契约测试与替换演练；
  - [04 · 选型对比与推荐](docs/04_选型对比与推荐.md)：A–E 五个整体方案评分、十二个子决策、推荐理由、改选信号与风险登记；
  - [05 · 路线图与验收](docs/05_路线图与验收.md)：M0–M4 里程碑、垂直切片「港湾值班室」、测试/CI、指标与待拍板问题。
- **新增「港湾值班室」垂直切片定义**：用 1 个区域、1 个 NPC、1 扇门、1 张钥匙卡、1 段对话、1 个任务、
  1 次存档/读档、1 条黄金回放，横跨世界层最核心的八项能力。

### 修复
- **Godot CI 的 headless `--import` core dump**：Linux runner 上 Godot 4.7 `--import` 会崩溃；`godot/build.sh` 改为直接写 `.godot/extension_list.cfg`，`test.sh`/`cts.sh` 去掉 import；本地 clean 目录重跑 test/CTS 通过。
- **TS 构建门禁**：`worldc ts-build` 在本地存在 TypeScript 时先跑 `tsc --noEmit`，失败即停止；`npm run dev` 同样先类型检查。

- **Demo 索引缩略图 404**：`web/demos.html` 改用本地 `web/images/demos/*.jpg`，避免从 `web/` 根目录服务时 `../docs/shots` 越界；README 统一从 `games/world` 根目录启动静态服务器。

### 变更

- **推荐方案定稿（待人类拍板）**：Rust 权威内核 + TypeScript 内容层 + 版本化 C ABI + 薄引擎适配器；
  首批宿主为 Headless（CI）/ Web（作者预览）/ Godot（首个生产适配器）。
  见 [04 · 推荐结论](docs/04_选型对比与推荐.md#六推荐结论)。
- **版本说明**：本版本**只有方案文档，没有实现代码**；所有结论标注为「建议/待拍板」，不构成工程承诺。
  文档中的性能数字、工期与代码行数均为**目标值/估算**，需在 M0 建立基准后复核。
