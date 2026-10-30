extends RefCounted
class_name BattleClock
## 用途 ｜ 战斗主循环：按固定步长（30Hz）推进 Battle，刷新界面，并在胜负/调度时开弹窗。
## 依赖 ｜ Battle.tick()、AppState.speed_multiplier、BattleScreen（_modal / _paused / _result_shown
##        与 _refresh_all() / _show_result() / _show_draw_modal()）、BattleLayout。

var host
var _acc: float = 0.0


static func create(host_ref) -> BattleClock:
	var p := BattleClock.new()
	p.host = host_ref
	return p


func tick(delta: float) -> void:
	var battle: Battle = host.battle
	if battle == null:
		return
	if host._modal != null or host._paused:
		return
	var speed := AppState.speed_multiplier
	_acc += delta * speed
	var step := 1.0 / BattleLayout.TICK_HZ
	var guard := 0
	while _acc >= step and guard < 240:
		battle.tick(step)
		_acc -= step
		guard += 1
	host._refresh_all()
	if (battle.phase == Battle.PHASE_WON or battle.phase == Battle.PHASE_LOST) and not host._result_shown:
		host._show_result()
	elif battle.phase == Battle.PHASE_DRAW and host._modal == null:
		host._show_draw_modal()
