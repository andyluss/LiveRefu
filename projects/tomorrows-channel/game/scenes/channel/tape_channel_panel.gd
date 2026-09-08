class_name TapeChannelPanel
extends Control
## 磁带频道最小面板（M1）——「接收机中央窗口」一版的皮肤 Token 挂载点。
##
## 角色（见 docs/ui-artist-a/05_m1-ui-skeleton.md §四）：
##  - M1 只做「频道窗口层」这一版「最小面板」：一块带边框的屏幕区域，
##    内部分区放计时/混音/收藏/切换入口；容器层（接收机外壳）不在此职责内。
##  - 本面板是「共用骨架 + Token」的挂载点：骨架结构固定，仅由 skin 注入
##    磁带频道 token（色板/材质/装饰层），换频道 = 换一份 .tres，不改本结构。
##
## 主美术基线（docs/lead-artist/05_m1-tape-baseline.md）：占位皮肤基调 §5.1——
## 顶栏（琥珀等宽字 + 常亮电源灯）→ 中央窗口（暗底 + 琥珀/绿单色）→ 底部控制带。
## M1 只做一档，不做多档变体；信号层内容被限制在窗口内渲染。

## 频道皮肤 Token（换肤载体）。初始化时由父级/装载器注入 tape_channel_skin.tres。
@export var skin: ChannelSkin

## 频道名（占位：真实值来自 channel 表，代码零硬编码）
@export var channel_name: String = "磁带暖未来"

# 结果缓存（tscn 内唯一命名节点；用 % 引用）
@onready var _channel_title: Label = %ChannelTitle
@onready var _window: Control = %Window
@onready var _pwr_led: ColorRect = %PwrLed


func _ready() -> void:
	# 换肤入口：把 token 应用到本面板各部件（结构不动，仅取色）。
	_apply_skin()
	_build_static_layout(_static_skin())


## 换肤：仅把「随频道变」的 Token 值填进骨架，绝不改骨架结构。
func _apply_skin() -> void:
	if skin == null:
		# 未注入 token 时用一套中性兜底，保骨架可预览；正式运行时绝不缺 token。
		return
	_channel_title.add_theme_color_override("font_color", skin.lut_phosphor_amber)
	# 顶栏底为暖黑（暗底，荧光体只在其上成立）
	_channel_title.add_theme_color_override("font_outline_color", skin.lut_base_dark)
	# 电源指示灯常亮（琥珀，属基底不可关）——对齐主美术基线 §5.1
	if _pwr_led:
		_pwr_led.color = skin.lut_phosphor_amber


## @pending: 主程序确认「运行时 Token 热切换」或「预烘焙 UI 主题」后，
## 在此决定是直接改 Override 还是切换 Theme（见 05_ §八 ②）。
func _static_skin() -> ChannelSkin:
	return skin


## M1 只做顶部频道条 + 中央窗口 + 底部控制带的极简静态骨架占位；
## 动态装饰层（扫描线/微噪）由图形 A 处理，本面板只消费其结果。
func _build_static_layout(_s: ChannelSkin) -> void:
	pass


## 收藏动作入口（M1 最小：点卡收藏 → 最小列表 1 条 + 归档反馈）。
## @pending: 接事件总线后广播 collect_requested(card_id)，由收藏列表消费。
func _on_collect_pressed() -> void:
	pass
