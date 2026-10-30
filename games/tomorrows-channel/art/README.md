# art · 美术源文件工程

> 存放《明日频道》**可编辑的美术源文件**（Photoshop / Illustrator / Blender / 其他工程文件）。
> 与 [`assets/`](../assets/README.md)（**最终导出/运行资源**）区分：本目录是"源"（原始、可编辑、体积大）；assets 是从源导出的成品，供 [`game/`](../game/README.md) 加载。

## 一、子目录（按品类）

| 子目录 | 内容 |
| --- | --- |
| `characters/` | 角色源文件（建模 / 贴图 PSD、骨骼/绑定源） |
| `environments/` | 场景 / 背景源文件 |
| `props/` | 道具 / 物件源文件 |
| `fx/` | 特效源（粒子、序列帧、材质源） |
| `ui-paint/` | UI 视觉源（界面设计稿、图标源、字体编排源） |

> 子目录尚未建时，`art/` 顶层以 `.gitkeep` 占位；需要时按上表建。

## 二、命名与版本

- 源文件：`<系统>_<对象>_src.<ext>`，同一对象的不同稿用 `_v1/_v2` 或日期后缀，如 `chan_crt_src_v2.psd`。
- 源文件与导出（`assets/`）**同名关联**，便于溯源：`assets/art/chan_crt.png` ← `art/props/chan_crt_src.psd`。
- 每批源文件建议附 `_notes.md` 说明图层结构/使用的滤镜/导出设置，方便他人接手。

## 三、与其它目录的关系

- 源 → 导出：`art/` → 导入设置后输出到 [`assets/`](../assets/)（遵守主美术命名/尺寸/导入规范，见 [`docs/lead-artist/`](../docs/lead-artist/)）。
- 参考：风格对照用 [`docs/lead-artist/moodboard/`](../docs/lead-artist/moodboard/README.md)。
