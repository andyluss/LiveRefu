@tool
extends Node2D

# LiveBay Tools · 内嵌预览画布
# 只读 Sim 状态；不参与编辑，不写数据。

const SimScript = preload("res://scripts/core/sim.gd")
const PAPER := Color("#E9E3D5")
const PANEL := Color("#D6CEBC")
const INK := Color("#232B2F")
const PATH_C := Color("#E0A22E")
const ORANGE := Color("#D9622B")
const AMBER := Color("#E0A22E")
const SLOT_C := Color("#D9622B")
const BASE_C := Color("#3E6F6B")
const CREAM := Color("#F5EFE2")

var sim: Variant = null
var wave_offset := 0
var beams: Array = []
var floats: Array = []


func _ready() -> void:
	set_process(true)


func set_sim(value: Variant) -> void:
	sim = value
	beams.clear()
	floats.clear()
	queue_redraw()


func add_beam(from: Vector2, to: Vector2, kind: String) -> void:
	beams.append({"from": from, "to": to, "kind": kind, "t": 0.18})


func add_float(pos: Vector2, text: String) -> void:
	floats.append({"pos": pos, "text": text, "t": 0.8})


func _process(delta: float) -> void:
	if beams.is_empty() and floats.is_empty():
		return
	for b in beams:
		b["t"] -= delta
	beams = beams.filter(func(b): return float(b.t) > 0.0)
	for f in floats:
		f["t"] -= delta
		f["pos"] += Vector2(0, -18) * delta
	floats = floats.filter(func(f): return float(f.t) > 0.0)
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, Vector2(1280, 720)), PAPER, true)
	if sim == null:
		return
	var font: Font = ThemeDB.fallback_font
	var path: Array = sim.path
	for i in range(path.size() - 1):
		draw_line(path[i], path[i + 1], PATH_C, 3.0)
	for i in range(sim.slots.size()):
		draw_rect(Rect2(sim.slots[i] - Vector2(8, 8), Vector2(16, 16)), SLOT_C, false, 2.0)
	var base_pos: Vector2 = sim.base_pos
	draw_circle(base_pos, 26.0, BASE_C, false, 2.0)

	for tower in sim.towers:
		var p: Vector2 = sim.slots[int(tower.slot)]
		draw_circle(p, 12.0, tower.def.color, true)
		draw_circle(p, 12.0, INK, false, 1.5)
		draw_arc(p, float(tower.def.get("range", 0.0)), 0, TAU, 32, Color(tower.def.color, 0.25), 1.0)

	for b in beams:
		draw_line(b.from, b.to, Color(ORANGE if b.kind == "single" else AMBER, clampf(float(b.t) / 0.18, 0.0, 1.0)), 2.0)
	for enemy in sim.enemies:
		if enemy.dead:
			continue
		var p: Vector2 = sim.point_at(float(enemy.dist))
		var color: Color = Color.from_string(str(enemy.def.get("color", "#8C4A32")), Color("#8C4A32"))
		draw_circle(p, maxf(4.0, float(enemy.def.get("radius", 8.0)) * 0.7), color)
		var ratio: float = clampf(float(enemy.hp) / maxf(1.0, float(enemy.max_hp)), 0.0, 1.0)
		draw_rect(Rect2(p + Vector2(-10, -18), Vector2(20, 3)), Color(INK, 0.25), true)
		draw_rect(Rect2(p + Vector2(-10, -18), Vector2(20 * ratio, 3)), BASE_C, true)

	for f in floats:
		draw_string(ThemeDB.fallback_font, f.pos, f.text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(CREAM, clampf(float(f.t) / 0.8, 0.0, 1.0)))

	draw_rect(Rect2(0, 0, 1280, 54), Color(INK, 0.88), true)
	draw_string(font, Vector2(18, 24), "内嵌预览 / PREVIEW", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, CREAM)
	draw_string(font, Vector2(18, 44), "供能 %d   保障度 %d   波次 %d/%d" % [int(sim.energy), int(sim.integrity), sim.wave_index + 1 + wave_offset, sim.waves.size() + wave_offset], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(CREAM, 0.82))
	if sim.state == SimScript.State.WON:
		draw_rect(Rect2(0, 0, 1280, 720), Color(0.09, 0.11, 0.12, 0.55), true)
		draw_string(font, Vector2(460, 350), "WON", HORIZONTAL_ALIGNMENT_LEFT, -1, 48, CREAM)
	elif sim.state == SimScript.State.LOST:
		draw_rect(Rect2(0, 0, 1280, 720), Color(0.55, 0.12, 0.08, 0.45), true)
		draw_string(font, Vector2(430, 350), "LOST", HORIZONTAL_ALIGNMENT_LEFT, -1, 48, CREAM)
	if not sim.result.is_empty():
		var r: Dictionary = sim.result
		draw_rect(Rect2(380, 230, 520, 250), Color(0.09, 0.11, 0.12, 0.92), true)
		draw_rect(Rect2(380, 230, 520, 250), ORANGE, false, 2)
		draw_string(font, Vector2(410, 270), "本班结算 / SHIFT REPORT", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, CREAM)
		draw_string(font, Vector2(410, 310), "评级  %s" % str(r.get("grade", "-")), HORIZONTAL_ALIGNMENT_LEFT, -1, 24, AMBER)
		draw_string(font, Vector2(410, 342), "保障度  %d / %d" % [int(r.get("integrity", 0)), int(r.get("max_integrity", 100))], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, CREAM)
		draw_string(font, Vector2(410, 368), "击杀  %d    漏过  %d" % [int(r.get("kills", 0)), int(r.get("leaked", 0))], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, CREAM)
		draw_string(font, Vector2(410, 394), "建造  %d    消耗  %d    清波  %d/%d" % [int(r.get("built", 0)), int(r.get("spent", 0)), int(r.get("waves_cleared", 0)), int(r.get("total_waves", 0))], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, CREAM)
