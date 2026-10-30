extends Node
## 截图工具（`./run.sh shot <文件名>`）：把主界面渲染到 PNG，**并断言渲染像素确实等于契约色**。
##
## 为什么断言渲染而不只看主题对象：主题对象里 RootBackground 的取值是对的，
## 但**渲染出来可能是另一个色**（背景层没吃到 type variation）——这类偏差
## 只有读像素才能发现。因此立场：**PNG 也是闸门**。
##
## 用 `get_viewport().get_texture().get_image()` 而不依赖系统录屏权限（沿用既有项目做法）。

const BG_POINT := Vector2i(1000, 600)   # 远离内容的空白处，用于采样窗口底色

func _ready() -> void:
	# 截图要"最终画面"：关淡入（见 [Shell.skip_fade] 的说明——留着它曾让我
	# 截到全透明的画面并误判成"主题坏了"）。
	Shell.skip_fade = true
	UiScale.parse_cli()
	var opts := ShotOptions.parse()
	var result := ThemeIo.load_or_build(false)
	var tokens: TokenSet = result[1]
	var theme: Theme = result[0]
	if theme == null:
		printerr("主题不可用：%s" % str(tokens.errors))
		get_tree().quit(1)
		return
	if opts.with_summary:
		# 填充一份**演示用**结算摘要：结算界面的真实版式只有打完一局才出现，
		# 若不填充就只能拍到空状态，验不了版式。
		CampaignSelection.last_summary = DemoSample.summary()
		CampaignSelection.level_id = "LV-ATOMIC-01"
	# **不再用白名单**：任何场景都应当能截图（曾用硬编码白名单，
	# 于是 `--scene=level_select.tscn` 被静默忽略、拍出主题预览——不容易发现）。
	if opts.scene_path != "":
		add_child((load(opts.scene_path) as PackedScene).instantiate())
	else:
		add_child(Shell.build(theme, tokens))
	# 拍中期战斗：先用自动玩家推进若干回合，否则画面永远是"空塔位"的初始状态
	CaptureSync.advance_turns(self, opts.turns)
	# 等两帧：第一帧完成布局，第二帧才有最终渲染结果（少等一帧会截到未布局的画面）
	await get_tree().process_frame
	await get_tree().process_frame
	# **再等开局淡入结束**：否则截到的是半透明画面与背后默认灰的混色，
	# 看起来像"主题没生效"（实测：底色读成 #202429 而契约是 #10161c）。
	if Shell.last_tween != null and Shell.last_tween.is_valid():
		await Shell.last_tween.finished
	# **再多等两帧再回读**：帧缓冲是 GPU 端资源，取回 CPU 需要等渲染真正落地。
	# 实测：淡入刚结束时回读到的是未合成的中间态（读到 #4c4c4c），
	# 而同一时刻写出的 PNG 里 85% 像素已经是契约底色——**回读时序问题，不是画面问题**。
	# 这类偏差最容易被误判成"主题坏了"，所以宁可多等两帧。
	# 再多等两帧：帧缓冲是 GPU 端资源，取回 CPU 需要等渲染真正落地
	await RenderingServer.frame_post_draw
	await get_tree().process_frame
	await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var want := tokens.color("--bg-base")
	# 采样**四角**取多数：内容可能铺满某一个角（卡牌库就是一屏卡面），
	# 只采样一个点会把"内容"误判成"底色不符"（实测踩过）。
	var got := PixelProbe.dominant_corner(image)
	if got.to_html(false) != want.to_html(false):
		printerr("渲染底色与契约不符：实测 #%s，契约 --bg-base #%s" % [got.to_html(false), want.to_html(false)])
		get_tree().quit(1)
		return
	var err := image.save_png("res://../docs/shots/%s" % opts.name)
	if err != OK:
		printerr("截图写入失败：%s" % error_string(err))
		get_tree().quit(1)
		return
	print("SHOT OK %s（%dx%d，底色 = --bg-base #%s）" % [opts.name, image.get_width(), image.get_height(), want.to_html(false)])
	print("BOOT OK")
	get_tree().quit(0)
