extends RefCounted
class_name WaveSystem
## 波次系统：每波有一个**敌方战力配额**，需在有限回合内打完。
## 为什么用"配额"而不是逐帧模拟敌人：S2 要验证的是**资源循环**能否成立；
## 敌人寻路与走位属手感与表现（S4），此时抽象成配额反而更利于断言与平衡。
##
## 配额来源（S3 起）：**关卡表的逐波 `quotas`**；关卡没给满时用本文件的可推导公式兜底。

const DEFAULT_WAVES := 8
const TURNS_PER_WAVE := 4
const BASE_QUOTA := 40
## 兜底公式的步长。依据：自动玩家能力 ≈ 40 输出/回合（6 塔位 × 后期战力 9 − 残渣惩罚），
## 故末波需 36.2/回合——有压力但不绝望。标定过程见 docs/07、docs/08 §七。
const QUOTA_STEP := 15

static func init_wave(quotas: PackedInt32Array = PackedInt32Array()) -> Dictionary:
	return {"index": 0, "quota": QuotaSchedule.for_index(0, quotas), "dealt": 0,
		"turns_left": TURNS_PER_WAVE, "leaks": 0, "schedule": quotas}

static func wave_count(wave: Dictionary) -> int:
	var schedule: PackedInt32Array = wave["schedule"]
	return schedule.size() if schedule.size() > 0 else DEFAULT_WAVES

static func index(wave: Dictionary) -> int:
	return int(wave["index"])

static func quota(wave: Dictionary) -> int:
	return int(wave["quota"])

static func dealt(wave: Dictionary) -> int:
	return int(wave["dealt"])

## 本波还需打出的战力（不小于 0）。
static func remaining(wave: Dictionary) -> int:
	return maxi(0, quota(wave) - dealt(wave))

static func cleared(wave: Dictionary) -> bool:
	return dealt(wave) >= quota(wave)

static func turns_left(wave: Dictionary) -> int:
	return int(wave["turns_left"])

## 把本回合输出记入本波；返回实际有效的输出（超额部分不结转，避免"存伤害"）。
static func apply_damage(wave: Dictionary, amount: int) -> int:
	var before := remaining(wave)
	var effective := mini(before, maxi(0, amount))
	wave["dealt"] = int(wave["dealt"]) + effective
	return effective

static func tick_turn(wave: Dictionary) -> int:
	wave["turns_left"] = maxi(0, int(wave["turns_left"]) - 1)
	return int(wave["turns_left"])

## 进入下一波（仅在已清空时允许）；返回是否还有下一波。
## **已是最后一波时不得进入**——否则会"凭空多出一波"，且它的配额取自兜底公式
## （实测：LV-ATOMIC-03 只有 7 波，却在第 8 波拿到公式值 145，看起来像"关卡数据没生效"）。
static func advance(wave: Dictionary) -> bool:
	if not cleared(wave) or is_last_wave(wave):
		return false
	return _enter_next(wave)

## 漏怪后进入下一波（配额没打完也要走）。
## 为什么要它：漏怪是**可承受的失败**而不是结束——玩家因此能继续玩下去并复盘。
## 同样受"最后一波"约束：把最后一波打漏就该结束，而不是无限续波。
static func advance_forced(wave: Dictionary) -> bool:
	if is_last_wave(wave):
		return false
	return _enter_next(wave)

static func is_last_wave(wave: Dictionary) -> bool:
	return int(wave["index"]) >= wave_count(wave) - 1

static func _enter_next(wave: Dictionary) -> bool:
	var next_index := int(wave["index"]) + 1
	wave["index"] = next_index
	wave["quota"] = QuotaSchedule.for_index(next_index, wave["schedule"])
	wave["dealt"] = 0
	wave["turns_left"] = TURNS_PER_WAVE
	return next_index < wave_count(wave)
