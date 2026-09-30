extends RefCounted
class_name WaveSystem
## 波次系统：每波有一个**敌方战力配额**，需在有限回合内打完。
## 为什么用"配额"而不是逐帧模拟敌人：S2 要验证的是**资源循环**能否成立；
## 敌人寻路/单位移动属于表现与手感，S3 之后再细化，此时抽象成配额反而更利于断言与平衡。

const WAVES := 8              # 与 levels.json 的原子纪元波次量级一致
const TURNS_PER_WAVE := 4
const BASE_QUOTA := 40
const QUOTA_STEP := 15        # 依据：自动玩家能力 ≈ 40 输出/回合（6 塔位 × 后期战力 9 − 残渣惩罚），
                              # 故末波需 36.2/回合——有压力但不绝望。标定过程见 docs/07 §七。S3 起由关卡表覆盖。

static func init_wave() -> Dictionary:
	return {"index": 0, "quota": _quota_for(0), "dealt": 0, "turns_left": TURNS_PER_WAVE, "leaks": 0}

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
static func advance(wave: Dictionary) -> bool:
	if not cleared(wave):
		return false
	return _enter_next(wave)

## 漏怪后强制进入下一波（配额没打完也要走）。
## 为什么要它：漏怪是**可承受的失败**而不是结束——玩家因此能继续玩下去并复盘，
## 这与"评级要能用来复盘改进"的设计立场一致。
static func advance_forced(wave: Dictionary) -> bool:
	return _enter_next(wave)

static func is_last_wave(wave: Dictionary) -> bool:
	return int(wave["index"]) >= WAVES - 1

static func _enter_next(wave: Dictionary) -> bool:
	var next_index := int(wave["index"]) + 1
	wave["index"] = next_index
	wave["quota"] = _quota_for(next_index)
	wave["dealt"] = 0
	wave["turns_left"] = TURNS_PER_WAVE
	return next_index < WAVES

static func _quota_for(index: int) -> int:
	return BASE_QUOTA + QUOTA_STEP * index
