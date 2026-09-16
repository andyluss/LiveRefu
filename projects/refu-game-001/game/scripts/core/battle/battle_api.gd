extends BattleState
class_name BattleApi
## BattleApi —— **查询门面**：界面与工具读战斗状态的唯一出口。
##
## 每个方法只做一件事——转发给对应的静态系统。放在这里而不是 Battle 里，是为了让
## "读"与"写"分开：Battle 只留生命周期与命令，查询实现散在各系统里各自变小。
## 这些方法名是**对外契约**，界面/验收脚本都按它们调用，改实现不改签名。

func enemy_pos(e: EnemyUnit) -> Vector2:
	return BattleQueries.enemy_pos(self, e)


func tower_at(pos: Vector2, tolerance: float = 55.0) -> TowerUnit:
	return BattleQueries.tower_at(self, pos, tolerance)


func _tower_by_uid(uid: int) -> TowerUnit:
	return BattleQueries.tower_by_uid(self, uid)


func _tower_alive(uid: int) -> bool:
	return BattleQueries.tower_alive(self, uid)


func _enemy_by_uid(uid: int) -> EnemyUnit:
	return BattleQueries.enemy_by_uid(self, uid)


func _acquire_target(tw: TowerUnit) -> EnemyUnit:
	return BattleTargeting.acquire(self, tw)


func _nearest_path_point(pos: Vector2) -> Dictionary:
	return BattleTargeting.nearest_path_point(self, pos)


func affordable(card_id: String) -> bool:
	return BattleUiQueries.affordable(self, card_id)


func hand_cards() -> Array:
	return BattleUiQueries.hand_cards(self)


func current_wave_number() -> int:
	return BattleUiQueries.current_wave_number(self)


func total_waves() -> int:
	return BattleUiQueries.total_waves(self)


func wave_preview(index: int) -> Array:
	return BattleUiQueries.wave_preview(self, index)


func build_time_left() -> float:
	return BattleUiQueries.build_time_left(self)


func _log(line: String) -> void:
	BattleFeedback.log(self, line)


func _add_floater(pos: Vector2, text: String, color: Color) -> void:
	BattleFeedback.floater(self, pos, text, color)


func _recompute_tower_stats() -> void:
	BattleStats.recompute(self)


func _spawn_enemy(enemy_id: String, path_index: int = 0) -> void:
	BattleSpawn.enemy(self, enemy_id, path_index)
