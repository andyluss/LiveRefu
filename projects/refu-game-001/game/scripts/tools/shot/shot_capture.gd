extends RefCounted
class_name ShotCapture
## ShotCapture —— 把当前视口存成 PNG（引擎内截图，不依赖 macOS 录屏权限）。

static func save_png(viewport: Viewport, out_path: String) -> bool:
	var image := viewport.get_texture().get_image()
	var err := image.save_png(out_path)
	if err != OK:
		push_error("[screenshot] 保存失败 %s（err=%d）" % [out_path, err])
		return false
	print("[screenshot] 已保存 %s （%dx%d）" % [out_path, image.get_width(), image.get_height()])
	return true
