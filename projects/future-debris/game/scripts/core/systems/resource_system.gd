extends RefCounted
class_name ResourceSystem
## 双资源之一：**电力**（本回合能做的事）+ 基地生命与漏怪计数。
## 纯函数集合：所有状态都由调用方持有的字典承载，系统本身无状态（便于无头驱动与断言）。

static func init_resources(base_hp: int) -> Dictionary:
	return {"base_hp": base_hp, "base_hp_max": base_hp, "power": 0, "leaks": 0}

## 回合开始时的电力产出＝基础产出 + 场上单位的 `power` 之和（"供电"是成长曲线）。
static func gain_power(state: Dictionary, board: Dictionary, base_gain: int) -> int:
	var produced := base_gain
	for slot in board:
		var instance: CardInstance = board[slot]
		produced += instance.data.power
	state["power"] = int(state["power"]) + produced
	return produced

static func power(state: Dictionary) -> int:
	return int(state["power"])

## 支付费用；不足则返回 false 且**不改变**状态（避免"部分扣费"这种隐性 bug）。
static func spend(state: Dictionary, amount: int) -> bool:
	if amount < 0:
		return false
	if int(state["power"]) < amount:
		return false
	state["power"] = int(state["power"]) - amount
	return true

static func damage_base(state: Dictionary, amount: int) -> int:
	state["base_hp"] = maxi(0, int(state["base_hp"]) - amount)
	return int(state["base_hp"])

static func alive(state: Dictionary) -> bool:
	return int(state["base_hp"]) > 0

static func hp_ratio(state: Dictionary) -> float:
	var max_hp := int(state["base_hp_max"])
	if max_hp <= 0:
		return 0.0
	return float(state["base_hp"]) / float(max_hp)
