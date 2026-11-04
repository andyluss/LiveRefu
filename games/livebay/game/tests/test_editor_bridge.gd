# LiveBay Tools · 数据桥冒烟测试
# 运行：godot --headless --path game --script tests/test_editor_bridge.gd
# 规则：TECH-A1（单一数据源）、TECH-B2（验收与不回归）
extends SceneTree

const BridgeClient = preload("res://addons/livebay_tools/bridge_client.gd")


func _initialize() -> void:
	var bridge = BridgeClient.new()
	var data: Dictionary = bridge.read_map()
	var slots: int = data.get("map", {}).get("slots", []).size()
	print("editor bridge read ok=%s slots=%d" % [str(data.get("ok", false)), slots])
	var check: Dictionary = bridge.check()
	print("editor bridge check ok=%s msg=%s" % [str(check.get("ok", false)), str(check.get("message", ""))])
	quit(0 if data.get("ok", false) and check.get("ok", false) and slots == 7 else 1)
