extends RefCounted
class_name DemoScene
## DemoScene —— 演示片的一段：把该段要演的界面实例化进导演节点，并跑它的 on_ready 钩子。

## 返回实例化好的界面节点（失败返回 null）。
static func load_into(director, step: Dictionary) -> Node:
	var packed := load(String(step["scene"]))
	if packed == null:
		push_error("[Demo] 无法加载 %s" % step["scene"])
		return null
	var instance: Node = packed.instantiate()
	director.add_child(instance)
	if step.has("on_ready"):
		(step["on_ready"] as Callable).call(instance)
	return instance


## 推进到下一段；返回实例化好的界面（null = 已放完，导演应收尾）。
static func advance(director, steps: Array) -> Node:
	director.step_index += 1
	director.step_time = 0.0
	if director.step_index >= steps.size():
		return null
	var step: Dictionary = steps[director.step_index]
	if director.current != null and is_instance_valid(director.current):
		director.current.queue_free()
	director.current = null
	director.battle = null
	director.battle_screen = null
	director.autoplay_done = false
	director.post_time = 0.0
	director.last_wave = -1
	director.set_caption(String(step.get("caption", "")))
	director.current = load_into(director, step)
	if director.current != null and bool(step.get("battle", false)):
		director.battle_screen = director.current
		director.battle = director.current.get("battle")
		AppState.speed_multiplier = 4.0
	return director.current


## 时间轴事件：到点就换字幕 / 执行操作（每段只触发一次）。
static func fire_events(director, step: Dictionary) -> void:
	for event in step.get("events", []):
		if event.has("_fired") or director.step_time < float(event["at"]):
			continue
		event["_fired"] = true
		if event.has("caption"):
			director.set_caption(String(event["caption"]))
		if event.has("run"):
			(event["run"] as Callable).call(director.current)
