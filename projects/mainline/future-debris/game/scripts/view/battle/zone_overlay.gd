extends Control
class_name ZoneOverlay
## 降级区覆盖层：在战场之上画**扩张中的污染范围**。
##
## 为什么用覆盖层而不是直接画进棋盘：棋盘已经在画格子、卡面、热力条；
## 再往里塞"向外扩散的圆"会让那个文件同时承担三种视觉职责（见 02 的分层）。
##
## 画法：每个被污染的塔位按其残渣量画一圈**半径随污染增长**的圆，
## 并用叠加混合让相邻污染自然连成一片（看起来像"区域在长大"，而不是一堆点）。

const MAX_RADIUS_RATIO := 0.85   # 最大半径 = 半格对角线 × 该比例（不溢出到战场外）

var _battle: Battle
var _tokens: TokenSet
var _cell := Vector2.ZERO
var _gap := 0

func setup(battle: Battle, tokens: TokenSet, cell: Vector2, gap: int) -> void:
	_battle = battle
	_tokens = tokens
	_cell = cell
	_gap = gap
	queue_redraw()

func refresh() -> void:
	queue_redraw()

func _draw() -> void:
	if _battle == null or _tokens == null or _cell == Vector2.ZERO:
		return
	var color := BattlePalette.zone_overlay(_tokens)
	for slot in Geom.SLOT_COUNT:
		var amount := ResidueSystem.at(_battle.residue, slot)
		if amount <= 0:
			continue
		var center := Geom.slot_rect(slot, _cell, _gap).get_center()
		draw_circle(center, _radius_for(amount), color)

## 半径：0 点不画；达到 DANGER 时接近满格。用开方压缩，让"轻度污染"也看得见。
func _radius_for(amount: int) -> float:
	var half := _cell.length() * 0.5
	var ratio := clampf(sqrt(float(amount) / float(ZoneSystem.UNITS_PER_DAMAGE * 2)), 0.0, 1.0)
	return half * ratio * MAX_RADIUS_RATIO
