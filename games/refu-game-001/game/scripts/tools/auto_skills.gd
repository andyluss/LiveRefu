extends RefCounted
class_name AutoSkills
## AutoSkills —— 自动玩家的技能使用：只在交战中且有敌人时施放；S02 修最残的塔。

static func use(battle: Battle) -> void:
	if battle.phase != Battle.PHASE_WAVE or battle.enemies.is_empty():
		return
	for card in battle.hand_cards():
		if String(card.get("type", "")) != "skill":
			continue
		if battle.energy < float(card.get("cost", 0)):
			continue
		var target := 0
		if String(card.get("id", "")) == "ANV-S02":
			var best: TowerUnit = null
			for tw in battle.towers:
				if tw.alive and tw.max_hp > 0.0 and (best == null or tw.hp_ratio() < best.hp_ratio()):
					best = tw
			if best == null:
				continue
			target = best.uid
		battle.cast_card(String(card["id"]), target)
