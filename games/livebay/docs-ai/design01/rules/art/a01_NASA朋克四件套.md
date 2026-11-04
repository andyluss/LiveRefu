---
title: "ART-A1 · NASApunk 四件套"
rule_id: "ART-A1"
layer: "a"
category: "art"
status: "active"
date: "2026-11-04"
source: "AI 起草，人类拍板"
authority: "人类"
upstream:
  - "../../08_美术与音频方向.md"
related:
  - "../../../../../../docs/retro-futurism/附录_NASA朋克卷/README.md"
  - "b01_三环三套语法.md"
---

# ART-A1 · NASApunk 四件套

> **一句话**：NASApunk 不是“复古贴纸”，是白盒工程、检查单、模拟界面、机构色四件套。
> **形式化**：`Visual = WhiteBox ∧ Checklist ∧ AnalogUI ∧ InstitutionalPalette`，且 `¬Hologram ∧ ¬SleekConsumer`。

## 一、形式化表述

```text
Visual = WhiteBox ∧ Checklist ∧ AnalogUI ∧ InstitutionalPalette
WhiteBox = exposedStructure ∧ repairable ∧ labeled
Checklist = visibleProcedure ∧ checkboxes ∧ signatures
AnalogUI = physicalControls ∧ lamps ∧ paper
InstitutionalPalette = neutral + safetyOrange + mutedTeal

¬Hologram ∧ ¬SleekConsumer ∧ ¬NeonCyberpunk
```

## 二、通俗解释

NASApunk 的“朋克”不在霓虹，而在**人要在不完美的系统里把事做完**：

- 白盒：结构露出来，管线、支架、接缝都能看见；
- 检查单：有流程、有签字、有“待复查”；
- 模拟界面：按钮、拨杆、指示灯、纸张，不是悬浮光屏；
- 机构色：暖白、石墨、安全橙、灰绿，像被用过的设备，不像广告。

反过来说：**不要全息投影、不要无边框玻璃、不要赛博霓虹、不要“高级感”到没有人味。**

## 三、条款

### MUST

1. **M1**：所有关键资产至少体现四件套中的两件；UI 必须体现检查单/模拟界面。
2. **M2**：不得用全息投影、无边框透明屏、霓虹赛博朋克作为主视觉。
3. **M3**：不得把设备画成“全新未使用”；必须有使用痕迹、标签、维修痕迹。
4. **M4**：色彩必须来自 [ART-C1](c01_色板字体与比例.md) 的 token；不得随意加高饱和色。
5. **M5**：任何“未来感”必须能回答：它怎么修？谁签字？坏了怎么办？

### SHOULD

1. **S1**：每个场景至少有一个“检查单/记录”元素。
2. **S2**：每个设备至少有一个可见接缝或检修口。
3. **S3**：用机构编号、警示条、手写批注增加“被使用过”的感觉。

### MAY

1. **Y1**：可以局部使用柔和光晕，但不得替代结构。
2. **Y2**：可以引用真实航天工业的图形语言，但不做具体国家/机构的仿制。

## 四、判定与验收

```text
valid(asset) ⇔
  count(WhiteBox, Checklist, AnalogUI, Palette) ≥ 2 ∧
  hologram = false ∧
  neon = false ∧
  hasWear = true
```

检查：

- [ ] 这张图/这个 UI 是否像“能修的东西”？
- [ ] 是否有流程/记录/签字？
- [ ] 是否用了至少两个四件套元素？
- [ ] 是否出现了“光屏一划”的廉价未来感？

## 五、反例

- 全息星图，手指一划，城市变形；
- 纯黑背景 + 青色霓虹线条；
- 设备光滑无接缝，像刚拆封；
- UI 全是悬浮圆环，没有按钮和标签；
- 为了“高级”把安全橙全去掉。

## 六、引用与变更

- 被引用处：[08_美术与音频方向](../../08_美术与音频方向.md)、[艺术设定图](../../art/README.md)；
- 变更：a 层，需人类裁决 + 版本升级；
- 关联：[ART-B1](b01_三环三套语法.md)、[ART-C1](c01_色板字体与比例.md)。
