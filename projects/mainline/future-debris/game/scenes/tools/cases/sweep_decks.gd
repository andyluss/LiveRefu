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
##
## **实测教训（卡池扩到 120 张时暴露）**：原来完全按"每费用供电"排序取前 4 张，
## 池子一大就会选出一堆"低费 + 低绝对供电"的牌——总供电看着不差，但**绝对供电太低**，
## 爬升极慢。后果是测量出来的能力大幅下降（`HAU` 从 627 掉到 373），
## 而我一度以为是卡池问题。**取数方式必须与"怎么爬得起来"对齐。**
##
## 现在的规则：先用"前期能拿到多少绝对供电"挑铺场位（只在前 `CANDIDATES` 张里挑，
## 避免选到极低的），再用绝对战力最高的牌填输出位——**总供电不低于参考卡组**。
static func for_faction(catalog: CardCatalog, faction_id: String) -> PackedStringArray:
	var pool := catalog.cards_of_faction(faction_id)
	if pool.is_empty():
		return CaseBase.DECK.split(",")
	var out := PackedStringArray()
	# 铺场位：按"绝对供电"降序，再按每费用供电排序取前几张（兼顾"量大"与"划算"）
	var ramp := _sorted_by(catalog, pool, true)
	for id in _top_ramp(catalog, ramp, RAMP_SLOTS):
		out.append(id)
	# 输出位：绝对战力最高的牌
	for id in _sorted_by(catalog, pool, false):
		if out.size() >= DECK_SIZE:
			break
		if not out.has(id):
			out.append(id)
	var i := 0
	while out.size() < DECK_SIZE and out.size() > 0:
		out.append(out[i % out.size()])
		i += 1
	return out

const CANDIDATES := 10

## 从"每费用供电"排序里取铺场位，但**只在前 [CANDIDATES] 张里挑绝对供电最高的**，
## 避免选出"便宜但供电极低"的牌。
static func _top_ramp(catalog: CardCatalog, ramp: PackedStringArray, count: int) -> PackedStringArray:
	var window: Array = []
	for i in mini(CANDIDATES, ramp.size()):
		window.append(ramp[i])
	window.sort_custom(func(a, b):
		var pa: int = (catalog.cards[str(a)] as CardData).power
		var pb: int = (catalog.cards[str(b)] as CardData).power
		return pa > pb if pa != pb else String(a) < String(b))
	var out := PackedStringArray()
	for i in mini(count, window.size()):
		out.append(str(window[i]))
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
