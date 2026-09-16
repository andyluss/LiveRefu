extends RefCounted
class_name SimAirTest
## SimAirTest —— 对空规则的精确用例：把一只"空中"敌人放进两座塔的射程，看选靶结果。
## 不跑整关——整关会被前几波的地面敌人先打光基地，测不到第 4 波。

## 对空规则的精确用例：把一只"空中"敌人放进两座塔的射程，看选靶结果。
## 直接测 _acquire_target 而不是跑整关——整关会被前几波的地面敌人先打光基地，测不到第 4 波。
static func run() -> Dictionary:
	var battle := Battle.new("L1-1", [], ["ANV-T03", "ANV-T01"], 20260914)
	battle.start()
	battle.energy = 999.0
	var map_data := GameData.get_map("MAP-ANV-01")
	var slots: Array = AutoSlots.along_sorted(battle, map_data, "standard")
	var r3 := battle.place_card("ANV-T03", Vector2(slots[3][0], slots[3][1]))
	var r1 := battle.place_card("ANV-T01", Vector2(slots[4][0], slots[4][1]))
	if not bool(r3["ok"]) or not bool(r1["ok"]):
		return {"air_only_hits": -1, "aa_hits": -1, "error": "塔放置失败"}
	var t03 := battle._tower_by_uid(int(r3["uid"]))
	var t01 := battle._tower_by_uid(int(r1["uid"]))
	# 让两座塔进入可攻击状态（stats 尚未重算时攻击间隔为无限）
	battle._recompute_tower_stats()
	# 放一只空中敌人，位置取两塔射程内的路径点
	var along: float = battle.paths[0].project(t01.pos)["along"]
	battle._spawn_enemy("air")
	var air: EnemyUnit = battle.enemies[battle.enemies.size() - 1]
	air.distance = along
	var air_only_t03 := battle._acquire_target(t03)
	var air_only_t01 := battle._acquire_target(t01)
	# 再放一只地面敌人，T03 应改打地面
	battle._spawn_enemy("grunt")
	var ground: EnemyUnit = battle.enemies[battle.enemies.size() - 1]
	ground.distance = along
	var mixed_t03 := battle._acquire_target(t03)
	return {
		"air_only_hits": 0 if air_only_t03 == null else 1,
		"aa_hits": 0 if air_only_t01 == null else 1,
		"t03_vs_ground": 0 if mixed_t03 == null else 1,
	}


# ==================================================================== 输出
