extends RefCounted
class_name CardCost
## 出牌费用的**唯一计算入口**。
##
## 为什么必须唯一：费用被三处读取——UI 显示、自动玩家判断、实际扣费。
## 若各处各算一次，规则卡的减费效果会让你看到 2、扣掉 3，
## 而这种不一致在单测里很难发现（每处单看都对）。

## 实际费用：卡面费用 + 规则修正，最低 0。
static func of(battle, card: CardData, slot: int) -> int:
	return maxi(0, card.cost + RuleEngine.cost_delta(battle, slot))
