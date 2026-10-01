extends RefCounted
class_name QuotaModel
## 由**实测能力**导出配额（D28 的方法论：先测能力，再按比例生成；不再手调绝对数字）。
##
## 口径（踩过两次坑才定下来）：
## 1. **不能按"第 N 波的累计输出"推配额**。实测发现自动玩家的每回合输出是
##    "铺塔 → 花钱 → 再铺塔"的锯齿（同一势力有 18 与 4 交替），不是单调增长；
##    按回合切片会把后面的波次算成地板值，整条曲线被压平（实测输出一串 4）。
## 2. **正确口径是"一关的实测总输出 ÷ 既有配额的形状"**：
##    既有配额承载的是**设计意图**（哪一波该紧、哪一波该松），
##    实测能力只负责决定**整体尺度**。这样改卡池 = 重算尺度，改难度 = 改形状，
##    两件事各自独立、可分别评审。
##
## 3. 尺度以**最弱势力**为基准：难度不该由"你选了哪个势力"决定。

## 各关的**能力占比**：末关贴近上限（1.0），前几关逐步放松。
## 这是难度曲线的设计意图，也是唯一需要人来拍的数字。
## 实测标定（第一版是 0.22…1.00）：按"最弱势力自由输出 × 比例"生成的配额仍然偏紧，
## 因为**战斗中的输出低于自由输出**（有波次压力、基地会被打、要花钱清理）。
## 下调到 0.18…0.72 后，最弱势力能打到中段、最强势力能通关末关。
const RATIO_BY_LEVEL := [0.18, 0.23, 0.28, 0.34, 0.41, 0.49, 0.60, 0.72]
## 一波打几回合（用于把"每回合输出"折算成"一关的输出能力"）
const TURNS_PER_WAVE := 3

## 一关的实测输出能力（总输出）。`per_turn` 是该势力在超高配额关卡里的每回合输出。
static func level_capacity(per_turn: Array) -> int:
	var total := 0
	for value in per_turn:
		total += int(value)
	return total

## 既有配额的总量（形状的标尺）。
static func shape_total(existing: Array) -> int:
	var total := 0
	for value in existing:
		total += int(value)
	return total

## 生成新配额：保持 `existing` 的形状，把总量缩放到 `ratio × capacity`。
static func scale(existing: Array, capacity: int, ratio: float) -> Array[int]:
	var shape := shape_total(existing)
	var out: Array[int] = []
	if shape <= 0:
		return out
	var target := float(capacity) * ratio
	for value in existing:
		out.append(maxi(1, int(round(float(value) / float(shape) * target))))
	return out
