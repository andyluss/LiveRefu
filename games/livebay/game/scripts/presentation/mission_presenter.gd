# LiveBay · HUD Presenter
# 把读模型翻译成显示文本；不碰 Sim，也不改规则。
class_name LiveBayMissionPresenter
extends RefCounted


static func hud(view: LiveBayMissionReadModel) -> Dictionary:
	var wave_text := "波次 待命"
	if view.wave_index < 0 and view.state == 0:
		wave_text = "首波倒计时 %ds" % int(ceil(view.timer))
	elif view.wave_index >= 0:
		if view.state == 0 or view.state == 2:
			wave_text = "波次 %d/%d · %ds" % [view.wave_index + 1, view.wave_count, int(ceil(view.timer))]
		else:
			wave_text = "波次 %d/%d" % [view.wave_index + 1, view.wave_count]
	return {
		"energy_text": "供能 %d" % int(view.energy),
		"integrity_text": "保障度 %d/%d" % [int(view.integrity), int(view.max_integrity)],
		"wave_text": wave_text,
		"state_text": view.state_name,
		"speed_text": "速度 %dx" % int(view.speed),
	}
