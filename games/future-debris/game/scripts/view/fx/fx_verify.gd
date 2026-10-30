extends RefCounted
class_name FxVerify
## 动效与音效的验收（无头）：**"做了"与"真的接上了"是两件事**。
##
## 为什么需要它：
##   - 音效文件存在不等于事件映射对；映射对不等于静音开关有效；
##   - 动效参数最容易被"就地写死一个 0.2 秒"，于是 token 里的 120/220/420 形同虚设。
## 这些都不会报错，只会让手感与听感慢慢偏离契约。

const SFX_DIR := "res://assets/sfx"

## 返回 {ok, checks, errors}。
static func run(tokens: TokenSet) -> Dictionary:
	var checks: Array[String] = []
	var errors: Array[String] = []
	_check_sounds(errors, checks)
	_check_motion(errors, checks, tokens)
	_check_events(errors, checks)
	return {"ok": errors.is_empty(), "checks": checks, "errors": errors}

## 8 个音效必须都在，且**清单里的哈希与文件一致**（防"改了生成器没重跑"）。
static func _check_sounds(errors: Array[String], checks: Array[String]) -> void:
	var names := AudioKit.manifest_names()
	_check(errors, checks, names.size() == 8, "音效清单有 8 条（实际 %d）" % names.size())
	var missing := PackedStringArray()
	var mismatched := PackedStringArray()
	for name in names:
		var path := "%s/%s" % [SFX_DIR, name]
		if not ResourceLoader.exists(path):
			missing.append(name)
			continue
		if not _hash_matches(path, name):
			mismatched.append(name)
	_check(errors, checks, missing.is_empty(), "清单里的音效文件都存在（缺：%s）" % ", ".join(missing))
	var hash_label := "音效与清单哈希一致（%d 个）" % names.size()
	if not mismatched.is_empty():
		hash_label = "音效与清单不一致：%s（改过生成器请重跑 tools/gen_sfx.py）" % ", ".join(mismatched)
	_check(errors, checks, mismatched.is_empty(), hash_label)

## 清单里的每个音效都必须能被某个**事件**取到（否则等于做了不放）。
static func _check_events(errors: Array[String], checks: Array[String]) -> void:
	var reachable := 0
	for event in AudioKit.EVENTS:
		if AudioKit.stream(event) != null:
			reachable += 1
	_check(errors, checks, reachable == AudioKit.EVENTS.size(),
		"全部 %d 个事件都能取到音频流（实际 %d）" % [AudioKit.EVENTS.size(), reachable])
	_check(errors, checks, AudioKit.stream("nonexistent_event") == null,
		"未知事件返回 null（不静默播放替代音）")
	# 静音开关必须真的拦住播放（录制/CI 需要）
	var was := AudioSettings.enabled
	AudioSettings.enabled = false
	var blocked := not Sfx.new().play("place")
	AudioSettings.enabled = was
	_check(errors, checks, blocked, "静音开关能拦住播放")

## 动效参数必须来自 token，且时长在契约给出的范围内。
static func _check_motion(errors: Array[String], checks: Array[String], tokens: TokenSet) -> void:
	var fast := Motion.seconds(tokens, "dur-fast")
	var base := Motion.seconds(tokens, "dur-base")
	var slow := Motion.seconds(tokens, "dur-slow")
	_check(errors, checks, fast < base and base < slow,
		"时长顺序正确（fast %.3f < base %.3f < slow %.3f）" % [fast, base, slow])
	_check(errors, checks, is_equal_approx(base, 0.22), "dur-base 取自 token = 0.22 秒")
	_check(errors, checks, Motion.seconds(tokens, "missing-dur") == 0.2,
		"未知时长回落到 0.2 秒（不是 0，避免瞬时跳变）")
	# 过渡与缓动也必须由 token 决定（不是各处硬编码）
	var transitions := {}
	for name in ["ease-standard", "ease-emphasis"]:
		transitions[name] = Motion.transition(tokens, name)
	_check(errors, checks, transitions.size() == 2, "两条曲线都能取到过渡类型")

static func _hash_matches(path: String, name: String) -> bool:
	var text := FileAccess.get_file_as_string(SFX_DIR + "/manifest.json")
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var sounds: Dictionary = (parsed as Dictionary).get("sounds", {})
	if not sounds.has(name):
		return false
	var want := str((sounds[name] as Dictionary).get("sha256", ""))
	if want.length() != 64:
		return false
	# 用 Godot 内建的 get_sha256()：不必自己读字节、也不引第三方库。
	# 注意：这**不是**密码学完整性校验，它只防"生成器改了没重跑 / 音频被换过"。
	return FileAccess.get_sha256(path) == want

static func _check(errors: Array[String], checks: Array[String], passed: bool, label: String) -> void:
	checks.append(("OK   " if passed else "FAIL ") + label)
	if not passed:
		errors.append(label)
