extends RefCounted
class_name BattlePlaceUnit
## BattlePlaceUnit —— 路径阻挡单位的落位（吸附到路径 + 预读 on_expire 残留减速）。

static func blocker(bt: BattleState, card: Dictionary, pos: Vector2) -> Dictionary:
	var nearest := BattleTargeting.nearest_path_point(bt, pos)
	if nearest.is_empty():
		return {"ok": false, "reason": "路径单位只能放在敌人行进路径上"}
	var b := BlockerUnit.new()
	b.setup(bt.intern.next_uid(), card, int(nearest["path_index"]), float(nearest["along"]), nearest["pos"])
	b.block_reach = float(GameData.balance.get("combat", {}).get("block_reach", 0.5)) * bt.range_unit + 25.0
	var duration := float((card.get("stats", {}) as Dictionary).get("duration", 0.0))
	if duration > 0.0:
		b.expires_at = bt.t + duration
	_read_residual(bt, card, b)
	bt.blockers.append(b)
	BattleSkills.pay(bt, card)
	BattleSkills.register_played(bt, card, {})
	BattleFeedback.floater(bt, b.pos, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	BattleFeedback.log(bt, "放置「%s」于路径" % card.get("name", ""))
	return {"ok": true, "uid": b.uid}


## 到期残留减速（on_expire 的 slow_field）：预先记在阻挡单位上，退场时由 BattleDestroy 落地。
static func _read_residual(bt: BattleState, card: Dictionary, b: BlockerUnit) -> void:
	for eff in (card.get("hooks", {}) as Dictionary).get("on_expire", []):
		if String(eff.get("op", "")) != "slow_field":
			continue
		b.has_residual = true
		b.residual_slow = float(eff.get("value", -0.2))
		b.residual_until = float(eff.get("duration", 3.0))
		b.residual_radius = float(eff.get("radius", 1.5)) * bt.range_unit

