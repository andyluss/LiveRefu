// SPDX-License-Identifier: UNLICENSED
export interface LifeAppLink {
  id: string
  name: string
  english: string
  port: number
  group: string
  description: string
}
export const APPS: LifeAppLink[] = [
  { id: 'ledger', name: '慢慢记', english: 'MANMANJI', port: 4206, group: '财务', description: '记账、预算、自由职业发票' },
  { id: 'sleep', name: '好好睡', english: 'SLEEPWELL', port: 4201, group: '节律', description: '睡眠时长、质量与影响因素' },
  { id: 'meal', name: '好好吃', english: 'MEALTIME', port: 4202, group: '节律', description: '三餐、蔬菜、饮水与饮食感受' },
  { id: 'move', name: '慢慢走', english: 'DAILYWALK', port: 4203, group: '节律', description: '步行、运动、强度与心情' },
  { id: 'read', name: '好好读', english: 'READINGLOG', port: 4204, group: '节律', description: '阅读页数、书、摘录与想法' },
  { id: 'home', name: '好好住', english: 'HOMEBOARD', port: 4205, group: '节律', description: '家务、维护、区域与到期' },
  { id: 'wear', name: '好好穿', english: 'WEARWELL', port: 4207, group: '生活', description: '穿搭、衣橱、洗衣、愿望清单' },
  { id: 'hydrate', name: '好好喝', english: 'HYDRATE', port: 4208, group: '生活', description: '饮水、配方、杯具、咖啡因' },
  { id: 'journal', name: '好好写', english: 'JOURNAL', port: 4209, group: '生活', description: '日记、提示卡、回顾、感恩' },
  { id: 'watch', name: '好好看', english: 'WATCHLOG', port: 4210, group: '生活', description: '电影、剧集、片单、影院' },
  { id: 'listen', name: '好好听', english: 'LISTENLOG', port: 4211, group: '生活', description: '专辑、播客、歌单、现场' },
  { id: 'learn', name: '好好学', english: 'LEARNLOG', port: 4212, group: '生活', description: '学习会话、课程、技能、笔记' },
  { id: 'travel', name: '好好行', english: 'TRAVELLOG', port: 4213, group: '生活', description: '出行、地点、行程、纪念物' },
  { id: 'care', name: '好好养', english: 'CARELOG', port: 4214, group: '生活', description: '植物/宠物照护、计划、健康' },
  { id: 'organize', name: '好好整', english: 'TIDYLOG', port: 4215, group: '生活', description: '整理、空间、物品去向、捐赠' },
  { id: 'connect', name: '好好聊', english: 'CONNECT', port: 4216, group: '生活', description: '联系、人物、礼物、重要日期' }
]
