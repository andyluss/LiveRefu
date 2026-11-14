# LiveBay: Severed · HUD
class_name LiveBaySurvivalHud
extends CanvasLayer

const PALETTE = {
	"bg": Color("#0c1412"),
	"panel": Color("#182326"),
	"cream": Color("#f5efe2"),
	"ink": Color("#232b2f"),
	"dim": Color("#b8c1bc"),
	"faint": Color("#7f8b84"),
	"teal": Color("#3e6f6b"),
	"orange": Color("#d9622b"),
	"amber": Color("#e0a22e"),
	"ok": Color("#3d7a50"),
	"danger": Color("#a84532"),
	"line": Color("#3d4d4d"),
}

var root: Control
var map: LiveBaySurvivalMapView
var callbacks: Dictionary = {}
var font: SystemFont
var timer_label: Label
var state_label: Label
var suit_label: Label
var health_label: Label
var battery_label: Label
var power_label: Label
var seal_label: Label
var ext_label: Label
var room_label: Label
var prompt_label: Label
var log_label: Label
var map_visible := false
var pause_layer: Control
var end_layer: Control
var menu_layer: Control
var end_title: Label
var end_body: Label


func build(cb: Dictionary) -> void:
	callbacks = cb
	layer = 20
	font = SystemFont.new()
	font.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei"])
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_build_top()
	_build_bottom()
	map = LiveBaySurvivalMapView.new()
	map.visible = false
	root.add_child(map)
	_build_pause()
	_build_end()
	_build_menu()


func _build_top() -> void:
	var bar := Panel.new()
	bar.position = Vector2.ZERO
	bar.size = Vector2(1280, 66)
	bar.add_theme_stylebox_override("panel", _style(PALETTE.panel, Color("#3d4d4d"), 0))
	root.add_child(bar)
	var row := HBoxContainer.new()
	row.position = Vector2(14, 7)
	row.size = Vector2(1252, 50)
	row.add_theme_constant_override("separation", 14)
	bar.add_child(row)
	var title := _label("断缆 / SEVERED", 14, PALETTE.cream)
	title.custom_minimum_size = Vector2(150, 46)
	row.add_child(title)
	timer_label = _label("救援 --:--", 13, PALETTE.amber)
	timer_label.custom_minimum_size = Vector2(120, 46)
	row.add_child(timer_label)
	state_label = _label("夜班进行中", 12, PALETTE.dim)
	state_label.custom_minimum_size = Vector2(100, 46)
	row.add_child(state_label)
	suit_label = _label("SUIT 100", 12, PALETTE.cream)
	row.add_child(suit_label)
	health_label = _label("生命 100", 12, PALETTE.cream)
	row.add_child(health_label)
	battery_label = _label("电池 100", 12, PALETTE.amber)
	row.add_child(battery_label)
	power_label = _label("主电 ON", 12, PALETTE.ok)
	row.add_child(power_label)
	seal_label = _label("封条 3", 12, PALETTE.dim)
	row.add_child(seal_label)
	ext_label = _label("灭火 1", 12, PALETTE.dim)
	row.add_child(ext_label)
	room_label = _label("中央走廊", 12, PALETTE.cream)
	room_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	room_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(room_label)


func _build_bottom() -> void:
	var bar := Panel.new()
	bar.position = Vector2(0, 640)
	bar.size = Vector2(1280, 80)
	bar.add_theme_stylebox_override("panel", _style(PALETTE.panel, Color("#3d4d4d"), 0))
	root.add_child(bar)
	var box := VBoxContainer.new()
	box.position = Vector2(16, 8)
	box.size = Vector2(1248, 64)
	box.add_theme_constant_override("separation", 3)
	bar.add_child(box)
	log_label = _label("", 11, PALETTE.faint)
	log_label.custom_minimum_size = Vector2(1000, 18)
	box.add_child(log_label)
	prompt_label = _label("", 15, PALETTE.amber)
	prompt_label.custom_minimum_size = Vector2(1000, 24)
	box.add_child(prompt_label)
	var controls := _label("WASD 移动 · E 交互 · R 封门 · TAB 地图 · SPACE 暂停 · ESC 菜单", 10, PALETTE.faint)
	box.add_child(controls)


func _build_pause() -> void:
	pause_layer = _overlay(Color(0.03, 0.06, 0.05, 0.85))
	pause_layer.visible = false
	root.add_child(pause_layer)
	var panel := _panel(Vector2(470, 250), Vector2(340, 220))
	pause_layer.add_child(panel)
	var box := VBoxContainer.new()
	box.position = Vector2(26, 22)
	box.size = Vector2(288, 176)
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	box.add_child(_label("暂停 / PAUSED", 24, PALETTE.cream))
	box.add_child(_label("生存不靠反应速度；你可以停下来读空间。", 12, PALETTE.dim))
	var resume := _button("继续 (SPACE)", PALETTE.teal)
	resume.pressed.connect(func() -> void: callbacks.get("resume", Callable()).call())
	box.add_child(resume)
	var menu := _button("回到标题", PALETTE.line)
	menu.pressed.connect(func() -> void: callbacks.get("menu", Callable()).call())
	box.add_child(menu)


func _build_end() -> void:
	end_layer = _overlay(Color(0.03, 0.06, 0.05, 0.9))
	end_layer.visible = false
	root.add_child(end_layer)
	var panel := _panel(Vector2(360, 180), Vector2(560, 360))
	end_layer.add_child(panel)
	var box := VBoxContainer.new()
	box.position = Vector2(28, 22)
	box.size = Vector2(504, 316)
	box.add_theme_constant_override("separation", 10)
	panel.add_child(box)
	end_title = _label("班次结束", 28, PALETTE.cream)
	box.add_child(end_title)
	end_body = _label("", 13, PALETTE.dim)
	end_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	end_body.custom_minimum_size = Vector2(504, 180)
	box.add_child(end_body)
	var retry := _button("再来一班", PALETTE.orange)
	retry.pressed.connect(func() -> void: callbacks.get("restart", Callable()).call())
	box.add_child(retry)
	var menu := _button("回到标题", PALETTE.line)
	menu.pressed.connect(func() -> void: callbacks.get("menu", Callable()).call())
	box.add_child(menu)


func _build_menu() -> void:
	menu_layer = _overlay(Color(0.03, 0.06, 0.05, 1.0))
	root.add_child(menu_layer)
	var panel := _panel(Vector2(330, 120), Vector2(620, 480))
	menu_layer.add_child(panel)
	var box := VBoxContainer.new()
	box.position = Vector2(34, 28)
	box.size = Vector2(552, 424)
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)
	box.add_child(_label("逍遥湾：断缆", 34, PALETTE.cream))
	box.add_child(_label("SEVERED · 舱段生存 / 夜班 03:40", 12, PALETTE.amber))
	var intro := _label("外环第七段被碎片切断。\n你是夜班值班人。氧气、电力、压力、救援窗口都不够。\n\n先判断：先封哪道门、先修哪条线、先救哪个人。\n撤离是合法结局；失败会留下知识。", 13, PALETTE.dim)
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.custom_minimum_size = Vector2(540, 160)
	box.add_child(intro)
	var start := _button("开始班次 (E)", PALETTE.orange)
	start.pressed.connect(func() -> void: callbacks.get("start", Callable()).call())
	box.add_child(start)
	box.add_child(_label("WASD 移动 · E 交互 · R 封门 · TAB 地图 · SPACE 暂停", 10, PALETTE.faint))


func update(sim: LiveBaySectionSim, context: Dictionary) -> void:
	if sim == null:
		return
	timer_label.text = "救援 %s" % _fmt_time(maxf(0.0, sim.rescue_at - sim.elapsed))
	state_label.text = "可撤离" if sim.rescue_open else "夜班进行中"
	state_label.add_theme_color_override("font_color", PALETTE.ok if sim.rescue_open else PALETTE.dim)
	suit_label.text = "SUIT %d" % int(ceil(sim.suit_o2))
	suit_label.add_theme_color_override("font_color", PALETTE.danger if sim.suit_o2 < 25 else PALETTE.cream)
	health_label.text = "生命 %d" % int(ceil(sim.health))
	health_label.add_theme_color_override("font_color", PALETTE.danger if sim.health < 30 else PALETTE.cream)
	battery_label.text = "电池 %d" % int(ceil(sim.battery))
	battery_label.add_theme_color_override("font_color", PALETTE.danger if sim.battery < 20 else PALETTE.amber)
	power_label.text = "主电 " + ("ON" if sim.power_on else "OFF")
	power_label.add_theme_color_override("font_color", PALETTE.ok if sim.power_on else PALETTE.danger)
	seal_label.text = "封条 %d" % sim.seal_kits
	ext_label.text = "灭火 %d" % sim.extinguishers
	var r: Dictionary = sim.current_room()
	room_label.text = "%s · O2 %d · P %d · T %d" % [str(r.get("name", "")), int(r.get("o2", 0)), int(r.get("pressure", 0)), int(r.get("temp", 0))]
	if sim.log.size() > 0:
		log_label.text = str(sim.log.back().get("text", ""))
	else:
		log_label.text = ""
	if context.is_empty():
		prompt_label.text = "观察空间，靠近门/泄漏/控制台/人。"
	else:
		prompt_label.text = str(context.get("label", "")) + "  [E]" + (("  [R] 封门") if context.get("type", "") == "door" else "") + (("  [F] 留下") if context.get("type", "") == "dock" and sim.rescue_open else "")
	if map_visible:
		map.queue_redraw()


func show_menu() -> void:
	menu_layer.visible = true
	pause_layer.visible = false
	end_layer.visible = false
	map.visible = false
	map_visible = false


func start_play() -> void:
	menu_layer.visible = false
	pause_layer.visible = false
	end_layer.visible = false


func set_paused(value: bool) -> void:
	pause_layer.visible = value


func show_end(sim: LiveBaySectionSim) -> void:
	end_layer.visible = true
	var title := "班次结束"
	var color := PALETTE.cream
	match sim.state:
		"evacuated":
			title = "撤离 / 活着交接"
			color = PALETTE.ok
		"stayed":
			title = "留下 / 救援已走"
			color = PALETTE.amber
		"missed":
			title = "失联 / 救援窗口关闭"
			color = PALETTE.danger
		"dead":
			title = "死亡 / 这一班没有回来"
			color = PALETTE.danger
	end_title.text = title
	end_title.add_theme_color_override("font_color", color)
	end_body.text = "%s\n\n时间 %s · 封门 %d · 修补 %d · 灭火 %d\n岚：%s\n电力：%s · 电池 %d%%\n\n班后记录：%s" % [
		sim.reason, _fmt_time(sim.elapsed), sim.stats.sealed, sim.stats.repaired, sim.stats.fires,
		"获救" if sim.npc.get("rescued", false) else ("死亡" if int(sim.npc.get("health", 0)) <= 0 else "留在医疗舱"),
		"接通" if sim.power_on else "切断", int(sim.battery),
		"按惯例处理，未记录异常。" if sim.state != "evacuated" else "如实记录，已交班。",
	]


func toggle_map() -> void:
	map_visible = not map_visible
	map.visible = map_visible


func _overlay(c: Color) -> Control:
	var ctl := Control.new()
	ctl.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ctl.mouse_filter = Control.MOUSE_FILTER_STOP
	var rect := ColorRect.new()
	rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rect.color = c
	ctl.add_child(rect)
	return ctl


func _panel(pos: Vector2, s: Vector2) -> Panel:
	var p := Panel.new()
	p.position = pos
	p.size = s
	p.add_theme_stylebox_override("panel", _style(PALETTE.panel, PALETTE.line, 12))
	return p


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _button(text: String, color: Color) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(220, 40)
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", 14)
	b.add_theme_stylebox_override("normal", _style(color, color.darkened(0.3), 8))
	b.add_theme_stylebox_override("hover", _style(color.lightened(0.1), PALETTE.amber, 8))
	b.add_theme_stylebox_override("pressed", _style(color.darkened(0.15), color.darkened(0.3), 8))
	b.add_theme_color_override("font_color", PALETTE.cream)
	return b


func _style(bg: Color, border: Color, radius: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 10
	s.content_margin_right = 10
	s.content_margin_top = 6
	s.content_margin_bottom = 6
	return s


func _fmt_time(seconds: float) -> String:
	var s := maxi(0, int(ceil(seconds)))
	return "%02d:%02d" % [s / 60, s % 60]
