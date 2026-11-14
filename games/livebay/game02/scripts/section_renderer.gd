# LiveBay: Severed · 舱段渲染
# 俯视/剖面图：房间、门、故障、NPC、玩家。只读 sim，不写规则。
class_name LiveBaySectionRenderer
extends RefCounted


var font: SystemFont
var time := 0.0


func _init() -> void:
	font = SystemFont.new()
	font.font_names = PackedStringArray(["PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei"])
	font.allow_system_fallback = true


func draw(canvas: CanvasItem, sim: LiveBaySectionSim, player_pos: Vector2, context: Dictionary, show_debug := false) -> void:
	time += 0.016
	canvas.draw_rect(Rect2(Vector2.ZERO, Vector2(1280, 720)), Color("#0c1412"))
	# faint grid
	for x in range(0, 1281, 80):
		canvas.draw_line(Vector2(x, 60), Vector2(x, 650), Color(0.25, 0.35, 0.32, 0.12), 1.0)
	for y in range(80, 641, 80):
		canvas.draw_line(Vector2(0, y), Vector2(1280, y), Color(0.25, 0.35, 0.32, 0.12), 1.0)
	# doors under rooms
	for d: Dictionary in sim.doors:
		var a: Vector2 = Vector2(d.a_pos[0], d.a_pos[1])
		var b: Vector2 = Vector2(d.b_pos[0], d.b_pos[1])
		var col := Color("#3d7a50") if bool(d.open) else Color("#a96f17")
		if bool(d.sealed):
			col = Color("#a84532")
		canvas.draw_line(a, b, Color(0.1, 0.15, 0.13, 0.9), 10.0)
		canvas.draw_line(a, b, col, 3.0)
		for p in [a, b]:
			canvas.draw_circle(p, 8.0, Color("#0c1412"))
			canvas.draw_arc(p, 8.0, 0, TAU, 20, col, 2.0, true)
	# rooms
	for rid: String in sim.room_order:
		var r: Dictionary = sim.rooms[rid]
		var rect: Rect2 = Rect2(r.rect[0], r.rect[1], r.rect[2], r.rect[3])
		var col := _room_color(r)
		canvas.draw_rect(rect, Color(col.r, col.g, col.b, 0.22))
		canvas.draw_rect(rect, Color(col.r, col.g, col.b, 0.85), false, 2.0)
		# inner frame
		canvas.draw_rect(rect.grow(-5), Color(col.r, col.g, col.b, 0.25), false, 1.0)
		canvas.draw_string(font, rect.position + Vector2(12, 24), str(r.name), HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 24, 15, Color("#f5efe2"))
		var status := "O2 %d  P %d  T %d" % [int(r.o2), int(r.pressure), int(r.temp)]
		canvas.draw_string(font, rect.position + Vector2(12, 43), status, HORIZONTAL_ALIGNMENT_LEFT, rect.size.x - 24, 10, Color("#b8c1bc"))
		if r.o2 < 25:
			canvas.draw_string(font, rect.position + Vector2(12, 60), "低氧", HORIZONTAL_ALIGNMENT_LEFT, 60, 10, Color("#d5a54a"))
		if r.pressure < 25:
			canvas.draw_string(font, rect.position + Vector2(62, 60), "失压", HORIZONTAL_ALIGNMENT_LEFT, 60, 10, Color("#83c3ea"))
		if r.fire > 0:
			canvas.draw_string(font, rect.position + Vector2(112, 60), "火灾", HORIZONTAL_ALIGNMENT_LEFT, 60, 10, Color("#e27b4c"))
		# breach
		if r.get("leak", 0.0) > 0 and r.has("breach_pos"):
			var bp: Vector2 = Vector2(r.breach_pos[0], r.breach_pos[1])
			canvas.draw_circle(bp, 16 + sin(time * 4) * 3, Color(0.18, 0.52, 0.73, 0.18))
			canvas.draw_arc(bp, 13, 0, TAU, 24, Color("#83c3ea"), 2.0, true)
			canvas.draw_string(font, bp + Vector2(18, 5), "泄漏", HORIZONTAL_ALIGNMENT_LEFT, 60, 10, Color("#83c3ea"))
		# fire
		if r.fire > 0:
			for i in range(4):
				var fx := rect.position.x + 30 + i * 18
				var fy := rect.position.y + rect.size.y - 28 - sin(time * 7 + i) * 8
				canvas.draw_circle(Vector2(fx, fy), 4.0 + sin(time * 5 + i) * 1.5, Color("#e27b4c"))
			if r.has("fire_pos"):
				pass
		# console
		if r.has("console_pos"):
			var cp: Vector2 = Vector2(r.console_pos[0], r.console_pos[1])
			canvas.draw_rect(Rect2(cp - Vector2(12, 8), Vector2(24, 16)), Color("#182326"))
			canvas.draw_rect(Rect2(cp - Vector2(12, 8), Vector2(24, 16)), Color("#d5a54a"), false, 1.5)
			canvas.draw_string(font, cp + Vector2(-22, 22), _console_label(rid), HORIZONTAL_ALIGNMENT_LEFT, 60, 9, Color("#8c978f"))
	# NPC
	if not sim.npc.is_empty() and int(sim.npc.get("health", 0)) > 0:
		var np: Vector2 = Vector2(sim.npc.pos[0], sim.npc.pos[1])
		canvas.draw_circle(np, 13, Color("#7c8f6b"))
		canvas.draw_arc(np, 13, 0, TAU, 24, Color("#f5efe2"), 2.0, true)
		canvas.draw_string(font, np + Vector2(-20, -20), str(sim.npc.name), HORIZONTAL_ALIGNMENT_LEFT, 50, 10, Color("#f5efe2"))
		if bool(sim.npc.get("rescued", false)):
			canvas.draw_string(font, np + Vector2(16, 5), "已救", HORIZONTAL_ALIGNMENT_LEFT, 40, 9, Color("#3d7a50"))
	# player
	canvas.draw_circle(player_pos + Vector2(0, 14), 14, Color(0, 0, 0, 0.25))
	canvas.draw_circle(player_pos, 14, Color("#f5efe2"))
	canvas.draw_arc(player_pos, 14, 0, TAU, 28, Color("#d9622b"), 2.0, true)
	canvas.draw_circle(player_pos + Vector2(0, -4), 4, Color("#232b2f"))
	# context marker
	if not context.is_empty() and context.has("pos"):
		var p: Vector2 = context.pos
		canvas.draw_arc(p, 25 + sin(time * 4) * 2, 0, TAU, 32, Color("#e0a22e"), 2.0, true)
		canvas.draw_string(font, p + Vector2(29, 5), str(context.get("label", "")), HORIZONTAL_ALIGNMENT_LEFT, 220, 11, Color("#e0a22e"))
	# rescue marker
	if sim.player_room == "dock":
		var dock: Dictionary = sim.room("dock")
		var dp: Vector2 = Vector2(dock.console_pos[0], dock.console_pos[1])
		var col := Color("#3d7a50") if sim.rescue_open else Color("#a96f17")
		canvas.draw_arc(dp, 24, 0, TAU, 32, col, 2.0, true)
	# debug layer
	if show_debug:
		canvas.draw_string(font, Vector2(16, 680), "DEBUG room=%s elapsed=%.1f power=%s battery=%.1f" % [sim.player_room, sim.elapsed, str(sim.power_on), sim.battery], HORIZONTAL_ALIGNMENT_LEFT, 800, 10, Color("#7c8f6b"))


func _room_color(r: Dictionary) -> Color:
	if float(r.get("fire", 0.0)) > 0.0:
		return Color("#e27b4c")
	if float(r.get("pressure", 100.0)) < 25.0:
		return Color("#83c3ea")
	if float(r.get("o2", 100.0)) < 25.0:
		return Color("#d5a54a")
	return Color("#3e6f6b")


func _console_label(rid: String) -> String:
	match rid:
		"power": return "配电"
		"life": return "循环"
		"med": return "医疗"
		"dock": return "救援"
		"control": return "主控"
	return "控制"
