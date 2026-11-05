# LiveBay · 命令总线
# 视图只发命令；命令处理器返回 LiveBayResult，拒绝必须带原因。
class_name LiveBayCommandBus
extends RefCounted

var _handlers: Dictionary = {}


func register(command: StringName, handler: Callable) -> void:
	_handlers[command] = handler


func has(command: StringName) -> bool:
	return _handlers.has(command)


func clear() -> void:
	_handlers.clear()


func dispatch(command: StringName, payload: Dictionary = {}) -> LiveBayResult:
	if not _handlers.has(command):
		return LiveBayResult.failure(&"unknown_command", "未知命令：%s" % command)
	var out: Variant = _handlers[command].call(payload)
	if out is LiveBayResult:
		return out
	if out is bool:
		return LiveBayResult.success() if out else LiveBayResult.failure(&"rejected", "命令被拒绝")
	return LiveBayResult.success("", out)
