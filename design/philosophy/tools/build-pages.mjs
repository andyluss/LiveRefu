#!/usr/bin/env node
/**
 * 青橙理念系列 · HTML 可视化生成器
 *
 * 用法：node design/philosophy/tools/build-pages.mjs
 * 产物：design/philosophy/html/*.html（每篇一个 + index.html）
 *
 * 只依赖 Node 内置模块；HTML 共用 html/philosophy.css，不引入外部字体/脚本。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PHILOSOPHY = join(HERE, '..')
const OUT = join(PHILOSOPHY, 'html')

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const pages = [
  {
    slug: '00_总纲_青橙设计',
    n: '00',
    title: '青橙设计',
    subtitle: '面向多重未来的设计伦理',
    thesis: '设计系统告诉你按钮多大；青橙先问：这个未来为谁、由谁承担、谁能退出。',
    visual: `
      <div class="stack">
        <div class="layer"><b>判断层</b><span>技术—人—自然—劳动—权力：这个未来在安排什么关系？</span></div>
        <div class="layer"><b>体验层</b><span>可感、可参与、可退出：关系如何被身体经验到？</span></div>
        <div class="layer"><b>物件层</b><span>token、组件、界面、规则：最后才轮到“怎么做”。</span></div>
      </div>`,
    caption: '青橙不是一种配色，而是一组从判断层落到物件层的设计伦理。',
    points: [
      ['不是风格', '“青橙渐变”只是表面；真正的青橙是判断技术、感知、劳动与权力关系的方式。'],
      ['先问为什么', '按钮多大、圆角多少很重要，但它们回答不了“为什么做这个未来”。'],
      ['多重未来', '不站单一意识形态；共享问题，不共享答案。'],
    ],
    map: [
      ['01', '设计系统的边界', '它能规定组件，却不能规定这个未来是否值得做。'],
      ['02', '五个追问', '技术为谁、界面是否诚实、谁承担代价、玩家扮演谁、复古在考古还是消费。'],
      ['03', '关系优先', '设计不是把物件做漂亮，而是安排技术、人、自然、劳动与权力。'],
      ['04', '清澄', '来源、代价、权限、退路可见；透明不是全部曝光。'],
      ['05', '多世界', '赛博朋克、太阳朋克、原子朋克、磁带未来可以并存。'],
      ['06', '边界', '拒绝剥削、黑箱、不可退出，以及伪装成未来的怀旧。'],
    ],
    quote: '青橙不是答案，是提问方式。',
    quoteBy: '00 · 青橙设计',
  },
  {
    slug: '01_未来考古_复古未来不是怀旧',
    n: '01',
    title: '未来考古',
    subtitle: '复古未来不是怀旧',
    thesis: '复古未来不是把旧物摆进新房间，而是挖开地层，检查我们曾经相信过哪些未来。',
    visual: `
      <div class="strata">
        <div class="stratum"><div class="period">1950s</div><div class="bar"><b>原子能乐观</b><span>幸福原子 / 按钮生活 / 镀铬郊区</span></div></div>
        <div class="stratum"><div class="period">1970s</div><div class="bar"><b>太空计划</b><span>塑料乌托邦 / 未来舱 / 无限能源</span></div></div>
        <div class="stratum"><div class="period">1980s</div><div class="bar"><b>个人电脑</b><span>CRT / 磁带 / 霓虹 / 黑客</span></div></div>
        <div class="stratum"><div class="period">1990s</div><div class="bar"><b>互联网承诺</b><span>扁平世界 / 千禧焦虑 / 新经济</span></div></div>
        <div class="stratum"><div class="period">2000s</div><div class="bar"><b>扁平与云</b><span>极简 / 玻璃 / 无限滚动 / 平台</span></div></div>
      </div>`,
    caption: '未来不是年份，是想象的结构。考古不是怀旧，是检查哪些想象被实现、被放弃、被收编。',
    points: [
      ['未来是想象结构', '人们相信技术往哪走、社会变成什么样、什么会留下。'],
      ['地层', '每个时代都留下对未来的承诺，也留下被排除的人与代价。'],
      ['不是消费', '复古未来若只取视觉符号，就会把失败与代价一起磨平。'],
    ],
    map: [
      ['01', '未来不是年份', '2027、2035、2050 只是坐标；真正的问题是当时相信了什么。'],
      ['02', '地层的读法', '看承诺、看资金、看谁被排除、看为什么放弃。'],
      ['03', '三种时间', '第一序档案 / 第二序仿作 / 第三序混血。'],
      ['04', '考古的伦理', '不把怀旧当安全区，也不把过去当纯粹笑话。'],
      ['05', '青橙的用法', '用复古未来检查今天的未来叙事，而不是复制旧海报。'],
      ['06', '练习', '挑一个“未来感”界面，问它借的是哪一层地层。'],
    ],
    quote: '复古未来主义保留了过去的人对未来的想象——包括那些失败的想象。',
    quoteBy: '01 · 未来考古',
  },
  {
    slug: '02_可感_从数字到现象',
    n: '02',
    title: '可感',
    subtitle: '从数字到现象',
    thesis: '数字让你读取系统；现象让你先于解释地注意到系统。可感不是更漂亮的数字，而是可被身体先接住的状态。',
    visual: `
      <div class="flow">
        <div class="node"><div class="big-number">85%</div><span>水质读数</span></div>
        <div class="link">→</div>
        <div class="node"><b>现象</b><div class="phenomena"><div><b>光泽</b>变暗</div><div><b>气泡</b>变慢</div><div><b>声音</b>变急</div></div></div>
        <div class="link">→</div>
        <div class="node"><b>可读退路</b><span>数字、标签、屏幕阅读器、精确值仍然保留。</span></div>
      </div>`,
    caption: '可感不等于不可读；现象负责“先注意到”，数字负责“再确认”。',
    points: [
      ['数字不是感知', '85% 不告诉你水是清是浑；62% 不告诉你能量在流入还是流出。'],
      ['三个条件', '可测量、可追溯、可参与；否则只是氛围。'],
      ['退路常在', '可感不替代数字与标签；它只是把状态带回身体。'],
    ],
    map: [
      ['01', '数字不是感知', '读取需要注意力、知识和解释；感知可以先于解释发生。'],
      ['02', '现象优先', '光泽、气泡、声音、温度、节奏都是系统状态的载体。'],
      ['03', '可测量', '每个现象必须能指回真实数据或虚构世界内部自洽的设定。'],
      ['04', '可追溯', '用户能从现象走到来源，知道它为什么变成这样。'],
      ['05', '可参与', '用户不是看客，可以调整、维护、拒绝。'],
      ['06', '退路', '色觉、听觉、注意力差异都要有可读替代。'],
    ],
    quote: '让系统状态变成一种可以被身体先注意到的现象，但不要烧掉回程的路。',
    quoteBy: '02 · 可感',
  },
  {
    slug: '03_可参与_技术如何保留人的位置',
    n: '03',
    title: '可参与',
    subtitle: '技术如何保留人的位置',
    thesis: '界面越顺，人越容易变轻。可参与不是多一个按钮，而是在关键节点保留判断、维护、拒绝与退出。',
    visual: `
      <div class="ladder">
        <div class="step"><div class="n">01</div><div><b>被告知</b><p>知道系统在做什么、为什么这样做。</p></div></div>
        <div class="step"><div class="n">02</div><div><b>可查看</b><p>能追到来源、状态、代价与不确定性。</p></div></div>
        <div class="step"><div class="n">03</div><div><b>可参与</b><p>能调整参数、维护、改写、共同定义。</p></div></div>
        <div class="step"><div class="n">04</div><div><b>可拒绝 / 可退出</b><p>不参与也能生活；退出不是惩罚。</p></div></div>
      </div>`,
    caption: '可参与是一条坡道，不是一枚开关；越往上，人的位置越多。',
    points: [
      ['反黑箱', '系统要解释自己怎么工作，而不是只给结果。'],
      ['反判断力剥夺', '关键判断留给人；自动化处理可逆的、低风险的部分。'],
      ['可退出', '退出权不是“删除账号”按钮，而是离开后仍能保有生活。'],
    ],
    map: [
      ['01', '越顺越无力', '黑箱化、判断力剥夺、责任外包、自然降格。'],
      ['02', '不是多一个按钮', '参与是权力与信息的重新分配。'],
      ['03', '关键节点', '医疗、财务、创作、照料：人必须能说“不”。'],
      ['04', '维护', '谁维护、谁承担、谁在半夜被叫醒。'],
      ['05', '退出', '退出成本、数据迁移、替代方案。'],
      ['06', '青橙', '技术可以翻译，不可以替代判断。'],
    ],
    quote: '可参与不是把用户拉进流程，而是让流程不再能绕过人。',
    quoteBy: '03 · 可参与',
  },
  {
    slug: '04_适当的未来_赛博朋克太阳朋克与中间地带',
    n: '04',
    title: '适当的未来',
    subtitle: '赛博朋克、太阳朋克与中间地带',
    thesis: '赛博朋克是诊断，太阳朋克是提案；青橙保留两者之间的中间地带，不把未来做成两个审美阵营。',
    visual: `
      <div class="matrix">
        <div class="quad cyber"><div class="tag">DIAGNOSIS</div><b>赛博朋克</b><span>高科技，低生活；技术复杂度变成资本门槛与依赖。</span></div>
        <div class="quad mid"><div class="tag">MIDDLE</div><b>中间地带</b><span>有诊断，也有局部提案；不保证皆大欢喜。</span></div>
        <div class="quad solar"><div class="tag">PROPOSAL</div><b>太阳朋克</b><span>适当技术，高生活；门槛可控、权力分散、本地闭环。</span></div>
        <div class="quad"><div class="tag">QUESTION</div><b>关系，而非皮肤</b><span>霓虹与绿植只是皮；真正的问题是技术被组织成什么关系。</span></div>
      </div>`,
    caption: '两种未来不是两种配色，而是两套技术—资本—劳动—生态的组织方式。',
    points: [
      ['赛博朋克是诊断', '它让代价可见：谁垄断、谁依赖、谁被排除。'],
      ['太阳朋克是提案', '它尝试把技术门槛降下来，把权力分散出去。'],
      ['中间地带', '青橙不站单一意识形态；允许不完整的、可修改的未来。'],
    ],
    map: [
      ['01', '两种未来，不是两种配色', '霓虹、雨、绿植、圆角只是表面符号。'],
      ['02', '技术关系', '复杂度 → 门槛 → 垄断 → 依赖，或反过来。'],
      ['03', '诊断与提案', '先看见坏，再提出可维护的好。'],
      ['04', '适当技术', '不是低技术，而是门槛可控、可维修、可本地化。'],
      ['05', '中间地带', '不把乌托邦当装饰，也不把反乌托邦当终点。'],
      ['06', '青橙的选择', '每个未来都要显示谁受益、谁承担、谁维护。'],
    ],
    quote: '赛博朋克是诊断，太阳朋克是提案；不要让任何一种成为新的教义。',
    quoteBy: '04 · 适当的未来',
  },
  {
    slug: '05_游戏作为未来实验室',
    n: '05',
    title: '游戏作为未来实验室',
    subtitle: '机制就是意识形态',
    thesis: '游戏最独特的地方不是讲故事，而是让玩家在规则里生活；规则奖励什么，玩家就学会什么。',
    visual: `
      <div class="cycle">
        <div class="node"><b>规则</b><span>资源、胜负、失败、退出条件</span></div>
        <div class="node"><b>行为</b><span>玩家实际做什么，而不是文本说什么</span></div>
        <div class="node"><b>学习</b><span>重复之后，玩家内化了什么</span></div>
        <div class="node"><b>世界</b><span>玩家相信这个未来如何运转</span></div>
        <div class="center">机制 = 意识形态</div>
      </div>`,
    caption: '说“人人平等”但只奖励掠夺，玩家学到的就是掠夺。',
    points: [
      ['机制先于文本', '设定文本可以漂亮，但规则决定玩家真正经历什么。'],
      ['未来实验室', '游戏是最便宜的未来试验场：可以失败、可以重来、可以换规则。'],
      ['代价必须可玩', '谁维护、谁承担、谁被排除，要进入资源与失败条件。'],
    ],
    map: [
      ['01', '游戏不只是讲故事', '过场、美术、设定文本只是背景，规则才是经验。'],
      ['02', '机制就是意识形态', '奖励、惩罚、胜负条件在教玩家什么是“正常”。'],
      ['03', '未来实验室', '用低成本试错探索不同技术—社会关系。'],
      ['04', '玩家扮演谁', '谁有声音、谁可操作、谁只是背景。'],
      ['05', '失败与退出', '失败是否可逆、退出是否有尊严。'],
      ['06', '青橙的用法', '先问机制在教什么，再问美术在说什么。'],
    ],
    quote: '一个游戏说“人人平等”，但机制只奖励掠夺，玩家学到的就是掠夺。',
    quoteBy: '05 · 游戏作为未来实验室',
  },
  {
    slug: '06_多世界语法_共享问题不共享答案',
    n: '06',
    title: '多世界语法',
    subtitle: '共享问题，不共享答案',
    thesis: '青橙不制造一个唯一正确的未来，而是提供一套共享语法，让多种未来可以并存、比较、互相翻译。',
    visual: `
      <div class="hub">
        <div class="sat"><div><b>原子朋克</b>幸福原子 / 双面未来</div><div><b>磁带未来</b>模拟暖意 / 旧接口</div></div>
        <div class="core">共享语法<br><span class="mono">清澄 · 可感 · 可参与 · 代价可见</span></div>
        <div class="sat"><div><b>太阳朋克</b>适当技术 / 本地闭环</div><div><b>Archive / Console</b>档案 / 控制台 / 可读性</div></div>
      </div>`,
    caption: '共享问题，不共享答案；共享语法，不共享教义。',
    points: [
      ['共享语法', '清澄、可感、可参与、代价可见，是跨世界的底线。'],
      ['风格卡', '每个世界有自己的色彩、材质、字体与规则，不互相冒充。'],
      ['不共享答案', '哪个未来更好，要在具体项目、具体代价里讨论。'],
    ],
    map: [
      ['01', '为什么需要多世界', '单一未来会变成新的霸权。'],
      ['02', '共享什么', '问题、底线、评审语言；不是答案与视觉皮肤。'],
      ['03', '风格卡', '把世界的差异写成可执行的约束。'],
      ['04', '翻译', '不同世界之间可以比较代价，而不是比较谁更酷。'],
      ['05', '边界', '多世界不等于相对主义；底线不可让渡。'],
      ['06', '实践', '一个产品可以有多套未来语法，但只能有一套清澄底线。'],
    ],
    quote: '共享问题，不共享答案；共享语法，不共享教义。',
    quoteBy: '06 · 多世界语法',
  },
  {
    slug: '07_边界_青橙设计拒绝什么',
    n: '07',
    title: '边界',
    subtitle: '青橙设计拒绝什么',
    thesis: '理念的力量不只来自它主张什么，也来自它拒绝什么；没有边界的“未来”很容易变成新的包装。',
    visual: `
      <div class="boundary">
        <div class="fence"><h3>保留</h3><ul><li>可感的真实状态</li><li>可参与的关键判断</li><li>可退出的生活</li><li>可见的代价与维护</li></ul></div>
        <div class="fence out"><h3>拒绝</h3><ul><li>把剥削包装成高级感</li><li>把黑箱包装成智能</li><li>把锁定包装成体验</li><li>把怀旧包装成未来</li></ul></div>
      </div>`,
    caption: '边界不是保守，而是防止“未来”再次变成权力不对等的遮羞布。',
    points: [
      ['拒绝剥削', '不以他人的不可退出为代价，制造少数人的未来感。'],
      ['拒绝黑箱', '不把“智能”当不解释的理由。'],
      ['拒绝伪未来', '怀旧可以进入设计，但不能冒充另一种未来。'],
    ],
    map: [
      ['01', '为什么需要边界', '没有拒绝，理念就会被任何品牌语言收编。'],
      ['02', '四条底线', '不剥削、不黑箱、不锁定、不伪装。'],
      ['03', '高级感的代价', '谁在承担“高级”背后的劳动与污染。'],
      ['04', '智能的边界', '不可解释的自动化，不能进入关键判断。'],
      ['05', '怀旧的边界', '消费记忆不等于打开可能性。'],
      ['06', '评审用法', '边界是否决项，不是加分项。'],
    ],
    quote: '没有边界的未来，最后都会变成某种包装。',
    quoteBy: '07 · 边界',
  },
  {
    slug: '08_青橙十问',
    n: '08',
    title: '青橙十问',
    subtitle: '把理念变成设计决策',
    thesis: '十个问题，把“青橙”从形容词变成评审桌上可以回答、可以否决、可以追踪的判断。',
    visual: `
      <div class="qgrid">
        <div class="qcell"><div class="n">Q1</div><b>为谁？</b></div><div class="qcell"><div class="n">Q2</div><b>谁承担代价？</b></div>
        <div class="qcell"><div class="n">Q3</div><b>状态可见吗？</b></div><div class="qcell"><div class="n">Q4</div><b>人能判断吗？</b></div>
        <div class="qcell"><div class="n">Q5</div><b>能退出吗？</b></div><div class="qcell"><div class="n">Q6</div><b>谁维护？</b></div>
        <div class="qcell"><div class="n">Q7</div><b>在教什么？</b></div><div class="qcell"><div class="n">Q8</div><b>哪个未来？</b></div>
        <div class="qcell"><div class="n">Q9</div><b>代价可见吗？</b></div><div class="qcell"><div class="n">Q10</div><b>可以推翻吗？</b></div>
      </div>`,
    caption: '十问不是打分表，而是十个可以追问到具体证据的入口。',
    points: [
      ['可回答', '每个问题都要能指向具体证据，而不是态度。'],
      ['可否决', '关键项不过，不应靠“整体感觉不错”放行。'],
      ['可追踪', '评审结论要留下谁回答、依据什么、何时复查。'],
    ],
    map: [
      ['01', '谁', '受益者、受影响者、缺席者。'],
      ['02', '代价', '劳动、维护、环境、注意力、退出成本。'],
      ['03', '感知', '状态是否可感，是否有可读退路。'],
      ['04', '判断', '关键节点是否留给人。'],
      ['05', '权力', '谁决定、谁维护、谁能拒绝。'],
      ['06', '未来', '在复制哪个旧未来，还是在打开新可能。'],
    ],
    quote: '十问不是让设计看起来更严谨，而是让权力关系无处可藏。',
    quoteBy: '08 · 青橙十问',
  },
  {
    slug: '09_清澄_透明作为方法',
    n: '09',
    title: '清澄',
    subtitle: '透明作为方法',
    thesis: '青橙是颜色，清澄是颜色下面的水；来源、代价、权限、退路必须可见，但透明不等于全部曝光。',
    visual: `
      <div class="water">
        <div class="col"><b>来源</b><span>数据、材料、判断从哪里来；谁写的、何时写的。</span></div>
        <div class="col"><b>代价</b><span>谁付费、谁维护、谁承担风险与外部性。</span></div>
        <div class="col"><b>权限</b><span>谁能看、谁能改、谁能拒绝、谁被排除。</span></div>
        <div class="col"><b>退路</b><span>如何撤回、导出、离开；离开后还能不能生活。</span></div>
      </div>`,
    caption: '透明不是把一切摊开，而是让关键关系可以被追问。',
    points: [
      ['清澄是核心', '没有透明，其他原则会退化成氛围。'],
      ['透明≠曝光', '不是所有数据都公开；是权力与代价可被追问。'],
      ['开源≠清澄', '代码开放不等于责任、维护与退出可见。'],
    ],
    map: [
      ['01', '水与颜色', '青橙是表面，清澄是下面的水。'],
      ['02', '七种可见', '来源、代价、维护、权限、不确定性、退路、资金治理。'],
      ['03', '不确定性', '不知道就说不知道；置信度也是信息。'],
      ['04', '权限', '可见范围本身是权力。'],
      ['05', '退路', '退出不是失败，是设计的一部分。'],
      ['06', '实践', '把清澄七问放进每次评审。'],
    ],
    quote: '清澄不是把一切照亮，而是让该被看见的关系不再躲在水下。',
    quoteBy: '09 · 清澄',
  },
  {
    slug: '10_设计思维_从问题到可被体验的答案',
    n: '10',
    title: '设计思维',
    subtitle: '从问题到可被体验的答案',
    thesis: '当问题本身还没被定义清楚时，设计思维用观察、重新框定、原型与反馈，做出一个可以被体验、被反驳、被修改的答案。',
    visual: `
      <div class="diamond">
        <div class="stage"><div class="n">01 DISCOVER</div><b>进入现场</b><span>谁在做什么？谁不在场？例外在哪里？</span></div>
        <div class="stage"><div class="n">02 DEFINE</div><b>重新框定</b><span>真正要解决的是哪一个问题？</span></div>
        <div class="stage"><div class="n">03 DEVELOP</div><b>做原型</b><span>纸面、可点击、规则、角色扮演。</span></div>
        <div class="stage"><div class="n">04 DELIVER</div><b>真实使用</b><span>它如何失败？谁被排除？谁维护？</span></div>
      </div>`,
    caption: '两次发散，两次收敛；Define 决定上限，Deliver 不是终点。',
    points: [
      ['问题先于答案', '设计思维不是想得美，而是在约束未定型时先把问题看清楚。'],
      ['用制作思考', '原型让隐形假设变成可被看见、使用、反驳的东西。'],
      ['迭代有责任', '没有反馈、停止条件与受影响者说明的迭代，只是延后风险。'],
    ],
    map: [
      ['01', '五个动作', '观察、定义、发散、原型、测试；不是线性流水线。'],
      ['02', '重新框定', '好设计经常不是给旧问题更好的答案，而是发现问错了。'],
      ['03', '原型', 'fidelity 刚好足以暴露关键风险。'],
      ['04', '收敛判据', '真实状态、代价、退出、人的判断。'],
      ['05', '批评', '工作坊化、去政治化、救世主化、指标化。'],
      ['06', '青橙流程', '进入现场 → 写清代价 → 重新框定 → 三种未来原型 → 试用 → 收敛。'],
    ],
    quote: '在被要求立刻给答案之前，先坚持把问题看清楚；看清楚之后，仍然愿意做一个可以被反驳的答案。',
    quoteBy: '10 · 设计思维',
  },
  {
    slug: '11_设计思维与其它思维_六种镜头',
    n: '11',
    title: '六种镜头',
    subtitle: '设计思维与其它思维',
    thesis: '设计、工程、产品、管理、商业、运营不是六个部门的黑话，而是六种把世界简化的方式；每一种都有效，也都有盲区。',
    visual: `
      <div class="lens">
        <div class="lens-core">同一个问题：一键生成周报</div>
        <div class="node"><b>设计</b><span>谁在什么时刻需要回顾？想讲给谁听？</span></div>
        <div class="node"><b>工程</b><span>数据从哪来？可复现吗？失败如何回滚？</span></div>
        <div class="node"><b>产品</b><span>服务谁？先做什么？如何衡量有效？</span></div>
        <div class="node"><b>管理</b><span>谁决定？谁负责？跨团队如何协调？</span></div>
        <div class="node"><b>商业</b><span>谁付费？成本结构？护城河在哪里？</span></div>
        <div class="node"><b>运营</b><span>谁维护？出错谁响应？如何持续供给？</span></div>
      </div>`,
    caption: '六种镜头不是替代关系，而是编排关系：在正确的时间，让正确的思维主导。',
    points: [
      ['设计负责问题与代价', '把“值得做什么”和“谁承担”放回桌面。'],
      ['其它思维负责可行与持续', '工程、产品、商业、运营、管理把答案变成能活下来的系统。'],
      ['单一思维会垄断“好”', '任何单一视角都可能把局部最优当成整体正确。'],
    ],
    map: [
      ['01', '设计：意义', '体验、重新框定、可参与、可退出。'],
      ['02', '工程：约束', '可测试、可复现、可维护、有边界。'],
      ['03', '产品：取舍', '为谁、先做什么、如何知道有效。'],
      ['04', '管理：决定权', '谁拍板、谁负责、信息如何流动。'],
      ['05', '商业：可持续', '收入、成本、外部性、长期信任。'],
      ['06', '运营：日常', 'SOP、监控、供给、故障与劳动。'],
    ],
    quote: '设计思维不是六种思维里的国王；它更像一张桌子，让六种思维先争论“我们在解决谁的问题”。',
    quoteBy: '11 · 六种镜头',
  },
  {
    slug: '12_空间直觉_让界面先被看见再被读懂',
    n: '12',
    title: '空间直觉',
    subtitle: '让界面先被看见，再被读懂',
    thesis: '人不是先读界面，人先读空间；位置、方向、距离、边界与深度，能替工作记忆承载关系。',
    visual: `
      <div class="matrix">
        <div class="quad"><div class="tag">ATTEND</div><b>预注意</b><span>颜色、大小、方向、位置先于解释被注意到。</span></div>
        <div class="quad solar"><div class="tag">LOCATE</div><b>心理地图</b><span>地标、区域、路径，让人记住“东西大致在哪”。</span></div>
        <div class="quad mid"><div class="tag">ACT</div><b>可供性</b><span>形状与位置暗示可推、可拉、可打开、可放下。</span></div>
        <div class="quad"><div class="tag">EMBODY</div><b>身体尺度</b><span>远近、轻重、阻挡、容纳，和身体经验直接相关。</span></div>
      </div>`,
    caption: '空间直觉不是 3D 或大留白，而是让关系先被看见，再让标签负责确认。',
    points: [
      ['位置即关系', '相近、同容器、上下、左右、中心、边缘，都在暗示关系。'],
      ['地图要诚实', '位置不能伪造优先级，不能隐藏代价，不能把不确定画成确定。'],
      ['保留退路', '可以迷路，但必须能回到地标、切换列表、搜索、撤销、退出。'],
    ],
    map: [
      ['01', '先读空间', '人还没读标签，就已经知道门在哪、哪里是中心、哪里可以走。'],
      ['02', '五种能力', '预注意、格式塔、可供性、心理地图、身体尺度。'],
      ['03', '转译成界面', '位置、方向、尺度、边界、深度、动势。'],
      ['04', '边界', '隐喻错位、文化差异、无障碍、小屏、数据映射失真、3D 过度。'],
      ['05', '验证', '五秒测试、盲图测试、找路测试、回忆测试、破坏测试。'],
      ['06', '青橙原则', '先可感再可读、先关系再装饰、地图诚实、保留退路。'],
    ],
    quote: '先让界面像一个可以理解的空间，再让它像一个可以阅读的文档。',
    quoteBy: '12 · 空间直觉',
  },
  {
    slug: '13_白盒化方法_把系统翻过来',
    n: '13',
    title: '白盒化方法',
    subtitle: '把系统翻过来',
    thesis: '白盒化不是全曝光，而是把来源、结构、代价、权限与退路放在正确的分辨率上。',
    visual: `
      <div class="matrix">
        <div class="quad solar"><div class="tag">SEE</div><b>看见</b><span>可视化 · 地图 · 空间 · 仪表 · 时间</span></div>
        <div class="quad"><div class="tag">VERIFY</div><b>核对</b><span>数据 · 标准 · 来源 · 审计 · 测试</span></div>
        <div class="quad mid"><div class="tag">CONTROL</div><b>控制</b><span>接口 · 模块 · 回放 · 沙盘 · 解释</span></div>
        <div class="quad cyber"><div class="tag">EXIT</div><b>参与 / 退出</b><span>开源 · 参与 · 文档 · 版本 · 代价</span></div>
      </div>`,
    caption: '29 种方法不是 29 个都要做；先选与问题匹配的 3–5 种，让外部人能够核对。',
    points: [
      ['不是全曝光', '透明不是把所有信息摊开；曝光不等于可理解，可理解不等于可核对。'],
      ['五目标', '可见、可核、可参与、可控、可退；缺一项就会退化成透明表演或仪表盘倾倒。'],
      ['先组合', '开源、可视化、透明、标准、数据、地图各自回答不同问题，不能互相替代。'],
    ],
    map: [
      ['01', '看见', '可视化、地图化、空间化、仪表化、时间化。'],
      ['02', '核对', '数据化、标准化、来源化、可追溯、可审计、可测试、基线化。'],
      ['03', '控制', '可控化、接口化、模块化、回放、沙盘、可解释。'],
      ['04', '参与/退出', '开源、参与、文档、版本、代价、可退出、可维护。'],
      ['05', '反模式', '透明表演、仪表盘倾倒、开源洗白、标准锁定、假精确、地图谎言。'],
      ['06', 'LiveBay 组合', '数据管线 + BOX 地图 + verify/生存测试 + 文档；先补来源/代价/退出。'],
    ],
    quote: '白盒化不是把墙拆掉，而是把墙的位置、材料、门和钥匙都标出来。',
    quoteBy: '13 · 白盒化方法',
  },
  {
    slug: '14_复杂性_把复杂放在正确的位置',
    n: '14',
    title: '复杂性',
    subtitle: '把复杂放在正确的位置',
    thesis: '复杂性不会消失，只会换一个位置；设计的工作是选择它放在哪、由谁承担、是否可见。',
    visual: `
      <div class="matrix">
        <div class="quad"><div class="tag">STRUCTURE</div><b>结构</b><span>模块、依赖、边界；用接口/模块/分层吸收。</span></div>
        <div class="quad solar"><div class="tag">COGNITION</div><b>认知</b><span>选项、记忆、规则；用渐进披露/默认值/空间化。</span></div>
        <div class="quad mid"><div class="tag">ORGANIZATION</div><b>组织</b><span>角色、权限、交接；用权限表/记录/责任边界。</span></div>
        <div class="quad"><div class="tag">TIME</div><b>时间</b><span>版本、状态、历史；用时间线/回放/迁移。</span></div>
      </div>`,
    caption: '复杂性不是“删到简单”，而是把它放在系统、界面、组织、时间中合适的位置。',
    points: [
      ['不是敌人', '必要的复杂承载真实关系；删掉它只会把代价藏起来。'],
      ['五种策略', '移除、吸收、排序、暴露、委托；先问谁最有能力承担。'],
      ['持续管理', 'Frame → Map → Probe → Decide → Institutionalize；用可逆小实验代替大改。'],
    ],
    map: [
      ['01', '六个来源', '结构、认知、组织、时间、技术债、意义。'],
      ['02', '复杂 vs 错综', 'complicated 可拆解；complex 只能探测、适应、响应。'],
      ['03', '放在哪里', '系统、界面、组织、时间、空间、叙事。'],
      ['04', '工具箱', '渐进披露、默认值、契约、可观测、可逆、冗余、删除。'],
      ['05', '度量', '首次成功、错误恢复、变更成本、支持负担、事故半径。'],
      ['06', '与稀缺', '复杂性消耗稀缺注意力/维护力；稀缺又制造复杂性。'],
    ],
    quote: '好的设计不是让系统看起来简单，而是让复杂出现在该出现的地方，并由有能力承担的人/系统承担。',
    quoteBy: '14 · 复杂性',
  },
  {
    slug: '15_稀缺性_设计在不够的时候',
    n: '15',
    title: '稀缺性',
    subtitle: '设计在不够的时候',
    thesis: '稀缺不是“少”，而是“不能同时满足”；设计不能消灭稀缺，但可以让它被看见、分配、承担与退出。',
    visual: `
      <div class="matrix">
        <div class="quad solar"><div class="tag">MATERIAL</div><b>物质 / 能源</b><span>预算、循环、替代、储备、降级。</span></div>
        <div class="quad"><div class="tag">ATTENTION</div><b>注意力 / 时间</b><span>默认、分层、静默、队列、异步。</span></div>
        <div class="quad mid"><div class="tag">TRUST</div><b>信任 / 维护</b><span>来源、审计、维修权、文档、冗余。</span></div>
        <div class="quad cyber"><div class="tag">EXIT</div><b>选择权 / 退出</b><span>可逆承诺、导出、迁移、公共选项。</span></div>
      </div>`,
    caption: '稀缺是设计材料：谁先、谁后、谁承担、谁可以走。',
    points: [
      ['不是少', '绝对稀缺、相对稀缺、制造稀缺要分开诊断。'],
      ['管理循环', '说清稀缺 → 画资源流 → 小规模试用 → 决定规则 → 制度化。'],
      ['伦理', '谁决定、谁承担、谁被排除、谁维护、谁获益；不能把稀缺自然化。'],
    ],
    map: [
      ['01', '八种稀缺', '物质、能源、注意力、时间、信任、维护、协调、选择权。'],
      ['02', '八种策略', '降需求、增供给、缓冲、共享、排序、替代、降级、退出。'],
      ['03', '设计模式', '预算、配额、队列、预约、渐进分配、储备、优雅降级。'],
      ['04', '伦理', '稀缺剧场、转移、自然化、羞耻；分配规则必须可申诉。'],
      ['05', 'LiveBay', '低功率夜班：电/氧/救援；自由模式：时间/注意力。'],
      ['06', '度量', '等待分布、排除率、维护 backlog、决策延迟、谁承担最多。'],
    ],
    quote: '在不够的时候，设计最重要的不是“挤更多”，而是“谁先、谁后、谁承担、谁可以走”。',
    quoteBy: '15 · 稀缺性',
  },
]

const total = pages.length
mkdirSync(OUT, { recursive: true })

function pageHTML(page, i) {
  const prev = i > 0 ? pages[i - 1] : null
  const next = i < pages.length - 1 ? pages[i + 1] : null
  const points = page.points.map(([t, d], idx) => `<article class="card"><div class="num">0${idx + 1}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')
  const map = page.map.map(([n, t, d]) => `<div class="item"><div class="idx">${esc(n)}</div><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')
  const nav = [
    '<a href="./index.html">全部可视化</a>',
    '<a href="../README.md">系列索引</a>',
    `<a href="../${page.slug}.md">读原文</a>`,
    prev ? `<a href="./${prev.slug}.html">← ${prev.n} ${esc(prev.title)}</a>` : '',
    next ? `<a href="./${next.slug}.html">${next.n} ${esc(next.title)} →</a>` : '',
  ].filter(Boolean).join('')
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.n)} · ${esc(page.title)}｜青橙设计</title>
<meta name="description" content="${esc(page.thesis)}">
  <script>
    (function () {
      document.documentElement.dataset.js = 'true';
      var KEY = 'lrds-theme', choice = 'system', saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
      document.documentElement.dataset.theme = mode;
      document.documentElement.dataset.themeChoice = choice;
    })();
  </script>
<link rel="stylesheet" href="./philosophy.css">
</head>
<body>
<header class="topbar"><a href="./index.html"><span class="dot"></span>青橙设计 · 理念可视化</a><div class="topbar-tools"><div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div><span class="page-no">PAPER ${page.n} / ${String(total).padStart(2, '0')}</span></div></header>
<main class="shell">
  <section class="hero">
    <div>
      <div class="eyebrow">Orange Design · Philosophy ${page.n}</div>
      <h1>${esc(page.title)}<br><span class="thin">${esc(page.subtitle)}</span></h1>
      <p class="thesis">${esc(page.thesis)}</p>
    </div>
    <aside class="hero-aside"><b>READING NOTE</b>${esc(page.n)} / ${String(total).padStart(2, '0')}<br>青橙设计 · 理念系列<br><br><b>USE</b>先看图中的关系，再回到原文读论证。</aside>
  </section>
  <div class="rule"></div>
  <section class="block">
    <p class="kicker">The image before the argument</p>
    <div class="visual diagram">${page.visual}<div class="caption">${esc(page.caption)}</div></div>
  </section>
  <section class="block">
    <p class="kicker">Three coordinates</p>
    <h2>三个判断</h2>
    <div class="grid3">${points}</div>
  </section>
  <section class="block">
    <p class="kicker">Reading map</p>
    <h2>文章地图</h2>
    <div class="map">${map}</div>
  </section>
  <blockquote class="quote">${esc(page.quote)}<small>${esc(page.quoteBy)}</small></blockquote>
  <div class="nav">${nav}</div>
  <footer class="footer"><span>青橙设计 · philosophy/${page.slug}.md</span><span>可视化生成：node design/philosophy/tools/build-pages.mjs</span></footer>
</main>
<script src="./philosophy-theme.js" defer></script>
</body>
</html>`
}

for (let i = 0; i < pages.length; i++) {
  writeFileSync(join(OUT, `${pages[i].slug}.html`), pageHTML(pages[i], i))
}

const cards = pages.map((p) => `<a class="card" href="./${p.slug}.html" style="text-decoration:none;color:inherit"><div class="num">${p.n} / PAPER</div><h3>${esc(p.title)}</h3><p>${esc(p.subtitle)}</p></a>`).join('')
const index = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>青橙设计 · 理念可视化索引</title>
<meta name="description" content="青橙设计理念系列 00–15 的可视化索引。">
  <script>
    (function () {
      document.documentElement.dataset.js = 'true';
      var KEY = 'lrds-theme', choice = 'system', saved = null;
      try { saved = localStorage.getItem(KEY); } catch (e) {}
      if (saved === 'system' || saved === 'light' || saved === 'dark') choice = saved;
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var mode = choice === 'system' ? (mql.matches ? 'dark' : 'light') : choice;
      document.documentElement.dataset.theme = mode;
      document.documentElement.dataset.themeChoice = choice;
    })();
  </script>
<link rel="stylesheet" href="./philosophy.css">
</head>
<body>
<header class="topbar"><a href="./index.html"><span class="dot"></span>青橙设计 · 理念可视化</a><div class="topbar-tools"><div class="theme-switch" role="group" aria-label="主题"><button type="button" data-theme-choice="system" aria-pressed="true">系统</button><button type="button" data-theme-choice="light" aria-pressed="false">浅色</button><button type="button" data-theme-choice="dark" aria-pressed="false">深色</button></div><span class="page-no">INDEX / ${String(total).padStart(2, '0')}</span></div></header>
<main class="shell">
  <section class="hero">
    <div><div class="eyebrow">Orange Design · Philosophy Index</div><h1>把理念<br><span class="thin">先看成一张图。</span></h1><p class="thesis">00–15 共 16 篇。每篇一页可视化：先看关系，再回到原文读论证。所有页面共用一份 CSS，不依赖外部字体、脚本或网络。</p></div>
    <aside class="hero-aside"><b>READ</b>从 00 总纲开始<br><br><b>USE</b>评审时先看图<br><br><b>SOURCE</b>design/philosophy/</aside>
  </section>
  <div class="rule"></div>
  <section class="block"><p class="kicker">Sixteen papers · sixteen images</p><h2>可视化目录</h2><div class="grid3">${cards}</div></section>
  <div class="nav"><a href="../README.md">系列索引</a><a href="../00_总纲_青橙设计.md">00 总纲原文</a><a href="../10_设计思维_从问题到可被体验的答案.md">10 设计思维原文</a></div>
  <footer class="footer"><span>青橙设计 · philosophy/html/</span><span>静态 HTML · 可离线打开</span></footer>
</main>
<script src="./philosophy-theme.js" defer></script>
</body>
</html>`
writeFileSync(join(OUT, 'index.html'), index)
console.log(`wrote ${pages.length + 1} pages to ${OUT}`)
