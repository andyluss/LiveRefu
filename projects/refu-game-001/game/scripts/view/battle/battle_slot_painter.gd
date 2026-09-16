extends RefCounted
class_name BattleSlotPainter
## BattleSlotPainter —— 塔位（标准/支援/修饰）与拖拽高亮、路障小队。
##
## 对应 BattleView 原来的 _draw_slots() 与 _draw_blockers()。
## 塔位造型由槽位类型决定：标准＝方框、支援＝菱形、修饰＝圆。

const SLOT_ORDER := ["standard", "support", "modifier"]


## 塔位本体 + 拖拽时的高亮圈
static func draw_slots(ctx: BattlePaintCtx) -> void:
	var battle := ctx.battle
	var map_data := battle.map_data
	for slot_type in SLOT_ORDER:
		var color: Color = UiKit.SLOT_COLORS.get(slot_type, UiKit.LINE)
		for p in (map_data.get("slots", {}) as Dictionary).get(slot_type, []):
			var sp := ctx.to_screen(Vector2(p[0], p[1]))
			var occupied := battle.tower_at(Vector2(p[0], p[1]), 40.0) != null
			var s := 26.0 * ctx.fit_scale
			match slot_type:
				"standard":
					ctx.canvas.draw_rect(Rect2(sp - Vector2(s, s) * 0.5, Vector2(s, s)),
						Color(color.r, color.g, color.b, 0.55), occupied)
					ctx.canvas.draw_rect(Rect2(sp - Vector2(s, s) * 0.5, Vector2(s, s)),
						Color(0.06, 0.08, 0.10, 0.85), false, 1.5)
				"support":
					DrawShapes.diamond(ctx.canvas, sp, s * 0.62,
						Color(color.r, color.g, color.b, 0.55 if occupied else 0.35))
				"modifier":
					ctx.canvas.draw_circle(sp, s * 0.42, Color(color.r, color.g, color.b, 0.65))
					ctx.canvas.draw_arc(sp, s * 0.42, 0.0, TAU, 20, Color(1, 1, 1, 0.5), 1.0, true)
	for item in ctx.highlight_slots:
		var hp := ctx.to_screen(item["pos"])
		var ok: bool = item["ok"]
		var col := UiKit.TEAL if ok else UiKit.DANGER
		ctx.canvas.draw_arc(hp, 24.0 * ctx.fit_scale, 0.0, TAU, 28, Color(col.r, col.g, col.b, 0.9),
			3.0, true)


## 路障小队：糖果黄的方盾 + 血量 + 阻挡数
static func draw_blockers(ctx: BattlePaintCtx) -> void:
	for b in ctx.battle.blockers:
		if not b.alive:
			continue
		var p := ctx.to_screen(b.pos)
		var r := 15.0 * ctx.fit_scale
		ctx.canvas.draw_rect(Rect2(p - Vector2(r, r * 1.15), Vector2(r * 2, r * 2.3)), Color("#FFD23F"))
		ctx.canvas.draw_rect(Rect2(p - Vector2(r, r * 1.15), Vector2(r * 2, r * 2.3)), Color("#3A3F4A"),
			false, 2.0)
		DrawShapes.hp_bar(ctx.canvas, p + Vector2(-r, r * 1.3), r * 2, b.hp_ratio(), UiKit.GREEN)
		ctx.canvas.draw_string(ctx.font, p + Vector2(-13, r * 1.9), "阻挡 %d" % b.block,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color(0.09, 0.14, 0.20, 0.9))
