extends RefCounted
class_name FactionMods
## **势力机制差异**：把 `factions.json` 里的 `residuePosture` 变成真的会改变结果的行为。
##
## 为什么必须做：四势力现在只有"卡池不同 + 描述不同"——那等于**换皮**。
## 势力差异要能被玩家感觉到，就必须落在**同一个数字上算出不同结果**。
##
## 立场：机制**少而硬**，且全部只围绕残渣这条主轴展开（否则会变成四个互不相关的子系统）。

## 各势力姿态的机制参数（表驱动，便于调参而不改代码）：
##   avoids ：入场残渣 -1（"洁净即美德"的价格）
##   cleans ：每回合开始自动清理最脏格 1 点
##   moves  ：入场残渣改记到**空塔位**（搬运目标见 [MoveRouting]）
##   feeds  ：残渣从惩罚翻转为燃料（每 4 点 +1 战力）
const AVOID_PLACEMENT_DISCOUNT := 1
const CLEAN_PER_TURN := 1
const FEED_RESIDUE_PER_MIGHT := 4
## `moves` 姿态的补偿：回收返还倍率。
## 为什么需要补偿（实测发现）：`moves` 把残渣集中到一格，那一格的战力会被压垮——
## 结果是**只有代价、没有好处**，第 8 关直接被打爆（C 级）。
## 补偿取"清运的本行"：回收更划算，形成"搬运 + 快速换阵"的打法。
const MOVE_SELL_REFUND_NUMERATOR := 3   # 返还 = 费用 × 3/4（其它姿态为 1/2）
const MOVE_SELL_REFUND_DENOMINATOR := 4

## 回收返还（按姿态）。向上取整，避免低价卡返还 0。
static func sell_refund(battle, cost: int) -> int:
	if posture(battle) == "moves":
		return int(ceil(float(cost * MOVE_SELL_REFUND_NUMERATOR) / float(MOVE_SELL_REFUND_DENOMINATOR)))
	return int(cost / 2)

## 姿态取值以**数据表为准**（`moves` / `feeds` / `avoids` / `cleans`，复数）。
## 踩过的坑：我在代码与测试里写成单数 `move`/`feed`，于是所有势力机制静默失效——
## 断言全绿、玩法没变，**看起来像"机制没做"**。因此这里做一次归一化收口，
## 并且 `posture()` 对未知取值返回空串（不猜）。
const POSTURES := {
	"avoids": "avoids", "avoid": "avoids",
	"cleans": "cleans", "clean": "cleans",
	"moves": "moves", "move": "moves",
	"feeds": "feeds", "feed": "feeds",
}

static func posture(battle) -> String:
	if battle == null or battle.faction_id == "" or battle.catalog == null:
		return ""
	var faction: Dictionary = battle.catalog.factions.get(battle.faction_id, {})
	return POSTURES.get(str(faction.get("residuePosture", "")), "")

## 入场残渣修正（`avoid` 势力少留一点）。
## **只管算、不管改**：`move` 姿态的"把残渣搬到别处"需要在放置流程里改状态，
## 因此由 [CardPlayer] 执行——这样 FactionMods 不必反向依赖系统层（避免循环依赖）。
static func placement_residue(battle, residue: int, slot: int) -> int:
	if posture(battle) == "avoids":
		return maxi(0, residue - AVOID_PLACEMENT_DISCOUNT)
	if posture(battle) == "moves":
		# 不改**总量**，只改去处（由 [MoveRouting] 决定）。本函数只负责"减量"类修正。
		return residue
	return residue

## 回合开始的自动清理（`cleans` 势力）。
static func turn_start_clean(battle) -> int:
	if posture(battle) != "cleans":
		return 0
	var dirtiest := RuleEffects.dirtiest_slot(battle)
	if dirtiest < 0:
		return 0
	return ResidueSystem.clean(battle.residue, dirtiest, CLEAN_PER_TURN)

## 战力修正（`feeds` 势力）：把残渣从"惩罚"翻转为"燃料"。
## 传入 `penalty` 是为了**先抵消掉原有的残渣惩罚**，再按残渣给出加成——
## 这样 `feeds` 的净效果是"越脏越强"，而不是"先扣再加、结果还是亏"。
static func might_bonus(battle, residue_at_slot: int, penalty: int) -> int:
	if posture(battle) != "feeds":
		return 0
	return int(residue_at_slot / FEED_RESIDUE_PER_MIGHT) + penalty
