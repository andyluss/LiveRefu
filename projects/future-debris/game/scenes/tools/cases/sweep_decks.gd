extends RefCounted
class_name SweepDecks
## 扫描用的卡组构造（与断言分开：它是"取数方式"，不是"不变量"）。
##
## **为什么不能"取卡池前 8 张"（实测教训）**：生成器按原型轮转生产，
## 每个势力的前几张往往是"供电组"这类铺电卡——于是"前 8 张"几乎全是供电、没有输出，
## 扫描结论直接失真（实测：60 张池下四个势力从第 1 关就开始崩）。
## 真实玩家组牌是**先保证铺得开、再堆输出**，这里就按这个规则组：
## 取若干张"每费用供电最高"的牌负责铺场，其余名额给"战力最高"的牌负责输出。
##
## 它仍然只是**取数方式**：改它不影响任何不变量，只影响"测量时用哪副牌"。

const DECK_SIZE := 8
const RAMP_SLOTS := 4      # 铺场位：每费用供电最高的几张

## 该势力的卡组：按"铺场 + 输出"两个角色各取若干张，保证各势力都用**自己的**卡。
static func for_faction(catalog: CardCatalog, faction_id: String) -> PackedStringArray:
	var pool := catalog.cards_of_faction(faction_id)
	if pool.is_empty():
		return CaseBase.DECK.split(",")
	var ramp := _sorted_by(catalog, pool, true)
	var damage := _sorted_by(catalog, pool, false)
	var out := PackedStringArray()
	for i in mini(RAMP_SLOTS, ramp.size()):
		out.append(ramp[i])
	# 输出位：从战力最高的往下取，跳过已入选的卡
	for id in damage:
		if out.size() >= DECK_SIZE:
			break
		if not out.has(id):
			out.append(id)
	# 仍不足时绕回重复（小卡池的势力）
	var i := 0
	while out.size() < DECK_SIZE and out.size() > 0:
		out.append(out[i % out.size()])
		i += 1
	return out

## 排序：`by_ramp` 为真时按"每费用供电"降序，否则按"战力"降序。
## 并列时用卡号（决策必须确定，否则无法复跑）。
static func _sorted_by(catalog: CardCatalog, pool: PackedStringArray, by_ramp: bool) -> PackedStringArray:
	var scored: Array = []
	for id in pool:
		var card: CardData = catalog.cards[id]
		var score := float(card.power) / float(maxi(1, card.cost)) if by_ramp else float(card.might)
		scored.append([score, id])
	scored.sort_custom(func(a, b): return a[0] > b[0] if a[0] != b[0] else String(a[1]) < String(b[1]))
	var result := PackedStringArray()
	for entry in scored:
		result.append(str(entry[1]))
	return result
