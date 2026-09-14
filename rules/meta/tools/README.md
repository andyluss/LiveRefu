# tools · 元规则检查脚本

> 本目录是 [`../README.md`](../README.md)（`rules/meta/`）下的**代码类类型目录**（M1/M2 命名豁免），存放把元规则接入**可运行检查**的 TS 脚本。

## 脚本

| 脚本 | 作用 | 依据 |
| --- | --- | --- |
| [`meta_rules_check.ts`](meta_rules_check.ts) | M1+M2：校验 `rules/` 的出入口 README、类型目录、根文档命名与递归子关注点（`meta/`） | [M1](../M1-file-organization.md) / [M2](../M2-naming-vocabulary.md) |

M3 的演进状态检查在元规则的 `evolution/` 子关注点：[`../evolution/rule_evolution_check.ts`](../evolution/rule_evolution_check.ts)。

## 用法

```bash
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts                  # 默认检查 rules/
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts --root <dir> --config <json>
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts --json <path>     # 额外写机器可读结果
node --experimental-strip-types rules/meta/tools/meta_rules_check.ts --self-test
```

退出码：`0`=全部符合；`1`=存在违规。默认配置 [`../meta-rules-config.json`](../meta-rules-config.json)（作用对象 `rules/`，见其中 `concern` 字段）。
