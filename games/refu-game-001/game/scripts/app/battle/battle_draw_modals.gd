extends RefCounted
class_name BattleDrawModals
## 用途 ｜ 波间调度弹窗（三选一抽牌）与 ANV-X03 的标签选择弹窗。
## 依赖 ｜ CardView、UiKit、GameData.get_card()、Battle.pending_draw/pick_draw()/_tower_by_uid()/place_card()、
##        BattleModalLayer、BattleScreen（清空拖拽并刷新）。

var host
var battle: Battle = null


static func create(host_ref) -> BattleDrawModals:
	var p := BattleDrawModals.new()
	p.host = host_ref
	p.battle = host_ref.battle
	return p


## 波间调度：每波结束从三张里选一张进手牌（doc 05）。
func open_draw() -> void:
	var panel := UiKit.card_panel(UiKit.PURPLE, 16)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("波间调度 · 三选一", UiKit.FS_H1, UiKit.TEXT))
	box.add_child(UiKit.label("每波结束获得 1 调度点，从卡组抽一张进手牌（doc 05）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	for cid in battle.pending_draw:
		var cv := CardView.new()
		cv.custom_minimum_size = Vector2(180, 256)
		cv.setup(GameData.get_card(cid), false)
		cv.pressed.connect(func(_cv):
			if battle.pick_draw(cid):
				host._close_modal()
				host._refresh_all())
		row.add_child(cv)
	box.add_child(row)
	host._modals.make(panel, 640, 420)


## ANV-X03 模块化基座：选定后为本塔额外附加 1 个标签（弹药或工事）。
func open_tag_choice(cid: String, tower_uid: int) -> void:
	var panel := UiKit.card_panel(UiKit.PURPLE)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("模块换装：为本塔附加哪个标签？", UiKit.FS_H2, UiKit.TEXT))
	box.add_child(UiKit.label("ANV-X03 模块化基座：为本塔额外附加 1 个标签（弹药或工事）。",
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	for tag in ["弹药", "工事"]:
		var b := UiKit.button(tag, UiKit.FS_BODY, UiKit.TEAL if tag == "弹药" else UiKit.BRASS)
		b.pressed.connect(func():
			var tw := battle._tower_by_uid(tower_uid)
			var res := battle.place_card(cid, tw.pos, {"target_uid": tower_uid, "tag_choice": tag})
			if bool(res["ok"]):
				host._close_modal()
				host._drag_card_id = ""
				host._refresh_all())
		row.add_child(b)
	box.add_child(row)
	var cancel := UiKit.ghost_button("取消", UiKit.FS_SMALL, UiKit.LINE)
	cancel.pressed.connect(func():
		host._drag_card_id = ""
		host._close_modal())
	box.add_child(cancel)
	host._modals.make(panel, 520, 280)
