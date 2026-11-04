# 主线纲领 · LiveBay

> **当前主线项目**：[`../livebay/`](../livebay/README.md)（《逍遥湾》/ LiveBay），自 **2026-11-04** 起正式承担主线。
>
> 本目录不是 LiveBay 的项目文档，也不是某一款游戏的 GDD。它是**主线纲领**：容纳“当前主线是谁、为什么是它、下一步押什么”的决策空间，以及被替换项目的决策历史。
>
> 项目细节在 [`../livebay/`](../livebay/README.md)；当前状态见 [01_LiveBay主线状态](docs/01_LiveBay主线状态.md)。

## 一、当前主线

| 项 | 内容 |
| --- | --- |
| 项目 | **LiveBay（逍遥湾）** |
| 目录 | [`../livebay/`](../livebay/README.md) |
| 类型 | NASApunk · 岗位塔防 + 沉浸体验 + 放置养成 |
| 当前阶段 | v0.1 可玩垂直切片；NASApunk 轻量包已选、待实现 |
| 当前证据 | 1 图 / 7 塔位 / 3 塔 / 4 敌 / 5 波；37 项无头断言；50 秒实机 |
| 决策权威 | [`../livebay/docs-ai/design01/11_待人类裁决清单.md`](../livebay/docs-ai/design01/11_待人类裁决清单.md) |
| 规则 | [`../livebay/docs-ai/design01/rules/README.md`](../livebay/docs-ai/design01/rules/README.md) |

一句话：**当前主线不是“未来残片”，是 LiveBay；主线资源、裁决与验收都以 LiveBay 的文档为准。**

## 二、先看哪几篇

| 你想知道 | 看 |
| --- | --- |
| 当前主线到什么程度、下一步押什么 | [01_LiveBay主线状态](docs/01_LiveBay主线状态.md) |
| LiveBay 是什么、怎么跑 | [`../livebay/README.md`](../livebay/README.md) |
| 已裁决/待裁决有哪些 | [`../livebay/docs-ai/design01/11_待人类裁决清单.md`](../livebay/docs-ai/design01/11_待人类裁决清单.md) |
| 玩法、数值、美术、小说、规则 | [`../livebay/docs-ai/design01/README.md`](../livebay/docs-ai/design01/README.md) |
| 专用编辑器值不值得做 | [`../livebay/docs-ai/design01/15_专用游戏编辑器方案.md`](../livebay/docs-ai/design01/15_专用游戏编辑器方案.md) |
| 旧主线为什么被替换 | 本目录 [11](docs/11_主线项目评估_未来残片与Refu001.md)（历史文档）；旧决策总表见 [future-debris 00](../future-debris/docs/planning/00_决策总表.md) |

## 三、纲领级文档

| # | 文档 | 状态 | 一句话 |
| --- | --- | --- | --- |
| 01 | [LiveBay 主线状态](docs/01_LiveBay主线状态.md) | **现行** | 当前主线、证据、裁决地图、优先级与完成判据 |
| 11 | [历史：主线项目评估](docs/11_主线项目评估_未来残片与Refu001.md) | 历史 | 未来残片 vs Refu 001 的对比；当时结论已不再生效 |

> 历史文档不删除、不重写结论；只在篇首加“历史”说明，避免被误读为当前决定。原 `00 决策总表` 与 `02 资产盘点与杠杆` 已移入 [`future-debris/docs/planning/`](../future-debris/docs/planning/)，归属未来残片项目。

## 四、为什么是 LiveBay

1. **可玩**：v0.1 已能完成 5 波闭环，不是概念稿；
2. **可验证**：37 项无头断言、数据校验、启动检查、数值导出检查；
3. **可维护**：数值/地图/敌人/波次是数据，模拟与视图分离；
4. **有边界**：D01–D16 已裁决；NASApunk 轻量包 N1–N3 已选；P2/E1–E4 待裁决；
5. **有内容管线**：数值、规则、艺术、小说、HTML 都已成形，能支撑下一阶段。

它不是最大的项目；它是当前**最完整、最可验证、最接近可试玩**的那个。

## 五、与旧项目的关系

| 项目 | 身份 | 处理 |
| --- | --- | --- |
| [`../future-debris/`](../future-debris/README.md) | 前主线候选 | **归档为历史主线候选**；不投入主线资源；文档与工程保留 |
| [`../refu-game-001/`](../refu-game-001/README.md) | 卡片塔防垂直切片 | **第二轨预研/归档**；不争夺主线资源；可复用其验证方式 |
| [`../tomorrows-channel/`](../tomorrows-channel/README.md) | 氛围陪伴应用 | 卫星项目；不并入 LiveBay |
| [`../../projects/website/`](../../projects/website/README.md) | 未来档案网站 | 暂停；不自动并入主线 |

> 旧项目可以“被参考”，但不会因为曾经是主线就自动成为 LiveBay 的一部分；是否并入，由 LiveBay 的裁决记录决定。

## 六、规则与边界

- 主线级决策以 LiveBay `11` 为准；本目录只做索引与历史；
- 具体玩法、数值、美术、工程规格在 `games/livebay/`，不在本目录复制；
- 主线更替时：更新 [01](docs/01_LiveBay主线状态.md) + 本 README + [`CHANGELOG.md`](CHANGELOG.md)，旧文档标记历史；
- 不因为“主线”就扩范围：先守住 v0.1 轻量包与 v0.2 护理师；
- 工作区通用规则（R01/R02/R03/R05/R06）仍然适用。

## 七、讨论记录

需要新讨论时，在 `docs/discussions/` 新建 `YYYYMMDD-HHMM-关键词.md`，时间取首次提交时间（R06）。

```markdown
# 讨论记录 · YYYY-MM-DD HH:MM · <主题>

- 参与：<人 / 角色>
- 关联：<决策 ID 或文档链接>

## 结论
<一句话；未收敛写“未收敛，下次继续”>

## 论点与依据
- …

## 分歧与未决
- …

## 下一步
- [ ] …
```

## 八、相关

- 工作区总览：[`../../README.md`](../../README.md)
- 游戏项目区：[`../README.md`](../README.md)
- 题材总论：[`../../docs/retro-futurism/00_总论_未来的考古学与全卷地图.md`](../../docs/retro-futurism/00_总论_未来的考古学与全卷地图.md)
