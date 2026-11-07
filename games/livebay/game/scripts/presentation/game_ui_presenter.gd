# LiveBay · UI 呈现器
# 把 ReadModel/Presenter 结果写进 HUD；不处理输入/规则。
class_name LiveBayGameUiPresenter
extends RefCounted

const ReadModelScript = preload("res://scripts/application/mission_read_model.gd")
const SimScript = preload("res://scripts/core/sim.gd")
const Consts = preload("res://scripts/shared/constants.gd")

var host: Node


func setup(host_node: Node) -> void:
	host = host_node


func update() -> void:
	if host.sim == null or host.energy_label == null:
		return
	var view: LiveBayMissionReadModel = ReadModelScript.from_sim(host.sim, host.runtime.clock)
	var hud_data: Dictionary = LiveBayMissionPresenter.hud(view)
	host.energy_label.text = hud_data.energy_text
	host.integrity_label.text = hud_data.integrity_text
	host.wave_label.text = hud_data.wave_text
	var countdown := ""
	if host.sim.state == SimScript.State.PREP or host.sim.state == SimScript.State.BETWEEN:
		countdown = " %ds" % int(ceil(host.sim.timer))
	host.state_label.text = hud_data.state_text + countdown
	host.best_label.text = "最佳 %s · 通关 %d" % [String(SaveStore.data.best_grade), int(SaveStore.data.clears)]
	host.hint_label.text = hint_text()

	var ended: bool = host.sim.state == SimScript.State.WON or host.sim.state == SimScript.State.LOST
	var disabled: Array = host.data.get("tower_disabled", [])
	for i: int in range(host.tower_buttons.size()):
		var tower_id := str(Consts.TOWER_ORDER[i])
		host.tower_buttons[i].visible = tower_id not in disabled
		var def: Dictionary = host.data.towers_by_id.get(tower_id, {})
		var cost: int = int(round(float(def.get("cost", 0)) * float(host.sim.profession.get("tower_cost_mult", 1.0))))
		host.tower_buttons[i].disabled = ended or host.sim.energy < float(cost)
		var selected: bool = Consts.TOWER_ORDER[i] == host.selected_tower_id
		host.tower_buttons[i].modulate = Color(1, 1, 1, 1) if selected else Color(1, 1, 1, 0.88)

	host.start_button.disabled = ended or not (host.sim.state == SimScript.State.PREP or host.sim.state == SimScript.State.BETWEEN)
	host.start_button.text = "开波 (空格)" if host.sim.wave_index < 0 else "下一波 (空格)"
	host.pause_button.text = "继续 (P)" if host.runtime.clock.paused else "暂停 (P)"
	host.speed_button.text = hud_data.speed_text

	var tower: Variant = host.sim.get_tower_at(host.selected_slot) if host.selected_slot >= 0 else null
	var has_tower: bool = tower != null
	host.upgrade_button.visible = has_tower
	host.sell_button.visible = has_tower
	if has_tower:
		var max_level: int = int(host.sim.balance.get("max_tower_level", 3))
		host.upgrade_button.text = "升级 %d→%d" % [int(tower.level), int(tower.level) + 1] if int(tower.level) < max_level else "已满级"
		var cost: int = int(round(float(tower.def.cost) * float(host.sim.balance.get("upgrade_cost_factor", 0.8)) * float(tower.level)))
		host.upgrade_button.disabled = ended or int(tower.level) >= max_level or host.sim.energy < float(cost)
		host.sell_button.disabled = ended


func hint_text() -> String:
	var lab := ""
	if host.current_mode == "lab":
		lab = "实验 · %s · " % str(host.data.get("lab_meta", {}).get("name", "自由模式"))
	if host.sim.state == SimScript.State.WON:
		return "本班结束 · R 再来一班"
	if host.sim.state == SimScript.State.LOST:
		return "事故 · R 重新值班"
	if host.runtime.clock.paused:
		return "已暂停 · P 继续"
	var tower: Variant = host.sim.get_tower_at(host.selected_slot) if host.selected_slot >= 0 else null
	if tower != null:
		return "已选中 %s Lv.%d · U 升级 · X 出售 · 右键取消" % [String(tower.def.name), int(tower.level)]
	return lab + "点击塔位建造 · 1–6 选塔 · C 合同 · V 湾民 · L 自由模式 · F1 主页 · Esc 关层 · Q 退出 · 空格开波 · Tab 加速 · P 暂停"


func refresh_tower_buttons() -> void:
	if host.game_hud != null:
		host.game_hud.refresh_tower_buttons(host.selected_tower_id)
