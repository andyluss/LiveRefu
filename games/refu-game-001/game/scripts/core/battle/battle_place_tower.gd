extends RefCounted
class_name BattlePlaceTower
## BattlePlaceTower —— 塔与支援单位的落位（槽位校验、人口、lifetime）。
## 修饰卡与路径单位见 BattlePlaceModifier / BattlePlaceUnit。

static func tower(bt: BattleState, card: Dictionary, pos: Vector2) -> Dictionary:
	var slot := BattlePlacement.slot_of(bt, pos)
	if slot.is_empty() or String(slot["type"]) != "standard":
		return {"ok": false, "reason": "塔卡只能放在标准塔位"}
	var spot: Vector2 = slot["pos"]
	if not BattlePlacement.slot_free(bt, spot):
		return {"ok": false, "reason": "该塔位已有卡"}
	if BattlePlacement.is_unbuildable(bt, spot):
		return {"ok": false, "reason": "虚空地形不可放置"}
	var tw := TowerUnit.new()
	tw.setup(bt.intern.next_uid(), card, "standard", spot)
	bt.towers.append(tw)
	BattleSkills.pay(bt, card)
	BattleSkills.register_played(bt, card, tw)
	BattleEffects.run_hooks(bt, tw, "on_deploy", {})
	BattleFeedback.floater(bt, spot, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	bt.stats["towers_built"] += 1
	BattleFeedback.log(bt, "放置「%s」" % card.get("name", ""))
	return {"ok": true, "uid": tw.uid}


static func support(bt: BattleState, card: Dictionary, pos: Vector2) -> Dictionary:
	var slot := BattlePlacement.slot_of(bt, pos)
	if slot.is_empty() or String(slot["type"]) != "support":
		return {"ok": false, "reason": "支援卡只能放在支援位"}
	var spot: Vector2 = slot["pos"]
	if not BattlePlacement.slot_free(bt, spot):
		return {"ok": false, "reason": "该支援位已有卡"}
	var pop := int((card.get("stats", {}) as Dictionary).get("population", 0))
	var cap := int(bt.rule.get("population_cap", 5))
	if bt.population_used + pop > cap:
		return {"ok": false, "reason": "人口已满（%d/%d）" % [bt.population_used, cap]}
	var tw := TowerUnit.new()
	tw.setup(bt.intern.next_uid(), card, "support", spot)
	# 在场时长用独立的 lifetime 字段：duration 在支援卡上表示"修理/光环的持续窗口"
	# （如 ANV-M01「修复 8/s、持续 6s」），不是单位寿命。见 docs/01_实现裁决记录.md A4。
	var lifetime := float((card.get("stats", {}) as Dictionary).get("lifetime", 0.0))
	if lifetime > 0.0:
		tw.expires_at = bt.t + lifetime
	bt.towers.append(tw)
	BattleSkills.pay(bt, card)
	BattleSkills.register_played(bt, card, tw)
	BattleEffects.run_hooks(bt, tw, "on_deploy", {})
	BattleFeedback.floater(bt, spot, "-%d" % int(card.get("cost", 0)), Color(0.6, 0.85, 1.0))
	BattleFeedback.log(bt, "部署「%s」" % card.get("name", ""))
	return {"ok": true, "uid": tw.uid}

