extends RefCounted
class_name BattleOverlayPainter
## BattleOverlayPainter —— 最上层的信息叠加：放置幽灵预览与飘字。
##
## 对应 BattleView 原来的 _draw_ghost() 与 _draw_floaters()。
## 两者都画在所有单位之上，所以单独成文件，绘制顺序由 BattleView 决定。

## 幽灵预览：落点是否可用（青＝可用 / 红＝不可用）+ 影响范围
static func draw_ghost(ctx: BattlePaintCtx) -> void:
	if ctx.ghost.is_empty():
		return
	var p := ctx.to_screen(ctx.ghost["pos"])
	var ok: bool = ctx.ghost["ok"]
	var col := UiKit.TEAL if ok else UiKit.DANGER
	var radius := float(ctx.ghost.get("radius", 0.0)) * ctx.battle.range_unit * ctx.fit_scale
	if radius > 0.0:
		ctx.canvas.draw_circle(p, radius, Color(col.r, col.g, col.b, 0.10))
		ctx.canvas.draw_arc(p, radius, 0.0, TAU, 48, Color(col.r, col.g, col.b, 0.6), 2.0, true)
	ctx.canvas.draw_circle(p, 22.0 * ctx.fit_scale, Color(col.r, col.g, col.b, 0.28))
	ctx.canvas.draw_arc(p, 22.0 * ctx.fit_scale, 0.0, TAU, 28, col, 2.5, true)


## 飘字：随 ttl 上浮并淡出
static func draw_floaters(ctx: BattlePaintCtx) -> void:
	for f in ctx.battle.floaters:
		var age := ctx.battle.t - float(f["born"])
		var t := clampf(age / float(f["ttl"]), 0.0, 1.0)
		var p := ctx.to_screen(f["pos"]) + Vector2(0, -28.0 * t - 8.0)
		var col: Color = f["color"]
		col.a = 1.0 - t
		ctx.canvas.draw_string(ctx.font, p, String(f["text"]), HORIZONTAL_ALIGNMENT_CENTER, 80, 15, col)
