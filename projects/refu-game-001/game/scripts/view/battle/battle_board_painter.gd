extends RefCounted
class_name BattleBoardPainter
## BattleBoardPainter —— 战场底板：地图卡出图 / 暗角 / 路径线 / 出入口与基地 / 地形标记。
##
## 对应 BattleView 原来的 _draw 头部 + _draw_paths() + _draw_terrain()。
## 绘制顺序与原来完全一致：底板 → 暗角 → 路径 → 出入口/基地 → 地形。

## 底板：地图卡出图（美术资源直接复用）+ 战场暗角（让程序绘制的单位/高亮更清楚）
static func draw_background(ctx: BattlePaintCtx) -> void:
	var region := Rect2(ctx.board_offset, ctx.board_size * ctx.fit_scale)
	if ctx.map_texture != null:
		ctx.canvas.draw_texture_rect(ctx.map_texture, region, false)
	else:
		ctx.canvas.draw_rect(region, Color("#f3ead6"))
	ctx.canvas.draw_rect(region, Color(0.04, 0.07, 0.11, 0.18))


## 路径：把每条 PathGeom 采样成 120 段折线，再叠出入口箭头与基地方块
static func draw_paths(ctx: BattlePaintCtx) -> void:
	var battle := ctx.battle
	if battle.paths.is_empty():
		return
	for path in battle.paths:
		var pts := PackedVector2Array()
		var i := 0.0
		var steps := 120
		while i <= steps:
			pts.append(ctx.to_screen(path.point_at(path.total_length * i / steps)))
			i += 1.0
		if pts.size() < 2:
			continue
		ctx.canvas.draw_polyline(pts, Color(0.55, 0.45, 0.28, 0.30), 12.0 * ctx.fit_scale, true)
		ctx.canvas.draw_polyline(pts, Color(0.79, 0.66, 0.47, 0.55), 3.0 * ctx.fit_scale, true)
	# 入口与基地
	for entrance in battle.map_data.get("entrances", []):
		var p := ctx.to_screen(Vector2(entrance["x"], entrance["y"]))
		DrawShapes.triangle(ctx.canvas, p, 10.0 * ctx.fit_scale, UiKit.DANGER)
	var base: Dictionary = battle.map_data.get("base", {})
	if not base.is_empty():
		var bp := ctx.to_screen(Vector2(base["x"], base["y"]))
		var s := 16.0 * ctx.fit_scale
		ctx.canvas.draw_rect(Rect2(bp - Vector2(s, s) * 0.5, Vector2(s, s)), Color("#1f2830"))
		ctx.canvas.draw_rect(Rect2(bp - Vector2(s, s) * 0.5, Vector2(s, s)), UiKit.LINE, false,
			2.0 * ctx.fit_scale)


## 地形：只画一个小标记；影响范围属于"调试信息"，打开"显示射程"才画
## （否则整张图被大圆盖住）
static func draw_terrain(ctx: BattlePaintCtx) -> void:
	var battle := ctx.battle
	for tile in battle.map_data.get("terrain", []):
		var def := GameData.terrain_def(String(tile.get("id", "")))
		if def.is_empty():
			continue
		var p := ctx.to_screen(Vector2(tile["x"], tile["y"]))
		var r := float(def.get("radius", 1.5)) * battle.range_unit * ctx.fit_scale
		if ctx.show_all_ranges:
			ctx.canvas.draw_circle(p, r, Color(0.37, 0.89, 0.84, 0.08))
			ctx.canvas.draw_arc(p, r, 0.0, TAU, 48, Color(0.24, 0.66, 0.62, 0.6), 1.5, true)
		ctx.canvas.draw_circle(p, 16.0 * ctx.fit_scale, Color(0.37, 0.89, 0.84, 0.35))
		ctx.canvas.draw_string(ctx.font, p + Vector2(-13, 4), String(def.get("label", "")),
			HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.09, 0.14, 0.20, 0.9))
