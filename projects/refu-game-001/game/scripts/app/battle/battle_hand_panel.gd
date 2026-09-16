extends RefCounted
class_name BattleHandPanel
## 用途 ｜ 手牌区：网格布局、同名卡合并显示 ×N 角标、可负担性标记、点选/长按路由。
## 依赖 ｜ UiKit、CardView、GameData.get_card()、Battle（deck.hand / affordable / energy）、BattleLayout、
##        BattleScreen（读 _drag_card_id / _targeting_card_id，转发 _refresh_all / _show_card_detail）、
##        BattlePlacementUi（拖拽预览）。host 不加类型以避免与主控互相 class_name 依赖。

var host
var battle: Battle = null

var _grid: GridContainer
var _views: Array[CardView] = []
var _key: String = ""


static func create(host_ref) -> BattleHandPanel:
	var p := BattleHandPanel.new()
	p.host = host_ref
	p.battle = host_ref.battle
	p._build()
	return p


func _build() -> void:
	var hand_panel := UiKit.panel(UiKit.BG_PANEL, 0, UiKit.LINE, 0)
	hand_panel.position = Vector2(0, BattleLayout.HAND_TOP)
	hand_panel.size = Vector2(BattleLayout.W, BattleLayout.HAND_H)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	hand_panel.add_child(box)

	var hand_head := HBoxContainer.new()
	hand_head.add_child(UiKit.label("手牌", UiKit.FS_BODY, UiKit.TEXT))
	hand_head.add_child(UiKit.label("　拖到塔位放置 · 点一下看详情 · 拖到已有塔上＝挂修饰",
		UiKit.FS_TINY, UiKit.TEXT_FAINT))
	box.add_child(hand_head)

	_grid = GridContainer.new()
	_grid.columns = 6
	_grid.add_theme_constant_override("h_separation", 6)
	_grid.add_theme_constant_override("v_separation", 6)
	box.add_child(_grid)

	host.add_child(hand_panel)


## 相同卡号合并显示并带 ×N 角标（手牌可能同时有多张同名卡）。
func refresh() -> void:
	var counts := {}
	var order: Array[String] = []
	for cid in battle.deck.hand:
		if not counts.has(cid):
			counts[cid] = 0
			order.append(cid)
		counts[cid] = int(counts[cid]) + 1
	order.sort()
	var drag_id: String = host._drag_card_id
	var target_id: String = host._targeting_card_id
	var key := ",".join(order)
	if key == _key and _views.size() == order.size():
		for i in mini(order.size(), _views.size()):
			var cid2 := order[i]
			_views[i].set_selected(cid2 == drag_id or cid2 == target_id)
			_views[i].set_affordable(battle.affordable(cid2), _why_unaffordable(cid2))
		return
	_key = key
	if _views.size() != order.size():
		for c in _grid.get_children():
			_grid.remove_child(c)
			c.queue_free()
		_views.clear()
		for cid in order:
			var cv := CardView.new()
			cv.custom_minimum_size = Vector2(112, 160)
			cv.setup(GameData.get_card(cid), true)
			cv.pressed.connect(_on_card_pressed)
			cv.long_pressed.connect(_on_card_long_pressed)
			_grid.add_child(cv)
			_views.append(cv)
	for i in mini(order.size(), _views.size()):
		var cid := order[i]
		var cv := _views[i]
		cv.setup(GameData.get_card(cid), true)
		cv.show_count = int(counts[cid])
		cv.set_selected(cid == target_id or cid == drag_id)
		cv.set_affordable(battle.affordable(cid), _why_unaffordable(cid))


func _why_unaffordable(cid: String) -> String:
	var card := GameData.get_card(cid)
	if battle.energy < float(card.get("cost", 0)):
		return "能量不足"
	return ""


## 点一下手牌 = 选中该卡（战场高亮可放位置）；再点一次取消。
## 长按 = 打开完整卡面（doc 07：长按读完整卡面，暂停战场）。
func _on_card_pressed(cv: CardView) -> void:
	var cid := String(cv.card.get("id", ""))
	if host._drag_card_id == cid:
		host._drag_card_id = ""
		host._targeting_card_id = ""
		host.view.ghost = {}
		host._refresh_all()
		return
	host._drag_card_id = cid
	host._targeting_card_id = "" if String(cv.card.get("type", "")) != "skill" else cid
	host._selected_tower_uid = 0
	host._placement.update_preview(cid, Vector2(490, 330))
	host._refresh_all()


func _on_card_long_pressed(cv: CardView) -> void:
	host._show_card_detail(String(cv.card.get("id", "")))
