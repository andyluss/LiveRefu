# Life · 个人生活应用套件

> **版本**：3.2.0 ｜ **状态**：16 款 + 统合主页 ｜ **日期**：2026-10-29
> **一句话**：七款各自独立、共享同一套工程与设计语言的生活应用。
> **成员**：慢慢记、好好睡、好好吃、慢慢走、好好读、好好住。
> **原则**：本地优先、零依赖、单文件数据、可单独分发，也可未来统合。

## 应用与统合入口

| 应用 | 目录 | 端口 | 解决的问题 |
| --- | --- | --- | --- |
| Life 统合主页 | [`web/`](web/) | 4200 | 16 款应用入口与状态聚合 |
| 慢慢记 Manmanji | [`apps/ledger/`](apps/ledger/README.md) | 4206 | 记账、预算、自由职业发票 |
| 好好睡 Sleepwell | [`apps/sleep/`](apps/sleep/README.md) | 4201 | 睡眠时长、质量、影响因素 |
| 好好吃 Mealtime | [`apps/meal/`](apps/meal/README.md) | 4202 | 三餐、蔬菜、饮水、饮食感受 |
| 慢慢走 DailyWalk | [`apps/move/`](apps/move/README.md) | 4203 | 步行/运动、强度、心情、连续天数 |
| 好好读 ReadingLog | [`apps/read/`](apps/read/README.md) | 4204 | 阅读页数/时长、书、摘录 |
| 好好住 HomeBoard | [`apps/home/`](apps/home/README.md) | 4205 | 家务/维护、区域、到期、完成 |
| 好好穿 Wearwell | [`apps/wear/`](apps/wear/README.md) | 4207 | 穿搭、衣橱、洗衣、愿望清单 |
| 好好喝 Hydrate | [`apps/hydrate/`](apps/hydrate/README.md) | 4208 | 饮水、配方、杯具、咖啡因 |
| 好好写 Journal | [`apps/journal/`](apps/journal/README.md) | 4209 | 日记、提示卡、回顾、感恩 |
| 好好看 Watchlog | [`apps/watch/`](apps/watch/README.md) | 4210 | 电影/剧集、片单、影院、进度 |
| 好好听 Listenlog | [`apps/listen/`](apps/listen/README.md) | 4211 | 专辑/播客、歌单、现场、设备 |
| 好好学 Learnlog | [`apps/learn/`](apps/learn/README.md) | 4212 | 学习会话、课程、技能、笔记 |
| 好好行 Travellog | [`apps/travel/`](apps/travel/README.md) | 4213 | 出行、地点、行程、纪念物 |
| 好好养 Carelog | [`apps/care/`](apps/care/README.md) | 4214 | 植物/宠物照护、计划、健康、用品 |
| 好好整 Tidylog | [`apps/organize/`](apps/organize/README.md) | 4215 | 整理、空间、物品去向、捐赠 |
| 好好聊 Connect | [`apps/connect/`](apps/connect/README.md) | 4216 | 联系、人物、礼物、重要日期 |

## 统合点

```text
packages/core   同一套 AppConfig / JSON store / HTTP / 校验 / summary
packages/web    同一套 token、组件、表单、列表、图表、空态
apps/*          只写领域字段与 summary；不复制服务端/前端框架
```

- 十三款节律 app 通过 `createLifeApp(config)` 启动；慢慢记是自定义财务 app；
- 十三款节律 app 共享 `{version, settings, entries, modules}` store；慢慢记保留自己的财务 store；
- 十四款 app 共享 `--life-*` / `--mm-*` 主题 token 与同一套主题控制；
- 每个 app 可单独 `npm start`，也可用 `tools/bundle.ts` 打包成独立目录；统合主页用 `npm run home`。

详见：

- [`docs/00_统合总纲.md`](docs/00_统合总纲.md)
- [`docs/01_工程规范.md`](docs/01_工程规范.md)
- [`docs/02_设计系统.md`](docs/02_设计系统.md)
- [`docs/03_系统架构.md`](docs/03_系统架构.md)
- [`docs/04_数据模型.md`](docs/04_数据模型.md)
- [`docs/05_应用矩阵.md`](docs/05_应用矩阵.md)
- [`docs/06_未来统合.md`](docs/06_未来统合.md)

## 快速开始

```bash
cd products/life/apps/sleep
npm start          # http://127.0.0.1:4201
```

十四款同时跑：

```bash
cd products/life
npm run dev:all
```

检查：

```bash
npm test
npm run check
```

## 与慢慢记的关系

慢慢记是「财务 + 发票」；Life 是「日常节律」。
两者共享：本地优先、Node 24、无框架 Web、JSON 持久化、产品皮肤、可独立分发、未来可统合。
