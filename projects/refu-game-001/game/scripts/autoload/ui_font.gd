extends Node
## UiFont —— 中文显示字体。
##
## 为什么不去仓库里塞一个字体二进制：本工作区的中文界面需要 CJK 字体，而 Godot 自带的
## 默认字体（Open Sans 子集）没有汉字，界面会全是方框。这里改为**运行时从系统加载**
## 一款中文字体（macOS 常见路径），并把它设为 ThemeDB 的全局回退字体——
## 于是所有 Control、draw_string 都自动能显示中文，仓库里也不留第三方字体授权问题。
##
## 找不到任何候选字体时不崩：退化为引擎默认字体 + 在控制台给出明确提示。

const CANDIDATES: PackedStringArray = [
	# macOS
	"/System/Library/Fonts/Hiragino Sans GB.ttc",
	"/System/Library/Fonts/STHeiti Medium.ttc",
	"/System/Library/Fonts/STHeiti Light.ttc",
	"/System/Library/Fonts/PingFang.ttc",
	# Linux（CI / 服务器）
	"/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
	"/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
	"/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf",
	# 项目内自带（可选，README 有说明）
	"res://assets/fonts/NotoSansSC-Regular.otf",
	"res://assets/fonts/NotoSansSC-Regular.ttf",
]

const BASE_SIZE := 16

var font: Font = null
var source_path := ""
var is_cjk := false


func _ready() -> void:
	load_font()


## 逐个候选路径尝试加载；成功即设为全局回退字体。
func load_font() -> void:
	for path in CANDIDATES:
		var f := _try_load(path)
		if f != null:
			font = f
			source_path = path
			is_cjk = f.has_char("卡".unicode_at(0)) and f.has_char("阵".unicode_at(0))
			ThemeDB.fallback_font = f
			ThemeDB.fallback_font_size = BASE_SIZE
			print("[UiFont] 使用中文字体：%s（含汉字字形=%s）" % [path, is_cjk])
			return
	push_warning("[UiFont] 未找到任何中文字体候选，界面中文可能显示为方框；"
		+ "可把 NotoSansSC 放进 game/assets/fonts/ 后重启。")


func _try_load(path: String) -> FontFile:
	var absolute := path.begins_with("res://")
	if absolute:
		if not ResourceLoader.exists(path):
			return null
		var res := ResourceLoader.load(path)
		return res as FontFile if res is FontFile else null
	if not FileAccess.file_exists(path):
		return null
	var f := FontFile.new()
	if f.load_dynamic_font(path) != OK:
		return null
	return f


## 取当前字体（供 draw_string 等需要显式字体的地方使用）。
func get_font() -> Font:
	return font if font != null else ThemeDB.fallback_font


func get_font_size() -> int:
	return BASE_SIZE
