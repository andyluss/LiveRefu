extends RefCounted
class_name CardMaterial
## 卡面的**材质层**：投影 / 镀铬包边 / 搪瓷面 / 视窗 / 扫描线，以及两个文字原语。
##
## 为什么单独成文件：卡面从"纯色块"升级成"一件实物"后，材质是有顺序、有层次的
## （投影 → 包边 → 面 → 视窗 → 纹理 → 内容），和"某一段怎么排版"是两回事。
## [CardView] 只负责顺序，[CardBlocks] 只负责内容排版。
##
## **颜色全部由既有 token 混合而来，没有新增颜色**——所以视觉 token 闸门不需要新增对比组合。
## 两套朝向共用同一套结构，只换混合方向：
##   light = 米白搪瓷 + 亮铬包边 + 凹陷视窗（"被印刷出来的提案板"）
##   dark  = 近黑搪瓷 + 黑铬包边 + 发光视窗（"嵌在仪表盘里的灯窗"）

const RAD := 17.0        ## 外圆角（设计像素）
const PAD := 7.0         ## 包边厚度
const BANDS := 9         ## 包边分层次数（10 层在 520px 上已看不出台阶）

## 五点渐变：t∈[0,1] 沿包边从外沿走到内沿
static func _ramp(stops: Array, t: float) -> Color:
	var n := stops.size() - 1
	var x := clampf(t, 0.0, 1.0) * float(n)
	var i := int(floor(x))
	if i >= n:
		return stops[n]
	return (stops[i] as Color).lerp(stops[i + 1] as Color, x - float(i))

## 镀铬包边某一层的颜色：走"长反射"（暖白 → 冷蓝灰 → 暖白）
static func bevel_color(tokens: TokenSet, t: float, dark: bool) -> Color:
	var hi := tokens.color("--material-hi")
	var mid := tokens.color("--material-mid")
	var lo := tokens.color("--material-shadow")
	if dark:
		# 黑铬：石墨底，两道银亮带（模拟金属在暗处的强反差）
		return _ramp([mid.darkened(0.55), hi.darkened(0.15), lo.lerp(mid, 0.5),
			hi.darkened(0.45), mid.darkened(0.62)], t)
	return _ramp([hi, mid.lerp(hi, 0.45), mid, lo.lerp(mid, 0.35), hi.lerp(mid, 0.25)], t)

## 投影 + 镀铬包边（多层圆角矩形由外向内叠；最内层之后会被揭面盖住）
static func backing(canvas: CanvasItem, rect: Rect2, s: float, tokens: TokenSet,
		dark: bool) -> void:
	for i in 3:
		var shadow := StyleBoxFlat.new()
		shadow.bg_color = Color(0, 0, 0, 0.20 - float(i) * 0.055)
		shadow.set_corner_radius_all(int(RAD * s))
		canvas.draw_style_box(shadow,
			Rect2(rect.position + Vector2(0, (7.0 + float(i) * 5.0) * s), rect.size))
	var pad := PAD * s
	for i in BANDS:
		var t := float(i) / float(BANDS - 1)
		var band := StyleBoxFlat.new()
		band.bg_color = bevel_color(tokens, t, dark)
		band.set_corner_radius_all(int(max(2.0, (RAD - float(i) * 0.8) * s)))
		canvas.draw_style_box(band, rect.grow(-float(i) * pad / float(BANDS)))

## 搪瓷面：平涂 + 顶部高光 + 底部压边（那个年代的搪瓷就是这个打光）
static func face(canvas: CanvasItem, rect: Rect2, s: float, tokens: TokenSet,
		dark: bool) -> void:
	var inner := rect.grow(-PAD * s)
	var r := int((RAD - PAD) * s)
	var base := _fill(tokens, dark)
	var box := StyleBoxFlat.new()
	box.bg_color = base
	box.set_corner_radius_all(r)
	canvas.draw_style_box(box, inner)
	# 顶部一条亮线、底部一条暗线：把"压边"讲清楚
	var top := Color(1, 1, 1, 0.55 if dark else 0.85)
	canvas.draw_line(inner.position + Vector2(r, 1 * s),
		inner.position + Vector2(inner.size.x - r, 1 * s), top, maxf(1.0, s))
	var bottom := Color(0, 0, 0, 0.35 if dark else 0.16)
	canvas.draw_line(inner.position + Vector2(r, inner.size.y - 2 * s),
		inner.position + Vector2(inner.size.x - r, inner.size.y - 2 * s), bottom, maxf(1.5, 1.5 * s))

static func _fill(tokens: TokenSet, dark: bool) -> Color:
	if dark:
		return tokens.color("--bg-elev-1")
	return tokens.color("--material-hi").lerp(tokens.color("--bg-elev-1"), 0.06)

## 视窗：浅色=凹陷（内阴影）；暗色=发光（外扩光晕）
static func window(canvas: CanvasItem, area: Rect2, s: float, tokens: TokenSet,
		dark: bool) -> void:
	var r := int(8.0 * s)
	if dark:
		# 外扩光晕：几层递减透明度的圆角矩形
		for i in 4:
			var glow := StyleBoxFlat.new()
			glow.bg_color = Color(tokens.color("--power"), 0.05 - float(i) * 0.011)
			glow.set_corner_radius_all(r + 3)
			canvas.draw_style_box(glow, area.grow((3.0 + float(i) * 3.0) * s))
	var box := StyleBoxFlat.new()
	box.bg_color = (tokens.color("--bg-base").lerp(tokens.color("--power"), 0.10) if dark
		else tokens.color("--surface-sunken"))
	box.set_corner_radius_all(r)
	canvas.draw_style_box(box, area)
	if not dark:
		# 凹陷：向内几圈逐渐加深的描边
		for i in 3:
			var rr := StyleBoxFlat.new()
			rr.bg_color = Color(0, 0, 0, 0)
			rr.set_corner_radius_all(r)
			rr.set_border_width_all(int(maxf(1.0, s)))
			rr.border_color = Color(0, 0, 0, 0.30 - float(i) * 0.09)
			canvas.draw_style_box(rr, area.grow(-float(i) * 1.5 * s))
	var edge := StyleBoxFlat.new()
	edge.bg_color = Color(0, 0, 0, 0)
	edge.set_corner_radius_all(r)
	edge.set_border_width_all(int(maxf(1.0, s)))
	edge.border_color = (Color(tokens.color("--power"), 0.45) if dark
		else tokens.color("--line-strong"))
	canvas.draw_style_box(edge, area)

## 扫描线：印刷/CRT 的质感。逐行画（一张卡约 100 行，重绘时才跑，不进每帧）
static func scanlines(canvas: CanvasItem, area: Rect2, s: float, dark: bool) -> void:
	var step := maxf(2.0, 3.0 * s)
	var color := Color(0, 0, 0, 0.16 if not dark else 0.22)
	var y := area.position.y + step
	while y < area.position.y + area.size.y - 1.0:
		canvas.draw_line(Vector2(area.position.x, y), Vector2(area.position.x + area.size.x, y),
			color, maxf(1.0, s))
		y += step
