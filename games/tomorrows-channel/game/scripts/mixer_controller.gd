class_name MixerController
extends Node
## 混音台控制器（M1 骨架）。
##
## 职责：管理频道内 2–3 轨音频（嗡鸣/磁带底噪/雨…），提供音量滑杆与实时生效，数据驱动。
## M1 验收"≥2 轨音量实时生效"（plans/00-project-plan.md §三 M1#5）。
## 轨定义来自 mixer_track 表；音量 0..1 线性，bus 侧预置 dB 曲线（禁止魔法数）。
## UI（mixer_panel）经 event_bus.mixer_volume_changed 广播音量，本控制器订阅后写入内存音量。

## 当前频道 id（M1 = "tape_warm"）。
var channel_id: String = "tape_warm"

## 所有轨定义（从 mixer_track 表派生，Array[Dictionary]）。
var tracks: Array = []

## 各轨 id → 当前音量（0..1）。经 event_bus 变更。
var _track_volumes: Dictionary = {}


func _ready() -> void:
	# 数据驱动：从 mixer_track 表初始化各轨音量（该表已由 config_loader 加载）。
	_load_tracks()
	# 订阅 UI 音量广播（UI 层不直接操作逻辑层）。
	event_bus.mixer_volume_changed.connect(_on_mixer_volume_changed)


## 从 mixer_track 表（config_loader）装载当前频道各轨与默认音量。
func _load_tracks() -> void:
	if config_loader == null:
		return
	tracks = config_loader.get_mixer_tracks(channel_id)
	_track_volumes.clear()
	for t in tracks:
		if t is Dictionary:
			var tid: String = t.get("track_id", "")
			if tid != "":
				_track_volumes[tid] = float(t.get("default_volume", 0.5))


## 设置某轨音量（0..1）并实时生效。track_id 见 mixer_track 表。
func set_track_volume(track_id: String, volume: float) -> void:
	var clamped: float = clampf(volume, 0.0, 1.0)
	_track_volumes[track_id] = clamped
	# TODO(M1): 映射到 AudioStreamPlayer 的 volume_db；并广播 event_bus.mixer_volume_changed(track_id, clamped)。
	event_bus.mixer_volume_changed.emit(track_id, clamped)


## 响应 UI 滑杆（event_bus.mixer_volume_changed）→ 写入内存音量（唯一真值）。
func _on_mixer_volume_changed(track_id: String, volume: float) -> void:
	_track_volumes[track_id] = clampf(volume, 0.0, 1.0)


## 读取某轨音量（0..1）。
func get_track_volume(track_id: String) -> float:
	return float(_track_volumes.get(track_id, 0.0))


## 当前频道全部轨 id。
func get_track_ids() -> Array:
	var ids: Array = []
	for tid in _track_volumes.keys():
		ids.append(tid)
	return ids
