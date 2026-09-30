extends RefCounted
class_name CaseBase
## 用例基类：提供**统一的构造与断言约定**，让每条用例都只有"这一条要断言什么"。
##
## 为什么用基类：断言约定一旦不统一，用例之间就会各自为政——
## 有的返回 bool、有的 printerr、有的直接 quit，runner 就无法汇总，
## 失败信息也会变得靠运气。这里把约定固定成 {ok, reason}。

const DECK := "RC-ATOMIC-001,RC-ATOMIC-002,RC-ATOMIC-005,RC-ATOMIC-011,RC-ATOMIC-012,RC-ATOMIC-008,RC-ATOMIC-004,RC-ATOMIC-006"

## 标准一局：20 基地生命 / 40 回合上限（与模拟口径一致）。
static func new_battle() -> Battle:
	var battle := Battle.new()
	# 基准局使用**节制档**自动玩家：与 `./run.sh sim` 的口径一致，
	# 否则"验收里的游戏"和"模拟里的游戏"会是两个难度（这种不一致会让结论无法互证）。
	battle.player = AutoPlayer.new(true)
	if not battle.setup(DECK.split(","), 20, 40):
		printerr("局初始化失败：%s" % str(battle.events))
	return battle

static func ok() -> Dictionary:
	return {"ok": true, "reason": ""}

static func bad(reason: String) -> Dictionary:
	return {"ok": false, "reason": reason}
