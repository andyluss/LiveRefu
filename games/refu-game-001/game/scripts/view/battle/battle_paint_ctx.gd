extends RefCounted
class_name BattlePaintCtx
## BattlePaintCtx —— BattleView 一帧绘制所需的只读上下文。
##
## BattleView 每帧组装一次，交给 battle/ 下的各 Painter 使用。
## Painter 只读本对象、只往 canvas 上画，绝不回写战斗状态——
## "画面与结算分离"这条约束在拆分后依然成立。
##
## canvas 就是 BattleView 自身（Node2D/CanvasItem）；拆出来的绘制函数
## 通过它调用 draw_rect / draw_circle / draw_string 等接口。

var canvas: CanvasItem = null
var battle: Battle = null
var map_texture: Texture2D = null
var font: Font = null
var time: float = 0.0

var fit_scale: float = 1.0
var board_offset: Vector2 = Vector2.ZERO
var board_size: Vector2 = Vector2(980, 660)

var highlight_slots: Array = []          # [{pos:Vector2, type:String, ok:bool}]
var ghost: Dictionary = {}               # {pos, radius, kind, ok, card}
var selected_tower_uid: int = 0
var show_all_ranges: bool = false


func to_screen(world: Vector2) -> Vector2:
	return board_offset + world * fit_scale
