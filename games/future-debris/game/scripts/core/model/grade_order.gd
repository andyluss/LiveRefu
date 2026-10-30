extends RefCounted
class_name GradeOrder
## 评级的好坏顺序。**不能用字母序比较**：`S > A` 在字母序里是反的，
## 实测后果是"更差的 C 覆盖了 S"（被闸门断言抓到）。

const ORDER := ["S", "A", "B", "C", "D"]

## 名次（越小越好）。未知评级排在最后：宁可保留已有成绩，也不让未知值把它冲掉。
static func rank_of(grade: String) -> int:
	var index := ORDER.find(grade)
	return index if index >= 0 else ORDER.size()

static func is_better(candidate: String, incumbent: String) -> bool:
	return rank_of(candidate) < rank_of(incumbent)
