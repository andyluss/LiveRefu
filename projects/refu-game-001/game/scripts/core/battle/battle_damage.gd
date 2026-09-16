extends RefCounted
class_name BattleDamage
## BattleDamage —— 单次命中的结算链：伤害 → on_hit → 击杀 → on_kill 与能量返还；
## 以及漏怪扣血。所有伤害都必须走这里，保证击杀只被记一次（stats 的守恒靠它）。


## 一次命中：返回是否击杀。tower 为 null 表示伤害来自场（腐蚀地等），不算击杀者。
static func apply_hit(bt: BattleState, tw: TowerUnit, e: EnemyUnit, damage: float,
		armor_ignore: float, corrosion_per_stack: float) -> void:
	var res := e.apply_damage(damage, {"armor_ignore": armor_ignore}, bt.t, corrosion_per_stack)
	var dealt := float(res["hp_damage"]) + float(res["shield_absorbed"])
	tw.damage_dealt += dealt
	bt.stats["damage_dealt"] += dealt
	BattleEffects.run_hooks(bt, tw, "on_hit", {"enemy": e})
	if res["killed"]:
		on_enemy_killed(bt, e, tw)


## 击杀结算：击杀数 + 返还能量（受挑战卡倍率）+ 击杀者的 on_kill 钩子。
static func on_enemy_killed(bt: BattleState, e: EnemyUnit, killer) -> void:
	if e.get_meta("counted", false):
		return
	e.set_meta("counted", true)
	bt.stats["kills"] += 1
	var refund := float(e.kill_energy) * float(bt.intern.mods["kill_energy_mul"])
	BattleEnergy.gain(bt, refund)
	if killer is TowerUnit:
		killer.kills += 1
		BattleEffects.run_hooks(bt, killer, "on_kill", {"enemy": e})
	BattleFeedback.floater(bt, BattleQueries.enemy_pos(bt, e), "+%d" % int(refund),
		Color(0.45, 0.95, 0.85))
	BattleEffects.run_hooks_all(bt, "on_kill_any", {"enemy": e})


## 漏怪：抵基地扣血（doc 04：抵达基地即扣基地生命）；归零即失败。
static func on_leak(bt: BattleState, e: EnemyUnit) -> void:
	bt.stats["leaks"] += 1
	bt.base_hp -= float(GameData.balance.get("base", {}).get("leak_damage", 1))
	BattleFeedback.floater(bt, BattleQueries.enemy_pos(bt, e), "漏怪", Color(1.0, 0.35, 0.3))
	BattleFeedback.log(bt, "漏怪：%s 抵达基地（基地生命 %d）" % [e.name, int(bt.base_hp)])
	if bt.base_hp <= 0.0:
		bt.base_hp = 0.0
		BattleWaveEnd.lose(bt)
