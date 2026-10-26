# @qingcheng/qc · P1 骨架

> 青橙全栈的参考实现（P1）。无第三方运行时依赖：Node 24 原生 HTTP + `node:sqlite` + TypeScript strip-types。

## 命令

```bash
node --experimental-strip-types src/cli.ts doctor
node --experimental-strip-types src/cli.ts dev
node --experimental-strip-types src/cli.ts start
node --experimental-strip-types src/cli.ts db migrate
node --experimental-strip-types src/cli.ts build
node --experimental-strip-types src/cli.ts pack
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

## P1–P15 边界

- ✅ 文件路由 / page / action / layout / HTML 转义
- ✅ SQLite / 迁移 / 参数化查询 / insert / transaction
- ✅ CLI dev/start/build/db/doctor/new
- ✅ auth：session cookie、scrypt 密码、CSRF、角色、`auth: 'required'`
- ✅ 校验：`object/string` + 422；安全头/限流/2MiB 请求体上限
- ✅ 示例 notes（注册/登录/个人笔记/删除/退出）+ 2 个集成测试
- ✅ 真 bundle（esbuild）+ `qc start` 自动用 `dist/server.mjs`
- ✅ `Action.onError` + auth 表单错误回填
- ✅ 内置 `GET /health` + `x-request-id` + JSON 日志
- ✅ `qc db backup` / `qc db restore --force`
- ✅ Docker/Compose 模板（`templates/`）
- ✅ mailer（console/file/memory）+ 密码重置 + 邮箱验证
- ✅ StandardSchema `fromStandard`（同步/异步）+ 上传 `saveUpload`
- ✅ `formValues/formErrors` helper
- ✅ 第二个 dogfood：`examples/bookmarks`
- ✅ OAuth/OIDC adapter + API 邮件 transport
- ✅ 可注入 fetch（OAuth 测试无需真实 IdP）
- ✅ OAuth 通用路由 + GitHub/Google 预设（examples/notes）
- ✅ SMTP（隐式 TLS/明文）、存储接口、开发自动刷新、CI 模板
- ✅ S3 兼容存储（SigV4 PUT）、OAuth PKCE（S256）
- ✅ `qc pack` 预编译包（`dist/index.mjs`/`dist/cli.mjs`）
- ✅ `qc new` 通过 `@qingcheng/qc` 包导入（本地 file/symlink）
- ✅ S3 presign/delete、OAuth refresh
- ✅ S3 multipart、OAuth 并发锁/撤销、CI workflow
- ✅ S3 大文件（并发/重试/checkpoint）、OAuth token AES-GCM
- ✅ 第三个 dogfood：guestbook；OAuth previousTokenKeys 轮换
- ❌ npm 发布/远程包 / 组件级 HMR / 扫描/限速（P16）

## 注意

- 运行需要 Node 24 与 `--experimental-strip-types`。
- `qc new` 目前写入指向本机框架源码的绝对 bridge；P2 打包后改为包导入。
