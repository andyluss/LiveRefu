# 设计系统项目 · Projects

> `design/projects/` 存放与 LRDS **协同演进的正式项目**；不再是 `lab/` 实验项目。
> 每个项目有自己的 `README`、`docs/`、代码与发布节奏；LRDS 只提供语法、token、组件契约与闸门。

## 一、项目与 LRDS 的边界

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 设计系统核心 | `design/tokens`、`design/rules`、`design/canon` | 语法、schema、规则、生成物 |
| 正式项目 | `design/projects/<name>/` | 消费设计系统、产出真实产品、回流缺口 |
| 实验项目 | `design/lab/`、`lab/`（其他实验） | 探索，不承诺稳定 |

项目**不修改**设计系统核心；缺口先记录，再由 LRDS 决策是否进入 `sys/component/product`。

## 二、当前项目

| 项目 | 入口 | 与 LRDS 的关系 |
| --- | --- | --- |
| LiveDSO / LiveAtelier | [`livedso/README.md`](livedso/README.md) | 本地设计系统操作台；LRDS schema 的参考实现与 QA 工具 |

## 三、新增项目

1. 在 `design/projects/<name>/` 建项目入口与 docs；
2. 声明消费的 token/schema 版本；
3. 明确它回流什么：契约、组件、检查、案例或 token 缺口；
4. 不复制 LRDS 核心规则；引用 `design/rules` 与 `design/canon`。
