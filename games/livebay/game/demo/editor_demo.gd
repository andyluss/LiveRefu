extends Node2D

# LiveBay Tools · 编辑器使用演示（程序化录屏）
# 用于 Movie Maker 生成视频；不是实际桌面录屏。

const W := 1280
const H := 720
const FONT_NAMES := ["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", "Arial Unicode MS"]

const BG := Color("#202427")
const PANEL := Color("#2B3034")
const PANEL2 := Color("#343A3E")
const PAPER := Color("#E9E3D5")
const CREAM := Color("#F5EFE2")
const INK := Color("#232B2F")
const MUTED := Color("#8C978F")
const ORANGE := Color("#D9622B")
const AMBER := Color("#E0A22E")
const TEAL := Color("#3E6F6B")
const RUST := Color("#8C4A32")
const LINE := Color("#4A5256")

const MAP_ORIGIN := Vector2(220, 150)
const MAP_SCALE := 0.52

var t := 0.0
var font: Font
var map_path: Array = [
	Vector2(-60, 540), Vector2(110, 505), Vector2(250, 450), Vector2(390, 385),
	Vector2(530, 340), Vector2(660, 325), Vector2(790, 340), Vector2(930, 385),
	Vector2(1070, 450), Vector2(1180, 505),
]
var slots: Array = [
	Vector2(260, 530), Vector2(390, 470), Vector2(520, 425), Vector2(650, 405),
	Vector2(780, 420), Vector2(910, 462), Vector2(1040, 520),
]
var base_pos := Vector2(1180, 505)

var keys := [
	{"t": 0.0, "p": Vector2(1120, 120)},
	{"t": 1.8, "p": Vector2(1050, 200)},
	{"t": 2.7, "p": Vector2(545, 430)},
	{"t": 4.6, "p": Vector2(565, 455)},
	{"t": 5.6, "p": Vector2(1050, 230)},
	{"t": 6.4, "p": Vector2(615, 300)},
	{"t": 8.2, "p": Vector2(1040, 330)},
	{"t": 9.4, "p": Vector2(1090, 330)},
	{"t": 11.8, "p": Vector2(1170, 330)},
	{"t": 13.0, "p": Vector2(1040, 445)},
	{"t": 14.2, "p": Vector2(1040, 445)},
	{"t": 18.0, "p": Vector2(1180, 130)},
	{"t": 19.0, "p": Vector2(1180, 130)},
	{"t": 21.0, "p": Vector2(1040, 590)},
	{"t": 22.0, "p": Vector2(1040, 590)},
	{"t": 25.0, "p": Vector2(1120, 470)},
]
var clicks := [2.7, 6.1, 9.3, 14.1, 19.0, 22.0]


func _ready() -> void:
	var path := "/System/Library/Fonts/STHeiti Light.ttc"
	if FileAccess.file_exists(path):
		var file := FontFile.new()
		file.data = FileAccess.get_file_as_bytes(path)
		font = file
	else:
		var system := SystemFont.new()
		system.font_names = PackedStringArray(FONT_NAMES)
		system.allow_system_fallback = true
		font = system


func _process(delta: float) -> void:
	t += delta
	queue_redraw()


func _draw() -> void:
	_draw_editor_shell()
	_draw_scene_tree()
	_draw_viewport()
	_draw_dock()
	_draw_caption()
	_draw_cursor()
	_draw_status()


func _text(pos: Vector2, s: String, size := 13, color := CREAM, mono := false) -> void:
	# 统一用中文字体，避免 Movie Maker 下等宽字体缺字显示为方块。
	draw_string(font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)


func _button(rect: Rect2, label: String, active := false, accent := ORANGE) -> void:
	draw_rect(rect, PANEL2 if not active else Color(accent, 0.28), true)
	draw_rect(rect, accent if active else LINE, false, 1.0)
	_text(rect.position + Vector2(10, 18), label, 12, CREAM)


func _draw_editor_shell() -> void:
	draw_rect(Rect2(0, 0, W, H), BG, true)
	draw_rect(Rect2(0, 0, W, 36), Color("#171B1D"), true)
	_text(Vector2(16, 24), "LiveBay — Godot 4.7 · Editor", 13, CREAM)
	draw_circle(Vector2(1120, 18), 5, Color("#6B8F71"))
	_text(Vector2(1132, 22), "main", 11, MUTED, true)
	draw_rect(Rect2(0, 36, 190, H - 36), PANEL, true)
	draw_rect(Rect2(190, 36, 740, H - 36), Color("#1B1F22"), true)
	draw_rect(Rect2(940, 36, 340, H - 36), PANEL, true)
	draw_rect(Rect2(930, 36, 10, H - 36), Color("#171B1D"), true)


func _draw_scene_tree() -> void:
	_text(Vector2(14, 60), "SCENE", 10, MUTED, true)
	var items := ["Main (Node2D)", "  Camera2D", "  CanvasLayer", "    HUD", "  Sim", "  Data"]
	for i in range(items.size()):
		var y := 84 + i * 22
		if i == 0:
			draw_rect(Rect2(8, y - 15, 174, 20), Color(ORANGE, 0.18), true)
		_text(Vector2(16, y), items[i], 11, CREAM if i == 0 else MUTED)
	_text(Vector2(14, 250), "INSPECTOR", 10, MUTED, true)
	_text(Vector2(16, 276), "Map: bay01", 11, CREAM)
	_text(Vector2(16, 296), "slots: 7", 11, MUTED)
	_text(Vector2(16, 316), "path: 11", 11, MUTED)
	_text(Vector2(14, 370), "LIVEBAY TOOLS", 10, ORANGE, true)
	_text(Vector2(16, 394), "地图 / 塔位 / 波次", 11, MUTED)
	_text(Vector2(16, 414), "保存 → numbers/", 11, MUTED)
	_text(Vector2(16, 434), "预览 → 内嵌 Sim", 11, MUTED)


func _map_pt(p: Vector2) -> Vector2:
	return MAP_ORIGIN + p * MAP_SCALE


func _draw_viewport() -> void:
	draw_rect(Rect2(200, 60, 720, 600), Color("#25292C"), true)
	draw_rect(Rect2(210, 70, 700, 580), PAPER, true)
	# 网格
	for x in range(0, 701, 50):
		draw_line(Vector2(210 + x, 70), Vector2(210 + x, 650), Color(INK, 0.04), 1)
	for y in range(0, 581, 50):
		draw_line(Vector2(210, 70 + y), Vector2(910, 70 + y), Color(INK, 0.04), 1)
	_text(Vector2(220, 96), "2D 视图 / 外环第七段", 14, INK)
	_text(Vector2(760, 96), "100%", 10, Color(INK, 0.5), true)
	draw_line(Vector2(210, 108), Vector2(910, 108), Color(INK, 0.2), 1)

	var path := map_path.duplicate()
	if t > 6.2:
		path.insert(6, Vector2(700, 300))
	for i in range(path.size() - 1):
		draw_line(_map_pt(path[i]), _map_pt(path[i + 1]), Color(AMBER, 0.45), 7)
		draw_line(_map_pt(path[i]), _map_pt(path[i + 1]), AMBER, 2)
	for i in range(path.size()):
		var p := _map_pt(path[i])
		draw_circle(p, 4.0, AMBER)
		if t > 6.2 and i == 6:
			draw_arc(p, 8.0, 0, TAU, 20, ORANGE, 2)
	# 基地
	draw_circle(_map_pt(base_pos), 18, Color(TEAL, 0.22), true)
	draw_circle(_map_pt(base_pos), 18, TEAL, false, 2)

	var moved := slots.duplicate()
	if t > 2.9:
		var k := clampf((t - 2.9) / 1.4, 0.0, 1.0)
		moved[3] = slots[3].lerp(Vector2(680, 455), k)
	for i in range(moved.size()):
		var p := _map_pt(moved[i])
		draw_rect(Rect2(p - Vector2(6, 6), Vector2(12, 12)), ORANGE, false, 2)
		if i == 3 and t > 2.3:
			draw_circle(p, 140 * MAP_SCALE, Color(TEAL, 0.12), true)
			draw_circle(p, 140 * MAP_SCALE, Color(TEAL, 0.7), false, 1.5)
			draw_arc(p, 13, 0, TAU, 24, INK, 2)
	# 塔预览
	if t > 2.3:
		var p := _map_pt(slots[3].lerp(Vector2(680, 455), clampf((t - 2.9) / 1.4, 0, 1)))
		draw_circle(p, 18, Color(ORANGE, 0.8), true)
		draw_circle(p, 18, INK, false, 2)


func _draw_dock() -> void:
	draw_rect(Rect2(940, 36, 340, 36), Color("#171B1D"), true)
	_text(Vector2(954, 60), "LiveBay Tools", 14, CREAM)
	_text(Vector2(1160, 60), "地图 · 波次", 10, MUTED, true)
	_button(Rect2(954, 86, 88, 30), "重载", t > 18.8)
	_button(Rect2(1048, 86, 88, 30), "保存", t > 18.8, ORANGE)
	_button(Rect2(1142, 86, 88, 30), "校验", false, TEAL)
	_text(Vector2(954, 140), "塔位 / TOWER", 10, MUTED, true)
	_text(Vector2(954, 160), "拦截炮 · 30        射程 120", 11, CREAM)
	# 时间轴
	_text(Vector2(954, 195), "波次时间轴 / WAVES", 10, MUTED, true)
	var tx := 960.0
	var ty := 214.0
	var tw := 280.0
	var waves := [30, 20, 20, 20, 20]
	for wi in range(5):
		var y := ty + wi * 25
		_text(Vector2(tx, y + 10), "W%d" % (wi + 1), 10, MUTED, true)
		draw_line(Vector2(tx + 24, y + 8), Vector2(tx + tw, y + 8), Color(LINE, 0.6), 1)
		if wi == 3:
			draw_rect(Rect2(tx + 24, y, tw - 24, 17), Color(ORANGE, 0.10), true)
		var bars := [[0, 40, AMBER], [36, 40, ORANGE], [16, 34, RUST], [8, 50, TEAL]]
		if wi == 3:
			bars = [[0, 52, AMBER], [36, 48, ORANGE], [18, 44, RUST], [10, 38, TEAL]]
		for b in bars:
			var x1 := tx + 24 + float(b[0]) * 1.9
			var x2 := x1 + float(b[1]) * 1.1
			if wi == 3 and t > 9.8:
				x1 += clampf((t - 9.8) / 1.2, 0.0, 1.0) * 18
			draw_rect(Rect2(x1, y, maxf(8, x2 - x1), 15), b[2], true)
	# 内嵌预览
	_text(Vector2(954, 352), "内嵌预览 / SUBVIEWPORT", 10, MUTED, true)
	draw_rect(Rect2(954, 362, 280, 158), Color("#1B1F22"), true)
	draw_rect(Rect2(960, 368, 268, 146), PAPER, true)
	var scale := 0.19
	var origin := Vector2(976, 385)
	for i in range(map_path.size() - 1):
		draw_line(origin + map_path[i] * scale, origin + map_path[i + 1] * scale, Color(AMBER, 0.8), 1.2)
	for i in range(slots.size()):
		draw_circle(origin + slots[i] * scale, 2.5, ORANGE)
	draw_circle(origin + base_pos * scale, 5, TEAL, false, 1.5)
	draw_circle(origin + slots[2] * scale, 5, ORANGE, true)
	draw_circle(origin + slots[4] * scale, 5, AMBER, true)
	# 预览中的敌人
	if t > 14.2:
		var pt := clampf((t - 14.2) / 8.0, 0.0, 1.0)
		for i in range(8):
			var d := fmod(pt * 1.4 + i * 0.11, 1.0)
			var idx := int(d * (map_path.size() - 1))
			var frac := d * (map_path.size() - 1) - idx
			var p: Vector2 = (map_path[idx] as Vector2).lerp(map_path[mini(idx + 1, map_path.size() - 1)] as Vector2, frac)
			draw_circle(origin + p * scale, 2.2, Color("#E0A22E"))
		_text(Vector2(966, 506), "PREVIEW W4  t=%.1fs" % maxf(0.0, t - 14.2), 9, TEAL, true)
	# 历史
	_text(Vector2(954, 545), "历史 / HISTORY", 10, MUTED, true)
	var hist := ["拖动塔位 #4", "插入路径点", "应用 W4", "内嵌预览 W4"]
	for i in range(hist.size()):
		var y := 562 + i * 18
		if t > 19.0 and i == 3:
			draw_rect(Rect2(954, y - 12, 280, 17), Color(ORANGE, 0.16), true)
		_text(Vector2(960, y), hist[i], 10, CREAM if t > 19.0 and i == 3 else MUTED)


func mini(a: int, b: int) -> int:
	return a if a < b else b


func _draw_caption() -> void:
	var step := "打开 LiveBay Tools，在 2D 视口看到地图、塔位与时间轴。"
	var color := CREAM
	if t > 2.2:
		step = "拖动塔位：5px 吸附，射程圈实时跟随。"
	if t > 5.2:
		step = "插入路径点：路径与覆盖范围即时更新。"
	if t > 8.2:
		step = "波次时间轴：选中 W4，拖动敌人组调整延迟。"
	if t > 13.0:
		step = "内嵌预览：用真实 Sim 跑 W4，塔会开火，敌人会掉血。"
	if t > 18.5:
		step = "保存：写回 numbers/05 + 04，并导出 game/data。"
	if t > 21.0:
		step = "命名历史：撤销 / 重做 / 回到某个动作之前。"
	draw_rect(Rect2(210, 668, 700, 34), Color("#171B1D", 0.92), true)
	draw_rect(Rect2(210, 668, 4, 34), ORANGE, true)
	_text(Vector2(228, 690), step, 12, color)


func _draw_cursor() -> void:
	var p := _cursor_pos()
	var pulse := 0.0
	for c in clicks:
		pulse = maxf(pulse, 1.0 - absf(t - c) / 0.35)
	var size := 10.0 + pulse * 4.0
	var pts := PackedVector2Array([p, p + Vector2(0, size * 1.8), p + Vector2(size * 0.55, size * 1.25), p + Vector2(size, size * 1.6)])
	draw_colored_polygon(pts, CREAM)
	draw_polyline(PackedVector2Array([pts[0], pts[1], pts[2], pts[3]]), INK, 1.5)
	if pulse > 0.01:
		draw_arc(p, 14 + pulse * 10, 0, TAU, 24, Color(ORANGE, pulse * 0.5), 2)


func _cursor_pos() -> Vector2:
	if t <= keys[0].t:
		return keys[0].p
	for i in range(keys.size() - 1):
		var a: Dictionary = keys[i]
		var b: Dictionary = keys[i + 1]
		if t >= float(a.t) and t <= float(b.t):
			var k := (t - float(a.t)) / maxf(0.001, float(b.t) - float(a.t))
			k = k * k * (3.0 - 2.0 * k)
			return (a.p as Vector2).lerp(b.p as Vector2, k)
	return keys[keys.size() - 1].p


func _draw_status() -> void:
	draw_rect(Rect2(0, H - 24, W, 24), Color("#171B1D"), true)
	var msg := "就绪 · numbers/ 与 game/data 一致"
	if t > 18.8:
		msg = "已保存 · numbers/05 + 04 → export_numbers.py → game/data"
	if t > 21.8:
		msg = "已回到「应用 W4」之前 · 历史跳转"
	_text(Vector2(12, H - 8), msg, 10, MUTED if t < 18.8 else Color("#8FBF9B"), true)
	_text(Vector2(1080, H - 8), "LiveBay Tools 0.1 · Phase 3", 10, MUTED, true)
