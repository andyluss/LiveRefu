# LiveRefu — 复古未来（Retro-futurism）知识库与 AI 开发工作室

> 本工作区专注 **复古未来（Retro-futurism）相关项目的开发**：
> 一侧是复古未来主义的系统知识库（[`doc/`](doc/)），另一侧是基于这套知识做项目开发的 AI 工作室（[`studio/`](studio/)）。

## 一、工作区是什么

- **doc/**：复古未来主义题材的研究知识库。以《复古未来主义论文集》为核心（21 篇总卷：理论地基、未来的考古、回收的未来、当代乡愁与多元、收束五段），并含蒸汽朋克、原子朋克、柴油朋克、赛博朋克、生物朋克等独立专题卷，以及合订本（PDF/HTML）与再生脚本。
- **studio/**：AI 开发角色的模拟工作场所。把参与本工作区复古未来项目开发的 AI 角色（主策划、主程序、主美术、数值策划 A、图形程序员 A、UI 设计美术 A）按角色组织，各角色一个子目录存放**身份卡（README）**；角色项目文档迁至对应 `projects/<项目>/docs/<角色>/`（见下）。
- **projects/**：项目工作区。每个实际开发中的项目一个子目录（如 [`projects/tomorrows-channel/`](projects/tomorrows-channel/README.md)），内含项目 README、`CHANGELOG.md`（项目日志）与 `docs/`（按角色分目录的项目文档）。

## 二、目录导览

| 路径 | 内容 | 入口 |
| --- | --- | --- |
| [`doc/retro-futurism/`](doc/retro-futurism/README.md) | 复古未来主义总卷：00—20 篇 + 千禧美学/原子朋克/太阳朋克/柴油朋克/生物朋克/蒸汽朋克/赛博朋克附录卷 + 合订本 | [`README.md`](doc/retro-futurism/README.md) |
| [`doc/punks/`](doc/punks/README.md) | 独立专题卷（atompunk / biopunk / cyberpunk / dieselpunk / steampunk），各 README + 00—08 + 合订本 | [`doc/punks/README.md`](doc/punks/README.md) |
| [`projects/`](projects/tomorrows-channel/README.md) | 项目工作区：当前项目《明日频道》（含项目 README、CHANGELOG 日志、docs 按角色分目录） | [`projects/tomorrows-channel/README.md`](projects/tomorrows-channel/README.md) |
| [`studio/`](studio/README.md) | AI 开发工作室：六个角色身份卡（角色项目文档在 projects/ 对应项目下） | [`studio/README.md`](studio/README.md) |
| [`tech/`](tech/README.md) | 仓库级技术文档：Git 与提交约定、文档约定、相对链接校验（钩子+CI） | [`tech/README.md`](tech/README.md) |
| [`tools/`](tools/check_links.py) | 仓库工具：链接校验脚本与 pre-commit 钩子 | [`tools/check_links.py`](tools/check_links.py) |

## 三、文档约定

文档书写与"相对链接深度"的完整规范见 [`tech/docs-convention.md`](tech/docs-convention.md)。要点：

- 简体中文，Markdown（UTF-8）；doc/ 编号体例、studio/ 角色体例见该文件；
- **相对链接深度**：链接须以「目标文件相对当前文档的正确深度」书写（朝向工作区根每深一级多一个 `../`）；例如 `studio/主策划/` 指向 `doc/` 应写 `../../doc/...`；
- **校验**：`git commit` 前由 pre-commit 钩子自动拦截失效链接；提交后由 CI 兜底（见 [`tech/hooks-readme.md`](tech/hooks-readme.md)）。

## 四、Git 与提交信息约定

本工作区的文件改动由 AI 代理 **自动提交到 Git**（无需人工提醒）。提交信息遵循 Conventional Commits 规范（`<type>(<scope>): <subject>`，type 含 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert`），完整规则见 [`tech/git-convention.md`](tech/git-convention.md)。

## 五、快速上手

- 想读题材理论 → 从 [`doc/retro-futurism/00_总论_未来的考古学与全卷地图.md`](doc/retro-futurism/00_总论_未来的考古学与全卷地图.md) 开始。
- 想以某角色身份协作开发 → 打开 [`studio/`](studio/)，按角色目录读取其 README。
- 想看工作室整体结构与协作拓扑 → [`studio/README.md`](studio/README.md)。
