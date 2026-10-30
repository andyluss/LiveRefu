extends RefCounted
class_name CaptureSync
## 截图/录像前的**准备与同步**：把画面推进到要拍的状态，然后等它稳定。
##
## 为什么单独成件：这三件事都不是"截图"本身，而是"什么时候可以取像素"。
## 它们各自踩过一次坑（少等一帧截到未布局；不等淡入截到半透明，看起来像主题坏了；
## 不等 frame_post_draw 回读到尚未合成的帧），因此值得有自己的注释与位置。

## 截图前的同步：等布局、等淡入、等帧缓冲落地。
##
## 三件事各有各的理由（都踩过）：少等一帧会截到未布局的画面；
## 不等淡入会截到半透明（表现为"底色不符"，其实画面没问题）；
## 不等 `frame_post_draw` 则可能回读到尚未合成的帧（实测读到清屏色）。
static func settle() -> void:
	await Engine.get_main_loop().process_frame
	await Engine.get_main_loop().process_frame
	if Shell.last_tween != null and Shell.last_tween.is_valid():
		await Shell.last_tween.finished
	await RenderingServer.frame_post_draw
	await Engine.get_main_loop().process_frame
	await Engine.get_main_loop().process_frame

## 用自动玩家推进 N 个回合，再截图。
##
## 为什么需要（商店页的硬要求）：不推进时画面永远是"8 个空塔位"的初始状态，
## 而商店页需要的是"塔已铺开、降级区已扩张"的**中期**画面。
## 只对战斗场景有效（其它场景没有 battle）。
## 用自动玩家推进 N 个回合，再截图。
##
## 为什么需要（商店页的硬要求）：不推进时画面永远是"8 个空塔位"的初始状态，
## 而商店页需要的是"塔已铺开、降级区已扩张"的**中期**画面。只对战斗场景有效。
static func advance_turns(root: Node, turns: int) -> void:
	if turns <= 0:
		return
	for child in root.get_children():
		if not (child is BattleScreen):
			continue
		var screen := child as BattleScreen
		for _i in turns:
			if not screen.battle.is_active():
				break
			screen.battle.tick()
		screen.driver.refresh()
		return
