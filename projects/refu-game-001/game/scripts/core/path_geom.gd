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



## 以下方法转发给 PathGeomMath：对外名字与签名保持不变（表现层与工具都在用）。
func point_at(d: float) -> Vector2:
	return PathGeomMath.point_at(self, d)


func tangent_at(d: float) -> Vector2:
	return PathGeomMath.tangent_at(self, d)


func distance_to_point(p: Vector2) -> float:
	return PathGeomDistance.distance_to_point(self, p)


func project(p: Vector2) -> Dictionary:
	return PathGeomDistance.project(self, p)


func nearest_point(p: Vector2) -> Vector2:
	return PathGeomMath.nearest_point(self, p)
