# data-validator · 目录结构与文件关系

> 目录 `concerns/data-validator` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
data-validator/
    ├─ Cargo.lock
    ├─ Cargo.toml
    ├─ README.md
    ├─ STRUCTURE.md
    ├─ notes
    ├─ src
    └─ tests
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `Cargo.lock` | （文件） |
| `Cargo.toml` | （文件） |
| `README.md` | 出入口说明 |
| `STRUCTURE.md` | 目录结构(本文件) |
| `notes` | （子目录，见其 STRUCTURE.md） |
| `src` | （子目录，见其 STRUCTURE.md） |
| `tests` | （子目录，见其 STRUCTURE.md） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[Cargo.lock]
    N1[Cargo.toml]
    N2[README.md]
    N3[STRUCTURE.md]
    N4{{notes}}
    N5{{src}}
    N6{{tests}}
```
