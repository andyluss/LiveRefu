# M4 · 目录说明与统一索引（已定 · 已落地）

**一句话**：**每个目录**用一份 `STRUCTURE.md` 自我描述（目录结构 + 条目细节说明 + 文件关系图 mermaid），
并在**树根 README 末尾**统一索引；由 [`structure_gen.py`](tools/structure_gen.py) 生成、[`structure_check.py`](tools/structure_check.py) 检测。

## 一、目标

让人**不进去翻**也能快速知道"这个目录里有什么、各是什么、彼此什么关系"，并在一个入口（树根 README 末尾）
统一看到整棵树的目录说明。这与 [M1](M1-file-organization.md)（结构）/ [M2](M2-naming-vocabulary.md)（命名）一条线：
结构定了，还要能**自解释**、可被索引。

## 二、主选（决策）

1. **每个目录一份 `STRUCTURE.md`**（与 `README.md` 互补：README 是"出入口/怎么用"；STRUCTURE 是"里面有什么/什么关系"）。
   - 内容三节：**目录结构**（树）、**条目说明**（每条目一行）、**文件关系图**（mermaid `graph TD`）。
   - 文件关系图至少画出**层级包含关系**；对 doc/code，尽量补 md→md 互链、`use`/`import` 等**语义关系**边。
2. **统一索引**：树根 README 末尾加"目录结构说明索引"，列出所有 `STRUCTURE.md`（带相对链接），一处到位。
3. **工具化**：`structure_gen.py` 生成、`structure_check.py` 检测（存在 + 含三小节 + 有 mermaid）；检测接入元规则检查。

**权衡**：每个目录多一份小文件；换来"可读、可索引、可检查"，且生成/检测自动跑，成本可控。

## 三、备选（被放弃的选项）

| 备选 | 描述 | 为何不为主选 | 代价 |
| --- | --- | --- | --- |
| A4.1 只在根 README 罗列 | 只把目录列在 README，不逐目录说明 | 目录一旦稍深就"进去才发现" | 需逐个打开 |
| A4.2 全部塞进 README | 一棵树全部并入一个入口文件 | 树深后文件过大、与"进目录翻"无异 | 过长难维护 |
| A4.3 不生成只手写 | 无脚本，靠人维护 | 易漏、易过期 | 全靠自觉 |

## 四、判定标准 / 可验证

- 每目录有 `STRUCTURE.md`，含"目录结构/条目说明/文件关系图(mermaid)"三部分。
- 树根 README 末尾列出该树所有 `STRUCTURE.md`。
- **可运行检查**：`python3 lab/formal-system/concerns/meta-rules/tools/structure_check.py`（`--self-test`）。
  并已接入递归的 `meta_rules_check`（见其输出）。

## 五、自检问题

> "我能不进这个目录就说出它有什么、彼此什么关系，并从根 README 一屏跳到对应 STRUCTURE 吗？"

## 六、演进历史

| 版本 | 日期 | 状态 | 变更 | 依据 |
| --- | --- | --- | --- | --- |
| v1 | 2026-09-09 | `accepted.applied` | 初定：每目录 STRUCTURE.md（结构+细节+关系图）+ 树根 README 末尾索引；配套生成/检测脚本 | 用户要求"每个目录加结构+关系说明、根 README 统一索引、并整合进元规则" |
