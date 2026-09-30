extends Node
## 截图工具（`./run.sh shot <文件名>`）：把主界面渲染到 PNG，**并断言渲染像素确实等于契约色**。
##
## 为什么断言渲染而不只看主题对象：主题对象里 RootBackground 的取值是对的，
## 但**渲染出来可能是另一个色**（背景层没吃到 type variation）——这类偏差
## 只有读像素才能发现。因此立场：**PNG 也是闸门**。
##
## 用 `get_viewport().get_texture().get_image()` 而不依赖系统录屏权限（沿用既有项目做法）。

const BG_POINT := Vector2i(1000, 600)   # 远离内容的空白处，用于采样窗口底色

func _ready() -> void:
	var name := "theme_preview.png"
	var argv := OS.get_cmdline_user_args()
	for arg in argv:
		if not arg.begins_with("--"):
			name = arg
			break
	var result := ThemeIo.load_or_build(false)
	var tokens: TokenSet = result[1]
	var theme: Theme = result[0]
	if theme == null:
		printerr("主题不可用：%s" % str(tokens.errors))
		get_tree().quit(1)
		return
	# 拍**战斗界面**（S4 的证据）：界面自己会套 Shell
	var scene_path := "res://scenes/app/battle.tscn"
	for arg in argv:
		if arg.begins_with("--scene="):
			scene_path = arg.substr(8)
	if scene_path.ends_with("battle.tscn"):
		add_child((load(scene_path) as PackedScene).instantiate())
	else:
		add_child(Shell.build(theme, tokens))
	# 等两帧：第一帧完成布局，第二帧才有最终渲染结果（少等一帧会截到未布局的画面）
	await get_tree().process_frame
	await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var want := tokens.color("--bg-base")
	var got := image.get_pixelv(BG_POINT)
	if got.to_html(false) != want.to_html(false):
		printerr("渲染底色与契约不符：实测 #%s，契约 --bg-base #%s" % [got.to_html(false), want.to_html(false)])
		get_tree().quit(1)
		return
	var err := image.save_png("res://../docs/shots/%s" % name)
	if err != OK:
		printerr("截图写入失败：%s" % error_string(err))
		get_tree().quit(1)
		return
	print("SHOT OK %s（%dx%d，底色 = --bg-base #%s）" % [name, image.get_width(), image.get_height(), want.to_html(false)])
	print("BOOT OK")
	get_tree().quit(0)
