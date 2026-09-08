class_name ConfigLoader
extends Node
## 配置表加载器（Autoload 单例，工程入口）。
##
## 职责：把 `game/data/tables/` 下导出/派生的配置表 JSON 加载为运行时数据（Dictionary），
## 提供类型化便捷取值，并做 schema 自校验闸门（内容卡强制版权字段等）。
## 数据驱动的权威源约定见 `game/README.md` §一 与 `docs/lead-programmer/01_tech-stack-draft.md` §4.2：
##   - 权威源在 ../../data/tables/（数值策划 A 维护），game/data/ 只放工程加载用的副本/派生；
##   - 字段一律 snake_case；禁止魔法数，常量经数值策划 A 的 schema 冻结；
##   - 每加一条内容 = 新增一条数据、零代码改动。
##
## M1 只加载 meta（全局数值参数，`data/tables/meta.json` 已冻结：pomodoro_work/pomodoro_break/
## focus_min/focus_max/fragment_base_per_tomato）。channel/timer/mixer_track/collectible 表
## 【待定】随 schema 冻结后接入（见 01_tech-stack-draft.md §五）。

## 全局数值参数运行时容器（meta.json）。
var meta: Dictionary = {}

## 加载表 —— meta 表路径（game/data/tables/ 副本；权威源在 ../../data/tables/meta.json）。
const META_PATH: String = "res://data/tables/meta.json"


func _ready() -> void:
	load_all()


## 一次性加载全部 M1 表（当前仅 meta）；其余表接入时在此追加。
func load_all() -> void:
	meta = _load_json_table(META_PATH, "meta")
	# TODO(M1): channel / timer / mixer_track / collectible 表随 schema 冻结后接入。
	# TODO(M1): schema 自校验闸门——按 data/schema/*.schema.json 校验，内容卡强制版权字段（risk 闸门）。


## 读取一张 JSON 配置表，返回 Dictionary；失败时 push_error 并返回空表。
## 表结构应为扁平 object（字段→值）。
func _load_json_table(path: String, table_name: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("ConfigLoader: 配置表不存在 [%s] -> %s" % [table_name, path])
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("ConfigLoader: 无法打开配置表 [%s] -> %s" % [table_name, path])
		return {}
	var text := file.get_as_text()
	var data = JSON.parse_string(text)
	if data == null:
		push_error("ConfigLoader: 配置表 JSON 解析失败 [%s] -> %s" % [table_name, path])
		return {}
	if typeof(data) != TYPE_DICTIONARY:
		push_error("ConfigLoader: 配置表应为 object [%s] -> %s" % [table_name, path])
		return {}
	return data


# ---------------------------------------------------------------------------
# 全局数值参数便捷取值（meta.json，单位 min/frag，见 schema/meta.schema.json）
# ---------------------------------------------------------------------------

## 默认单段专注时长（min）。
func get_pomodoro_work_min() -> int:
	return int(meta.get("pomodoro_work", 25))


## 默认单段休息时长（min）。
func get_pomodoro_break_min() -> int:
	return int(meta.get("pomodoro_break", 5))


## 可调专注时长下限（min）。
func get_focus_min() -> int:
	return int(meta.get("focus_min", 5))


## 可调专注时长上限（min）。
func get_focus_max() -> int:
	return int(meta.get("focus_max", 120))


## 完成一段专注（一个番茄）给予的正反馈碎片初值（frag）。
func get_fragment_base_per_tomato() -> int:
	return int(meta.get("fragment_base_per_tomato", 8))
