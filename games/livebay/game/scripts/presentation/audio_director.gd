# LiveBay · 音效导演
# 只播放短音效；不参与规则，不阻塞模拟。
class_name LiveBayAudioDirector
extends Node

const STREAMS := {
	"ui": preload("res://assets/audio/ui_click.wav"),
	"build": preload("res://assets/audio/build.wav"),
	"upgrade": preload("res://assets/audio/upgrade.wav"),
	"sell": preload("res://assets/audio/sell.wav"),
	"checklist": preload("res://assets/audio/checklist.wav"),
	"fault": preload("res://assets/audio/fault.wav"),
	"degraded": preload("res://assets/audio/degraded.wav"),
	"broadcast": preload("res://assets/audio/broadcast.wav"),
	"win": preload("res://assets/audio/win.wav"),
	"lost": preload("res://assets/audio/lost.wav"),
}

const MUSIC := {
	"prep": preload("res://assets/audio/music_prep.wav"),
	"wave": preload("res://assets/audio/music_wave.wav"),
	"result": preload("res://assets/audio/music_result.wav"),
}

var muted := false
var _players: Array[AudioStreamPlayer] = []
var _music: AudioStreamPlayer
var music_key := ""


func _ready() -> void:
	for i in range(4):
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_players.append(p)
	_music = AudioStreamPlayer.new()
	_music.volume_db = -16.0
	add_child(_music)


func play_music(key: String) -> void:
	if muted or not MUSIC.has(key) or _music == null:
		return
	if music_key == key and _music.playing:
		return
	music_key = key
	_music.stream = MUSIC[key]
	_music.play()


func stop_music() -> void:
	music_key = ""
	if _music != null:
		_music.stop()


func set_muted(value: bool) -> void:
	muted = value
	if _music == null:
		return
	if muted:
		_music.stop()
	elif music_key != "" and not _music.playing:
		_music.play()


func play(key: String) -> void:
	if muted or not STREAMS.has(key):
		return
	for player in _players:
		if not player.playing:
			player.stream = STREAMS[key]
			player.play()
			return
	# 所有通道都在响：复用第一个，不排队堆积。
	_players[0].stream = STREAMS[key]
	_players[0].play()
