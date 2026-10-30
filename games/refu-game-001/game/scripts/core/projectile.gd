extends RefCounted
class_name Projectile
## Projectile —— 弹道（纯逻辑）。命中判定在到达时由 Battle 结算。

var uid: int = 0
var source_uid: int = 0
var target_uid: int = 0
var pos: Vector2 = Vector2.ZERO
var target_pos: Vector2 = Vector2.ZERO
var speed: float = 900.0
var damage: float = 0.0
var splash: float = 0.0
var armor_ignore: float = 0.0
var color: Color = Color.WHITE
var alive: bool = true
var trail: Array[Vector2] = []
var kind: String = "bullet"          # bullet / beam


func setup(uid_value: int, source: int, target: int, from_pos: Vector2, to_pos: Vector2,
		dmg: float, spd: float, splash_radius: float, armor_ignore_ratio: float, proj_color: Color) -> void:
	uid = uid_value
	source_uid = source
	target_uid = target
	pos = from_pos
	target_pos = to_pos
	damage = dmg
	speed = maxf(spd, 60.0)
	splash = splash_radius
	armor_ignore = armor_ignore_ratio
	color = proj_color
