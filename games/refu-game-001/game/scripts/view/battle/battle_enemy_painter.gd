extends RefCounted
class_name BattleEnemyPainter
## BattleEnemyPainter —— 敌人的绘制：造型 / 飞行投影 / 血条 / 腐蚀层数角标 / 攻击环。
##
## 对应 BattleView 原来的 _draw_enemies()、_draw_enemy_body()、_enemy_color()、_hp_color()。
## 造型按敌人 id 区分（runner/armored/air/elite/boss），其余走默认圆形。

static func draw_enemies(ctx: BattlePaintCtx) -> void:
	for e in ctx.battle.enemies:
		if not e.alive:
			continue
		var p := ctx.to_screen(ctx.battle.enemy_pos(e))
		var r := 13.0 * ctx.fit_scale
		var col := _enemy_color(e)
		if e.hit_flash_until > ctx.battle.t:
			col = col.lerp(Color.WHITE, 0.6)
		# 飞行单位画投影与抬高
		if e.flying:
			ctx.canvas.draw_circle(p + Vector2(0, r * 0.9), r * 0.8, Color(0, 0, 0, 0.22))
			p += Vector2(0, -r * 0.8)
		_draw_body(ctx, e, p, r, col)
		# 血条
		DrawShapes.hp_bar(ctx.canvas, p + Vector2(-r * 1.3, -r * 2.0), r * 2.6, e.hp_ratio(),
			_hp_color(e))
		# 状态：腐蚀层数
		if e.corrosion_stacks > 0:
			ctx.canvas.draw_circle(p + Vector2(-r * 1.4, r * 1.6), 7.0 * ctx.fit_scale, Color("#6B9B2E"))
			ctx.canvas.draw_string(ctx.font, p + Vector2(-r * 1.4 - 4, r * 1.6 + 4),
				str(e.corrosion_stacks), HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)
		if e.attacking_uid != 0:
			ctx.canvas.draw_arc(p, r * 1.9, 0.0, TAU, 20, Color(1, 0.5, 0.4, 0.8), 2.0, true)


static func _draw_body(ctx: BattlePaintCtx, e: EnemyUnit, p: Vector2, r: float, col: Color) -> void:
	match e.id:
		"runner":
			ctx.canvas.draw_rect(Rect2(p - Vector2(r * 0.55, r), Vector2(r * 1.1, r * 2)), col)
		"armored":
			var sb := StyleBoxFlat.new()
			sb.bg_color = col
			sb.set_corner_radius_all(3)
			ctx.canvas.draw_style_box(sb, Rect2(p - Vector2(r * 1.25, r * 0.95), Vector2(r * 2.5, r * 1.9)))
		"air":
			ctx.canvas.draw_colored_polygon(PackedVector2Array([
				p + Vector2(0, -r), p + Vector2(r * 1.3, 0), p + Vector2(0, r),
				p + Vector2(-r * 1.3, 0)]), col)
		"elite":
			DrawShapes.regular_polygon(ctx.canvas, p, r * 1.25, 6, col)
		"boss":
			DrawShapes.regular_polygon(ctx.canvas, p, r * 2.0, 6, col)
			ctx.canvas.draw_arc(p, r * 2.0, 0.0, TAU, 32, Color(1, 0.42, 0.35, 0.9), 3.0, true)
		_:
			ctx.canvas.draw_circle(p, r, col)
	# 不透明内芯（doc 美术 002：每个单位至少有一个不透明部件作为朝向锚点）
	ctx.canvas.draw_circle(p + Vector2(0, r * 0.15), maxf(2.0, r * 0.34), Color(0.09, 0.12, 0.16, 0.9))


static func _enemy_color(e: EnemyUnit) -> Color:
	match e.id:
		"grunt": return Color("#9AA7B4")
		"runner": return Color("#7FD08A")
		"armored": return Color("#8C93A0")
		"air": return Color("#7CF9FF")
		"elite": return Color("#FFB347")
		"boss": return Color("#FF6B9D")
	return Color("#C9D4E6")


static func _hp_color(e: EnemyUnit) -> Color:
	return UiKit.GREEN if e.hp_ratio() > 0.5 else (UiKit.AMBER if e.hp_ratio() > 0.22 else UiKit.DANGER)
