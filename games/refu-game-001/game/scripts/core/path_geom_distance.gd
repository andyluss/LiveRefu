extends RefCounted
class_name PathGeomDistance
## PathGeomDistance —— 点到路径的距离与投影（静态）。
## 用途：判断塔位是否紧邻路径（敌人能不能打到它）、把路径单位卡吸附到路径上。

static func distance_to_point(g: PathGeom, p: Vector2) -> float:
	return sqrt(distance_squared_to_point(g, p))


static func distance_squared_to_point(g: PathGeom, p: Vector2) -> float:
	var best := INF
	for i in range(g.points.size() - 1):
		best = minf(best, _dist_sq_to_segment(p, g.points[i], g.points[i + 1]))
	return best if best < INF else 0.0


## 最近距离，以及最近点在路径上的里程（"沿路径"坐标）。
static func project(g: PathGeom, p: Vector2) -> Dictionary:
	var best := INF
	var best_d := 0.0
	for i in range(g.points.size() - 1):
		var a := g.points[i]
		var ab := g.points[i + 1] - a
		var len_sq := ab.length_squared()
		var t := 0.0 if len_sq <= 0.0 else clampf((p - a).dot(ab) / len_sq, 0.0, 1.0)
		var closest := a + ab * t
		var dist := p.distance_to(closest)
		if dist < best:
			best = dist
			best_d = g.cumulative[i] + ab.length() * t
	return {"distance": best, "along": best_d}


static func _dist_sq_to_segment(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var len_sq := ab.length_squared()
	if len_sq <= 0.0:
		return p.distance_squared_to(a)
	var t := clampf((p - a).dot(ab) / len_sq, 0.0, 1.0)
	return p.distance_squared_to(a + ab * t)
