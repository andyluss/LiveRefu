extends RefCounted
class_name TurnLoop
## 一个回合的编排：供电 → 出牌 → 场地维护 → 交战 → 波次结算。
##
## 为什么把顺序写死在这里并单独成文件：**回合内的结算顺序就是玩法规则本身**。
## 它散在战斗类里时，重构很容易悄悄改变顺序（既有项目就发生过"阻挡单位放置时机被改"的行为漂移），
## 而顺序一改，数值与手感全变，却不会有任何报错。

static func run(battle) -> Dictionary:
	battle.turn += 1
	var gained := ResourceSystem.gain_power(battle.resources, battle.board, Battle.BASE_GAIN)
	var actor: AutoPlayer = battle.player if battle.player != null else AutoPlayer.new()
	var actions: Array[String] = actor.play_turn(battle)
	var residue_added := BoardUpkeep.accrue(battle.board, battle.residue)
	var damage := StatQuery.turn_damage(battle.board, battle.residue)
	var dealt := WaveSystem.apply_damage(battle.wave, damage)
	WaveSystem.tick_turn(battle.wave)
	var outcome := WaveResolver.resolve(battle.wave, battle.resources)
	if outcome["cleared"] or outcome["leaked"]:
		var label := "清空" if outcome["cleared"] else "漏怪 -%d" % outcome["damage"]
		battle.events.append("T%d 第%d波 %s（输出 %d / 配额 %d）" % [
			battle.turn, WaveSystem.index(battle.wave) + 1, label, dealt, WaveSystem.quota(battle.wave),
		])
	return {
		"turn": battle.turn,
		"power_in": gained,
		"residue_added": residue_added,
		"dealt": dealt,
		"actions": actions,
		"wave": outcome,
	}
