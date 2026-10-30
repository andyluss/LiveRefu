extends RefCounted
class_name WaveCondition
## "守成"条件的判定：**波次是否已经走完**（而不必清空配额）。
##
## 为什么单独一个文件：这条判据有两处细节（"已经走到最后一波之后"与"最后一波已结算"），
## 写在战斗循环里会让循环承担"胜利条件"的知识——而那是 [WinCondition] 的事。

## 本回合结算后，`survive` 条件是否已经达成。
##
## **必须在基地还活着时才算守住**（实测抓到的语义错误）：第一版只判"波次走完"，
## 于是"守到 0 血"也被算成通关——那等于把"防线失守"记成胜利。
## 守成的定义是"**守住了**"，所以基地必须还有血。
static func holds(battle, outcome: Dictionary) -> bool:
	if not WinCondition.is_survive(battle.win_condition):
		return false
	if not ResourceSystem.alive(battle.resources):
		return false
	# 波次已经推进到末波之后（含"清空"与"漏怪被推进"两种走法）
	if WaveSystem.index(battle.wave) >= WaveSystem.wave_count(battle.wave):
		return true
	# 末波已结算但索引未推进（清空末波的情况在上面已处理，这里兜住"漏完末波"）
	return WaveSystem.is_last_wave(battle.wave) and (bool(outcome["cleared"]) or bool(outcome["leaked"]))
