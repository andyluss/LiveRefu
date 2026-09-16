extends RefCounted
class_name BattleTowers
## BattleTowers —— 塔的每 tick 行为：到期退场、护盾过期、冷却与开火。

static func update(bt: BattleState, dt: float) -> void:
	var cps := float(GameData.balance.get("combat", {}).get("corrosion_per_stack", 0.03))
	for tw in bt.towers:
		if not tw.alive:
			continue
		if _expired(bt, tw):
			continue
		if tw.shield_until >= 0.0 and bt.t > tw.shield_until:
			tw.shield = 0.0
		if not tw.is_attacker():
			continue
		tw.cd -= dt
		if tw.cd > 0.0:
			continue
		var target := BattleTargeting.acquire(bt, tw)
		if target == null:
			continue
		BattleTowerFire.fire(bt, tw, target, cps)
		tw.cd = tw.attack_interval()


## 限时支援单位到期离场。
static func _expired(bt: BattleState, tw: TowerUnit) -> bool:
	if tw.expires_at < 0.0 or bt.t < tw.expires_at:
		return false
	tw.alive = false
	BattleFeedback.log(bt, "「%s」离场" % tw.name)
	return true
