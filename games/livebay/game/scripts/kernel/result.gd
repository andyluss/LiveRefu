# LiveBay · 结果类型
# 模块边界统一用 Result 表达「成功/拒绝」，不用裸 bool 或抛异常。
# 规则：TECH-A2（模拟与视图分离）、TECH-B1（可逆工程）
class_name LiveBayResult
extends RefCounted

var ok: bool
var code: StringName
var message: String
var data: Variant


func _init(success: bool, result_code: StringName = &"", result_message: String = "", result_data: Variant = null) -> void:
	ok = success
	code = result_code
	message = result_message
	data = result_data


static func success(result_message: String = "", result_data: Variant = null) -> LiveBayResult:
	return LiveBayResult.new(true, &"ok", result_message, result_data)


static func failure(result_code: StringName, result_message: String) -> LiveBayResult:
	return LiveBayResult.new(false, result_code, result_message)
