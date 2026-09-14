# 元规则（Meta-Rules）· 索引

> 本目录（`rules/meta/`）是工作区 [`rules/`](../README.md) 下的**元规则**子关注点：把"**规则之规则**"显式化、可追踪、带**演进历史**。
> 内容**复制整合自** [`lab/formal-system/concerns/meta-rules/`](../../lab/formal-system/concerns/meta-rules/README.md)（lab 原件原样保留为实验源）；**M4 未迁入**（按要求排除，原件仍在 lab）。
> **每条元规则一个文件**，文件内含"**主选 + 多条备选**"与"演进历史"。

## 这是什么

普通规则约束"某类产物怎么写/怎么命名"（工作区**具体规则**见 [`rules/`](../README.md)，R 系列）；
**元规则**约束"我们如何收敛出一个好结构并保持它**可读**"。本文档是元规则的总目录。

## 规则总表

| id | 文件 | 一句话 | 状态 |
| --- | --- | --- | --- |
| M0 | [M0-rule-governance.md](M0-rule-governance.md) | 规则的组织方式（成文/按域/编号） | 已定 |
| M1 | [M1-file-organization.md](M1-file-organization.md) | 文件组织 = 关注点优先，类型其次（含递归子关注点） | 已定 |
| M2 | [M2-naming-vocabulary.md](M2-naming-vocabulary.md) | 命名与类型词表 | 已定 |
| M3 | [M3-rule-evolution.md](M3-rule-evolution.md) | 元规则自身演进（多状态/子状态 + 允许迁移） | 已定 |
| ~~M4~~ | [M4-directory-index.md](../../lab/formal-system/concerns/meta-rules/M4-directory-index.md) | 目录说明与统一索引（每目录 STRUCTURE.md + 根 README 索引） | **未迁入**（原件在 lab） |

## 每条规则的结构（机器/人可核对）

每条元规则文件按此模板：

1. **id · 标题（状态）** + 一句话。
2. **目标**：为什么要这条（服务"快速理解"）。
3. **主选（决策）**：结论 + 理由 + 权衡。
4. **备选**：被放弃的其余选项，各给"为何不为主选 / 代价"。
5. **判定标准**：可操作的判断（如放文件前依次问什么）。
6. **自检问题**：一句反问。
7. **演进历史**：版本 / 日期 / 状态 / 变更 / 依据。

## 示样：`rules/`（M1+M2 落地示例）

以本工作区的 `rules/` 为样本，验证 M1/M2 **已落地**：

- **M1**：`rules/` 是一个**关注点**（规则）；根有出入口 [`README.md`](../README.md)。
  子项 = **根文档**（`R01–R05` 具体规则）+ **子关注点** [`meta/`](README.md)（元规则，自包含，递归套用：其下再有 [`evolution/`](evolution/README.md)）。
- **类型目录**：`meta/tools/`（检查脚本，代码类，命名豁免）。
- **M2 命名**：具体规则 `R<两位编号>-…`（如 `R01-docs-convention.md`）；元规则 `M<编号>-…`（如 `M0-rule-governance.md`）；配置 `meta-rules-config.json`；时间/日期一律系统 `date`（东八区）。

**可运行检查**（TS，跨运行时 node/deno/bun 直接运行）：

- M1+M2 结构：[`tools/meta_rules_check.ts`](tools/meta_rules_check.ts)
- M3 演进状态：[`evolution/rule_evolution_check.ts`](evolution/rule_evolution_check.ts)

```bash
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts            # 默认检查 rules/
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts --self-test
node --experimental-strip-types rules/meta/evolution/rule_evolution_check.ts
node --experimental-strip-types rules/meta/evolution/rule_evolution_check.ts --self-test
```

退出码：0=合规；1=有违规。**当前作用范围仅 `rules/`**，暂未接入 pre-commit / CI（见配置 [`meta-rules-config.json`](meta-rules-config.json)）。

## 与 lab 实验源的关系

- 本目录内容**复制整合自** [`lab/formal-system/concerns/meta-rules/`](../../lab/formal-system/concerns/meta-rules/README.md)；lab 原件**原样保留**（实验源）。
- **M4（目录说明与统一索引）本次未迁入**，原件仍在 lab：见 [`M4-directory-index.md`](../../lab/formal-system/concerns/meta-rules/M4-directory-index.md)。
- 相关具体规则：[`../README.md`](../README.md)（R 系列）；技术规范文档：[`../../tech/README.md`](../../tech/README.md)。

## 相关

- 规则如何定稿/回退：见 [M3-rule-evolution.md](M3-rule-evolution.md)。
- 实验日志：[`../../lab/formal-system/CHANGELOG.md`](../../lab/formal-system/CHANGELOG.md)。
