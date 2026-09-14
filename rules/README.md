# rules · 规则目录

> 本目录是工作区的**规则所在目录**（规则的家）。面向工作区整体的规则在此**按域编号、集中收口**，分两族：
> **具体规则**（R 系列，约束"某类产物怎么写/怎么命名"）与**元规则**（M 系列，约束"规则本身如何组织/演进"，见 [`meta/`](meta/README.md)）。
> **具体规则已转正**：正文（规则条款）以本目录 `R*.md` 为**权威**；[`tech/`](../tech/README.md) 对应文档降为**技术详解 / 实施说明**。

## 一、具体规则（R 系列）

> 每条规则含：目标 / 规则条款 / 备选 / 判定标准 / 自检 / 技术详解 / 演进历史（遵循元规则 [M3](meta/M3-rule-evolution.md)）。

| 编号 | 规则 | 一句话 | 状态 | 技术详解 |
| --- | --- | --- | --- | --- |
| R01 | [文档约定](R01-docs-convention.md) | 简体中文 Markdown；doc/studio001 体例；相对链接深度；东八区日期 | 已定·现行 | [`tech/docs-convention.md`](../tech/docs-convention.md) |
| R02 | [Git 与提交信息约定](R02-git-convention.md) | Conventional Commits；描述用中文、标记用英文；AI 自动提交 | 已定·现行 | [`tech/git-convention.md`](../tech/git-convention.md) |
| R03 | [相对链接校验](R03-link-validation.md) | pre-commit 钩子 + CI 两道闸门校验内部相对链接 | 已定·已落地 | [`tech/hooks-readme.md`](../tech/hooks-readme.md) |
| R04 | [数据 schema 校验](R04-data-validation.md) | 数据表按 schema 契约校验（必填/type/enum/范围） | 已定·已落地 | [`tech/formalization.md`](../tech/formalization.md)（数据契约部分） |
| R05 | [变更日志记录约定](R05-changelog.md) | 每次（非琐碎）变更写变更日志；琐碎改动豁免 | 已定·现行 | [`tech/changelog-convention.md`](../tech/changelog-convention.md) |

## 二、元规则（M 系列，[`meta/`](meta/README.md)）

> **规则之规则**：如何组织、命名、演进规则本身。**整合自 lab**（M4 除外，原件仍在 lab）；每条一个文件，含"主选 + 备选 + 演进历史"。

| 编号 | 规则 | 一句话 | 状态 |
| --- | --- | --- | --- |
| M0 | [rule-governance](meta/M0-rule-governance.md) | 规则的组织方式（成文/按域/编号） | 已定 |
| M1 | [file-organization](meta/M1-file-organization.md) | 文件组织 = 关注点优先，类型其次（含递归子关注点） | 已定 |
| M2 | [naming-vocabulary](meta/M2-naming-vocabulary.md) | 命名与类型词表 | 已定 |
| M3 | [rule-evolution](meta/M3-rule-evolution.md) | 规则演进（多状态/子状态 + 允许迁移） | 已定 |

- 索引、示样与用法：[`meta/README.md`](meta/README.md)。
- 可运行检查（TS，跨 node/deno/bun）：[`meta/tools/meta_rules_check.ts`](meta/tools/meta_rules_check.ts)（M1+M2 结构）、[`meta/evolution/rule_evolution_check.ts`](meta/evolution/rule_evolution_check.ts)（M3 演进状态，**覆盖元规则 M 与具体规则 R**）。作用范围 `rules/`；**已接入 pre-commit**（暂存涉及 `rules/` 时）**与 CI**（[`.github/workflows/verify.yml`](../.github/workflows/verify.yml)）。

## 三、豁免范围

- [`indie/`](../indie/README.md)（独立项目区）与 [`lab/`](../lab/README.md)（实验项目区）下的子目录**默认豁免上述根规则**（R01–R05 具体规则与 M0–M3 元规则），除非**特别约定**。
- 各子项目/实验可自定义约定；若需引用某条根规则，在该子项目 README 中写明即可。

## 四、规则来源与演进

- **具体规则（R01–R05）**：已由占位**转正**为权威条款；`tech/` 对应文档为技术详解（非规则权威）。
- **元规则（M0–M3）**：整合自 [`lab/formal-system`](../lab/formal-system/README.md) 实验（**M4 未迁入**，按要求排除）。
- 每条规则的状态与演进历史见其文件末尾，由 [`meta/evolution/rule_evolution_check.ts`](meta/evolution/rule_evolution_check.ts) 校验。
