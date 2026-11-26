# RefuWorld · 项目日志（CHANGELOG）

> 记录 `games/world/` 世界系统中间层的方案与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)。
> 时间取该版本最后一个提交的作者时间（东八区，精确到分）；未发布改动集中在 `[未发布]`。

## [未发布]

### 新增

- **M2 第一切片：Godot 逻辑适配器**：新增 `world-abi` 与独立 `godot-extension`（godot 0.5.6 / api-4-7）；`WorldNode` 通过 C ABI 完成 load/tick/interact/save/load，Godot 4.7 headless 600 tick 哈希 `0xc840fe2090a0a085`、save/load 同哈希；记录见 [09 · M2 启动](docs/09_M2适配器启动.md)。渲染/资产/音频/CTS 未做。
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
- **TS 构建门禁**：`worldc ts-build` 在本地存在 TypeScript 时先跑 `tsc --noEmit`，失败即停止；`npm run dev` 同样先类型检查。

- **Demo 索引缩略图 404**：`web/demos.html` 改用本地 `web/images/demos/*.jpg`，避免从 `web/` 根目录服务时 `../docs/shots` 越界；README 统一从 `games/world` 根目录启动静态服务器。

### 变更

- README 状态改为 **M0 已通过 + M1 主要切片已通过**；项目名统一为 **RefuWorld**。
- [05](docs/05_路线图与验收.md) 的待拍板问题改为已拍板结论，并补 M0 验收结果表。
- 新增 CI workflow（当时 `world-m0.yml`，现 `world.yml`）：三 OS `cargo test`、C ABI 冒烟、wasm core 构建。
- 新增 `test/run_m1.sh`、`web/build.sh`、`web/README.md`、`tools/editor-server.mjs`；`worldc` 增加 `ts-build`/`content-test`/`editor`。
- 黄金哈希因 `collider`/`move_intent`/`open_door`/`path`/`nav`/`assets` 更新：包 `sha256:66125c46…46fe29e`，600 tick `0xc840fe2090a0a085`。

### 验证

- `cargo test --workspace`：19 个测试通过。
- Headless 600 tick 双跑：`0xc840fe2090a0a085`。
- C ABI 宿主：同 `0xc840fe2090a0a085`。
- 坏包：`E-SCHEMA-001`/`E-REF-001`/`E-REF-002`/`E-TIME-001`/`E-DLG-001`/`E-LOC-001`。
- `wasm_quickjs result=1`；release bench ≈ 0.1 µs/tick（Demo 规模，不代表上限）。
- M1：`worldc ts-build --compare data/demo.harbor` PASS；TS 包 600 tick = `0xc840fe2090a0a085`；Node wasm 预览 replay/preview 同哈希；浏览器 CDP 实测任务完成与三态主题。
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
- **TS 构建门禁**：`worldc ts-build` 在本地存在 TypeScript 时先跑 `tsc --noEmit`，失败即停止；`npm run dev` 同样先类型检查。

- **Demo 索引缩略图 404**：`web/demos.html` 改用本地 `web/images/demos/*.jpg`，避免从 `web/` 根目录服务时 `../docs/shots` 越界；README 统一从 `games/world` 根目录启动静态服务器。

### 变更

- **推荐方案定稿（待人类拍板）**：Rust 权威内核 + TypeScript 内容层 + 版本化 C ABI + 薄引擎适配器；
  首批宿主为 Headless（CI）/ Web（作者预览）/ Godot（首个生产适配器）。
  见 [04 · 推荐结论](docs/04_选型对比与推荐.md#六推荐结论)。
- **版本说明**：本版本**只有方案文档，没有实现代码**；所有结论标注为「建议/待拍板」，不构成工程承诺。
  文档中的性能数字、工期与代码行数均为**目标值/估算**，需在 M0 建立基准后复核。
