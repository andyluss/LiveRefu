# LiveBay · 地图模块
# 只负责路径几何、塔位、基地；不画、不读输入、不认识塔/敌人。
class_name LiveBayMapModule
extends RefCounted

var path := PackedVector2Array()
var path_cum := PackedFloat32Array()
var path_total := 0.0
var slots: Array = []
var base_pos := Vector2.ZERO
var base_radius := 26.0


func load_map(map_data: Dictionary) -> void:
	path.clear()
	path_cum.clear()
	path_total = 0.0
	for raw: Variant in map_data.get("path", []):
		var point := Vector2(float(raw[0]), float(raw[1]))
		if not path.is_empty():
			path_total += path[path.size() - 1].distance_to(point)
		path.append(point)
		path_cum.append(path_total)
	slots.clear()
	for raw_slot: Variant in map_data.get("slots", []):
		slots.append(Vector2(float(raw_slot[0]), float(raw_slot[1])))
	var base: Dictionary = map_data.get("base", {})
	var base_raw: Variant = base.get("pos", [0, 0])
	base_pos = Vector2(float(base_raw[0]), float(base_raw[1]))
	base_radius = float(base.get("radius", 26.0))


func point_at(distance: float) -> Vector2:
	if path.is_empty():
		return Vector2.ZERO
	if distance <= 0.0:
		return path[0]
	if distance >= path_total:
		return path[path.size() - 1]
	for i in range(1, path.size()):
		if path_cum[i] >= distance:
			var segment: float = path_cum[i] - path_cum[i - 1]
			var t: float = 0.0 if segment <= 0.0 else (distance - path_cum[i - 1]) / segment
			return path[i - 1].lerp(path[i], t)
	return path[path.size() - 1]
