# tech/references · 参考资料与归档

> 本目录存放**技术侧的参考资料**：外部数据的抓取结果、生成物的归档快照等。
> 与 `tech/` 其它文档的区别：那些是**规范/详解**（人写的、有权威性），这里的是**素材/快照**（机器产出或外部抓取，**不承载约定**）。

## 清单

| 文件 | 是什么 | 来源 | 引用情况 |
| --- | --- | --- | --- |
| [`gh_meta.jsonl`](gh_meta.jsonl) | GitHub 仓库元数据抓取结果（每行一个仓库：stars / issues / license / 描述等，用于竞品与市场调研） | 2026-10-03 随《未来档案》网站相关工作引入；**原在仓库根** | **全库 0 处引用**（2026-10-08 核实） |
| [`visualization-edf21c0f.html`](visualization-edf21c0f.html) | 早期可视化管线的**自包含输出快照**（hash 命名） | 2026-09-14 生成；**原在仓库根 `viz/`** | **全库 0 处引用**（2026-10-08 核实） |

## 为什么放在这里（而不是根目录）

两者都曾是**仓库根的直接子项**（`gh_meta.jsonl` 与 `viz/`），而根目录应当对**非技术维护者友好**——
一个无说明的 `.jsonl` 数据文件和一个 hash 命名的 `.html` 正是最容易让人"不知道要不要管"的东西。
按 [M1 §四](../../rules/meta/M1-file-organization.md) 的判定标准（跨关注点的素材 → 技术侧），归入 `tech/`。

> **注意**：`viz/` **不是**当前可视化管线的输出目录。活的输出在
> [`lab/formal-system/concerns/visual-fallback/viz/`](../../lab/formal-system/concerns/visual-fallback/viz/)，
> 且那里**自带 `.gitignore`（`*.html`）**——`hub.ts --run` 写入的是那里的 `index.html`。
> 根 `viz/` 是**旧布局的遗留**，已于 2026-10-08 归档至此、并从根目录移除。

## 处理建议

- 这两个文件目前**无人引用**。若确认后续不再需要，可直接删除（`gh_meta.jsonl` 可用同一抓取脚本重取；
  `visualization-edf21c0f.html` 是旧管线的快照，**不一定能原样重建**——故先归档而非删除）。
- **不要**把它们当作约定或事实来源：调研结论应写进 `projects/mainline/docs/research/`，产物应写进各关注点自己的目录。
