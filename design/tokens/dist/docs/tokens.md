# LRDS Token 参考（自动生成）

> **不要手改**：本文件由 `design/tools/build_tokens.ts` 从 `design/tokens/` 生成。
> 要改值，改源 JSON；要改说明，改源 JSON 的 `meta.note` 或本生成器。

## sys.color

| token | 值 | 类型 |
| --- | --- | --- |
| `sys.color.action.onPrimary` | `#0B0F14` | color |
| `sys.color.action.primary` | `#4FD1C5` | color |
| `sys.color.action.primaryHover` | `#57D8C8` | color |
| `sys.color.bg.base` | `#0B0F14` | color |
| `sys.color.bg.raised` | `#161D26` | color |
| `sys.color.bg.sunken` | `#0B1116` | color |
| `sys.color.bg.surface` | `#111823` | color |
| `sys.color.feedback.danger` | `#FF6B35` | color |
| `sys.color.feedback.success` | `#7BD389` | color |
| `sys.color.feedback.warning` | `#FFC857` | color |
| `sys.color.focus.ring` | `#8AB4F8` | color |
| `sys.color.line.strong` | `#66727F` | color |
| `sys.color.line.subtle` | `#24303F` | color |
| `sys.color.material.highlight` | `#F3EDE1` | color |
| `sys.color.material.mid` | `#39485A` | color |
| `sys.color.material.shadow` | `#10161C` | color |
| `sys.color.text.inverse` | `#0B0F14` | color |
| `sys.color.text.muted` | `#808D9F` | color |
| `sys.color.text.primary` | `#F3EDE1` | color |
| `sys.color.text.secondary` | `#9AA7B8` | color |

## sys.type.ui

| 层级 | 字号 | 行高 | 字重 | 用途 |
| --- | --- | --- | --- | --- |
| `title-1` | 28px | 1.25 | 700 | 页面主标题、纪元名 |
| `title-2` | 20px | 1.3 | 600 | 面板标题、卡名 |
| `body` | 16px | 1.6 | 400 | 正文、卡牌说明 |
| `caption` | 14px | 1.5 | 500 | 标签、数值单位、脚注 |
| `number-lg` | 32px | 1 | 700 | 卡面费用、结算数字（等宽数字） |

## sys.type.editorial

| 层级 | 字号 | 行高 | 字重 | 用途 |
| --- | --- | --- | --- | --- |
| `display` | 48px | 1.1 | 700 | 品牌页/专题页主视觉标题 |
| `h1` | 36px | 1.2 | 700 | 文章一级标题 |
| `h2` | 28px | 1.25 | 700 | 文章二级标题 |
| `h3` | 22px | 1.3 | 600 | 文章三级标题 |
| `body` | 16px | 1.75 | 400 | 长文正文 |
| `caption` | 14px | 1.5 | 500 | 图注、表格说明 |
| `footnote` | 12px | 1.5 | 400 | 脚注、法务小字（仅印刷/长文） |

## product.future-archive.color

| token | 值 | 来源 |
| --- | --- | --- |
| `color.amber` | `#E0A94A` | `{ref.color.amber.500}` |
| `color.bg` | `#0B1017` | `{ref.color.neutral.50}` |
| `color.bgElev` | `#121A26` | `{ref.color.neutral.250}` |
| `color.bgElev2` | `#18222F` | `{ref.color.neutral.400}` |
| `color.chrome` | `#C9D3DD` | `{ref.color.chrome.300}` |
| `color.cream` | `#E8D9A0` | `{ref.color.paper.200}` |
| `color.focus` | `#8AB4F8` | `{sys.color.focus.ring}` |
| `color.line` | `#24303F` | `{ref.color.neutral.500}` |
| `color.lineStrong` | `#66727F` | `{ref.color.neutral.700}` |
| `color.onWarning` | `#1A1206` | — |
| `color.overlayPanel` | `#121A26D9` | — |
| `color.overlaySearch` | `#04080DB8` | — |
| `color.overlayStrong` | `#03060AED` | — |
| `color.rust` | `#C8703C` | `{ref.color.orange.500}` |
| `color.scanline` | `#00000024` | — |
| `color.shadow` | `#0000008C` | — |
| `color.surfaceDeep` | `#06090D` | — |
| `color.teal` | `#3FB8AB` | `{ref.color.teal.500}` |
| `color.tealBright` | `#57D8C8` | `{ref.color.teal.200}` |
| `color.text` | `#E8E4D9` | `{ref.color.paper.100}` |
| `color.textDim` | `#9AA7B8` | `{ref.color.neutral.850}` |
| `color.textFaint` | `#808D9F` | `{ref.color.neutral.800}` |
| `color.vignette` | `#0000006B` | — |

## product.future-debris.color

| token | 值 | 来源 |
| --- | --- | --- |
| `color.accent` | `#E4572E` | `{ref.color.orange.400}` |
| `color.bgBase` | `#10161C` | `{ref.color.neutral.150}` |
| `color.bgElev1` | `#18212B` | `{ref.color.neutral.350}` |
| `color.bgElev2` | `#212E3A` | `{ref.color.neutral.450}` |
| `color.focus` | `#8AB4F8` | `{sys.color.focus.ring}` |
| `color.line` | `#2A3742` | `{ref.color.neutral.550}` |
| `color.lineStrong` | `#6F7B89` | `{ref.color.neutral.750}` |
| `color.materialHi` | `#F3EDE1` | `{ref.color.paper.50}` |
| `color.materialMid` | `#39485A` | `{ref.color.neutral.600}` |
| `color.materialShadow` | `#10161C` | `{ref.color.neutral.150}` |
| `color.ok` | `#7BD389` | `{sys.color.feedback.success}` |
| `color.power` | `#4FD1C5` | `{sys.color.action.primary}` |
| `color.residue` | `#FF6B35` | `{sys.color.feedback.danger}` |
| `color.surfaceSunken` | `#0B1116` | `{ref.color.neutral.100}` |
| `color.text` | `#F3EDE1` | `{sys.color.text.primary}` |
| `color.textDim` | `#A9A395` | `{ref.color.warmgray.100}` |
| `color.textFaint` | `#9E9889` | `{ref.color.warmgray.200}` |
| `color.warn` | `#FFC857` | `{sys.color.feedback.warning}` |

## product.livefab.color

| token | 值 | 来源 |
| --- | --- | --- |
| `color.amber` | `#D9A441` | `{ref.color.amber.400}` |
| `color.bg` | `#0B0F14` | `{ref.color.neutral.0}` |
| `color.bgElev` | `#111823` | `{ref.color.neutral.200}` |
| `color.bgElev2` | `#161D26` | `{ref.color.neutral.300}` |
| `color.focus` | `#8AB4F8` | `{sys.color.focus.ring}` |
| `color.line` | `#24303F` | `{ref.color.neutral.500}` |
| `color.lineStrong` | `#66727F` | `{ref.color.neutral.700}` |
| `color.teal` | `#4FB3A6` | `{ref.color.teal.300}` |
| `color.tealBright` | `#57D8C8` | `{ref.color.teal.200}` |
| `color.text` | `#DBE4EE` | `{ref.color.paper.150}` |
| `color.textDim` | `#A9B6C6` | `{ref.color.neutral.900}` |
| `color.textFaint` | `#808D9F` | `{ref.color.neutral.800}` |

## 尺度

| 类别 | 值 | 单位 |
| --- | --- | --- |
| space | 4 / 8 / 12 / 16 / 24 / 32 | px |
| radius | control 4 / panel 8 | px |
| border | control 1.5 / focus 2 / offset 1 | px |
| motion | fast 120 / base 220 / slow 420 | ms |
