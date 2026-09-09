# formal-system · 目录结构与文件关系

> 目录 `.` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
formal-system/
    ├─ CHANGELOG.md
    ├─ EXPERIMENT.md
    ├─ README.md
    ├─ STRUCTURE.md
    ├─ concerns
    ├─ methods
    ├─ specs
    └─ tech
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `CHANGELOG.md` | 变更日志 |
| `EXPERIMENT.md` | 交接启动文档 |
| `README.md` | 出入口说明 |
| `STRUCTURE.md` | 目录结构(本文件) |
| `concerns` | （子目录，见其 STRUCTURE.md） |
| `methods` | （子目录，见其 STRUCTURE.md） |
| `specs` | （子目录，见其 STRUCTURE.md） |
| `tech` | （子目录，见其 STRUCTURE.md） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[CHANGELOG.md]
    N1[EXPERIMENT.md]
    N2[README.md]
    N3[STRUCTURE.md]
    N4{{concerns}}
    N5{{methods}}
    N6{{specs}}
    N7{{tech}}
```
