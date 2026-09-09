# rules · 目录结构与文件关系

> 目录 `tech/rules` 的说明。属 **目录自描述**（元规则 M4 目录说明与统一索引）：列结构 + 条目说明 + 文件关系图；
> 这类说明由树根 README 末尾统一索引。

## 一、目录结构

```
rules/
    ├─ README.md
    ├─ STRUCTURE.md
    ├─ T01-default-ts-scripts.md
    └─ T02-full-chain-ts.md
```

## 二、条目说明

| 条目 | 说明 |
| --- | --- |
| `README.md` | 出入口说明 |
| `STRUCTURE.md` | 目录结构(本文件) |
| `T01-default-ts-scripts.md` | T01 · 技术脚本默认 TypeScript（同功能双语言，node/deno/bun 兼容） |
| `T02-full-chain-ts.md` | T02 · 全链路 TS：脚本 / hooks / CI 同源同语言（已定） |


## 三、文件关系图（mermaid）

```mermaid
graph TD
    N0[README.md]
    N1[STRUCTURE.md]
    N2[T01-default-ts-scripts.md]
    N3[T02-full-chain-ts.md]
```
