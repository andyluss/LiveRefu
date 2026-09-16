extends RefCounted
class_name LevelSelectChallenges
## 用途 ｜ 挑战卡列表：难度也是卡（doc 06 第三节），教学关直接拦成一行说明；
##        每张卡显示难度分/掉落加成/白名单校验结果，可「选上 / 取消」。
## 依赖 ｜ GameData.get_level()/challenges/challenge_score_cap()、AppState.challenge_ids/challenge_allowed()、
##        UiKit、LevelSelect（host：增删后回调 _refresh()）。

var host
var _list: VBoxContainer


static func create(host_ref, parent: Control) -> LevelSelectChallenges:
	var p := LevelSelectChallenges.new()
	p.host = host_ref
	p._list = VBoxContainer.new()
	p._list.add_theme_constant_override("separation", 6)
	parent.add_child(p._list)
	return p


func refresh(selected_level: String) -> void:
	for c in _list.get_children():
		_list.remove_child(c)
		c.queue_free()
	var level := GameData.get_level(selected_level)
	var allowed_here := bool(level.get("challenges_allowed", false))
	if not allowed_here:
		_list.add_child(UiKit.label(
			"本关为教学关，不开放挑战卡（doc 06 第四节：可读性是第一难度参数）。",
			UiKit.FS_SMALL, UiKit.TEXT_DIM))
		return
	var total_score := 0
	for cid in AppState.challenge_ids:
		total_score += int(GameData.challenges.get(cid, {}).get("score", 0))
	for cid in GameData.challenges.keys():
		var ch: Dictionary = GameData.challenges[cid]
		var picked := AppState.challenge_ids.has(cid)
		var check := AppState.challenge_allowed(cid)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_child(UiKit.label("%s　难度分 %d　掉落 +%d%%" % [ch.get("name", ""), int(ch.get("score", 0)),
			int(float(ch.get("reward", {}).get("drop", 0.0)) * 100.0)], UiKit.FS_BODY, UiKit.TEXT))
		var sub := String(ch.get("desc", ""))
		if not bool(check["ok"]):
			sub += "　⛔ " + String(check["reason"])
		info.add_child(UiKit.label(sub, UiKit.FS_TINY, UiKit.TEXT_DIM if bool(check["ok"]) else UiKit.DANGER))
		row.add_child(info)
		var btn := UiKit.ghost_button("取消" if picked else "选上", UiKit.FS_SMALL,
			UiKit.AMBER if picked else UiKit.LINE)
		btn.custom_minimum_size = Vector2(76, 40)
		btn.disabled = (not picked) and (not bool(check["ok"]))
		btn.pressed.connect(func():
			if picked:
				AppState.challenge_ids.erase(cid)
			else:
				AppState.challenge_ids.append(cid)
			host._refresh())
		row.add_child(btn)
		_list.add_child(row)
	var score_row := HBoxContainer.new()
	score_row.add_child(UiKit.label("已选难度分合计 %d / 上限 %d　→　掉落系数 ×%.2f"
		% [total_score, GameData.challenge_score_cap(), minf(2.0, 1.0 + 0.05 * total_score)],
		UiKit.FS_SMALL, UiKit.PURPLE))
	_list.add_child(score_row)
