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

## 频道表（channel.json，Array[Dictionary]）。
var channels: Array = []

## 计时时段表（timer.json，Array[Dictionary]）。
var timer_sessions: Array = []

## 混音轨表（mixer_track.json，Array[Dictionary]）。
var mixer_tracks: Array = []

## 内容卡表（content_card.json，Array[Dictionary]；含数值位 rarity/collect_frag + 嵌套版权块 copyright）。
## 权威源在 ../../data/tables/content_card.json（数值策划 A 已建，见 data/schema/content_card.schema.json
## §copyright 契约）；本副本为工程加载用（已派生，随权威源更新重派生）。
var content_cards: Array = []

## 加载表路径（game/data/tables/ 副本；权威源在 ../../data/tables/）。
const META_PATH: String = "res://data/tables/meta.json"
const CHANNEL_PATH: String = "res://data/tables/channel.json"
const TIMER_PATH: String = "res://data/tables/timer.json"
const MIXER_TRACK_PATH: String = "res://data/tables/mixer_track.json"
const CONTENT_CARD_PATH: String = "res://data/tables/content_card.json"


func _ready() -> void:
	load_all()


## 一次性加载全部 M1 表（meta / channel / timer / mixer_track / content_card）。
## 权威副本在 game/data/tables/（由 ../../data/tables/ 派生，数值策划 A 维护）。
func load_all() -> void:
	meta = _load_json_table(META_PATH, "meta")
	channels = _load_json_table(CHANNEL_PATH, "channel")
	timer_sessions = _load_json_table(TIMER_PATH, "timer")
	mixer_tracks = _load_json_table(MIXER_TRACK_PATH, "mixer_track")
	content_cards = _load_json_table(CONTENT_CARD_PATH, "content_card")
	# TODO(M2): collectible 表随内容管线接入。
	# TODO(M1): schema 自校验闸门——按 data/schema/*.schema.json 校验，内容卡强制版权字段（risk 闸门）。


## 读取一张 JSON 配置表，返回 Dictionary 或 Array（取决于表是 object 还是 array）；
## 失败时 push_error 并返回空表。
func _load_json_table(path: String, table_name: String) -> Variant:
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
	if typeof(data) != TYPE_DICTIONARY and typeof(data) != TYPE_ARRAY:
		push_error("ConfigLoader: 配置表应为 object 或 array [%s] -> %s" % [table_name, path])
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


# ---------------------------------------------------------------------------
# 频道表便捷取值（channel.json，Array[Dictionary]）
# ---------------------------------------------------------------------------

## 按 channel_id 取频道记录；不存在时返回空字典。
func get_channel(channel_id: String) -> Dictionary:
	for c in channels:
		if c is Dictionary and c.get("channel_id", "") == channel_id:
			return c
	return {}


## 全部频道列表（Array[Dictionary]）。
func get_all_channels() -> Array:
	return channels


## 频道中文名（channel_id 不存在时回退空串）。
func get_channel_name(channel_id: String) -> String:
	var c := get_channel(channel_id)
	return String(c.get("name_zh", ""))


# ---------------------------------------------------------------------------
# 计时时段表便捷取值（timer.json，Array[Dictionary]）
# ---------------------------------------------------------------------------

## 按 timer_id 取时段记录；不存在时返回空字典。
func get_timer(timer_id: String) -> Dictionary:
	for t in timer_sessions:
		if t is Dictionary and t.get("timer_id", "") == timer_id:
			return t
	return {}


## 取指定 mode（"focus" / "break"）的默认时段记录。
func get_timer_by_mode(mode: String) -> Dictionary:
	for t in timer_sessions:
		if t is Dictionary and t.get("mode", "") == mode:
			return t
	return {}


## 专注段时长（min）：优先 timer 表 focus 项的 duration_min，兜底 meta.pomodoro_work。
func get_focus_minutes() -> int:
	var focus_timer := get_timer_by_mode("focus")
	if not focus_timer.is_empty():
		return int(focus_timer.get("duration_min", get_pomodoro_work_min()))
	return get_pomodoro_work_min()


# ---------------------------------------------------------------------------
# 混音轨表便捷取值（mixer_track.json，Array[Dictionary]）
# ---------------------------------------------------------------------------

## 取指定频道（channel_id）的全部混音轨（Array[Dictionary]）。
func get_mixer_tracks(channel_id: String) -> Array:
	var result: Array = []
	for t in mixer_tracks:
		if t is Dictionary and t.get("channel_id", "") == channel_id:
			result.append(t)
	return result


# ---------------------------------------------------------------------------
# 内容卡表便捷取值（content_card.json，Array[Dictionary]）
# ---------------------------------------------------------------------------

## 取指定内容卡 id 的卡记录；不存在时返回空字典。
## 卡记录含：id/type/title/body/art/duration + 强制版权字段（source/license/license_url/status）
## + 数值位（rarity/collect_frag）。字段契约见 data/schema/content_card*.schema.json。
func get_content_card(card_id: String) -> Dictionary:
	for c in content_cards:
		if c is Dictionary and c.get("id", "") == card_id:
			return c
	return {}


## 全部内容卡列表（Array[Dictionary]，M1 最小卡池）。
func get_content_card_pool() -> Array:
	return content_cards
