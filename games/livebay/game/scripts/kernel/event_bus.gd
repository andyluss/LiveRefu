# LiveBay · 事件总线
# 事件是「已经发生的事实」。带序号/来源/载荷，供视图、黑匣子、诊断订阅。
class_name LiveBayEventBus
extends RefCounted

var seq := 0
var tick := 0
var _subscribers: Dictionary = {}
var _all_subscribers: Array = []


func subscribe(type: StringName, callback: Callable) -> void:
	if not _subscribers.has(type):
		_subscribers[type] = []
	_subscribers[type].append(callback)


func subscribe_all(callback: Callable) -> void:
	_all_subscribers.append(callback)


func emit_event(type: StringName, payload: Dictionary = {}, source: StringName = &"") -> Dictionary:
	seq += 1
	var envelope := {
		"seq": seq,
		"tick": tick,
		"type": type,
		"source": source,
		"payload": payload.duplicate(true),
	}
	for callback in _subscribers.get(type, []).duplicate():
		if callback.is_valid():
			callback.call(envelope)
	for callback in _all_subscribers.duplicate():
		if callback.is_valid():
			callback.call(envelope)
	return envelope


func clear() -> void:
	_subscribers.clear()
	_all_subscribers.clear()
	seq = 0
