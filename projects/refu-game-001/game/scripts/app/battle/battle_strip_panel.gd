extends RefCounted
class_name BattleStripPanel
## 用途 ｜ 波次预告条：显示下一波的敌人构成（名称 ×N、威胁值、一句话描述）。
## 依赖 ｜ UiKit、Battle.wave_preview() / wave_index / phase、BattleLayout。

var battle: Battle = null

var _strip: HBoxContainer
var _strip_key: String = ""


static func create(host_ref) -> BattleStripPanel:
	var p := BattleStripPanel.new()
	p.battle = host_ref.battle
	p._build(host_ref)
	return p


func _build(parent: Control) -> void:
	var strip_panel := UiKit.panel(UiKit.BG_PANEL_SOFT, 0, UiKit.LINE, 0)
	strip_panel.position = Vector2(0, BattleLayout.STRIP_TOP)
	strip_panel.size = Vector2(BattleLayout.W, BattleLayout.STRIP_H)
	parent.add_child(strip_panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 2)
	strip_panel.add_child(box)
	box.add_child(UiKit.label("下一波预告", UiKit.FS_TINY, UiKit.TEXT_DIM))
	_strip = HBoxContainer.new()
	_strip.add_theme_constant_override("separation", 10)
	box.add_child(_strip)


## 同一波且已建好内容时跳过重建（避免每帧 queue_free 造成闪烁与浪费）。
func refresh() -> void:
	var idx := battle.wave_index
	var key := "%d|%d|%d" % [idx, battle.phase == Battle.PHASE_WAVE as int, battle.total_waves()]
	if key == _strip_key and _strip.get_child_count() > 0:
		return
	_strip_key = key
	for c in _strip.get_children():
		_strip.remove_child(c)
		c.queue_free()
	for item in battle.wave_preview(idx):
		var e: Dictionary = item["enemy"]
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 0)
		box.add_child(UiKit.label("%s ×%d" % [e.get("name", ""), int(item["count"])], UiKit.FS_SMALL, UiKit.TEXT))
		box.add_child(UiKit.label("威胁 %d · %s" % [int(e.get("threat", 0)), String(e.get("desc", ""))],
			UiKit.FS_TINY, UiKit.TEXT_DIM))
		_strip.add_child(box)
