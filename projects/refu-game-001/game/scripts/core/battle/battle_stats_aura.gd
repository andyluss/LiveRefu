extends RefCounted
class_name BattleStatsAura
## BattleStatsSourcesAura —— 属性修正的来源采集（二）：羁绊、光环、地形、全局增益。

static func collect(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	from_bonds(bt, tw, pct)
	from_auras(bt, tw, pct)
	from_terrain(bt, tw, pct)
	from_global_buffs(bt, tw, pct)


## 羁绊（如"火力网：3 张弹药 → 全场弹药塔攻速 +10%"）。
static func from_bonds(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	for bond in bt.active_bonds:
		for eff in bond.get("effect", []):
			if String(eff.get("op", "")) != "stat_buff":
				continue
			if BattleScope.matches_scope(tw, String(eff.get("scope", "")), {}):
				_add(pct, String(eff["stat"]), float(eff["value"]))


## 光环（支援单位的 passive aura；tag_self 表示"与来源卡同标签"）。
static func from_auras(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	for src in bt.towers:
		if not src.alive or src == tw:
			continue
		for eff in ((src.card.get("hooks", {}) as Dictionary).get("passive", [])):
			if String(eff.get("op", "")) != "aura":
				continue
			if src.pos.distance_to(tw.pos) > float(eff.get("radius", 2.0)) * bt.range_unit:
				continue
			if BattleScope.matches_scope(tw, String(eff.get("scope", "")), src.card):
				_add(pct, String(eff["stat"]), float(eff["value"]))


## 地形（高台射程 +15%、工事平台给工事卡生命 +20%）。
static func from_terrain(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	for f in bt.fields:
		if tw.pos.distance_to(f["pos"]) > f["radius"]:
			continue
		match String(f["kind"]):
			"range":
				_add(pct, "range", float(f["value"]))
			"fort_hp":
				if tw.has_tag("工事"):
					_add(pct, "max_hp", float(f["value"]))


## 全局增益（技能卡，如 ANV-S01 全场攻速 +40% / 6s）。
static func from_global_buffs(bt: BattleState, tw: TowerUnit, pct: Dictionary) -> void:
	for b in bt.global_buffs:
		var until: float = b["until"]
		if until >= 0.0 and bt.t > until:
			continue
		if BattleScope.matches_scope(tw, String(b.get("scope", "all_towers")), b.get("card", {})):
			_add(pct, String(b["stat"]), float(b["value"]))


static func _add(pct: Dictionary, stat: String, value: float) -> void:
	pct[stat] = float(pct.get(stat, 0.0)) + value
