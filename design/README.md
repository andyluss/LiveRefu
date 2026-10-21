# LiveRefu Design System（LRDS）· 项目设计系统

> **一句话**：**一套语法，多种介质**——品牌、网站、游戏、应用与未来的实体产品共用同一套理解方式，各自拥有可替换的风格卡。
> **状态**：**v0.1 地基已落地**——三层 token、生成器、四道闸门、网站与《未来残片》两个试点已接入；外观基本不变。
> **建立**：2026-10-21 ｜ **定位**：工作区级统筹层，优先级仅次于用户 ｜ **代码/资产名**：`LRDS`（公开品牌名待定，见 [D2](docs/00_决策总表.md)）。

## 一、这是什么（以及不是什么）

| 是 | 不是 |
| --- | --- |
| **设计治理系统**：品牌、语义 token、组件契约、介质适配、资产与评审流程 | 一套配色表或一份 Figma 组件库 |
| **跨介质的共同语法**：屏幕、打印、实体都从同一套语义出发 | “复古未来主义”的单一视觉风格（它是二十种互相冲突的风格） |
| **产品之间的复用底座**：让第二个产品不必重新发明按钮、字号与对比度 | 替产品做玩法、内容与商业决策 |
| **可机器校验的契约**：色值、对比度、字号、生成物对账由闸门守 | 只靠肉眼和口头约定的“设计规范” |

> **为什么现在做**：工作区已有 4 套各自演化的视觉定义（网站 `theme.css`、游戏 `tokens.json`、LiveFab 内联样式、明日频道磁带皮肤），语义相同、取值不同，且已经出现 **focus 色与强调色混用** 这类真实缺陷。再长一个产品，就会变成五套、六套。现在收编，成本最低。

## 二、先读哪一篇

| 你是 | 从这里开始 | 然后 |
| --- | --- | --- |
| **决策者（你）** | [00 决策总表](docs/00_决策总表.md)（D1–D10 已裁决） | [05 实现记录](docs/05_实现记录_v0.1.md)（v0.1 做了什么、证据在哪） |
| **执行者 / 设计主控** | [02 系统架构](docs/02_系统架构.md)（五层模型、三层 token、单一事实来源） | [03 治理与运营](docs/03_治理与运营.md)（权限、版本、闸门） |
| **产品负责人** | [04 落地路线](docs/04_落地路线.md)（试点、阶段、Definition of Done） | 对应的介质包：[Web](kits/web/README.md) / [Godot](kits/godot/README.md) |
| **AI 代理** | [03 §七 AI 协作约定](docs/03_治理与运营.md) | 改任何视觉相关文件前，先跑 [`tools/check.sh`](tools/check.sh) |

## 三、决策状态（2026-10-21 已全部裁决）

**用户答复**：`按推荐执行，D2/D5 我确认。暂时不用设计工具，实体产品还没定，接受 v0.1 外观基本不变，先把地基做对。`

| # | 决定 | 结果 |
| --- | --- | --- |
| **D1** | 定位 | 治理系统（有否决权的统筹层） |
| **D2** | 品牌架构 | 母品牌背书 + 产品子品牌；内部代号 `LRDS`，公开母品牌名后定 |
| **D3** | 系统模型 | 五层 + `ref` / `sys` / `product` 三层 token |
| **D4** | 单一事实来源 | JSON 为源 + 生成各端 + CI 对账；**暂不接 Figma / 设计工具** |
| **D5** | 视觉基调 | 双模 Archive + Console，共享语法 |
| **D6** | 介质优先级 | `v0.1` Web + Godot；打印/实体后置（实体时间未定） |
| **D7** | 治理权限 | 设计主控技术性否决；用户唯一推翻 |
| **D8** | 版本策略 | SemVer + 稳定性分级 + 弃用窗口 + 产品钉版本 |
| **D9** | 资产与法务 | 开源字体 + 自有图标 + 源文件登记 + AI 资产溯源 |
| **D10** | 首版范围 | 地基 + 两个试点；`v0.1` 外观基本不变 |

详见 [00 决策总表](docs/00_决策总表.md)（含代价、备选、推翻条件）。

## 四、设计系统的八条原则（已冻结）

1. **先语义，后色值**：只允许引用 `sys.color.action.primary`，不允许在业务代码里写 `#57d8c8`。
2. **一套语法，多种介质**：网页、游戏、应用、打印、实体共享层级、间距、动效与无障碍下限；介质只改变“如何落地”。
3. **产品可变，理解方式不变**：产品/纪元可以换风格卡，但信息位置、交互语法、字号层级不变。
4. **可访问性是闸门，不是清单**：对比度、焦点可见、减少动态效果、文字缩放、触控目标由机器守。
5. **单一事实来源，生成物可复算**：token 只写一次；CSS / Godot / 打印表由脚本生成，CI 校验“重新生成后无 diff”。
6. **设计是闸门，不是服务台**：新功能在设计评审前不进入实现；设计债按 P1 处理，不靠“以后再说”。
7. **先收编，再统一**：不推翻既有产品的合理差异；先把语义对齐，再逐步替换取值。
8. **两个试点，不做大而全**：`v0.1` 只做地基 + 网站 + 游戏两个试点；没有落地的规范不算交付。

## 五、结构（v0.1 已落地）

```
design/
├── README.md                 # 本文件：出入口
├── CHANGELOG.md              # 设计系统版本日志
├── docs/                     # 决策 / 盘点 / 架构 / 治理 / 路线 / 实现记录 / 例外
├── tokens/
│   ├── core/                 # ref.tokens.json + sys.tokens.json
│   ├── products/             # future-archive / future-debris 风格卡
│   ├── schema/               # JSON Schema（编辑器用）
│   └── dist/                 # 生成物：web CSS / godot JSON / token 文档
├── kits/
│   ├── web/                  # 网页接入说明
│   └── godot/                # Godot 接入说明
├── tools/                    # token_lib / build / 三个 check / check.sh
├── components/               # 组件契约（v0.2 起）
├── assets/                   # 品牌资产（v0.2 起）
└── references/               # 参考、法务登记、moodboard
```

> 目录规则遵循 [M1](../rules/meta/M1-file-organization.md) 与 [M2](../rules/meta/M2-naming-vocabulary.md)。`design/` 的 M1/M2 机器校验目前登记为 `pending`（见 [workspace-scope.json](../rules/meta/tools/workspace-scope.json)），v0.2 补配置后转 `block`——**缺口是明示的，不是隐形的**。

## 六、与既有资产的关系

| 既有资产 | 本系统继承什么 | 不继承什么 |
| --- | --- | --- |
| [《未来残片》视觉 token 契约](../projects/mainline/future-debris/docs/04_视觉语言与设计token.md) | **语法层 / 风格卡**两层结构、语义命名、对比度闸门、检查器自检 | 游戏专属的 `--power` / `--residue`（已下沉为产品语义） |
| [《未来档案》主题 CSS](../projects/website/app/assets/theme.css) | 已验证的暗色阅读配色、可关闭 CRT、系统 CJK 字体策略 | 与游戏重复的第二套色值（已改为消费生成 token） |
| [LiveFab L9 复用纪律](../projects/livefab/docs/01_定位与角色.md) | “复用纪律、不复用内容”、对比度闸门、验收编排器思路 | 内联复制 token 的做法（v0.2 迁移） |
| [《明日频道》磁带皮肤](../projects/tomorrows-channel/game/scenes/channel/skins/tape_channel_skin.tres) | 暖色材质与光照作为**风格卡**的合法差异 | 散落在 `.tres` 里、无法对账的裸色值（v0.2 登记） |

## 七、当前状态与下一步

### 已完成（v0.1）

- **三层 token**：`ref` 61 / `sys` 92 / `product` 33，共 186 个；
- **生成器**：`build_tokens.ts` 生成 Web CSS、Godot JSON、token 文档、两个产品副本；
- **四道闸门**：结构、对比度/层级/focus、裸色值、生成物无 diff；每个都有 `--self-test`，已接入 pre-commit 与 CI；
- **网站试点**：`theme.css` 改为消费生成 token；唯一有意的视觉变化是 `--focus` 从强调青改为独立蓝；
- **游戏试点**：`game/data/tokens.json` 改为生成物；`check_tokens.py`、`run.sh contrast`、`run.sh theme` 全绿；
- **证据**：[05 实现记录](docs/05_实现记录_v0.1.md)。

### 常用命令

```bash
bash design/tools/check.sh                                   # 四道闸门 + 自检
node --experimental-strip-types design/tools/build_tokens.ts # 改完 token 后重新生成
node --experimental-strip-types design/tools/check_no_raw_values.ts --all  # 未迁移裸值报告
cd projects/mainline/future-debris && ./run.sh contrast && ./run.sh theme
cd projects/website && bun run tools/verify-contrast.ts && bun run build
```

### 下一步（v0.2，按优先级）

1. 网站组件裸色值（遮罩/阴影/高亮）→ 补 overlay/shadow/onWarning token，收口 [EX-20261021-01](docs/exceptions.md)；
2. LiveFab 接入生成 CSS，删除内联复制；
3. 明日频道暖色风格卡登记；
4. `design/` M1/M2 配置转 `block`；
5. 3–5 个组件契约（按钮、表单、面板、导航、反馈）；
6. App kit 起步。

### `v0.1` 明确不做

全组件库、全产品换肤、Figma 库、实体产品打样、母品牌正式命名、网站/游戏重设计。

## 八、相关

- 工作区规则：[`rules/`](../rules/README.md) ｜ 变更日志：[`CHANGELOG.md`](../CHANGELOG.md) ｜ 技术详解：[`tech/`](../tech/README.md)
- 视觉方向的上游决策：[`projects/mainline/docs/05_美术与技术方向.md`](../projects/mainline/docs/05_美术与技术方向.md)（Q6 已裁决：语法层 + 风格卡）
- 决策体例参考：[`projects/mainline/docs/00_决策总表.md`](../projects/mainline/docs/00_决策总表.md)（推荐 / 代价 / 推翻条件 / 不回删原文）
- 实现记录：[`docs/05_实现记录_v0.1.md`](docs/05_实现记录_v0.1.md) ｜ 例外：[`docs/exceptions.md`](docs/exceptions.md)
