extends RefCounted
class_name Sfx
## 音效播放器：把"事件"翻译成"声音"，并尊重用户的静音选择。
##
## 三条设计约束：
##   1. **并发上限**：同一帧里可能发生多件事（清波 + 降级区扩张），若不限量会出现"音墙"；
##   2. **同音去抖**：同一音效在极短时间内重复触发时只播一次（连续排污会让 residue 音叠成噪声）；
##   3. **静音优先**：由 [AudioSettings] 决定，播放器不做例外（录像时也需要能静音）。
##
## 它**不是 Node**：播放器节点由 [SfxHost] 持有，逻辑保持可单测。

const MAX_VOICES := 6
const DEBOUNCE := 0.06

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _last_played: Dictionary = {}
var _clock := 0.0

func setup(parent: Node) -> void:
	for i in MAX_VOICES:
		var player := AudioStreamPlayer.new()
		player.bus = "Master"
		parent.add_child(player)
		_players.append(player)

## 每帧推进时钟（用于去抖）；由宿主节点调用。
func tick(delta: float) -> void:
	_clock += delta

## 播放一个事件音；返回是否真的播放了（便于测试与录像核对）。
func play(event: String) -> bool:
	if not AudioSettings.enabled:
		return false
	if _last_played.has(event) and _clock - float(_last_played[event]) < DEBOUNCE:
		return false
	var stream := AudioKit.stream(event)
	if stream == null:
		return false
	_last_played[event] = _clock
	var player := _players[_next]
	_next = (_next + 1) % _players.size()
	player.stream = stream
	player.volume_db = linear_to_db(clampf(AudioSettings.volume, 0.0, 1.0))
	player.play()
	return true

## 供测试：重置去抖状态。
func reset_debounce() -> void:
	_last_played.clear()
