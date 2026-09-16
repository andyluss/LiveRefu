extends RefCounted
class_name BattleStatsSources
## BattleStatsSources —— 属性修正的**来源采集（一）**：卡基础值之外的"塔自身"三种来源。
## 累计的是**百分比**（口径 final = base × (1 + Σ百分比)）；穿透是唯一的平坦值。

static func collect(bt: BattleState, tw: TowerUnit) -> Dictionary:
	var pct: Dictionary = {}
	from_modifiers(tw, pct)
	var pierce := from_hook_stacks(tw, pct)
	from_buffs(bt, tw, pct)
	BattleStatsAura.collect(bt, tw, pct)
	return {"pct": pct, "pierce": pierce}


## 修饰卡（挂在塔上；同名多张按 max_stacks 折算，且只结算一次）。
static func from_modifiers(tw: TowerUnit, pct: Dictionary) -> void:
	var counts: Dictionary = {}
	for m in tw.modifiers:
		counts[m["card_id"]] = int(counts.get(m["card_id"], 0)) + 1
	var seen: Dictionary = {}
	for m in tw.modifiers:
		var cid := String(m["card_id"])
		if seen.has(cid):
			continue
		seen[cid] = true
		var n := int(counts[cid])
		for eff in ((m["def"] as Dictionary).get("hooks", {}) as Dictionary).get("passive", []):
			if String(eff.get("op", "")) != "stat_buff":
				continue
			var max_stacks := int(eff.get("max_stacks", 0))
			if max_stacks > 0:
				n = mini(n, max_stacks)
			_add(pct, String(eff["stat"]), float(eff["value"]) * n)


## 钩子永久叠层（on_hit / on_kill 累计）；穿透单独返回平坦值。
static func from_hook_stacks(tw: TowerUnit, pct: Dictionary) -> float:
	var pierce := float(tw.base.get("pierce", 0.0))
	for stat in tw.hook_stacks.keys():
		if stat == "pierce":
			pierce += float(tw.hook_stacks[stat])
		else:
			_add(pct, String(stat), float(tw.hook_stacks[stat]))
	return pierce


## 塔自身挂着的限时 / 永久增益。
static func from_buffs(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	for b in tw.buffs:
		var until: float = b["until"]
		if until >= 0.0 and bt.t > until:
			continue
		_add(pct, String(b["stat"]), float(b["value"]))


static func _add(pct: Dictionary, stat: String, value: float) -> void:
	pct[stat] = float(pct.get(stat, 0.0)) + value
