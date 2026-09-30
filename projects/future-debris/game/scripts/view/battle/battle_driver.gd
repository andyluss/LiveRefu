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

func bind(battle: Battle, board: BattleBoardView, hud: BattleHud, hand: BattleHandView,
		overlay: ZoneOverlay = null) -> void:
	self.battle = battle
	_board = board
	_hud = hud
	_hand = hand
	_overlay = overlay

## 推进一个回合并刷新全部视图。
func advance() -> void:
	if battle == null:
		return
	battle.tick()
	refresh()
	turn_done.emit()

## 刷新视图（出牌/清理后也要调用，否则界面显示的仍是上一回合的数）。
func refresh() -> void:
	if _board != null:
		_board.queue_redraw()
	if _hud != null:
		_hud.refresh()
	if _hand != null:
		_hand.refresh()
	if _overlay != null:
		_overlay.refresh()

## 在某个塔位出当前选中的手牌；返回结果字典（失败原因直接可显示）。
func play_selected(slot: int) -> Dictionary:
	if battle == null or _hand == null:
		return {"ok": false, "reason": "战斗或手牌未就绪"}
	var index := _hand.selected_index()
	if index < 0:
		return {"ok": false, "reason": "先选一张牌"}
	var result := CardPlayer.play(battle, index, slot)
	if bool(result["ok"]):
		_hand.select(-1)
		refresh()
	return result

## 自动跑到结束（用于出演示素材与自动化验收）。
func run_to_end() -> Dictionary:
	if battle == null:
		return {}
	battle.run_to_end()
	refresh()
	return CardFlow.summarize(battle)
