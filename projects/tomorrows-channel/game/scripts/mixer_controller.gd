class_name MixerController
extends Node
## 混音台控制器（M1 骨架）。
##
## 职责：管理频道内 2–3 轨音频（嗡鸣/磁带底噪/雨…），提供音量滑杆与实时生效，数据驱动。
## M1 验收"≥2 轨音量实时生效"（plans/00-project-plan.md §三 M1#5）。
## 轨定义来自 mixer_track 表【待定】；音量 0..1 线性，bus 侧预置 dB 曲线（禁止魔法数）。


## 各轨 id → 当前音量（0..1）。M1 占位（默认 2 轨：嗡鸣 drum / 底噪 hiss）。
var _track_volumes: Dictionary = {}


func _ready() -> void:
	# 骨架占位：M1 接入时在此从 mixer_track 表初始化各轨。
	_track_volumes = {"drone": 0.6, "hiss": 0.4}


## 设置某轨音量（0..1）并实时生效。track_id 见 mixer_track 表。
func set_track_volume(track_id: String, volume: float) -> void:
	var clamped: float = clampf(volume, 0.0, 1.0)
	_track_volumes[track_id] = clamped
	# TODO(M1): 映射到 AudioStreamPlayer 的 volume_db；并广播 EventBus.mixer_volume_changed(track_id, clamped)。


## 读取某轨音量（0..1）。
func get_track_volume(track_id: String) -> float:
	return float(_track_volumes.get(track_id, 0.0))
