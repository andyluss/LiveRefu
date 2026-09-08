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
##
## 收藏 1 卡（M1 出口标准 #4 · UI 侧职责 = 呈现 + 事件 emit + 订阅驱动界面）：
##  - 收藏逻辑（校验/归档/碎片）与内容卡池归主程序/数值侧（scripts/collection_controller.gd）。
##  - 收藏按钮 → 广播 event_bus.collect_requested(card_id)；主程序校验归档后广播
##    event_bus.card_collected(card_id, rarity)，本面板订阅后置「已归档」轻反馈。
##  - 事件契约（collect_requested / card_collected）与对齐见 docs/ui-artist-a/06_m1-ui-godot-impl.md §五点六。
##  - 页面展示「当前可收藏的卡」（title / rarity / 摘要）——数据驱动的呈现，代码零硬编码 id。

## 频道皮肤 Token（换肤载体）。初始化时由父级/装载器注入 tape_channel_skin.tres。
@export var skin: ChannelSkin

## 频道名（占位：真实值来自 channel 表，代码零硬编码）
@export var channel_name: String = "磁带暖未来"

## 当前展示的内容卡 id（由主程序装配时从内容卡池注入，数据驱动；M1 取池首张）。
## 本面板据此取卡呈现并发出 collect_requested(card_id)。
@export var current_card_id: String = ""

# 结果缓存（tscn 内唯一命名节点；用 % 引用）
@onready var _channel_title: Label = %ChannelTitle
@onready var _window: Control = %Window
@onready var _pwr_led: ColorRect = %PwrLed
@onready var _card_title: Label = %CardTitle
@onready var _card_meta: Label = %CardMeta
@onready var _card_body: Label = %CardBody
@onready var _collect_button: Button = %CollectButton
@onready var _collect_feedback: Label = %CollectFeedback

## 当前展示的可收藏卡（content_card 表一行）。真值由主程序/数值侧供；本面板只读呈现。
var current_card: Dictionary = {}

## 当前卡是否已收藏（UI 侧镜像；收藏真值归 CollectionController.gallery）。
var _collected: bool = false

## "已归档"轻反馈的淡入/淡出 Tween 引用。
var _feedback_tween: Tween = null


func _ready() -> void:
	# 换肤入口：把 token 应用到本面板各部件（结构不动，仅取色）。
	_apply_skin()
	_build_static_layout(_static_skin())
	# 收藏 1 卡（UI 侧）：装载当前可收藏卡 → 呈现 → 接事件（emit collect_requested / 订阅 card_collected）。
	_load_current_card()
	_render_card()
	_connect_collect_events()


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
	# 中央窗口 = 暗底（CRT 屏，荧光体只在其上成立）——对齐主美术基线 §5.1
	if _window:
		_window.add_theme_stylebox_override("panel", _window_style(skin))
	# 收藏卡文字：标题=主荧光琥珀、稀有度/类型=辅荧光绿、正文=暖白高光（可读）
	if _card_title:
		_card_title.add_theme_color_override("font_color", skin.lut_phosphor_amber)
	if _card_meta:
		_card_meta.add_theme_color_override("font_color", skin.lut_phosphor_green)
	if _card_body:
		_card_body.add_theme_color_override("font_color", skin.lut_lit_warm)
	# 收藏按钮/反馈的 token 色（常态=主荧光；已收藏=辅荧光绿）——不硬编码 hex
	_apply_collect_visual()


## @pending: 主程序确认「运行时 Token 热切换」或「预烘焙 UI 主题」后，
## 在此决定是直接改 Override 还是切换 Theme（见 05_ §八 ②）。
func _static_skin() -> ChannelSkin:
	return skin


## M1 只做顶部频道条 + 中央窗口 + 底部控制带的极简静态骨架占位；
## 动态装饰层（扫描线/微噪）由图形 A 处理，本面板只消费其结果。
func _build_static_layout(_s: ChannelSkin) -> void:
	pass


# ---------------------------------------------------------------------------
# 收藏 1 卡 · UI 侧呈现（data-driven：卡池一张 → title/rarity/摘要）
# ---------------------------------------------------------------------------

## 装载「当前可收藏的卡」：优先按注入的 current_card_id 取，兜底取卡池第一张。
## 卡池权威源（config_loader.content_cards / content_card.json 表）归主程序/数值侧；本面板只读。
func _load_current_card() -> void:
	if is_instance_valid(config_loader):
		if current_card_id != "":
			current_card = config_loader.get_content_card(current_card_id)
		if current_card.is_empty():
			var pool: Array = config_loader.get_content_card_pool()
			if pool.size() > 0 and pool[0] is Dictionary:
				current_card = pool[0]
	# 兜底同步 current_card_id（AppController 亦注入；此处保证无注入时按钮仍可用）。
	if current_card_id == "":
		current_card_id = String(current_card.get("id", ""))


## 呈现当前卡（title / rarity+type / 摘要）。摘要取 body 前 40 字，防长文撑爆窗口。
func _render_card() -> void:
	if current_card.is_empty():
		_card_title.text = ""
		_card_meta.text = ""
		_card_body.text = ""
		_render_collect_state()
		return
	_card_title.text = String(current_card.get("title", ""))
	_card_meta.text = _format_card_meta(current_card)
	_card_body.text = _format_card_summary(current_card)
	_render_collect_state()


## 卡元信息：稀有度 + 类型（中文可读；枚举直填，代码不硬编码文案映射）。
func _format_card_meta(card: Dictionary) -> String:
	var parts: Array[String] = []
	var rarity := _rarity_label(String(card.get("rarity", "")))
	if rarity != "":
		parts.append(rarity)
	var ctype := _type_label(String(card.get("type", "")))
	if ctype != "":
		parts.append(ctype)
	return " · ".join(parts)


func _rarity_label(rarity: String) -> String:
	match rarity:
		"common": return "普通"
		"rare": return "稀有"
		"cult": return "典藏"
	return rarity


func _type_label(ctype: String) -> String:
	match ctype:
		"image_text": return "图文"
		"motion": return "影音"
		"quote": return "引言"
	return ctype


## 摘要：正文前 40 字 + 省略号（UI 最小可读，不截断中文字符）。
func _format_card_summary(card: Dictionary) -> String:
	var body := String(card.get("body", ""))
	if body.length() <= 40:
		return body
	return body.substr(0, 40) + "…"


## 收藏按钮态：常态「收藏」/ 已收藏「已归档」（禁用）。
func _render_collect_state() -> void:
	_collect_button.text = "已归档" if _collected else "收藏"
	_collect_button.disabled = _collected
	_apply_collect_visual()


## 收藏按钮/反馈的 token 上色（常态=主荧光琥珀；已收藏=辅荧光绿）。
## 永不硬编码十六进制——一切取自 skin（主美术磁带基线 token）。
func _apply_collect_visual() -> void:
	if skin == null:
		return
	var fg := skin.lut_phosphor_green if _collected else skin.lut_phosphor_amber
	_collect_button.add_theme_color_override("font_color", fg)
	_collect_button.add_theme_color_override("font_hover_color", fg)
	_collect_button.add_theme_color_override("font_pressed_color", fg)
	_collect_button.add_theme_color_override("font_disabled_color", skin.lut_phosphor_green)
	for state in ["normal", "hover", "pressed", "disabled"]:
		_collect_button.add_theme_stylebox_override(state, _collect_button_style(skin, fg))
	if _collect_feedback:
		_collect_feedback.add_theme_color_override("font_color", skin.lut_phosphor_green)


# ---------------------------------------------------------------------------
# 收藏 1 卡 · 事件契约（emit collect_requested / 订阅 card_collected）
# ---------------------------------------------------------------------------

## 接收藏事件：收藏按钮 → collect_requested(card_id)；订阅 card_collected 驱动"已归档"反馈。
func _connect_collect_events() -> void:
	_collect_button.pressed.connect(_on_collect_pressed)
	# 订阅逻辑层收藏确认（UI 只经 event_bus 订阅，不持有收藏真值）。
	event_bus.card_collected.connect(_on_card_collected)


## 收藏动作入口（M1 最小：点卡收藏 → 最小列表 1 条 + 归档反馈）。
## UI 只发请求：广播 collect_requested(card_id)；校验/归档/碎片由 CollectionController 处理。
## 事件名（collect_requested / card_collected）与主程序对齐，见 docs/ui-artist-a/06_m1-ui-godot-impl.md §五点六。
func _on_collect_pressed() -> void:
	if current_card_id == "":
		push_warning("TapeChannelPanel: 当前无内容卡 id，无法收藏")
		return
	event_bus.collect_requested.emit(current_card_id)


## 订阅 card_collected：当前展示卡已收藏 → 置"已归档"态 + 轻反馈（不打断专注，静默可用）。
func _on_card_collected(card_id: String, _rarity: String) -> void:
	if String(current_card.get("id", "")) != card_id:
		return
	_collected = true
	_render_card()
	_show_collect_feedback()


## "已归档"轻反馈：极简淡入→停留→淡出。不弹窗/不遮罩/不抢焦；静默可用（不动效层也成立）。
func _show_collect_feedback() -> void:
	_collect_feedback.visible = true
	_collect_feedback.modulate.a = 0.0
	if _feedback_tween and _feedback_tween.is_valid():
		_feedback_tween.kill()
	_feedback_tween = create_tween()
	_feedback_tween.tween_property(_collect_feedback, "modulate:a", 1.0, 0.12)
	_feedback_tween.tween_interval(1.6)
	_feedback_tween.tween_property(_collect_feedback, "modulate:a", 0.0, 0.4)
	_feedback_tween.tween_callback(func() -> void: _collect_feedback.visible = false)


# ---------------------------------------------------------------------------
# 磁带皮肤 StyleBox（仅为布局骨架上的"取色"载体，不硬编码 hex）
# ---------------------------------------------------------------------------

## 中央窗口（暗底 + 琥珀包边）——对齐主美术基线 §5.1 / §三 终端边框。
func _window_style(s: ChannelSkin) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = s.lut_base_dark
	sb.border_color = s.lut_phosphor_amber
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(8)
	return sb


## 收藏按钮 StyleBox（暗底 + 荧光包边；fg 由状态决定：常态琥珀 / 已收藏绿）。
func _collect_button_style(s: ChannelSkin, fg: Color) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = s.lut_base_dark
	sb.border_color = fg
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(4)
	sb.content_margin_left = 12.0
	sb.content_margin_right = 12.0
	sb.content_margin_top = 6.0
	sb.content_margin_bottom = 6.0
	return sb
