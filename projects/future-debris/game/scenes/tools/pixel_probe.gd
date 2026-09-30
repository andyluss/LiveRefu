extends RefCounted
class_name PixelProbe
## 从渲染结果里取"窗口底色"：**四角取多数**。
##
## 为什么不是固定一点：内容可能铺满某个角（卡牌库就是一屏卡面），
## 只采样一个点会把"内容"误判成"底色不符"（实测踩过）。

const MARGIN := 4

static func dominant_corner(image: Image) -> Color:
	var w := image.get_width()
	var h := image.get_height()
	var points: Array[Vector2i] = [
		Vector2i(MARGIN, MARGIN), Vector2i(w - 1 - MARGIN, MARGIN),
		Vector2i(MARGIN, h - 1 - MARGIN), Vector2i(w - 1 - MARGIN, h - 1 - MARGIN),
	]
	var counts := {}
	var best_point: Vector2i = points[0]
	var best_count := 0
	for point in points:
		var key := image.get_pixelv(point).to_html(false)
		counts[key] = int(counts.get(key, 0)) + 1
		if int(counts[key]) > best_count:
			best_count = int(counts[key])
			best_point = point
	return image.get_pixelv(best_point)
