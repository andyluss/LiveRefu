extends RefCounted
class_name TableLoader
## 数据表的通用装载（读文件 → 解析 JSON → 取 entries）。
##
## 为什么独立：装载细节（路径拼接、JSON 校验、错误文案）只应有一份，
## 否则每加一张表就复制一段易错的样板代码。

const TABLES_DIR := "res://data/tables"

## 读一张表的 entries；失败时把原因写入 errors 并返回空数组。
static func entries(file_name: String, errors: PackedStringArray) -> Array:
	var path := "%s/%s" % [TABLES_DIR, file_name]
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		errors.append("读不到数据表：%s" % path)
		return []
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY or not (parsed as Dictionary).has("entries"):
		errors.append("数据表结构不对（缺 entries）：%s" % path)
		return []
	return (parsed as Dictionary)["entries"]
