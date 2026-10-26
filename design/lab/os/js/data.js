/* 青橙 OS · simulated data. Everything here is fictional and local. */
(function () {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const dayKey = (d, day) => `${monthKey(d)}-${pad(day)}`;
  const todayKey = `${monthKey(now)}-${pad(now.getDate())}`;

  window.OS_DATA = {
    demoDate: '2026-10-26',
    apps: [
      { id: 'finder', title: 'Finder', icon: 'finder', tone: 'tone-finder' },
      { id: 'notes', title: 'Notes', icon: 'notes', tone: 'tone-notes' },
      { id: 'settings', title: 'Settings', icon: 'settings', tone: 'tone-settings' },
      { id: 'gallery', title: 'Gallery', icon: 'gallery', tone: 'tone-gallery' },
      { id: 'radio', title: 'Radio', icon: 'radio', tone: 'tone-radio' },
      { id: 'terminal', title: 'Terminal', icon: 'terminal', tone: 'tone-terminal' },
      { id: 'calendar', title: 'Calendar', icon: 'calendar', tone: 'tone-calendar' },
      { id: 'mail', title: 'Mail', icon: 'mail', tone: 'tone-mail' },
      { id: 'weather', title: 'Weather', icon: 'weather', tone: 'tone-weather' }
    ],
    files: [
      { id: 'f-welcome', name: '开始阅读.md', kind: '笔记', app: 'notes', note: 'welcome', icon: 'doc', meta: '今天的入口', place: '桌面' },
      { id: 'f-charter', name: '实验区章程.md', kind: '笔记', app: 'notes', note: 'charter', icon: 'doc', meta: 'LAB / 规则', place: '文档' },
      { id: 'f-futures', name: '三个未来.md', kind: '笔记', app: 'notes', note: 'futures', icon: 'doc', meta: '世界设定', place: '文档' },
      { id: 'f-archive', name: '档案：橙港 2086', kind: '影像', app: 'gallery', gallery: 0, icon: 'image', meta: 'Archive / 纸与海', place: '图像' },
      { id: 'f-solar', name: '提案：太阳能合作社', kind: '影像', app: 'gallery', gallery: 3, icon: 'image', meta: 'Solar / 维修站', place: '图像' },
      { id: 'f-cyber', name: '诊断：夜间外包', kind: '影像', app: 'gallery', gallery: 5, icon: 'image', meta: 'Cyber / 监控', place: '未来' },
      { id: 'f-wave', name: '橙波 · 节目单', kind: '音频', app: 'radio', icon: 'radio', meta: '模拟信号', place: '未来' },
      { id: 'f-mail', name: '维护日志：10 月', kind: '邮件', app: 'mail', mail: 2, icon: 'mail', meta: '谁维护？', place: '文档' },
      { id: 'f-cal', name: '维修日 · 社区', kind: '日历', app: 'calendar', icon: 'calendar', meta: '每月最后一个周六', place: '未来' },
      { id: 'f-weather', name: '橙港气象站', kind: '天气', app: 'weather', icon: 'weather', meta: '数据来源：社区站', place: '未来' }
    ],
    notes: [
      {
        id: 'welcome', title: '开始阅读：这不是一张壁纸',
        updated: '2026-10-26 18:06', tag: '入口',
        body: `欢迎来到青橙 OS。\n\n这是一个实验，不是一套已经定稿的产品。它把青橙设计当前确定的部分，与几个还没有答案的未来，放在同一张桌面上。\n\n你可以先做三件事：\n1. 打开右上角的「未来」按钮，切换 Archive / Solar / Cyber；\n2. 打开 Terminal，输入 help，看看视觉背后的状态；\n3. 在 Settings → 可访问性里打开减少动态 / 高对比，确认它仍然可用。\n\n青橙不是一种配色。它是一组判断：\n- 可感：系统状态应该能被身体先读到；\n- 可参与：人保留判断、维护、改写的位置；\n- 可退出：任何未来都不能把人锁死；\n- 诚实：每个未来都要展示谁维护、谁承担代价。\n\n这个桌面上所有天气、邮件、电台、文件都是模拟的。它们不是证据，只是提问的材料。\n\n—— 青橙设计实验室`
      },
      {
        id: 'charter', title: '实验区章程（草案）',
        updated: '2026-10-26 17:40', tag: 'Lab',
        body: `实验区允许使用未定 token、临时组件、非常规交互。\n\n但它不伪装成生产，不伪造证据，不把不可读/不可关闭当作未来感。\n\n每个实验要写：假设、来源、边界、入口、回收、状态。\n\n毕业路径：sketch → prototype → candidate → 生产提案。`
      },
      {
        id: 'futures', title: '三个未来，不是三个答案',
        updated: '2026-10-26 17:12', tag: '世界',
        body: `Archive：档案、纸、登记、维修。它的代价是低密度、手工维护。\n\nSolar：本地能源、社区维修、适当技术。它的代价是速度慢、需要参与。\n\nCyber：高效率、高密度、远程维护。它的代价是监控、依赖、退出成本高。\n\n它们共享同一套语法：信息位置、焦点、键盘、可读退路、可退出。\n\n换的是皮肤、材料、光源、语气与代价；不换的是人的位置。`
      },
      {
        id: 'field-notes', title: '可感，不是装饰',
        updated: '2026-10-25 22:18', tag: '方法',
        body: `一个波形、一片云、一段逐渐变暖的色温，只有在它能回答“对应哪个状态”时，才不是装饰。\n\n在这个 OS 里：\n- 天气对应虚构气象站的数据；\n- 电台波形对应模拟播放进度；\n- 未来层对应一组 token 与世界假设；\n- Terminal 里永远能读到当前 era / theme / storage。\n\n可感的退路是数字、文字、键盘与屏幕阅读器。`
      }
    ],
    gallery: [
      { art: 'a1', title: '橙港，清晨 06:40', desc: '海面把夜里的信号塔倒过来。档案员说，今天的潮汐比预报慢 11 分钟。', tags: ['Archive', '海', '可感'], era: 'archive' },
      { art: 'a2', title: '登记处，第三排', desc: '每一份未来都要被编号。编号不是结论，只是让后来的人能找到它。', tags: ['Archive', '劳动', '维修'], era: 'archive' },
      { art: 'a4', title: '社区电站，午后', desc: '屋顶的 PV 在给三户人家和一台旧冰箱供电。剩余电量被写在门口的小黑板上。', tags: ['Solar', '能源', '参与'], era: 'solar' },
      { art: 'a7', title: '维修站，星期六', desc: '没有“一键修复”。有人带来坏掉的收音机，另一个人带来了焊锡和下午。', tags: ['Solar', '维护', '适当技术'], era: 'solar' },
      { art: 'a3', title: '夜间外包，02:17', desc: '城市的灯由三千公里外的承包商维护。故障单在系统里排队，没有人知道维修工的名字。', tags: ['Cyber', '外包', '代价'], era: 'cyber' },
      { art: 'a6', title: '监控层，07 号塔', desc: '高密度带来高效率，也带来更多看不见的观察者。界面越顺滑，过程越不可见。', tags: ['Cyber', '监控', '诊断'], era: 'cyber' },
      { art: 'a5', title: '纸的折射', desc: '一张被反复扫描的纸，边缘开始发亮。复制不会让它更新，只会让它更远。', tags: ['Archive', '媒介'], era: 'archive' },
      { art: 'a8', title: '落日协议', desc: '太阳落下时，系统把非必要服务降级。不是因为浪漫，是因为电池只够撑到明天。', tags: ['Solar', '降级', '诚实'], era: 'solar' }
    ],
    tracks: [
      { title: '橙波 · 慢速信号', artist: 'Citrus Wave Ensemble', dur: 214, tag: 'Archive' },
      { title: '维修站的下午', artist: '社区电台 / 现场', dur: 187, tag: 'Solar' },
      { title: '夜间外包', artist: 'Ghost Contractor', dur: 242, tag: 'Cyber' },
      { title: '潮汐表', artist: 'Harbor Index', dur: 168, tag: 'Archive' },
      { title: '给后来的人', artist: 'Unknown Maintainer', dur: 301, tag: 'Solar' }
    ],
    mails: [
      { id: 'm1', from: '维护组', address: 'repair@citrus.local', subject: '本周六：收音机维修站', date: '10:24', unread: true, body: `这周六 14:00，社区维修站。\n\n带一件坏掉的东西，或者只带下午。\n\n我们提供焊锡、螺丝刀、茶，以及不会替你做完的耐心。\n\n—— 阿岚` },
      { id: 'm2', from: '橙港气象站', address: 'weather@citrus.local', subject: '潮汐与能源：今日 18:00 更新', date: '09:12', unread: true, body: `今日潮汐比预报慢 11 分钟。\n\n社区电站剩余 38%，建议 18:00 后关闭非必要照明。\n\n这不是一个警告，只是一条可读的状态。\n\n—— 气象站值班员` },
      { id: 'm3', from: '档案员', address: 'archive@citrus.local', subject: '关于“未来转盘”的登记', date: '昨天', unread: false, body: `我们在档案里新增了三个未来层：Archive、Solar、Cyber。\n\n每一层都必须写清：谁维护、谁承担代价、怎么退出。\n\n如果某一层只剩风格，没有结构，就把它退回实验室。\n\n—— 档案员` },
      { id: 'm4', from: '外包承包商', address: 'noreply@nightops.example', subject: '服务等级协议变更通知', date: '昨天', unread: false, body: `自下月起，夜间维护响应时间由 4 小时调整为 8 小时。\n\n你可以在控制中心查看当前依赖项。\n\n继续使用即表示同意。\n\n—— NightOps Customer Success` }
    ],
    calendarSeed: [
      { offset: 3, time: '14:00', title: '社区维修站', tone: 'solar' },
      { offset: 7, time: '09:30', title: '档案登记：未来层', tone: 'archive' },
      { offset: 12, time: '18:00', title: '能源降级演练', tone: 'solar' },
      { offset: 18, time: '02:00', title: '外包维护窗口', tone: 'cyber' },
      { offset: 24, time: '16:00', title: '读稿会：谁承担代价', tone: 'archive' }
    ],
    todayKey,
    monthKey: monthKey(now),
    weather: {
      city: '橙港 / CITRUS HARBOR',
      temp: 22, condition: '薄云，海风 3 级', high: 24, low: 17,
      stats: [['湿度', '62%'], ['风速', '14 km/h'], ['气压', '1014 hPa'], ['能见度', '18 km']],
      hourly: [
        ['现在', 22, 'sun'], ['19:00', 21, 'cloud'], ['20:00', 20, 'cloud'], ['21:00', 19, 'cloud'], ['22:00', 18, 'cloud'], ['23:00', 18, 'cloud']
      ],
      days: [['明天', 25, 18, 'sun'], ['周三', 24, 17, 'cloud'], ['周四', 22, 16, 'rain'], ['周五', 23, 17, 'cloud'], ['周六', 26, 19, 'sun']],
      energy: [
        ['archive', '社区电站 · 剩余 38%', '本地光伏 52% / 电池 31% / 外部 17%', [52, 31, 17]],
        ['solar', '社区电站 · 剩余 61%', '本地光伏 74% / 社区电池 21% / 外部 5%', [74, 21, 5]],
        ['cyber', '城市电网 · 负载 93%', '外部电网 68% / 夜间核电 24% / 应急 8%', [68, 24, 8]]
      ]
    }
  };
})();
