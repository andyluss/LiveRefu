# Guestbook · 第三个 dogfood

公开留言板；无 auth/CSRF，验证同一框架可承载第三种应用形态。

```bash
npm run db:migrate
npm run dev
# http://127.0.0.1:3300
```

测试：`qc/test/guestbook.test.ts`。
