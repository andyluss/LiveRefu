# meta-rules · 目录结构与文件关系

> 目录 `concerns/meta-rules` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
meta-rules/
    ├─ M0-rule-governance.md
    ├─ M1-file-organization.md
    ├─ M2-naming-vocabulary.md
    ├─ M3-rule-evolution.md
    ├─ M4-directory-index.md
    ├─ README.md
    ├─ STRUCTURE.md
    ├─ evolution
    ├─ meta-rules-config.json
    └─ tools
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `M0-rule-governance.md` | M0 · 规则的组织方式（已定 · 现行） |
| `M1-file-organization.md` | M1 · 文件组织方式（已定 · 已落地） |
| `M2-naming-vocabulary.md` | M2 · 命名与类型词表（已定 · 已落地） |
| `M3-rule-evolution.md` | M3 · 元规则自身演进（已定 · 已落地） |
| `M4-directory-index.md` | M4 · 目录说明与统一索引（已定 · 已落地） |
| `README.md` | 出入口说明 |
| `STRUCTURE.md` | 目录结构(本文件) |
| `evolution` | （子目录，见其 STRUCTURE.md） |
| `meta-rules-config.json` | 元规则判定配置 |
| `tools` | （子目录，见其 STRUCTURE.md） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[M0-rule-governance.md]
    N1[M1-file-organization.md]
    N2[M2-naming-vocabulary.md]
    N3[M3-rule-evolution.md]
    N4[M4-directory-index.md]
    N5[README.md]
    N6[STRUCTURE.md]
    N7{{evolution}}
    N8[meta-rules-config.json]
    N9{{tools}}
```
