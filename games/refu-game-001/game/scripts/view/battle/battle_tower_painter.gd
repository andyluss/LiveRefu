extends RefCounted
class_name BattleTowerPainter
## BattleTowerPainter —— 已放置塔的绘制：射程圈 / 造型 / 血条护盾 / 炮管 / 修饰角标 / 选中环。
##
## 对应 BattleView 原来的 _draw_towers()。
## 造型规则：支援单位＝菱形；工事塔＝路障条；攻击塔＝炮座（八角底）＋炮管。

static func draw_towers(ctx: BattlePaintCtx) -> void:
	for tw in ctx.battle.towers:
		if not tw.alive:
			continue
		var p := ctx.to_screen(tw.pos)
		var r := 20.0 * ctx.fit_scale
		var faction: Color = UiKit.FACTION_COLORS.get(tw.faction, UiKit.BLUE)
		var flash := tw.hit_flash_until > ctx.battle.t and fmod(ctx.time, 0.16) < 0.08

		# 射程（选中或全部显示时）
		if ctx.show_all_ranges or tw.uid == ctx.selected_tower_uid:
			var rr := float(tw.stats.get("range", 0.0)) * ctx.battle.range_unit * ctx.fit_scale
			if rr > 0.0:
				ctx.canvas.draw_circle(p, rr, Color(faction.r, faction.g, faction.b, 0.07))
				ctx.canvas.draw_arc(p, rr, 0.0, TAU, 48, Color(faction.r, faction.g, faction.b, 0.35),
					1.5, true)

		_draw_body(ctx, tw, p, r, faction)
		# 血条 / 护盾
		if tw.max_hp > 0.0:
			DrawShapes.hp_bar(ctx.canvas, p + Vector2(-r, r + 4.0), r * 2, tw.hp_ratio(), UiKit.GREEN)
		if tw.shield > 0.0:
			ctx.canvas.draw_arc(p, r + 4.0 * ctx.fit_scale, 0.0, TAU, 28,
				Color(0.37, 0.89, 0.84, 0.85), 2.5, true)
		_draw_barrel(ctx, tw, p, r, flash)
		# 修饰计数与叠层角标
		if tw.modifiers.size() > 0:
			ctx.canvas.draw_circle(p + Vector2(r * 0.9, -r * 0.9), 7.0 * ctx.fit_scale, Color("#B26BFF"))
			ctx.canvas.draw_string(ctx.font, p + Vector2(r * 0.9 - 4, -r * 0.9 + 4),
				str(tw.modifiers.size()), HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color.WHITE)
		if tw.uid == ctx.selected_tower_uid:
			ctx.canvas.draw_arc(p, r + 8.0, 0.0, TAU, 32, UiKit.AMBER, 2.5, true)


## 塔身造型（不含血条/炮管）
static func _draw_body(ctx: BattlePaintCtx, tw: TowerUnit, p: Vector2, r: float,
		faction: Color) -> void:
	if tw.slot_type == "support":
		DrawShapes.diamond(ctx.canvas, p, r, Color(faction.r, faction.g, faction.b, 0.95))
		ctx.canvas.draw_circle(p, r * 0.3, Color(0.15, 0.18, 0.22, 0.95))
	elif not tw.is_attacker():
		var bar := Rect2(p - Vector2(r * 1.15, r * 0.7), Vector2(r * 2.3, r * 1.4))
		ctx.canvas.draw_rect(bar, Color(faction.r, faction.g, faction.b, 0.95))
		ctx.canvas.draw_rect(bar, Color("#B08D4F"), false, 2.0)
		for k in 3:
			var x := bar.position.x + bar.size.x * (0.25 + 0.25 * float(k))
			ctx.canvas.draw_line(Vector2(x, bar.position.y),
				Vector2(x - r * 0.35, bar.position.y + bar.size.y), Color(0.09, 0.12, 0.16, 0.85), 2.0)
	else:
		# 炮座：八角底 + 内芯
		DrawShapes.regular_polygon(ctx.canvas, p, r, 8, Color(faction.r, faction.g, faction.b, 0.95))
		ctx.canvas.draw_circle(p, r * 0.38, Color(0.09, 0.12, 0.16, 0.9))
		ctx.canvas.draw_circle(p, r * 0.22, Color(0.31, 0.66, 0.85, 1.0))


## 炮口指向当前目标（开火闪白时用琥珀色）
static func _draw_barrel(ctx: BattlePaintCtx, tw: TowerUnit, p: Vector2, r: float,
		flash: bool) -> void:
	var target := ctx.battle._enemy_by_uid(tw.target_uid)
	if target == null and ctx.battle.enemies.size() > 0:
		target = ctx.battle._acquire_target(tw)
	if target != null and tw.is_attacker():
		var tp := ctx.to_screen(ctx.battle.enemy_pos(target))
		var dir := (tp - p).normalized()
		var barrel_col := UiKit.AMBER if flash else Color(0.86, 0.92, 0.98, 0.95)
		var tip := p + dir * (r * 1.95)
		ctx.canvas.draw_line(p, tip, barrel_col, maxf(3.0, r * 0.30), true)
		ctx.canvas.draw_circle(tip, maxf(2.0, r * 0.14), barrel_col)
