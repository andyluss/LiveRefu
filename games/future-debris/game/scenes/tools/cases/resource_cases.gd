extends RefCounted
class_name ResourceCases
## B 组：双资源之一的**电力**（成长曲线）。

static func power_growth() -> Dictionary:
	var battle := CaseBase.new_battle()
	var first := int(battle.tick()["power_in"])
	if first != Battle.BASE_GAIN:
		return CaseBase.bad("第 1 回合供电应为基准 %d，实际 %d" % [Battle.BASE_GAIN, first])
	var second := int(battle.tick()["power_in"])
	if second < first:
		return CaseBase.bad("供电不应倒退：第 2 回合 %d < 第 1 回合 %d" % [second, first])
	return CaseBase.ok()

## 支付安全的边界：刚好够 / 差一点 / 负数。
static func spend_bounds() -> Dictionary:
	var resources := ResourceSystem.init_resources(20)
	ResourceSystem.gain_power(resources, {}, 5)
	if not ResourceSystem.spend(resources, 5) or ResourceSystem.power(resources) != 0:
		return CaseBase.bad("刚好够时应能支付并归零，实际 %d" % ResourceSystem.power(resources))
	if ResourceSystem.spend(resources, 1) or ResourceSystem.power(resources) != 0:
		return CaseBase.bad("不足时不应支付，也不应改变状态")
	if ResourceSystem.spend(resources, -3):
		return CaseBase.bad("负数支付必须被拒绝")
	return CaseBase.ok()
