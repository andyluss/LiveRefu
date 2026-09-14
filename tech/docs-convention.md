# 文档约定

> 工作区级文档规范。本文是仓库 Markdown 书写与「相对链接」约束的权威说明；根 [`README.md`](../README.md) 仅保留入口。
>
> **规则权威**：[`rules/R01-docs-convention.md`](../rules/R01-docs-convention.md)（R01 文档约定）。本文为**技术详解 / 实施说明**，供实施与背景查阅。

## 一、通用

1. 简体中文，Markdown（UTF-8）。
2. **doc/** 编号体例：`00_总论_…`、`01_理论篇_…`；专题卷 `00_对读篇_…` 起。
3. **studio001/** 体例：角色目录内 `README.md` 为身份入口，工作文档为 `两位序号_主题.md`；草案标 `v0.x`，未决问题标 `【待定】`，结论记入各文档「决策记录」。
4. 跨目录引用优先使用相对路径链接。
5. **日期**：文档中出现的日期一律以 **东八区（Asia/Shanghai，`+0800`）** 为准，且**从系统实际时间取值，禁止"脑内手写"**。写文档/决策记录/变更记录前先跑：
   ```bash
   date '+%Y-%m-%d'
   ```
   用该返回值标注。不要根据"印象中的今天"或相对日期推算，否则会出现文档日期与实际（git 提交时间）不一致的笔误（曾发生 09-07/09-09 写错、实际为 09-08 的案例）。

> 说明：git 提交时间戳遵循本机时区。若本机为东八区，`date` 与提交时间一致；若需要，可在提交脚本中用 `TZ='Asia/Shanghai' date ...` 显式统一。

## 二、相对链接深度（重要）

链接必须以「目标文件相对当前文档的正确深度」书写，保证在本地 IDE / 预览器 / 网页版都能跳转。

- 以文件自身所在目录为基准逐级向上（`../` 表示上一级目录），**朝向工作区根时每深一层权重就多一个 `../`**；
- **反例（写错深度）**：`studio001/主策划/01_立项概念草案.md` 指向 `doc/` 知识库，因它在 `studio001/主策划/`（比工作区根深两级），须写 `../../doc/...`——写成 `../doc/...` 会落在 `studio001/doc/` 而失效；
- **宜用工作区相对**（`doc/...`、`studio001/...`）而非每文档手算 `../../`，因为相对链接一旦文档被移动就会失效；确需跨大目录（如 studio001↔doc）时，优先在目录 README 集中建索引，减少深层 `../../`。

### 校验机制

「相对链接写错」靠两道闸门拦截：

1. **pre-commit 钩子（本地，clone 后启用一次）**：每次 `git commit` 校验本次暂存的 md 内部链接，失效即阻断并打印明细；跳过用 `git commit --no-verify`。启用见 [`install_hooks`](../tools/install_hooks.sh)，说明见 [`hooks-readme`](hooks-readme.md)。
2. **CI 链接检查（提交后兜底）**：即使本地未启用钩子，推送到托管平台后由 CI 跑链接校验（`tools/check_links.ts`）拦截。本仓库远端为 [github.com/andyluss/LiveRefu](https://github.com/andyluss/LiveRefu)，push / PR 时 CI 自动触发。详见 [`hooks-readme`](hooks-readme.md) 的 CI 一节。

需全量人工检查时，仍可手动运行：

```bash
python3 tools/check_links.py            # 全工作区
python3 tools/check_links.py --sub studio001   # 只看工作室
python3 tools/check_links.py --files <md文件>  # 只看指定文件
```
