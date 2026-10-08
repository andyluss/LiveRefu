extends RefCounted
class_name QuotaSchedule
## 波次配额的**来源规则**：先查关卡表，再退回可推导的公式。
##
## 为什么允许"部分覆盖"：关卡可以只精调前几波，后面的难度曲线仍走统一公式，
## 不必为每关手抄一整套数字（手抄的数字一旦调平衡就会互相不一致）。
## 兜底公式的依据见 docs/08 §七：自动玩家能力 ≈ 28 输出/回合（实测）。

const BASE_QUOTA := 40
const STEP := 15

static func for_index(index: int, quotas: PackedInt32Array) -> int:
	if index < quotas.size():
		return int(quotas[index])
	return BASE_QUOTA + STEP * index
