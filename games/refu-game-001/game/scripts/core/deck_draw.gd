extends RefCounted
class_name DeckDraw
## DeckDraw —— 牌堆的洗牌与调度选项（静态纯函数；牌堆状态在 Deck 上）。
## 调度口径（doc 05）：每波结束 1 调度点、三选一；牌堆不足时重洗整副卡组（固定轮转）。

static func shuffle(arr: Array, rng: RandomNumberGenerator) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp


## 波间调度：给出 draw_options 个不同卡号的选项。
static func offer(d: Deck) -> Array[String]:
	if d.draw_pile.size() < d.draw_options:
		reshuffle(d)
	var options: Array[String] = []
	var seen := {}
	for c in d.draw_pile:
		if not seen.has(c):
			seen[c] = true
			options.append(c)
		if options.size() >= d.draw_options:
			break
	return options


## 重洗：把整副卡组重新铺回牌堆（手牌不动）。
static func reshuffle(d: Deck) -> void:
	if d.cards.is_empty():
		return
	d.draw_pile = d.cards.duplicate()
	shuffle(d.draw_pile, d.rng)
