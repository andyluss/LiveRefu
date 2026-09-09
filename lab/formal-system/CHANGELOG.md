# 形式化协作实验 · 日志（CHANGELOG）

> 记录 `lab/formal-system` 实验的里程碑、决策与产出。遵循 Keep a Changelog：`Added`（新增）/ `Changed`（变更）/ `Fixed`（修复）/ `Removed`（移除）。
> 实验目标与方法分层见 [README.md](README.md)；交接启动见 [EXPERIMENT.md](EXPERIMENT.md)；主项目形式化现状见 [`../../tech/formalization.md`](../../tech/formalization.md)。

## 0. 什么是"可被人类验证"（本实验的验证契约）

本实验不再接受"AI 自述我验证过了"。任何"能进门槛"的产出必须满足**其中至少一条**：

1. **编译**：`cargo build` / `rustc` 通过（类型 / 所有权 / 借用检查）。
2. **静态检查**：`cargo clippy` 零警告（或显式豁免并注明理由）。
3. **契约校验**：输入不符合声明契约时，校验器以非零退出拒绝（CUE `vet` / schema 校验）。
4. **属性测试**：某性质被随机生成的输入反复验证通过（`cargo test` / proptest）。

以上每条都是**一条命令即可重跑**、结果确定、**不依赖任何"角色心智"**的判定；人类只需重跑命令即可**可复现地**确认"它通过了"。

## [0.1.0] · 2026-09-08 · 起步：读档、工具链实测、选定实验 A

### Added
- 建立本日志，记录实验过程与决策。
- 工具链实测（系统实际时间 2026-09-08，见下方表格）：

  | 工具 | 版本/状态 | 用途 | 归属层 |
  | --- | --- | --- | --- |
  | rustc / cargo | 1.96.0 ✅ | 类型化语言层（编译器验证） | A |
  | cargo clippy | 0.1.96 ✅ | 静态 lint（零警告门禁） | A |
  | node | v22.23.2 ✅ | 工具 / TS 运行 | A |
  | deno | 2.7.7 ✅ | TS 直接运行 | A |
  | CUE / Alloy / TLA+ | ❌ 未装 | 配置契约 / 模型检验 / 规格 | B/C |

### Changed（决策）
- **选定第一个实验（MVP）= 实验 A · Rust 数据契约校验器**。
  - 按 [EXPERIMENT.md](EXPERIMENT.md) §五默认建议：本机 Rust 现成，编译器验证最"硬"，最贴合"AI 产出被**独立机器验证**而非自述"的目标。
  - 产出定位：`prototypes/data-validator/`（Rust crate + 校验逻辑），功能对齐现网 [`tools/check_data.py`](../../tools/check_data.py)（读 JSON → 校验 schema 契约），但由 `cargo build` / `clippy` / `test` 判定，比 Python 版更硬、可接入 CI。
  - 范围以**可判定**为准：必填 / type / enum / 数值范围 / 嵌套 `copyright`（与 `check_data.py` 保持一致），不扩展到 Lean/Coq 定理证明（成本高，见 [EXPERIMENT.md](EXPERIMENT.md) §八）。
- **明确验证契约**（见上 §0）作为本实验所有产出的入库门槛；"人类可复现" = 一条命令重跑。

### 待推进（下一步）
- 在 `prototypes/data-validator/` 建 Rust crate（`cargo init`），实现等价校验逻辑；`cargo clippy` 零警告；补属性测试（proptest）。
- 用主项目现成 schema 样例驱动校验（`projects/tomorrows-channel/data/schema/*.schema.json`），验证能拦截 4 类非法数据（越上限 / 低于下限 / 类型错 / 负值）。
- 决策与教训同步记入 `notes/`。

## [0.2.0] · 2026-09-08 · 实验 A 原型落地（Rust 数据契约校验器）

### Added
- [`prototypes/data-validator/`](prototypes/data-validator/README.md)（Rust crate，lib + bin）落地，功能对齐 [`tools/check_data.py`](../../tools/check_data.py)。
  - **校验引擎**（`src/lib.rs`）：支持 JSON Schema 子集 `type`/`enum`/`const`/`minimum`/`maximum`/`minLength`/`maxLength`/`minItems`/`maxItems`/`required`/`properties`/`additionalProperties`/`items`/`pattern`。
  - **CLI**（`src/main.rs`）：单文件或 `--schema-dir`/`--data-dir` 目录校验，退出码作门禁（0=通过，1=违规）。
  - **测试**：单元 5 + 拦截 4（非法越界/枚举/pattern/未知字段）+ 属性 5（proptest 随机生成）+ 真实数据 1 — 共 15 个。
  - 附 crate `README.md` 与 `.gitignore`（排除 `target/`）。
- **实测结果**：主项目 5 张表（meta/timer/channel/mixer_track/content_card）**零误报**全部通过；对非法数据（如 `channel_id:"Tape_Warm"` 违反 snake_case）精确报路径、exit 1。

### Changed（验证 / 门禁兑现）
- **验证契约 §0 已实际兑现**：`cargo build` 通过、`cargo clippy --all-targets -- -D warnings` 零警告、`cargo test` 全绿、CLI 目录校验 exit 0 —— 每条都是一条命令可复现、结果确定。
- **比 Python 版更强的约束**：新增 `pattern`（snake_case 校验）、`minLength`、`minItems`、`additionalProperties:false`（拒绝未知字段）等，均被 clippy / 测试机械判定。

### 笔记
- 记边想边试的教训到 [`notes/2026-09-08-experiment-a-rust-validator.md`](notes/2026-09-08-experiment-a-rust-validator.md)。

## [0.3.0] · 2026-09-08 · 建立"可视验证面"（人类兜底验证层，S1+S2）

### Added
- [**可视化机制**](viz/README.md)：为「难以形式化」的产物（文档/创意/设计）建立"三层"验证——
  ① 机器判定层（已做）→ ② **可视异常面**（本层）→ ③ 人工复核账本。核心原则：只锚定可验证事实、异常优先、确定性可复现。
- [**文档健康仪表盘**](tools/visual_health.py)（原型 S1+S2）：纯 Python 标准库、零依赖、一键重跑，产出
  `viz/doc-health.html`（自包含仪表盘：文档图谱/主题着色/孤立虚线/陈旧红环 + 异常面板 + 清单）与 `viz/doc-health.json`（机器摘要）。
  - **文档图谱**：节点=md，边=文档间相对链接；大小∝活跃度；主题着色。
  - 每文档 `【待定】/【已定】` 密度 + 孤立/高待定/陈旧异常面板。
- 对话内交互卡片预览（`visualize`）同步展示关键数字与"主题【待定】分布"。

### Changed（机制 / 边界）
- **确立"人机双验证"**：形式化只判可判定部分；对"温暖、可久处"等美学/连贯性，用可视化把异常摊到人眼前。
- **诚实原则**：可视化只锚定**可验证事实**（互链/【待定】/变更时间/主题），不伪装成"客观质量评分"。
- `viz/*.html`（大体积派生）gitignore；`*.json`（机器摘要）作快照入库。

### 实测（2026-09-08）
- 240 文档 / 261 显式互链 / 173 【待定】 / 11 【已定】 / 139 孤立 / 0 陈旧(>60天)。
- **洞察**：开放问题集中在主项目计划+角色文档（计划 64 / 图形程序A 36 / 主程序 25…）；`doc/` 知识库正文几乎无显式互链（靠命名约定组织），孤立法高。

## [0.4.0] · 2026-09-09 · 打通"人工复核账本"（第③层）

### Added
- [**复核账本 CLI**](tools/review_ledger.py)：`record --rel --verdict approve|flag --reason [--reviewer] [--action]`、
  `list`、`status`、`delete`；写入**追加式**、可追踪的 `viz/review-ledger.json`（时间/人/理由/id 留痕）。
- [**visual_health.py**](tools/visual_health.py) 读取账本：把每个异常标注为 `未复核 / 已通过 / 已标记`，
  新增"人工复核账本"卡片（异常总数/已通过/已标记/未复核 + 按复核态分组的异常清单 + 复核覆盖率）；
  图谱以描边颜色表达（绿=已通过、橙=已标记、虚线=未复核异常、红点=陈旧）。
- `--ledger <path>` 可指向其它账本。

### Changed（机制兑现）
- **闭环成型**：机器标记异常 → 人 `record` 复核 → 仪表盘并入复核态 → 可追踪、可统计。
- **诚实边界**：脚本只读账本、标注状态，**不推导/不伪造**复核结论；approve/flag 与理由由人填写。
- `doc-health.json` 快照新增 `review` 覆盖块（anomaly_total / approved / flagged / unreviewed）。

### 实测（2026-09-09 快照）
- 241 文档 / 263 互链 / 188 【待定】 / 17 【已定】 / 139 孤立 / 0 陈旧。
- 复核：异常 179 / 已通过 0 / **已标记 1** / 未复核 178（账本新增"单文档 23 个【待定】需收敛"一条 flag 示例）。

## [0.5.0] · 2026-09-09 · S3 跨文档一致性热力图

### Added
- [**consistency_heatmap.py**](tools/consistency_heatmap.py)：把同一契约字段（`pomodoro_work`/`focus_max`/
  `collect_frag` 的 common/rare/cult→初值映射 等 8 项）在**各文档的具体取值**与**权威源**（`data/tables/*.json`）
  对拍，渲染 `viz/consistency-heatmap.html` + `.json` 热力矩阵。
- **编码**：绿=与权威一致 / 红=不一致 / 琥珀=同文档冲突(多值) / 灰=未提及。`--self-test` 自检检测逻辑
  （统一致/不一致/冲突/未提及，PASS）。
- 原则：只锚定"字段名=数值"这类**可验证事实**，不误判裸数字（如"25 分钟"）；权威值取自 JSON 数据表。

### 实测（2026-09-09 快照）
- 8 项契约、4 份文档，**跨文档全部一致（绿）**，0 不一致——当前团队对这些参数口径维护良好。
- 说明：这是"机器保证"而非"发现了 bug"；一旦某文档改了某个值，该格会标红/琥珀并计入不一致，正是本工具要兜的险。

---
