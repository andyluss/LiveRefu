# Bookmarks · 第二个 dogfood

公共书签；无 auth、无 CSRF（因为未启用 auth）。用于验证框架复用：

```bash
npm run db:migrate
npm run dev
# http://127.0.0.1:3200
```

范围：P6 dogfood；测试在 `qc/test/bookmarks.test.ts`。
