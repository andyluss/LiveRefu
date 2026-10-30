extends RefCounted
class_name BattleModalLayer
## 用途 ｜ 弹窗遮罩层：统一创建/关闭全屏半透明遮罩，并把面板居中摆放。
## 依赖 ｜ BattleScreen 的 _modal 字段（对外契约：tools/demo_director.gd 与 tools/screenshot.gd 会读它）。

var host


static func create(host_ref) -> BattleModalLayer:
	var p := BattleModalLayer.new()
	p.host = host_ref
	return p


## 开新弹窗前先关掉旧的；遮罩铺满全屏并拦截点击，面板按中心点居中。
func make(panel: Control, width: float, height: float) -> void:
	close()
	var layer := ColorRect.new()
	layer.color = Color(0, 0, 0, 0.62)
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_STOP
	host.add_child(layer)
	panel.position = Vector2((BattleLayout.W - width) * 0.5, (BattleLayout.H - height) * 0.5)
	panel.size = Vector2(width, height)
	layer.add_child(panel)
	host._modal = layer


func close() -> void:
	if host._modal != null and is_instance_valid(host._modal):
		host._modal.queue_free()
	host._modal = null
