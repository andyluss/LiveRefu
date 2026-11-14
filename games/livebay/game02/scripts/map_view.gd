# LiveBay: Severed · 舱段地图
class_name LiveBaySurvivalMapView
extends Control

var sim: LiveBaySectionSim
var font: SystemFont


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	font = SystemFont.new()
	font.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei"])


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.03, 0.06, 0.05, 0.92))
	if sim == null:
		return
	var scale := minf((size.x - 120) / 1000.0, (size.y - 120) / 560.0)
	var origin := Vector2(60, 70)
	draw_string(font, Vector2(60, 42), "舱段地图 / SECTION MAP", HORIZONTAL_ALIGNMENT_LEFT, 500, 20, Color("#f5efe2"))
	draw_string(font, Vector2(60, 60), "TAB 关闭 · 门/压力/氧气/故障", HORIZONTAL_ALIGNMENT_LEFT, 500, 10, Color("#8c978f"))
	for rid: String in sim.room_order:
		var r: Dictionary = sim.rooms[rid]
		var rect: Rect2 = Rect2(origin.x + r.rect[0] * scale, origin.y + r.rect[1] * scale, r.rect[2] * scale, r.rect[3] * scale)
		var col := _room_color(r)
		draw_rect(rect, Color(col.r, col.g, col.b, 0.22))
		draw_rect(rect, Color(col.r, col.g, col.b, 0.8), false, 1.5)
		draw_string(font, rect.position + Vector2(6, 16), str(r.name), HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 12, 11, Color("#f5efe2"))
		draw_string(font, rect.position + Vector2(6, 30), "O2 %d  P %d" % [int(r.o2), int(r.pressure)], HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 12, 9, Color("#b8c1bc"))
	for d: Dictionary in sim.doors:
		var a: Vector2 = origin + Vector2(d.a_pos[0], d.a_pos[1]) * scale
		var b: Vector2 = origin + Vector2(d.b_pos[0], d.b_pos[1]) * scale
		var col := Color("#3d7a50") if bool(d.open) else Color("#a96f17")
		if bool(d.sealed):
			col = Color("#a84532")
		draw_line(a, b, col, 2.0)
		draw_circle(a, 3, col)
		draw_circle(b, 3, col)
	var pr: Dictionary = sim.current_room()
	var pp: Vector2 = origin + Vector2(pr.rect[0] + pr.rect[2] * 0.5, pr.rect[1] + pr.rect[3] * 0.5) * scale
	draw_circle(pp, 7, Color("#f5efe2"))
	draw_arc(pp, 9, 0, TAU, 24, Color("#d9622b"), 2.0, true)
	draw_string(font, Vector2(60, size.y - 28), "救援窗口：%s · 当前：%s" % [_fmt_time(sim.rescue_at - sim.elapsed), str(pr.name)], HORIZONTAL_ALIGNMENT_LEFT, 600, 11, Color("#8c978f"))


func _room_color(r: Dictionary) -> Color:
	if float(r.get("fire", 0.0)) > 0.0:
		return Color("#e27b4c")
	if float(r.get("pressure", 100.0)) < 25.0:
		return Color("#83c3ea")
	if float(r.get("o2", 100.0)) < 25.0:
		return Color("#d5a54a")
	return Color("#3e6f6b")


func _fmt_time(seconds: float) -> String:
	var s := maxi(0, int(ceil(seconds)))
	return "%02d:%02d" % [s / 60, s % 60]
