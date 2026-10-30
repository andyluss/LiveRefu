extends RefCounted
class_name BattleSkills
## BattleSkills —— 技能卡施放、回收返还、付费与"本局上过场"的记账。

## 施放技能卡。S01 全场增益无需目标；S02 需要指定一座塔（on_cast.target）。
static func cast(bt: BattleState, card_id: String, target_uid: int = 0) -> Dictionary:
	var card := GameData.get_card(card_id)
	if card.is_empty():
		return {"ok": false, "reason": "未知卡牌"}
	if String(bt.intern.mods["ban_card_type"]) == "skill":
		return {"ok": false, "reason": "本局禁用了「skill」"}
	if bt.energy < float(card.get("cost", 0)):
		return {"ok": false, "reason": "能量不足"}
	var tw: TowerUnit = BattleQueries.tower_by_uid(bt, target_uid) if target_uid > 0 else null
	var on_cast: Array = (card.get("hooks", {}) as Dictionary).get("on_cast", [])
	if needs_target(on_cast) and tw == null:
		return {"ok": false, "reason": "请先选择一座塔"}
	pay(bt, card)
	register_played(bt, card, tw)
	var ctx := {"card": card, "tower": tw, "target_tower": tw,
			"pos": tw.pos if tw != null else Vector2.ZERO}
	for eff in on_cast:
		BattleEffects.run_effect(bt, eff, ctx)
	BattleFeedback.log(bt, "施放「%s」" % card.get("name", ""))
	return {"ok": true}


static func needs_target(on_cast: Array) -> bool:
	for eff in on_cast:
		if String(eff.get("target", "")) == "selected_tower":
			return true
	return false


## 回收（上滑）：返还部分能量（doc 04"拆除返还部分能量"；M1 取 50%，见裁决 A8）。
static func sell(bt: BattleState, uid: int) -> Dictionary:
	var tw := BattleQueries.tower_by_uid(bt, uid)
	if tw == null or not tw.alive:
		return {"ok": false, "reason": "没有可回收的卡"}
	var refund := int(floor(float(tw.card.get("cost", 0)) * 0.5))
	tw.alive = false
	BattleEnergy.gain(bt, refund)
	bt.stats["energy_returned"] += refund
	BattleFeedback.floater(bt, tw.pos, "+%d" % refund, Color(0.6, 0.9, 1.0))
	BattleFeedback.log(bt, "回收「%s」，返还 %d 能量" % [tw.name, refund])
	return {"ok": true, "refund": refund}


## 付费并**从手牌打出**（打出即消耗；这是"手牌"而非"无限卡池"的关键规则）。
static func pay(bt: BattleState, card: Dictionary) -> void:
	BattleEnergy.spend(bt, card)
	if bt.deck != null:
		bt.deck.consume(String(card.get("id", "")))


## 记账：本局上过场的卡（羁绊按"不同卡号"计数，见 docs/01_实现裁决记录.md A3）。
static func register_played(bt: BattleState, card: Dictionary, _tw) -> void:
	bt.played_cards[card.get("id", "")] = true
	bt.stats["cards_played"] += 1
