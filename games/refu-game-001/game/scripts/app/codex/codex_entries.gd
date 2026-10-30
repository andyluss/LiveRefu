extends RefCounted
class_name CodexEntries
## 用途 ｜ 图鉴三段的卡片构建器：卡牌卡面 / 敌方原型 / 地图卡，各返回一个 PanelContainer。
## 依赖 ｜ UiKit、ResourceLoader（美术出图同源）。纯静态，无状态。

## 卡牌条目：出图卡面 + 编号名称 + 费用关键词 + 面值三连 + 一句话效果。
static func card_entry(card: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.TYPE_COLORS.get(String(card.get("type", "")), UiKit.TEAL), 10)
	panel.custom_minimum_size = Vector2(210, 420)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(card.get("icon", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(182, 253)
		box.add_child(tr)
	box.add_child(UiKit.label("%s %s" % [card.get("id", ""), card.get("name", "")], UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("费 %d · %s" % [int(card.get("cost", 0)), card.get("keyword", "")],
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	var nums: Array[String] = []
	for pair in card.get("face_stats", []):
		nums.append("%s %s" % [pair[0], pair[1]])
	box.add_child(UiKit.label("　".join(nums), UiKit.FS_TINY, UiKit.TEXT))
	box.add_child(UiKit.label(String(card.get("effect_line", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
	return panel


## 敌方原型：威胁值 / 生命 / 攻击 / 攻速 / 移速 / 护甲 / 击杀能量 / 描述。
static func enemy_entry(e: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.DANGER, 10)
	panel.custom_minimum_size = Vector2(210, 300)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(e.get("art", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(182, 190)
		box.add_child(tr)
	box.add_child(UiKit.label("%s　威胁 %d" % [e.get("name", ""), int(e.get("threat", 0))],
		UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("生命 %d · 攻击 %d · 攻速 %.1f/s" % [int(e.get("hp", 0)),
		int(e.get("attack", 0)), float(e.get("attack_speed", 0.0))], UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label("移速 %.1f · 护甲 %d · 击杀能量 %d" % [float(e.get("speed", 0.0)),
		int(e.get("armor", 0)), int(e.get("kill_energy", 0))], UiKit.FS_TINY, UiKit.TEXT_DIM))
	box.add_child(UiKit.label(String(e.get("desc", "")), UiKit.FS_TINY, UiKit.TEXT_FAINT))
	return panel


## 地图卡：地图图 + 入口数 / 标准·支援·修饰槽位数 / 单双入口。
static func map_entry(m: Dictionary) -> Control:
	var panel := UiKit.card_panel(UiKit.PURPLE, 10)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	var art := String(m.get("image", ""))
	if art != "" and ResourceLoader.exists(art):
		var tr := TextureRect.new()
		tr.texture = load(art)
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(620, 418)
		box.add_child(tr)
	box.add_child(UiKit.label("%s　%s　｜　入口 %d　｜　标准 %d / 支援 %d / 修饰 %d%s"
		% [m.get("id", ""), m.get("name", ""), (m.get("entrances", []) as Array).size(),
		   (m.get("slots", {}) as Dictionary).get("standard", []).size(),
		   (m.get("slots", {}) as Dictionary).get("support", []).size(),
		   (m.get("slots", {}) as Dictionary).get("modifier", []).size(),
		   "　｜　双入口（可挂双流）" if bool(m.get("dual_entry", false)) else "　｜　单入口"],
		UiKit.FS_SMALL, UiKit.TEXT))
	return panel
