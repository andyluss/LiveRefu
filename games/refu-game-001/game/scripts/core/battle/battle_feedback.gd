extends RefCounted
class_name BattleFeedback
## BattleFeedback —— 给表现层看的**反馈数据**：飘字与文本日志。
##
## 纯静态工具：不改战斗状态，只往 bt.floaters / bt.log_lines 里追加。这样"表现"与"结算"
## 之间只有单向依赖，战斗逻辑永远不会因为界面想画什么而改变。

const FLOATER_TTL := 1.1
const FLOATERS_CAP := 64
const LOG_CAP := 200


static func floater(bt: BattleState, pos: Vector2, text: String, color: Color) -> void:
	bt.floaters.append({"pos": pos, "text": text, "color": color, "born": bt.t, "ttl": FLOATER_TTL})
	if bt.floaters.size() > FLOATERS_CAP:
		bt.floaters.pop_front()


static func log(bt: BattleState, line: String) -> void:
	bt.log_lines.append({"t": bt.t, "text": line})
	if bt.log_lines.size() > LOG_CAP:
		bt.log_lines.pop_front()


## 每 tick 清理过期飘字（表现层只负责画）。
static func cleanup(bt: BattleState) -> void:
	var kept: Array = []
	for f in bt.floaters:
		if bt.t - float(f["born"]) < float(f["ttl"]):
			kept.append(f)
	bt.floaters = kept


## 阵营代表色（弹道/血条用；表现层也可以读它，保证同一阵营到处一个颜色）。
static func tower_color(tw: TowerUnit) -> Color:
	match tw.faction:
		"ANV": return Color(0.31, 0.66, 0.85)
		"TID": return Color(0.36, 0.94, 0.75)
		"AST": return Color(0.37, 0.89, 0.84)
	return Color.WHITE
