import test from 'node:test'
import assert from 'node:assert/strict'
import { accepts, approve, decide, execute, fold, initial, propose } from '../src/algebra.ts'
import type { Context, State, Task } from '../src/types.ts'

const intent = {
  id: 'aifun01',
  oneLine: '先验证核心体验，再扩内容',
  pillars: ['核心 10 分钟', '人的决定权', '可追溯'],
  nonGoals: ['批量生成内容', '自动发布', '用测试替代试玩'],
} as const

const context: Context = {
  intent,
  constraints: ['无外部依赖', 'Node 24'],
  evidence: [],
  version: 'ctx-1',
}

const task: Task = {
  id: 't1',
  goal: '为函数式协作做一个最小验证',
  nonGoals: ['批量生成内容', '自动发布'],
  acceptance: ['有可运行的纯函数', '有人审阅的门'],
  authority: 'propose',
}

test('缺非目标时 AI 返回 Blocked，而不是猜', () => {
  const r = propose(context, { ...task, nonGoals: [] })
  assert.equal(r.ok, false)
})

test('AI 提案不携带待执行效果', () => {
  const r = propose(context, task)
  assert.equal(r.ok, true)
  if (r.ok) assert.deepEqual(r.value.effects, [])
})

test('提案不能触碰 intent 的非目标', () => {
  const r = propose(context, task)
  assert.equal(r.ok, true)
  if (!r.ok) return
  const bad = { ...r.value, options: [{ id: 'x', title: '自动发布', tradeoff: '', risk: '' }] }
  assert.equal(accepts(context, bad).ok, false)
})

test('决定必须有人的理由', () => {
  const r = propose(context, task)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(decide(task, r.value, 'explore', '  ').ok, false)
})

test('fold 是不可变追加', () => {
  const s0: State = initial(intent)
  const r = propose(context, task)
  assert.equal(r.ok, true)
  if (!r.ok) return
  const d = decide(task, r.value, 'explore', '需要先做一次试玩')
  assert.equal(d.ok, true)
  if (!d.ok) return
  const s1 = fold(s0, d.value)
  const s2 = fold(s1, { ...d.value, decision: 'keep' })
  assert.equal(s0.entries.length, 0)
  assert.equal(s1.entries.length, 1)
  assert.equal(s2.entries.length, 2)
  assert.equal(s1.entries[0].decision, 'explore')
})

test('执行效果必须有人类批准', () => {
  const effects = [{ kind: 'write' as const, description: '写一份提案摘要' }]
  assert.equal(execute(effects, {}).ok, false)
  const a = approve('human')
  assert.equal(execute(effects, a).ok, true)
})
