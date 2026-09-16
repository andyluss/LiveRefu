extends RefCounted
class_name BattleQueries
## BattleQueries —— 场上对象的**只读查表**（静态，不改任何状态）。
##
## 门面在 battle_api.gd（面对外部的稳定接口），实现放这里：于是"界面/工具要什么"
## 与"怎么算出来"分开——改查表实现不会动到界面调用点。

## 敌人当前的世界坐标（抵达终点后停在终点）。
static func enemy_pos(bt: BattleState, e: EnemyUnit) -> Vector2:
	if e.reached_end:
		var path := bt.paths[e.path_index]
		return path.point_at(path.total_length)
	return bt.paths[e.path_index].point_at(e.distance)


static func tower_by_uid(bt: BattleState, uid: int) -> TowerUnit:
	for tw in bt.towers:
		if tw.uid == uid:
			return tw
	return null


static func enemy_by_uid(bt: BattleState, uid: int) -> EnemyUnit:
	for e in bt.enemies:
		if e.uid == uid:
			return e
	return null


static func tower_alive(bt: BattleState, uid: int) -> bool:
	var tw := tower_by_uid(bt, uid)
	return tw != null and tw.alive


## 离给定点最近且在容差内的塔（放置/点选时用）。
static func tower_at(bt: BattleState, pos: Vector2, tolerance: float) -> TowerUnit:
	var best: TowerUnit = null
	var best_d := tolerance
	for tw in bt.towers:
		if not tw.alive:
			continue
		var d := tw.pos.distance_to(pos)
		if d <= best_d:
			best = tw
			best_d = d
	return best
