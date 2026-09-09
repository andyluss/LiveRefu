# 变更日志（Changelog）

> 本文件记录 **LiveRefu · 复古未来知识库与 AI 开发工作室** 工作区根级的变更。
> 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式与 [SemVer](https://semver.org/) 版本语义；完整书写规格见 [`tech/changelog-convention.md`](tech/changelog-convention.md)；
> 「每次（非琐碎）变更须记录」规则见 [`rules/R05-changelog.md`](rules/R05-changelog.md)。
> 各项目/实验的日志在其各自根目录（如 `projects/tomorrows-channel/CHANGELOG.md`、`lab/formal-system/CHANGELOG.md`）。

## [未发布]

### 新增
- 新增 [`indie/`](indie/README.md)：**独立项目区**（与工作区主线无关的独立项目）；其子目录默认豁免根目录规则。
- 新增 [`lab/`](lab/README.md)：**实验项目区**（实验性质项目的入口）；其子目录默认豁免根目录规则。
- 新增根 [`rules/`](rules/README.md) **规则目录**：集中收口工作区具体规则；初始为占位规则 **R01**（文档约定）、**R02**（Git 与提交信息约定）、**R03**（相对链接校验）、**R04**（数据 schema 校验）。
- 新增 [`rules/R05-changelog.md`](rules/R05-changelog.md)：要求**每次（非琐碎）变更都写变更日志**；琐碎改动（如改错别字、纯格式）豁免。
- 新增 [`tech/changelog-convention.md`](tech/changelog-convention.md)：变更日志**格式规格**（Keep a Changelog 类目 + SemVer + 东八区日期，面向复杂情形）。

### 变更
- 根 [`README.md`](README.md) 增加 `indie/`、`lab/`、`rules/` 的目录说明与导览行；`lab/` 入口改为指向其自身的 README。
- 根 `README.md` 改写「约定豁免」说明：明确列出被豁免的具体规则（R01–R05）。
- [`tech/README.md`](tech/README.md) 更新：实验性技术规则成熟后的回流目标由 `tech/` 改为根 `rules/`。
- 新增本变更日志（本文件）与「每次变更须记录」约定（R05）。
