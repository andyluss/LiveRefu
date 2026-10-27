# 01 · 早期谱系：从 Rampart 到 Desktop Tower Defense

> 卡面：用途＝逐作拆解塔防的**史前与定型期**（1980–2007），把"谁是前身、谁定名、谁定型"拆到机制层｜ 依赖：[论文第二节·七个构成要件](../00_塔防游戏研究_内涵与外延.md)、[论文第四节·历史谱系](../00_塔防游戏研究_内涵与外延.md)、[策划卷 04 塔防核心战斗](../../../projects/refu-game-001/docs/design/04_塔防核心战斗.md)｜ 状态：v0.1 · 2026-10-10
> 资料采集：2026-10-10；史实以英文维基**当前版本**为准，来源 URL 见第五节。凡证据链只有单向的，本卷逐条标注，不做互证式断言。

## 一、作品档案表

### 1.1 四个主案例

| 作品 | 首发 | 平台 | 开发者 | 发行商 | 类型定位 |
| --- | --- | --- | --- | --- | --- |
| Missile Command | 1980-06 | 街机 | Atari Inc.（设计 Dave Theurer） | Atari Inc. | 轨迹球反导防守；3 基地守 6 城市；被追认为塔防前身（单向引述） |
| Rampart | 1990-10（1991-02 广泛发售） | 街机 | Atari Games | Atari Games | 建造—炮击交替；维基称其"generally considered to have established the prototypical tower defense" |
| Flash Element TD | 2007-01-12 v1.0 | Flash（浏览器） | David Scott | 个人发布 | 自定义图玩法的浏览器复刻，元素塔类型学 |
| Desktop Tower Defense | 2007-03-03 | Flash（浏览器） | Paul Preece | 个人发布（后与 Scott 创办 Casual Collective） | 无预设路径的网格塔防；类型大众化的起点 |

### 1.2 前身清单（据维基 tower defense 条目）

| 年份 | 作品 | 被列入的理由 |
| --- | --- | --- |
| 1978 | Space Invaders | 守屏幕底部、护盾可阻挡，最早的"守住一条线" |
| 1980 | Missile Command | 用 3 个基地反导守 6 座城市；保护对象是城市而非角色 |
| 1981 | Defender | 侧视防守射击 |
| 1982 | Choplifter | 改为保卫**非玩家目标**，防守对象与玩家分离 |
| 1984 | Pedro | 早期园艺/防守题材 |
| 1993 | Ambush at Sorinor | 布置防御应对进攻波 |
| 1994 | Final Fantasy VI 小游戏 | 防守小游戏进入主流 RPG |
| 1997 | Final Fantasy VII · Fort Condor | 布防 + 波次 + 自动交战的完整小游戏 |
| 1997 | Dungeon Keeper | 陷阱/房间式防守布局 |
| 2000-05 / 2001-11 | Turret Defense / Sunken Defense（星际自定义图） | 可考**最早**的"某某 Defense"命名用法及其同谱系样本 |
| 2001 | Fortress（GBA） | 手持平台的塔防化尝试 |
| 2002 | Warcraft III | 自定义地图把塔防固化为模板（论文 4.2） |
| 2006-02 | Element TD / Gem Tower Defense（魔兽 III） | 命名与类型学同时成熟 |

## 二、机制拆解：五要件逐项对照

下表用论文第二节的五个空间—时间—资源要件（路径、塔位、资源、波次、失败判据）做行，逐作对照；要件六、七（局外分层、布防—观察—调整）另列一栏备注。

| 作品 | 路径 | 塔位 | 资源 | 波次 | 失败判据 | 六/七要件备注 |
| --- | --- | --- | --- | --- | --- | --- |
| Missile Command | 无地面路径；来袭弹道多路随机 | 3 个基地＝固定发射位 | 每基地弹药有限 | 连续波次，一波多路径 | 6 座城市被摧毁即结束 | 无局外分层；玩家全程手动介入 |
| Rampart | 海域/陆路进攻，路径受己方墙体围合关系影响 | 城墙格 + 城堡内炮位 | 建造方块（拼图资源） | 建造阶段／战斗阶段回合交替 | 城堡失守；未围合区域与其中炮台归敌方 | 无局外分层；"布防与交战的时间分离" |
| Flash Element TD | 固定路径 | 路径旁固定塔位 | 金币（通用口径） | 固定波次 | 漏怪计数到上限 | 无局外分层；仿魔兽 III 的 Element TD |
| Desktop Tower Defense | **无预设路径**，塔位决定路径，敌人走最短路 | 网格可建位；出口**不可完全封死** | 金币（击杀返还） | 波次推进 | 生命值扣减到 0 | 无局外分层；mazing 是核心操作 |

### 2.1 Missile Command：一条单向的追认链

维基 **Tower defense** 条目在追溯前身时称：Missile Command 让防守更具策略性、每一波存在多条来袭路径、且**被保护对象是城市而不是角色**——这三条恰好对应本论文的"路径给定"与"失败累积"。

必须如实标注的是：**Missile Command 条目本身并未提及 tower defense**。也就是说，两者之间只有"塔防条目单向引用它"这一条链路，不构成互证。把它写成"塔防鼻祖"会超出证据；写成"被塔防史学追认的原型之一"才站得住。这也提示一条方法论：**谱系学里的"前身"往往是后验命名的产物，而非当时的自我认同。**

### 2.2 Rampart：把"建造"和"承受"切成两半

Rampart（1990-10 街机，1991-02 广泛发售；Atari Games；设计 John Salwitz，美术 Dave Ralston；俯视视角，轨迹球操作）的机制是**交替的两阶段**：

1. **建造阶段**——用旋转方块补墙，把城堡围起来以扩张领土；
2. **战斗阶段**——炮击敌舰与对手城墙；
3. **结算**——战斗后，未被墙完整包围的区域，以及其中的炮台，**归敌方所有**。

第三条结算规则是全文最有价值的一条设计遗产：它把"围合"从美术效果升级成**硬性判据**，漏一个缺口不只是难看，而是直接资产转移。维基 tower defense 条目称 Rampart"generally considered to have established the prototypical tower defense"，其原型的核心不在炮，而在**"布防与交战的时间分离"**——这正是论文 4.1 认定的关键遗产，对应要件七的时间结构。

### 2.3 命名与商标：一条被误传的"首用"

- 维基**没有词源段**；"tower defense"的**确切首次使用未证实**。任何"某年某人发明了这个词"的写法都应删掉。
- 可考最早的名称用法是星际争霸自定义图 **Turret Defense（2000-05）** 与 **Sunken Defense（2001-11）**。
- 魔兽 III 的 **Element TD / Gem Tower Defense** 被该条目记为 **2006-02**，引注来源是地图站，属**弱一手证据**，只能写作"该条目记为"，不能当作独立确认。
- 商标线是另一回事，也更容易被误读为"命名起源"：**COM2uS 于 2007-06-13 申请、2008-06-03 获得**美国 "Tower Defense" 商标（serial 3442002），并自 **2010 年初**开始向 App Store 开发者发函。

结论：**玩法先于名字，名字先于商标**。三者时间差恰好说明塔防是一个先由社区自发再生产、再被法务确权的类型（与论文 4.2 的"生态学"判断一致）。

### 2.4 Flash Element TD：把自定义图搬进浏览器

Flash Element TD 由 **David Scott** 于 **2007-01-12** 发布 v1.0，Flash 平台；其原型是魔兽 III 的 Element TD（作者 Brian Powers、Evan Hatampour）。它在机制上几乎是自定义图模板的忠实移植——固定路径、固定塔位、金币返还、固定波次——但它完成了一次**分发介质**的跃迁：不需要买魔兽 III，打开网页即玩。据维基，**2009-03 累计游玩超过 1.4 亿次**。

它的历史意义因此不在机制创新，而在于证明：**塔防的留存来自规则本身，而不是客户端的分量。**

### 2.5 Desktop Tower Defense：mazing 的诞生与一份术语表

Desktop Tower Defense（**Paul Preece**，Flash 浏览器游戏，**2007-03-03** 发布，支持单人/多人）做了两件 Rampart 之后最重要的改动：

1. **无预设路径**——塔位决定路径，敌人自行走最短路；
2. **出口不可完全封死**——玩家能大幅拉长路线，但不能造出无解的死墙。

第 2 条是**规则层的安全阀**：它把"自由迷宫"从退化风险（论文 2.1 的反例实验）转化为可控策略空间。Preece 的动机可考：他在 **2006 年**发现当时缺少一款能真正做 mazing 的塔防，于是自己写了一个。

维基对 mazing 及相关术语的定义可意译为下表：

| 术语 | 含义 |
| --- | --- |
| mazing | 造一条长而曲折的塔列/迷宫，以拉长敌人必须穿越的距离 |
| juggling | 轮流封堵两侧出口，使敌人来回折返 |
| hybrid | 预设路径可被塔位部分修改（半迷宫） |
| reverse tower defense / tower attack / tower offense | 玩家转为进攻"受防御保护的敌方基地" |
| tower wars | 双方互攻同一张棋盘 |

商业与荣誉线（用作类型大众化的旁证）：2007-07 已游玩 **15.7M** 次；入选 **Webware 100 2007** 娱乐类前十；获 **2008 IGF Gleemie 奖 + 5,000 美元**；**2012 年入选 Time "All-Time 100"**；**2009-05 推出 NDS 商业版**；Preece 与 Scott 共同创办 Casual Collective。

## 三、它证明了什么

这一阶段证明了塔防的**定型不是一次发明，而是三次分离**。第一次是 Missile Command 式的**对象分离**：被保护者（城市）与操作者（反导）不再是同一条血条，失败因此可以累积、可以量化。第二次是 Rampart 式的**时间分离**：建造阶段与战斗阶段被切开，玩家获得"快决策 + 慢观察"的节拍，这是塔防区别于即时战略的根本（要件七）。第三次是 Desktop Tower Defense 式的**空间分离**：路径不再是地图给的美术线，而是玩家用塔位**写出来的**结果，同时用"出口不可完全封死"把自由重新约束回可解空间。三次分离叠起来，才有 2007 年之后那个可以被复制、被套模板、被逐波调数值的塔防。

## 四、可迁移的做法

1. **给"自由建造"配一个安全阀。** 若允许玩家改变敌人路径，必须同时规定"不可完全封锁出口"之类的硬约束，否则玩法会从塔防滑向迷宫解谜（论文 2.1 的反例实验可直接作为验收项）。
2. **把围合/覆盖率写成结算判据，而不是视觉反馈。** Rampart 的"未围合即资产转移"值得照抄其结构：让缝隙产生真实的数值后果，玩家才会认真处理边界。
3. **命名与玩法解耦地登记史实。** 内部文档涉及"谁是第一"时，一律分三行写：机制首现、名称首用、商标确权；无确证的首用直接标"未证实"，避免把营销叙事写进设计依据。
4. **用极低门槛的载体做机制验证。** Flash Element TD 证明：验证一套塔防规则不需要商业客户端。原型阶段优先选"打开即玩"的载体，把验证成本压到最低。
5. **把社区自定义图当作模因库而非竞品。** turret/sunken/element 这条命名谱系说明玩法靠 UGC 传播；类型研究应回溯地图站等社区一手资料，并降级使用其证据强度。

## 五、参考来源

- Wikipedia: [Tower defense](https://en.wikipedia.org/wiki/Tower_defense)（前身清单、mazing/juggling/hybrid 术语、Rampart 定位、COM2uS 商标、Flash Element TD 与 Desktop Tower Defense 数据）
- Wikipedia: [Missile Command](https://en.wikipedia.org/wiki/Missile_Command)（1980-06、Atari、Dave Theurer、3 基地守 6 城市；**该条目未提及 tower defense**）
- Wikipedia: [Rampart (video game)](https://en.wikipedia.org/wiki/Rampart_(video_game))（1990-10／1991-02、Atari Games、John Salwitz、Dave Ralston、两阶段机制与结算）
- Wikipedia: [Desktop Tower Defense](https://en.wikipedia.org/wiki/Desktop_Tower_Defense)（2007-03-03、Paul Preece、无预设路径、15.7M／Webware 100／IGF Gleemie／Time 100／NDS 版）
- Wikipedia: [Flash Element TD](https://en.wikipedia.org/wiki/Flash_Element_TD)（David Scott、2007-01-12、1.4 亿次、原型 Element TD 作者）

## 六、互链

- 上游：[论文第二节·七个构成要件](../00_塔防游戏研究_内涵与外延.md)、[论文第四节·历史谱系](../00_塔防游戏研究_内涵与外延.md)（本卷的五要件对照表即按 2.1–2.5 编号编写）
- 本卷：[02 · 大众化与移动端](02_大众化与移动端_植物大战僵尸与王国保卫战.md)
- 策划卷（把史实落成规格）：[04 塔防核心战斗](../../../projects/refu-game-001/docs/design/04_塔防核心战斗.md)、[06 关卡与地图卡](../../../projects/refu-game-001/docs/design/06_关卡与地图卡.md)、[19 地图卡表](../../../projects/refu-game-001/docs/design/19_地图卡表.md)、[10 术语表](../../../projects/refu-game-001/docs/design/10_术语表.md)
- 数值卷（把机制落成可算量）：[01 模型定义与推导](../数值卷/01_模型定义与推导.md)、[03 横向对照方法](../数值卷/03_横向对照方法.md)（用 `B/P/D` 口径近似标定 Missile Command 与 Rampart 时，须按其"不等价性声明"降级使用）
- 返回：[塔防研究卷首](../README.md)
