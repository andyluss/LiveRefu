# evolution · 规则演进状态检查（rules/meta 的子关注点）

> 属于 [`../README.md`](../README.md)（元规则）的一个**子关注点**：用**形式化检查**校验每条规则（元规则 **M** 与具体规则 **R**）的**演进状态**
> 是否符合 [`M3-rule-evolution.md`](../M3-rule-evolution.md) 的多状态/子状态机与允许迁移。
> 整合自 `lab/formal-system/concerns/meta-rules/evolution/`。

## 做什么

扫描元规则 [`../M*-*.md`](../)（`rules/meta/`）与具体规则 [`../../R*-*.md`](../../)（`rules/`）的**演进历史**表（含 `状态` 列），校验：

1. 每条规则有"演进历史"表（含 `状态` 列）。
2. 每个状态合法：主状态 ∈ `draft/proposed/experimental/accepted/in-review/superseded/deprecated/retired`，
   子状态 ∈ 该主状态允许集。
3. 日期非降序（`YYYY-MM-DD`）。
4. 相邻迁移合法：同一主状态（内容细化）或属于允许迁移表。
5. 最新一条状态 = 当前状态。

## 运行

```bash
node --experimental-strip-types rules/meta/evolution/rule_evolution_check.ts             # 校验全部规则（M + R）
node --experimental-strip-types rules/meta/evolution/rule_evolution_check.ts --self-test  # 自检(能抓非法迁移/状态)
```

退出码：0=全部合法；1=有违规。

## 鼓励演进（立场）

规则是**活的合约**：当你"想绕过它"时，请先问"该改规则还是改我的东西？"——若是前者，走"提出变更"路径并 **记录**；
**请求改/重估/取代一条规则是健康的正反馈**。历史表**只增不改**，保留完整决策轨迹。
