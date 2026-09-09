# visual-fallback · 目录结构与文件关系

> 目录 `concerns/visual-fallback` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
visual-fallback/
    ├─ README.md
    ├─ STRUCTURE.md
    ├─ evolution-history
    ├─ tools
    └─ viz
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `README.md` | 出入口说明 |
| `STRUCTURE.md` | 目录结构(本文件) |
| `evolution-history` | （子目录，见其 STRUCTURE.md） |
| `tools` | （子目录，见其 STRUCTURE.md） |
| `viz` | （子目录，见其 STRUCTURE.md） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[README.md]
    N1[STRUCTURE.md]
    N2{{evolution-history}}
    N3{{tools}}
    N4{{viz}}
```
