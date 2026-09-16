extends Node
class_name PathGeom
## PathGeom —— 敌方行进路径的几何工具。
##
## 坐标一律用**地图卡原始像素**（980×660 画布，1 格 = 90px，见 balance.json board 段）。
## 路径来自 maps.json 的 paths（折线，单/双入口图有多条）；环形图（MAP-AST-01）用 ring 椭圆
## 采样成折线，让引擎只处理一种表示。

const RING_SAMPLES := 96

var points: PackedVector2Array = PackedVector2Array()
var cumulative: PackedFloat32Array = PackedFloat32Array()
var total_length: float = 0.0


static func from_points(pts: Array) -> PathGeom:
	var g := PathGeom.new()
	var pv := PackedVector2Array()
	for p in pts:
		pv.append(Vector2(p[0], p[1]))
	g.set_points(pv)
	return g


## 由一条地图卡的路径定义建几何：优先取折线，其次取环形椭圆。
static func from_map_path(map_data: Dictionary, path_index: int) -> PathGeom:
	var paths: Array = map_data.get("paths", [])
	if path_index < paths.size():
		return from_points(paths[path_index])
	var ring: Dictionary = map_data.get("ring", {})
	if not ring.is_empty():
		var c := Vector2(ring["cx"], ring["cy"])
		var rx: float = ring["rx"]
		var ry: float = ring["ry"]
		var pts: Array = []
		for i in RING_SAMPLES:
			var a := TAU * float(i) / float(RING_SAMPLES)
			pts.append([c.x + rx * cos(a), c.y + ry * sin(a)])
		pts.append(pts[0])
		return from_points(pts)
	push_error("地图 %s 既没有折线路径也没有环形路径" % map_data.get("id", "?"))
	return PathGeom.new()


func set_points(pv: PackedVector2Array) -> void:
	points = pv
	cumulative = PackedFloat32Array()
	cumulative.append(0.0)
	var acc := 0.0
	for i in range(1, points.size()):
		acc += points[i - 1].distance_to(points[i])
		cumulative.append(acc)
	total_length = acc


## 沿路径走 d 像素后的位置（d 会被夹在 [0, total_length]）。
func point_at(d: float) -> Vector2:
	if points.size() < 2:
		return Vector2.ZERO
	d = clampf(d, 0.0, total_length)
	var i := _segment_index(d)
	var seg_len: float = cumulative[i + 1] - cumulative[i]
	var t: float = 0.0 if seg_len <= 0.0 else (d - cumulative[i]) / seg_len
	return points[i].lerp(points[i + 1], t)


## 该点的行进方向（单位向量）。
func tangent_at(d: float) -> Vector2:
	if points.size() < 2:
		return Vector2.RIGHT
	d = clampf(d, 0.0, total_length)
	var i := _segment_index(d)
	return (points[i + 1] - points[i]).normalized()


## 点到路径的最近距离（用于判断塔是否紧邻路径、能否被敌人攻击）。
func distance_to_point(p: Vector2) -> float:
	return sqrt(distance_squared_to_point(p))


func distance_squared_to_point(p: Vector2) -> float:
	var best := INF
	for i in range(points.size() - 1):
		best = minf(best, _dist_sq_to_segment(p, points[i], points[i + 1]))
	return best if best < INF else 0.0


## 点到路径的最近距离，以及在对齐到最近点时的"沿路径里程"。
func project(p: Vector2) -> Dictionary:
	var best := INF
	var best_d := 0.0
	for i in range(points.size() - 1):
		var a := points[i]
		var b := points[i + 1]
		var ab := b - a
		var len_sq := ab.length_squared()
		var t := 0.0 if len_sq <= 0.0 else clampf((p - a).dot(ab) / len_sq, 0.0, 1.0)
		var closest := a + ab * t
		var dist := p.distance_to(closest)
		if dist < best:
			best = dist
			best_d = cumulative[i] + ab.length() * t
	return {"distance": best, "along": best_d}


## 给定里程处，路径上距离最接近该里程的塔位/位置——用于把"路径单位卡"放到路径上。
func nearest_point(p: Vector2) -> Vector2:
	return point_at(project(p)["along"])


func _segment_index(d: float) -> int:
	var lo := 0
	var hi := cumulative.size() - 2
	while lo < hi:
		var mid := (lo + hi + 1) / 2
		if cumulative[mid] <= d:
			lo = mid
		else:
			hi = mid - 1
	return clampi(lo, 0, points.size() - 2)


func _dist_sq_to_segment(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var len_sq := ab.length_squared()
	if len_sq <= 0.0:
		return p.distance_squared_to(a)
	var t := clampf((p - a).dot(ab) / len_sq, 0.0, 1.0)
	return p.distance_squared_to(a + ab * t)
