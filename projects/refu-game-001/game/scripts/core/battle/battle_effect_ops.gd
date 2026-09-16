extends RefCounted
class_name BattleEffectOps
## BattleEffectOps —— 效果 op 实现（一）：能量、穿透、护盾、全场增益、附加标签。

static func run(bt: BattleState, op: String, eff: Dictionary, ctx: Dictionary) -> void:
	var tw: TowerUnit = ctx.get("tower", null)
	match op:
		"energy":
			_run_energy(bt, eff, ctx, tw)
		"pierce_bonus":
			if tw != null:
				var cap := float(eff.get("cap", 99))
				tw.hook_stacks["pierce"] = minf(cap,
					float(tw.hook_stacks.get("pierce", 0.0)) + float(eff.get("value", 1)))
		"shield":
			_run_shield(bt, eff, ctx, tw)
		"global_buff":
			bt.global_buffs.append({
				"stat": String(eff.get("stat", "")), "value": float(eff.get("value", 0.0)),
				"until": bt.t + float(eff.get("duration", 0.0)),
				"source": ctx.get("card", {}).get("id", ""),
				"scope": String(eff.get("scope", "all_towers")), "card": ctx.get("card", {}),
			})
		"add_tag":
			BattleEffectTag.run_add_tag(bt, eff, ctx, tw)


## 能量：target=adjacent_towers 时按"每座相邻塔"各返一份（ANV-M02 的 on_deploy）。
static func _run_energy(bt: BattleState, eff: Dictionary, _ctx: Dictionary, tw: TowerUnit) -> void:
	var amount := float(eff.get("value", 0))
	if String(eff.get("target", "")) == "adjacent_towers" and tw != null:
		for other in bt.towers:
			if other.alive and other.pos.distance_to(tw.pos) <= 1.5 * bt.range_unit:
				BattleEnergy.gain(bt, amount)
	else:
		BattleEnergy.gain(bt, amount)
	if tw != null:
		BattleFeedback.floater(bt, tw.pos, "+%d" % int(amount), Color(0.45, 0.95, 0.85))


static func _run_shield(bt: BattleState, eff: Dictionary, ctx: Dictionary, tw: TowerUnit) -> void:
	var value := float(eff.get("value", 0))
	for tgt in BattleEffectTargets.resolve(bt, eff, ctx, tw, ctx.get("target_tower", tw)):
		tgt.shield = maxf(tgt.shield, value)
		tgt.shield_until = bt.t + float(eff.get("duration", 10.0))
		BattleFeedback.floater(bt, tgt.pos, "护盾 %d" % int(value), Color(0.37, 0.89, 0.84))

