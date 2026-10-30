extends RefCounted
class_name Deck
## Deck —— 卡组与局内调度（doc 05：每波结束获得 1 调度点，三选一从卡组抽牌）。
##
## 公平性：抽牌用固定种子的伪随机，因此"同一关卡 + 同一种子 + 同一套操作"结果可复现，
## headless 验收脚本据此做回归（见 game/scripts/tools/headless_sim.gd）。

var cards: Array[String] = []        # 卡组内容（20 张，卡号可重复，同名最多 2 张）
var draw_pile: Array[String] = []    # 未抽到的牌
var hand: Array[String] = []         # 手牌（已抽到、可用）
var rng := RandomNumberGenerator.new()
var initial_hand: int = 5
var draw_options: int = 3


func setup(card_ids: Array, seed_value: int, hand_size: int, options: int) -> void:
	cards = []
	for c in card_ids:
		cards.append(String(c))
	initial_hand = hand_size
	draw_options = options
	rng.seed = seed_value
	draw_pile = cards.duplicate()
	DeckDraw.shuffle(draw_pile, rng)
	hand = []


## 波间调度：从剩余牌堆给出 draw_options 个不同选项（实现见 DeckDraw.offer）。
func offer_draw() -> Array[String]:
	return DeckDraw.offer(self)


## 开局起手：抽 initial_hand 张。
func deal_opening_hand() -> Array[String]:
	var dealt: Array[String] = []
	for i in mini(initial_hand, draw_pile.size()):
		var c: String = draw_pile.pop_back()
		hand.append(c)
		dealt.append(c)
	return dealt



## 选出调度牌；返回是否成功。
func pick_draw(card_id: String) -> bool:
	var idx := draw_pile.find(card_id)
	if idx < 0:
		return false
	draw_pile.remove_at(idx)
	hand.append(card_id)
	return true


## 出牌：把一张牌从手牌移出（打出即消耗）。返回是否成功。
func consume(card_id: String) -> bool:
	var idx := hand.find(card_id)
	if idx < 0:
		return false
	hand.remove_at(idx)
	return true


func uses_left() -> int:
	return draw_pile.size()


func hand_counts() -> Dictionary:
	var out := {}
	for c in hand:
		out[c] = int(out.get(c, 0)) + 1
	return out
