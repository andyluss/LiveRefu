# R03 · 相对链接校验（已定 · 已落地）

**一句话**：用**两道闸门**——本地 pre-commit 钩子（提交前）+ CI（提交后兜底）——校验 Markdown 内部相对链接，失效即**拦截**。

## 一、目标

把"相对链接深度写错"从"靠人肉核对"变成"提交前机器拦截"，保证文档链接在本地 IDE / 预览器 / 网页版都能跳转。

## 二、规则条款（主选）

1. **两道闸门**：① **pre-commit 钩子**——每次 `git commit` 前校验**本次暂存的 `*.md`**；② **CI**——提交后全量校验兜底。
2. **判定口径**：只判真正需要存在的**内部相对链接**；外链、纯锚点、无目标条目跳过；目标文件/目录不存在 = 失效 = 拦截。
3. **启用**：clone 后运行一次 `./tools/install_hooks.sh`（设置 `core.hooksPath tools/hooks`，用相对路径、幂等可重跑）。
4. **例外**：确认本次改动无需修复时，可用 `git commit --no-verify` 临时跳过（须自行确认链接）。
5. **手动运行**：全量 `node --experimental-strip-types tools/check_links.ts`；模拟钩子 `bash tools/hooks/pre-commit`（退出码 0=通过）。

## 三、备选（被放弃的选项）

| 备选 | 为何不为主选 | 代价 |
| --- | --- | --- |
| 只靠 CI | 反馈晚（合入前才发现） | 返工 |
| 只靠本地钩子 | 未启用钩子者会漏检 | 漏网 |
| 不做链接校验 | 链接静默失效 | 文档不可用 |

## 四、判定标准

- `bash tools/hooks/pre-commit` 退出码 `0`。
- `node --experimental-strip-types tools/check_links.ts` 退出码 `0`。

## 五、自检问题

> "我这次提交触动/新增的 md 链接，钩子会放行吗？"

## 六、技术详解

- 钩子/CI 的启用、跳过与排查：[`tech/hooks-readme.md`](../tech/hooks-readme.md)（**技术详解**，规则权威在本文件）。
- 工具：[`tools/check_links.ts`](../tools/check_links.ts)、[`tools/install_hooks.sh`](../tools/install_hooks.sh)、[`tools/hooks/pre-commit`](../tools/hooks/pre-commit)。

## 七、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `proposed` | 立名目（占位）：登记 R03，正文暂以 `tech/hooks-readme.md` 为准 | 建立根 `rules/` 目录 |
| v2 | 2026-09-14 | `accepted.applied` | **转正**：规则条款迁入本文件为权威；已有钩子/CI 工具，状态标 `applied` | 用户要求 R 系列转正 |
