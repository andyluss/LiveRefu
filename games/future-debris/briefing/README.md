# briefing · 未来残片的导览层

> **一句话**：这里是《未来残片》**面向人**的两个页面，以及它们的主题、生成器与数据校验器。
> **不是**策划源、决策日志或工程文档；那些分别在 [`../docs/`](../docs/)、[`../../mainline/docs/`](../../mainline/docs/) 和项目根目录。

## 一、这里有什么

```text
briefing/
├── HUB.html          # 项目状态 / 决策 / 截图 / 内容 / 商业化 / 风险 / 下一步
├── GUIDE.html        # 给第一次听说这个游戏的人看的玩法说明（生成物）
├── theme.css         # 两页共享的三态主题 token 与覆盖
├── theme.js          # 三态切换、持久化、系统态实时响应
├── build_guide.py    # 从 game/data/tables/ 生成 GUIDE.html
├── check_hub.py      # 核对 HUB 的 data-fact 与工程数据、素材存在性
└── README.md         # 本文件
```

| 文件 | 谁维护 | 怎么产生 |
| --- | --- | --- |
| `HUB.html` | 项目负责人 / 设计主控 | 手写结构，数字由 `check_hub.py` 对账 |
| `GUIDE.html` | 项目负责人 + 数据表 | `build_guide.py` 生成，禁止手改 |
| `theme.css` / `theme.js` | 设计主控 | 手写；两页共用，遵守 R-016 |
| `build_guide.py` | 工程 | 手写；只读数据表与 `run.sh` 等事实 |
| `check_hub.py` | 工程 | 手写；只读 HUB 与工程数据 |

## 二、HUB 与 GUIDE 的分工

| 问题 | 看 HUB | 看 GUIDE |
| --- | --- | --- |
| 这个项目现在到哪了？ | ✅ 状态、阶段、八道闸门 | — |
| 当初为什么这样定？ | ✅ 决策与代价 | — |
| 它长什么样？ | ✅ 截图、预告片 | — |
| 内容/商业化/风险？ | ✅ 内容现状、卖法、坑、下一步 | — |
| 这游戏到底怎么玩？ | — | ✅ 一局流程、电力/残渣、降级区 |
| 卡牌、势力、规则卡是什么？ | — | ✅ 卡面六段、六类卡、四势力、规则卡 |
| 第一次听说，先读哪？ | 先看 HUB 的“概览” | 先看 GUIDE 的“三十秒版本” |

- **HUB** 的读者是“隔了很久回来的项目参与者”：用最少的滚动重新接上。
- **GUIDE** 的读者是“第一次听说这个游戏的人”：不假设读者懂策划术语。
- 两页都不复制权威内容；细节回到 [`../docs/`](../docs/) 与 [`../../mainline/docs/`](../../mainline/docs/)。

## 三、阅读顺序

1. 第一次接触项目：先读 [`GUIDE.html`](GUIDE.html) 的「三十秒版本」与「一局是怎么走的」；
2. 想知道项目状态：读 [`HUB.html`](HUB.html) 的「概览」；
3. 想参与决策：读 HUB 的「已决定的事」「下一步」，再回 [`../../mainline/README.md`](../../mainline/README.md)；
4. 想改实现：从项目 [`../README.md`](../README.md) 进入 `game/`、`docs/`、`run.sh`。

## 四、HUB：手写叙事，数字对账

HUB 是**手写页面**，不是生成物。允许改：

- 标题、段落、Tab 结构、截图与视频说明；
- 决策、风险、下一步的叙述；
- 链接与章节顺序。

不允许手改：

- 带 `data-fact="..."` 的数字；
- 引用的截图/视频文件（路径必须存在）；
- 改动后不跑 `check_hub.py` 就提交。

### 4.1 data-fact 契约

HUB 中需要核对的数字写成：

```html
<span data-fact="cards">120</span>
```

`check_hub.py` 会从工程现读真实值，并核对**每一处**相同 fact；数字不一致、缺少 fact、找不到来源都会报错。

当前核对：

```text
9 个数字 / 18 处标记
素材：截图、视频 poster、本地文件
```

### 4.2 HUB 检查

```bash
cd games/future-debris
python3 briefing/check_hub.py             # 对账
python3 briefing/check_hub.py --self-test  # 用坏数据确认它会失败
```

失败时先改**数据源**或 HUB 的数字，**不要让两者并存**。HUB 的检查已接入 pre-commit；改动 `briefing/HUB.html`、数据表、`run.sh` 或用例表时会触发。

## 五、GUIDE：从数据表生成

GUIDE 的图表、卡数、关卡、势力、规则与难度曲线都来自：

```text
game/data/tables/cards.json
game/data/tables/levels.json
game/data/tables/rules.json
game/data/tables/factions.json
game/data/tables/relics.json
run.sh / 用例表
```

因此：

- **不要手改 `GUIDE.html`**；
- 改数据表或生成模板后重跑；
- `--check` 只读磁盘，不写文件，适合 CI / 提交前检查。

### 5.1 生成与校验

```bash
cd games/future-debris
python3 briefing/build_guide.py            # 重新生成 briefing/GUIDE.html
python3 briefing/build_guide.py --check    # 页面与数据一致？不写文件
```

`build_guide.py` 会在页面顶部写入“由 briefing/build_guide.py 生成”的说明；GUIDE 的 footer 也指向本文件与生成器。

### 5.2 什么时候必须重跑

- 改卡表 / 关卡 / 规则 / 势力 / 残片；
- 改 `run.sh` 的闸门数或用例表；
- 改 GUIDE 的图表文案、模板或主题集成；
- 发布前。

## 六、三态主题（R-016）

两页都必须支持：

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

- `theme.css`：两页的 token 覆盖与控件样式；
- `theme.js`：点击、持久化、`prefers-color-scheme` 监听；
- 每页 `<head>` 内联预绘制脚本；
- 页面根节点：`data-theme` / `data-theme-choice`；
- 权威规则：[`../../../design/rules/R-016-html-theme-modes.md`](../../../design/rules/R-016-html-theme-modes.md)。

改主题时不要新增页面级 key，也不要把 `HUB`/`GUIDE` 改成单态。

## 七、编辑与路径约定

### 7.1 从这里指向项目

因为 `briefing/` 比项目根深一层，页面/说明里的相对路径要加一层：

| 目标 | 写法 |
| --- | --- |
| 项目 README | `../README.md` |
| 工程文档 | `../docs/...` |
| 游戏数据/工程 | `../game/...` |
| 主纲领 | `../../mainline/README.md` |
| 设计规则 R-016 | `../../../design/rules/R-016-html-theme-modes.md` |
| 同目录页面/主题 | `./HUB.html`、`./GUIDE.html`、`theme.css` |

HUB/GUIDE 内的图片、视频与链接也必须按这个深度书写，或使用同目录相对路径。

### 7.2 改动类型与动作

| 改动 | 要做什么 |
| --- | --- |
| HUB 叙述/结构 | 直接改 `HUB.html`，跑 `check_hub.py` |
| HUB 数字 | 先改数据源，再跑 `check_hub.py`；不要手改数字 |
| GUIDE 图表/数字 | 改数据表或 `build_guide.py`，重跑 `build_guide.py` |
| 主题 | 改 `theme.css` / 新增页面时复制预绘制与控件模式 |
| 页面路径/移动 | 同步 `build_guide.py`、`check_hub.py`、pre-commit、M1 配置、项目 README |
| 新增导览页 | 同目录、同主题、同数据来源；更新本 README 与 HUB 入口 |

## 八、常见故障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `GUIDE.html 已过期` | 数据表变了，页面没重生成 | 跑 `build_guide.py` |
| `data-fact ... 页面写 X，实际是 Y` | HUB 数字过期 | 改数据源或 HUB，重跑 `check_hub.py` |
| `素材缺失` | HUB 图片/视频路径断了 | 修路径，保持 `../docs/...` 深度 |
| HUB 首屏闪一下深色 | 预绘制脚本被移出 `<head>` 或放到 CSS 后 | 恢复 head 内联脚本 |
| 切换主题不持久 | key 被改成页面级 / localStorage 被禁用 | 统一 `lrds-theme` |
| 浅色下文字太淡 | 只改了背景没改 token | 检查 `theme.css` 的 light 覆盖与对比度 |

## 九、边界

- 这里**不是**策划源：卡表、关卡、规则、数值仍在 [`../docs/`](../docs/) 与 [`../game/data/tables/`](../game/data/tables/)；
- 这里**不是**决策记录：裁决与代价在 [`../../mainline/`](../../mainline/README.md) 与项目 [`../CHANGELOG.md`](../CHANGELOG.md)；
- 这里**不是**工程说明：运行、验收、代码地图在 [`../docs/`](../docs/) 与 [`../README.md`](../README.md)；
- 这里**不是**营销页：HUB/GUIDE 的目的是理解和判断，不是包装。

## 十、维护

- 版本：与项目版本同步；当前项目 `0.45.0`；
- 变更：项目级变更写入 [`../CHANGELOG.md`](../CHANGELOG.md)，本目录不单独维护版本日志；
- 设计规则：R-016（生成式 HTML 三态）；
- 入口：[`HUB.html`](HUB.html) ｜ [`GUIDE.html`](GUIDE.html) ｜ [项目 README](../README.md)。
