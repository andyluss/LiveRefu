# mainline · 纲领日志（CHANGELOG）

> 记录**纲领**（"下一款主线产品"的决策与讨论空间）自己的变更。遵循工作区 [R05 变更日志约定](../../rules/R05-changelog.md)
> 与 [R05](../../rules/R05-changelog.md)。
>
> **本日志不记具体产品的开发**：那些记在各项目的 `CHANGELOG.md`（如
> [`future-debris/CHANGELOG.md`](future-debris/CHANGELOG.md)）。历史上有 17 段产品内容记在这里，
> 已于 0.18.0 迁走。

## [0.18.0] - 2026-10-23 13:57

### 变更
- **把"未来残片相关"的内容整体归位到 `future-debris/`**——`mainline` 与 `future-debris` 的分界从"按时间累积"改成"按归属"：
  - **搬走**：`HUB.html`、`GUIDE.html`（+ 生成器 `guide/`）、`cards/`，以及 docs 里**只对这一个产品成立**的 7 篇
    （03 玩法与经济循环 / 04 商业化与收入结构 / 06 发行宣发与玩家互动 / 11 Q5 平台 / 12 商店页 /
    13 商店页文案 / 14 人类试玩执行包）→ `future-debris/docs/spec/`；`docs/discussions/` → `future-debris/docs/discussions/`。
  - **留下**：`00 决策总表` / `01 定位与目标` / `02 资产盘点与杠杆` / `05 美术与技术方向` / `07 路线图与风险` /
    `08 共同语言与命名` / `09 竞品与市场调研计划` / `10 推进计划与并入清单` / `research/`。
    这几篇的题目**本来就不只对一个产品成立**（资产盘点是对整个工作区、命名规范是两个产品都要用的）。
  - **日志**：本文件原有 **17 段其实全是产品内容**（从立项建议到 GUIDE），已并入
    [`future-debris/CHANGELOG.md`](future-debris/CHANGELOG.md)（重编号 **0.23.0–0.39.0**，按时间插回原位），
    并把对应标签从 `mainline-v*` 重打为 **`future-debris-v*`**（旧标签保留但不再使用）。
  - **本日志此后只记纲领级变更**：目录与归属、容纳规则、跨项目的决策方法。
- 链接全部按"移动前解析 → 映射 → 从新位置重算"重写（**103+40+23+17 处，最终 4494 条内部链接 0 失效**）；
  工具路径同步：`check_hub.py`（HUB 新位置）、`build_guide.py`、`build_cards_js.py`、pre-commit 的 HUB 触发路径、`check_time_naming.ts` 的讨论记录覆盖路径。
- **HUB 的素材路径**（`<img src>` / poster）跟着修正 7 处——Markdown 链接校验器不查 `src=`，
  但 HUB 对账器会查素材存在性，所以这条漏掉会被它抓住。
