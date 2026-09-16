extends RefCounted
class_name DeckArtModal
## 用途 ｜ 卡面弹窗：长按卡组/卡池里的卡看完整卡面（美术出图 + 效果 + 风味）。
## 依赖 ｜ GameData.get_card()、UiKit、DeckBuilder（host：把遮罩挂成它的子节点）。

var host


static func create(host_ref) -> DeckArtModal:
	var p := DeckArtModal.new()
	p.host = host_ref
	return p


func open(cid: String) -> void:
	var card := GameData.get_card(cid)
	var layer := ColorRect.new()
	layer.color = Color(0, 0, 0, 0.7)
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_STOP
	host.add_child(layer)
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL))
	panel.position = Vector2(150, 180)
	panel.size = Vector2(420, 900)
	layer.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	var art := String(card.get("icon", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(360, 500)
		box.add_child(tr)
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label(String(card.get("flavor", "")), UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var close := UiKit.ghost_button("关闭", UiKit.FS_BODY, UiKit.LINE)
	close.pressed.connect(func(): layer.queue_free())
	box.add_child(close)
