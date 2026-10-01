extends RefCounted
class_name TurnLoop
## 一个回合的编排：供电 → 出牌 → 场地维护 → 交战 → 波次结算。
##
## 为什么把顺序写死在这里并单独成文件：**回合内的结算顺序就是玩法规则本身**。
## 它散在战斗类里时，重构很容易悄悄改变顺序（既有项目就发生过"阻挡单位放置时机被改"的行为漂移），
## 而顺序一改，数值与手感全变，却不会有任何报错。

static func run(battle) -> Dictionary:
	battle.turn += 1
	# 钩子顺序即规则顺序（写在一处，避免散落后被重构悄悄改掉）：
	# turn_start → 供电 → 出牌 → 场地维护 → 交战 → 波次结算 → wave_cleared
	RuleEngine.fire(battle, "turn_start")
	FactionMods.turn_start_clean(battle)   # clean 姿态：每回合自动清理最脏格
	var gained := ResourceSystem.gain_power(battle.resources, battle.board, Battle.BASE_GAIN)
	var actor: AutoPlayer = battle.player if battle.player != null else AutoPlayer.new()
	var actions: Array[String] = actor.play_turn(battle)
	# 交战用的是**场地维护之前**的残渣（规则卡的阈值也因此按这个口径判定）：
	# 否则"本回合新增的排污"会立刻参与减益，等于双重惩罚，且与玩家看到的界面不一致。
	# 势力机制的正面收益：`avoids` 按"未污染的在用塔位"给电力利息。
	# 放在交战之前（与产出同一时机），这样它本回合就能被花掉——
	# 玩家才能感到"保持干净 → 这回合能多做一件事"。
	var interest := FactionPayoff.turn_interest(battle)
	if interest > 0:
		ResourceSystem.gain(battle.resources, interest)
	var residue_before_upkeep := ResidueSystem.total(battle.residue)
	var residue_added := BoardUpkeep.accrue(battle.board, battle.residue)
	RuleEngine.fire(battle, "before_combat")
	var base_damage := StatQuery.turn_damage(battle.board, battle.residue, battle)
	var damage := maxi(0, base_damage + RuleEngine.damage_delta(battle, residue_before_upkeep))
	var dealt := WaveSystem.apply_damage(battle.wave, damage)
	WaveSystem.tick_turn(battle.wave)
	# 清完最后一波即通关。**必须显式收尾**：否则战斗不会结束，会一直空转到回合上限
	# （实测：LV-ATOMIC-03 第 12 回合就清完了 7 波，却继续跑到第 40 回合，评分因此被算成 A 而非 S）。
	var was_last := WaveSystem.is_last_wave(battle.wave)
	var outcome := WaveResolver.resolve(battle.wave, battle.resources)
	if bool(outcome["cleared"]) and was_last:
		battle.finished = true
	if outcome["cleared"] or outcome["leaked"]:
		var label := "清空" if outcome["cleared"] else "漏怪 -%d" % outcome["damage"]
		battle.events.append("T%d 第%d波 %s（输出 %d / 配额 %d）" % [
			battle.turn, WaveSystem.index(battle.wave) + 1, label, dealt, WaveSystem.quota(battle.wave),
		])
	if outcome["cleared"]:
		RuleEngine.fire(battle, "wave_cleared")
	# 环境结算：降级区按规模持续伤害基地（**这是残渣的第二个后果**，
	# 也是本作真正的"倒计时"——只有削塔惩罚时，玩家永远可以拖）
	var zone_damage := ZoneSystem.apply(battle)
	return {
		"turn": battle.turn,
		"power_in": gained,
		"residue_added": residue_added,
		"dealt": dealt,
		# **原始输出**（未被配额截断）。能力测量必须用它：
		# `dealt` 是 maxi(0, 配额 − 已打) 的结果，清完一波还会清零，
		# 因此"dealt 的累计"恒等于配额之和——用它测能力会得到"四个势力一模一样"的假结果（实测踩过）。
		"output": damage,
		"actions": actions,
		"zone_damage": zone_damage,
		"interest": interest,
		"wave": outcome,
	}
