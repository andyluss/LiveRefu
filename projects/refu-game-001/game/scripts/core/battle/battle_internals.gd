extends RefCounted
class_name BattleInternals
## BattleInternals —— 一局的**内部运行时数据**（进度、队列、挑战卡修正）。
##
## 与 BattleState 分开的原因：这些字段只被战斗内部改动，外部（界面/工具）从不读，
## 放在一起会让状态文件超出行数预算——分开后"公开状态"与"内部记账"也一眼可辨。

var uid_counter: int = 1
var spawn_queue: Array[String] = []
var spawn_timer: float = 0.0
var spawn_interval: float = 1.4
var mods: Dictionary = {}      # 挑战卡修正（enemy_hp_mul / ban_card_type / extra_spawn …）
var waves: Array = []          # 本关的波次卡组（来自 WAV-*）


## 分配一个本局唯一的实例 id（塔/敌人/阻挡单位/弹道共用一个命名空间）。
func next_uid() -> int:
	uid_counter += 1
	return uid_counter
