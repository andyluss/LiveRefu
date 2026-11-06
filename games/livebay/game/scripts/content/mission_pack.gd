# LiveBay · 任务包
# 把一次任务需要的内容（地图/波次/职业/塔/敌人/平衡）收成一个带版本和哈希的包。
# 当前仍是内存包；后续可替换为编译产物，不改模块接口。
class_name LiveBayMissionPack
extends RefCounted

const SCHEMA_VERSION := 2

var data: Dictionary
var manifest: Dictionary


static func build(game_data: Dictionary, pack_id := "livebay.bay01", version := "0.2.0") -> LiveBayMissionPack:
	var pack := LiveBayMissionPack.new()
	pack.data = game_data
	var payload := {
		"map": game_data.get("map", {}),
		"waves": game_data.get("waves", []),
		"profession": game_data.get("profession", {}),
		"towers": game_data.get("towers", []),
		"enemies": game_data.get("enemies", []),
		"balance": game_data.get("balance", {}),
	}
	pack.manifest = {
		"schema_version": SCHEMA_VERSION,
		"pack_id": pack_id,
		"map_id": str(game_data.get("map_id", "")),
		"version": version,
		"hash": "sha256:" + JSON.stringify(payload).sha256_text(),
	}
	pack.data["pack_manifest"] = pack.manifest
	return pack


func validate() -> LiveBayResult:
	var map: Dictionary = data.get("map", {})
	if map.is_empty():
		return LiveBayResult.failure(&"pack_map_missing", "任务包缺少地图")
	if not (map.get("path", []) is Array) or map.get("path", []).size() < 2:
		return LiveBayResult.failure(&"pack_path_short", "地图路径至少 2 点")
	if not (map.get("slots", []) is Array) or map.get("slots", []).is_empty():
		return LiveBayResult.failure(&"pack_slots_empty", "地图至少 1 个塔位")
	if data.get("waves", []).is_empty():
		return LiveBayResult.failure(&"pack_waves_empty", "任务包没有波次")
	if data.get("towers", []).is_empty() or data.get("enemies", []).is_empty():
		return LiveBayResult.failure(&"pack_roster_empty", "任务包没有塔或敌人")
	if not manifest.has("schema_version") or int(manifest.schema_version) != SCHEMA_VERSION:
		return LiveBayResult.failure(&"pack_schema", "schema_version 不匹配")
	if str(manifest.get("map_id", "")) != str(map.get("id", "")):
		return LiveBayResult.failure(&"pack_map_mismatch", "清单 map_id 与地图不一致")
	return LiveBayResult.success("任务包有效", manifest)
