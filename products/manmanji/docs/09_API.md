# 09 · API

> 版本：v1.0 ｜ 仅本地 `127.0.0.1`；JSON in / JSON out。

## 读

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 版本/存活 |
| GET | `/api/state` | 完整 store |
| GET | `/api/export.csv` | 流水 CSV |
| GET | `/api/backup` | 完整 JSON 备份 |

## 写

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/accounts` | `{name,type,opening,color}`；`opening` 为分 |
| DELETE | `/api/accounts/:id` | 有流水/发票引用时 409 |
| POST | `/api/transactions` | `{type,amount,date,accountId,categoryId?,toAccountId?,note,tags}` |
| DELETE | `/api/transactions/:id` | 删除并重算 |
| POST | `/api/budgets` | `{month,categoryId,amount}`；同月同分类 upsert |
| DELETE | `/api/budgets/:id` | |
| PATCH | `/api/settings` | `{theme?,packs?}` |
| POST | `/api/reset` | 恢复 seed |
| POST | `/api/clients` | 包；`{name,company,email,note}` |
| DELETE | `/api/clients/:id` | 有发票引用时 409 |
| POST | `/api/invoices` | 包；`{clientId,issueDate,dueDate,items,taxRate,note,depositAccountId}` |
| POST | `/api/invoices/:id/send` | 草稿 → 待收 |
| POST | `/api/invoices/:id/pay` | 生成收入流水；幂等 |
| POST | `/api/invoices/:id/void` | 未收款可作废 |
| POST | `/api/invoices/:id/delete` | 仅草稿 |

## 金额

- API 只接受 **integer cents**；
- UI 输入元，提交前乘 100；
- 发票 `unitPrice` 也是 cents。

## 错误

```json
{ "error": "账户仍被流水引用，不能删除" }
```

4xx 是用户输入/状态问题；5xx 是服务问题。UI 直接显示 `error`。

## 示例

```bash
curl -s http://127.0.0.1:4190/api/state

curl -s -X POST http://127.0.0.1:4190/api/transactions \
  -H 'content-type: application/json' \
  -d '{"type":"expense","amount":2350,"date":"2026-10-28","accountId":"acc_cash","categoryId":"cat_food","note":"午餐","tags":[]}'

curl -s -X POST http://127.0.0.1:4190/api/invoices/inv_sample/pay
```
