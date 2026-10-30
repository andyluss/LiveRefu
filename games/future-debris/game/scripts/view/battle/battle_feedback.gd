extends RefCounted
class_name BattleFeedback
## **把"发生了什么"翻译成声音与浮字。**
##
## 为什么独立于 [BattleDriver]：两者变化的理由不同——
## 驱动器随"何时推进、怎么推进"变化；本文件随"想让玩家看到/听到什么"变化。
## 而且只有推进逻辑知道真正发生了什么，视图各自无法承担这件事。
##
## 立场：**失败也要有反馈**。"点了没反应"是最让玩家困惑的形态，
## 因此拒绝音与浮字是必需项，不是锦上添花。
##
## 依赖方向（踩过一次）：本文件**只依赖** [Geom]（纯几何）、[Popups]（纯表现）与 [SfxHost]。
## 曾把 [BattleDriver] 传进来调用它的浮字方法，形成 BattleDriver → BattleFeedback → BattleDriver
## 的循环，编译失败且报错指向第三处，很难定位。

## 设计尺寸；实际使用 [BattleBoardView.cell] / [gap]（随 [UiScale] 缩放）

var _battle: Battle
var _board: BattleBoardView
var _popups: Popups
var _ticker: EventTicker

func bind(battle: Battle, board: BattleBoardView, popups: Popups, ticker: EventTicker = null) -> void:
	_battle = battle
	_board = board
	_popups = popups
	_ticker = ticker

## 装配事件行（与 bind 分开：事件行属于"额外反馈"，缺了也不该让战斗不能用）。
func attach_ticker(ticker: EventTicker) -> void:
	_ticker = ticker

## 回合前快照（用于算差值与触发反馈）。
static func snapshot(battle: Battle) -> Dictionary:
	return {
		"power": ResourceSystem.power(battle.resources),
		"residue": ResidueSystem.total(battle.residue),
		"zone": ResidueSystem.zone(battle.residue),
		"hp": int(battle.resources["base_hp"]),
	}

## 把这一回合的变化翻成反馈。
func react(before: Dictionary, turn_info: Dictionary) -> void:
	var after := snapshot(_battle)
	_residue(before, after)
	_zone(before, after)
	_hp(before, after)
	_wave(turn_info)

## 放置成功：塔位处涟漪 + 战力浮字 + 上行音。
func on_placed(slot: int, card: CardData) -> void:
	SfxHost.play("place")
	var center := Geom.slot_center(slot, BattleBoardView.cell(), BattleBoardView.gap())
	_ripple(center, "--power", 70.0, 0.22)
	if card != null:
		_text(center + Vector2(-26, -14), "战力 %d" % card.might, "--power")

## 放置被拒：拒绝音。**不静默**——玩家必须知道"这一下没生效"。
func on_denied() -> void:
	SfxHost.play("deny")

func _residue(before: Dictionary, after: Dictionary) -> void:
	var delta := int(after["residue"]) - int(before["residue"])
	if delta <= 0:
		return
	SfxHost.play("residue")
	_line("残渣 +%d" % delta, "--residue", "body")

func _zone(before: Dictionary, after: Dictionary) -> void:
	if int(after["zone"]) <= int(before["zone"]):
		return
	SfxHost.play("zone")
	# 涟漪画在棋盘**下方留白**的中心，避免盖住卡面（实测：画在 (120,110) 会压在第一行塔位上）
	_ripple(Vector2(282, 110), "--accent", 300.0, 0.7)
	_line("降级区扩张 → %d" % int(after["zone"]), "--accent", "title-2")

func _hp(before: Dictionary, after: Dictionary) -> void:
	var lost := int(before["hp"]) - int(after["hp"])
	if lost <= 0:
		return
	SfxHost.play("leak")
	_line("基地 -%d" % lost, "--warn", "body")

func _wave(turn_info: Dictionary) -> void:
	var outcome: Dictionary = turn_info.get("wave", {})
	if bool(outcome.get("cleared", false)):
		SfxHost.play("wave_clear")
		_line("波次清空", "--ok", "body")
	elif bool(outcome.get("leaked", false)):
		SfxHost.play("leak")
		_line("漏怪", "--accent", "body")

## 推一条事件到事件行；没有 ticker 时静默跳过（无界面环境下不应崩）。
func _line(text: String, color_token: String, level: String = "body") -> void:
	if _ticker != null:
		_ticker.push(text, color_token, level)

## 往浮字层投喂（塔位处的涟漪与战力浮字用它）。
func _text(position: Vector2, text: String, color_token: String, level: String = "caption") -> void:
	if _popups != null:
		_popups.spawn_text(position, text, color_token, level)

func _ripple(position: Vector2, color_token: String, radius: float, life: float) -> void:
	if _popups != null:
		_popups.spawn_ripple(position, color_token, radius, life)
