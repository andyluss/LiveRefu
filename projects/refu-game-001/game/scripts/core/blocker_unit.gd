extends RefCounted
class_name BlockerUnit
## BlockerUnit —— 放在**路径上**的阻挡单位（如 ANV-M03「齿轮帮·路障小队」）。
##
## 阻挡规则（M1 实现裁决 A5，见 docs/01_实现裁决记录.md）：
## 敌人行进到阻挡单位身边时停下交战，直到阻挡单位被摧毁或到期；
## `block` 表示同时能拦住的敌人数（超出的敌人绕过）。

var uid: int = 0
var card_id: String = ""
var name: String = ""
var card: Dictionary = {}
var path_index: int = 0
var along: float = 0.0               # 沿路径里程（决定站位）
var pos: Vector2 = Vector2.ZERO
var hp: float = 0.0
var max_hp: float = 0.0
var block: int = 1
var block_reach: float = 45.0        # 拦截判定半径（像素）
var expires_at: float = -1.0         # <0 表示常驻
var alive: bool = true
var hit_flash_until: float = -1.0
var damage_taken: float = 0.0
# 本 tick 被它拦住的敌人 uid（每 tick 清空重算）
var blocked_uids: Array[int] = []
# 到期后留下的减速场
var residual_slow: float = 0.0
var residual_until: float = -1.0
var residual_radius: float = 0.0
var has_residual: bool = false


func setup(uid_value: int, card_def: Dictionary, path_index_value: int, along_value: float, position: Vector2) -> void:
	uid = uid_value
	card = card_def
	card_id = card_def.get("id", "")
	name = card_def.get("name", "")
	path_index = path_index_value
	along = along_value
	pos = position
	var st: Dictionary = card_def.get("stats", {})
	max_hp = float(st.get("max_hp", 100.0))
	hp = max_hp
	block = int(st.get("block", 1))
	var duration := float(st.get("duration", 0.0))
	expires_at = -1.0  # 由 Battle 按 now + duration 覆盖


func hp_ratio() -> float:
	return 0.0 if max_hp <= 0.0 else clampf(hp / max_hp, 0.0, 1.0)


func is_full() -> bool:
	return blocked_uids.size() >= block


func apply_damage(amount: float, now: float) -> Dictionary:
	hp -= amount
	damage_taken += amount
	hit_flash_until = now + 0.12
	if hp <= 0.0:
		hp = 0.0
		alive = false
	return {"killed": not alive}
