extends RefCounted
class_name AutoSlots
## AutoSlots —— 自动玩家的塔位排序（静态）。
## 排序结果按（地图, 槽位类型, 名义射程）缓存：塔位是静态的，没必要每 tick 重算。

## 排序结果缓存：塔位是静态的，没必要每 tick 重算（每帧 200 次采样 × 8 塔位很快就拖慢模拟）
static var _slot_cache: Dictionary = {}


## 塔位排序：按"射程内覆盖的路径长度"降序（覆盖越长越先占）。
static func coverage_sorted(battle: Battle, map_data: Dictionary, slot_type: String,
		nominal_range: float) -> Array:
	var cache_key := "%s|%s|%.0f" % [map_data.get("id", ""), slot_type, nominal_range]
	if _slot_cache.has(cache_key):
		return _slot_cache[cache_key]
	var slots: Array = ((map_data.get("slots", {}) as Dictionary).get(slot_type, []) as Array).duplicate()
	var path: PathGeom = battle.paths[0]
	var scored: Array = []
	for s in slots:
		scored.append({"slot": s, "cover": coverage(path, Vector2(s[0], s[1]), nominal_range)})
	scored.sort_custom(func(a, b): return float(a["cover"]) > float(b["cover"]))
	var out: Array = []
	for item in scored:
		out.append(item["slot"])
	_slot_cache[cache_key] = out
	return out

## 塔位排序（沿路径里程升序）：需要"从入口铺到基地"的确定性顺序时用。
static func along_sorted(battle: Battle, map_data: Dictionary, slot_type: String) -> Array:
	var cache_key := "along|%s|%s" % [map_data.get("id", ""), slot_type]
	if _slot_cache.has(cache_key):
		return _slot_cache[cache_key]
	var slots: Array = ((map_data.get("slots", {}) as Dictionary).get(slot_type, []) as Array).duplicate()
	var path: PathGeom = battle.paths[0]
	slots.sort_custom(func(a, b):
		var pa: float = path.project(Vector2(a[0], a[1]))["along"]
		var pb: float = path.project(Vector2(b[0], b[1]))["along"]
		return pa < pb)
	_slot_cache[cache_key] = slots
	return slots


static func coverage(path: PathGeom, center: Vector2, radius: float) -> float:
	var covered := 0.0
	var steps := 200
	var step_len := path.total_length / float(steps)
	for i in steps:
		if path.point_at(step_len * (float(i) + 0.5)).distance_to(center) <= radius:
			covered += step_len
	return covered
