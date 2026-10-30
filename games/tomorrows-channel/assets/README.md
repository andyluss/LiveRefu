# assets · 最终导出/运行资产

> 存放《明日频道》**最终导出、供游戏/产品直接加载**的运行资产（正式美术贴图 / 音频 / UI 资源）。
> 这是"成品"层：与高层 [`art/`](../art/README.md)（**可编辑源文件工程**，PSD/AI/Blender 源）和 [`docs/lead-artist/moodboard/`](../docs/lead-artist/moodboard/README.md)（**参考/灵感素材**）三者分工：
> - `art/`　= 源文件（可编辑，量大、原始）；
> - `assets/`　= 最终导出（压缩、尺寸、命名成型的运行资源，供 `game/` 加载）；
> - `moodboard/`　= 参考图（仅看）。

## 一、子目录

| 子目录 | 内容 |
| --- | --- |
| [`art/`](art/) | 美术最终贴图：角色 / 场景 / 图标 / 道具（从 `art/` 源导出） |
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
