extends RefCounted
class_name ShotAutoplay
## ShotAutoplay —— 在截图前用 AutoPlayer 自动打一局，让画面里真的有塔/敌人/弹道。
## 细节：波间调度弹窗会暂停战场（这是设计），所以自动打的时候要随手关掉。

static func run(tree: SceneTree, screen: Node, battle: Battle, seconds: float, speed: float) -> void:
	var started := Time.get_ticks_msec()
	var frames := 0
	while true:
		var elapsed := float(Time.get_ticks_msec() - started) / 1000.0 * maxf(1.0, speed)
		if elapsed >= seconds or battle.phase in [Battle.PHASE_WON, Battle.PHASE_LOST]:
			break
		AutoPlayer.deploy(battle)
		AutoPlayer.use_skills(battle)
		AutoPlayer.take_draw(battle)
		if screen.get("_modal") != null and screen.has_method("_close_modal"):
			screen.call("_close_modal")
		frames += 1
		await tree.process_frame
	print("[screenshot] 自动打了 %d 帧 / %.1fs 墙钟（speed=%.0f）"
		% [frames, float(Time.get_ticks_msec() - started) / 1000.0, speed])
	dump(battle)


## 把关键状态打到日志，便于"截图 + 数字"一起核对。
static func dump(battle: Battle) -> void:
	print("[screenshot] 战况 t=%.1fs phase=%s energy=%d 塔=%d 敌=%d 杀=%d 漏=%d 基地=%d 手牌=%d 波=%d/%d"
		% [battle.t, battle.phase, int(battle.energy), battle.towers.size(),
		   battle.enemies.size(), int(battle.stats["kills"]), int(battle.stats["leaks"]),
		   int(battle.base_hp), battle.deck.hand.size(),
		   battle.current_wave_number(), battle.total_waves()])
	for tw in battle.towers:
		print("    · %s @(%.0f,%.0f) 伤害 %.0f 杀 %d"
			% [tw.name, tw.pos.x, tw.pos.y, tw.damage_dealt, tw.kills])
