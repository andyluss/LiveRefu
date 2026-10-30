extends RefCounted
class_name BattleCardModal
## 用途 ｜ 卡牌详情弹窗：长按/点击手牌读完整卡面（美术出图 + 数值 + 钩子 + 风味文本）。
## 依赖 ｜ GameData.get_card()、UiKit、BattleModalLayer（遮罩）、BattleScreen（清空拖拽/选中并刷新）。

var host


static func create(host_ref) -> BattleCardModal:
	var p := BattleCardModal.new()
	p.host = host_ref
	return p


func open(cid: String) -> void:
	var card := GameData.get_card(cid)
	if card.is_empty():
		return
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL), 14)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)

	# 美术出图卡面（700×974）等比缩到弹窗宽度
	var art_path := String(card.get("icon", ""))
	if art_path != "" and ResourceLoader.exists(art_path):
		var tr := TextureRect.new()
		tr.texture = load(art_path)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(340, 473)
		box.add_child(tr)

	var stats_line: Array[String] = []
	for pair in card.get("face_stats", []):
		stats_line.append("%s %s" % [pair[0], pair[1]])
	box.add_child(UiKit.label("　".join(stats_line), UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("费用 %d · %s · %s" % [int(card.get("cost", 0)),
		UiKit.SLOT_LABELS.get(String(card.get("slot", "none")), ""), String(card.get("keyword", ""))],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_SMALL, UiKit.TEXT))
	var hooks: Dictionary = card.get("hooks", {})
	var hook_names: Array[String] = []
	for k in hooks.keys():
		hook_names.append(String(k))
	box.add_child(UiKit.label("钩子：%s" % ("、".join(hook_names) if not hook_names.is_empty() else "—"),
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(card.get("flavor", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	actions.add_child(UiKit.label("拖到战场放置；点关闭取消。", UiKit.FS_TINY, UiKit.TEXT_DIM))
	var close := UiKit.ghost_button("关闭", UiKit.FS_SMALL, UiKit.LINE)
	close.pressed.connect(func():
		host._drag_card_id = ""
		host._targeting_card_id = ""
		host.view.ghost = {}
		host._close_modal()
		host._refresh_all())
	actions.add_child(close)
	box.add_child(actions)

	host._modals.make(panel, 430, 880)
