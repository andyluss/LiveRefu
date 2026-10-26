# @qingcheng/qc · P1 骨架

> 青橙全栈的参考实现（P1）。无第三方运行时依赖：Node 24 原生 HTTP + `node:sqlite` + TypeScript strip-types。

## 命令

```bash
node --experimental-strip-types src/cli.ts doctor
node --experimental-strip-types src/cli.ts dev
node --experimental-strip-types src/cli.ts start
node --experimental-strip-types src/cli.ts db migrate
node --experimental-strip-types src/cli.ts build
node --experimental-strip-types src/cli.ts new my-app
node --experimental-strip-types test/notes.test.ts
```

## 应用 API

```ts
import { definePage, defineAction, html, redirect, badRequest, notFound, nowIso } from './qc.ts'

export default definePage({
  load({ db }) { return { rows: db.query('select * from notes') } },
  render({ rows }) { return html`<h1>${rows.length} notes</h1>` },
})

export default defineAction({
  handle({ form, db }) {
    const title = String(form?.get('title') ?? '')
    if (!title) throw badRequest('标题不能为空')
    db.insert('notes', { title, created_at: nowIso() })
    return redirect('/')
  },
})
```

## 文件约定

```text
app/pages/**/*.page.ts      → 页面（GET/HEAD）
app/actions/**/*.action.ts  → 动作（POST）
app/api/**/*.api.ts         → API（方法导出）
app/data/migrations/*.sql   → 迁移
app/layouts/default.layout.ts
qc.config.ts
```

## P1 边界

- ✅ 文件路由 / page / action / layout / HTML 转义
- ✅ SQLite / 迁移 / 参数化查询 / insert / transaction
- ✅ CLI dev/start/build/db/doctor/new
- ✅ 示例 notes + 2 个集成测试
- ❌ auth/session/CSRF/权限（P2）
- ❌ schema 校验 DSL（P2）
- ❌ 真正 bundle（P1 build 是源码复制）
- ❌ HMR / Postgres / 多端

## 注意

- 运行需要 Node 24 与 `--experimental-strip-types`。
- `qc new` 目前写入指向本机框架源码的绝对 bridge；P2 打包后改为包导入。
