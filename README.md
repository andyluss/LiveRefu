# LiveRefu — 复古未来（Retro-futurism）知识库与 AI 开发工作室

> 本工作区专注 **复古未来（Retro-futurism）相关项目的开发**：
> 一侧是复古未来主义的系统知识库（[`doc/`](doc/)），另一侧是基于这套知识做项目开发的 AI 工作室（[`studio/`](studio/)）。

## 一、工作区是什么

- **rules/**：规则目录。面向工作区整体的规则在此集中，分**具体规则**（R 系列，**已转正**，正文权威在此）与**元规则**（M 系列，整合自 lab，见 [`rules/meta/`](rules/meta/README.md)）。对应的 [`tech/`](tech/README.md) 文档为**技术详解 / 实施说明**（非规则权威）。
- **doc/**：复古未来主义题材的研究知识库。以《复古未来主义论文集》为核心（21 篇总卷：理论地基、未来的考古、回收的未来、当代乡愁与多元、收束五段），并含蒸汽朋克、原子朋克、柴油朋克、赛博朋克、生物朋克等独立专题卷，以及合订本（PDF/HTML）与再生脚本。
- **studio/**：AI 开发角色的模拟工作场所。把参与本工作区复古未来项目开发的 AI 角色（主策划、主程序、主美术、数值策划 A、图形程序员 A、UI 设计美术 A）按角色组织，各角色一个子目录存放**身份卡（README）**；角色项目文档迁至对应 `projects/<项目>/docs/<角色>/`（见下）。
- **projects/**：项目工作区。每个实际开发中的项目一个子目录（如 [`projects/tomorrows-channel/`](projects/tomorrows-channel/README.md)），内含项目 README、`CHANGELOG.md`（项目日志）与 `docs/`（按角色分目录的项目文档）。
- **indie/**：独立项目区。存放与工作区主线无直接关联的**独立项目**，每个项目一个子目录、自成体系（见 [`indie/README.md`](indie/README.md)）。
- **lab/**：实验项目区。小范围探索新协作路径、新形式化方法等**实验项目**（见 [`lab/README.md`](lab/README.md)，其下 [`lab/formal-system/`](lab/formal-system/README.md) 为形式化协作实验基地），成熟后回流主项目。

> **约定豁免**：`indie/`（独立项目区）与 `lab/`（实验项目区）下的子目录**默认豁免 [`rules/`](rules/README.md) 中的全部根规则**——当前为 **R01 文档约定**、**R02 Git 与提交信息约定**、**R03 相对链接校验**、**R04 数据 schema 校验**、**R05 变更日志记录约定**，以及**元规则 M0–M3**（见 [`rules/meta/`](rules/meta/README.md)）——除非**特别约定**。各子项目/实验可自定约定；若需引用某条根规则，在该子项目 README 中写明即可。

## 二、目录导览

| 路径 | 内容 | 入口 |
| --- | --- | --- |
| [`rules/`](rules/README.md) | 规则目录：具体规则 R01–R05（**已转正**，权威）+ 元规则 M0–M3（`rules/meta/`，整合自 lab）；`tech/` 为技术详解 | [`rules/README.md`](rules/README.md) |
| [`doc/retro-futurism/`](doc/retro-futurism/README.md) | 复古未来主义总卷：00—20 篇 + 千禧美学/原子朋克/太阳朋克/柴油朋克/生物朋克/蒸汽朋克/赛博朋克附录卷 + 合订本 | [`README.md`](doc/retro-futurism/README.md) |
| [`doc/punks/`](doc/punks/README.md) | 独立专题卷（atompunk / biopunk / cyberpunk / dieselpunk / steampunk），各 README + 00—08 + 合订本 | [`doc/punks/README.md`](doc/punks/README.md) |
| [`projects/`](projects/tomorrows-channel/README.md) | 项目工作区：当前项目《明日频道》（含项目 README、CHANGELOG 日志、docs 按角色分目录） | [`projects/tomorrows-channel/README.md`](projects/tomorrows-channel/README.md) |
| [`indie/`](indie/README.md) | 独立项目区：与主线无关的独立项目，一项目一子目录、自成体系（默认豁免根目录规则） | [`indie/README.md`](indie/README.md) |
| [`studio/`](studio/README.md) | AI 开发工作室：六个角色身份卡（角色项目文档在 projects/ 对应项目下） | [`studio/README.md`](studio/README.md) |
| [`tech/`](tech/README.md) | 仓库级技术文档：Git 与提交约定、文档约定、相对链接与数据 schema 校验（钩子+CI）、形式化验证 | [`tech/README.md`](tech/README.md) |
| [`tools/`](tools/check_links.py) | 仓库工具：链接校验脚本与 pre-commit 钩子 | [`tools/check_links.py`](tools/check_links.py) |
| [`lab/`](lab/README.md) | 实验项目区：形式化协作等实验基地（Rust/CUE/Alloy + 属性测试），成熟后回流主项目 | [`lab/README.md`](lab/README.md) |

## 三、文档约定

文档书写的**规则**见 [`rules/R01-docs-convention.md`](rules/R01-docs-convention.md)（技术详解 [`tech/docs-convention.md`](tech/docs-convention.md)）。要点：

- 简体中文，Markdown（UTF-8）；doc/ 编号体例、studio/ 角色体例见该文件；
- **相对链接深度**：链接须以「目标文件相对当前文档的正确深度」书写（朝向工作区根每深一级多一个 `../`）；例如 `studio/主策划/` 指向 `doc/` 应写 `../../doc/...`；
- **校验**：`git commit` 前由 pre-commit 钩子自动拦截失效链接；提交后由 CI 兜底（见 [`tech/hooks-readme.md`](tech/hooks-readme.md)）。

## 四、Git 与提交信息约定

本工作区的文件改动由 AI 代理 **自动提交到 Git**（无需人工提醒）。提交信息遵循 Conventional Commits 规范（`<type>(<scope>): <subject>`，type 含 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert`）；**描述用简体中文**，`type`/`scope` 等功能性标记保持英文。**规则**见 [`rules/R02-git-convention.md`](rules/R02-git-convention.md)（技术详解 [`tech/git-convention.md`](tech/git-convention.md)）。

## 五、快速上手

- 想读题材理论 → 从 [`doc/retro-futurism/00_总论_未来的考古学与全卷地图.md`](doc/retro-futurism/00_总论_未来的考古学与全卷地图.md) 开始。
- 想以某角色身份协作开发 → 打开 [`studio/`](studio/)，按角色目录读取其 README。
- 想看工作室整体结构与协作拓扑 → [`studio/README.md`](studio/README.md)。

## 六、变更日志

工作区根级变更记于 [`CHANGELOG.md`](CHANGELOG.md)，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [SemVer](https://semver.org/)；**每次（非琐碎）变更都须记录**（规则见 [`rules/R05-changelog.md`](rules/R05-changelog.md)，格式规格见 [`tech/changelog-convention.md`](tech/changelog-convention.md)）。琐碎改动（如改错别字、纯格式）豁免。
