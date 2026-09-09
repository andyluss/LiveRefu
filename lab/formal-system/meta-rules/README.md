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

## 相关

- 工作区具体规则：[`../../../tech/README.md`](../../../tech/README.md)（docs-convention / git-convention / formalization / hooks-readme）。
- 实验日志：[`../CHANGELOG.md`](../CHANGELOG.md)。
- 规则如何定稿/回退：见 [M3-rule-evolution.md](M3-rule-evolution.md)。
