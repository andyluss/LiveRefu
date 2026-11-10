# briefing · LiveBay 的导览层

> **一句话**：这里是《LiveBay（逍遥湾）》**面向人**的两个页面，以及它们的主题、生成器与数据校验器。
> **不是**策划源、决策日志或工程文档；那些分别在 [`../docs-ai/`](../docs-ai/)、[`../docs-ai/design01/11_待人类裁决清单.md`](../docs-ai/design01/11_待人类裁决清单.md) 和 [`../README.md`](../README.md)。

## 一、这里有什么

```text
briefing/
├── HUB.html          # 项目状态 / 决策 / 玩法 / 架构 / 素材 / 风险 / 下一步
├── GUIDE.html        # 给第一次听说这个游戏的人看的玩法说明（生成物）
├── theme.css         # 两页共享的三态主题 token 与覆盖
├── theme.js          # 三态切换、持久化、系统态实时响应
├── build_guide.ts    # 从 game/data/*.json 生成 GUIDE.html
├── check_hub.ts      # 核对 HUB 的 data-fact、素材存在性
└── README.md         # 本文件
```

| 文件 | 谁维护 | 怎么产生 |
| --- | --- | --- |
| `HUB.html` | 项目负责人 / 设计主控 | 手写结构，数字由 `check_hub.ts` 对账 |
| `GUIDE.html` | 项目负责人 + 数据 | `build_guide.ts` 生成，禁止手改 |
| `theme.css` / `theme.js` | 设计主控 | 手写；两页共用，遵守 R-016 |

## 二、HUB 与 GUIDE 的分工

| 问题 | 看 HUB | 看 GUIDE |
| --- | --- | --- |
| 这个项目现在到哪了？ | ✅ 状态、阶段、证据 | — |
| 当初为什么这样定？ | ✅ 决策与代价 | — |
| 它长什么样？ | ✅ 截图、演示 | — |
| 内容/架构/风险/下一步？ | ✅ | — |
| 这游戏到底怎么玩？ | — | ✅ 一局、塔、敌人、波次、故障 |
| 第一次听说，先读哪？ | 先看 HUB 的「概览」 | 先看 GUIDE 的「三十秒版本」 |

- **HUB** 的读者是“隔了很久回来的项目参与者”：用最少的滚动重新接上。
- **GUIDE** 的读者是“第一次听说这个游戏的人”：不假设读者懂策划术语。
- 两页都不复制权威内容；细节回 [`../docs-ai/design01/README.md`](../docs-ai/design01/README.md)。

## 三、HUB：手写叙事，数字对账

HUB 中需要核对的数字写成：

```html
<span data-fact="towers">3</span>
```

`check_hub.ts` 会从工程现读真实值，核对**每一处**相同 fact；数字不一致、缺少 fact、找不到来源都会报错。

当前核对：

```text
11 个 fact：
  maps / towers / enemies / waves / slots / professions
  l1_variants / tests / expansions / doc_pages / version

素材：
  docs-ai/design01/shots/ 下的截图、poster、视频
```

```bash
node briefing/check_hub.ts             # 对账
node briefing/check_hub.ts --self-test # 用坏数据确认它会失败
```

失败时先改**数据源**或 HUB 的数字，**不要让两者并存**。

## 四、GUIDE：从数据生成

GUIDE 的塔、敌人、波次、地图、供能/保障度都来自：

```text
game/data/towers.json
game/data/enemies.json
game/data/waves.json
game/data/map_bay01.json
game/data/balance.json
```

因此：

- **不要手改 `GUIDE.html`**；
- 改数据或模板后重跑；
- `--check` 只读磁盘，适合 CI / 提交前检查。

```bash
node briefing/build_guide.ts            # 重新生成 GUIDE.html
node briefing/build_guide.ts --check    # 页面与数据一致？不写文件
```

## 五、三态主题（R-016）

两页都支持：

```text
system / light / dark
```

- 默认 `system`；
- 顺序固定：系统 → 浅色 → 深色；
- 统一 `localStorage['lrds-theme']`；
- `<head>` 预绘制，避免首屏闪烁；
- 系统切换实时响应；刷新保持；清空存储回 `system`；
- 两种外观都通过对比度检查；打印强制浅色；
- 无 JS 时控件隐藏，内容仍可读。

实现：

- `theme.css`：HUB 深色 / GUIDE 浅色的 token 覆盖；
- `theme.js`：点击、持久化、`prefers-color-scheme` 监听；
- 每页 `<head>` 内联预绘制脚本；
- 页面根节点：`data-theme` / `data-theme-choice`。

权威规则：[`../../../design/rules/R-016-html-theme-modes.md`](../../../design/rules/R-016-html-theme-modes.md)。

## 六、路径约定

因为 `briefing/` 比项目根深一层，页面/说明里的相对路径要加一层：

| 目标 | 写法 |
| --- | --- |
| 项目 README | `../README.md` |
| 策划文档 | `../docs-ai/...` |
| 游戏数据/工程 | `../game/...` |
| 设计规则 R-016 | `../../../design/rules/R-016-html-theme-modes.md` |
| 同目录页面/主题 | `./HUB.html`、`./GUIDE.html`、`theme.css` |

## 七、改动类型与动作

| 改动 | 要做什么 |
| --- | --- |
| HUB 叙述/结构 | 直接改 `HUB.html`，跑 `check_hub.ts` |
| HUB 数字 | 先改数据源，再跑 `check_hub.ts` |
| GUIDE 图表/数字 | 改数据或 `build_guide.ts`，重跑 |
| 主题 | 改 `theme.css` / `theme.js`；新页面复制预绘制与控件模式 |
| 新增导览页 | 同目录、同主题、同数据来源；更新 README 与 HUB 入口 |

## 八、边界

- 这里**不是**策划源：塔/敌人/波次/地图仍在 `../game/data/` 与 `../docs-ai/design01/numbers/`；
- 这里**不是**决策记录：裁决与代价在 `../docs-ai/design01/11_待人类裁决清单.md` 与 `../CHANGELOG.md`；
- 这里**不是**工程说明：运行、验收、代码地图在 `../README.md` 与 `../docs-ai/design01/tech/`；
- 这里**不是**营销页：HUB/GUIDE 的目的是理解和判断，不是包装。

## 九、维护

- 版本：与项目版本同步；当前项目 `0.1.132`；
- 变更：项目级变更写入 `../CHANGELOG.md`，本目录不单独维护版本日志；
- 入口：[`HUB.html`](HUB.html) ｜ [`GUIDE.html`](GUIDE.html) ｜ [项目 README](../README.md)。
