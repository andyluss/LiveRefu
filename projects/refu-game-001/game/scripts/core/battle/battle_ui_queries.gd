extends RefCounted
class_name BattleUiQueries
## BattleUiQueries —— 界面/工具需要的**派生查询**（静态纯函数）。

static func affordable(bt: BattleState, card_id: String) -> bool:
	var card := GameData.get_card(card_id)
	if float(bt.energy) < float(card.get("cost", 0)):
		return false
	return String(bt.intern.mods["ban_card_type"]) != String(card.get("type", ""))


static func hand_cards(bt: BattleState) -> Array:
	var out: Array = []
	for cid in bt.deck.hand:
		out.append(GameData.get_card(cid))
	return out


static func current_wave_number(bt: BattleState) -> int:
	return mini(bt.wave_index + 1, maxi(1, bt.intern.waves.size()))


static func total_waves(bt: BattleState) -> int:
	return bt.intern.waves.size()


static func build_time_left(bt: BattleState) -> float:
	if bt.phase == BattleState.PHASE_BUILD:
		return maxf(0.0, float(bt.rule.get("build_phase_sec", 15.0)) - bt.phase_t)
	if bt.phase == BattleState.PHASE_BREATH:
		return maxf(0.0, float(bt.rule.get("wave_gap_sec", 5.0)) - bt.phase_t)
	return 0.0


## 第 index 波的敌人构成（0-based）；越界返回空。
static func wave_preview(bt: BattleState, index: int) -> Array:
	if index < 0 or index >= bt.intern.waves.size():
		return []
	var out: Array = []
	for comp in (bt.intern.waves[index] as Dictionary).get("composition", []):
		out.append({"enemy": GameData.get_enemy(String(comp.get("enemy", ""))),
				"count": int(comp.get("count", 0))})
	return out


static func board_center(bt: BattleState) -> Vector2:
	var canvas: Dictionary = bt.map_data.get("canvas", {})
	return Vector2(float(canvas.get("width", 980)) * 0.5, float(canvas.get("height", 660)) * 0.4)
