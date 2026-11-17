// textures.js · 全部招牌、海报、包装与地面纹理都由 Canvas 现画，
// 不依赖外部图片，也不出现任何真实品牌。
import { canvasTexture, jp, en, fitText, roundRect } from './kit.js';

const CREAM = '#fff4dc';
const TEAL = '#1e6663';
const CORAL = '#ee7f68';
const MINT = '#8fc9b0';
const INK = '#24323d';
const PEACH = '#ffb38a';

// ---------- 基础画法 ----------
function paper(ctx, w, h, a = CREAM, b = '#fff9ec') {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, b); g.addColorStop(1, a);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function grain(ctx, w, h, n, alpha = 0.05) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    ctx.fillStyle = `rgba(60,50,40,${Math.random() * alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function firework(ctx, x, y, r, color, seed = 3) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + seed * 0.11;
    const r0 = r * 0.2, r1 = r * (0.72 + ((i * 7 + seed) % 5) * 0.06);
    ctx.beginPath();
    ctx.lineWidth = r * 0.035;
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(Math.cos(a) * r1, Math.sin(a) * r1, r * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cloud(ctx, x, y, s, color = 'rgba(255,255,255,.7)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.arc(x + s * 0.9, y + s * 0.12, s * 0.75, 0, Math.PI * 2);
  ctx.arc(x - s * 0.9, y + s * 0.16, s * 0.62, 0, Math.PI * 2);
  ctx.fill();
}

function waveMark(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.12;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, s * (i * 0.24 - 0.08));
    ctx.bezierCurveTo(-s * 0.2, s * (i * 0.24 - 0.3), s * 0.1, s * (i * 0.24 + 0.18), s * 0.6, s * (i * 0.24 - 0.08));
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- 便利店招牌 ----------
export function storeSignTexture() {
  return canvasTexture(2048, 256, (ctx, w, h) => {
    paper(ctx, w, h, '#fff1d2', '#fffaf0');
    // 顶部与底部色条
    ctx.fillStyle = TEAL; ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = CORAL; ctx.fillRect(0, h - 12, w, 12);
    // 左侧圆形标志：海与太阳
    ctx.save();
    ctx.translate(118, h / 2);
    ctx.fillStyle = TEAL;
    ctx.beginPath(); ctx.arc(0, 0, 86, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PEACH;
    ctx.beginPath(); ctx.arc(0, -14, 30, 0, Math.PI * 2); ctx.fill();
    waveMark(ctx, 0, 24, 74, CREAM);
    ctx.restore();
    // 品牌名
    ctx.fillStyle = TEAL;
    jp(ctx, 128, 'bold');
    ctx.fillText('ナギサマート', 242, 142);
    ctx.fillStyle = CORAL;
    en(ctx, 38, '700');
    ctx.letterSpacing = '7px';
    ctx.fillText('NAGISA MART', 248, 198);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(30,102,99,.72)';
    jp(ctx, 34, '600');
    ctx.fillText('海辺店 ・ 24時間', 248, 236);
    // 24H 圆牌
    ctx.save();
    ctx.translate(1830, 124);
    ctx.fillStyle = CORAL;
    ctx.beginPath(); ctx.arc(0, 0, 82, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CREAM;
    en(ctx, 62, '800'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('24H', 0, 2);
    ctx.restore();
    // 右侧小字
    ctx.textAlign = 'right';
    ctx.fillStyle = TEAL;
    jp(ctx, 38, '700');
    ctx.fillText('あかりは、いつも。', 1650, 172);
    ctx.fillStyle = 'rgba(30,102,99,.6)';
    en(ctx, 26, '600');
    ctx.fillText('OPEN EVERY DAY', 1650, 212);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    grain(ctx, w, h, 300, 0.03);
  });
}

export function verticalSignTexture() {
  return canvasTexture(320, 1024, (ctx, w, h) => {
    paper(ctx, w, h, '#fff2d6', '#fffaf0');
    ctx.fillStyle = TEAL; ctx.fillRect(0, 0, 12, h); ctx.fillRect(w - 12, 0, 12, h);
    ctx.fillStyle = CORAL; ctx.fillRect(0, h - 12, w, 12);
    // 顶部 24H
    ctx.save();
    ctx.translate(w / 2, 110);
    ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CREAM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    en(ctx, 58, '800'); ctx.fillText('24H', 0, 3);
    ctx.restore();
    // 竖排假名
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = TEAL;
    const chars = ['ナ', 'ギ', 'サ', 'マ', 'ー', 'ト'];
    const size = 96;
    jp(ctx, size, '800');
    chars.forEach((ch, i) => ctx.fillText(ch, w / 2, 280 + i * 102));
    // 底部海浪
    waveMark(ctx, w / 2, 940, 96, TEAL);
    ctx.fillStyle = CORAL; ctx.textAlign = 'center';
    en(ctx, 24, '700'); ctx.fillText('NAGISA', w / 2, 1000);
    grain(ctx, w, h, 120, 0.03);
  });
}

export function sideSignTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    paper(ctx, w, h, '#fff1d2', '#fffaf0');
    ctx.fillStyle = TEAL; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 12, w, 12);
    // 左侧浪纹圆标
    ctx.save();
    ctx.translate(92, h / 2);
    ctx.fillStyle = TEAL;
    ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PEACH;
    ctx.beginPath(); ctx.arc(0, -10, 22, 0, Math.PI * 2); ctx.fill();
    waveMark(ctx, 0, 20, 56, CREAM);
    ctx.restore();
    ctx.fillStyle = TEAL;
    jp(ctx, 92, '800'); ctx.fillText('ナギサマート', 190, 112);
    ctx.fillStyle = CORAL; en(ctx, 28, '700'); ctx.letterSpacing = '5px';
    ctx.fillText('NAGISA MART', 194, 156);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(30,102,99,.7)'; jp(ctx, 26, '600');
    ctx.fillText('海辺店 ・ 24時間 ・ あかりは、いつも。', 194, 202);
    ctx.save();
    ctx.translate(880, h / 2);
    ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(0, 0, 66, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = CREAM; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    en(ctx, 50, '800'); ctx.fillText('24H', 0, 2);
    ctx.restore();
    grain(ctx, w, h, 180, 0.03);
  });
}

export function horizonSignTexture() {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1f6f6b'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff4dc';
    jp(ctx, 46, '700'); ctx.fillText('海辺のあかり', 28, 66);
    en(ctx, 22, '600'); ctx.fillText('SEASIDE LIGHTING', 30, 102);
    ctx.strokeStyle = '#ffd8b0'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

export function plaqueTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c9a267'); g.addColorStop(0.5, '#a97c46'); g.addColorStop(1, '#8a5f33');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,240,205,.55)'; ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#2c2116'; ctx.textAlign = 'center';
    jp(ctx, 58, '800'); ctx.fillText('ナギサマート', w / 2, 108);
    en(ctx, 24, '700'); ctx.letterSpacing = '4px';
    ctx.fillText('NAGISA MART  /  SEASIDE DIORAMA', w / 2, 158);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(44,33,22,.75)'; en(ctx, 20, '600');
    ctx.fillText('1 / 150  ・  SUMMER  18:42', w / 2, 202);
  });
}

// ---------- 自动贩卖机正面 ----------
export function vendingFrontTexture() {
  return canvasTexture(512, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e9fbff'); g.addColorStop(0.55, '#d9f3fa'); g.addColorStop(1, '#bfe3ee');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2d7d8c'; ctx.fillRect(0, 0, w, 128);
    ctx.fillStyle = '#f2ffff'; ctx.textAlign = 'center';
    en(ctx, 64, '800'); ctx.letterSpacing = '6px'; ctx.fillText('SHIOSAI', w / 2, 66);
    ctx.letterSpacing = '0px';
    jp(ctx, 30, '700'); ctx.fillText('つめた〜い のみもの', w / 2, 110);
    // 罐装饮料陈列
    const cols = 5, rows = 3;
    const drinks = ['#ef7f68', '#f3c969', '#7fc7a8', '#87b9e8', '#e78fb1', '#f6e7c8', '#b6d47a', '#e9a06a'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 54 + c * 84, y = 178 + r * 188;
        ctx.fillStyle = 'rgba(30,90,105,.12)';
        roundRect(ctx, x - 6, y - 6, 76, 156, 14); ctx.fill();
        ctx.fillStyle = drinks[(r * cols + c) % drinks.length];
        roundRect(ctx, x + 12, y + 34, 40, 108, 14); ctx.fill();
        ctx.fillStyle = '#f7fff8'; ctx.fillRect(x + 18, y + 74, 28, 30);
        ctx.fillStyle = 'rgba(40,80,85,.75)';
        en(ctx, 15, '700'); ctx.textAlign = 'center';
        ctx.fillText(['130', '150', '120'][r], x + 32, y + 166);
        ctx.fillStyle = '#f2ffff'; ctx.beginPath(); ctx.arc(x + 32, y + 20, 14, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 下方操作区
    ctx.fillStyle = '#f7fbf7'; ctx.fillRect(0, 780, w, 244);
    ctx.fillStyle = '#d6e7e2'; ctx.fillRect(24, 800, 300, 74);
    ctx.fillStyle = INK; jp(ctx, 34, '700'); ctx.textAlign = 'left';
    ctx.fillText('お金を入れてください', 38, 850);
    ctx.fillStyle = '#3d4a52'; ctx.fillRect(356, 800, 120, 74);
    ctx.fillStyle = '#9be0c0'; ctx.fillRect(372, 816, 88, 20);
    ctx.fillStyle = '#e8f4ff'; en(ctx, 18, '700'); ctx.fillText('¥', 372, 868);
    // 按钮
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 2 ? '#ff9a80' : '#7fc7a8';
      roundRect(ctx, 40 + i * 88, 906, 64, 34, 16); ctx.fill();
    }
    ctx.fillStyle = '#5b7578'; jp(ctx, 18, '600');
    ctx.fillText('つめた〜い・あたたかい', 40, 990);
    en(ctx, 16, '600'); ctx.fillText('SHIOSAI BEVERAGE  /  300ml', 40, 1012);
  });
}

// ---------- 街角路牌 / 停车牌 ----------
export function roadSignTexture(title, sub, arrow) {
  return canvasTexture(512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#2f6f9e'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f2f7fb'; ctx.lineWidth = 8; ctx.strokeRect(9, 9, w - 18, h - 18);
    ctx.fillStyle = '#f7fbff'; ctx.textAlign = 'center';
    jp(ctx, 54, '700'); ctx.fillText(title, w / 2, 88);
    en(ctx, 26, '600'); ctx.fillText(sub, w / 2, 128);
    ctx.fillStyle = '#f7fbff';
    en(ctx, 66, '800'); ctx.fillText(arrow, w / 2, 182);
  });
}

export function parkingSignTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2f6f9e'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f6fbff'; ctx.textAlign = 'center';
    en(ctx, 190, '800'); ctx.fillText('P', w / 2, 200);
    ctx.strokeStyle = '#f6fbff'; ctx.lineWidth = 7; ctx.strokeRect(10, 10, w - 20, h - 20);
  });
}

// ---------- 海报 ----------
export function posterFireworksTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d2a4a'); g.addColorStop(0.6, '#31446b'); g.addColorStop(1, '#57455f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    firework(ctx, 110, 130, 82, '#ffca8f', 2);
    firework(ctx, 278, 96, 62, '#ff9d94', 5);
    firework(ctx, 262, 238, 52, '#a8e0cd', 7);
    // 海面
    ctx.fillStyle = '#25344c'; ctx.fillRect(0, 372, w, h - 372);
    ctx.strokeStyle = 'rgba(255,200,150,.45)'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(28 + i * 14, 404 + i * 12);
      ctx.lineTo(w - 28 - i * 12, 404 + i * 12);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff3d8'; ctx.textAlign = 'center';
    jp(ctx, 62, '800'); ctx.fillText('花火大会', w / 2, 320);
    ctx.fillStyle = '#ffd0a2'; jp(ctx, 24, '700');
    ctx.fillText('8.20  SAT  19:30', w / 2, 356);
    ctx.fillStyle = '#e8f2ff'; en(ctx, 17, '600');
    ctx.fillText('NAGISA BEACH PARK', w / 2, 470);
    ctx.strokeStyle = 'rgba(255,244,220,.8)'; ctx.lineWidth = 4; ctx.strokeRect(12, 12, w - 24, h - 24);
  });
}

export function posterFestivalTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ef8069'); g.addColorStop(1, '#f6a98c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 灯笼串
    ctx.strokeStyle = 'rgba(90,50,40,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 74); ctx.quadraticCurveTo(w / 2, 118, w, 74); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const x = 46 + i * 72, y = 86 + Math.sin(i * 1.3) * 12;
      ctx.strokeStyle = 'rgba(90,50,40,.45)'; ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#fff0cd' : '#ffd9a8';
      ctx.beginPath(); ctx.ellipse(x, y + 26, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(150,70,50,.5)'; ctx.fillRect(x - 22, y + 2, 44, 3); ctx.fillRect(x - 22, y + 48, 44, 3);
    }
    ctx.fillStyle = '#fff6e2'; ctx.textAlign = 'center';
    jp(ctx, 76, '800'); ctx.fillText('夏祭り', w / 2, 270);
    ctx.fillStyle = '#7a3f37'; jp(ctx, 27, '700');
    ctx.fillText('浴衣で おいで', w / 2, 322);
    ctx.fillStyle = '#fff6e2'; jp(ctx, 22, '600');
    ctx.fillText('8.19 — 8.21  神社通り', w / 2, 382);
    ctx.fillStyle = 'rgba(122,63,55,.85)'; en(ctx, 18, '600');
    ctx.fillText('SUMMER FESTIVAL', w / 2, 450);
    ctx.strokeStyle = 'rgba(255,246,226,.8)'; ctx.lineWidth = 4; ctx.strokeRect(12, 12, w - 24, h - 24);
  });
}

export function posterKakigoriTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d9f4ea'); g.addColorStop(1, '#9fd9c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 刨冰
    ctx.save();
    ctx.translate(w / 2, 250);
    ctx.fillStyle = '#fdfbf3';
    ctx.beginPath();
    ctx.moveTo(-96, 20); ctx.quadraticCurveTo(-88, -104, 0, -120); ctx.quadraticCurveTo(88, -104, 96, 20);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef7f86';
    ctx.beginPath(); ctx.moveTo(-70, -10); ctx.quadraticCurveTo(0, -96, 70, -10);
    ctx.quadraticCurveTo(0, 10, -70, -10); ctx.fill();
    ctx.fillStyle = '#f6e6c8';
    ctx.beginPath(); ctx.moveTo(-56, 22); ctx.lineTo(56, 22); ctx.lineTo(36, 104); ctx.lineTo(-36, 104); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1e6663'; ctx.textAlign = 'center';
    jp(ctx, 48, '800'); ctx.fillText('氷、はじめました。', w / 2, 394);
    ctx.fillStyle = '#ee7f68'; jp(ctx, 72, '800'); ctx.fillText('かき氷', w / 2, 464);
    ctx.fillStyle = '#2c5f5c'; en(ctx, 20, '700');
    ctx.fillText('SHIOKAZE KAKIGORI  /  380 YEN', w / 2, 496);
    ctx.strokeStyle = 'rgba(30,102,99,.55)'; ctx.lineWidth = 4; ctx.strokeRect(12, 12, w - 24, h - 24);
  });
}

export function posterHiyashiTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    paper(ctx, w, h, '#fff5df', '#fffdf5');
    ctx.fillStyle = '#ee7f68'; ctx.fillRect(0, 0, w, 76);
    ctx.fillStyle = '#fff8e9'; ctx.textAlign = 'center';
    jp(ctx, 34, '700'); ctx.fillText('夏の定番', w / 2, 52);
    // 碗
    ctx.save(); ctx.translate(w / 2, 268);
    ctx.fillStyle = '#f3ead2';
    ctx.beginPath(); ctx.ellipse(0, 22, 116, 64, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#fffdf7';
    ctx.beginPath(); ctx.ellipse(0, 8, 116, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c778';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(-80 + i * 20, 4 + Math.sin(i) * 6, 13, 7, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e57f69'; ctx.beginPath(); ctx.arc(-36, -16, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6f2d8'; ctx.beginPath(); ctx.arc(44, -14, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fb47a'; ctx.fillRect(-4, -30, 26, 8);
    ctx.restore();
    ctx.fillStyle = '#d95545'; jp(ctx, 54, '800'); ctx.fillText('冷やし中華', w / 2, 400);
    ctx.fillStyle = '#1e6663'; jp(ctx, 30, '700'); ctx.fillText('はじめました', w / 2, 444);
    ctx.fillStyle = '#876f5a'; en(ctx, 18, '600');
    ctx.fillText('HIYASHI CHUKA  /  498 YEN', w / 2, 486);
    grain(ctx, w, h, 160, 0.03);
  });
}

export function posterIceTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fd9ea'); g.addColorStop(1, '#dff5fa');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(w / 2, 230); ctx.rotate(-0.14);
    // 冰棒
    ctx.fillStyle = '#f6e6c8'; ctx.fillRect(-18, 70, 36, 110); ctx.fillStyle = '#d8b98c'; ctx.fillRect(-18, 160, 36, 20);
    ctx.fillStyle = '#ee8a7c';
    roundRect(ctx, -74, -100, 148, 184, 52); ctx.fill();
    ctx.fillStyle = '#ffd8b5'; ctx.beginPath(); ctx.arc(-28, -44, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(26, 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1e6663'; ctx.textAlign = 'center';
    jp(ctx, 82, '800'); ctx.fillText('アイス', w / 2, 408);
    ctx.fillStyle = '#ee7f68'; jp(ctx, 30, '800'); ctx.fillText('全品 10% OFF', w / 2, 456);
    ctx.fillStyle = '#3d6f76'; en(ctx, 18, '600');
    ctx.fillText('COLD TREATS  /  SUMMER ONLY', w / 2, 492);
  });
}

export function posterBeachTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fd7e2'); g.addColorStop(0.62, '#ffe0b2'); g.addColorStop(1, '#f2cf9c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe6a8'; ctx.beginPath(); ctx.arc(292, 92, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; cloud(ctx, 88, 104, 30); cloud(ctx, 184, 68, 22);
    // 伞
    ctx.save(); ctx.translate(180, 300);
    ctx.fillStyle = '#f6ead2'; ctx.fillRect(-4, -80, 8, 190);
    ctx.fillStyle = '#ee8a7c';
    ctx.beginPath(); ctx.moveTo(-110, -56); ctx.quadraticCurveTo(0, -190, 110, -56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6e2';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(0, -64); ctx.quadraticCurveTo(0, -64, i * 34 - 12, -56); ctx.lineTo(i * 34 + 12, -56); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#1e6663'; ctx.textAlign = 'center';
    jp(ctx, 74, '800'); ctx.fillText('海開き', w / 2, 432);
    ctx.fillStyle = '#2f6f9e'; jp(ctx, 24, '700'); ctx.fillText('7.1 OPEN  /  温水浴場', w / 2, 470);
    ctx.fillStyle = 'rgba(30,102,99,.7)'; en(ctx, 17, '600');
    ctx.fillText('NAGISA BEACH', w / 2, 498);
  });
}

export function posterNoticeTexture() {
  return canvasTexture(384, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f6f0df'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d8cbb0'; ctx.fillRect(0, 0, w, 64);
    ctx.fillStyle = '#5b4f3d'; ctx.textAlign = 'center';
    jp(ctx, 30, '700'); ctx.fillText('地域のお知らせ', w / 2, 44);
    ctx.textAlign = 'left'; ctx.fillStyle = '#4a4032';
    jp(ctx, 24, '600');
    ctx.fillText('・海浜清掃  8/6 (土) 7:00', 26, 118);
    ctx.fillText('・花火大会  8/20 (土)', 26, 162);
    ctx.fillText('・防災訓練  9/4 (日)', 26, 206);
    ctx.strokeStyle = '#c7b795'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(26, 238); ctx.lineTo(w - 26, 238); ctx.stroke();
    ctx.fillStyle = '#7d6c53'; jp(ctx, 20, '600');
    ctx.fillText('ナギサ町内会', 26, 276);
    ctx.fillText('海浜公園管理事務所', 26, 310);
    ctx.fillStyle = '#e8deca';
    for (let i = 0; i < 4; i++) ctx.fillRect(26 + i * 84, 354, 68, 92);
    ctx.fillStyle = '#b8a888';
    for (let i = 0; i < 4; i++) ctx.fillRect(30 + i * 84, 360, 60, 80);
    ctx.fillStyle = '#f6f0df'; ctx.fillRect(26, 470, 332, 24);
    ctx.fillStyle = '#7d6c53'; en(ctx, 15, '600');
    ctx.fillText('NAGISA TOWN NOTICE BOARD', 30, 487);
  });
}

// ---------- 杂志封面 ----------
export function magazineTextures() {
  const titles = [
    ['海辺暮らし', '#9fd7e2', '#1e6663'],
    ['夏色', '#ffd0a2', '#c65b44'],
    ['サーフ', '#bfe5e8', '#2f6f9e'],
    ['まち歩き', '#f2e2c4', '#5b4f3d'],
    ['夜の灯', '#3d4a6b', '#ffe3ad'],
    ['星と海', '#2c3550', '#b8e3f0'],
    ['氷の本', '#dff5fa', '#2f6f9e'],
    ['電車旅', '#e8ddc4', '#7a5a44'],
  ];
  return titles.map(([t, bg, fg], i) => canvasTexture(192, 256, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // 抽象封面图
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.72);
    g.addColorStop(0, fg + '33'); g.addColorStop(1, fg + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (i === 0) { ctx.fillStyle = fg + '55'; ctx.fillRect(0, 150, w, 46); ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 178); ctx.bezierCurveTo(48, 164, 96, 192, 192, 174); ctx.stroke(); }
    else if (i === 1) { ctx.fillStyle = '#ff8f70'; ctx.beginPath(); ctx.arc(96, 140, 46, 0, Math.PI * 2); ctx.fill(); }
    else if (i === 2) { ctx.fillStyle = fg + '66'; ctx.beginPath(); ctx.moveTo(48, 180); ctx.quadraticCurveTo(96, 40, 152, 180); ctx.closePath(); ctx.fill(); }
    else if (i === 3) { ctx.fillStyle = fg + '55'; for (let k = 0; k < 4; k++) ctx.fillRect(20 + k * 42, 110 + (k % 2) * 26, 30, 86); }
    else if (i === 4) { ctx.fillStyle = '#ffdf9e'; ctx.beginPath(); ctx.arc(96, 112, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2c3550'; ctx.fillRect(0, 150, w, 52); }
    else if (i === 5) { for (let k = 0; k < 14; k++) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 + (k % 3) * 0.2; ctx.fillRect(12 + k * 12, 60 + (k * 37) % 90, 2, 2); } ctx.globalAlpha = 1; }
    else if (i === 6) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(60, 70); ctx.lineTo(132, 70); ctx.lineTo(132, 190); ctx.lineTo(60, 190); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ee8a7c'; ctx.fillRect(64, 74, 64, 40); }
    else { ctx.fillStyle = fg + '66'; ctx.fillRect(16, 170, 160, 8); ctx.fillRect(16, 188, 120, 4); }
    ctx.restore();
    ctx.fillStyle = fg; ctx.textAlign = 'left';
    jp(ctx, 26, '800'); ctx.fillText(t, 14, 42);
    ctx.fillStyle = fg + 'cc'; en(ctx, 9, '700');
    ctx.fillText('NAGISA LIFE  /  2026', 14, 62);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = fg; en(ctx, 9, '600'); ctx.fillText('SUMMER ISSUE', 14, h - 8);
  }));
}

// ---------- 垃圾桶标签 ----------
export function trashLabelTexture(kind) {
  const map = {
    burn: ['もえる', '燃えるごみ', '#e8896f', '#7a3a2c'],
    plastic: ['プラ', 'プラスチック', '#7fb9d8', '#24546e'],
    bottle: ['かん・びん', 'リサイクル', '#7fc7a8', '#245c4e'],
  };
  const [big, small, bg, fg] = map[kind];
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg; ctx.textAlign = 'center';
    jp(ctx, 40, '800'); ctx.fillText(big, w / 2, 62);
    ctx.font = '600 22px "Hiragino Sans", sans-serif';
    ctx.fillText(small, w / 2, 100);
    ctx.strokeStyle = bg; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

// ---------- 店内吊牌 ----------
export function aisleSignTexture(main, sub, icon = '') {
  return canvasTexture(512, 160, (ctx, w, h) => {
    paper(ctx, w, h, '#fff7e6', '#fffdf6');
    ctx.fillStyle = TEAL; ctx.fillRect(0, 0, 18, h); ctx.fillRect(w - 18, 0, 18, h);
    ctx.fillStyle = CORAL; ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = TEAL; ctx.textAlign = 'left';
    jp(ctx, 62, '800'); ctx.fillText(icon, 38, 104);
    const tx = icon ? 118 : 46;
    fitText(ctx, main, w - tx - 40, 58);
    ctx.fillText(main, tx, 78);
    ctx.fillStyle = 'rgba(30,102,99,.7)';
    en(ctx, 18, '700'); ctx.fillText(sub, tx, 118);
  });
}

// ---------- 玻璃门贴字（透明底） ----------
export function decalTexture(lines, color = '#ee7f68', size = 64) {
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    lines.forEach((line, i) => {
      jp(ctx, size - i * 12, '800');
      const y = h / 2 + (i - (lines.length - 1) / 2) * (size + 6);
      ctx.fillText(line, w / 2 + 2, y + 2);
    });
    ctx.fillStyle = color;
    lines.forEach((line, i) => {
      jp(ctx, size - i * 12, '800');
      const y = h / 2 + (i - (lines.length - 1) / 2) * (size + 6);
      ctx.fillText(line, w / 2, y);
    });
  });
}

// ---------- 地面纹理 ----------
export function tileTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ddd9cc'; ctx.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 216 + ((x * 7 + y * 13) % 6);
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 13})`;
      ctx.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(x * s + 6, y * s + 6, s - 12, 3);
    }
    grain(ctx, w, h, 600, 0.025);
  }, { repeat: [5, 3] });
}

export function asphaltTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#414a58'; ctx.fillRect(0, 0, w, h);
    const r = (function () { let a = 7; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    for (let i = 0; i < 3400; i++) {
      const x = r() * w, y = r() * h, s = 1 + r() * 2;
      const v = 55 + Math.floor(r() * 40);
      ctx.fillStyle = `rgba(${v},${v + 5},${v + 14},${0.25 + r() * 0.3})`;
      ctx.fillRect(x, y, s, s);
    }
    // 补丁与裂缝
    ctx.strokeStyle = 'rgba(28,34,44,.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 420); ctx.lineTo(150, 360); ctx.lineTo(200, 380); ctx.stroke();
    ctx.fillStyle = 'rgba(70,82,96,.5)'; ctx.fillRect(300, 90, 90, 60);
  }, { repeat: [4, 4] });
}

export function concreteTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#cfc9ba'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,112,98,.35)'; ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(w, i * 128); ctx.stroke(); }
    for (let i = 1; i < 2; i++) { ctx.beginPath(); ctx.moveTo(i * 256, 0); ctx.lineTo(i * 256, h); ctx.stroke(); }
    grain(ctx, w, h, 900, 0.035);
  }, { repeat: [4, 4] });
}

export function sandTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e6cfa9'; ctx.fillRect(0, 0, w, h);
    const r = (function () { let a = 99; return () => { a = (a * 48271) % 2147483647; return a / 2147483647; }; })();
    for (let i = 0; i < 4200; i++) {
      const x = r() * w, y = r() * h;
      const c = r();
      ctx.fillStyle = c > 0.6 ? 'rgba(255,246,222,.5)' : c > 0.3 ? 'rgba(190,160,120,.35)' : 'rgba(150,124,94,.25)';
      ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
    }
    // 细沙纹
    ctx.strokeStyle = 'rgba(190,160,120,.18)'; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 30 + i * 56);
      ctx.bezierCurveTo(130, 16 + i * 56, 320, 52 + i * 56, w, 32 + i * 56);
      ctx.stroke();
    }
  }, { repeat: [6, 3] });
}

export function woodTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a8774f'; ctx.fillRect(0, 0, w, h);
    const r = (function () { let a = 13; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    for (let i = 0; i < 5; i++) {
      const y = i * 102;
      ctx.fillStyle = i % 2 ? '#9b6c47' : '#b08057'; ctx.fillRect(0, y, w, 100);
      ctx.strokeStyle = 'rgba(70,45,28,.55)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      for (let k = 0; k < 8; k++) {
        ctx.strokeStyle = `rgba(80,50,30,${0.06 + r() * 0.1})`; ctx.lineWidth = 1 + r() * 2;
        ctx.beginPath(); ctx.moveTo(0, y + 12 + r() * 76);
        ctx.bezierCurveTo(150, y + 8 + r() * 80, 340, y + 8 + r() * 80, w, y + 12 + r() * 76);
        ctx.stroke();
      }
      // 钉眼
      ctx.fillStyle = 'rgba(50,34,22,.5)';
      ctx.beginPath(); ctx.arc(24, y + 50, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 24, y + 50, 3, 0, Math.PI * 2); ctx.fill();
    }
  }, { repeat: [3, 2] });
}

export function corkTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c9ad86'; ctx.fillRect(0, 0, w, h);
    const r = (function () { let a = 31; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(130,100,66,.35)' : 'rgba(240,220,190,.4)';
      ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
  }, { repeat: [2, 2] });
}

export function menuBoardTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2e3a3d'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#f6efd8'; ctx.textAlign = 'center';
    jp(ctx, 40, '700'); ctx.fillText('本日のおすすめ', w / 2, 74);
    const items = [['おにぎり 2個', '¥260'], ['からあげ弁当', '¥498'], ['冷やし中華', '¥498'], ['アイスコーヒー', '¥128']];
    ctx.textAlign = 'left';
    items.forEach((it, i) => {
      ctx.fillStyle = 'rgba(255,244,220,.15)'; ctx.fillRect(40, 110 + i * 92, w - 80, 74);
      ctx.fillStyle = '#f6efd8'; jp(ctx, 30, '600'); ctx.fillText(it[0], 60, 158 + i * 92);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffd39a'; en(ctx, 28, '700'); ctx.fillText(it[1], w - 60, 158 + i * 92);
      ctx.textAlign = 'left';
    });
  });
}

// 被风掀起一角的旧海报（给公告栏）
export function sunfadedPoster() {
  return canvasTexture(256, 384, (ctx, w, h) => {
    paper(ctx, w, h, '#f2e7cf', '#fbf6e9');
    ctx.fillStyle = '#7fa9b8'; ctx.fillRect(0, 0, w, 120);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(78, 66, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f6f9e'; ctx.textAlign = 'center';
    jp(ctx, 34, '800'); ctx.fillText('海浜清掃', w / 2, 178);
    ctx.fillStyle = '#5b4f3d'; jp(ctx, 22, '600');
    ctx.fillText('8月6日 朝7時', w / 2, 224);
    ctx.fillText('集合：海浜公園', w / 2, 258);
    ctx.strokeStyle = '#c7b795'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(30, 292 + i * 18); ctx.lineTo(w - 30, 292 + i * 18); ctx.stroke(); }
    ctx.fillStyle = 'rgba(160,140,110,.18)'; ctx.fillRect(0, 0, w, h);
  });
}
