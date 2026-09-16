extends Node2D
class_name BattleView
## BattleView —— 战场表现层（只有画，不算）。
##
## 数据全部从 Battle 读取；本类不修改任何战斗状态——保证"画面"与"结算"分离。
## 坐标换算：地图卡原始像素（980×660）→ 本节点的本地像素，按 fit_scale 等比缩放。

var battle: Battle = null
var map_texture: Texture2D = null

var fit_scale: float = 1.0
var board_offset: Vector2 = Vector2.ZERO
var board_size: Vector2 = Vector2(980, 660)

# 交互高亮
var highlight_slots: Array = []          # [{pos:Vector2, type:String, ok:bool}]
var ghost: Dictionary = {}               # {pos, radius, kind, ok, card}
var selected_tower_uid: int = 0
var show_all_ranges: bool = false

var _font: Font
var _time: float = 0.0


func _ready() -> void:
	_font = UiFont.get_font()
	set_process(true)


func setup(battle_instance: Battle) -> void:
	battle = battle_instance
	if battle == null:
		return
	var canvas: Dictionary = battle.map_data.get("canvas", {})
	board_size = Vector2(canvas.get("width", 980), canvas.get("height", 660))
	var path: String = String(battle.map_data.get("image", ""))
	if path != "" and ResourceLoader.exists(path):
		map_texture = load(path)


func configure(available: Vector2, top_left: Vector2) -> void:
	if board_size.x <= 0.0 or board_size.y <= 0.0:
		return
	fit_scale = minf(available.x / board_size.x, available.y / board_size.y)
	board_offset = top_left + (available - board_size * fit_scale) * 0.5


# ---------------------------------------------------------------- 坐标换算

func to_screen(world: Vector2) -> Vector2:
	return board_offset + world * fit_scale


func to_world(screen: Vector2) -> Vector2:
	return (screen - board_offset) / maxf(fit_scale, 0.0001)


func _process(delta: float) -> void:
	_time += delta
	queue_redraw()


# ---------------------------------------------------------------- 绘制

func _draw() -> void:
	if battle == null:
		return
	var region := Rect2(board_offset, board_size * fit_scale)
	# 地图卡出图作底板（美术资源直接复用）
	if map_texture != null:
		draw_texture_rect(map_texture, region, false)
	else:
		draw_rect(region, Color("#f3ead6"))
	# 战场暗角，让程序绘制的单位/高亮更清楚
	draw_rect(region, Color(0.04, 0.07, 0.11, 0.18))

	_draw_paths()
	_draw_terrain()
	_draw_slots()
	_draw_blockers()
	_draw_towers()
	_draw_projectiles()
	_draw_enemies()
	_draw_ghost()
	_draw_floaters()


func _draw_paths() -> void:
	if battle.paths.is_empty():
		return
	for path in battle.paths:
		var pts := PackedVector2Array()
		var i := 0.0
		var steps := 120
		while i <= steps:
			pts.append(to_screen(path.point_at(path.total_length * i / steps)))
			i += 1.0
		if pts.size() < 2:
			continue
		draw_polyline(pts, Color(0.55, 0.45, 0.28, 0.30), 12.0 * fit_scale, true)
		draw_polyline(pts, Color(0.79, 0.66, 0.47, 0.55), 3.0 * fit_scale, true)
	# 入口与基地
	for entrance in battle.map_data.get("entrances", []):
		var p := to_screen(Vector2(entrance["x"], entrance["y"]))
		_draw_triangle(p, 10.0 * fit_scale, UiKit.DANGER)
	var base: Dictionary = battle.map_data.get("base", {})
	if not base.is_empty():
		var bp := to_screen(Vector2(base["x"], base["y"]))
		var s := 16.0 * fit_scale
		draw_rect(Rect2(bp - Vector2(s, s) * 0.5, Vector2(s, s)), Color("#1f2830"))
		draw_rect(Rect2(bp - Vector2(s, s) * 0.5, Vector2(s, s)), UiKit.LINE, false, 2.0 * fit_scale)


func _draw_terrain() -> void:
	for tile in battle.map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		if def.is_empty():
			continue
		var p := to_screen(Vector2(tile["x"], tile["y"]))
		var r := float(def.get("radius", 1.5)) * battle.range_unit * fit_scale
		# 地形只画一个小标记；影响范围属于"调试信息"，打开"显示射程"才画（否则整张图被大圆盖住）
		if show_all_ranges:
			draw_circle(p, r, Color(0.37, 0.89, 0.84, 0.08))
			draw_arc(p, r, 0.0, TAU, 48, Color(0.24, 0.66, 0.62, 0.6), 1.5, true)
		draw_circle(p, 16.0 * fit_scale, Color(0.37, 0.89, 0.84, 0.35))
		draw_string(_font, p + Vector2(-13, 4), String(def.get("label", "")),
			HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.09, 0.14, 0.20, 0.9))


func _draw_slots() -> void:
	var map_data := battle.map_data
	for slot_type in ["standard", "support", "modifier"]:
		var color: Color = UiKit.SLOT_COLORS.get(slot_type, UiKit.LINE)
		for p in (map_data.get("slots", {}) as Dictionary).get(slot_type, []):
			var sp := to_screen(Vector2(p[0], p[1]))
			var occupied := battle.tower_at(Vector2(p[0], p[1]), 40.0) != null
			var s := 26.0 * fit_scale
			match slot_type:
				"standard":
					draw_rect(Rect2(sp - Vector2(s, s) * 0.5, Vector2(s, s)),
						Color(color.r, color.g, color.b, 0.55), occupied)
					draw_rect(Rect2(sp - Vector2(s, s) * 0.5, Vector2(s, s)),
						Color(0.06, 0.08, 0.10, 0.85), false, 1.5)
				"support":
					_draw_diamond(sp, s * 0.62, Color(color.r, color.g, color.b, 0.55 if occupied else 0.35))
				"modifier":
					draw_circle(sp, s * 0.42, Color(color.r, color.g, color.b, 0.65))
					draw_arc(sp, s * 0.42, 0.0, TAU, 20, Color(1, 1, 1, 0.5), 1.0, true)
	# 拖拽时的高亮
	for item in highlight_slots:
		var sp := to_screen(item["pos"])
		var ok: bool = item["ok"]
		var col := UiKit.TEAL if ok else UiKit.DANGER
		draw_arc(sp, 24.0 * fit_scale, 0.0, TAU, 28, Color(col.r, col.g, col.b, 0.9), 3.0, true)


func _draw_blockers() -> void:
	for b in battle.blockers:
		if not b.alive:
			continue
		var p := to_screen(b.pos)
		var r := 15.0 * fit_scale
		# 路障小队：糖果黄的方盾
		draw_rect(Rect2(p - Vector2(r, r * 1.15), Vector2(r * 2, r * 2.3)), Color("#FFD23F"))
		draw_rect(Rect2(p - Vector2(r, r * 1.15), Vector2(r * 2, r * 2.3)), Color("#3A3F4A"), false, 2.0)
		_draw_hp_bar(p + Vector2(-r, r * 1.3), r * 2, b.hp_ratio(), UiKit.GREEN)
		draw_string(_font, p + Vector2(-13, r * 1.9), "阻挡 %d" % b.block,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(0.09, 0.14, 0.20, 0.9))


func _draw_towers() -> void:
	for tw in battle.towers:
		if not tw.alive:
			continue
		var p := to_screen(tw.pos)
		var r := 20.0 * fit_scale
		var faction: Color = UiKit.FACTION_COLORS.get(tw.faction, UiKit.BLUE)
		var flash := tw.hit_flash_until > battle.t and fmod(_time, 0.16) < 0.08

		# 射程（选中或全部显示时）
		if show_all_ranges or tw.uid == selected_tower_uid:
			var rr := float(tw.stats.get("range", 0.0)) * battle.range_unit * fit_scale
			if rr > 0.0:
				draw_circle(p, rr, Color(faction.r, faction.g, faction.b, 0.07))
				draw_arc(p, rr, 0.0, TAU, 48, Color(faction.r, faction.g, faction.b, 0.35), 1.5, true)

		# 造型：支援单位＝菱形；工事塔＝路障条；攻击塔＝炮座＋炮管
		if tw.slot_type == "support":
			_draw_diamond(p, r, Color(faction.r, faction.g, faction.b, 0.95))
			draw_circle(p, r * 0.3, Color(0.15, 0.18, 0.22, 0.95))
		elif not tw.is_attacker():
			var bar := Rect2(p - Vector2(r * 1.15, r * 0.7), Vector2(r * 2.3, r * 1.4))
			draw_rect(bar, Color(faction.r, faction.g, faction.b, 0.95))
			draw_rect(bar, Color("#B08D4F"), false, 2.0)
			for k in 3:
				var x := bar.position.x + bar.size.x * (0.25 + 0.25 * float(k))
				draw_line(Vector2(x, bar.position.y), Vector2(x - r * 0.35, bar.position.y + bar.size.y),
					Color(0.09, 0.12, 0.16, 0.85), 2.0)
		else:
			# 炮座：八角底 + 内芯
			_draw_polygon(p, r, 8, Color(faction.r, faction.g, faction.b, 0.95))
			draw_circle(p, r * 0.38, Color(0.09, 0.12, 0.16, 0.9))
			draw_circle(p, r * 0.22, Color(0.31, 0.66, 0.85, 1.0))
		# 血条 / 护盾
		if tw.max_hp > 0.0:
			_draw_hp_bar(p + Vector2(-r, r + 4.0), r * 2, tw.hp_ratio(), UiKit.GREEN)
		if tw.shield > 0.0:
			draw_arc(p, r + 4.0 * fit_scale, 0.0, TAU, 28,
				Color(0.37, 0.89, 0.84, 0.85), 2.5, true)
		# 炮口指向当前目标
		var target := battle._enemy_by_uid(tw.target_uid)
		if target == null and battle.enemies.size() > 0:
			target = battle._acquire_target(tw)
		if target != null and tw.is_attacker():
			var tp := to_screen(battle.enemy_pos(target))
			var dir := (tp - p).normalized()
			var barrel_col := UiKit.AMBER if flash else Color(0.86, 0.92, 0.98, 0.95)
			var tip := p + dir * (r * 1.95)
			draw_line(p, tip, barrel_col, maxf(3.0, r * 0.30), true)
			draw_circle(tip, maxf(2.0, r * 0.14), barrel_col)
		# 修饰计数与叠层角标
		if tw.modifiers.size() > 0:
			draw_circle(p + Vector2(r * 0.9, -r * 0.9), 7.0 * fit_scale, Color("#B26BFF"))
			draw_string(_font, p + Vector2(r * 0.9 - 4, -r * 0.9 + 4), str(tw.modifiers.size()),
				HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color.WHITE)
		if tw.uid == selected_tower_uid:
			draw_arc(p, r + 8.0, 0.0, TAU, 32, UiKit.AMBER, 2.5, true)


func _draw_enemies() -> void:
	for e in battle.enemies:
		if not e.alive:
			continue
		var p := to_screen(battle.enemy_pos(e))
		var r := 13.0 * fit_scale
		var col := _enemy_color(e)
		if e.hit_flash_until > battle.t:
			col = col.lerp(Color.WHITE, 0.6)
		# 飞行单位画投影与抬高
		if e.flying:
			draw_circle(p + Vector2(0, r * 0.9), r * 0.8, Color(0, 0, 0, 0.22))
			p += Vector2(0, -r * 0.8)
		_draw_enemy_body(e, p, r, col)
		# 血条
		_draw_hp_bar(p + Vector2(-r * 1.3, -r * 2.0), r * 2.6, e.hp_ratio(), _hp_color(e))
		# 状态：腐蚀层数 / 减速
		var badges := 0
		if e.corrosion_stacks > 0:
			draw_circle(p + Vector2(-r * 1.4, r * 1.6), 7.0 * fit_scale, Color("#6B9B2E"))
			draw_string(_font, p + Vector2(-r * 1.4 - 4, r * 1.6 + 4), str(e.corrosion_stacks),
				HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)
			badges += 1
		if e.attacking_uid != 0:
			draw_arc(p, r * 1.9, 0.0, TAU, 20, Color(1, 0.5, 0.4, 0.8), 2.0, true)


func _draw_enemy_body(e: EnemyUnit, p: Vector2, r: float, col: Color) -> void:
	match e.id:
		"runner":
			draw_rect(Rect2(p - Vector2(r * 0.55, r), Vector2(r * 1.1, r * 2)), col)
		"armored":
			var sb := StyleBoxFlat.new()
			sb.bg_color = col
			sb.set_corner_radius_all(3)
			draw_style_box(sb, Rect2(p - Vector2(r * 1.25, r * 0.95), Vector2(r * 2.5, r * 1.9)))
		"air":
			draw_colored_polygon(PackedVector2Array([
				p + Vector2(0, -r), p + Vector2(r * 1.3, 0), p + Vector2(0, r), p + Vector2(-r * 1.3, 0)]), col)
		"elite":
			_draw_polygon(p, r * 1.25, 6, col)
		"boss":
			_draw_polygon(p, r * 2.0, 6, col)
			draw_arc(p, r * 2.0, 0.0, TAU, 32, Color(1, 0.42, 0.35, 0.9), 3.0, true)
		_:
			draw_circle(p, r, col)
	# 不透明内芯（doc 美术 002：每个单位至少有一个不透明部件作为朝向锚点）
	draw_circle(p + Vector2(0, r * 0.15), maxf(2.0, r * 0.34), Color(0.09, 0.12, 0.16, 0.9))


func _enemy_color(e: EnemyUnit) -> Color:
	match e.id:
		"grunt": return Color("#9AA7B4")
		"runner": return Color("#7FD08A")
		"armored": return Color("#8C93A0")
		"air": return Color("#7CF9FF")
		"elite": return Color("#FFB347")
		"boss": return Color("#FF6B9D")
	return Color("#C9D4E6")


func _hp_color(e: EnemyUnit) -> Color:
	return UiKit.GREEN if e.hp_ratio() > 0.5 else (UiKit.AMBER if e.hp_ratio() > 0.22 else UiKit.DANGER)


func _draw_projectiles() -> void:
	for p in battle.projectiles:
		if not p.alive:
			continue
		if p.kind == "beam":
			var a := to_screen(p.pos)
			var b := to_screen(p.target_pos)
			draw_line(a, b, Color(0.31, 0.66, 0.85, 0.85), 4.0, true)
			draw_line(a, b, Color(1, 1, 1, 0.55), 1.5, true)
		else:
			var sp := to_screen(p.pos)
			for i in p.trail.size():
				var t := to_screen(p.trail[i])
				draw_circle(t, 1.5 + float(i) * 0.6, Color(p.color.r, p.color.g, p.color.b, 0.15 + 0.08 * float(i)))
			draw_circle(sp, 4.0 * fit_scale, p.color)
	# 伤害场（腐蚀地等）
	for f in battle.fields:
		if String(f["kind"]) != "enemy_damage":
			continue
		draw_circle(to_screen(f["pos"]), float(f["radius"]) * fit_scale, Color(0.42, 0.61, 0.18, 0.13))


func _draw_ghost() -> void:
	if ghost.is_empty():
		return
	var p := to_screen(ghost["pos"])
	var ok: bool = ghost["ok"]
	var col := UiKit.TEAL if ok else UiKit.DANGER
	var radius := float(ghost.get("radius", 0.0)) * battle.range_unit * fit_scale
	if radius > 0.0:
		draw_circle(p, radius, Color(col.r, col.g, col.b, 0.10))
		draw_arc(p, radius, 0.0, TAU, 48, Color(col.r, col.g, col.b, 0.6), 2.0, true)
	draw_circle(p, 22.0 * fit_scale, Color(col.r, col.g, col.b, 0.28))
	draw_arc(p, 22.0 * fit_scale, 0.0, TAU, 28, col, 2.5, true)


func _draw_floaters() -> void:
	for f in battle.floaters:
		var age := battle.t - float(f["born"])
		var t := clampf(age / float(f["ttl"]), 0.0, 1.0)
		var p := to_screen(f["pos"]) + Vector2(0, -28.0 * t - 8.0)
		var col: Color = f["color"]
		col.a = 1.0 - t
		draw_string(_font, p, String(f["text"]), HORIZONTAL_ALIGNMENT_CENTER, 80, 15, col)


# ---------------------------------------------------------------- 小工具

func _draw_hp_bar(top_left: Vector2, width: float, ratio: float, color: Color) -> void:
	var h := 4.0
	draw_rect(Rect2(top_left, Vector2(width, h)), Color(0, 0, 0, 0.55))
	draw_rect(Rect2(top_left, Vector2(width * clampf(ratio, 0.0, 1.0), h)), color)


func _draw_triangle(p: Vector2, s: float, color: Color) -> void:
	draw_colored_polygon(PackedVector2Array([
		p + Vector2(-s, 0), p + Vector2(s * 0.4, -s * 0.7), p + Vector2(s * 0.4, s * 0.7)]), color)


func _draw_diamond(p: Vector2, r: float, color: Color) -> void:
	draw_colored_polygon(PackedVector2Array([
		p + Vector2(0, -r), p + Vector2(r, 0), p + Vector2(0, r), p + Vector2(-r, 0)]), color)


func _draw_polygon(center: Vector2, r: float, sides: int, color: Color) -> void:
	var pts := PackedVector2Array()
	for i in sides:
		var a := TAU * float(i) / float(sides) - PI * 0.5
		pts.append(center + Vector2(cos(a), sin(a)) * r)
	draw_colored_polygon(pts, color)
