extends RefCounted
class_name AutoPlayer
## 自动玩家（**确定性策略**）：让一局能被无头复跑，任何数值改动都能被 diff 出来。
##
## 立场：**它不是 AI，是规则**——不得使用随机、不得读取隐藏信息。
## 两种策略（[PlacePolicy]）：**节制**（先清理再把牌放上去）与**贪心**（只买不卖不清）。
## 两者的差距就是"玩家决策有没有意义"的度量，也是 `./run.sh sim` 两档对比的意义。

const MAX_DRAW_PER_TURN := 2   # 每回合最多补抽几张，防止无限抽牌

var conservative := true

func _init(use_conservative: bool = true) -> void:
	conservative = use_conservative

## 执行一个回合的决策；返回本回合的动作日志（供断言与复盘）。
func play_turn(battle) -> Array[String]:
	var log: Array[String] = []
	_draw_until_playable(battle, log)
	if conservative:
		_clean_dangerous(battle, log)
	var guard := 0
	while guard < 32:
		guard += 1
		var pick := PlacePolicy.best_playable(battle, conservative)
		if pick < 0:
			break
		var slot := BoardSystem.next_free_slot(battle.board)
		if slot < 0:
			break
		var card: CardData = battle.hand[pick]
		var result := CardPlayer.play(battle, pick, slot)
		if not bool(result["ok"]):
			log.append("fail:%s" % result["reason"])
			break
		log.append("play:%s@%d" % [card.id, slot])
	return log

func _draw_until_playable(battle, log: Array[String]) -> void:
	var draws := 0
	while battle.playable_count() == 0 and draws < MAX_DRAW_PER_TURN and battle.draw_card():
		draws += 1
		log.append("draw")

## 先清理、再放置：**顺序很重要**——若先放置再清理，危险格会被新卡继续加剧。
func _clean_dangerous(battle, log: Array[String]) -> void:
	for slot in BoardSystem.occupied_slots(battle.board):
		if not PlacePolicy.wants_clean(battle, slot):
			continue
		var result := CardPlayer.clean(battle, slot, PlacePolicy.CLEAN_TARGET)
		if bool(result["ok"]):
			log.append("clean:%d-%d" % [slot, int(result["removed"])])
