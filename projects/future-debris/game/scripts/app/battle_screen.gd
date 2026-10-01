extends Control
## 战斗界面（S4 主场景）：装配 HUD / 战场 / 手牌，并把输入接到 [BattleDriver]。
##
## 分层：本文件只做**装配与输入**；逻辑在 core，绘制在 view。
## 一次点击的完整路径：手牌视图发 `card_clicked` → 这里记下选中 → 点塔位 → driver.play_selected → 刷新。

const DECK := "RC-ATOMIC-001,RC-ATOMIC-002,RC-ATOMIC-005,RC-ATOMIC-011,RC-ATOMIC-012,RC-ATOMIC-008,RC-ATOMIC-004,RC-ATOMIC-006"

var battle: Battle
var driver := BattleDriver.new()
var _board: BattleBoardView
var _hud: BattleHud
var _hand: BattleHandView
var _status: Label
var _overlay: ZoneOverlay
var _popups: Popups
var ticker: EventTicker

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	var tokens: TokenSet = loaded[1]
	var theme: Theme = loaded[0]
	if theme == null:
		return
	var font := theme.default_font   # 主题里的字体就是契约字体；取它即可，不必重建主题
	add_child(Shell.build(theme, tokens, _compose(theme, tokens, font)))
	_start(tokens)

## 装配界面树：HUD 在上、战场居中、手牌在下、状态行在底部。
func _compose(theme: Theme, tokens: TokenSet, font: Font) -> Control:
	var root := VBoxContainer.new()
	root.theme = theme
	root.add_theme_constant_override("separation", int(tokens.spacing[2]))
	_hud = BattleHud.new()
	_hud.theme = theme
	root.add_child(_hud)
	# 战场用"棋盘 + 覆盖层"叠放：覆盖层画降级区扩张，棋盘画格子与卡（互不干涉）
	# 事件行：HUD 与棋盘之间的固定三条行位（新事件从下往上顶，不会互相压字）
	ticker = EventTicker.new()
	ticker.theme = theme
	ticker.custom_minimum_size = Vector2(0, EventTicker.LINE_HEIGHT * EventTicker.MAX_LINES)
	root.add_child(ticker)
	var stack := Control.new()
	stack.custom_minimum_size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	_overlay = ZoneOverlay.new()
	# 覆盖层必须**铺满父容器且不裁剪**：否则尺寸为 0 的 Control 会把越界绘制裁掉——
	# 表现是"代码在画、屏幕上什么都没有"（实测：污染色像素数在所有帧里完全不变，
	# 说明只有 HUD 在画污染色）。这类 bug 不会报错，只能靠像素统计发现。
	# 显式给尺寸与位置：父节点是普通 Control（不是容器），**锚点预设对它无效**。
	# 实测教训：尺寸为 0 的 Control 会把越界绘制裁掉——表现为"代码在画、屏幕上一片没有"，
	# 不报错、只能靠像素统计发现。
	_overlay.position = Vector2.ZERO
	_overlay.size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	stack.add_child(_overlay)
	_board = BattleBoardView.new()
	_board.theme = theme
	_board.set_anchors_preset(Control.PRESET_FULL_RECT)
	_board.gui_input.connect(_on_board_input)
	stack.add_child(_board)
	# 浮字层放在最上面：它要压在棋盘与覆盖层之上（否则会被格子挡住）
	_popups = Popups.new()
	_popups.theme = theme
	_popups.position = Vector2.ZERO
	_popups.size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	_popups.clip_contents = false   # 浮字会画到棋盘上方的留白里（负 y），不能被裁掉
	stack.add_child(_popups)
	root.add_child(stack)
	_hand = BattleHandView.new()
	_hand.theme = theme
	_hand.card_clicked.connect(_on_card_clicked)
	root.add_child(_hand)
	_status = Label.new()
	_status.theme = theme
	_status.theme_type_variation = &"Caption"
	root.add_child(_status)
	return root

func _start(tokens: TokenSet) -> void:
	battle = Battle.new()
	battle.level_id = CampaignSelection.level_id
	battle.faction_id = "FAC-ATOMIC-AEC"
	if not battle.setup(DECK.split(","), 20, 40):
		_status.text = "初始化失败：%s" % str(battle.events)
		return
	driver.bind(battle, _board, _hud, _hand, _overlay, _popups)
	_popups.setup(tokens, _status.get_theme_font("font"))
	ticker.setup(tokens, _status.get_theme_font("font"))
	driver.bind_feedback(ticker)
	_board.setup(battle, tokens, _status.get_theme_font("font"))
	_hud.setup(battle, tokens, _status.get_theme_font("font"))
	_hand.setup(battle, tokens, _status.get_theme_font("font"))
	_overlay.setup(battle, tokens, BattleBoardView.CELL, BattleBoardView.GAP)
	_status.text = "点手牌选中 → 点塔位放置；空格推进一回合"
	driver.refresh()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_SPACE:
		driver.advance()
		_update_status("第 %d 回合" % battle.turn)
		_maybe_settle()

## 终局即进入结算。**这是"一局闭环"的最后一环**：
## 在此之前打完一局只会停在原地，胜负不产生任何后果。
## 判定条件用 `is_active()`（同时覆盖"通关"与"被打爆"两种终局）。
func _maybe_settle() -> void:
	if battle.is_active():
		return
	CampaignSelection.level_id = battle.level_id
	CampaignSelection.last_summary = CardFlow.summarize(battle)
	get_tree().change_scene_to_file("res://scenes/app/settlement.tscn")

func _on_card_clicked(index: int) -> void:
	_hand.select(index)
	_update_status("已选：%s（点塔位放置）" % battle.hand[index].name if index < battle.hand.size() else "已取消选择")

func _on_board_input(event: InputEvent) -> void:
	if not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return
	var slot := _board.slot_at_local(event.position)
	if slot < 0:
		return
	var result: Dictionary = driver.play_selected(slot)
	_update_status("放置到塔位 %d" % (slot + 1) if bool(result["ok"]) else str(result["reason"]))

func _update_status(text: String) -> void:
	_status.text = text
