extends RefCounted
class_name LoopVerify
## **一局闭环的端到端验收**：关卡选择 → 战斗 → 结算 → 存档 → 再读回。
##
## 为什么必须有它（与"场景能装载"是两回事）：
## 三个场景各自 `instantiate` 成功，只证明它们的脚本能编译；
## **接得上**是另一类事实——`CampaignSelection` 有没有被正确写入、
## 结算有没有把这一局记进存档、存档读回来是否一致。
## 这类断链不会报错，只会表现为"打赢了但进度没变"。
##
## 它**不写真实存档**（用临时路径），也不触碰玩家数据。

## 返回 {ok, checks, errors}。
static func run() -> Dictionary:
	var checks: Array[String] = []
	var errors: Array[String] = []
	var battle := CaseBase.new_battle()
	_check(errors, checks, battle != null, "能建立一局战斗（基线卡组）")
	var summary := CardFlow.summarize(battle)
	# 结算界面依赖这些字段：缺一个就会显示成 0 或空
	var required := ["cleared", "grade", "turns", "base_hp", "base_hp_max",
		"waves_cleared", "waves_total", "cards_played", "residue_total"]
	var missing := PackedStringArray()
	for field in required:
		if not summary.has(field):
			missing.append(field)
	_check(errors, checks, missing.is_empty(),
		"结算摘要含结算界面需要的全部字段（缺：%s）" % ", ".join(missing))

	# 存档往返：写入 → 读回 → 一致
	var progress := CampaignProgress.new()
	progress.merge_result("LV-ATOMIC-01", "S", true)
	progress.merge_result("LV-ATOMIC-02", "C", false)
	var restored := _round_trip(progress)
	_check(errors, checks, restored.is_cleared("LV-ATOMIC-01"), "存档往返后仍记得已通关的关卡")
	_check(errors, checks, not restored.is_cleared("LV-ATOMIC-02"), "未通关的一局不会被记进存档")
	_check(errors, checks, str(restored.best_grade.get("LV-ATOMIC-01", "")) == "S",
		"存档往返后仍记得最好评级")
	_check(errors, checks, _unlock_chain(restored), "通关第一关后，第二关在存档读回后依然解锁")
	return {"ok": errors.is_empty(), "checks": checks, "errors": errors}

## 逐个实例化闭环上的场景，返回**无法实例化**的路径（空数组表示都正常）。
## 注意：它只实例化、不挂到树上——挂上去会触发各界面自己的 `_ready` 与场景切换，
## 在闸门里不应该发生（那会把验收变成"真的玩一遍"）。
static func scenes_instantiable(paths: Array) -> PackedStringArray:
	var broken := PackedStringArray()
	for path in paths:
		var packed := load(str(path)) as PackedScene
		if packed == null:
			broken.append(str(path))
			continue
		var instance := packed.instantiate()
		if instance == null:
			broken.append(str(path))
		else:
			instance.free()   # 立即释放：不挂树、不进主循环
	return broken

## 写入临时文件再读回（**不用真实存档**：验收不该动玩家数据）。
static func _round_trip(progress: CampaignProgress) -> CampaignProgress:
	var path := "user://loop_verify_tmp.json"
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify({"schemaVersion": 1, "cleared": progress.cleared,
		"best_grade": progress.best_grade}))
	file.close()
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	DirAccess.remove_absolute(path)
	var out := CampaignProgress.new()
	if typeof(parsed) != TYPE_DICTIONARY:
		return out
	var data: Dictionary = parsed
	for id in data.get("cleared", []):
		out.cleared.append(str(id))
	var grades: Dictionary = data.get("best_grade", {})
	for id in grades:
		out.best_grade[str(id)] = str(grades[id])
	return out

static func _unlock_chain(progress: CampaignProgress) -> bool:
	var ordered: Array = ["LV-ATOMIC-01", "LV-ATOMIC-02", "LV-ATOMIC-03"]
	return CampaignProgress.is_unlocked(progress, ordered, 1) \
		and not CampaignProgress.is_unlocked(progress, ordered, 2)

static func _check(errors: Array[String], checks: Array[String], passed: bool, label: String) -> void:
	checks.append(("OK   " if passed else "FAIL ") + label)
	if not passed:
		errors.append(label)
