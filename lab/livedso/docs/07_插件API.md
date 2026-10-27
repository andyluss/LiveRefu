# LiveDSO · 本地检查插件 API

> 状态：v0.9 ｜ 日期：2026-10-27 ｜ 原则：**本地优先，不上传、不执行远程代码**
> 相关：R05（变更日志）、v0.8 本地 CI

## 一、它是什么

本地插件让团队把**品牌/命名/业务规则**接进检查链：

- `check` / `report` / `ci` / Workbench 的 Checks 都能看到插件 issue；
- 插件是本地 `.mjs` / `.js` 文件；
- 不联网、不读云、不上传 vault；
- **没有沙箱**：只加载你信任的本地代码。

## 二、目录与加载

默认目录：`lab/livedso/plugins/`。

```bash
node src/cli.ts check --plugins ./plugins
LIVEDSO_PLUGINS=./plugins node src/cli.ts ci
node src/cli.ts serve 4173   # 默认加载 lab/livedso/plugins/
```

- 加载目录下所有 `.mjs` / `.js`；
- 文件默认导出：
  - 函数：`({ vault, version }) => Issue[]`；
  - 或对象：`{ name, check({ vault, version }) { ... } }`；
- 返回 issue：

```js
{ code: 'brand.rule', severity: 'warn', path: 'optional', message: '...', detail: '...' }
```

`severity` 取 `error` / `warn` / `info`；缺失时按 `warn`。

## 三、示例

```js
// plugins/brand-rules.mjs
export default {
  name: 'brand-rules',
  check({ vault }) {
    const issues = []
    for (const t of vault.tokens.values()) {
      if (t.path.startsWith('product.') && !t.description) {
        issues.push({
          code: 'brand.product-description',
          severity: 'warn',
          path: t.path,
          message: 'product token 必须写 $description。'
        })
      }
    }
    return issues
  }
}
```

运行：

```bash
node src/cli.ts check --plugins ./plugins
```

插件 issue 会进入健康分：`error` 扣 14、`warn` 扣 4，和内置检查同一套口径。

## 四、CI

```bash
node src/cli.ts ci --plugins ./plugins --strict
```

插件 `error` 会阻断；`warn` 在 `--strict` 下阻断。

## 五、自检

单 vault：

```bash
node src/cli.ts plugin-test --plugins examples/plugins
```

跨 vault 矩阵：

```bash
node src/cli.ts plugin-test --all --plugins examples/plugins
node src/cli.ts plugin-test --all --plugins examples/plugins --json
```

矩阵按 `vaults.json` 逐个 vault 跑同一插件，输出 plugins / issues / errors；任一 vault 加载失败或 issue 为 error 时退出码 `1`。


## 五、安全边界

- **只加载本地可信代码**；不加载远程/第三方 URL。
- 插件运行在 LiveDSO 进程内，**没有沙箱**；能读当前进程权限内的文件。
- 插件加载失败会产生 `plugin.load` error；运行抛错会产生 `plugin.runtime` error，不会静默吞掉。
- 不上传 vault、token、代码。

## 六、示例

可复制示例：

- [`../examples/plugins/brand-rules.mjs`](../examples/plugins/brand-rules.mjs)
- [`../examples/plugins/token-naming.mjs`](../examples/plugins/token-naming.mjs)

```bash
node src/cli.ts check --plugins examples/plugins
```

## 七、边界

- 不做云插件市场；
- 不做账号/权限；
- 不做远程插件签名/沙箱；
- 插件 API 是本地扩展点，不是托管平台。
