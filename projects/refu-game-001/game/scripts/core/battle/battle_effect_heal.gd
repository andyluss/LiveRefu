extends RefCounted
class_name BattleEffectHeal
## BattleEffectHeal —— 修复类效果：即时修复 / 持续修复（per_sec）/ 按最大生命百分比。

static func apply(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit,
		target_tw: TowerUnit) -> void:
	var value := float(eff.get("value", 0.0))
	var multiplier := float(eff.get("multiplier", 1.0))
	var targets := BattleEffectTargets.resolve(bt, eff, ctx, tw, target_tw)
	if bool(eff.get("per_sec", false)):
		var uids: Array = []
		for tgt in targets:
			uids.append(tgt.uid)
		bt.heal_effects.append({
			"uids": uids, "per_sec": value * multiplier,
			"until": bt.t + float(eff.get("duration", 6.0)),
			"source": ctx.get("card", {}).get("id", ""),
		})
		return
	for tgt in targets:
		var amount := value * multiplier
		if bool(eff.get("percent_of_max_hp", false)):
			amount = float(tgt.max_hp) * value
		var healed: float = tgt.heal(amount)
		if healed > 0.0:
			BattleFeedback.floater(bt, tgt.pos, "+%d" % int(healed), Color(0.5, 1.0, 0.6))


## 每 tick 推进持续修复（M01 的"修复 8/s、持续 6s"就是它）。
static func tick(bt: BattleState, dt: float) -> void:
	for i in range(bt.heal_effects.size() - 1, -1, -1):
		var h: Dictionary = bt.heal_effects[i]
		if bt.t > float(h["until"]):
			bt.heal_effects.remove_at(i)
			continue
		for uid in h["uids"]:
			var tw := BattleQueries.tower_by_uid(bt, int(uid))
			if tw != null and tw.alive:
				tw.heal(float(h["per_sec"]) * dt)
