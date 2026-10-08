extends RefCounted
class_name StatQuery
## 数值查询（只读口径集中在这里，避免"同一个数字在两处被算成两个值"）。

## 某格残渣造成的战力惩罚：所在格每 2 点残渣减 1 点战力，最多减到 0。
## 为什么按**所在格**而不是全局：玩家能看懂"这一格的代价"，才有可学性。
const RESIDUE_PER_MIGHT_LOSS := 2

static func zone_penalty(residue_at_slot: int) -> int:
	return int(residue_at_slot) / RESIDUE_PER_MIGHT_LOSS

## 有效战力。**势力机制在这里接入**（这是"机制转化为输出"的唯一入口）：
##   - `feeds`：把残渣从"惩罚"翻转为"燃料"（越脏越强）；
##   - `avoids`：干净的塔位获得战力加成（把"保持干净"这条经营换成输出）。
## 为什么要传 battle：战力修正必须知道本局是哪个势力；
## 用可选参数是为了让纯数值查询（如测试单格惩罚）仍然可以只传残渣表。
##
## 设计立场（实测驱动的修正）：机制如果只能"缓解污染"，就永远弱于"直接换输出"——
## 实测 `cleans`/`avoids` 的**自由输出更高**、实战却更早崩，正是这个原因。
## 因此每个势力的机制都必须有**转化为输出**的路径，而不只是少受点惩罚。
static func effective_might(instance: CardInstance, residue: Dictionary, battle = null) -> int:
	var at_slot := ResidueSystem.at(residue, instance.slot)
	var penalty := zone_penalty(at_slot)
	var bonus := FactionMods.might_bonus(battle, at_slot, penalty)
	bonus += FactionPayoff.clean_slot_might(battle, instance.slot, at_slot)
	return maxi(0, instance.data.might - penalty + bonus)

## 本回合对波次的输出（自走式：单位自动交战，玩家的决策在放置与卡组结构）。
static func turn_damage(board: Dictionary, residue: Dictionary, battle = null) -> int:
	return BoardSystem.total_might(board, residue, battle) + FactionPayoff.might_bonus(battle)

## 稳定哈希：供确定性随机（同种子同结果）。不用 hash() 因为它跨版本可能变化。
static func stable_hash(text: String) -> int:
	var value := 0
	for index in text.length():
		value = int((value * 131 + text.unicode_at(index)) % 2147483647)
	return value
