// 由 tools/build_cards_js.py 生成，请勿手改（改展示集请改脚本里的 SHOWCASE）。
// 数据源：future-debris/game/data/tables/cards.json（共 120 张，此处展示 9 张）
window.CARDS = [
  {
    "id": "RC-ATOMIC-001",
    "name": "模块化基座",
    "faction": "FAC-ATOMIC-AEC",
    "kind": "tower",
    "rarity": "common",
    "cost": 2,
    "power": 6,
    "might": 6,
    "compute": 0,
    "residue": 1,
    "keywords": [
      "基座",
      "供电"
    ],
    "text": "部署后为相邻塔位提供 1 点电力。每回合累积 1 点残渣。",
    "flavor": "「底座不好看，但每个区都想要一个。」——供应科备忘，1957"
  },
  {
    "id": "RC-ATOMIC-002",
    "name": "磁轨钉枪",
    "faction": "FAC-ATOMIC-AEC",
    "kind": "tower",
    "rarity": "common",
    "cost": 3,
    "power": 9,
    "might": 9,
    "compute": 0,
    "residue": 2,
    "keywords": [
      "穿透",
      "耗材"
    ],
    "text": "对直线上的敌人造成穿透伤害。使用后本关残渣 +2。",
    "flavor": "直线上的人不会知道是什么穿过了他们。"
  },
  {
    "id": "RC-ATOMIC-004",
    "name": "过载射击",
    "faction": "FAC-ATOMIC-AEC",
    "kind": "skill",
    "rarity": "rare",
    "cost": 1,
    "power": 4,
    "might": 4,
    "compute": 1,
    "residue": 3,
    "keywords": [
      "爆发",
      "污染"
    ],
    "text": "本回合所有塔攻击力 +50%，残渣 +3。",
    "flavor": "把明天的电都借来用。账单会在本关结束时寄到。"
  },
  {
    "id": "RC-ATOMIC-006",
    "name": "草坪洒水器",
    "faction": "FAC-ATOMIC-SUB",
    "kind": "support",
    "rarity": "common",
    "cost": 1,
    "power": 1,
    "might": 1,
    "compute": 0,
    "residue": 0,
    "keywords": [
      "清洁"
    ],
    "text": "每波清除本格 1 点残渣。",
    "flavor": "郊区秩序的第一次胜利，是让草看起来比昨天更绿。"
  },
  {
    "id": "RC-ATOMIC-007",
    "name": "样板街巡警",
    "faction": "FAC-ATOMIC-SUB",
    "kind": "unit",
    "rarity": "rare",
    "cost": 3,
    "power": 7,
    "might": 7,
    "compute": 1,
    "residue": 0,
    "keywords": [
      "规制"
    ],
    "text": "所在区域每有 3 点残渣，本卡攻击力下降 1。",
    "flavor": "他量过每一寸路面，包括你不打算被发现的那一寸。"
  },
  {
    "id": "RC-ATOMIC-009",
    "name": "深埋处置场",
    "faction": "FAC-ATOMIC-HAU",
    "kind": "tower",
    "rarity": "epic",
    "cost": 5,
    "power": 4,
    "might": 4,
    "compute": 0,
    "residue": 4,
    "keywords": [
      "封存",
      "代价"
    ],
    "text": "吸收附近残渣，但本关结束时结算双倍降级区。",
    "flavor": "我们说埋起来就看不见了。我们说得很大声。"
  },
  {
    "id": "RC-ATOMIC-010",
    "name": "铅衬外套",
    "faction": "FAC-ATOMIC-HAU",
    "kind": "modifier",
    "rarity": "rare",
    "cost": 2,
    "power": 0,
    "might": 0,
    "compute": 0,
    "residue": 0,
    "keywords": [
      "防护"
    ],
    "text": "装备单位免疫降级区伤害，但移动速度下降。",
    "flavor": "沉。很沉。但它让你能在自己造的天气里走路。"
  },
  {
    "id": "RC-ATOMIC-011",
    "name": "辐射漫游者",
    "faction": "FAC-ATOMIC-ROA",
    "kind": "unit",
    "rarity": "rare",
    "cost": 3,
    "power": 8,
    "might": 8,
    "compute": 1,
    "residue": 0,
    "keywords": [
      "适应"
    ],
    "text": "站在降级区上时攻击力 +3，离开后每波损失 1 点生命。",
    "flavor": "别人绕着走的地方，他搬了张椅子坐下。"
  },
  {
    "id": "RC-ATOMIC-012",
    "name": "渣土图腾",
    "faction": "FAC-ATOMIC-ROA",
    "kind": "relic",
    "rarity": "epic",
    "cost": 4,
    "power": 3,
    "might": 3,
    "compute": 0,
    "residue": 2,
    "keywords": [
      "残片"
    ],
    "text": "本关每有 5 点残渣，全队攻击力 +1；结算时保留 2 点残渣进入下一关。",
    "flavor": "他们把第一铲挖出来的东西供了起来，然后开始祈祷。"
  }
];
