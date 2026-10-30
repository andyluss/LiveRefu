# M1 渲染切片：磁带频道「渲染器选择」对照结论 + 磁带滤镜 2D 后处理性能预算（初估 v0.1）

> 图形程序员 A · 2026-09-08 · 状态：**切片结论供主程序拍板；性能预算为初估，待主程序确认验收档位与应用**。
> 依据/承接：主程序 [03_Godot引擎调研](../lead-programmer/03_godot-engine-research.md)（§4 四渲染后端、§8 平台导出）；本角色 [01_渲染与后处理技术草案](01_rendering-tech-draft.md)（后处理栈骨架）、[02_性能预算与渲染任务清单](02_perf-budget-tasks.md)（预算表）、[04_回执GDD](04_response-gdd.md)（§五 适配评价、§八 双层光）；主美术 [04_回执GDD](../lead-artist/04_response-gdd.md)（§4 #2 双层光、#3 色域）；开发计划 [`plans/00-project-plan.md`](../../plans/00-project-plan.md)（§三 M1、§四 依赖、§五 风险、§六 待办）。回应 M1 分工「渲染器对照切片结论 + 磁带滤镜 2D 性能预算」。
> 已定前提：技术主线 **Godot 4.7.x 桌面导出**；M1 = 单频道（磁带暖未来）闭环；M1 第一周**必锁渲染器**。

---

## 一、一句话结论

**渲染器选 Compatibility；M1 磁带频道的 2D 后处理（双层光 + 扫描线 + 微噪）不需要 Forward+、不需要 HDR、不需要真 bloom**，且 Web 降级天然要求 Compatibility —— 三位一体，倾向性非常明确。**M1 磁带滤镜最小 2D 后处理预算：动效全开（基底+双层光+扫描线+微噪）单频道上屏 ≈ 0.6–1.3 ms，动效全关（静默可用）≈ 0.2–0.5 ms**，均远在 ≤3 ms 后处理预算与 60 FPS（16.7 ms）之内。**建议主程序拍板：M1（及优先级考虑下整包三频道）统一 Compatibility/2D，磁带暖光用 2D 假辉光，不用真 bloom。**

真正要在 M1 第一周锁定的不是「能不能做」，而是**主程序对执行壳渲染目标、是否每频道切渲染后端、暖光真 bloom vs 2D 假辉光的拍板**（见 §五）。性能数值本身不是瓶颈。

---

## 二、渲染器对照切片：Compatibility vs Forward+（磁带频道 2D 后处理）

> 磁带频道是**2D/UI 重**（主程序 03 报告 §五「方向 A 主舞台」）。把它的渲染件列出来看哪些吃后端：**没有一件需要 Forward+ 独占特性**（见下表列「对磁带 2D 后处理」）。下表逐维度对照两个后端对磁带后处理的适配度。

### 2.1 逐维度对照表

| 维度 | Compatibility（OpenGL/WebGL） | Forward+（Vulkan） | 对「磁带 2D 后处理」的意义 | 判定 |
| --- | --- | --- | --- | --- |
| 定位/图形 API | 2D、UI、Web、老硬件（主程序 03 §4.1） | 桌面/主机级 3D、光源多特效全 | 磁带是 2D/UI 重 → 定位就对口 Compatibility | **Compatibility 对口** |
| 2D/Canvas 能力 | 完整 2D 引擎：CanvasItem/层/视口/2D 灯光/粒子/法线（官方 2D 文档） | 同样具备完整 2D | 磁带要的层（信号/容器/动效）、2D 假辉光、遮罩都是 2D 能力，**两后端都有** | 打平 |
| 屏幕后处理（全屏 pass / `hint_screen_texture` / 屏幕读取） | 支持 canvas/screen shader 的屏幕纹理读取与后处理（Compatibility renderer 有自研后处理路径，2D 后处理可用） | 完整后处理栈 | 磁带是「屏幕级 2D 后处理」→ 需全屏 pass；两后端都能写，但 **Compatibility 的 2D 后处理路径即可覆盖** | 打平（Compatibility 够用） |
| **HDR / 真 bloom（Environment glow）** | **OpenGL 后端下 Environment glow 未实现**（godotengine #66455：`OpenGL: Environment glow not implemented yet`） | 完整 HDR 渲染 + bloom（4.7 新增 HDR 输出） | 磁带暖光**不依赖**真 bloom/HDR → 见 2.2 | **Forward+ 独占优势，但磁带用不到** |
| 2D 假辉光（径向渐变 / 加法叠加 sprite / `PointLight2D` / 2D 灯光） | **完整支持**（2D 灯光与阴影是独立系统，官方 2D 文档；additive sprite 作 2D 灯光的低耗替代） | 同样支持 | 磁带「容器暖光」用这个 → **Compatibility 原生、低负载** | **Compatibility 原生** |
| 性能/硬件覆盖 | 更省、占用低、覆盖老硬件与入门机 | 功能强但开销更高，需强 GPU | 氛围陪伴是常驻低耗场景 → 负载低是硬约束 | **Compatibility 更优** |
| **Web 导出降级** | **Compatibility 是 Web 导出（WebGL2）的主要/可用后端** | **Forward+/Mobile（Vulkan）不可用于 Web** | GDD §2 平台策略：Web 作次期降级（主程序 03 §8）→ 若用 Forward+，Web 版要换后端重做 | **Web 降级必须 Compatibility** |

### 2.2 三个关键判断

1. **HDR/真 bloom 是否必要？→ 不必要。** 磁带「容器暖光 × 频道色」双层光里，暖光 = 容器层皮肤上的**小范围径向渐变 + 加法辉光 + `PointLight2D` 局部照明**（2D 假辉光），频道色 = 信号层窗口区的 LUT 颜色分级；两者都用**区域/分层遮罩**隔离（见 04 回执 §八 Way A），**不接触 HDR 高动态范围，不需要 Environment glow 的真 bloom**。真 bloom（HDR 输出、高亮霓虹过曝）是 Forward+ 独占，而且在 Compatibility(OpenGL) 下**Environment glow 未实现**（godotengine #66455）—— 用它反而把磁带绑死 Forward+，与「低负载、Web 降级」目的相悖。**结论：磁带走 2D 假辉光。**

2. **性能。** 磁带后处理全部是 2D 屏幕级：LUT 颜色分级、扫描线/微噪的 tileable 纹理叠加、暖光径向辉光、一次窗口遮罩切割。这些在 Compatibility 下**成本低、杠杆明确**（单全屏 pass 合并 + tileable 叠加，见 §三）。Forward+ 在「纯 2D 场景」**没有收益**，反而引入 Vulkan 依赖与非 Web 限制。**结论：Compatibility 是磁带的最优解，不是将就。**

3. **Web 降级。** GDD §2「Web 版作次期降级」、主程序 03 §8「Web 导出 4.6+ 持续改进」。Compatibility = WebGL 是 Web 端可用后端；Forward+/Mobile（Vulkan）**不上 Web**。若 M1 用 Forward+，到 Web 降级时**后处理栈要整个换后端重做**（全屏 pass、遮罩、材质语言均不同）。**结论：用 Compatibility 一次到位，Web 版零返工。**

### 2.3 对照切片结论（给主程序拍板建议）

| 项 | 建议 | 理由 |
| --- | --- | --- |
| **M1 磁带专用渲染器** | **Compatibility（/2D）** | 2D/UI 对口、低负载、2D 假辉光原生、Web 降级免费 |
| **HDR / 真 bloom** | **不用**；磁带暖光用 **2D 假辉光** | 不依赖 HDR；真 bloom 是 Forward+ 独占且在 Compatibility 未实现 |
| **是否每频道切后端（M2 决策，M1 不触发）** | **倾向整包统一 Compatibility/2D**（单后端最省）；是否切留给主程序在 M2 前拍板 | 磁带/太空/蒸汽波三滤镜按我 04 回执同为 2D 屏幕/背景级（星雾=UV 滚动+粒子、慢色偏=色带映射）；**若能统一单后端，共用同一个 pass 与遮罩，免去「切后端=后处理栈双实现」**。 |
| **Web 降级** | **Compatibility 天然覆盖**，无额外成本 | WebGL 是 Web 端后端；Forward+ 不上 Web |

> **一句话给主程序：M1（以及优先级考虑下的整包三频道）锁 Compatibility/2D；磁带暖光用 2D 假辉光；二/三频道是否切后端留给 M2 前定，我判断若能统一 Compatibility/2D 则单后端最省。M1 不涉及切换，不受此项阻塞。**

---

## 三、M1 磁带频道最小 2D 后处理性能预算（初估）

> ⚠️ **本预算为初估，标注【待主程序确认应用】**：数值基于 1080p 桌面、未针对性优化，判断基准来自我 02 草案（原型 60 FPS、M2 稳定 30 FPS、后处理全开 ≤3 ms/frame、2D DrawCall ≤500）。**最终数值须在主程序锁定的目标机型上跑「效果开/关 A/B」（10 秒区间投影测）后校准，本初估仅作拍板排序用，不当作实测口径。**
> 口径：氛围陪伴一次只渲染一个频道；「三滤镜同时上屏」只作性能 A/B 对照，不生产启用（见 04 回执 §四）。

### 3.1 M1 渲染件 → 成本表（逐 effect）

> 层归属、是否可关、实现要点引自开发计划会意见（会议纪要）与我 04 回执 §八。「可关？」列的「否」= 属基底（静默可用仍保留）。

| 渲染件 | 层 | 可关？ | 成本（1080p 桌面，估） | 实现要点 | 静态回退 |
| --- | --- | --- | --- | --- | --- |
| 磁带 LUT + 终端边框 + 自发光屏静态纹理 | 基底 | 否 | **< 0.1 ms** | 静态贴图/材质，无屏幕采样 | 本身即静态 |
| 容器层 2D 皮肤（刻度盘/旋钮/网罩/电源灯/天线）+ **暖光径向辉光** | 基底 | 否（暖光常亮属基底） | **0.1–0.3 ms** | Way A 分层合成；径向渐变 + `PointLight2D`/加法小范围辉光，集中在层内**小区域**，非全屏重采样 | 本身即静态（保持常亮） |
| 中央窗口遮罩（信号层裁剪区） | 结构 | 否 | **< 0.05 ms** | 遮罩矩形/圆角裁剪，一次切割 | 本身即静态 |
| **扫描线**（tileable 叠加） | 动效 | 是 | **< 0.1 ms** | `ColorRect` + `ShaderMaterial` 叠加 + UV 缓移；**不做**屏幕纹理重采样 | 转静态半透明扫描线纹理（不滚动）/隐藏 |
| **微噪**（luma noise） | 动效 | 是 | **0.05–0.1 ms** | tileable 噪点纹理叠加（或低采样率 shader 噪点） | 冻结为静态噪点纹理/隐藏 |
| **暖光呼吸 / 辉光动态** | 动效 | 是 | **0.05–0.1 ms** | 独立子场景，呼吸振幅/辉光强度动画 | 隐藏（仅保留暖光常亮） |

### 3.2 单频道上屏累计

| 态 | 构成 | 累计成本（估） |
| --- | --- | --- |
| **动效全关 = 静默可用** | 基底（LUT+终端边框+自发光屏）+ 容器层皮肤 + 暖光常亮 + 遮罩 | **≈ 0.2–0.5 ms** |
| **动效全开（M1 目标态）** | 上者 + 扫描线 + 微噪 + 暖光呼吸 | **≈ 0.6–1.3 ms** |
| 对照基准 | 60 FPS = 16.7 ms/帧；后处理全开预算 ≤3 ms | 全开态占比 **≤8%**（≈0.6–1.3/16.7） |

> 判读：**单频道最重态（含双层光 + 扫描线 + 微噪）≈0.6–1.3 ms，未触发 ≤3 ms 预算上限，60 FPS 无压力、30 FPS 亦远超下限。** 这正好是开发计划会强调的「M1 是整个项目单频道成本最重的一点，第一刀就落在 M1 验证杠杆」。

### 3.3 其他资源维度

| 指标 | 预估 | 说明 |
| --- | --- | --- |
| 2D DrawCall 增量 | **≤ 8** | 基底 1 + 容器层 1 + 遮罩 1 + 扫描线 1 + 微噪 1 + 呼吸 1 + 潜在合并；远低于 2D ≤500 上限 |
| 显存增量 | **< 16 MB** | 接收机皮肤 + 暖光径向 + 磁带 LUT + tileable 扫描线/噪点；纹理压缩（ASTC/BC） |
| Shader/加载 | 每频道 1–2 材质 | 切频道前**预热/预编译**，避免切换掉帧（对接主程序加载管线 ≤5 s） |
| 后台常驻 / 托盘 / 迷你窗态 | 暂停 **<0.3 ms**；迷你窗保活动画 ≈0.5 ms | 降分辨率 0.25–0.5× + 降帧 15–30 + 暂停动效与粒子；全局快捷键唤回全量恢复（见 §五 待定） |

### 3.4 性能工程杠杆（M1 验证、M2 复用）

1. **合并成单次全屏 pass + 按频道 feature 分支**：共享调色/矩阵运算，杜绝多次屏幕纹理拷贝（尤其动效全开态，避免多 pass 重复采样）；
2. **磁带用 tileable 纹理叠加**（`ColorRect`+`ShaderMaterial`）取代屏幕纹理重采样：把扫描线/微噪压到 **<0.1 ms**；
3. **后台态主动降分辨率/降帧/暂停动效**，把常驻负担压到可忽略；
4. 暖光辉光**限定在容器层小区域**（径向渐变 + 加法），不做全屏 bloom，从源头规避 HDR/真 bloom。

> 正式的「三频道 效果开/关 A/B 报告」放到 M2（02 草案 §三），但这四条杠杆在 M1 磁带闭环先跑通、测量干净。

---

## 四、「静默可用」的静态回退（M1 验收口径）

图形侧把「动效全关频道仍成立」当作一等公民特性（04 回执 §三），M1 落成：

- **关动效 = 隐藏叠加层**：仅翻转扫描线/微噪/暖光呼吸的节点可见性，**不改基底场景树与调色**；
- **静态回退构成（仍成立）**：暖色磁带 LUT + 终端边框 + 自发光屏静态纹理 + 容器层 2D 皮肤（刻度盘/旋钮/网罩/电源灯）+ **暖光常亮** + 中央窗口遮罩 → 就是一盏亮着灯、一块静止刻度盘的「灯下接收机」，母意象完整（主美术 04 回执 §1.3「静态也成立」）。
- 双档用户可及性（对齐 GDD §8.7、04 回执 §八 8.4）：**「灯下气氛」开**＝暖光+辉光+呼吸保持；**「灯下气氛-减轻」**＝仅暖光常亮（关辉光/呼吸）。不提供「完全无暖光」档（主美术判断：那是灭灯，非频道）。
- **M1 验收**：交付「动效开 / 关」两态截图（同一套 LUT/材质）作主美术与 UI 美术的验收基准，实证「关动效频道仍成立」。

---

## 五、需主程序/主美术确认的【待定】（M1 第一周前置）

> 语义：以下未拍板，则「渲染器选择」尚未真正闭环；均不阻塞 M1 代码开工，但**阻塞渲染器锁定**。以下为中心登记，不回改他人文档。

**向主程序（三个核心 + 两个直接相关）：**

| # | 【待定】 | 我的建议 | 为什么重要 |
| --- | --- | --- | --- |
| 1 | **执行壳渲染目标** | Godot 原生导出（macOS/Windows 原生）→ 我按 **Godot ShaderLanguage** 写材质；非 Electron/Tauri+Web 的 GLSL/WebGL2 | 决定材质写哪种 shader 语言，两套不通用；直接影响 M1 切片开工 |
| 2 | **是否每频道切渲染后端** | 整包统一 **Compatibility/2D**（单后端最省）；是否切留给 M2 前拍板 | 若切后端，Compatibility 全屏 pass 与 Forward+ 全屏 pass **不通用** → 后处理栈需双实现、成本高；统一单后端则共用同一 pass 与遮罩 |
| 3 | **暖光真 bloom（HDR/Environment glow）vs 2D 假辉光** | **2D 假辉光**（径向渐变/`PointLight2D`/加法小范围） | 真 bloom 是 Forward+ 独占且在 Compatibility(OpenGL) 未实现，会把磁带绑死 Forward+、断掉 Web 降级；2D 假辉光 Compatibility 原生、低负载 |
| 4 | 性能档位确认 | 认可 **60/30 FPS 验收 + 后处理全开 ≤3 ms**（我 02 草案口径） | 解锁本初估成为正式预算 |
| 5 | 后台常驻渲染策略 + 色彩管理 | 允许降分辨率/降帧/暂停动效；**sRGB vs Display P3** 由主程序定渲染与窗口色彩管理（联动主美术 #3） | 影响常驻负担与暖光/磁带 LUT 的色值域 |

**向主美术（与渲染切片直接相关，与 04 回执 §八 8.5 / §五 重复处略）：**

- 【待定】**容器暖光量化色值/色温**：琥珀背光色温、「设备自身暖光」vs「外部台灯」强度比例、辉光半径 —— 收敛进 `data/fx_preset.json`。
- 【待定】**中央窗口区域界定**：中央屏尺寸/位置/圆角/遮罩形状 —— 决定信号层裁剪区与容器遮罩边界。
- 【待定】**磁带动效视觉样本**：扫描线密度与微噪强度（+ 太空星雾/蒸汽波慢色偏，M2 用）—— 收敛进 `data/fx_preset.json`。
- 【待定】**静态回退验收基准**：动效关闭后各频道静态基准图（GDD §9「静态图 + 音景」）。
- 【待定】**sRGB vs 广色域（Display P3）**：容器暖光高亮辉光在广色域下的色值域（联动主程序 #5）。

> 说明：主美术 04 回执 §4 把「双层光合成方案（#2）」「滤镜栈（#5）」列为 M1 前置，本切片已就这两个方向给出实现与预算（§三、§四），剩余【待定】聚焦**拍板**而非**能不能做**。

---

## 六、M1 渲染切片落地步骤（图形程序员 A 职责内）

- [ ] 建 Godot 4.7.x **Compatibility** 验证项目：按「信号层/容器层/动效层」三 CanvasLayer 搭磁带场景 + 中央窗口遮罩；
- [ ] 实现基底（磁带 LUT + 终端边框 + 自发光屏静态纹理 + 容器层 2D 皮肤 + 暖光径向辉光 + 遮罩）；
- [ ] 实现动效（扫描线 tileable 叠加 + 微噪 + 暖光呼吸），全部节点可见性可关；
- [ ] 输出「动效开 / 关」两态截图 + 10 秒区间投影测（效果逐项单测，对齐 02 草案）；
- [ ] 把参数收敛进 `data/fx_preset.json`（参数以主美术定稿为准，占位可先行）。

---

## 七、决策记录

- 2026-09-08：以图形程序员 A 身份完成 M1 渲染切片 —— ① 渲染器对照结论：磁带频道 2D 后处理 **选 Compatibility**（2D/UI 对口、低负载、2D 假辉光原生、Web 降级免费），**不需要 Forward+ / HDR / 真 bloom**，暖光用 **2D 假辉光**；建议整包三频道尽量统一 Compatibility/2D（单后端最省）。② M1 磁带滤镜最小 2D 后处理性能预算（初估）：动效全开单频道上屏 ≈ **0.6–1.3 ms**、动效全关 ≈ **0.2–0.5 ms**、2D DrawCall 增量 ≤8、显存增量 <16 MB、后台暂停 <0.3 ms；均在 ≤3 ms 预算与 60 FPS 内。
- 2026-09-08：登记需主程序/主美术拍板的【待定】（执行壳渲染目标、是否每频道切后端、暖光真 bloom vs 2D 假辉光、性能档位、背景常驻/色彩管理）—— 见 §五；本文档为图形程序员 A 单一责任判断，性能预标注为初估、待主程序确认应用。

---

## 参考来源

- Godot 渲染器对照（Compatibility = OpenGL/WebGL、Forward+ = Vulkan；2D 与 Web 用 Compatibility）：[Godot Renderers（中文）](https://docs.godotengine.org/zh-cn/4.4/tutorials/rendering/renderers.html)、[Godot Renderers（EN）](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html)
- Compatibility(OpenGL) 后端 **Environment glow 未实现**（真 bloom 依赖的 HDR 后处理不在 Compatibility）：[godotengine#66455 OpenGL: Environment glow not implemented yet](https://github.com/godotengine/godot/issues/66455)、[godotengine#85375 Glow not supported warning](https://github.com/godotengine/godot/issues/85375)
- Godot 2D 灯光与阴影（`PointLight2D`/2D 灯光、additive sprite 作低耗替代），2D 后处理路径基础：[Godot 2D lights and shadows](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html)
- Godot 4.7 HDR 输出（Forward+ 相关新特性，可作为「若非磁带、若空间频道加辉光再启用」的扩展注记）：[HDR output arrives in Godot 4.7](https://godotengine.org/article/hdr-output-arrives-in-godot-4-7/)、[Godot 4.7 Release](https://godotengine.org/releases/4.7/)
- Godot Web 导出（Compatibility/WebGL 为 Web 可用后端）：[Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)

---

> 变更记录：
> - 2026-09-08：v0.1 建立 —— 渲染器对照切片（Compatibility vs Forward+，结论选 Compatibility、暖光用 2D 假辉光）+ M1 磁带滤镜最小 2D 后处理性能预算（初估，待主程序确认）+ 需主程序/主美术拍板的【待定】。

*（本切片为图形程序员 A 单一责任判断，供主程序渲染器拍板与工作室评审参考；性能数值为初估非实测。）*
