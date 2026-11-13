# 02 · App Kit 接入

> App Kit 状态：**Web/PWA 消费者**；尚未完成 iOS/Android 原生壳与真机走查。

## 消费什么

来源：[`design/tokens/dist/app/tokens.json`](../../../design/tokens/dist/app/tokens.json)

| App Kit | 本产品 |
| --- | --- |
| `sys.color.*` | 3 套皮肤的基础语义与状态色 |
| `size.touch.min` 44 | 所有按键最小触控高度 `max(52px, 44px)` |
| `space` / `radius` / `border` | 间距、圆角、焦点环 |
| `type` 5 级 | 显示、正文、说明、纸带 |
| `accessibility` | 对比度、触控、焦点、减少动态 |

## 产品皮肤

本地源：[`../design/skins.json`](../design/skins.json)；生成物：[`../web/tokens.css`](../web/tokens.css)。

```bash
node tools/build-theme.js            # 生成
node tools/build-theme.js --check    # 对账
node tools/build-theme.js --self-test
```

三套皮肤：Archive / Console / Phosphor。生成器检查正文、次要文字与行动色对比度。

## 验收清单

- [x] 颜色来自 token / 皮肤，业务 CSS 无裸 hex；
- [x] 触控命中 ≥ 44（实际 52）；
- [x] 安全区适配（viewport-fit + safe-area）；
- [x] 键盘焦点可见，焦点不复用行动色；
- [x] 减少动态；
- [x] 纸带与当前计算分离；
- [x] 离线 Service Worker；
- [ ] 200% 系统字号真机走查（待设备）；
- [ ] iOS/Android 原生壳与真机走查（待第二阶段）；
- [ ] 屏幕阅读器真机走查（待设备）。

> 未完成项不能写成“已通过”；这也是 App Kit 的边界。

## 未来

1. 需要上架时，用 Capacitor 包一层原生壳；
2. 真机验证 Dynamic Type / fontScale、安全区、返回手势；
3. 再决定是否生成 Swift/Kotlin 常量与 `product.calculator` 风格卡；
4. 不把 13 套旧皮肤全部带进产品。
