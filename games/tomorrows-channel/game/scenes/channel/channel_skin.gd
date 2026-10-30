class_name ChannelSkin
extends Resource
## 频道皮肤 Token 资源类（换肤骨架的"令牌"载体）。
##
## 角色：共用交互骨架（跨频道不变）⇄ 频道主题令牌（每频道一套值）。
## 换肤 = 仅替换一套 token（色板/材质/装饰层/装饰字体/动效曲线），
## 不改骨架结构（见 docs/ui-artist-a/05_m1-ui-skeleton.md §六）。
##
## 初始值对齐主美术磁带基线 v0.1（docs/lead-artist/05_m1-tape-baseline.md）：
##  - 信号层 LUT：tape_lut_*
##  - 容器暖光：tape_container_*
## 本类只负责"把 token 值带进 UI"，UI 侧一律通过 skin 取色，禁止硬编码十六进制。

# ---------------------------------------------------------------------------
# 一、信号层 LUT（频道色板 · 对齐主美术基线 §一）
# ---------------------------------------------------------------------------
@export_group("信号层 LUT（频道色板）")
## 全局底色 / 窗口底（CRT 屏）—— tape_lut_base_dark（#221610）
@export var lut_base_dark: Color = Color("221610")
## 内容卡面 / 塑料米 —— tape_lut_mid_beige（#C7B394）
@export var lut_mid_beige: Color = Color("c7b394")
## 暖白高光 —— tape_lut_lit_warm（#F5E9CE）
@export var lut_lit_warm: Color = Color("f5e9ce")
## 主荧光 · 琥珀（指示灯/字符/泛光）—— tape_lut_phosphor_amber（#FFB000）
@export var lut_phosphor_amber: Color = Color("ffb000")
## 辅荧光 · 终端绿（低占用/状态）—— tape_lut_phosphor_green（#7FC98A）
@export var lut_phosphor_green: Color = Color("7fc98a")
## 状态 / 强调（计数/槽位）—— tape_lut_emphasis（#E39A4C）
@export var lut_emphasis: Color = Color("e39a4c")

# ---------------------------------------------------------------------------
# 二、容器暖光（接收机机身 · 色温 · 对齐主美术基线 §二）
# ---------------------------------------------------------------------------
@export_group("容器暖光（接收机机身）")
## 面板/边框主色（机身塑料米色）—— tape_container_housing_beige（#C7B491）
@export var housing_beige: Color = Color("c7b491")
## 面板暗部 / 阴影 —— tape_container_housing_dark（#2C2113）
@export var housing_dark: Color = Color("2c2113")
## 刻度盘背光·琥珀 —— tape_container_dial_amber（#FFB04A）
@export var dial_amber: Color = Color("ffb04a")
## 设备自身暖光色温（≈2400K，琥珀）—— tape_container_device_warm_k
@export var device_warm_k: float = 2400.0
## 外部"灯下"台灯色温（≈2800K）—— tape_container_lamp_warm_k
@export var lamp_warm_k: float = 2800.0
## 设备自身 : 外部台灯 强度比（6:4）—— tape_container_glow_ratio
@export var glow_ratio: Vector2 = Vector2(0.6, 0.4)

# ---------------------------------------------------------------------------
# 三、换肤骨架扩展槽（M1 占位，M2 三频道共用）
# ---------------------------------------------------------------------------
@export_group("装饰层 / 字体 / 动效（随频道变）")
## 装饰层是否参与（扫描线/微噪/星雾/慢色偏），M1 磁带=扫描线微噪；可关。
@export var decor_enabled: bool = true
## 扫描线遮罩强度上限（UI 侧渲染边界，见 05_ §8 ③【待定】）
@export var scanline_opacity: float = 0.08
## 频道装饰字体名（仅标题与引言，正文不用；回退 font_body_cn）
@export var decor_font_name: String = ""

# ---------------------------------------------------------------------------
# 四、便捷取色（UI 侧用语义角色，不直接读 hex）
# ---------------------------------------------------------------------------
## 主荧光色（强调/点亮）—— 琥珀
func accent_color() -> Color:
	return lut_phosphor_amber


## 全局底色（暗底，荧光体只在其上成立）
func base_color() -> Color:
	return lut_base_dark


## 内容卡面（暖米）
func surface_color() -> Color:
	return lut_mid_beige


## 边框/面板主体色
func frame_color() -> Color:
	return housing_beige
