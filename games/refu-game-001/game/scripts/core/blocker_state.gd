extends RefCounted
class_name BlockerState
## BlockerState —— 路径阻挡单位的**状态字段**（只有数据）。
## 阻挡规则（裁决 A5）：敌人行进到阻挡单位身边会停下交战，`block` 是同时能拦住的敌人数。

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
var blocked_uids: Array[int] = []
var residual_slow: float = 0.0
var residual_until: float = -1.0
var residual_radius: float = 0.0
var has_residual: bool = false
