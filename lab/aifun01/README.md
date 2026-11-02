# aifun01 · 函数式协作实验 01

> **状态**：Phase 0 已初始化 · 2026-11-02
> **关联文章**：[`../../ideas/AI/20261102-函数式协作_把AI当纯函数把人当运行时.md`](../../ideas/AI/20261102-函数式协作_把AI当纯函数把人当运行时.md)
> **实验问题**：把“AI 纯函数 / 人运行时 / 效果边界”写成可执行模型后，能否减少范围漂移，并让人始终拥有决定权？

## 一、这是什么

一个**学习 / 研究 / 应用**三合一的实验：

- **学习**：把函数式编程的核心概念写成 TypeScript 代码；
- **研究**：用属性测试验证“AI 不能自动决策 / 不能偷偷产生副作用 / 历史不可变”；
- **应用**：为后续真实 AI 任务提供一个可复用的协作骨架。

它不是游戏，不是产品，也不是对某个具体项目的实现；当前不调用真实模型，只模拟 AI 的纯变换。

## 二、当前假设

| # | 假设 | 验证方式 |
| --- | --- | --- |
| H1 | 显式 `Context + Task` 能减少“AI 自行补全意图” | 任务缺非目标/验收时必须 Blocked |
| H2 | 把决策与效果放回人这一侧，能阻止 AI 自动扩大范围 | `decide` 要求理由；`execute` 要求人类批准 |
| H3 | 不可变 journal 能让“为什么改方向”可追溯 | `fold` 不修改旧 state；每步 append |
| H4 | 惰性生产能减少内容浪费 | 核心体验未验证前，不批量生成内容（实验协议约束） |

## 三、最小模型

```text
Context + Task  →  propose()  →  Proposal
                                  ↓
                          accepts() / 人审
                                  ↓
                         decide() → JournalEntry
                                  ↓
                        execute(effects, humanApproval)
```

- `propose`：AI 纯核心，只返回候选，不写文件、不提交、不发布；
- `accepts`：检查提案是否触碰 `intent.nonGoals`；
- `decide`：只有人能给出 decision + rationale；
- `execute`：必须拿到 `approve()` 产生的批准令牌，才模拟执行效果；
- `fold`：append-only，不修改旧状态。

## 四、运行

```bash
cd lab/aifun01
npm test       # 6 条属性/边界测试
npm run demo   # 跑一次完整协作链
```

无第三方依赖，Node.js 22.18+，使用原生 TypeScript strip types。

## 五、目录

```text
lab/aifun01/
├── README.md          # 本文件
├── EXPERIMENT.md      # 实验协议、变量、指标、停止条件
├── CHANGELOG.md       # 实验日志
├── package.json
├── src/
│   ├── types.ts       # Context / Task / Proposal / Result / Effect / Decision
│   ├── algebra.ts     # 纯核心 + 效果边界
│   └── demo.ts        # 最小协作链
└── test/
    └── algebra.test.ts
```

## 六、当前边界

- 不调用真实 LLM；`propose` 是确定性模型，用来验证结构而非智能；
- 不写真实文件、不提交、不发布；`execute` 只返回模拟字符串；
- 不替代项目设计；真实项目仍以人的 `ideas/` 与项目 `docs/` 为准；
- 不追求“完整框架”；先验证不变量，再决定是否扩展。

## 七、下一步

1. 用真实 AI 任务（一个有明确 Context/Task 的小任务）跑一次 Phase 1；
2. 记录 AI 是否提出范围扩张、是否在缺失信息时停下、人的干预次数；
3. 根据结果决定是否把这套边界接入未来残片/Refu 的工作流；
4. 如果模型本身变得复杂，再考虑引入真正的代数数据类型/effect 库，而不是先上重框架。

## 八、关联

- 文章：[`../../ideas/AI/20261102-函数式协作_把AI当纯函数把人当运行时.md`](../../ideas/AI/20261102-函数式协作_把AI当纯函数把人当运行时.md)
- 人类设计源：[`../../ideas/README.md`](../../ideas/README.md)
- 实验区：[`../README.md`](../README.md)
- 协作规范：[`../../AGENTS.md`](../../AGENTS.md)
