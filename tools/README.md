# tools · 跨关注点通用工具

> 本目录存放**面向整个工作区**的检查器与钩子（[M1 §四](../rules/meta/M1-file-organization.md)：通用工具 → `tools/`）。
> **规则权威在 [`rules/`](../rules/README.md)**（R 系列）；技术详解在 [`tech/`](../tech/README.md)；本文只回答"**有哪些工具、怎么跑**"。
> 项目内专用的检查器**不放这里**（如主线项目的闸门在 [`projects/mainline/future-debris/tools/`](../projects/mainline/future-debris/run.sh)）。

## 检查器

| 工具 | 作用 | 对应规则 | 跑法 |
| --- | --- | --- | --- |
| [`check_links.ts`](check_links.ts) | 校验工作区 Markdown 的**相对链接**是否失效 | [R03](../rules/R03-link-validation.md) | `node --experimental-strip-types tools/check_links.ts [-v] [--files …]` |
| [`check_changelog.ts`](check_changelog.ts) | 变更日志格式（版本头/时间倒序/标准类目/**版本号 ↔ git tag**） | [R05](../rules/R05-changelog.md) | `… --file <CHANGELOG> --tag-prefix <前缀>` |
| [`check_time_naming.ts`](check_time_naming.ts) | **时间戳文件名**格式与"不得晚于首次提交时间" | [R06](../rules/R06-time.md) | `node --experimental-strip-types tools/check_time_naming.ts` |
| [`check_data.ts`](check_data.ts) | 数据表是否符合 schema 契约（必填/type/enum/范围） | [R04](../rules/R04-data-validation.md) | `node --experimental-strip-types tools/check_data.ts -v` |
| [`sim_refu_game_001.ts`](sim_refu_game_001.ts) | 《节点防线》难度模型自检与章节带位校验 | 项目内约定 | `… --selftest` / `--verify-bands --n 20000` |

> **Python 版（`check_links.py` / `check_data.py`）**：与 TS 版同功能，纯标准库、无需 node，供不便装 node 的环境使用。
> **自检是硬要求**：每个检查器都要能 `--self-test`（或 `--selftest`）——**喂已知坏数据、确认它会失败**。
> "只验证通过、不验证会失败"的检查器会给出**静默假通过**，本工作区已因此吃过亏。

## 钩子

| 工具 | 作用 |
| --- | --- |
| [`install_hooks.sh`](install_hooks.sh) | 一键把 `hooks/` 装进 `.git/hooks/` |
| [`hooks/pre-commit`](hooks/pre-commit) | 钩子本体：按**暂存路径**触发相应检查（链接 / 数据契约 / 时间戳命名 / 元规则与规则演进 / 变更日志版本-标签） |

## 约定

- **能被 `--files` 限定的就用 `--files`**：pre-commit 只校验暂存文件，避免"改一行等全库扫描"。
- **文件名用代码习惯**（`check_links.ts`、`snake_case` 或 `kebab-case`），不套技术文档的命名——本目录在 [M1/M2 判定配置](../rules/meta/tools/config-tools.json) 里列为**代码类（命名豁免）**。
- **新增工具后**：更新本表；若是新规则的可执行判定，同时在 `rules/` 侧接上 pre-commit 与 CI。
