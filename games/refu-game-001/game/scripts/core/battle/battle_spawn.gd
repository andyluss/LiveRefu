extends RefCounted
class_name BattleSpawn
## BattleSpawn —— 出兵：把波次卡组的构成变成一个个 EnemyUnit 实例。

static func tick(bt: BattleState, dt: float) -> void:
	if bt.intern.spawn_queue.is_empty():
		return
	bt.intern.spawn_timer -= dt
	if bt.intern.spawn_timer > 0.0:
		return
	enemy(bt, bt.intern.spawn_queue.pop_front())
	bt.intern.spawn_timer = bt.intern.spawn_interval
	# 挑战卡「双流」：第二出生点同时开波（M1 单入口图会被关卡白名单拦下）
	if int(bt.intern.mods["extra_spawn"]) > 0 and not bt.intern.spawn_queue.is_empty():
		enemy(bt, bt.intern.spawn_queue.pop_front(), 1)
		bt.intern.spawn_timer = bt.intern.spawn_interval


## 造一只敌人：数值取自 enemies.json，再乘挑战卡的环境倍率（不改原型数值）。
static func enemy(bt: BattleState, enemy_id: String, path_index: int = 0) -> void:
	var def := GameData.get_enemy(enemy_id)
	if def.is_empty():
		return
	var e := EnemyUnit.new()
	e.uid = bt.intern.next_uid()
	e.id = enemy_id
	e.name = def.get("name", enemy_id)
	e.art = def.get("art", "")
	e.path_index = clampi(path_index, 0, maxi(0, bt.paths.size() - 1))
	e.max_hp = float(def.get("hp", 10)) * float(bt.intern.mods["enemy_hp_mul"])
	e.hp = e.max_hp
	e.armor = float(def.get("armor", 0))
	e.attack = float(def.get("attack", 0))
	e.attack_speed = float(def.get("attack_speed", 1.0))
	e.base_speed = float(def.get("speed", 1.0)) * bt.px_per_speed * float(bt.intern.mods["enemy_speed_mul"])
	e.kill_energy = int(def.get("kill_energy", 1))
	e.threat = int(def.get("threat", 0))
	e.spawn_time = bt.t
	_apply_traits(e, def)
	bt.enemies.append(e)


static func _apply_traits(e: EnemyUnit, def: Dictionary) -> void:
	var traits: Array = def.get("traits", [])
	var tp: Dictionary = def.get("trait_params", {})
	e.flying = traits.has("flying")
	e.slow_resist = float(tp.get("slow_resist", 0.0))
	e.flat_reduction = float(tp.get("reduction", 0.0))
	e.dash_duration = float(tp.get("dash_duration", 0.0))
	e.dash_multiplier = float(tp.get("dash_multiplier", 1.0)) if traits.has("dash") else 1.0
	e.phase_threshold = float(tp.get("phase_threshold", 0.0))
