extends RefCounted
class_name BoardSystem
## 防线棋盘：固定塔位（[mainline 03 D2](../../../../mainline/docs/03_玩法与经济循环.md)：固定路径 + 固定塔位）。
## 为什么固定：棋盘可控、可读性高，且让"降级区扩张"这种空间机制能被玩家预测。

const MAX_SLOTS := 8

static func init_board() -> Dictionary:
	return {}   # slot:int -> CardInstance

static func is_free(board: Dictionary, slot: int) -> bool:
	return slot >= 0 and slot < MAX_SLOTS and not board.has(slot)

static func place(board: Dictionary, instance: CardInstance) -> bool:
	if not is_free(board, instance.slot):
		return false
	board[instance.slot] = instance
	return true

## 移除并返回该格实例（不存在则返回 null）。
static func remove(board: Dictionary, slot: int) -> CardInstance:
	if not board.has(slot):
		return null
	var instance: CardInstance = board[slot]
	board.erase(slot)
	return instance

static func size(board: Dictionary) -> int:
	return board.size()

## 最低的可用塔位；没有空位时返回 -1。
## 为什么从低到高：低塔位离入口近、更容易积残渣，把它留给"抗污染"的卡是一种可学的取舍。
static func next_free_slot(board: Dictionary) -> int:
	for slot in MAX_SLOTS:
		if not board.has(slot):
			return slot
	return -1

static func occupied_slots(board: Dictionary) -> PackedInt32Array:
	var out := PackedInt32Array()
	for slot in board:
		out.append(int(slot))
	out.sort()
	return out

## 场上单位战力之和（含该格残渣造成的降级惩罚，见 `StatQuery`）。
static func total_might(board: Dictionary, residue: Dictionary, battle = null) -> int:
	var total := 0
	for slot in board:
		var instance: CardInstance = board[slot]
		total += StatQuery.effective_might(instance, residue, battle)
	return total

static func total_residue_output(board: Dictionary) -> int:
	var total := 0
	for slot in board:
		var instance: CardInstance = board[slot]
		total += instance.data.residue
	return total
