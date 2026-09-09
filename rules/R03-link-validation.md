# R03 · 相对链接校验 · 占位

> 状态：**占位**。本文暂为名目，正文以 [`tech/hooks-readme.md`](../tech/hooks-readme.md) 为准；
> 正式版待 [`lab/formal-system`](../lab/formal-system/README.md) 实验成熟后迁入替换本文件。

## 规则要点（当前）

- 两道闸门校验 Markdown 内部相对链接：**pre-commit 钩子**（提交前）+ **CI**（提交后兜底）。
- 校验逻辑复用 [`tools/check_links.ts`](../tools/check_links.ts)；启用见 [`tools/install_hooks.sh`](../tools/install_hooks.sh)。

## 未来

- 待 `lab/formal-system` 的形式化规则迁入后，替换为含「主选 + 备选 + 判定标准 + 演进历史」的正式版。
