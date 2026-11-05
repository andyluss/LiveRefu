# LiveBay · 游戏渲染器
# 只读 Sim/读模型并绘制；不处理输入、不改规则。
class_name LiveBayGameRenderer
extends RefCounted

const PALETTE := {
	"paper": Color("#E9E3D5"),
	"panel": Color("#D6CEBC"),
	"cream": Color("#F5EFE2"),
	"ink": Color("#232B2F"),
	"slate": Color("#2F3A3E"),
	"teal": Color("#3E6F6B"),
	"orange": Color("#D9622B"),
	"amber": Color("#E0A22E"),
	"rust": Color("#8C4A32"),
	"sage": Color("#7C8F6B"),
}
const VIEW_SIZE := Vector2(1280, 720)
const TOP_BAR_H := 56.0

var font: Font
var canvas: CanvasItem
var sim: Variant
var selected_slot := -1
var hover_slot := -1
var beams: Array = []
var leak_flash := 0.0
var toast_text := ""
var toast_timer := 0.0
var paused := false


func draw(target: CanvasItem, game_sim: Variant, selected: int, hover: int, beam_list: Array, flash: float, text: String, timer: float, is_paused: bool) -> void:
	canvas = target
	sim = game_sim
	selected_slot = selected
	hover_slot = hover
	beams = beam_list
	leak_flash = flash
	toast_text = text
	toast_timer = timer
	paused = is_paused
	_draw_all()


func _draw_all() -> void:
	canvas.draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), PALETTE.paper)
	_draw_grid()
	_draw_title()
	_draw_city()
	if sim == null:
		return
	_draw_path()
	_draw_base()
	_draw_slots()
	_draw_towers()
	_draw_enemies()
	_draw_beams()
	_draw_toast()
	if paused and sim.state != 2 and sim.state != 4:
		canvas.draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color(0.09, 0.11, 0.12, 0.35))
		_draw_center_text("已暂停", 42, PALETTE.cream, 24)
	if leak_flash > 0.0:
		canvas.draw_rect(Rect2(Vector2.ZERO, VIEW_SIZE), Color(0.85, 0.2, 0.1, leak_flash * 0.28))


func _draw_title() -> void:
	canvas.draw_string(font, Vector2(26, 92), "外环 · 第七段", HORIZONTAL_ALIGNMENT_LEFT, -1, 26, PALETTE.ink)
	canvas.draw_string(font, Vector2(26, 116), "夜班 03:40 · 交接后第 1 班", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(PALETTE.ink, 0.6))
	canvas.draw_line(Vector2(26, 128), Vector2(250, 128), Color(PALETTE.orange, 0.8), 2.0)


func _draw_grid() -> void:
	var color := Color(PALETTE.ink, 0.05)
	for x: int in range(0, int(VIEW_SIZE.x) + 1, 40):
		canvas.draw_line(Vector2(x, 0), Vector2(x, VIEW_SIZE.y), color, 1.0)
	for y: int in range(0, int(VIEW_SIZE.y) + 1, 40):
		canvas.draw_line(Vector2(0, y), Vector2(VIEW_SIZE.x, y), color, 1.0)


func _draw_city() -> void:
	# 路径内侧的城市剪影：不是精确布局，只是「你在保护什么」的提示。
	var blocks := [
		[80, 566, 120, 40], [220, 556, 90, 50], [330, 576, 140, 30],
		[490, 566, 110, 40], [620, 576, 160, 30], [800, 566, 100, 40],
		[920, 556, 130, 50], [1070, 571, 150, 35],
	]
	for block: Array in blocks:
		canvas.draw_rect(Rect2(float(block[0]), float(block[1]), float(block[2]), float(block[3])), Color(PALETTE.panel, 0.55))
		canvas.draw_rect(Rect2(float(block[0]), float(block[1]), float(block[2]), float(block[3])), Color(PALETTE.ink, 0.18), false, 1.0)
	for i: int in range(0, 14):
		var x := 92.0 + i * 82.0
		canvas.draw_circle(Vector2(x, 584), 2.4, Color(PALETTE.amber, 0.55))


func _draw_path() -> void:
	if sim.path.size() < 2:
		return
	canvas.draw_polyline(sim.path, Color(PALETTE.ink, 0.18), 44.0, true)
	canvas.draw_polyline(sim.path, Color("#394447"), 32.0, true)
	canvas.draw_polyline(sim.path, Color("#6E7873"), 26.0, true)
	# 中心虚线
	for i: int in range(1, sim.path.size()):
		var a: Vector2 = sim.path[i - 1]
		var b: Vector2 = sim.path[i]
		var length: float = a.distance_to(b)
		var steps: int = int(length / 22.0)
		for s: int in range(steps):
			if s % 2 == 0:
				var p0: Vector2 = a.lerp(b, float(s) / float(max(1, steps)))
				var p1: Vector2 = a.lerp(b, min(1.0, (float(s) + 0.55) / float(max(1, steps))))
				canvas.draw_line(p0, p1, Color(PALETTE.amber, 0.5), 2.0)


func _draw_base() -> void:
	var t: float = Time.get_ticks_msec() / 1000.0
	var pulse: float = 3.0 + sin(t * 2.2) * 2.0
	canvas.draw_circle(sim.base_pos, sim.base_radius + pulse, Color(PALETTE.orange, 0.12))
	canvas.draw_circle(sim.base_pos, sim.base_radius, PALETTE.slate)
	canvas.draw_arc(sim.base_pos, sim.base_radius, 0, TAU, 48, PALETTE.amber, 3.0, true)
	canvas.draw_circle(sim.base_pos, 9.0, PALETTE.orange)
	canvas.draw_string(font, sim.base_pos + Vector2(-30, 52), "湾口", HORIZONTAL_ALIGNMENT_CENTER, 60, 15, PALETTE.ink)


func _draw_slots() -> void:
	for i: int in range(sim.slots.size()):
		var pos: Vector2 = sim.slots[i]
		if i == selected_slot:
			var tower: Variant = sim.get_tower_at(i)
			if tower != null:
				var range_px: float = sim._tower_range(tower)
				canvas.draw_circle(pos, range_px, Color(PALETTE.teal, 0.08))
				canvas.draw_arc(pos, range_px, 0, TAU, 64, Color(PALETTE.teal, 0.55), 2.0, true)
		if sim.get_tower_at(i) != null:
			continue
		var fill := PALETTE.cream if i != hover_slot else Color("#FFF6E6")
		canvas.draw_circle(pos, 18.0, fill)
		canvas.draw_arc(pos, 18.0, 0, TAU, 32, PALETTE.ink, 2.0, true)
		canvas.draw_arc(pos, 13.0, 0, TAU, 32, Color(PALETTE.ink, 0.2), 1.0, true)
		canvas.draw_string(font, pos + Vector2(-20, 5), str(i + 1), HORIZONTAL_ALIGNMENT_CENTER, 40, 13, PALETTE.ink)


func _draw_towers() -> void:
	for tower: Dictionary in sim.towers:
		var pos: Vector2 = sim.slots[tower.slot]
		var color: Color = Color(String(tower.def.color))
		var disabled: bool = float(tower.get("disabled_timer", 0.0)) > 0.0
		canvas.draw_circle(pos, 16.0, PALETTE.slate)
		canvas.draw_circle(pos, 13.0, Color(color, 0.45) if disabled else color)
		canvas.draw_arc(pos, 13.0, 0, TAU, 28, PALETTE.ink, 1.5, true)
		if disabled:
			canvas.draw_arc(pos, 19.0, 0, TAU, 32, PALETTE.rust, 2.5, true)
			canvas.draw_string(font, pos + Vector2(-6, 6), "!", HORIZONTAL_ALIGNMENT_CENTER, 12, 16, PALETTE.rust)
		if String(tower.def.kind) == "supply":
			canvas.draw_rect(Rect2(pos - Vector2(6, 6), Vector2(12, 12)), PALETTE.ink, false, 2.0)
		else:
			var angle := -PI / 2.0
			var target: Variant = _nearest_enemy(pos)
			if target != null:
				angle = (sim._enemy_pos(target) - pos).angle()
			canvas.draw_line(pos, pos + Vector2(cos(angle), sin(angle)) * 22.0, PALETTE.ink, 5.0)
			canvas.draw_line(pos, pos + Vector2(cos(angle), sin(angle)) * 18.0, PALETTE.amber, 2.0)
		for level: int in range(int(tower.level)):
			canvas.draw_circle(pos + Vector2(-8 + level * 8, -22), 2.6, PALETTE.amber)


func _draw_enemies() -> void:
	for enemy: Dictionary in sim.enemies:
		var pos: Vector2 = sim._enemy_pos(enemy)
		var radius: float = float(enemy.def.radius)
		var color: Color = Color(String(enemy.def.color))
		canvas.draw_colored_polygon(_shape_points(String(enemy.def.shape), pos, radius), color)
		canvas.draw_polyline(_closed(_shape_points(String(enemy.def.shape), pos, radius)), PALETTE.ink, 1.2, true)
		var hp_ratio: float = clamp(float(enemy.hp) / max(1.0, float(enemy.max_hp)), 0.0, 1.0)
		canvas.draw_rect(Rect2(pos + Vector2(-12, -radius - 10), Vector2(24, 3)), Color(PALETTE.ink, 0.35))
		canvas.draw_rect(Rect2(pos + Vector2(-12, -radius - 10), Vector2(24 * hp_ratio, 3)), PALETTE.orange)
		if float(enemy.slow_timer) > 0.0:
			canvas.draw_arc(pos, radius + 5, 0, TAU, 20, Color(PALETTE.teal, 0.8), 1.5, true)


func _draw_beams() -> void:
	for beam: Dictionary in beams:
		var alpha: float = float(beam.life) / max(0.001, float(beam.max_life))
		if String(beam.kind) == "aoe":
			canvas.draw_circle(beam.to, 10.0 + (1.0 - alpha) * 18.0, Color(PALETTE.amber, alpha * 0.25))
			canvas.draw_arc(beam.to, 10.0 + (1.0 - alpha) * 18.0, 0, TAU, 24, Color(PALETTE.amber, alpha), 2.0, true)
		else:
			canvas.draw_line(beam.from, beam.to, Color(PALETTE.orange, alpha * 0.9), 2.5)
			canvas.draw_circle(beam.to, 3.5, Color(PALETTE.amber, alpha))


func _draw_toast() -> void:
	if toast_timer <= 0.0 or toast_text.is_empty():
		return
	var alpha: float = clamp(toast_timer, 0.0, 1.0)
	var rect := Rect2(Vector2(VIEW_SIZE.x * 0.5 - 190, TOP_BAR_H + 14), Vector2(380, 38))
	canvas.draw_rect(rect, Color(PALETTE.slate, 0.88 * alpha))
	canvas.draw_rect(rect, Color(PALETTE.amber, 0.7 * alpha), false, 1.5)
	canvas.draw_string(font, rect.position + Vector2(0, 25), toast_text, HORIZONTAL_ALIGNMENT_CENTER, rect.size.x, 16, Color(PALETTE.cream, alpha))


func _draw_center_text(text: String, size: int, color: Color, y: float) -> void:
	canvas.draw_string(font, Vector2(0, VIEW_SIZE.y * 0.5 + y), text, HORIZONTAL_ALIGNMENT_CENTER, VIEW_SIZE.x, size, color)


func _nearest_enemy(pos: Vector2) -> Variant:
	var best: Variant = null
	var best_dist := INF
	for enemy: Dictionary in sim.enemies:
		var d: float = pos.distance_to(sim._enemy_pos(enemy))
		if d < best_dist:
			best_dist = d
			best = enemy
	return best


func _shape_points(shape: String, pos: Vector2, radius: float) -> PackedVector2Array:
	match shape:
		"triangle":
			return PackedVector2Array([
				pos + Vector2(0, -radius),
				pos + Vector2(radius * 0.87, radius * 0.55),
				pos + Vector2(-radius * 0.87, radius * 0.55),
			])
		"diamond":
			return PackedVector2Array([
				pos + Vector2(0, -radius),
				pos + Vector2(radius, 0),
				pos + Vector2(0, radius),
				pos + Vector2(-radius, 0),
			])
		"square":
			return PackedVector2Array([
				pos + Vector2(-radius, -radius),
				pos + Vector2(radius, -radius),
				pos + Vector2(radius, radius),
				pos + Vector2(-radius, radius),
			])
		"hexagon":
			var points := PackedVector2Array()
			for i: int in range(6):
				var angle: float = -PI / 2.0 + i * TAU / 6.0
				points.append(pos + Vector2(cos(angle), sin(angle)) * radius)
			return points
	return PackedVector2Array([pos + Vector2(0, -radius), pos + Vector2(radius, radius), pos + Vector2(-radius, radius)])


func _closed(points: PackedVector2Array) -> PackedVector2Array:
	var result := PackedVector2Array(points)
	if not result.is_empty():
		result.append(result[0])
	return result
