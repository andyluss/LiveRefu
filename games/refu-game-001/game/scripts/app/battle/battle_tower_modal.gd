extends RefCounted
class_name BattleTowerModal
## 用途 ｜ 塔详情弹窗：标签/生命护盾/攻击数值/累计伤害/修饰与增益，并可回收（返还 50%）。
## 依赖 ｜ TowerUnit（只读字段）、GameData.get_card()、UiKit、BattleModalLayer、
##        BattleScreen（清空选中并刷新；调用 battle.sell_tower()）。

var host
var battle: Battle = null


static func create(host_ref) -> BattleTowerModal:
	var p := BattleTowerModal.new()
	p.host = host_ref
	p.battle = host_ref.battle
	return p


func open(tw: TowerUnit) -> void:
	var panel := UiKit.card_panel(UiKit.FACTION_COLORS.get(tw.faction, UiKit.BLUE))
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)
	box.add_child(UiKit.label(tw.name, UiKit.FS_H1, UiKit.TEXT))
	var tags: Array[String] = []
	for t in tw.tags:
		tags.append(String(t))
	box.add_child(UiKit.label("标签：%s　｜　羁绊按「本局上过场的卡」计数" % "、".join(tags),
		UiKit.FS_TINY, UiKit.TEXT_DIM))
	if tw.max_hp > 0.0:
		box.add_child(UiKit.label("生命 %d / %d　护盾 %d" % [int(tw.hp), int(tw.max_hp), int(tw.shield)],
			UiKit.FS_SMALL, UiKit.TEXT))
	if tw.is_attacker():
		box.add_child(UiKit.label("伤害 %.1f　攻速 %.2f/s　射程 %.1f 格　穿透 %d%s" % [
			float(tw.stats.get("damage", 0.0)), float(tw.stats.get("attack_speed", 0.0)),
			float(tw.stats.get("range", 0.0)), int(tw.stats.get("pierce", 0.0)),
			"　可对空" if float(tw.stats.get("targets_air", 0.0)) > 0.5 else "　不可对空"],
			UiKit.FS_SMALL, UiKit.TEXT))
	box.add_child(UiKit.label("累计伤害 %d　击杀 %d" % [int(tw.damage_dealt), tw.kills],
		UiKit.FS_SMALL, UiKit.TEXT_DIM))
	var mods: Array[String] = []
	for m in tw.modifiers:
		mods.append(String(GameData.get_card(String(m["card_id"])).get("name", m["card_id"])))
	box.add_child(UiKit.label("修饰：%s" % ("、".join(mods) if not mods.is_empty() else "无"),
		UiKit.FS_SMALL, UiKit.PURPLE))
	if tw.buffs.size() > 0:
		var buffs: Array[String] = []
		for b in tw.buffs:
			buffs.append("%s %+.0f%%" % [String(b["stat"]), float(b["value"]) * 100.0])
		box.add_child(UiKit.label("增益：%s" % "、".join(buffs), UiKit.FS_TINY, UiKit.TEAL))

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 8)
	var sell := UiKit.ghost_button("回收（返还 50%%）", UiKit.FS_SMALL, UiKit.AMBER)
	sell.pressed.connect(func():
		var r := battle.sell_tower(tw.uid)
		if bool(r["ok"]):
			host._selected_tower_uid = 0
			host._close_modal()
			host._refresh_all())
	actions.add_child(sell)
	var close := UiKit.ghost_button("关闭", UiKit.FS_SMALL, UiKit.LINE)
	close.pressed.connect(func(): host._close_modal())
	actions.add_child(close)
	box.add_child(actions)

	host._modals.make(panel, 500, 420)
