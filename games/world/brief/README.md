# brief · RefuWorld 的导览层

> **一句话**：给“第一次接手”和“隔了很久回来”的人看的两个页面：
> [HUB.html](HUB.html) 回答“项目现在到哪、为什么、下一步”；[GUIDE.html](GUIDE.html) 回答“我该怎么用”。

## 这里有什么

```text
brief/
├── HUB.html          # 项目中心：状态 / 架构 / 内容 / 3D / 决策 / 路线图 / 风险
├── GUIDE.html        # 用户指南：5 分钟跑起来 / 编辑器 / TS DSL / CLI / 测试 / 排错
├── theme.css         # HUB 深色 / GUIDE 浅色的 token 覆盖
├── theme.js          # R-016 三态切换、持久化、系统态监听
└── README.md         # 本文件
```

## 分工

| 问题 | HUB | GUIDE |
| --- | --- | --- |
| 这个项目现在到哪了？ | ✅ 里程碑与证据 | — |
| 为什么这样定？ | ✅ 决策与边界 | — |
| 它长什么样？ | ✅ 2D/3D/编辑器截图 | ✅ 编辑器与预览截图 |
| 第一次怎么跑？ | — | ✅ 五分钟路径 |
| 怎么写内容/规则？ | ✅ 架构与作者链路 | ✅ 编辑器/TS DSL 步骤 |
| 怎么排错？ | 风险/下一步 | ✅ 常见问题与词表 |

## 打开

页面是**静态 HTML**，但截图与 `../docs/shots/`、`../web/` 的相对路径需要从 `games/world/` 提供服务：

```bash
cd games/world
python3 -m http.server 8799
# http://127.0.0.1:8799/brief/HUB.html
# http://127.0.0.1:8799/brief/GUIDE.html
```

直接 `file://` 打开也能读正文，但截图和本地链接可能失败。

## 事实来源

HUB/GUIDE 不复制权威内容，数字以仓库为准：

- 状态与验收：[`../docs/07_M1实现与验收.md`](../docs/07_M1实现与验收.md)
- 路线/决策：[`../docs/05_路线图与验收.md`](../docs/05_路线图与验收.md)、[`../plans/`](../plans/)
- 运行命令：[`../README.md`](../README.md)
- 测试：[`../test/run_m0.sh`](../test/run_m0.sh)、[`../test/run_m1.sh`](../test/run_m1.sh)
- 变更：[`../CHANGELOG.md`](../CHANGELOG.md)

当前基线：19 个 Rust 测试、4 条内容测试、黄金哈希 `0x3606a221e9990561`、5k v1 real P95 0.239 ms/tick。

## 主题（R-016）

- 默认 `system`；顺序固定：系统 → 浅色 → 深色；
- `localStorage['lrds-theme']`；
- `<head>` 内联预绘制，`data-theme` / `data-theme-choice`；
- `theme.js` 处理点击、持久化、系统态实时响应；
- HUB 默认深色、GUIDE 默认浅色，但两者都支持三态；
- 无 JS 时正文可读，控件隐藏；打印强制浅色。

权威规则：[`../../../design/rules/R-016-html-theme-modes.md`](../../../design/rules/R-016-html-theme-modes.md)。

## 改动约定

- HUB 叙述/结构直接改 `HUB.html`；数字变了先改事实源，再同步 HUB/GUIDE。
- GUIDE 是手写指南；如果以后从 README/测试生成，再加生成器，不要手改生成物。
- 新增导览页沿用 `theme.css` / `theme.js` 与同一套预绘制脚本。
- 项目级变更写入 [`../CHANGELOG.md`](../CHANGELOG.md)。

## 边界

- 不是策划源、不是决策记录、不是完整工程文档；细节回 `../docs/` 与 `../README.md`。
- 不是营销页：目标是让人快速判断与上手，不是包装。
