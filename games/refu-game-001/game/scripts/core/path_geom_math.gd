extends RefCounted
class_name PathGeomMath
## PathGeomMath —— 路径上的取点与切线（静态；路径状态在 PathGeom 上）。

## 沿路径走 d 像素后的位置（d 夹在 [0, total_length]）。
static func point_at(g: PathGeom, d: float) -> Vector2:
	if g.points.size() < 2:
		return Vector2.ZERO
	d = clampf(d, 0.0, g.total_length)
	var i := segment_index(g, d)
	var seg_len: float = g.cumulative[i + 1] - g.cumulative[i]
	var t: float = 0.0 if seg_len <= 0.0 else (d - g.cumulative[i]) / seg_len
	return g.points[i].lerp(g.points[i + 1], t)


## 该点的行进方向（单位向量）。
static func tangent_at(g: PathGeom, d: float) -> Vector2:
	if g.points.size() < 2:
		return Vector2.RIGHT
	var i := segment_index(g, clampf(d, 0.0, g.total_length))
	return (g.points[i + 1] - g.points[i]).normalized()


## 给定里程处最近的实际路径点。
static func nearest_point(g: PathGeom, p: Vector2) -> Vector2:
	return point_at(g, float(PathGeomDistance.project(g, p)["along"]))


## 二分找到里程 d 落在第几段折线上。
static func segment_index(g: PathGeom, d: float) -> int:
	var lo := 0
	var hi := g.cumulative.size() - 2
	while lo < hi:
		var mid := (lo + hi + 1) / 2
		if g.cumulative[mid] <= d:
			lo = mid
		else:
			hi = mid - 1
	return clampi(lo, 0, g.points.size() - 2)
