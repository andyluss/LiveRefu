extends RefCounted
class_name BattleBlocking
## BattleBlocking —— 路径阻挡：到期退场、找可拦的阻挡单位、交战结算。
## 裁决 A5：只有路径阻挡单位会拦住敌人（block = 同时能拦住的敌人数）。

## 阻挡单位到期（ANV-M03：存在 15s，on_expire 留下 3s 残留减速）。
static func expire_blockers(bt: BattleState) -> void:
	for b in bt.blockers:
		if b.alive and b.expires_at >= 0.0 and bt.t >= b.expires_at:
			b.alive = false
			BattleDestroy.blocker_expired(bt, b)


## 找阻挡单位：同路径、距离在拦截范围内、且还有阻挡额度（或已经在拦它）。
static func find_blocker(bt: BattleState, e: EnemyUnit, reach: float) -> BlockerUnit:
	for b in bt.blockers:
		if not b.alive or b.path_index != e.path_index:
			continue
		if absf(b.along - e.distance) > reach + 20.0:
			continue
		if b.blocked_uids.has(e.uid) or not b.is_full():
			return b
	return null


static func engage_blocker(bt: BattleState, e: EnemyUnit, b: BlockerUnit, dt: float) -> void:
	if not b.blocked_uids.has(e.uid):
		b.blocked_uids.append(e.uid)
	e.attacking_uid = b.uid
	e.attack_cd -= dt
	if e.attack_cd > 0.0:
		return
	e.attack_cd = 1.0 / maxf(e.attack_speed, 0.01)
	e.damage_dealt_total += e.attack
	BattleFeedback.floater(bt, b.pos, "-%d" % int(e.attack), Color(1.0, 0.45, 0.35))
	if b.apply_damage(e.attack, bt.t)["killed"]:
		BattleDestroy.blocker(bt, b)
