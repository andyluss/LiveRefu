extends RefCounted
class_name DrawShapes
## DrawShapes —— 基础形状绘制小工具（全静态）。
##
## 只负责"把某个形状画到给定 CanvasItem 上"，不读战斗状态、不持节点引用，
## 因此战场与卡面都能复用；换视觉风格时只改这里。
## 所有函数都显式接收 ci: CanvasItem，调用方把落点传进来。

## 血条：底槽（黑 55%）+ 按比例填充的前景。ratio 自动夹到 [0,1]。
static func hp_bar(ci: CanvasItem, top_left: Vector2, width: float, ratio: float,
		color: Color) -> void:
	var h := 4.0
	ci.draw_rect(Rect2(top_left, Vector2(width, h)), Color(0, 0, 0, 0.55))
	ci.draw_rect(Rect2(top_left, Vector2(width * clampf(ratio, 0.0, 1.0), h)), color)


## 指向右方的三角（入口箭头）。
static func triangle(ci: CanvasItem, p: Vector2, s: float, color: Color) -> void:
	ci.draw_colored_polygon(PackedVector2Array([
		p + Vector2(-s, 0), p + Vector2(s * 0.4, -s * 0.7), p + Vector2(s * 0.4, s * 0.7)]), color)


## 菱形（支援槽 / 支援单位）。
static func diamond(ci: CanvasItem, p: Vector2, r: float, color: Color) -> void:
	ci.draw_colored_polygon(PackedVector2Array([
		p + Vector2(0, -r), p + Vector2(r, 0), p + Vector2(0, r), p + Vector2(-r, 0)]), color)


## 正多边形（sides 边，第一个顶点朝正上方）。
static func regular_polygon(ci: CanvasItem, center: Vector2, r: float, sides: int,
		color: Color) -> void:
	var pts := PackedVector2Array()
	for i in sides:
		var a := TAU * float(i) / float(sides) - PI * 0.5
		pts.append(center + Vector2(cos(a), sin(a)) * r)
	ci.draw_colored_polygon(pts, color)
