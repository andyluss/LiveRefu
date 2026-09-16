extends Node2D
class_name BattleView
## BattleView —— 战场表现层（只有画，不算）。
##
## 数据全部从 Battle 读取；本类不修改任何战斗状态——保证"画面"与"结算"分离。
## 坐标换算：地图卡原始像素（980×660）→ 本节点的本地像素，按 fit_scale 等比缩放。
##
## 具体画法已拆到 view/battle/ 下的各 Painter（底板/塔位/塔/敌人/弹道/叠加），
## 本类只负责：持有状态、算缩放、每帧组装 BattlePaintCtx、按固定顺序调用 Painter。

var battle: Battle = null
var map_texture: Texture2D = null

var fit_scale: float = 1.0
var board_offset: Vector2 = Vector2.ZERO
var board_size: Vector2 = Vector2(980, 660)

# 交互高亮
var highlight_slots: Array = []          # [{pos:Vector2, type:String, ok:bool}]
var ghost: Dictionary = {}               # {pos, radius, kind, ok, card}
var selected_tower_uid: int = 0
var show_all_ranges: bool = false

var _font: Font
var _time: float = 0.0


func _ready() -> void:
	_font = UiFont.get_font()
	set_process(true)


func setup(battle_instance: Battle) -> void:
	battle = battle_instance
	if battle == null:
		return
	var canvas: Dictionary = battle.map_data.get("canvas", {})
	board_size = Vector2(canvas.get("width", 980), canvas.get("height", 660))
	var path: String = String(battle.map_data.get("image", ""))
	if path != "" and ResourceLoader.exists(path):
		map_texture = load(path)


func configure(available: Vector2, top_left: Vector2) -> void:
	if board_size.x <= 0.0 or board_size.y <= 0.0:
		return
	fit_scale = minf(available.x / board_size.x, available.y / board_size.y)
	board_offset = top_left + (available - board_size * fit_scale) * 0.5


# ---------------------------------------------------------------- 坐标换算

func to_screen(world: Vector2) -> Vector2:
	return board_offset + world * fit_scale


func to_world(screen: Vector2) -> Vector2:
	return (screen - board_offset) / maxf(fit_scale, 0.0001)


func _process(delta: float) -> void:
	_time += delta
	queue_redraw()


# ---------------------------------------------------------------- 绘制

func _draw() -> void:
	if battle == null:
		return
	var ctx := _paint_ctx()
	# 顺序即图层：底板 → 路径 → 地形 → 塔位/路障 → 塔 → 弹道 → 敌人 → 幽灵 → 飘字
	BattleBoardPainter.draw_background(ctx)
	BattleBoardPainter.draw_paths(ctx)
	BattleBoardPainter.draw_terrain(ctx)
	BattleSlotPainter.draw_slots(ctx)
	BattleSlotPainter.draw_blockers(ctx)
	BattleTowerPainter.draw_towers(ctx)
	BattleFxPainter.draw_projectiles(ctx)
	BattleEnemyPainter.draw_enemies(ctx)
	BattleOverlayPainter.draw_ghost(ctx)
	BattleOverlayPainter.draw_floaters(ctx)


## 把本帧要画的东西打包成只读上下文；Painter 只读它、只往 self 上画
func _paint_ctx() -> BattlePaintCtx:
	var ctx := BattlePaintCtx.new()
	ctx.canvas = self
	ctx.battle = battle
	ctx.map_texture = map_texture
	ctx.font = _font
	ctx.time = _time
	ctx.fit_scale = fit_scale
	ctx.board_offset = board_offset
	ctx.board_size = board_size
	ctx.highlight_slots = highlight_slots
	ctx.ghost = ghost
	ctx.selected_tower_uid = selected_tower_uid
	ctx.show_all_ranges = show_all_ranges
	return ctx
