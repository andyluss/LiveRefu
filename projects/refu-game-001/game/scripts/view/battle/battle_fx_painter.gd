extends RefCounted
class_name BattleFxPainter
## BattleFxPainter —— 弹道与伤害场的绘制。
##
## 对应 BattleView 原来的 _draw_projectiles()。
## 弹道分两种：beam ＝ 直线光束；其余 ＝ 拖尾圆点 + 弹头圆。

static func draw_projectiles(ctx: BattlePaintCtx) -> void:
	for p in ctx.battle.projectiles:
		if not p.alive:
			continue
		if p.kind == "beam":
			var a := ctx.to_screen(p.pos)
			var b := ctx.to_screen(p.target_pos)
			ctx.canvas.draw_line(a, b, Color(0.31, 0.66, 0.85, 0.85), 4.0, true)
			ctx.canvas.draw_line(a, b, Color(1, 1, 1, 0.55), 1.5, true)
		else:
			var sp := ctx.to_screen(p.pos)
			for i in p.trail.size():
				var t := ctx.to_screen(p.trail[i])
				ctx.canvas.draw_circle(t, 1.5 + float(i) * 0.6,
					Color(p.color.r, p.color.g, p.color.b, 0.15 + 0.08 * float(i)))
			ctx.canvas.draw_circle(sp, 4.0 * ctx.fit_scale, p.color)
	_draw_fields(ctx)


## 伤害场（腐蚀地等）：只画敌方伤害场，淡淡的绿圈
static func _draw_fields(ctx: BattlePaintCtx) -> void:
	for f in ctx.battle.fields:
		if String(f["kind"]) != "enemy_damage":
			continue
		ctx.canvas.draw_circle(ctx.to_screen(f["pos"]), float(f["radius"]) * ctx.fit_scale,
			Color(0.42, 0.61, 0.18, 0.13))
