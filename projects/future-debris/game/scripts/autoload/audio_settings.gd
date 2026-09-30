extends Node
## 音频的**用户意图**（autoload）：总开关与音量。
##
## 为什么与"怎么放音"分开（[Sfx] / [AudioKit]）：这两件事的变更理由不同——
## 播放器因技术原因改（并发上限、缓冲），开关因用户/录制原因改（静音、调音量）。
## 混在一起时，"录一段静音素材"会变成一次资源层改动。

## 是否启用音效。**录像与自动化默认可关**（避免 CI 里出声音，也避免录像带进环境噪声）。
var enabled := true

## 线性音量 0..1。
var volume := 0.8

## 从命令行参数读取初始值：`-- --mute` / `-- --volume=0.5`。
## 为什么走命令行：录像与演示需要**不改代码**就能静音。
func apply_cli() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg == "--mute":
			enabled = false
		elif arg.begins_with("--volume="):
			volume = clampf(float(arg.substr(9)), 0.0, 1.0)

func toggle() -> bool:
	enabled = not enabled
	return enabled
