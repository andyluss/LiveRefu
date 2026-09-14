# rules · 规则目录

> 本目录是工作区的**规则所在目录**（规则的家）。面向工作区整体的规则在此**按域编号、集中收口**，分两族：
> **具体规则**（R 系列，约束"某类产物怎么写/怎么命名"）与**元规则**（M 系列，约束"规则本身如何组织/演进"，见 [`meta/`](meta/README.md)）。
> 当前具体规则为**占位阶段**：正文以 `tech/` 下对应文档为准，`rules/` 先立名目；**正式规则仍在 [`lab/`](../lab/README.md) 里实验**，成熟后迁移至此。

## 一、具体规则（R 系列）

> 每条占位规则仍是「名目 + 状态 + 当前权威来源」：占位阶段正文以 `tech/` 下对应文档为准，待正式版迁入再填充正文。

| 编号 | 规则 | 一句话 | 当前权威来源 | 状态 |
| --- | --- | --- | --- | --- |
| R01 | 文档约定 | 简体中文 Markdown；doc/studio 体例；相对链接深度 | [`tech/docs-convention.md`](../tech/docs-convention.md) | 占位 |
| R02 | Git 与提交信息约定 | Conventional Commits、AI 自动提交 | [`tech/git-convention.md`](../tech/git-convention.md) | 占位 |
| R03 | 相对链接校验 | pre-commit 钩子 + CI 两道闸门 | [`tech/hooks-readme.md`](../tech/hooks-readme.md) | 占位 |
| R04 | 数据 schema 校验 | 数据表契约（必填/type/enum/范围） | [`tech/formalization.md`](../tech/formalization.md) | 占位 |
| R05 | 变更日志记录约定 | 每次（非琐碎）变更写变更日志；琐碎改动豁免 | [`tech/changelog-convention.md`](../tech/changelog-convention.md) | 占位 |

## 二、元规则（M 系列，[`meta/`](meta/README.md)）

> **规则之规则**：如何组织、命名、演进规则本身。**整合自 lab**（M4 除外，原件仍在 lab）；每条一个文件，含"主选 + 备选 + 演进历史"。

| 编号 | 规则 | 一句话 | 状态 |
| --- | --- | --- | --- |
| M0 | [rule-governance](meta/M0-rule-governance.md) | 规则的组织方式（成文/按域/编号） | 已定 |
| M1 | [file-organization](meta/M1-file-organization.md) | 文件组织 = 关注点优先，类型其次（含递归子关注点） | 已定 |
| M2 | [naming-vocabulary](meta/M2-naming-vocabulary.md) | 命名与类型词表 | 已定 |
| M3 | [rule-evolution](meta/M3-rule-evolution.md) | 元规则自身演进（多状态/子状态 + 允许迁移） | 已定 |

- 索引、示样与用法：[`meta/README.md`](meta/README.md)。
- 可运行检查（TS，跨 node/deno/bun）：[`meta/tools/meta_rules_check.ts`](meta/tools/meta_rules_check.ts)（M1+M2 结构）、[`meta/evolution/rule_evolution_check.ts`](meta/evolution/rule_evolution_check.ts)（M3 演进状态）。**当前作用范围仅 `rules/`，暂未接入 pre-commit/CI。**

## 三、豁免范围

- [`indie/`](../indie/README.md)（独立项目区）与 [`lab/`](../lab/README.md)（实验项目区）下的子目录**默认豁免上述根规则**（R01–R05 具体规则与 M0–M3 元规则），除非**特别约定**。
- 各子项目/实验可自定义约定；若需引用某条根规则，在该子项目 README 中写明即可。

## 四、未来（正式规则溯源）

- 正式规则从 [`lab/formal-system`](../lab/formal-system/README.md) 实验成熟后**迁移至此**，替换对应占位条目；届时保留「实验来源」与演进历史。
- 元规则（M0–M3）已按此思路**整合进 [`meta/`](meta/README.md)**；**M4 未迁入**（按要求排除）。
