extends RefCounted
class_name BattlePlacementUi
## 用途 ｜ 拖拽放置的两件事：幽灵预览（吸附位置/可否放置/射程圈）与实际落子。
## 依赖 ｜ GameData.get_card()/slot_at()、Battle.place_card()/cast_card()/tower_at()/_nearest_path_point()、
##        BattleScreen（读写交互状态、转发标签选择弹窗），BattleBottomBar（提示与报错闪烁）。

var host
var battle: Battle = null


static func create(host_ref) -> BattlePlacementUi:
	var p := BattlePlacementUi.new()
	p.host = host_ref
	p.battle = host_ref.battle
	return p


## 拖拽预览：算出吸附位置、是否可放、射程半径，交给 BattleView 画幽灵。
func update_preview(cid: String, world: Vector2) -> void:
	var card := GameData.get_card(cid)
	var ctype := String(card.get("type", ""))
	var ok := false
	var radius := 0.0
	var pos := world
	match ctype:
		"tower":
			var slot := GameData.slot_at(battle.map_data, world, 52.0)
			if not slot.is_empty():
				pos = slot["pos"]
				ok = String(slot["type"]) == "standard" and battle.tower_at(pos, 40.0) == null
			radius = float((card.get("stats", {}) as Dictionary).get("range", 0.0))
		"unit":
			var slot2 := GameData.slot_at(battle.map_data, world, 52.0)
			if String(card.get("slot", "")) == "path":
				var near := battle._nearest_path_point(world)
				if not near.is_empty():
					pos = near["pos"]
					ok = true
			elif not slot2.is_empty():
				pos = slot2["pos"]
				ok = String(slot2["type"]) == "support" and battle.tower_at(pos, 40.0) == null
		"modifier":
			var tw := battle.tower_at(world, 60.0)
			if tw != null:
				pos = tw.pos
				ok = true
			else:
				var slot3 := GameData.slot_at(battle.map_data, world, 52.0)
				if not slot3.is_empty() and String(slot3["type"]) == "modifier":
					pos = slot3["pos"]
					ok = true
	host.view.ghost = {"pos": pos, "ok": ok, "radius": radius}


## 落子：技能走施放（需要目标则进入选目标状态），ANV-X03 先弹标签选择，其余交给 place_card。
func try_place(cid: String, world: Vector2) -> Dictionary:
	var card := GameData.get_card(cid)
	var ctype := String(card.get("type", ""))
	if ctype == "skill":
		# 技能：需要目标就进入指定目标状态；不需要则直接施放
		var need_target := false
		for eff in (card.get("hooks", {}) as Dictionary).get("on_cast", []):
			if String(eff.get("target", "")) == "selected_tower":
				need_target = true
		if need_target:
			host._targeting_card_id = cid
			host._bottom.set_hint(host._bottom.hint_text())
			return {"ok": false, "reason": "请选择目标塔"}
		var res := battle.cast_card(cid, 0)
		return res
	if ctype == "modifier" and String(cid) == "ANV-X03":
		var tw := battle.tower_at(world, 60.0)
		if tw != null:
			host._show_tag_choice(cid, tw.uid)
			return {"ok": false, "reason": "选择附加标签"}
	var result := battle.place_card(cid, world, {})
	if not bool(result["ok"]):
		host._bottom.flash(String(result["reason"]))
	return result
