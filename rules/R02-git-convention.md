# R02 · Git 与提交信息约定（已定 · 现行）

**一句话**：文件改动由 AI 代理**自动提交** Git（一次逻辑改动一个提交）；提交信息遵循 **Conventional Commits**，**描述用简体中文**、功能性标记（`type`/`scope` 等）保持英文。

> 状态：`accepted.active` ｜ 版本：v3 ｜ 最后更新：2026-10-27
> 本文是 Git 提交信息的**唯一规则与格式规格**；原 [`tech/git-convention.md`](../tech/git-convention.md) 已整合进本文，仅保留指针。

## 一、目标

让提交历史可读、可筛、可追溯，人与 AI 用同一套规范。

## 二、规则条款（主选）

1. **自动提交**：本工作区文件改动由 AI 代理**自动提交到 Git**（无需人工提醒）；提交前确认工作树状态（`git status`）。
2. **粒度**：一次逻辑改动一个提交。
3. **格式**：`<type>(<scope>): <subject>`。`type` 必填、小写；`scope` 可选。
4. **语言**：`subject`/`body`/`footer` 的**描述一律用简体中文**；`type`、`scope`、`BREAKING CHANGE`、`!` 等**功能性标记保持英文**。
5. **body / footer**：需要说明“为什么这么改”时另起一行；破坏性变更用 `BREAKING CHANGE:` footer，或 `!` 标于 type/scope 后（如 `feat!: …`）。

## 三、Conventional Commits 格式

```text
<type>(<scope>): <subject>

<body>          ← 可选：说明“为什么”
<footer>        ← 可选：BREAKING CHANGE / 关联引用
```

示例：

```text
docs(studio001): 新增数值策划A初始文档
feat(livedso)!: 移除旧 token 投影
```

### type（必填，小写）

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复 |
| `docs` | 文档 |
| `style` | 格式（不改逻辑） |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `build` | 构建 |
| `ci` | 持续集成 |
| `chore` | 杂务 |
| `revert` | 回滚 |

### scope（可选，括号内）

本次改动涉及的范围，如 `docs(studio001)`、`docs(retro-futurism)`。scope 也保持英文/既有标识符，不翻译。

### subject（必填）

- 简短描述，用祈使句或简洁陈述；
- **一律简体中文**；
- 不以句号结尾；
- 示例：`docs(studio001): 新增数值策划A初始文档`。

### body / footer

- **body**：需要补充“为什么这么改”时另起一行书写。
- **breaking change**：以 `BREAKING CHANGE: …` 作为 footer，或 `!` 标记于 type/scope 后（如 `feat!: …`）。

## 四、历史约定

- 2026-09-06 已用 Conventional Commits 规范重写全部既有提交信息（仅改消息，文件内容/作者/日期不变）；重写前历史以标签 `pre-cc-rewrite` 备份保留。
- 此后新提交一律遵循本文规范。

## 五、备选（被放弃）

| 备选 | 为何不为主选 | 代价 |
| --- | --- | --- |
| 自由格式提交信息 | 无法按类型筛查/生成变更日志 | 历史难读 |
| 英文描述 | 与工作区中文文档/读者不一致 | 阅读与检索成本 |
| 全中文（含 `type`/`scope`） | 它们是机器可读标识符 | 工具链/筛选失效 |

## 六、判定标准

- 提交前 `git status` 确认改动范围。
- 消息匹配：

```regex
^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+
```

且**描述为简体中文**。

## 七、自检

> “只看 `git log --oneline`，我能看出这次改动属于哪类、做了什么吗？”

## 八、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 立名目（占位）：登记 R02，正文暂以 `tech/git-convention.md` 为准 | 建立根 `rules/` 目录 |
| v2 | 2026-09-14 | `accepted.active` | **转正**：规则条款迁入本文件为权威；`tech/` 降为技术详解（分工保留） | 用户要求 R 系列转正 |
| v3 | 2026-10-27 | `accepted.active` | **整合 `tech/git-convention.md`**：Conventional 格式、type/scope/subject/body/footer、语言约定、历史重写记录全部收进本文件；tech 文件只留指针 | 用户要求消除两处维护的规则/技术文档 |
