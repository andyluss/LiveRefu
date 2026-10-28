# LiveDSO · 本地检查插件 API

> 版本：v1.3.1 ｜ 日期：2026-10-28 ｜ 原则：本地优先，不上传、不执行远程代码

## 一、它是什么

本地插件让团队把品牌/命名/业务规则接进检查链：

- `check` / `report` / `ci` / Workbench 的 Checks 都能看到插件 issue；
- 插件是本地 `.mjs` / `.js`；
- 不联网、不读云、不上传 vault；
- 没有沙箱：只加载你信任的本地代码。

## 二、目录与加载

默认目录：`lab/livedso/plugins/`。

```bash
node src/cli.ts check --plugins ./plugins
LIVEDSO_PLUGINS=./plugins node src/cli.ts ci
node src/cli.ts serve 4173
```

文件默认导出：

- 函数：`({ vault, version }) => Issue[]`；
- 或对象：`{ name, check({ vault, version }) { ... } }`。

Issue：

```js
{
  code: 'brand.rule',
  severity: 'warn',        // error / warn / info
  path: 'optional',
  message: '中文说明',
  messageEn: 'English message',
  detail: '中文细节',
  detailEn: 'English detail'
}
```

## 三、示例

```js
// plugins/brand-rules.mjs
export default {
  name: 'brand-rules',
  check({ vault }) {
    return [...vault.tokens.values()]
      .filter(t => t.path.startsWith('product.') && !t.description)
      .map(t => ({
        code: 'brand.product-description',
        severity: 'warn',
        path: t.path,
        message: 'product token 必须写 $description。',
        messageEn: 'product tokens must include $description.'
      }))
  }
}
```

插件 issue 进入健康分：`error` 扣 14、`warn` 扣 4。

## 四、CI

```bash
node src/cli.ts ci --plugins ./plugins --strict
```

插件 `error` 阻断；`warn` 在 `--strict` 下阻断。

## 五、自检

```bash
node src/cli.ts plugin-test --plugins examples/plugins
node src/cli.ts plugin-test --plugins examples/plugins --json
node src/cli.ts plugin-test --all --plugins examples/plugins
node src/cli.ts plugin-test --all --plugins examples/plugins --json
```

矩阵按 `vaults.json` 逐个 vault 跑同一插件；任一 vault 加载失败或 issue 为 error 时退出码 1。

## 六、安全边界

- 只加载本地可信代码，不加载远程 URL；
- 插件运行在 LiveDSO 进程内，没有沙箱；
- 加载失败产生 `plugin.load`，运行抛错产生 `plugin.runtime`；
- 不上传 vault/Token/代码。

## 七、示例目录

- [`../examples/plugins/brand-rules.mjs`](../examples/plugins/brand-rules.mjs)
- [`../examples/plugins/token-naming.mjs`](../examples/plugins/token-naming.mjs)
