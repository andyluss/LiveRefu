extends RefCounted
class_name WaveCases
## G 组：波次结算的两种后果——**清空**与**漏怪**。
## 立场：漏怪是"可承受的失败"而不是结束，玩家要能继续玩并复盘。

static func wave_outcomes() -> Dictionary:
	var wave := WaveSystem.init_wave()
	var resources := ResourceSystem.init_resources(20)
	WaveSystem.apply_damage(wave, WaveSystem.quota(wave))
	var cleared := WaveResolver.resolve(wave, resources)
	if not bool(cleared["cleared"]) or WaveSystem.index(wave) != 1:
		return CaseBase.bad("配额打满应清空并进入下一波：%s" % str(cleared))
	if int(resources["base_hp"]) != 20:
		return CaseBase.bad("清空不应扣基地生命")
	var wave2 := WaveSystem.init_wave()
	var resources2 := ResourceSystem.init_resources(20)
	for _i in WaveSystem.TURNS_PER_WAVE:
		WaveSystem.tick_turn(wave2)
	var leaked := WaveResolver.resolve(wave2, resources2)
	if not bool(leaked["leaked"]) or int(leaked["damage"]) <= 0:
		return CaseBase.bad("回合耗尽应漏怪并扣血：%s" % str(leaked))
	if int(resources2["base_hp"]) >= 20 or int(resources2["leaks"]) != 1:
		return CaseBase.bad("漏怪应扣血并计数：hp=%d leaks=%d" % [resources2["base_hp"], resources2["leaks"]])
	return CaseBase.ok()

## 超额输出不得结转：否则"攒伤害"会成为唯一最优解，波次节奏失去意义。
static func overflow_not_banked() -> Dictionary:
	var wave := WaveSystem.init_wave()
	var quota := WaveSystem.quota(wave)
	var effective := WaveSystem.apply_damage(wave, quota + 500)
	if effective != quota:
		return CaseBase.bad("超出配额的输出不应被计入：记录了 %d，配额 %d" % [effective, quota])
	if not WaveSystem.cleared(wave) or WaveSystem.remaining(wave) != 0:
		return CaseBase.bad("打满后剩余应归零")
	return CaseBase.ok()

## **最后一波结束后不得凭空多出一波**（实测 bug：会进入不存在的第 N+1 波，
## 且它的配额取自兜底公式，看起来像"关卡数据没生效"）。
static func no_extra_wave() -> Dictionary:
	var quotas := PackedInt32Array([10, 12, 14])
	var wave := WaveSystem.init_wave(quotas)
	if WaveSystem.wave_count(wave) != 3:
		return CaseBase.bad("波数应为 3，实际 %d" % WaveSystem.wave_count(wave))
	for _i in quotas.size():
		WaveSystem.apply_damage(wave, WaveSystem.quota(wave))
		var was_last := WaveSystem.is_last_wave(wave)   # 必须在 advance 之前判断
		var has_next := WaveSystem.advance(wave)
		if was_last and has_next:
			return CaseBase.bad("已是最后一波却报告还有下一波")
		if was_last:
			break
	if WaveSystem.index(wave) != quotas.size() - 1:
		return CaseBase.bad("不应越过最后一波：index=%d" % WaveSystem.index(wave))
	# 最后一波清空后再次 advance 必须无效
	if WaveSystem.advance(wave) or WaveSystem.index(wave) != quotas.size() - 1:
		return CaseBase.bad("最后一波清空后不得再进入下一波")
	return CaseBase.ok()
