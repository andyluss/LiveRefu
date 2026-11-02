import type {
  Context, Decision, Effect, JournalEntry, Option,
  Proposal, Result, State, Task,
} from './types.ts'
import { err, ok } from './types.ts'

/**
 * AI 的纯核心：只从显式 Context + Task 生成候选，不修改任何外部状态。
 * 返回 Result，而不是用异常或“猜一个”来处理缺失输入。
 */
export function propose(context: Context, task: Task): Result<Proposal> {
  if (task.nonGoals.length === 0) return err('task.nonGoals 为空：没有边界就不允许生成方案')
  if (task.acceptance.length === 0) return err('task.acceptance 为空：没有验收就不允许生成方案')
  if (task.authority === 'read') return err('authority=read：本任务只允许读取，不允许生成提案')
  if (!task.goal.trim()) return err('task.goal 为空')
  if (context.intent.nonGoals.some((ng) => task.goal.includes(ng))) {
    return err('task.goal 与 intent.nonGoals 冲突')
  }

  const options: readonly Option[] = [
    {
      id: 'small',
      title: '最小可验证一步',
      tradeoff: '范围小，可能不足以判断最终体验',
      risk: '过度保守，验证不到关键假设',
    },
    {
      id: 'core',
      title: '先做核心 10 分钟',
      tradeoff: '需要真实试玩，不能只靠测试',
      risk: '如果核心本身不成立，后续内容全部作废',
    },
    {
      id: 'expand',
      title: '先扩内容再验证',
      tradeoff: '短期看起来完整，返工成本最高',
      risk: '用内容量掩盖核心未成立',
    },
  ]

  return ok({
    taskId: task.id,
    options,
    assumptions: [
      '本提案只基于传入的 Context/Task',
      '未执行任何写文件、提交、发布或花费',
      `context.version=${context.version}`,
    ],
    effects: [],
  })
}

/** 提案与不变量不冲突；这是纯检查，不修改提案。 */
export function accepts(context: Context, proposal: Proposal): Result<Proposal> {
  const text = proposal.options.map((o) => `${o.title} ${o.tradeoff} ${o.risk}`).join(' ')
  for (const ng of context.intent.nonGoals) {
    if (text.includes(ng)) return err(`提案触碰了非目标：${ng}`)
  }
  return ok(proposal)
}

/** 只有人能调用它；它产生一个不可变 journal entry，并返回计划效果（不执行）。 */
export function decide(
  task: Task,
  proposal: Proposal,
  decision: Decision,
  rationale: string,
  at = new Date().toISOString(),
): Result<JournalEntry> {
  if (!rationale.trim()) return err('人必须写出理由，不能只给一个决定')
  if (decision === 'adopt' && proposal.effects.length > 0) {
    return err('AI 提案不应直接带有待执行效果；先由人拆出 EffectPlan')
  }
  return ok({
    taskId: task.id,
    decision,
    rationale: rationale.trim(),
    at,
    proposalHash: hashProposal(proposal),
    effects: planEffects(decision, proposal),
  })
}

/** 纯函数：追加，不修改旧状态。 */
export function fold(state: State, entry: JournalEntry): State {
  return { ...state, entries: [...state.entries, entry] }
}

/** 只产出一个可审阅的效果计划，不执行。 */
export function planEffects(decision: Decision, proposal: Proposal): readonly Effect[] {
  switch (decision) {
    case 'keep':
      return [{ kind: 'write', description: `保留提案 ${proposal.taskId} 的相关产出` }]
    case 'cut':
      return [{ kind: 'write', description: `移除提案 ${proposal.taskId} 对应的范围` }]
    case 'explore':
      return [{ kind: 'playtest', description: `为 ${proposal.taskId} 做一次最小试玩` }]
    case 'adopt':
      return [{ kind: 'commit', description: `采纳 ${proposal.taskId} 作为下一步方向` }]
  }
}

const APPROVAL = Symbol('HumanApproval')

export interface HumanApproval {
  readonly [APPROVAL]: true
  readonly by: string
  readonly at: string
}

export function approve(by: string, at = new Date().toISOString()): HumanApproval {
  if (!by.trim()) throw new Error('approval.by 不能为空')
  return { [APPROVAL]: true, by: by.trim(), at }
}

function isHumanApproval(value: unknown): value is HumanApproval {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[APPROVAL] === true
}

/** 执行效果必须经过显式人批准；这是模拟，不会写入真实文件或发布。 */
export function execute(effects: readonly Effect[], approval: unknown): Result<readonly string[]> {
  if (!isHumanApproval(approval)) return err('缺少人类批准：拒绝执行效果')
  return ok(effects.map((e) => `[${approval.by} @ ${approval.at}] ${e.kind}: ${e.description}`))
}

export function hashProposal(proposal: Proposal): string {
  return JSON.stringify(proposal)
}

export function initial(intent: State['intent']): State {
  return { intent, entries: [] }
}
