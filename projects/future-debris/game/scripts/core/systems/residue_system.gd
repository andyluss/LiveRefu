extends RefCounted
class_name ResidueSystem
## 双资源之一：**残渣**。它是本作的核心张力——"增益必留代价"。
##
## 规则（S2 最小版，S3 起接规则卡）：
##   1. 放置卡牌会立刻把 `data.residue` 写入其所在格；
##   2. 每回合开始，已放置的单位按自身 `residue` 持续产出（"运转即排污"）；
##   3. 残渣总量超过阈值后扩张为**降级区**（规模由总量推导，不单独维护，避免两处状态不同步）；
##   4. **可以花电力清理残渣**——这是关键的一条：只有代价而没有解除手段，
##      "排污"就会变成纯陷阱，理性玩家的最优解是"什么都不做"，玩法随之坍缩。

const ZONE_PER_RESIDUE := 4   # 每 4 点残渣扩散 1 个降级区单位（S3 由风格/规则卡调整）
const CLEAN_COST := 1         # 每清理 1 点残渣的电力成本（由 CardPlayer 扣费）

static func init_residue() -> Dictionary:
	return {"by_slot": {}, "total": 0, "zone": 0}

## 把残渣记到某一格；返回记入后的总量。
static func add(state: Dictionary, slot: int, amount: int) -> int:
	if amount <= 0:
		return state["total"]
	var by_slot: Dictionary = state["by_slot"]
	by_slot[slot] = int(by_slot.get(slot, 0)) + amount
	state["total"] = int(state["total"]) + amount
	state["zone"] = int(state["total"]) / ZONE_PER_RESIDUE
	return state["total"]

## 清理某一格的残渣（由 CardPlayer 负责扣费与原子性）。返回实际清理量。
static func clean(state: Dictionary, slot: int, amount: int) -> int:
	var current := at(state, slot)
	var removed := mini(maxi(0, amount), current)
	if removed <= 0:
		return 0
	var by_slot: Dictionary = state["by_slot"]
	by_slot[slot] = current - removed
	state["total"] = maxi(0, int(state["total"]) - removed)
	state["zone"] = int(state["total"]) / ZONE_PER_RESIDUE
	return removed

## 某格的残渣量（未记录则为 0）。
static func at(state: Dictionary, slot: int) -> int:
	return int((state["by_slot"] as Dictionary).get(slot, 0))

## 当前降级区规模。
static func zone(state: Dictionary) -> int:
	return int(state["zone"])

static func total(state: Dictionary) -> int:
	return int(state["total"])
