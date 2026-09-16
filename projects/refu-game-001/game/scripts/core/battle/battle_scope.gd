extends RefCounted
class_name BattleScope
## BattleScope —— 标签范围的判定（纯函数）。
## tag_self＝与来源卡同标签；towers_with_tag:X / tag:X＝含该标签；all_towers/adjacent_towers＝全部。

## scope 判定：tag_self＝与来源卡同标签；towers_with_tag:X＝含标签 X；tag:X 同义。
static func matches_scope(tw: TowerUnit, scope: String, source_card: Dictionary) -> bool:
	if scope == "" or scope == "all_towers" or scope == "adjacent_towers":
		return true
	if scope.begins_with("towers_with_tag:"):
		return tw.has_tag(scope.substr("towers_with_tag:".length()))
	if scope.begins_with("tag:"):
		return tw.has_tag(scope.substr(4))
	if scope == "tag_self":
		for tag in source_card.get("tags", []):
			if tw.has_tag(String(tag)):
				return true
		return false
	return true
