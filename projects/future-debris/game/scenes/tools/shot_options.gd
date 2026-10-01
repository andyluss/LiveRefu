extends RefCounted
class_name ShotOptions
## 截图工具的命令行选项（**解析与执行分开**：解析是一段自成一体的逻辑，
## 而它曾经让 screenshot.gd 超出文件预算——那正是"该拆"的信号）。
##
## 选项：
##   `<文件名>`        输出文件名（默认 theme_preview.png；只写进 docs/shots/）
##   `--scene=<路径>`  要拍的场景（默认战斗界面）
##   `--theme`         拍主题预览（等价于不给场景）
##   `--with-summary`  填充一份演示结算摘要（否则结算界面只有空状态）

var name := "theme_preview.png"
var scene_path := "res://scenes/app/battle.tscn"
var with_summary := false

static func parse() -> ShotOptions:
	var opts := ShotOptions.new()
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--scene="):
			opts.scene_path = arg.substr(8)
		elif arg == "--theme":
			opts.scene_path = ""
		elif arg == "--with-summary":
			opts.with_summary = true
		elif not arg.begins_with("--"):
			opts.name = arg
	return opts
