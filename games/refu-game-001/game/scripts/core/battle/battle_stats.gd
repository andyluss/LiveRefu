extends RefCounted
class_name BattleStats
## BattleStats —— 塔属性的**全量重算**：基础值 × (1 + Σ百分比来源)；穿透为平坦值。
##
## 每 tick 全量重算而不是增量维护，是为了 remove-safe（doc 02 五律之三）：
## 任何增益来源（修饰卡/羁绊/光环/地形/技能）增删后，结果都自动自洽，不会算错。
## 来源采集见 BattleStatsSources / BattleStatsAura。

static func recompute(bt: BattleState) -> void:
	for tw in bt.towers:
		if not tw.alive:
			continue
		var src := BattleStatsSources.collect(bt, tw)
		_apply(bt, tw, src["pct"], float(src["pierce"]))


static func _apply(bt: BattleState, tw: TowerUnit, pct: Dictionary, pierce: float) -> void:
	var before_max := tw.max_hp
	var new_stats: Dictionary = tw.base.duplicate(true)
	for stat in pct.keys():
		new_stats[stat] = float(tw.base.get(stat, 0.0)) * (1.0 + float(pct[stat]))
	new_stats["pierce"] = pierce
	tw.stats = new_stats
	_sync_max_hp(tw, new_stats, before_max)
	_drop_expired_buffs(bt, tw)


## max_hp 变化时同步当前生命：羁绊生效不该凭空回血，也不该凭空扣血。
static func _sync_max_hp(tw: TowerUnit, new_stats: Dictionary, before_max: float) -> void:
	var new_max := float(new_stats.get("max_hp", before_max))
	if absf(new_max - before_max) > 0.001:
		tw.hp = clampf(tw.hp + (new_max - before_max), 0.0, new_max)
	tw.max_hp = new_max


static func _drop_expired_buffs(bt: BattleState, tw: TowerUnit) -> void:
	var kept: Array = []
	for b in tw.buffs:
		var until: float = b["until"]
		if until < 0.0 or bt.t <= until:
			kept.append(b)
	tw.buffs = kept
