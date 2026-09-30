extends RefCounted
class_name DemoStage
## 演示界面的**装配**（与时间轴分开：搭建是一次性的，时间轴每帧都在跑）。
##
## 复用与战斗界面相同的三块视图（[BattleHud] / [BattleBoardView] / [BattleHandView]），
## 避免出现"演示专用"的第二套界面——那种东西一定会与真界面分叉。

var hud: BattleHud
var board: BattleBoardView
var overlay: ZoneOverlay
var hand: BattleHandView
var popups: Popups
var ticker: EventTicker
var caption: Label

func build(theme: Theme, tokens: TokenSet) -> Control:
	var root := VBoxContainer.new()
	root.theme = theme
	root.add_theme_constant_override("separation", int(tokens.spacing[2]))
	hud = BattleHud.new()
	hud.theme = theme
	root.add_child(hud)
	# 事件行：HUD 与棋盘之间的固定三条行位（新事件从下往上顶，不会互相压字）
	ticker = EventTicker.new()
	ticker.theme = theme
	ticker.custom_minimum_size = Vector2(0, EventTicker.LINE_HEIGHT * EventTicker.MAX_LINES)
	root.add_child(ticker)
	var stack := Control.new()
	stack.custom_minimum_size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	overlay = ZoneOverlay.new()
	# 同上：铺满 + 不裁剪，否则越界绘制会被裁掉（踩过一次）
	# 显式给尺寸与位置：父节点是普通 Control（不是容器），**锚点预设对它无效**。
	# 实测教训：尺寸为 0 的 Control 会把越界绘制裁掉——表现为"代码在画、屏幕上一片没有"，
	# 不报错、只能靠像素统计发现。
	overlay.position = Vector2.ZERO
	overlay.size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	stack.add_child(overlay)
	board = BattleBoardView.new()
	board.theme = theme
	board.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_child(board)
	popups = Popups.new()
	popups.theme = theme
	popups.position = Vector2.ZERO
	popups.size = Geom.board_size(BattleBoardView.CELL, BattleBoardView.GAP)
	popups.clip_contents = false   # 浮字会画到棋盘上方的留白里（负 y），不能被裁掉
	stack.add_child(popups)
	root.add_child(stack)
	hand = BattleHandView.new()
	hand.theme = theme
	root.add_child(hand)
	caption = Label.new()
	caption.theme = theme
	caption.theme_type_variation = &"Title2"
	caption.custom_minimum_size = Vector2(0, 64)
	root.add_child(caption)
	return root
