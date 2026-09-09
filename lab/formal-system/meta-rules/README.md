# 元规则（Meta-Rules）· 索引

> 实验基地 [`lab/formal-system`](../README.md) 的一项实验：把工作区的"**规则之规则**"显式化、可追踪、带**演进历史**。
> **每条元规则一个文件**，文件内含"**主选 + 多条备选**"与"演进历史"。成熟后回流主项目。

## 这是什么

普通规则约束"某类产物怎么写/怎么命名"（工作区具体规则见 [`tech/`](../../../tech/README.md)）；
**元规则**约束"我们如何收敛出一个好结构并保持它**可读**"。本文档是元规则的总目录。

## 规则总表

| id | 文件 | 一句话 | 状态 |
| --- | --- | --- | --- |
| M0 | [M0-rule-governance.md](M0-rule-governance.md) | 规则的组织方式（成文/按域/编号） | 已定 |
| M1 | [M1-file-organization.md](M1-file-organization.md) | 文件组织 = 关注点优先，类型其次 | 已定(实验期) |
| M2 | [M2-naming-vocabulary.md](M2-naming-vocabulary.md) | 命名与类型词表 | 已定(实验期) |
| M3 | [M3-rule-evolution.md](M3-rule-evolution.md) | 元规则自身演进（建议→已定） | 已定 |

## 每条规则的结构（机器/人可核对）

每条元规则文件按此模板：

1. **id · 标题（状态）** + 一句话。
2. **目标**：为什么要这条（服务"快速理解"）。
3. **主选（决策）**：结论 + 理由 + 权衡。
4. **备选**：被放弃的其余选项，各给"为何不为主选 / 代价"。
5. **判定标准**：可操作的判断（如放文件前依次问什么）。
6. **自检问题**：一句反问。
7. **演进历史**：版本 / 日期 / 变更 / 依据。

## 示样：lab/formal-system（M1+M2 落地示例）

以本基地自身为样本，验证 M1/M2 **已落地**（并被可运行检查证实）：

- **M1**：`lab/formal-system` 是一个**关注点**（实验）；根有出入口 [`README.md`](../README.md)。
  子项 = **子关注点 + 类型目录 + 根文档**（`CHANGELOG.md`、`EXPERIMENT.md`），无散落文件。
- **子关注点**（自包含，递归套用本规则）：[`../data-validator/`](../data-validator/)（数据验证器）·
  [`../visual-fallback/`](../visual-fallback/)（可视化兜底）· [`meta-rules/`](README.md)（元规则，其下再有 `evolution/` 子关注点）。
- **类型目录**：`methods/`、`specs/`（研究/规格，待写，允许为空）。
- **M2 命名**：规则文档 `M0-…M3-…`（`M<编号>-` 前缀）；`notes/20260908-…`（`YYYYMMDD-` 日期前缀）；时间/日期一律系统 `date`（东八区）。

**可运行检查**：[`tools/meta_rules_check.py`](tools/meta_rules_check.py)（含递归子关注点）+ [`evolution/rule_evolution_check.py`](evolution/rule_evolution_check.py)（演进状态）。
`python3 lab/formal-system/meta-rules/tools/meta_rules_check.py` → 退出码 0 = 结构合法（实测 28 合规 / 0 违规）。

**落地时被规则抓住的一处（真实修正）**：`notes/` 里原 `2026-09-08-experiment-a-rust-validator.md`（`YYYY-MM-DD-`）
不符合 M2 日期前缀，已改名为 `20260908-experiment-a-rust-validator.md`；并给 `meta-rules/` 的命名词表补充其
机器可读配置 `meta-rules-config.json`（`^meta-rules-config\.json$`）——这正是一次"元规则捉住自身偏差"的实例。

### 已执行：递归子关注点重组

`lab/formal-system` 已把三个内在**子关注点**收拢为**自包含目录**（而非散在各类型目录）：

| 子关注点 | 重组后 |
| --- | --- |
| `data-validator/` | Rust crate + `notes/`(教训) |
| `visual-fallback/` | `tools/`(visual_health/review_ledger/consistency_heatmap) + `viz/`(输出) + README |
| `meta-rules/` | 规则 + 配置 + `tools/`(meta_rules_check) + `evolution/`(演进状态检查) |

`methods/`、`specs/` 保留为类型目录。重组后由递归检查证实：**28 合规 / 0 违规**；各子关注点自包含、可独立演进。

## 相关

- 工作区具体规则：[`../../../tech/README.md`](../../../tech/README.md)（docs-convention / git-convention / formalization / hooks-readme）。
- 实验日志：[`../CHANGELOG.md`](../CHANGELOG.md)。
- 规则如何定稿/回退：见 [M3-rule-evolution.md](M3-rule-evolution.md)。
