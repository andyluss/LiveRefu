extends Control
## 卡牌库界面（`scenes/app/card_gallery.tscn`）：**全尺寸卡面**，一屏看全部。
##
## 为什么它是必需品而不是"顺手做的页面"：
##   1. 它是**卡面版式的验收靶子**——六段位置对不对，一眼可看；
##   2. 它是**美术的采购单**：没有插画的卡会显示明确的占位框与卡号，
##      美术照着这批卡号出图即可（不需要另外一份清单）；
##   3. 它证明 CardView 是**可复用的**：手牌与卡牌库用同一套版式代码。

## 每行几张：**按窗口宽度算**，而不是写死。实测：520×3 = 1560 > 1280，第三张被裁掉；
## 而且 720 高的窗口装不下 720 高的卡——因此外面必须有滚动容器（见下）。
## 这条也说明一件事：**卡面契约的 520×720 放不进 1280×720 的窗口**，
## 全尺寸卡面只适合"卡牌库/详情"，对局内必须用紧凑模式（手牌就是 0.32 倍）。
const GAP := 16

func _ready() -> void:
	var loaded := ThemeIo.load_or_build(false)
	var tokens: TokenSet = loaded[1]
	var theme: Theme = loaded[0]
	if theme == null:
		return
	add_child(Shell.build(theme, tokens, _compose(theme, tokens)))

func _compose(theme: Theme, tokens: TokenSet) -> Control:
	var root := VBoxContainer.new()
	root.theme = theme
	root.add_theme_constant_override("separation", int(tokens.spacing[2]))
	var probe := Battle.new()
	var catalog_ok := probe.setup(_deck(), 20, 40)
	var header := Label.new()
	header.theme = theme
	header.theme_type_variation = &"Title2"
	var catalog: CardCatalog = probe.catalog if catalog_ok else null
	if catalog == null:
		header.text = "数据表装载失败"
		root.add_child(header)
		return root
	var ready_count := CardArt.ready_count(catalog)
	header.text = "卡牌库　插画就绪 %d / %d　（其余显示占位框，卡号即出图任务）" % [
		ready_count, catalog.cards.size(),
	]
	root.add_child(header)
	var scroll := ScrollContainer.new()
	scroll.theme = theme
	scroll.custom_minimum_size = Vector2(0, 560)
	var grid := GridContainer.new()
	grid.theme = theme
	grid.columns = maxi(1, int((get_viewport_rect().size.x - 64) / (CardView.W + GAP)))
	grid.add_theme_constant_override("h_separation", GAP)
	grid.add_theme_constant_override("v_separation", GAP)
	var ids := catalog.cards.keys()
	ids.sort()
	var font := header.get_theme_font("font")
	for id in ids:
		var view := CardView.new()
		grid.add_child(view)
		view.setup_full(catalog.cards[id], tokens, font)
	scroll.add_child(grid)
	root.add_child(scroll)
	return root

func _deck() -> PackedStringArray:
	return PackedStringArray(["RC-ATOMIC-001"])
