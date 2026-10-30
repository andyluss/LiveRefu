extends RefCounted
class_name CampaignProgress
## 战役进度（存档）：**已通关的关卡**与**各关最好评级**。
##
## 为什么现在就要有它：在此之前"进哪一关"是写死的（`LV-ATOMIC-03`），
## 于是"一局打完"没有任何后果——胜与败都不改变下一次能玩什么。
## 战役推进是把单局接成一条线的那个东西，没有它就没有"长期经营"可言。
##
## 存到 `user://`（玩家数据目录），不进版本库：进度是**玩家的事实**，不是工程数据。
## 文件坏了当"全未通关"处理并**保留坏文件**（改名备份），不静默丢弃玩家数据。

const SAVE_PATH := "user://campaign.json"


var cleared: Array[String] = []
var best_grade: Dictionary = {}     # level_id -> 评级字母

## 读档；不存在或损坏时返回空进度（并在损坏时把坏文件改名备份）。
static func load_or_new() -> CampaignProgress:
	var progress := CampaignProgress.new()
	if not FileAccess.file_exists(SAVE_PATH):
		return progress
	var text := FileAccess.get_file_as_string(SAVE_PATH)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		# 坏档：备份而不是覆盖——玩家的进度不该因为一次解析失败就消失
		DirAccess.rename_absolute(SAVE_PATH, SAVE_PATH + ".corrupt")
		return progress
	var data: Dictionary = parsed
	for id in data.get("cleared", []):
		progress.cleared.append(str(id))
	var grades: Dictionary = data.get("best_grade", {})
	for id in grades:
		progress.best_grade[str(id)] = str(grades[id])
	return progress

func save() -> void:
	var payload := {"schemaVersion": 1, "cleared": cleared, "best_grade": best_grade}
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		push_warning("[campaign] 无法写入存档：%s" % SAVE_PATH)
		return
	file.store_string(JSON.stringify(payload, "  "))
	file.close()

func is_cleared(level_id: String) -> bool:
	return cleared.has(level_id)

## **只算不存**：把一次结算合并进内存中的进度。评级只升不降（按 [GRADE_ORDER] 判断）。
##
## 为什么与 `save()` 分开：验收要测这段逻辑，但**测试不该写玩家的存档**
## （而且"算"与"持久化"本来就是两件事，混在一起会让测试带上副作用）。
func merge_result(level_id: String, grade: String, did_clear: bool) -> void:
	if not did_clear:
		return
	if not cleared.has(level_id):
		cleared.append(level_id)
	var previous := str(best_grade.get(level_id, ""))
	if previous == "" or GradeOrder.is_better(grade, previous):
		best_grade[level_id] = grade



## 记录一次结算并落盘（结算界面用这个）。
func record(level_id: String, grade: String, did_clear: bool) -> void:
	merge_result(level_id, grade, did_clear)
	save()

## 某关是否已解锁：第一关永远可玩，其余要求**前一关已通关**。
## 解锁规则写在这里而不是散在界面里——它是一条规则，不是一处显示逻辑。
static func is_unlocked(progress: CampaignProgress, ordered_ids: Array, index: int) -> bool:
	if index <= 0:
		return true
	if index >= ordered_ids.size():
		return false
	return progress.is_cleared(str(ordered_ids[index - 1]))
