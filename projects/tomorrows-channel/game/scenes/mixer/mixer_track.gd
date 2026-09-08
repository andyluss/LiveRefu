class_name MixerTrack
extends Resource
## 混音轨（数据驱动）。字段契约对齐数值策划 A 的 mixer_track 表（见 05_ §五）。
## 音量 / 轨名 / bus 一律来自数据，代码零硬编码、禁止魔法数。
## 权威源在 data/tables/mixer_track.json（尚未建，标【待定】）。

## 轨唯一 id（对应 mixer_track 表 id）
@export var id: String = ""
## 轨显示名（在中英混排回落字体槽 font_body_cn）
@export var display_name: String = ""
## 默认音量（0..1，加载后写入混音盘 bus）
@export var default_volume: float = 0.5
## 目标 audio bus（音景轨，见主程序 01_ §五 3–4 轨）
@export var bus: String = "Master"
