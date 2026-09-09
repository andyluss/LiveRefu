# lab · 实验项目区

> 本目录存放**实验性质**的项目：小范围探索新协作路径、新形式化方法、新工具/系统，成熟后再回流工作区主线。
> 现有实验基地见 [`formal-system/`](formal-system/README.md)（形式化协作实验基地）。

## 说明

- 本目录及其子目录**默认无须遵守工作区根目录的规则**（见根 [`README.md`](../README.md) 与 [`tech/`](../tech/README.md)），除非**特别约定**。
- 所谓根目录规则，指**面向工作区整体**的约定，例如：文档体例（简体中文 Markdown、`doc/` 编号体例、`studio/` 角色体例、**相对链接深度**及其校验：pre-commit 钩子 + CI）、Git 提交信息（Conventional Commits）等。
- 实验项目可按自身性质**自定义**目录结构、文档体例与提交风格，以探索为优先，不必迁就工作区主线。
- 若有**特别约定**（即某个实验项目明确要求遵循某条根规则），在该子项目的 README 中写明即可；**未写明的，一律豁免**根目录规则。

## 子目录

| 子目录 | 内容 | 入口 |
| --- | --- | --- |
| [`formal-system/`](formal-system/README.md) | 形式化协作实验基地（Rust/CUE/Alloy + 属性测试），成熟后回流主项目 | [`formal-system/README.md`](formal-system/README.md) |
