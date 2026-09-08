# assets · 项目产出资产

> 存放《明日频道》**最终可用于产品**的产出资产（正式美术 / 音频 / UI 资源）。
> 与 [`docs/lead-artist/moodboard/`](../docs/lead-artist/moodboard/README.md)（**参考/灵感素材**）严格区分：moodboard 是风格案例图、只作参考；本目录是**要进游戏/产品**的正式资产。

## 一、子目录

| 子目录 | 内容 |
| --- | --- |
| [`art/`](art/) | 美术正式产出：角色 / 场景 / 图标 / 道具素材 |
| [`audio/`](audio/) | 音频：环境音景、混音轨、提示音、BGM |
| [`ui/`](ui/) | UI 资源：切图、九宫格、图标、字体 |

## 二、命名规范

- 统一 `snake_case`，含类型前缀，如 `chan_crt_scanline.png`、`sfx_focus_end.ogg`。
- UI 资源遵循 UI 设计美术 A 规范（`ui_...` 前缀 + 九宫格 3 态），命名见 [`docs/ui-artist-a/`](../docs/ui-artist-a/)。
- 美术资源遵循主美术规范（命名/尺寸/导入设置），见 [`docs/lead-artist/`](../docs/lead-artist/)。
- 音频命名：`sfx_` 提示音 / `amb_` 环境 / `bgm_` 音乐。

## 三、来源与版权

- 所有资产须记录来源与许可：凡来自外部（如 Wikimedia Commons 等）的素材，**先经内容合规闸门**（见 [`docs/_shared/gdd-tomorrows-channel.md`](../docs/_shared/gdd-tomorrows-channel.md) §内容版权），并在资产旁附 `.meta.txt` 记录来源/许可/作者。
- 优先使用公版（Public domain）/ CC0 / 自产；CC BY/BY-SA 需署名且复核可商用，不作默认来源。
- 详见参考库的许可体例 [`docs/lead-artist/moodboard/README.md`](../docs/lead-artist/moodboard/README.md)。

## 四、占位说明

- 空目录以 `.gitkeep` 占位；正式资产入库后移除对应 `.gitkeep`。
