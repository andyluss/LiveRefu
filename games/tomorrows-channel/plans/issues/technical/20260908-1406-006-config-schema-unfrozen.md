# 问题：M1 配置表 schema 未冻结（五表 + meta.schema + CI 校验）

> 状态：**open**（未解，待数值策划 A + 主策划定稿；M1 第一周必锁项）
> 发现：2026-09-08 14:06 · 发现人：主程序
> 类型：technical · 优先级：**高**（M1 第一周最高返工风险之一）

## 现象 / 问题描述

M1 数据驱动 + 配置表的 **schema 未冻结**（[`01_tech-stack-draft.md`](../../../docs/lead-programmer/01_tech-stack-draft.md) §五）：

- `data/schema/meta.schema.json` **未出**，标【待定】；
- 五张表（`content_card` / `channel` / `timer` / `mixer_track` / `collectible`）字段契约待统一（数值策划 A schema 为准，主程序补内容池 schema 收纳）；
- 其中 `content_card` 的**版权字段结构**已有独立分歧问题（见 technical-001 copyright-field-structure，**勿重复**——本问题聚焦 schema 整体冻结与 CI 门禁）。

数值策划 A 已落 `data/schema/content_card*.schema.json`（含强制版权 4 字段 + rare/collect_frag 数值槽）与卡池数据；主程序需据 schema 布 CI 校验（阻止"无授权状态"卡进入发布内容池）。

## 影响 / 卡点

- 开发计划 `00-project-plan.md` §三：M1 第一周必锁「渲染器选择（✅ 已定）+ **配置表 schema** + 版权 taxonomy」三件事之一；
- schema 未冻结 → CI 门禁无法统一；内容管线一铺就可能漏合规；
- 影响频道/混音轨/计时参数等表驱动的 UI 与播放装配。

## 尝试 / 参考

- 主程序字段契约 [`01_tech-stack-draft.md`](../../../docs/lead-programmer/01_tech-stack-draft.md) §五（各表字段 + 强制版权字段 + 责任人）；
- 数值策划 A 表结构骨架 [`01_numerics-framework.md`](../../../docs/systems-designer-a/01_numerics-framework.md)、`data/schema/content_card*.schema.json`；
- 主策划版权 taxonomy [`05_copyright-taxonomy.md`](../../../docs/lead-designer/05_copyright-taxonomy.md)（§4.2 嵌套 `copyright` 字段规范 + §3.4 入池门禁）。

## 解决方向 / 需求

- **主程序 + 数值策划 A + 主策划** 三方对齐五表 schema：版权字段结构（接 technical-001 reconcile）后冻结；
- `meta.schema.json` 由数值策划 A 交付（M1 入口 [任务：`00-project-plan.md` §六]）；主程序落地 schema 校验 + CI 脚本；
- 版权字段结构若走嵌套 `copyright` 对象，需一并更新 content_card 相关 schema/数据引用（见 technical-001）。

## 变更记录

- 2026-09-08 14:06：登记。
