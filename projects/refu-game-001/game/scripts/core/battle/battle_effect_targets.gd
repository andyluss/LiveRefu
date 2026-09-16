extends RefCounted
class_name BattleEffectTargets
## BattleEffectTargets —— 效果的"作用对象"解析与百分比增益落地。

## 解析 eff.target：self / host_tower / selected_tower / lowest_tower / all_towers /
## towers_in_range / tag_self / towers_with_tag:X。
static func resolve(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit,
		target_tw: TowerUnit) -> Array:
	var target := String(eff.get("target", "self"))
	match target:
		"self", "host_tower":
			return [tw] if tw != null else []
		"selected_tower":
			return [target_tw] if target_tw != null else []
		"lowest_tower":
			var best := _lowest(bt)
			return [best] if best != null else []
		"all_towers":
			return _alive_towers(bt)
		"towers_in_range":
			return _in_range(bt, tw, float(eff.get("radius", 2.0)) * bt.range_unit)
	return _matching(bt, target, ctx.get("card", {}))


static func _alive_towers(bt: BattleState) -> Array:
	var out: Array = []
	for tw in bt.towers:
		if tw.alive:
			out.append(tw)
	return out


static func _lowest(bt: BattleState) -> TowerUnit:
	var best: TowerUnit = null
	for tw in bt.towers:
		if not tw.alive or tw.max_hp <= 0.0:
			continue
		if best == null or tw.hp_ratio() < best.hp_ratio():
			best = tw
	return best


static func _in_range(bt: BattleState, tw: TowerUnit, radius: float) -> Array:
	var out: Array = []
	if tw == null:
		return out
	for other in bt.towers:
		if other.alive and tw.pos.distance_to(other.pos) <= radius:
			out.append(other)
	return out


static func _matching(bt: BattleState, scope: String, source_card: Dictionary) -> Array:
	var out: Array = []
	for tw in bt.towers:
		if tw.alive and BattleScope.matches_scope(tw, scope, source_card):
			out.append(tw)
	return out
