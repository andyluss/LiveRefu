# Godot Kit · 游戏介质适配

> 消费 `design/tokens/dist/godot/tokens.json`（由 `design/tools/build_tokens.ts` 生成）。
> 当前试点：[《未来残片》](../../../projects/mainline/future-debris/README.md)。

## 一、产物

| 文件 | 内容 | 谁消费 |
| --- | --- | --- |
| `tokens/dist/godot/tokens.json` | 与现有 `game/data/tokens.json` **同 schema**：18 个颜色、5 级字号、间距/圆角/描边/动效/图标 | `TokenSet` → `ThemeBuilder` |
| `projects/mainline/future-debris/game/data/tokens.json` | 上述文件的**产品副本**（生成物，勿手改） | 游戏运行时 |
| `game/assets/theme/future_debris.tres` | 由 `ThemeBuilder` 从 token 编译的 Theme 资源（生成物） | Godot 场景 |

## 二、为什么保持现有 schema

《未来残片》已经有 `TokenSet` / `ThemeBuilder` / `theme_check.gd` 一整套“token → Theme → 断言”的管线。v0.1 **不重写它**，只把 `game/data/tokens.json` 换成生成物：

```
design/tokens/products/future-debris.atomic.tokens.json
        │ build_tokens.ts
        ▼
game/data/tokens.json  →  TokenSet  →  ThemeBuilder  →  future_debris.tres
                                                   │
                                                   ▼
                                         theme_check.gd（15 项断言）
```

这样“单一事实来源”上移到 `design/tokens/`，游戏侧的验证管线一行不改。

## 三、产品语义映射

| 产品 token | 映射到 | 说明 |
| --- | --- | --- |
| `power` | `sys.color.action.primary` | 电力 = 行动色 |
| `residue` | `sys.color.feedback.danger` | 残渣 = 危险色 |
| `focus` | `sys.color.focus.ring` | 焦点独立，不复用强调色 |
| `warn` / `ok` | `sys.color.feedback.warning` / `success` | 状态语义 |

> `power` / `residue` 是**玩法语义**，只存在于产品层；核心层不认识“电力/残渣”。

## 四、规则

- **不要手改 `game/data/tokens.json`**：它是生成物。改 `design/tokens/products/future-debris.atomic.tokens.json`。
- 场景/脚本里**不允许出现字面量颜色或字号**；一律通过 Theme 取值。
- 新增纪元 = 新增一张产品风格卡 + 在 `build_tokens.ts` 里选择导出；语法层不动。
- 焦点环用 `--focus`（2px + 1px offset），不得复用 `--accent` / `--power`。

## 五、验收

```bash
node --experimental-strip-types design/tools/build_tokens.ts --check
cd projects/mainline/future-debris
python3 tools/check_tokens.py      # 文档 ↔ 生成物对账
./run.sh contrast                  # 30 组对比度 + 层级 + 样张
./run.sh theme                     # 编译 Theme + 15 项断言
```

> `check_tokens.py` 仍是项目的“文档 ↔ 引擎”对账；`build_tokens --check` 是“设计源 ↔ 引擎”的对账。两者都过，才说明三角一致。
