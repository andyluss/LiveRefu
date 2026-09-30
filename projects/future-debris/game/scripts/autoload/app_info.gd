extends Node
## 工程自述（autoload）：把"这一版是什么"变成可被脚本读到的常量。
##
## 为什么需要它：无头冒烟与验收需要一个**不依赖任何场景**的入口来证明工程装载正常。
## 这个文件刻意保持极小（≤50 代码行），因为它是 S1 的地基探针，不是玩法代码。

const PROJECT_CODENAME := "future-debris"
const PROJECT_PHASE := "S1 · 工程地基"
const DATA_SCHEMA_VERSION := 1

## 纪元表由数据文件声明；此处只做"骨架是否接上"的探针，不硬编码任何纪元内容。
const ERAS_DIR := "res://data/tables"

func _ready() -> void:
	# 无头/有头都能跑：只打印一行自述，便于在 CI 日志里确认工程装载成功。
	print("[future-debris] %s | phase=%s | schema=v%d" % [PROJECT_CODENAME, PROJECT_PHASE, DATA_SCHEMA_VERSION])

## 供后续脚本查询：数据表目录是否就位（返回相对路径列表，排序稳定）。
func list_data_tables() -> PackedStringArray:
	var out := PackedStringArray()
	var dir := DirAccess.open(ERAS_DIR)
	if dir == null:
		return out
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if not dir.current_is_dir() and name.ends_with(".json"):
			out.append(name)
		name = dir.get_next()
	dir.list_dir_end()
	var sorted := Array(out)
	sorted.sort()
	return PackedStringArray(sorted)
