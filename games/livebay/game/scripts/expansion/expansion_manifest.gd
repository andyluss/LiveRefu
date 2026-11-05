# LiveBay · 扩展包清单
# 只解析/校验 pack.json；不加载内容、不执行代码。
class_name LiveBayExpansionManifest
extends RefCounted

const STATES := ["draft", "experimental", "stable", "retired"]

var source := ""
var data: Dictionary = {}


static func load_file(path: String) -> LiveBayResult:
	var manifest := LiveBayExpansionManifest.new()
	manifest.source = path
	if not FileAccess.file_exists(path):
		return LiveBayResult.failure(&"manifest_missing", "找不到 %s" % path)
	var text := FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(text)
	if not parsed is Dictionary:
		return LiveBayResult.failure(&"manifest_json", "JSON 解析失败：%s" % path)
	manifest.data = parsed
	var check := manifest.validate()
	if not check.ok:
		return check
	return LiveBayResult.success("", manifest)


func id() -> String:
	return str(data.get("id", ""))


func group() -> String:
	return str(data.get("variant_group", ""))


func state() -> String:
	return str(data.get("state", "draft"))


func validate() -> LiveBayResult:
	var required := ["schema_version", "id", "name", "version", "state", "layer", "core_api"]
	for key in required:
		if not data.has(key):
			return LiveBayResult.failure(&"manifest_field", "缺少字段 %s（%s）" % [key, source])
	if int(data.schema_version) != 1:
		return LiveBayResult.failure(&"manifest_schema", "schema_version 必须为 1")
	if not STATES.has(state()):
		return LiveBayResult.failure(&"manifest_state", "未知 state：%s" % state())
	if str(data.layer) not in ["L1", "L2", "L3", "CORE"]:
		return LiveBayResult.failure(&"manifest_layer", "未知 layer：%s" % data.layer)
	if group() != "" and not group().contains("."):
		return LiveBayResult.failure(&"manifest_variant", "variant_group 建议形如 L1.shift")
	return LiveBayResult.success("", self)
