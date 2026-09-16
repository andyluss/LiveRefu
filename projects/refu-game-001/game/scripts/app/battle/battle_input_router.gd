extends RefCounted
class_name BattleInputRouter
## 用途 ｜ 输入路由：全局 _input（把手里选中的牌落在战场）与战场 gui_input（选目标 / 放置 / 点塔看详情）。
## 依赖 ｜ BattleScreen（读写交互状态、转发弹窗与刷新）、BattlePlacementUi、BattleView.to_world()、
##        Battle.tower_at()/cast_card()、BattleLayout。

var host
var battle: Battle = null


static func create(host_ref) -> BattleInputRouter:
	var p := BattleInputRouter.new()
	p.host = host_ref
	p.battle = host_ref.battle
	return p


## 全局鼠标抬起：拖拽中的卡落在战场范围内即尝试放置。
func on_input(event: InputEvent) -> void:
	if host._modal != null or host._drag_card_id == "":
		return
	if event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var local: Vector2 = event.position
		if local.y > BattleLayout.FIELD_TOP and local.y < BattleLayout.FIELD_TOP + BattleLayout.FIELD_H:
			var world: Vector2 = host.view.to_world(local - Vector2(0, BattleLayout.FIELD_TOP))
			var res: Dictionary = host._placement.try_place(host._drag_card_id, world)
			if bool(res["ok"]):
				host._drag_card_id = ""
				host._targeting_card_id = ""
				host.view.ghost = {}
				host._refresh_all()


## 战场点击：选目标施放 / 放下手里的牌 / 点已放置的塔看详情；移动中更新幽灵预览。
func on_field_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var world: Vector2 = host.view.to_world(event.position + Vector2(0, BattleLayout.FIELD_TOP))
		if host._targeting_card_id != "":
			var tw := battle.tower_at(world, 60.0)
			if tw != null:
				var res := battle.cast_card(host._targeting_card_id, tw.uid)
				if bool(res["ok"]):
					host._close_modal()
					host._targeting_card_id = ""
					host._refresh_all()
					return
			return
		if host._drag_card_id != "":
			var res2: Dictionary = host._placement.try_place(host._drag_card_id, world)
			if bool(res2["ok"]):
				host._drag_card_id = ""
				host._close_modal()
				host._refresh_all()
			return
		# 没在拖牌：点塔看详情
		var tw2 := battle.tower_at(world, 60.0)
		host._selected_tower_uid = tw2.uid if tw2 != null else 0
		if tw2 != null:
			host._show_tower_detail(tw2)
		host.view.ghost = {}
		host._refresh_all()
	elif event is InputEventMouseMotion and host._drag_card_id != "":
		var world2: Vector2 = host.view.to_world(event.position + Vector2(0, BattleLayout.FIELD_TOP))
		host._placement.update_preview(host._drag_card_id, world2)
