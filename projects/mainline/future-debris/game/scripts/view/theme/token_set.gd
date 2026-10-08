extends RefCounted
class_name TokenSet
## 读取**机器可读的 token 副本**（`res://data/tokens.json`）。
##
## 为什么引擎侧不直接解析 Markdown：契约文档是给人读的（权威），
## 引擎需要的是可解析的数据。两者由 `tools/check_tokens.py` 强制一致——
## 这样"文档改了、引擎没改"这种漂移会在闸门里失败，而不是变成界面上一个说不清的颜色。

const PATH := "res://data/tokens.json"

var colors: Dictionary = {}      # token 名 -> Color
var sizes: Dictionary = {}       # 层级名 -> 字号(px)
var weights: Dictionary = {}     # 层级名 -> 字重
var spacing: PackedInt32Array = PackedInt32Array()
var radius: Dictionary = {}      # control / panel
var stroke: Dictionary = {}      # control / focus / focusOffset
var motion: Dictionary = {}      # dur-fast / ease-standard ...
var families: PackedStringArray = PackedStringArray()
var errors: PackedStringArray = PackedStringArray()

static func load_default() -> TokenSet:
	var tokens := TokenSet.new()
	var text := FileAccess.get_file_as_string(PATH)
	if text.is_empty():
		tokens.errors.append("读不到 token 副本：%s" % PATH)
		return tokens
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		tokens.errors.append("token 副本不是合法 JSON 对象")
		return tokens
	tokens._ingest(parsed as Dictionary)
	return tokens

func _ingest(data: Dictionary) -> void:
	for name in data.get("colors", {}):
		colors[name] = Color(str(data["colors"][name]))
	for row in data.get("typeScale", []):
		sizes[row["token"]] = int(row["size"])
		weights[row["token"]] = int(row["weight"])
	spacing = PackedInt32Array(data.get("spacing", {}).get("scale", []))
	radius = data.get("radius", {})
	stroke = data.get("stroke", {})
	motion = data.get("motion", {})
	families = PackedStringArray(data.get("fonts", {}).get("families", []))

## 取色；未定义时返回洋红（**刺眼的错误色**）并记错——
## 用"看起来还行"的兜底色会让缺 token 一直不被发现。
func color(name: String) -> Color:
	if colors.has(name):
		return colors[name]
	errors.append("缺少颜色 token：%s" % name)
	return Color.MAGENTA

func size(level: String) -> int:
	if sizes.has(level):
		return int(sizes[level])
	errors.append("缺少字号层级：%s" % level)
	return 0
