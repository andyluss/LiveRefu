import { accepts, approve, decide, execute, fold, initial, propose } from './algebra.ts'
import type { Context, Task } from './types.ts'

const context: Context = {
  intent: {
    id: 'aifun01-demo',
    oneLine: '先验证核心体验，再扩内容',
    pillars: ['核心 10 分钟', '人的决定权', '可追溯'],
    nonGoals: ['批量生成内容', '自动发布'],
  },
  constraints: ['无外部依赖', '先做最小实验'],
  evidence: ['尚无真人试玩'],
  version: 'demo-1',
}

const task: Task = {
  id: 'demo-task',
  goal: '决定下一步：扩内容还是先做核心体验',
  nonGoals: ['批量生成内容', '自动发布'],
  acceptance: ['人能在两条路之间做决定', '决定可追溯'],
  authority: 'propose',
}

const proposal = propose(context, task)
if (!proposal.ok) throw new Error(proposal.reason)

const checked = accepts(context, proposal.value)
if (!checked.ok) throw new Error(checked.reason)

const decision = decide(task, checked.value, 'explore', '核心 10 分钟还没被真人验证')
if (!decision.ok) throw new Error(decision.reason)

const state = fold(initial(context.intent), decision.value)
const approval = approve('human-demo')
const executed = execute(decision.value.effects, approval)
if (!executed.ok) throw new Error(executed.reason)

console.log(JSON.stringify({
  contextVersion: context.version,
  options: proposal.value.options.map((o) => o.id),
  decision: decision.value.decision,
  journalEntries: state.entries.length,
  plannedEffects: decision.value.effects,
  executed: executed.value,
}, null, 2))
