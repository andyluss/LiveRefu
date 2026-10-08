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

## `avoids` 的**输出路径**：干净的塔位获得战力加成。
##
## 为什么必须给输出（而不只是电力利息）：电力只在"能铺更多塔"时才有用，
## 而塔位只有 8 个——铺满之后，多出来的电力**花不出去**。
## 实测证据：`avoids` 的电力并不少，但**输出**始终低于 `moves`/`feeds`。
## 因此把"保持干净"直接换成战力：这才是它的输出路径。
const CLEAN_SLOT_MIGHT := 1

## 某格的洁净战力加成（按姿态）：`avoids` 且该格无残渣时给加成。
static func clean_slot_might(battle, slot: int, residue_at_slot: int) -> int:
	if FactionMods.posture(battle) != "avoids":
		return 0
	return CLEAN_SLOT_MIGHT if residue_at_slot <= AVOID_CLEAN_THRESHOLD else 0

## `cleans` 的**输出路径**：本回合每清理掉 1 点残渣，全场战力 +`PURGE_MIGHT_PER_RESIDUE`（有上限）。
##
## 为什么是"限时爆发"而不是永久加成：清理本身不改变塔的数量，
## 若给永久加成，`cleans` 会变成"越清越强"的正反馈；限时爆发让它更像
## "把清出来的空间当火力用一次"，也给玩家一个**该在什么时候清**的决策点。
const PURGE_MIGHT_PER_RESIDUE := 1
const PURGE_MIGHT_CAP := 6

## 本回合清理量对应的战力加成（只对 `cleans` 生效）。
static func purge_might(_battle, removed: int) -> int:
	if removed <= 0:
		return 0
	return mini(PURGE_MIGHT_CAP, removed * PURGE_MIGHT_PER_RESIDUE)

## **交战时读取的战力加成总量**（基础机制 + 本回合爆发）。
## 由 [StatQuery] 调用；`battle` 为空时返回 0（纯数值查询场景）。
static func might_bonus(battle) -> int:
	if battle == null:
		return 0
	return int(battle.purge_might)

## 回合开始：把上一回合留下的爆发额度清零。
## **必须清零**：否则清理一次会永久变强，`cleans` 会变成正反馈滚雪球。
static func begin_turn(battle) -> void:
	if battle == null:
		return
	battle.purge_might = 0

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

