# viz · 目录结构与文件关系

> 目录 `concerns/visual-fallback/viz` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
viz/
    ├─ STRUCTURE.md
    ├─ consistency-heatmap.html
    ├─ consistency-heatmap.json
    ├─ doc-health.html
    ├─ doc-health.json
    ├─ meta-compliance.json
    └─ review-ledger.json
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `STRUCTURE.md` | 目录结构(本文件) |
| `consistency-heatmap.html` | （资源/产物） |
| `consistency-heatmap.json` | （JSON 配置/数据） |
| `doc-health.html` | （资源/产物） |
| `doc-health.json` | （JSON 配置/数据） |
| `meta-compliance.json` | 配置：lab/formal-system |
| `review-ledger.json` | （JSON 配置/数据） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[STRUCTURE.md]
    N1[consistency-heatmap.html]
    N2[consistency-heatmap.json]
    N3[doc-health.html]
    N4[doc-health.json]
    N5[meta-compliance.json]
    N6[review-ledger.json]
```
