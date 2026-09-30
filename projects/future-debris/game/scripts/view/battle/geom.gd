extends RefCounted
class_name Geom
## 战场几何：**所有位置只在这里定义一次**。
##
## 为什么集中：位置散落在各绘图层里时，"8 个塔位排布"会被写三遍（棋盘、覆盖层、点击判定），
## 改一次就要找三处——而且三处很容易不一致（点击到 3 号位却画在 4 号位那类 bug）。
##
## 坐标系：以战斗区左上角为原点，单位为像素；尺寸取自 token（间距尺度）。

const COLS := 4
const ROWS := 2
const SLOT_COUNT := COLS * ROWS          # 8 个固定塔位（与 BoardSystem.MAX_SLOTS 一致）

## 塔位矩形（slot: 0..7，顺序为从左到右、从上到下）。
static func slot_rect(slot: int, cell: Vector2, gap: int) -> Rect2:
	var col := slot % COLS
	var row := int(slot / COLS)
	return Rect2(Vector2(col * (cell.x + gap), row * (cell.y + gap)), cell)

## 整体战场尺寸。
static func board_size(cell: Vector2, gap: int) -> Vector2:
	return Vector2(COLS * cell.x + (COLS - 1) * gap, ROWS * cell.y + (ROWS - 1) * gap)

## 塔位中心（相对战场左上角）。浮字与涟漪都画在这里，因此必须有唯一实现。
static func slot_center(slot: int, cell: Vector2, gap: int) -> Vector2:
	return slot_rect(slot, cell, gap).get_center()

## 点击点落在哪个塔位；不在任何塔位内时返回 -1。
static func slot_at(point: Vector2, cell: Vector2, gap: int) -> int:
	for slot in SLOT_COUNT:
		if slot_rect(slot, cell, gap).has_point(point):
			return slot
	return -1
