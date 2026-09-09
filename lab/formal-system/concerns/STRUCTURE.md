# concerns · 目录结构与文件关系

> 目录 `concerns` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
concerns/
    ├─ STRUCTURE.md
    ├─ data-validator
    ├─ meta-rules
    └─ visual-fallback
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `STRUCTURE.md` | 目录结构(本文件) |
| `data-validator` | （子目录，见其 STRUCTURE.md） |
| `meta-rules` | （子目录，见其 STRUCTURE.md） |
| `visual-fallback` | （子目录，见其 STRUCTURE.md） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[STRUCTURE.md]
    N1{{data-validator}}
    N2{{meta-rules}}
    N3{{visual-fallback}}
```
