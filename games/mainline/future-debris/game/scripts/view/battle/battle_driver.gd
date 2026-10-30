extends Node
class_name BattleDriver
## 战斗驱动器：**把逻辑推进与视图刷新绑在一起**。
##
## 为什么需要它：S2/S3 的验收是无头逐回合调用 `Battle.tick()`；
## 场景若自己写一套"什么时候 tick、什么时候刷新"的逻辑，两边就会分叉
## （验收里对的时序，玩起来是错的）。因此时序只在这里定义一次。

signal turn_done

var battle: Battle
var _board: BattleBoardView
var _hud: BattleHud
var _hand: BattleHandView
var _overlay: ZoneOverlay
var _popups: Popups
var _board_origin := Vector2.ZERO   # 战场在屏幕上的左上角（浮字要画在"发生的地方"）
var _feedback := BattleFeedback.new()

func bind(battle: Battle, board: BattleBoardView, hud: BattleHud, hand: BattleHandView,
		overlay: ZoneOverlay = null, popups: Popups = null) -> void:
	self.battle = battle
	_board = board
	_hud = hud
	_hand = hand
	_overlay = overlay
	_popups = popups
	_feedback.bind(battle, _board, _popups)

## 推进一个回合并刷新全部视图，**同时把这一回合发生的事翻译成声音与浮字**。
## 为什么要在这里做（而不是让各视图自己监听）：视图只知道自己要画什么，
## 而"发生了什么"只有推进逻辑知道——放在这里才能保证"屏幕上的反馈"与"实际结算"一一对应。
func advance() -> void:
	if battle == null:
		return
	var before := BattleFeedback.snapshot(battle)
	var turn_info := battle.tick()
	_feedback.react(before, turn_info)
	refresh()
	turn_done.emit()

## 绑定事件行（装配顺序决定：场景先建 ticker，再告知驱动器）。
func bind_feedback(ticker: EventTicker) -> void:
	_feedback.attach_ticker(ticker)

## 刷新全部视图（出牌 / 清理 / 推进回合后都要调，否则界面显示的是上一回合的数）。
## 注：本方法曾在一次"按区间搬代码"的重构中被误删——**搬代码请整段剪切并立即编译**（裁决 D26）。
func refresh() -> void:
	if _board != null:
		_board.queue_redraw()
	if _hud != null:
		_hud.refresh()
	if _hand != null:
		_hand.refresh()
	if _overlay != null:
		_overlay.refresh()

## 塔位中心在屏幕坐标（浮字与涟漪都画在这里）。几何的唯一实现在 [Geom]。
func slot_center(slot: int) -> Vector2:
	return _board_origin + Geom.slot_center(slot, BattleBoardView.cell(), BattleBoardView.gap())

func spawn_text(position: Vector2, text: String, color_token: String, level: String = "caption") -> void:
	if _popups != null:
		_popups.spawn_text(position, text, color_token, level)

func spawn_ripple(position: Vector2, color_token: String, radius: float, life: float) -> void:
	if _popups != null:
		_popups.spawn_ripple(position, color_token, radius, life)

## 自动跑到结束（用于出演示素材与自动化验收）。
func run_to_end() -> Dictionary:
	if battle == null:
		return {}
	battle.run_to_end()
	refresh()
	return CardFlow.summarize(battle)
