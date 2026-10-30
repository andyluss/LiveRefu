extends RefCounted
class_name ZoneSystem
## **降级区**：残渣累积到一定程度后不再只是"某一格的麻烦"，而是**会向外扩张、并持续伤害基地**的区域。
##
## 为什么必须让它真的造成伤害（S4 补的设计）：如果降级区只是 HUD 上的一个数字，
## 玩家就没有"必须去清理"的理由——残渣只会削弱塔，而削塔的惩罚是渐进的、不致命的。
## 加上"每回合按降级区规模扣基地生命"之后，残渣从"慢慢变弱"变成**有截止时间的威胁**，
## 玩家才会真的在"再放一张牌"和"先清一清"之间做选择。
##
## 参数口径：每 4 点残渣扩张 1 个降级区单位（[ResidueSystem.ZONE_PER_RESIDUE]）；
## 每 8 个降级区单位每回合扣 1 点基地生命（向上取整，保证少量也会造成压力）。
##
## 参数标定（实测）：最初设"每 2 个单位扣 1 点"，结果 16 点残渣就是 8 点/回合，
## **四个势力里有三个在第 1 关就被打爆**——降级区变成了唯一胜负手，别的都不重要了。
## 改为每 8 个单位扣 1 点后，残渣是**持续压力**而不是**即死计时**，玩家仍有空间经营。
const UNITS_PER_DAMAGE := 8

## 本回合降级区造成的基地伤害（只查询，不改状态）。
static func damage_per_turn(zone: int) -> int:
	if zone <= 0:
		return 0
	return int(ceil(float(zone) / float(UNITS_PER_DAMAGE)))

## 在回合末结算降级区伤害；返回实际扣血量（0 表示无影响）。
static func apply(battle) -> int:
	var damage := damage_per_turn(ResidueSystem.zone(battle.residue))
	if damage <= 0:
		return 0
	ResourceSystem.damage_base(battle.resources, damage)
	battle.events.append("降级区扩张：基地 -%d" % damage)
	return damage
