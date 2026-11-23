# RefuWorld · 项目日志（CHANGELOG）

> 记录 `games/world/` 世界系统中间层的方案与工程变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)。
> 时间取该版本最后一个提交的作者时间（东八区，精确到分）；未发布改动集中在 `[未发布]`。

## [未发布]

### 新增

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

### 变更

- README 状态改为 **M0 已通过 + M1 切片已通过**；项目名统一为 **RefuWorld**。
- [05](docs/05_路线图与验收.md) 的待拍板问题改为已拍板结论，并补 M0 验收结果表。
- 新增 `.github/workflows/world-m0.yml`：三 OS `cargo test`、C ABI 冒烟、wasm core 构建。
- 新增 `test/run_m1.sh`、`web/build.sh`、`web/README.md`；`worldc` 增加 `ts-build`。

### 验证

- `cargo test --workspace`：10 个测试通过。
- Headless 600 tick 双跑：`0xd1c6ea084b71cc0d`。
- C ABI 宿主：同 `0xd1c6ea084b71cc0d`。
- 坏包：`E-SCHEMA-001`/`E-REF-001`/`E-REF-002`/`E-TIME-001`/`E-DLG-001`/`E-LOC-001`。
- `wasm_quickjs result=1`；release bench ≈ 0.1 µs/tick（Demo 规模，不代表上限）。
- M1：`worldc ts-build --compare data/demo.harbor` PASS；TS 包 600 tick = `0xd1c6ea084b71cc0d`；Node wasm 预览 replay/preview 同哈希；浏览器 CDP 实测任务完成与三态主题。

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

### 变更

- **推荐方案定稿（待人类拍板）**：Rust 权威内核 + TypeScript 内容层 + 版本化 C ABI + 薄引擎适配器；
  首批宿主为 Headless（CI）/ Web（作者预览）/ Godot（首个生产适配器）。
  见 [04 · 推荐结论](docs/04_选型对比与推荐.md#六推荐结论)。
- **版本说明**：本版本**只有方案文档，没有实现代码**；所有结论标注为「建议/待拍板」，不构成工程承诺。
  文档中的性能数字、工期与代码行数均为**目标值/估算**，需在 M0 建立基准后复核。
