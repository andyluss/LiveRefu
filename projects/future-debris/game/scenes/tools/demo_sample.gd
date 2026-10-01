extends RefCounted
class_name DemoSample
## 截图/录像用的**演示样本**：让"只有打完一局才会出现"的界面也能被拍到并验收版式。
## 它不写进任何存档，只填一个内存里的摘要。

## 演示摘要（数值取自一次真实对局的量级；标成演示用，不写进任何存档）。
static func summary() -> Dictionary:
	return {
		"cleared": true, "grade": "S", "turns": 12, "base_hp": 17, "base_hp_max": 20,
		"waves_cleared": 6, "waves_total": 6, "cards_played": 9, "residue_total": 11,
		"leaks": 0, "zone": 2, "score": 0.914, "max_turns": 40,
	}

