extends RefCounted
class_name DemoBattleDriver
## DemoBattleDriver —— 战斗段的自动操盘：自动布防/施放/调度，打完停在结算弹窗上。
## 字幕跟着"当前波次"走（不是按秒硬编码），所以改倍速、改平衡、改出怪节奏都不会错位。

## 返回 true 表示这一段已经演完（导演应收尾）。
static func step(director, step_data: Dictionary, delta: float) -> bool:
	var battle: Battle = director.battle
	if battle.phase in [Battle.PHASE_WON, Battle.PHASE_LOST]:
		director.autoplay_done = true
	if not director.autoplay_done:
		var wave := int(battle.stats["wave_reached"])
		if wave != director.last_wave:
			director.last_wave = wave
			var texts: Array = step_data.get("wave_captions", [])
			if wave >= 1 and wave <= texts.size():
				director.set_caption("⑤ 第 %d 波 / %d — %s"
					% [wave, battle.total_waves(), texts[wave - 1]])
		AutoPlayer.deploy(battle)
		AutoPlayer.use_skills(battle)
		AutoPlayer.take_draw(battle)
		if director.current.get("_modal") != null and director.current.has_method("_close_modal"):
			director.current.call("_close_modal")
		return false
	director.post_time += delta
	if director.post_time > 0.15 and director.post_time < 0.3:
		director.set_caption(String(step_data.get("finish_caption", "⑤ 结算")))
	return director.post_time > 9.0
