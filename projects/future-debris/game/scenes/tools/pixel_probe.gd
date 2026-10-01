extends RefCounted
class_name PixelProbe
## 从渲染结果里取"窗口底色"：**沿四边扫描取众数**。
##
## 为什么不能固定采样一点（两次实测教训）：
##   1. 内容可能铺满某个角（卡牌库就是一屏卡面）→ 把"内容"误判成"底色不符"；
##   2. 出素材时会放大内容（[UiScale]），内容的**边界会移动**→ 四角采样又不够了。
## 沿四条边各扫若干点取众数，对"内容多大"免疫——底色总是在边框上露出最多。
const EDGE_STEPS := 24
## 取样点离边框的距离。**取值要够深**：紧贴边界的 1–2 像素可能是窗口装饰/圆角抗锯齿，
## 实测 y=2 那一行是 #4c4c4c，而 y=1078 是契约底色 —— 贴着边采会采到假底色。
const MARGIN := 6
## **不采顶边**：界面内容从顶部开始排，顶边最容易被内容或窗口装饰污染。
## 采样点宁可少而可信，也不要多而含噪。

static func dominant_corner(image: Image) -> Color:
	var w := image.get_width()
	var h := image.get_height()
	var points: Array[Vector2i] = []
	for i in EDGE_STEPS:
		var t := float(i) / float(EDGE_STEPS - 1)
		var x := int(t * float(w - 1))
		var y := int(t * float(h - 1))
		points.append(Vector2i(x, h - 1 - MARGIN))
		points.append(Vector2i(MARGIN, y))
		points.append(Vector2i(w - 1 - MARGIN, y))
	return _mode_of(image, points)

## 出现次数最多的颜色（并列时取更暗的：底色总是最暗的那一类）。
static func _mode_of(image: Image, points: Array[Vector2i]) -> Color:
	var counts := {}
	var colors := {}
	for point in points:
		var color := image.get_pixelv(point)
		var key := color.to_html(false)
		counts[key] = int(counts.get(key, 0)) + 1
		colors[key] = color
	var best_key := ""
	var best_count := -1
	for key in counts:
		var count := int(counts[key])
		var better := count > best_count
		if count == best_count:
			better = (colors[key] as Color).get_luminance() < (colors[best_key] as Color).get_luminance()
		if better:
			best_count = count
			best_key = key
	return colors[best_key] if best_key != "" else image.get_pixelv(points[0])
