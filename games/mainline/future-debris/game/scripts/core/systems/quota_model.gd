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
## **每章在上一章基础上再乘的难度系数**。
##
## 为什么需要它（写第二章时发现）：只按"关卡在列表里的位置"取比例时，
## 第 9–16 关会落在与第 1–8 关相同的比例上——**第二章就会变成第一章的复制品**。
## 章节是内容量的自然单位，难度也应当按章递增：章 1 基线 1.0，之后每章 ×1.28。
const CHAPTER_SCALE := 1.28
## 系数上限：避免第十章之后把配额推到"不可能"。
const CHAPTER_SCALE_CAP := 2.2

## 某章的难度系数（章 1 = 1.0）。
static func chapter_scale(chapter: int) -> float:
	var steps := maxi(0, chapter - 1)
	return minf(CHAPTER_SCALE_CAP, pow(CHAPTER_SCALE, float(steps)))
## 一波打几回合（用于把"每回合输出"折算成"一关的输出能力"）
const TURNS_PER_WAVE := 3
## **守成型势力的配额放宽系数**（[WinCondition.SURVIVE]）。
##
## 为什么需要它（实测结论）：守成比清剿**更难**——清剿只要清完最后一波就结束，
## 而守成要求**每一波都达标**（漏一波就掉血，掉光就失守）。同样的配额下，
## 守成势力天然吃亏：实测 AEC/SUB 在按能力放大的专属曲线下仍然只到 LV-06。
## 0.78 是实测出来的：调到它之后守成势力能到 LV-07（与清剿势力形成"守成 vs 清剿"的区分）。
const SURVIVE_RELIEF := 0.78

## 某势力的配额倍率：能力比 × （守成则放宽）。
static func factor_for(ratio: float, is_survive: bool) -> float:
	return ratio * (SURVIVE_RELIEF if is_survive else 1.0)

## **全部势力的最终倍率表**（能力比 × 守成放宽）。校准命令直接打印它。
static func factors(catalog: CardCatalog, caps: Dictionary, weakest: int) -> Dictionary:
	var ratios := faction_ratios(caps, weakest)
	var out := {}
	for faction_id in ratios:
		var row: Dictionary = catalog.factions.get(faction_id, {})
		var survive := WinCondition.is_survive(str(row.get("winCondition", "")))
		out[faction_id] = round(factor_for(float(ratios[faction_id]), survive) * 1000.0) / 1000.0
	return out

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

## 各势力相对最弱势力的能力倍率。用途：通用配额是以**最弱势力**为基准生成的，
## 因此势力 f 的专属配额 = 通用配额 × 本倍率（**形状不变，只按各自能力放大**）。
## 未知或非正的最弱能力时返回空（不猜）。
static func faction_ratios(caps: Dictionary, weakest: int) -> Dictionary:
	var out := {}
	if weakest <= 0:
		return out
	for faction_id in caps:
		out[faction_id] = round(float(caps[faction_id]) / float(weakest) * 1000.0) / 1000.0
	return out

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
