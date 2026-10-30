extends RefCounted
class_name BattleBottomBar
## 用途 ｜ 底栏：提示语、最近一条战斗日志、跳过布防 / 显示射程 / 放弃返回三个按钮。
## 依赖 ｜ UiKit、Battle（phase / log_lines）、AppState.goto()、BattleLayout、
##        BattleScreen（读 _drag_card_id / _targeting_card_id / _last_log_index，调用 _skip_build）。

var host
var battle: Battle = null

var _hint_label: Label
var _log_label: Label


static func create(host_ref) -> BattleBottomBar:
	var p := BattleBottomBar.new()
	p.host = host_ref
	p.battle = host_ref.battle
	p._build()
	return p


func _build() -> void:
	var bottom := UiKit.panel(UiKit.BG_PANEL_SOFT, 0, UiKit.LINE, 0)
	bottom.position = Vector2(0, BattleLayout.HAND_TOP + BattleLayout.HAND_H)
	bottom.size = Vector2(BattleLayout.W, BattleLayout.H - (BattleLayout.HAND_TOP + BattleLayout.HAND_H))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	bottom.add_child(box)
	_hint_label = UiKit.label("提示：先放塔，再考虑修饰与支援。", UiKit.FS_SMALL, UiKit.AMBER)
	_log_label = UiKit.label("", UiKit.FS_TINY, UiKit.TEXT_DIM)
	_log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(_hint_label)
	box.add_child(_log_label)

	var btns := HBoxContainer.new()
	btns.add_theme_constant_override("separation", 8)
	var skip := UiKit.ghost_button("跳过布防", UiKit.FS_TINY, UiKit.TEAL)
	skip.custom_minimum_size = Vector2(96, 40)
	skip.pressed.connect(func(): host._skip_build())
	btns.add_child(skip)
	var ranges := UiKit.ghost_button("显示射程", UiKit.FS_TINY, UiKit.LINE)
	ranges.custom_minimum_size = Vector2(96, 40)
	ranges.pressed.connect(func(): host.view.show_all_ranges = not host.view.show_all_ranges)
	btns.add_child(ranges)
	var back := UiKit.ghost_button("放弃返回", UiKit.FS_TINY, UiKit.DANGER)
	back.custom_minimum_size = Vector2(96, 40)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	btns.add_child(back)
	box.add_child(btns)

	host.add_child(bottom)


## 提示语优先级：选目标 > 拖拽中 > 按阶段给默认提示。
func hint_text() -> String:
	if host._targeting_card_id != "":
		return "选择目标：点一座已放置的塔 → 施放「%s」" % GameData.get_card(host._targeting_card_id).get("name", "")
	if host._drag_card_id != "":
		return "拖到高亮位置上松手即可放置"
	if battle.phase == Battle.PHASE_BUILD:
		return "布防期：把塔拖到标准塔位（深蓝方格）"
	if battle.phase == Battle.PHASE_DRAW:
		return "波间调度：三选一，抽一张进手牌"
	return "提示：点已放置的塔可查看详情或回收（返还 50%）"


## 每帧刷新：提示语 + 最近一条日志（只在日志增长时改文本）。
func refresh() -> void:
	_hint_label.text = hint_text()
	if battle.log_lines.size() > host._last_log_index:
		var last: Dictionary = battle.log_lines[battle.log_lines.size() - 1]
		_log_label.text = String(last["text"])
		host._last_log_index = battle.log_lines.size()


func set_hint(text: String) -> void:
	_hint_label.text = text


## 错误提示：闪一次红色再复位（1.4s 后用回琥珀色）。
func flash(text: String) -> void:
	_hint_label.text = text
	_hint_label.add_theme_color_override("font_color", UiKit.DANGER)
	await host.get_tree().create_timer(1.4).timeout
	_hint_label.add_theme_color_override("font_color", UiKit.AMBER)
