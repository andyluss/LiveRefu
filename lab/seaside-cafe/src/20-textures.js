/* ============================================================
   程序化 Canvas 纹理与材质表
   ============================================================ */
function noise(ctx, w, h, n, alpha = .05, colors = ['#000', '#fff']) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.globalAlpha = 1;
}

const TEX = {
  grass: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6b7357'; ctx.fillRect(0, 0, w, h);
    const cols = ['#7b8160', '#5d684d', '#888968', '#6f7a56', '#92906f'];
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = .10 + Math.random() * .12;
      ctx.beginPath(); ctx.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 55, 6 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4500; i++) {
      ctx.strokeStyle = Math.random() > .5 ? 'rgba(60,72,42,.35)' : 'rgba(185,190,145,.25)';
      ctx.lineWidth = 1;
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand(-2, 2), y - rand(3, 8)); ctx.stroke();
    }
    noise(ctx, w, h, 800, .06);
  }, { repeat: [5, 5] }),
  wood: canvasTexture(512, 512, (ctx, w, h) => {
    const base = ctx.createLinearGradient(0, 0, w, 0);
    base.addColorStop(0, '#9a6a48'); base.addColorStop(.5, '#a87852'); base.addColorStop(1, '#8e5e40');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const planks = 7, pw = w / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = `rgba(${i % 2 ? 30 : 255},${i % 2 ? 20 : 240},${i % 2 ? 10 : 220},${i % 2 ? .035 : .03})`;
      ctx.fillRect(i * pw, 0, pw, h);
      ctx.strokeStyle = 'rgba(55,32,20,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(i * pw, 0); ctx.lineTo(i * pw, h); ctx.stroke();
      for (let k = 0; k < 18; k++) {
        ctx.strokeStyle = `rgba(60,38,24,${.04 + Math.random() * .08})`; ctx.lineWidth = 1 + Math.random() * 2;
        const x = i * pw + 4 + Math.random() * (pw - 8);
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + rand(-7, 7), h * .33, x + rand(-7, 7), h * .66, x + rand(-6, 6), h);
        ctx.stroke();
      }
      // knots
      if (i % 3 === 0) {
        ctx.strokeStyle = 'rgba(60,36,22,.25)'; ctx.lineWidth = 2;
        const kx = i * pw + pw * .5, ky = h * (.2 + .2 * (i % 3));
        ctx.beginPath(); ctx.ellipse(kx, ky, 9, 22, .2, 0, Math.PI * 2); ctx.stroke();
      }
    }
    noise(ctx, w, h, 500, .04);
  }, { repeat: [1.4, 1.6] }),
  woodFloor: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a3b2a'; ctx.fillRect(0, 0, w, h);
    const plankH = 64;
    for (let i = 0; i < h / plankH; i++) {
      ctx.fillStyle = i % 2 ? '#664431' : '#5c3c2b'; ctx.fillRect(0, i * plankH, w, plankH - 2);
      ctx.strokeStyle = 'rgba(25,14,8,.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, i * plankH + plankH - 1); ctx.lineTo(w, i * plankH + plankH - 1); ctx.stroke();
      for (let k = 0; k < 10; k++) {
        ctx.strokeStyle = `rgba(35,20,10,${.05 + Math.random() * .1})`; ctx.lineWidth = 1;
        const y = i * plankH + 4 + Math.random() * (plankH - 8);
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * .3, y + rand(-4, 4), w * .6, y + rand(-4, 4), w, y + rand(-3, 3)); ctx.stroke();
      }
    }
    noise(ctx, w, h, 350, .04);
  }, { repeat: [2, 2] }),
  roof: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3a3f43'; ctx.fillRect(0, 0, w, h);
    const rows = 8, cols = 7, rh = h / rows, cw = w / cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = 52 + ((r * 3 + c * 7) % 12);
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 5})`;
        roundRect(ctx, c * cw + 2, r * rh + 2, cw - 4, rh - 3, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(12,15,18,.5)'; ctx.lineWidth = 2;
        roundRect(ctx, c * cw + 2, r * rh + 2, cw - 4, rh - 3, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        ctx.fillRect(c * cw + 6, r * rh + 4, cw - 12, 3);
      }
      ctx.fillStyle = 'rgba(10,12,15,.38)';
      ctx.fillRect(0, r * rh, w, 3);
    }
    noise(ctx, w, h, 500, .06);
  }, { repeat: [2.4, 3] }),
  plaster: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e6ddcb'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.18)' : 'rgba(120,110,95,.08)';
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, Math.PI * 2); ctx.fill();
    }
    noise(ctx, w, h, 1800, .05);
  }, { repeat: [2, 2] }),
  concrete: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9e9d96'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 2500, .13, ['#252525', '#ffffff']);
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = 'rgba(60,60,55,.15)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(Math.random() * w, 0);
      ctx.bezierCurveTo(Math.random() * w, h * .4, Math.random() * w, h * .6, Math.random() * w, h); ctx.stroke();
    }
  }, { repeat: [2, 1] }),
  stone: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8c8a80'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 40},${100 + Math.random() * 40},${90 + Math.random() * 34},.18)`;
      roundRect(ctx, Math.random() * w, Math.random() * h, 30 + Math.random() * 90, 20 + Math.random() * 60, 12); ctx.fill();
    }
    noise(ctx, w, h, 1800, .09, ['#333', '#fff']);
  }, { repeat: [2, 2] }),
  sand: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d7c29d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      const c = Math.random();
      ctx.fillStyle = c > .7 ? 'rgba(255,248,225,.5)' : c > .35 ? 'rgba(180,150,110,.35)' : 'rgba(120,100,75,.22)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = 'rgba(170,145,108,.16)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(0, 24 + i * 52);
      ctx.bezierCurveTo(w * .3, 10 + i * 52, w * .7, 40 + i * 52, w, 20 + i * 52); ctx.stroke();
    }
  }, { repeat: [6, 6] }),
  tatami: canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a9a273'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) {
      ctx.strokeStyle = y % 8 ? 'rgba(80,80,50,.18)' : 'rgba(235,228,180,.2)';
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = 0; x < w; x += 64) {
      ctx.strokeStyle = 'rgba(60,60,35,.55)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    noise(ctx, w, h, 800, .05);
  }, { repeat: [1.6, 1.6] }),
  noren: canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#26334d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * .035})`; ctx.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
    ctx.strokeStyle = 'rgba(235,230,215,.55)'; ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * w / 3, 12); ctx.lineTo(i * w / 3, h - 8); ctx.stroke(); }
    ctx.fillStyle = '#f2ead8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 84px ${JP_SERIF}`;
    ctx.fillText('海風珈琲', w / 2, h * .48);
    ctx.font = `500 26px ${JP_SANS}`;
    ctx.fillStyle = 'rgba(242,234,216,.78)';
    ctx.fillText('UMIKAZE COFFEE', w / 2, h * .78);
    ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
  }),
  sign: canvasTexture(512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#6c4b34'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = 'rgba(40,24,15,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, i * 9); ctx.lineTo(w, i * 9 + rand(-2, 2)); ctx.stroke(); }
    ctx.fillStyle = '#eee5d2'; roundRect(ctx, 16, 16, w - 32, h - 32, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(80,55,35,.35)'; ctx.lineWidth = 3; ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#27394b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 78px ${JP_SERIF}`;
    ctx.fillText('海風珈琲', w / 2, 122);
    ctx.font = `500 25px ${JP_SANS}`; ctx.fillStyle = '#7b5a3c';
    ctx.fillText('UMIKAZE COFFEE / 潮音の庭', w / 2, 190);
    ctx.font = `500 20px ${JP_SANS}`; ctx.fillStyle = 'rgba(60,45,35,.7)';
    ctx.fillText('OPEN 7:00 — 19:00   ·   海辺の小さな珈琲店', w / 2, 236);
    // rusty hook
    ctx.strokeStyle = 'rgba(110,70,40,.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(w / 2, 34, 13, .1, Math.PI - .1); ctx.stroke();
  }),
  chalk: canvasTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#26332f'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 1600, .08, ['#fff', '#000']);
    ctx.strokeStyle = 'rgba(220,225,210,.25)'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#e8e4d2'; ctx.textAlign = 'center';
    ctx.font = `500 40px ${JP_SERIF}`; ctx.fillText('本日のおしながき', w / 2, 62);
    ctx.textAlign = 'left'; ctx.font = `500 24px ${JP_SANS}`;
    const items = [['手冲咖啡', '38'], ['海盐拿铁', '42'], ['玻璃汽水', '24'], ['柠檬磅蛋糕', '28'], ['红豆面包', '22']];
    items.forEach((it, i) => {
      ctx.fillStyle = 'rgba(232,228,210,.9)'; ctx.fillText(it[0], 46, 118 + i * 44);
      ctx.fillStyle = '#d6b77b'; ctx.textAlign = 'right'; ctx.fillText(it[1], w - 46, 118 + i * 44); ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(232,228,210,.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(44, 132 + i * 44); ctx.lineTo(w - 44, 132 + i * 44); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(232,228,210,.55)'; ctx.font = `400 18px ${JP_SANS}`;
    ctx.fillText('本日のおすすめ：浅煎りエチオピア', 46, 356);
  }),
  poster1: canvasTexture(256, 360, (ctx, w, h) => {
    ctx.fillStyle = '#e9e1cd'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f4560'; ctx.fillRect(0, 0, w, 130);
    ctx.fillStyle = '#f3ecdc'; ctx.beginPath(); ctx.arc(64, 62, 31, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c7a56b'; ctx.beginPath(); ctx.arc(188, 54, 21, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f4560'; ctx.textAlign = 'center';
    ctx.font = `600 34px ${JP_SERIF}`; ctx.fillText('夏の海', w / 2, 190);
    ctx.font = `500 20px ${JP_SANS}`; ctx.fillStyle = '#6b5a44'; ctx.fillText('海開き・花火大会', w / 2, 226);
    ctx.fillText('8.20  SAT  19:30', w / 2, 258);
    ctx.fillStyle = '#a56b4b'; ctx.fillRect(34, 292, w - 68, 2);
    ctx.fillStyle = '#7a6a52'; ctx.font = `400 16px ${JP_SANS}`; ctx.fillText('海辺の小さな珈琲店', w / 2, 326);
  }),
  poster2: canvasTexture(256, 360, (ctx, w, h) => {
    ctx.fillStyle = '#dce6e6'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#355d69'; ctx.fillRect(0, h * .55, w, h * .45);
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, h * .66 + i * 14); ctx.bezierCurveTo(w * .3, h * .6 + i * 14, w * .7, h * .72 + i * 14, w, h * .66 + i * 14); ctx.stroke(); }
    ctx.fillStyle = '#26334d'; ctx.textAlign = 'center';
    ctx.font = `600 32px ${JP_SERIF}`; ctx.fillText('潮音の庭', w / 2, 72);
    ctx.font = `400 15px ${JP_SANS}`; ctx.fillText('COFFEE & SEA BREEZE', w / 2, 102);
    ctx.fillStyle = '#f4ecda'; ctx.font = `500 20px ${JP_SANS}`; ctx.fillText('海を見ながら', w / 2, 240);
    ctx.fillText('一杯の朝を。', w / 2, 270);
  }),
  menuCard: canvasTexture(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#f0e8d5'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a6f4d'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#2f4054'; ctx.textAlign = 'center';
    ctx.font = `600 28px ${JP_SERIF}`; ctx.fillText('海風珈琲', w / 2, 58);
    ctx.font = `400 13px ${JP_SANS}`; ctx.fillStyle = '#7c664d'; ctx.fillText('TODAY’S MENU', w / 2, 82);
    ctx.textAlign = 'left'; ctx.font = `400 17px ${JP_SANS}`;
    const items = [['手冲', '38'], ['拿铁', '42'], ['汽水', '24'], ['蛋糕', '28']];
    items.forEach((it, i) => {
      ctx.fillStyle = '#3a4a54'; ctx.fillText(it[0], 34, 140 + i * 46);
      ctx.textAlign = 'right'; ctx.fillStyle = '#8a6a3f'; ctx.fillText(it[1], w - 34, 140 + i * 46); ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(120,100,70,.25)'; ctx.beginPath(); ctx.moveTo(34, 152 + i * 46); ctx.lineTo(w - 34, 152 + i * 46); ctx.stroke();
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#7c664d'; ctx.font = `400 12px ${JP_SANS}`;
    ctx.fillText('请慢慢坐，海风不会催你。', w / 2, 350);
  }),
  vending: canvasTexture(512, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e9f4f6'); g.addColorStop(1, '#c9e2e8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2d6f83'; ctx.fillRect(0, 0, w, 120);
    ctx.fillStyle = '#f4feff'; ctx.textAlign = 'center';
    ctx.font = `600 46px ${JP_SANS}`; ctx.fillText('潮風ドリンク', w / 2, 62);
    ctx.font = `400 24px ${JP_SANS}`; ctx.fillText('COLD DRINKS · 100 YEN', w / 2, 98);
    const colors = ['#ef8a76', '#e9c96b', '#7fc7a8', '#8ab7dd', '#e8a0b8', '#f2e6cf'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
      const x = 44 + c * 88, y = 170 + r * 200;
      ctx.fillStyle = 'rgba(30,70,80,.1)'; roundRect(ctx, x - 5, y - 5, 76, 162, 10); ctx.fill();
      ctx.fillStyle = colors[(r * 5 + c) % colors.length]; roundRect(ctx, x + 10, y + 30, 46, 112, 12); ctx.fill();
      ctx.fillStyle = '#f9ffff'; ctx.fillRect(x + 17, y + 70, 32, 30);
      ctx.fillStyle = 'rgba(40,70,80,.7)'; ctx.font = `500 16px ${JP_SANS}`; ctx.fillText(['120', '150', '100'][r], x + 33, y + 175);
    }
    ctx.fillStyle = '#f7fbf7'; ctx.fillRect(0, 800, w, 224);
    ctx.fillStyle = '#d3e3df'; ctx.fillRect(24, 820, 300, 74);
    ctx.fillStyle = '#2c3f46'; ctx.font = `500 26px ${JP_SANS}`; ctx.textAlign = 'left'; ctx.fillText('COIN / 100 YEN', 40, 865);
    ctx.fillStyle = '#3a4a50'; ctx.fillRect(350, 820, 120, 74);
    ctx.fillStyle = '#9ce3c3'; ctx.fillRect(366, 836, 88, 20);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = '#7fc7a8'; roundRect(ctx, 44 + i * 100, 922, 70, 34, 16); ctx.fill(); }
    ctx.fillStyle = '#5e7378'; ctx.font = `400 18px ${JP_SANS}`; ctx.fillText('つめた〜い のみもの', 44, 1000);
  }),
  bus: canvasTexture(320, 420, (ctx, w, h) => {
    ctx.fillStyle = '#eef0e8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f5e78'; ctx.fillRect(0, 0, w, 86);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = `600 34px ${JP_SANS}`; ctx.fillText('海浜公園前', w / 2, 54);
    ctx.fillStyle = '#2f4054'; ctx.font = `500 22px ${JP_SANS}`; ctx.fillText('潮風線  ·  バス停', w / 2, 122);
    ctx.textAlign = 'left'; ctx.font = `400 18px ${JP_SANS}`; ctx.fillStyle = '#46585c';
    const times = ['07:12', '08:05', '09:20', '11:40', '13:10', '15:30', '17:20', '18:45'];
    times.forEach((t, i) => ctx.fillText(t, 44 + (i % 2) * 130, 174 + Math.floor(i / 2) * 42));
    ctx.strokeStyle = '#aeb8b2'; ctx.lineWidth = 2; ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#6b7a72'; ctx.font = `400 14px ${JP_SANS}`; ctx.textAlign = 'center'; ctx.fillText('SEASIDE LINE / NAGISA', w / 2, 390);
  }),
  ema: canvasTexture(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#d8bb8d'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) { ctx.strokeStyle = 'rgba(110,80,45,.13)'; ctx.beginPath(); ctx.moveTo(0, i * 10); ctx.bezierCurveTo(w * .4, i * 10 + rand(-3, 3), w * .6, i * 10 + rand(-3, 3), w, i * 10); ctx.stroke(); }
    ctx.fillStyle = '#5b3b25'; ctx.textAlign = 'center'; ctx.font = `500 18px ${JP_SERIF}`; ctx.fillText('絵馬', w - 38, 34);
    ctx.strokeStyle = 'rgba(90,60,35,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w / 2, 12, 7, 0, Math.PI * 2); ctx.stroke();
  }),
  record: canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1c1c1c'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 122, 0, Math.PI * 2); ctx.fill();
    for (let i = 20; i < 120; i += 4) { ctx.strokeStyle = `rgba(255,255,255,${.03 + (i % 3) * .02})`; ctx.beginPath(); ctx.arc(w / 2, h / 2, i, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#d9b36b'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4b3828'; ctx.textAlign = 'center'; ctx.font = `500 12px ${JP_SANS}`; ctx.fillText('SEA BREEZE', w / 2, h / 2 - 44);
  }),
  catFur: canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9a47a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { ctx.strokeStyle = `rgba(${80 + Math.random() * 70},${55 + Math.random() * 50},${35 + Math.random() * 35},${.08 + Math.random() * .2})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * h); ctx.lineTo(Math.random() * w, Math.random() * h); ctx.stroke(); }
  }, { repeat: [2, 2] }),
};

/* ---------- 材质 ---------- */
const std = (o) => new THREE.MeshStandardMaterial(o);
const MAT = {
  wood: std({ map: TEX.wood, roughness: .82, metalness: .02 }),
  woodFloor: std({ map: TEX.woodFloor, roughness: .72, metalness: .01 }),
  woodDark: std({ color: '#5a3b28', roughness: .84 }),
  woodLight: std({ color: '#c8a27a', roughness: .8 }),
  roof: std({ map: TEX.roof, color: '#b9c0c4', roughness: .88, metalness: .06 }),
  plaster: std({ map: TEX.plaster, color: '#f0e9da', roughness: .96 }),
  concrete: std({ map: TEX.concrete, roughness: .95 }),
  stone: std({ map: TEX.stone, roughness: .92 }),
  land: std({ map: TEX.grass, roughness: 1 }),
  sand: std({ map: TEX.sand, roughness: 1 }),
  sandWet: std({ map: TEX.sand, color: '#b09a78', roughness: .72 }),
  tatami: std({ map: TEX.tatami, roughness: .96 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe3e2', transparent: true, opacity: .24, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  glassBlue: new THREE.MeshPhysicalMaterial({ color: '#a9d2d6', transparent: true, opacity: .3, roughness: .08, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  brass: std({ color: '#b58a4f', roughness: .33, metalness: .78 }),
  iron: std({ color: '#3f4447', roughness: .58, metalness: .55 }),
  blackMetal: std({ color: '#202427', roughness: .5, metalness: .6 }),
  copper: std({ color: '#a86542', roughness: .38, metalness: .7 }),
  ceramic: std({ color: '#efe7d7', roughness: .45 }),
  ceramicDark: std({ color: '#55605f', roughness: .5 }),
  indigo: std({ color: '#26334d', roughness: .95 }),
  indigoLight: std({ color: '#3d506e', roughness: .92 }),
  clothWhite: std({ color: '#ece4d1', roughness: .96 }),
  clothCoral: std({ color: '#c47a65', roughness: .95 }),
  leaf: std({ color: '#5d7b58', roughness: .9 }),
  leafLight: std({ color: '#7d9b6b', roughness: .9 }),
  leafDark: std({ color: '#3f5c44', roughness: .9 }),
  trunk: std({ color: '#6d4f36', roughness: .92 }),
  stoneDark: std({ color: '#63665f', roughness: .94 }),
  moss: std({ color: '#5e744f', roughness: 1 }),
  noren: std({ map: TEX.noren, roughness: .96, side: THREE.DoubleSide }),
  sign: std({ map: TEX.sign, roughness: .86 }),
  chalk: std({ map: TEX.chalk, roughness: .9 }),
  paper: std({ map: TEX.menuCard, roughness: .92 }),
  record: std({ map: TEX.record, roughness: .5, metalness: .1 }),
  catFur: std({ map: TEX.catFur, roughness: .96 }),
  white: std({ color: '#e9e2d2', roughness: .8 }),
  cream: std({ color: '#d9c8a9', roughness: .86 }),
  coral: std({ color: '#c47a65', roughness: .9 }),
  seaBlue: std({ color: '#375e6d', roughness: .5, metalness: .1 }),
  glassCase: new THREE.MeshPhysicalMaterial({ color: '#d9eef0', transparent: true, opacity: .18, roughness: .04, metalness: 0, depthWrite: false, side: THREE.DoubleSide }),
};

MAT.sign.emissive = new THREE.Color('#ffdfb2'); MAT.sign.emissiveMap = TEX.sign; MAT.sign.emissiveIntensity = .18;
MAT.noren.emissive = new THREE.Color('#ffffff'); MAT.noren.emissiveMap = TEX.noren; MAT.noren.emissiveIntensity = .38;

function emissive(color, intensity = 1) { return std({ color: '#151515', emissive: color, emissiveIntensity: intensity, roughness: .5 }); }
const EMI = {
  warm: emissive('#ffc47d', 2.2),
  warmSoft: emissive('#ffd59b', 1.4),
  lantern: emissive('#ffb96b', 2.6),
  cool: emissive('#bfe9ee', 1.6),
  screen: emissive('#9de3cb', 1.6),
  lighthouse: emissive('#fff0c8', 3),
};
