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
| R06 | [时间与时间戳约定](R06-time.md) | 时间一律东八区、**精确到分**、不得脑内手写（已提交取 git 提交时间 / 新建取系统时钟）；**时间类新约定一律追加进本文** | 已定·现行 | [M2](meta/M2-naming-vocabulary.md)（命名词表）、[`tech/docs-convention.md`](../tech/docs-convention.md)（日期部分） |

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

- [`indie/`](../indie/README.md)（独立项目区）与 [`lab/`](../lab/README.md)（实验项目区）下的子目录**默认豁免上述根规则**（R01–R06 具体规则与 M0–M3 元规则），除非**特别约定**。
- 各子项目/实验可自定义约定；若需引用某条根规则，在该子项目 README 中写明即可。

### 3.1 机器校验的实际覆盖（**已知缺口，写在明处**）

"豁免"说的是**规则适用性**；下面说的是**机器校验是否真的在跑**——两者不是一回事，此前混为一谈，导致"项目里另立一套命名不会被发现"（2026-10-08 讨论记录命名与 [M2](meta/M2-naming-vocabulary.md) 冲突，就是这么漏过去的）。

覆盖清单在 [`meta/tools/workspace-scope.json`](meta/tools/workspace-scope.json)，由 [`meta/tools/meta_rules_scope.ts`](meta/tools/meta_rules_scope.ts) 执行（pre-commit 跑 `--block-only`、CI 跑全量）：

| 状态 | 含义 | 当前 |
| --- | --- | --- |
| **block** | 纳入闸门，必须 0 违规 | `rules/`、`projects/mainline/`、`tech/`、`projects/tomorrows-channel/`、`projects/refu-game-001/` |
| **report** | 只报告不拦截，欠账可见 | `tools/`、`doc/`（粗估 332 条）、`studio001/`、`projects/livefab`、`projects/website` |
| **exempt** | 按本节豁免 | `indie/`、`lab/` |

- **为什么不全开**：实测用通用配置跑 `projects/` 会产出上百条**因配置不全而来的假阳性**；闸门一旦变成噪声，人就开始绕过它，比不查更糟。
- **怎么推进**：某个关注点先写自己的判定配置 → 跑到 0 违规 → 把它的 `mode` 从 `report` 改成 `block`。**一次只开一个，且开之前先确认是干净的。**
  2026-10-08 首批转正三个：`tech/`（10 合规）、`projects/tomorrows-channel`（29）、`projects/refu-game-001`（18）——它们本来就只有通用配置，写了专门配置后一次达标。

## 四、规则来源与演进

- **具体规则（R01–R06）**：已由占位**转正**为权威条款；`tech/` 对应文档为技术详解（非规则权威）。
- **元规则（M0–M3）**：整合自 [`lab/formal-system`](../lab/formal-system/README.md) 实验（**M4 未迁入**，按要求排除）。
- 每条规则的状态与演进历史见其文件末尾，由 [`meta/evolution/rule_evolution_check.ts`](meta/evolution/rule_evolution_check.ts) 校验。
