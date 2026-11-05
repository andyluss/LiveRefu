# LiveBay · 游戏输入翻译
# 把原始 InputEvent 翻译成「视图动作」；不直接改 Sim，执行仍在 main/runtime。
class_name LiveBayGameInput
extends RefCounted

const ACTIONS := {
	KEY_1: "select_tower:0",
	KEY_2: "select_tower:1",
	KEY_3: "select_tower:2",
	KEY_SPACE: "start_wave",
	KEY_P: "pause",
	KEY_TAB: "speed",
	KEY_R: "restart",
	KEY_U: "upgrade",
	KEY_X: "sell",
	KEY_ESCAPE: "clear",
}


static func translate(event: InputEvent, slot_at: Callable, tower_count: int) -> Dictionary:
	if event is InputEventMouseMotion:
		return {"type": "hover", "slot": int(slot_at.call(event.position))}
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			var slot := int(slot_at.call(event.position))
			return {"type": "click_slot" if slot >= 0 else "clear", "slot": slot}
		if event.button_index == MOUSE_BUTTON_RIGHT:
			return {"type": "clear"}
		return {"type": "none"}
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in ACTIONS:
			var action := str(ACTIONS[event.keycode])
			if action.begins_with("select_tower:"):
				var index := int(action.get_slice(":", 1))
				if index < tower_count:
					return {"type": "select_tower", "index": index}
				return {"type": "none"}
			return {"type": action}
	return {"type": "none"}
