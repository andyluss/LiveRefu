# Three.js vendor

当前版本：**0.187.0**（r187，npm latest，2026-11-17 核对）

来源：

- https://registry.npmjs.org/three/latest → `0.187.0`
- https://unpkg.com/three@0.187.0/build/three.module.js
- https://unpkg.com/three@0.187.0/build/three.core.js
- https://unpkg.com/three@0.187.0/LICENSE

`three.module.js` 在 r187 中会 `import './three.core.js'`，因此两个文件必须一起保留，不能只放 `three.module.js`。

更新步骤：

```bash
curl -L --fail https://unpkg.com/three@<version>/build/three.module.js -o three.module.js
curl -L --fail https://unpkg.com/three@<version>/build/three.core.js -o three.core.js
curl -L --fail https://unpkg.com/three@<version>/LICENSE -o THREE-LICENSE
```

然后重新启动静态服务器并验证：

```bash
./run.sh game03
./run.sh game03-test
```

注意：升级前先看 [Three.js migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)，并检查 `game03/src/main.js` 的 API 兼容性。
