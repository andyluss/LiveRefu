extends RefCounted
class_name DataQueries
## DataQueries —— 数据表的只读查询（静态）：按 id 取表、取卡池、槽位吸附、上限读取。
## 门面是 autoload GameData；游戏逻辑一律通过门面访问，便于将来换数据源（例如远端配置）。

static func get_card(g: GameData, id: String) -> Dictionary:
	return g.cards.get(id, {})


static func get_enemy(g: GameData, id: String) -> Dictionary:
	return g.enemies.get(id, {})


static func get_map(g: GameData, id: String) -> Dictionary:
	return g.maps.get(id, {})


static func get_rule(g: GameData, id: String) -> Dictionary:
	return g.rules.get(id, {})


static func get_wave_set(g: GameData, id: String) -> Dictionary:
	return g.wave_sets.get(id, {})


static func get_level(g: GameData, id: String) -> Dictionary:
	for level in g.levels:
		if level.get("id", "") == id:
			return level
	return {}


## 某关可用卡池：M1 = 该关 `faction` 的全部卡（含从族支援卡）。
static func pool_for_level(g: GameData, level: Dictionary) -> Array:
	var out: Array = []
	for card in g.cards.values():
		if card.get("faction", "") == level.get("faction", "ANV"):
			out.append(card)
	out.sort_custom(func(a, b): return a["id"] < b["id"])
	return out


## 地图上某点是否落在可建造槽位内（返回槽位信息；未命中返回空字典）。
static func slot_at(map_data: Dictionary, pos: Vector2, tolerance: float) -> Dictionary:
	for slot_type in ["standard", "support", "modifier"]:
		for p in (map_data.get("slots", {}) as Dictionary).get(slot_type, []):
			var center := Vector2(p[0], p[1])
			if center.distance_to(pos) <= tolerance:
				return {"type": slot_type, "pos": center}
	return {}


static func terrain_def(g: GameData, id: String) -> Dictionary:
	return g.terrain_defs.get(id, {})


## 单局最多可带挑战卡张数（13 号卡表第一节：最多 3 张）。
static func challenges_max(g: GameData) -> int:
	return int(g.challenge_rules.get("max_cards", 3))


## 难度分合计上限（数值 05 第四节：上限 15）。
static func challenge_score_cap(g: GameData) -> int:
	return int(g.challenge_rules.get("score_cap", 15))
