# Git 与提交信息约定

> 工作区级技术规范。本文是仓库 `Git` 行为的唯一权威说明；根 [`README.md`](../README.md) 仅保留指向本文件的入口。
>
> **规则权威**：[`rules/R02-git-convention.md`](../rules/R02-git-convention.md)（R02 Git 与提交信息约定）。本文为**技术详解 / 实施说明**。

## 一、自动提交

- 本工作区的文件改动由 AI 代理 **自动提交到 Git**（无需人工提醒）；提交前确认工作树状态（`git status`）。
- 提交粒度：一次逻辑改动一个提交。

## 二、提交信息遵循 Conventional Commits

通用格式：

```
<type>(<scope>): <subject>

<body>          ← 可选：说明"为什么"
<footer>        ← 可选：BREAKING CHANGE / 关联引用
```

> **语言约定（重要）**：`subject`、`body`、`footer` 的**描述一律用简体中文**；`type`、`scope` 及 `BREAKING CHANGE`、`!` 等**功能性标记保持英文**（标识符，不随语言翻译）。例如 `docs(studio): 新增数值策划A初始文档`（`docs(studio):` 为英文功能标记，`新增数值策划A初始文档` 为中文描述）。

### type（必填，小写）

`feat` 新功能 / `fix` 修复 / `docs` 文档 / `style` 格式（不改逻辑）/ `refactor` 重构 / `perf` 性能 / `test` 测试 / `build` 构建 / `ci` 持续集成 / `chore` 杂务 / `revert` 回滚。

### scope（可选，括号内）

本次改动涉及的范围，如 `docs(studio)`、`docs(retro-futurism)`。

### subject（必填）

简短描述，用祈使句或简洁陈述；**本仓库提交信息描述一律使用简体中文**（`type`/`scope` 等功能性标记保持英文，见上「语言约定」），如 `docs(studio): 新增数值策划A初始文档`；不以句号结尾。

### body / footer

- **body**：需要补充"为什么这么改"时另起一行书写。
- **breaking change**：以 `BREAKING CHANGE: …` 作为 footer，或 `!` 标记于 type/scope 后（如 `feat!: …`）。

## 三、历史约定

- 2026-09-06 已用 Conventional Commits 规范重写全部既有提交信息（仅改消息，文件内容/作者/日期不变）；重写前历史以标签 `pre-cc-rewrite` 备份保留。
- 此后新提交一律遵循本文规范。
