extends RefCounted
class_name WinCondition
## 胜利条件的**唯一口径**（引擎只认这两个值，不认势力名）。
##
## 为什么需要第二种条件（实测驱动的设计）：
## `cleans`/`avoids` 的机制让战场更干净，而**干净本身不产生波次伤害**——
## 在"清完波次"这同一把尺子下，它们的输出上限低约 30%，永远打不过输出类势力。
## 与其继续补输出（会与 `moves`/`feeds` 同质、变成换皮），
## 不如给它们**不同的目标**：守住所有波次（压力在"守得住"，而非"打得快"）。

const CLEAR := "clear"      # 清完所有波次
const SURVIVE := "survive"  # 守住所有波次（不必清空配额）

## 未知取值一律回落到 `clear`——**但它必须是显式的回落**，
## 而不是"读不到就当胜利"（那会让关卡静默变得可通关）。
static func normalize(value: String) -> String:
	return SURVIVE if value == SURVIVE else CLEAR

## 给界面用的可读标签。**由本文件提供**而不是界面自己拼：
## 否则"守成/守住/存活"会在多处出现不同说法，玩家得重新理解一遍。
static func label(value: String) -> String:
	return "守住所有波次" if is_survive(value) else "清空所有波次"

static func is_survive(value: String) -> bool:
	return normalize(value) == SURVIVE

## **本局是否已分胜负**——胜利条件的唯一判定入口，必须在**所有伤害结算之后**调用。
##
## 两种条件：
##   - `clear`：清完最后一波即通关；
##   - `survive`：波次走完且**基地还活着**即算守住（不必清空配额）。
##
## 教训：这个判定曾经跑在降级区伤害之前，于是基地"先被判为守住、随后被打爆"，
## 结算里出现"判为通关但基地 0 血"。**结算顺序就是规则**，顺序错了规则就错了。
static func evaluate(battle, outcome: Dictionary) -> void:
	if battle == null or battle.finished:
		return
	# **基地被打爆就是失败，与胜利条件无关**。
	# 实测抓到的严重错误：`clear` 分支原来只判"清完最后一波"，**没检查基地是否还活着**——
	# 于是在"末波清空、但同回合被降级区打爆"时被判为通关，**把失守记成了成功**。
	# 因此先把"基地还活着"这条铁律放在最前面。
	if not ResourceSystem.alive(battle.resources):
		battle.finished = false
		return
	var last_wave := WaveSystem.is_last_wave(battle.wave)
	if bool(outcome.get("cleared", false)) and last_wave:
		battle.finished = true
		return
	if WaveCondition.holds(battle, outcome):
		battle.finished = true
