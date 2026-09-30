extends Node
## 音效宿主（autoload）：持有 [Sfx] 播放器，让任意场景都能发声，且**跨场景保持静音选择**。
##
## 为什么是 autoload 而不是每个场景自己建：录像、演示、正式对局都要发声；
## 若每个场景各建一套播放器，"静音"与"音量"就得各记一份（必然不一致）。

var sfx := Sfx.new()

func _ready() -> void:
	sfx.setup(self)

func _process(delta: float) -> void:
	sfx.tick(delta)

## 便捷入口：`SfxHost.play("place")`。
func play(event: String) -> bool:
	return sfx.play(event)
