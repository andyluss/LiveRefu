extends RefCounted
class_name CardInstance
## 一张**已放置的卡**（运行期状态：落点、所在回合、本局累积）。
## 与 CardData 分离的理由：同一张卡的多次放置是不同实例，且实例状态可被 S3 的规则卡改写。

var data: CardData
var slot: int          # 塔位下标；-1 表示尚未放置
var placed_turn: int
var accumulated_residue: int   # 该实例到目前为输入降级区的残渣总量

func _init(card_data: CardData, at_slot: int, turn: int) -> void:
	data = card_data
	slot = at_slot
	placed_turn = turn
	accumulated_residue = 0
