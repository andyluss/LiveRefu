# R02 · Git 与提交信息约定（已定 · 现行）

**一句话**：文件改动由 AI 代理**自动提交** Git（一次逻辑改动一个提交）；提交信息遵循 **Conventional Commits**，**描述用简体中文**、功能性标记（`type`/`scope` 等）保持英文。

## 一、目标

让提交历史可读、可筛、可追溯，人与 AI 用同一套规范。

## 二、规则条款（主选）

1. **自动提交**：本工作区文件改动由 AI 代理**自动提交到 Git**（无需人工提醒）；提交前确认工作树状态（`git status`）。
2. **粒度**：一次逻辑改动一个提交。
3. **格式**：`<type>(<scope>): <subject>`。`type` 必填、小写，取 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert`；`scope` 可选（如 `docs(studio001)`）。
4. **语言**：`subject`/`body`/`footer` 的**描述一律用简体中文**；`type`、`scope`、`BREAKING CHANGE`、`!` 等**功能性标记保持英文**（标识符，不随语言翻译）。
5. **body / footer**：需说明"为什么这么改"时另起一行；破坏性变更用 `BREAKING CHANGE:` 作为 footer，或 `!` 标于 type/scope 后（如 `feat!: …`）。

## 三、备选（被放弃的选项）

| 备选 | 为何不为主选 | 代价 |
| --- | --- | --- |
| 自由格式提交信息 | 无法按类型筛查 / 生成变更日志 | 历史难读 |
| 英文描述 | 与工作区中文文档与读者不一致 | 阅读与检索成本 |
| 全中文（含 `type`/`scope`） | 它们是机器可读标识符 | 工具链 / 筛选失效 |

## 四、判定标准

- 提交前 `git status` 确认改动范围。
- 消息匹配 `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .+`，且**描述为简体中文**。

## 五、自检问题

> "只看 `git log --oneline`，我能看出这次改动属于哪类、做了什么吗？"

## 六、技术详解

- 完整类型/scope 说明与历史约定：[`tech/git-convention.md`](../tech/git-convention.md)（**技术详解**，规则权威在本文件）。

## 七、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 立名目（占位）：登记 R02，正文暂以 `tech/git-convention.md` 为准 | 建立根 `rules/` 目录 |
| v2 | 2026-09-14 | `accepted.active` | **转正**：规则条款迁入本文件为权威；`tech/` 降为技术详解（分工保留） | 用户要求 R 系列转正 |
