extends RefCounted
class_name BattleResultModal
## 用途 ｜ 结算弹窗：评级三维（基地生命 / 能量效率 / 组合触发）+ 挑战卡难度分加成，并给出三个去处。
## 依赖 ｜ Battle.rating()、AppState.record_result()/start_battle()/goto()、UiKit、BattleModalLayer。

var host
var battle: Battle = null


static func create(host_ref) -> BattleResultModal:
	var p := BattleResultModal.new()
	p.host = host_ref
	p.battle = host_ref.battle
	return p


func open() -> void:
	host._result_shown = true
	var rat := battle.rating()
	AppState.record_result(rat)
	var win: bool = bool(rat["win"])
	var panel := UiKit.card_panel(UiKit.TEAL if win else UiKit.DANGER, 16)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)
	box.add_child(UiKit.label("通关" if win else "基地失守", UiKit.FS_TITLE,
		UiKit.TEAL if win else UiKit.DANGER))
	box.add_child(UiKit.label("评级 %s　综合 %.2f" % [rat["grade"], rat["score"]], UiKit.FS_H1, UiKit.AMBER))
	box.add_child(UiKit.divider())
	box.add_child(UiKit.label("基地生命　%d / %d　（得分 %.2f）"
		% [rat["base_hp"], rat["base_hp_max"], rat["hp_score"]], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("能量效率　%.2f　（花费 / 获得）" % rat["energy_score"], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.label("组合触发　羁绊 %d 条 · 钩子 %d 次　（得分 %.2f）"
		% [rat["bonds"], rat["hook_triggers"], rat["combo_score"]], UiKit.FS_BODY, UiKit.TEXT))
	box.add_child(UiKit.divider())
	box.add_child(UiKit.label("击杀 %d · 漏怪 %d · 用时 %.0fs"
		% [rat["kills"], rat["leaks"], rat["duration"]], UiKit.FS_SMALL, UiKit.TEXT_DIM))
	if int(rat["challenge_score"]) > 0:
		box.add_child(UiKit.label("挑战卡难度分 %d → 掉落系数 ×%.2f · 评级加成 +%.0f%%"
			% [rat["challenge_score"], rat["drop_multiplier"], rat["rating_bonus"] * 100.0],
			UiKit.FS_SMALL, UiKit.PURPLE))
	else:
		box.add_child(UiKit.label("未挂挑战卡：难度分 0，掉落系数 ×1.00", UiKit.FS_SMALL, UiKit.TEXT_DIM))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var again := UiKit.button("再来一局", UiKit.FS_BODY, UiKit.TEAL)
	again.pressed.connect(func(): AppState.start_battle())
	actions.add_child(again)
	var deck := UiKit.ghost_button("改卡组", UiKit.FS_BODY, UiKit.LINE)
	deck.pressed.connect(func(): AppState.goto("res://scenes/ui/deck_builder.tscn"))
	actions.add_child(deck)
	var back := UiKit.ghost_button("返回关卡", UiKit.FS_BODY, UiKit.LINE)
	back.pressed.connect(func(): AppState.goto("res://scenes/ui/level_select.tscn"))
	actions.add_child(back)
	box.add_child(actions)

	host._modals.make(panel, 620, 560)
