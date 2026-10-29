# Life Brand Marks

> 17 个徽标：Life 统合 + 16 款应用。  
> 源文件：[`brand/logos/`](logos/) ｜ 运行副本：[`packages/web/logos/`](../packages/web/logos/)

## 设计规则

- 64 × 64，圆角 15；
- 底色 = 应用 accent，图形 = 暖白 `#FFFDF7`；
- 统一 3.2px 线宽、圆角线帽；
- 不使用细碎文字，缩到 28px 仍可辨认；
- 图形是应用语义，不是首字母缩写。

## 应用

| id | Logo | 语义 |
| --- | --- | --- |
| life | 小孩头像 | 人的生活相关；不依赖应用数量 |
| ledger | 账本 | 慢慢记 |
| sleep | 月亮 | 好好睡 |
| meal | 碗与热气 | 慢慢吃 |
| move | 动线 | 慢慢走 |
| read | 打开的书 | 慢慢读 |
| home | 房子 | 好好住 |
| wear | 衣架 | 好好穿 |
| hydrate | 水滴 | 慢慢喝 |
| journal | 笔尖 | 慢慢写 |
| watch | 银幕/播放 | 慢慢看 |
| listen | 耳机 | 慢慢听 |
| learn | 学士帽 | 慢慢学 |
| travel | 指南针/地点 | 慢慢行 |
| care | 叶与芽 | 好好养 |
| organize | 方格 | 好好整 |
| connect | 对话气泡 | 慢慢聊 |

## 使用

- 应用顶栏：`/shared/logos/<id>.svg`
- 统合主页与节律页：`/shared/logos/life.svg`
- 修改源文件后运行：

```bash
cd products/life
npm run logos
```

`tools/build-logos.ts` 会同时更新 `brand/logos/` 与 `packages/web/logos/`。
