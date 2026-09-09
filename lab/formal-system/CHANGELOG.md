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
- [`prototypes/data-validator/`](concerns/data-validator/README.md)（Rust crate，lib + bin）落地，功能对齐 [`tools/check_data.py`](../../tools/check_data.py)。
  - **校验引擎**（`src/lib.rs`）：支持 JSON Schema 子集 `type`/`enum`/`const`/`minimum`/`maximum`/`minLength`/`maxLength`/`minItems`/`maxItems`/`required`/`properties`/`additionalProperties`/`items`/`pattern`。
  - **CLI**（`src/main.rs`）：单文件或 `--schema-dir`/`--data-dir` 目录校验，退出码作门禁（0=通过，1=违规）。
  - **测试**：单元 5 + 拦截 4（非法越界/枚举/pattern/未知字段）+ 属性 5（proptest 随机生成）+ 真实数据 1 — 共 15 个。
  - 附 crate `README.md` 与 `.gitignore`（排除 `target/`）。
- **实测结果**：主项目 5 张表（meta/timer/channel/mixer_track/content_card）**零误报**全部通过；对非法数据（如 `channel_id:"Tape_Warm"` 违反 snake_case）精确报路径、exit 1。

### Changed（验证 / 门禁兑现）
- **验证契约 §0 已实际兑现**：`cargo build` 通过、`cargo clippy --all-targets -- -D warnings` 零警告、`cargo test` 全绿、CLI 目录校验 exit 0 —— 每条都是一条命令可复现、结果确定。
- **比 Python 版更强的约束**：新增 `pattern`（snake_case 校验）、`minLength`、`minItems`、`additionalProperties:false`（拒绝未知字段）等，均被 clippy / 测试机械判定。

### 笔记
- 记边想边试的教训到 [`notes/20260908-experiment-a-rust-validator.md`](concerns/data-validator/notes/20260908-experiment-a-rust-validator.md)。

## [0.3.0] · 2026-09-08 · 建立"可视验证面"（人类兜底验证层，S1+S2）

### Added
- [**可视化机制**](concerns/visual-fallback/README.md)：为「难以形式化」的产物（文档/创意/设计）建立"三层"验证——
  ① 机器判定层（已做）→ ② **可视异常面**（本层）→ ③ 人工复核账本。核心原则：只锚定可验证事实、异常优先、确定性可复现。
- [**文档健康仪表盘**](concerns/visual-fallback/tools/visual_health.py)（原型 S1+S2）：纯 Python 标准库、零依赖、一键重跑，产出
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
- [**复核账本 CLI**](concerns/visual-fallback/tools/review_ledger.py)：`record --rel --verdict approve|flag --reason [--reviewer] [--action]`、
  `list`、`status`、`delete`；写入**追加式**、可追踪的 `viz/review-ledger.json`（时间/人/理由/id 留痕）。
- [**visual_health.py**](concerns/visual-fallback/tools/visual_health.py) 读取账本：把每个异常标注为 `未复核 / 已通过 / 已标记`，
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
- [**consistency_heatmap.py**](concerns/visual-fallback/tools/consistency_heatmap.py)：把同一契约字段（`pomodoro_work`/`focus_max`/
  `collect_frag` 的 common/rare/cult→初值映射 等 8 项）在**各文档的具体取值**与**权威源**（`data/tables/*.json`）
  对拍，渲染 `viz/consistency-heatmap.html` + `.json` 热力矩阵。
- **编码**：绿=与权威一致 / 红=不一致 / 琥珀=同文档冲突(多值) / 灰=未提及。`--self-test` 自检检测逻辑
  （统一致/不一致/冲突/未提及，PASS）。
- 原则：只锚定"字段名=数值"这类**可验证事实**，不误判裸数字（如"25 分钟"）；权威值取自 JSON 数据表。

### 实测（2026-09-09 快照）
- 8 项契约、4 份文档，**跨文档全部一致（绿）**，0 不一致——当前团队对这些参数口径维护良好。
- 说明：这是"机器保证"而非"发现了 bug"；一旦某文档改了某个值，该格会标红/琥珀并计入不一致，正是本工具要兜的险。

## [0.6.0] · 2026-09-09 · 元规则实验稿（M1 文件组织方式定稿）

### Added
- [**meta-rules/**](concerns/meta-rules/)（初版为 `meta-rules.md`，[0.7.0] 升级为文件夹）：工作区"规则之规则"实验稿（先放本基地试，成熟后回流主项目）。
  - 定义元规则（普通规则约束产物；元规则约束"如何收敛出好结构并保持可读"）、规则总表（M0/M1/M2/M3）。
  - 每条元规则的结构（id/目标/决策/判定标准/权衡/自检/可验证）。

### Changed（M1 决策，实验期）
- **M1 文件组织方式 = 关注点优先，类型其次**（concern-first, type-secondary）：顶层按关注点/领域/项目切，
  关注点内用固定类型词表（README/docs/data/code/test/plans/tool）。决策理由：人找东西第一问是"这是什么"
  （关注点），非"什么类型"；关注点聚合归属、顶层小而稳定。
- 反例（不自取）：全类型桶（docs/code/data）切断归属、随项目膨胀。
- **本期范围 = 仅固化为规则+判据**，不改现有结构（顶层已是关注点优先 ✅）。

### 待推进
- M2 命名/类型词表固定（把 docs/data/code/test/plans/tool 定为项目内统一词表）。

## [0.7.0] · 2026-09-09 · 元规则升级为文件夹 + M2 定稿

### Added
- **元规则文件夹** `lab/formal-system/concerns/meta-rules/`：**一条元规则一个文件**，均含"**主选 + 多条备选**"与"**演进历史**"。
  - [`README.md`](concerns/meta-rules/README.md)：元规则定义 + 规则总表 + 单规则模板。
  - [`M0-rule-governance.md`](concerns/meta-rules/M0-rule-governance.md)：规则成文/按域/编号。
  - [`M1-file-organization.md`](concerns/meta-rules/M1-file-organization.md)：关注点优先/类型其次（含备选表 A1.1-A1.3 + 演进历史 v1→v2）。
  - [`M2-naming-vocabulary.md`](concerns/meta-rules/M2-naming-vocabulary.md)：**命名与类型词表**（新）。
  - [`M3-rule-evolution.md`](concerns/meta-rules/M3-rule-evolution.md)：建议→已定 状态机 + 版本化历史。
- 原 `meta-rules.md` 合并进文件夹（删除）。

### Changed（M2 定稿，实验期）
- **M2 命名与类型词表**：
  - 固定类型词表：`README/docs/data/code|game|src/test|tests/plans/art/assets/references`（只建有内容的，不过度碎片化）。
  - 可排序命名：主题/章节用 `NN_` 前缀；时事件用 `YYYYMMDD-HHMM-`；其余 snake_case 语义名；时间一律系统 `date`（东八区）。
  - 多角色团队 `docs/<角色>/` 作为允许的子规则（与 M1"子关注点再切"一致）。
  - 备选 A2.1-A2.4（无词表/纯编号/纯日期/一律按角色）及否定依据。
- 对照 [`tech/docs-convention.md`](../../tech/docs-convention.md) 已固化的日期/NN_/时间戳约定，M2 将其提升为元规则。

## [0.8.0] · 2026-09-09 · M1+M2 落地示样（以本基地为样本）+ 元规则可运行检查

### Added
- [**meta_rules_check.py**](concerns/meta-rules/tools/meta_rules_check.py)：把元规则 M1+M2 接入**可运行**检查（`--self-test` 自检）。
  - M1：关注点根有 `README.md`(出入口)；子项=类型目录+根文档，无散落。
  - M2：子目录在类型词表；根文件在白名单；文档类类型内文件命名符合（`NN_`/`YYYYMMDD(HHMM)-`/`snake_case`）；代码类豁免。
- [**meta-rules-config.json**](concerns/meta-rules/meta-rules-config.json)：元规则的**机器可读判定配置**（词表/根文档/命名模式/豁免）。
- **示样**（[`meta-rules/README.md`](concerns/meta-rules/README.md) §示样）：以 `lab/formal-system` 自身演示 M1+M2 已落地，并由检查证实。

### Changed（落地修正一处真实偏差）
- `notes/` 原 `2026-09-08-experiment-a-rust-validator.md`（`YYYY-MM-DD-`）不符合 M2 日期前缀 → 改名 `20260908-experiment-a-rust-validator.md`。
- 给 `meta-rules/` 命名词表补充其机器可读配置 `^meta-rules-config\.json$`——元规则检查首跑即抓住该偏差（exit 1），修正后通过（exit 0）。

### 实测
- 检查对象 `lab/formal-system`：**22 合规 / 0 违规，exit 0**；`--self-test` 能造违规并逐条捕获（PASS）。

## [0.9.0] · 2026-09-09 · M1 引入"递归子关注点" + 元规则合规可视化 + 接入 pre-commit/CI

### Changed（M1 完善）
- [M1-file-organization.md](concerns/meta-rules/M1-file-organization.md) **新增 §2.1 递归子关注点**：关注点内可有**子关注点**
  （自包含，递归套用）；给出"子关注点 vs 类型目录"判据（可独立命名的"什么"→子关注点；某关注点的一类产物→类型）。
- 判定标准新增 **问题 0**（是否可自成一体 → 建子关注点）；演进历史 + **v3**。

### Added
- **递归可运行检查**：`meta_rules_check.py` 支持 `sub_concerns` + `sub_configs`，对子关注点**递归校验**
  （须有 README + 内部同样遵守类型词表/命名）；新增 `--json <path>` 机器可读输出。
  - 现对 `meta-rules/` 递归通过；`--self-test` 含"递归子关注点通过"与"无 README 子目录被检出"两例。
- **元规则合规可视化**：`visual_health.py` 生成仪表盘时运行检查，读取 `visual-fallback/viz/meta-compliance.json`，
  新增"**元规则合规（M1+M2）**"面板（合规项/违规数 + 合规明细/违规列表）。实测：**25 合规 / 0 违规**，仪表盘含该面板。
- **接入 pre-commit/CI**：`tools/hooks/pre-commit` 新增第 3 步——暂存涉及 `lab/formal-system/` 时跑
  `meta_rules_check.py`；`.github/workflows/check-links.yml` 新增 "Meta-rules structure check" job。
- **推荐目标结构（待执行）**：`meta-rules/README.md` §示样给出三个子关注点（data-validator / visual-fallback / meta-rules）
  的重组建议表；物理迁移待确认后执行（检查已支持递归，迁移后可校验）。

## [0.10.0] · 2026-09-09 · 递归子关注点重组 + M3 多状态演进机 + 演进状态检查子关注点

### Changed（执行 M1 递归重组）
- 把散落的三个子关注点收拢为**自包含目录**：`data-validator/`（Rust crate + notes）、`visual-fallback/`（tools + viz 输出 + README）、
  `meta-rules/`（规则+配置+检查+evolution）。`tools/`、`viz/`、`prototypes/`、`notes/` 顶层已并入；`methods/`、`specs/` 保留为类型目录。
- 工具改**位置无关**：visual_health/review_ledger/consistency_heatmap/meta_rules_check 用 `.git` 定位工作区根，输出指向 `visual-fallback/viz/`。
- Rust 数据验证器随迁至 `data-validator/`（`cargo test` 15 项通过）。

### Changed（M3 演进机扩展）
- [M3-rule-evolution.md](concerns/meta-rules/M3-rule-evolution.md) 扩展为**多状态+子状态**生命周期：主状态
  `draft/proposed/experimental/accepted/in-review/superseded/deprecated/retired` + 子状态 + **允许迁移表**；补充"**鼓励演进**"立场。
- 每条规则（M0-M3）演进历史加**状态列**；标题状态对齐状态机。

### Added（演进状态检查子关注点）
- [`meta-rules/evolution/`](concerns/meta-rules/evolution/)：**形式化检查演进状态**的元规则子关注点。
  - [`rule_evolution_check.py`](concerns/meta-rules/evolution/rule_evolution_check.py)：扫描 `M*-*.md`，校验状态合法/日期非降序/相邻迁移合法/最新态=当前态；`--self-test` 可抓非法迁移。**4 规则全合法**。
  - 接入 pre-commit（meta-rules 变更时）与 CI（"Meta-rule evolution state check (M3)"）。
- **递归检查**对 `meta-rules → evolution` 递归通过；整体 **28 合规 / 0 违规**；全量链接检查 **0 失效**。

## [0.11.0] · 2026-09-09 · 子关注点统一目录 concerns/ + 演进历史可视化子关注点（探讨文档）

### Changed（结构）
- 给所有子关注点加**统一父目录**：`lab/formal-system/concerns/{data-validator,visual-fallback,meta-rules}/`，
  与根文档（README/CHANGELOG/EXPERIMENT）及类型目录（methods/specs）分离，避免混杂。
- 检查新增 `sub_concerns_dir`（子关注点统一目录，递归校验其下每个子关注点）；路径类工具已适配（`.git` 定位工作区根）。

### Added
- [`concerns/visual-fallback/evolution-history/`](concerns/visual-fallback/evolution-history/)：**演进历史可视化**子关注点（仅文档，暂不实现脚本）。
  - [`evolution-visualization-exploration.md`](concerns/visual-fallback/evolution-history/evolution-visualization-exploration.md)：**总探讨**——
    所有"演化/时间序"可视化（Git 记录 / CHANGELOG / 元规则演进史 / 文档历史 / 里程碑 vs 实际），含通用画法工具箱、
    逐对象展开、优先级与 MVP 建议、边界与**未来脚本候选清单**。
- 递归检查复核 `concerns/` 容器 + 各子关注点（含 `evolution-history`、`evolution`）：**33 合规 / 0 违规**；全量链接 **0 失效**。

### 待办
- 按探讨文档推进具体可视化脚本（P1：元规则演进状态阶梯 / Git 活动图）。

## [0.12.0] · 2026-09-09 · M4 目录说明与统一索引（每目录 STRUCTURE.md + 生成/检测脚本 + 根 README 索引）

### Added
- [**M4-directory-index.md**](concerns/meta-rules/M4-directory-index.md)：新元规则——每个目录以 `STRUCTURE.md` 自我描述
  （目录结构 + 条目说明 + 文件关系图 mermaid），并在**树根 README 末尾统一索引**；整合进 M1/M2（每目录自解释 + `STRUCTURE.md` 命名）。
- [**structure_gen.py**](concerns/meta-rules/tools/structure_gen.py)：**生成**每个目录的 STRUCTURE.md（自动列结构树/条目说明/mermaid 关系图；
  `--only` 单目录、`--check` 只探测）。
- [**structure_check.py**](concerns/meta-rules/tools/structure_check.py)：**检测**每目录 STRUCTURE.md（存在 + 含"目录结构/条目说明/文件关系图"三小节 + 有 mermaid；`--self-test`）。
- 生成 15 个目录的 STRUCTURE.md（formal-system 树：根 / concerns / 子关注点及其子目录 / methods、specs）。
- **lab/formal-system/README.md §五**：目录结构说明索引（统一链接全部 STRUCTURE.md）。
- 接入 pre-commit（meta-rules:structure）与 CI（"Directory STRUCTURE.md check (M4)"）；递归检查已允许 `STRUCTURE.md`。

### 实测
- structure_check：**16 目录 / 0 不合格**；recursive meta_rules_check：**38 合规 / 0 违规**；evolution check（5 规则）：全合法；全量链接 **0 失效**。

## [0.13.0] · 2026-09-09 · 可视验证面 S4/S5/S6 落地（需求追踪 / 数据不变量 / 设计复核）

### Added
- [**req_trace.py**](concerns/visual-fallback/tools/req_trace.py)：**S4 需求←→文档追踪矩阵**（行=需求/验收，列=文档，单元格=关键词命中；找"整行空白"=覆盖缺口）。产出 `viz/req-trace.html/.json`。
- [**data_invariants.py**](concerns/visual-fallback/tools/data_invariants.py)：**S5 数据不变量可视化**（稀有度配比/duration 范围/音量[0,1]/collect_frag/频道 LUT·容器 token 数，条形图 + ⚠ 偏离标注）。产出 `viz/data-invariants.html/.json`。
- [**design_review.py**](concerns/visual-fallback/tools/design_review.py)：**S6 设计/手感复核面**（每频道复核卡：基调锚点 + token 摘要 + 截图槽位(待渲染) + 人工复核清单；对照不可形式化美学）。产出 `viz/design-review.html/.json`。
- visual-fallback README 更新：§三 增补工具 C/D/E；§六 后续候选标"已实现"。

### 实测
- **S4**：8 需求 × 58 文档（R5 可插拔 bundle 覆盖偏少=潜在缺口）；**S5**：5 项不变量（稀有度配比 33/33/33 vs 设计 70/25/5 被标注 ⚠——M1 仅 3 卡所致，属预期）；**S6**：1 频道复核卡（tape_warm）。
- structure_check **16 目录/0 不合格**；递归 **38 合规/0 违规**；evolution **5 规则全合法**；全量链接 **0 失效**。

---
