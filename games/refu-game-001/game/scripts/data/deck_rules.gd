extends RefCounted
class_name DeckRules
## DeckRules —— 卡组合法性（doc 05 组卡规则：20 张、同名 ≤2、至少 2 个不同标签）。

## 卡组是否合法（doc 05 组卡规则：20 张、同名 ≤2、至少 2 个不同标签）。


static func validate(level_id: String, card_ids: Array) -> Dictionary:
	var level := GameData.get_level(level_id)
	var size := int(GameData.get_rule(level.get("rule", "RUL-BASE")).get("deck", {}).get("size", 20))
	var max_copies := int(GameData.get_rule(level.get("rule", "RUL-BASE")).get("deck", {}).get("max_copies", 2))
	if card_ids.size() != size:
		return {"ok": false, "reason": "卡组需要 %d 张，当前 %d 张" % [size, card_ids.size()]}
	var counts := {}
	var tags := {}
	for cid in card_ids:
		counts[cid] = int(counts.get(cid, 0)) + 1
		var card := GameData.get_card(String(cid))
		if card.is_empty():
			return {"ok": false, "reason": "卡组里有未知卡牌 %s" % cid}
		for tag in card.get("tags", []):
			tags[tag] = true
	for cid in counts.keys():
		if int(counts[cid]) > max_copies:
			return {"ok": false, "reason": "「%s」超过 %d 张上限"
				% [GameData.get_card(String(cid)).get("name", cid), max_copies]}
	if tags.size() < 2:
		return {"ok": false, "reason": "卡组至少需要 2 个不同标签才能触发羁绊"}
	return {"ok": true, "reason": ""}


## 关卡是否允许挂某张挑战卡（19 号地图卡表第三节的白名单规则）。
