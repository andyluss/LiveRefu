extends RefCounted
class_name FactionPayoff
## 势力机制的**正面收益**（与 [FactionMods] 的"代价修正"分开）。
##
## 为什么拆开（实测结论）：`AEC`（cleans）与 `SUB`（avoids）的**自由输出**高于 `HAU`，
## 实战却更早崩——因为"清理要花电力，而它们的机制奖励清理"，等于**实力被自己的机制吃掉**。
## 只定"代价"而没有"收益"的机制是不完整的；两者变化的理由也不同
## （代价随玩法定位变，收益随"怎么让遵守机制的人不吃亏"变）。

## `cleans` 姿态的**正面收益**：清理时返还一部分消耗的电力。
## 只奖励"少污染"而不补偿"清理成本"时，**越遵守机制的势力越吃亏**；
## 返还 1/3 让"清理"从纯支出变成有回报的循环。
const CLEAN_REBATE_NUMERATOR := 1
const CLEAN_REBATE_DENOMINATOR := 3
## `avoids` 姿态的**正面收益**：每回合按"未污染的在用塔位"给电力利息。
##
## 为什么是"按未污染格数"而不是"少留残渣"：前者是一条**可经营的曲线**
## （保持干净 → 持续收益），后者只是一次性折扣；而且它让"先占干净位"有了正收益，
## 与 `avoids` 的玩法姿态（躲开污染）指向同一件事。
const AVOID_INTEREST_PER_CLEAN_SLOT := 1
## 判定"未污染"的阈值：残渣为 0 才算干净（与机制语义一致，不用模糊阈值）。
const AVOID_CLEAN_THRESHOLD := 0

## 清理返还（按姿态）：`cleans` 拿回一部分清理花费，其它姿态为 0。
static func clean_rebate(battle, cost: int) -> int:
	if FactionMods.posture(battle) != "cleans" or cost <= 0:
		return 0
	return int(floor(float(cost * CLEAN_REBATE_NUMERATOR) / float(CLEAN_REBATE_DENOMINATOR)))

## 回合利息（按姿态）：`avoids` 按"未污染的在用塔位"数给电力。
static func turn_interest(battle) -> int:
	if FactionMods.posture(battle) != "avoids":
		return 0
	var clean_slots := 0
	for slot in BoardSystem.occupied_slots(battle.board):
		if ResidueSystem.at(battle.residue, slot) <= AVOID_CLEAN_THRESHOLD:
			clean_slots += 1
	return clean_slots * AVOID_INTEREST_PER_CLEAN_SLOT

