# LiveRefu — 复古未来（Retro-futurism）知识库与 AI 开发工作室

> 本工作区专注 **复古未来（Retro-futurism）相关项目的开发**：
> 一侧是复古未来主义的系统知识库（[`doc/`](doc/)），另一侧是基于这套知识做项目开发的 AI 工作室（[`studio/`](studio/)）。

## 一、工作区是什么

- **doc/**：复古未来主义题材的研究知识库。以《复古未来主义论文集》为核心（21 篇总卷：理论地基、未来的考古、回收的未来、当代乡愁与多元、收束五段），并含蒸汽朋克、原子朋克、柴油朋克、赛博朋克、生物朋克等独立专题卷，以及合订本（PDF/HTML）与再生脚本。
- **studio/**：AI 开发角色的模拟工作场所。把参与本工作区复古未来项目开发的 AI 角色（主策划、主程序、主美术、数值策划 A、图形程序员 A、UI 设计美术 A）按角色组织，各角色一个子目录存放身份卡与工作文档。

## 二、目录导览

| 路径 | 内容 | 入口 |
| --- | --- | --- |
| [`doc/retro-futurism/`](doc/retro-futurism/README.md) | 复古未来主义总卷：00—20 篇 + 千禧美学/原子朋克/太阳朋克/柴油朋克/生物朋克/蒸汽朋克/赛博朋克附录卷 + 合订本 | [`README.md`](doc/retro-futurism/README.md) |
| [`doc/steampunk/`](doc/steampunk/README.md) 等专题卷 | 独立专题卷（atompunk / biopunk / cyberpunk / dieselpunk / steampunk），各 README + 00—08 | 各卷 `README.md` |
| [`studio/`](studio/README.md) | AI 开发工作室：工作室主 README + 六个角色子目录 | [`studio/README.md`](studio/README.md) |
| [`tools/`](tools/check_links.py) | 仓库工具：链接校验（`check_links.py`，检查全工作区 md 内链是否失效） | [`tools/check_links.py`](tools/check_links.py) |

## 三、文档约定

1. 简体中文，Markdown（UTF-8）。
2. **doc/** 编号体例：`00_总论_…`、`01_理论篇_…`；专题卷 `00_对读篇_…` 起。
3. **studio/** 体例：角色目录内 `README.md` 为身份入口，工作文档为 `两位序号_主题.md`；草案标 `v0.x`，未决问题标 `【待定】`，结论记入各文档「决策记录」。
4. 跨目录引用优先使用相对路径链接。
5. **相对链接深度**：链接必须以「目标文件相对当前文档的正确深度」书写，保证在本地 IDE / 预览器 / 网页版都能跳转。具体规则：
   - 以文件自身所在目录为基准逐级向上（`../` 表示上一级目录），**朝向工作区根时每深一层权重就多一个 `../`**；
   - 反例（写错深度）：`studio/主策划/01_立项概念草案.md` 指向 `doc/` 知识库，因它在 `studio/主策划/`（比工作区根深两级），须写 `../../doc/...`——写成 `../doc/...` 会落在 `studio/doc/` 而失效；
   - 写法校验：**已由 `pre-commit` 钩子自动拦截**——每次 `git commit` 校验本次暂存的 md 内部链接，失效即阻断并打印明细；跳过用 `git commit --no-verify`。钩子启用（clone 后运行一次）：`./tools/install_hooks.sh`，详见 [`tools/hooks/README.md`](tools/hooks/README.md)。需全量人工检查时仍可运行 `python3 tools/check_links.py`（或 `--sub studio`）。
   - 尽量用工作区相对（`doc/...`、`studio/...`）而非每个文档手算 `../../`，因为相对链接一旦文档被移动就会失效；确需跨大目录（如 studio↔doc）时，优先在目录 README 集中建索引，减少深层 `../../`。

## 四、Git 与提交信息约定

- 本工作区的文件改动由 AI 代理 **自动提交到 Git**（无需人工提醒）；提交前确认工作树状态（`git status`）。
- 提交信息遵循业界通用的 **Conventional Commits 规范**：

  ```
  <type>(<scope>): <subject>

  <body>          ← 可选：说明"为什么"
  <footer>        ← 可选：BREAKING CHANGE / 关联引用
  ```

- **type**（必填，小写）：`feat` 新功能 / `fix` 修复 / `docs` 文档 / `style` 格式（不改逻辑）/ `refactor` 重构 / `perf` 性能 / `test` 测试 / `build` 构建 / `ci` 持续集成 / `chore` 杂务 / `revert` 回滚。
- **scope**（可选，括号内）：本次改动涉及的范围，如 `docs(studio)`、`docs(retro-futurism)`。
- **subject**（必填）：简短描述，用祈使句或简洁陈述；本仓库沿用中文描述，如 `docs(studio): 新增数值策划A初始文档`；不以句号结尾。
- **body**：需要补充"为什么这么改"时另起一行书写。
- **breaking change**：以 `BREAKING CHANGE: …` 作为 footer，或 `!` 标记于 type/scope 后（如 `feat!: …`）。
- 提交粒度：一次逻辑改动一个提交。
- 历史约定：2026-09-06 已用 Conventional Commits 规范重写全部既有提交信息（仅改消息，文件内容/作者/日期不变）；重写前历史以标签 `pre-cc-rewrite` 备份保留。

## 五、快速上手

- 想读题材理论 → 从 [`doc/retro-futurism/00_总论_未来的考古学与全卷地图.md`](doc/retro-futurism/00_总论_未来的考古学与全卷地图.md) 开始。
- 想以某角色身份协作开发 → 打开 [`studio/`](studio/)，按角色目录读取其 README。
- 想看工作室整体结构与协作拓扑 → [`studio/README.md`](studio/README.md)。
