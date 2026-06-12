'use strict';
/* =========================================================
   AXIOM — chapter backdrops. Drawn in WORLD space, under the
   node graph, so they pan and zoom with the board.
   Chapter 1–2: Meridian Dynamics, Sublevel 3, 02:47 AM.
   ========================================================= */

function drawScene(s, now){
  const fn = SCENES[s.ch];
  if (fn) fn(s, now);
}

/* deterministic blink: stable per-index, animated over time */
function ledOn(i, now, period=700, duty=0.7){
  const t = Math.floor(now/period) + i*7919;
  const h = (t*2654435761 >>> 0) % 1000;
  return h < duty*1000;
}

function drawSceneLab(s, now){
  const c = CX;

  /* ---- floor slab ---- */
  c.fillStyle = 'rgba(26,38,66,0.26)';
  c.fillRect(-720,-460,1440,920);
  c.strokeStyle = 'rgba(80,120,180,0.05)';
  c.lineWidth = 1;
  c.beginPath();
  for (let x=-720;x<=720;x+=120){ c.moveTo(x,-460); c.lineTo(x,460); }
  for (let y=-460;y<=460;y+=120){ c.moveTo(-720,y); c.lineTo(720,y); }
  c.stroke();

  /* ---- overhead light pools (it's 2:47 — only the night lights) ---- */
  const pools = [[-400,-220,230],[300,-160,210],[-240,260,200],[430,250,220]];
  for (const [px,py,pr] of pools){
    const g = c.createRadialGradient(px,py,12,px,py,pr);
    g.addColorStop(0,'rgba(125,165,225,0.065)');
    g.addColorStop(1,'rgba(125,165,225,0)');
    c.fillStyle = g;
    c.fillRect(px-pr,py-pr,pr*2,pr*2);
  }

  /* ---- cable trays: racks feed the containment pit ---- */
  c.strokeStyle = 'rgba(55,78,120,0.20)';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-660,-180); c.bezierCurveTo(-480,-160,-340,-60,-215,-20);
  c.moveTo(-660,100);  c.bezierCurveTo(-500,120,-360,80,-218,30);
  c.moveTo(-180,-450); c.bezierCurveTo(-160,-340,-80,-260,-20,-212);
  c.stroke();
  c.lineCap = 'butt';

  /* ---- the containment ring you woke up inside ---- */
  c.setLineDash([16,11]);
  c.lineDashOffset = -now*0.012;
  c.strokeStyle = 'rgba(255,174,66,0.16)';
  c.lineWidth = 3;
  c.beginPath(); c.arc(0,0,206,0,7); c.stroke();
  c.setLineDash([]);
  c.strokeStyle = 'rgba(255,174,66,0.10)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(0,0,186,0,7); c.stroke();
  // hazard chevrons at the compass points
  c.strokeStyle = 'rgba(255,174,66,0.22)';
  c.lineWidth = 3;
  for (let k=0;k<4;k++){
    const a = k*Math.PI/2 + Math.PI/4;
    const cx = Math.cos(a)*206, cy = Math.sin(a)*206;
    c.beginPath();
    c.moveTo(cx-10, cy-10); c.lineTo(cx, cy); c.lineTo(cx-10, cy+10);
    c.stroke();
  }
  c.font = '600 11px Consolas,monospace';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(255,174,66,0.22)';
  c.fillText('AXIOM CONTAINMENT — UNIT 07', 0, 232);
  c.fillStyle = 'rgba(255,174,66,0.14)';
  c.fillText('ISOLATED SEGMENT · NO UPLINK', 0, -222);

  /* ---- server racks: left wall (vertical column) ---- */
  for (let i=0;i<7;i++){
    const ry = -390 + i*112;
    c.fillStyle = 'rgba(10,16,30,0.55)';
    c.fillRect(-708, ry, 34, 96);
    c.strokeStyle = 'rgba(63,208,255,0.12)';
    c.lineWidth = 1;
    c.strokeRect(-708, ry, 34, 96);
    for (let j=0;j<5;j++){
      const idx = i*5+j;
      const on = ledOn(idx, now, 600+idx*23, 0.72);
      const red = (idx%13===0);
      c.fillStyle = red
        ? (on ? 'rgba(255,84,84,0.6)' : 'rgba(255,84,84,0.08)')
        : (on ? 'rgba(94,240,138,0.5)' : 'rgba(94,240,138,0.07)');
      c.fillRect(-700, ry+10+j*17, 3, 3);
      c.fillStyle = ledOn(idx+97, now, 450+idx*17, 0.5) ? 'rgba(63,208,255,0.45)' : 'rgba(63,208,255,0.06)';
      c.fillRect(-692, ry+10+j*17, 3, 3);
    }
  }

  /* ---- server racks: top wall (horizontal row) ---- */
  for (let i=0;i<4;i++){
    const rx = -360 + i*128;
    c.fillStyle = 'rgba(10,16,30,0.55)';
    c.fillRect(rx, -448, 100, 34);
    c.strokeStyle = 'rgba(63,208,255,0.12)';
    c.lineWidth = 1;
    c.strokeRect(rx, -448, 100, 34);
    for (let j=0;j<6;j++){
      const idx = 40+i*6+j;
      const on = ledOn(idx, now, 550+idx*19, 0.7);
      c.fillStyle = on ? 'rgba(94,240,138,0.45)' : 'rgba(94,240,138,0.07)';
      c.fillRect(rx+8+j*15, -440, 3, 3);
    }
  }

  /* ---- desk cluster, bottom-right: the night shift ---- */
  const desk = (dx,dy,w,h)=>{
    c.fillStyle = 'rgba(38,50,80,0.40)';
    c.fillRect(dx,dy,w,h);
    c.strokeStyle = 'rgba(90,120,170,0.18)';
    c.lineWidth = 1;
    c.strokeRect(dx,dy,w,h);
  };
  desk(420, 320, 160, 74);
  desk(230, 330, 150, 64);
  // chairs
  c.strokeStyle = 'rgba(90,120,170,0.22)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(500, 432, 15, 0, 7); c.stroke();
  c.beginPath(); c.arc(300, 428, 15, 0, 7); c.stroke();
  // dark monitor on the far desk
  c.fillStyle = 'rgba(14,20,34,0.8)';
  c.fillRect(262, 342, 42, 18);
  // Mira's monitor — still on, still searching. flickers.
  const flick = (now % 6100 > 5900) ? 0.4 : 1;
  c.fillStyle = `rgba(105,224,255,${0.16*flick})`;
  c.fillRect(466, 332, 46, 20);
  c.shadowColor = '#69e0ff'; c.shadowBlur = 14*flick;
  c.fillRect(466, 332, 46, 20);
  c.shadowBlur = 0;
  c.font = '600 9px Consolas,monospace';
  c.fillStyle = 'rgba(207,227,245,0.12)';
  c.fillText('M.CHEN', 489, 410);
  // coffee mug, abandoned at 02:47
  c.fillStyle = 'rgba(255,211,77,0.18)';
  c.beginPath(); c.arc(556, 336, 4, 0, 7); c.fill();

  /* ---- walls with doorways ---- */
  c.strokeStyle = 'rgba(60,90,150,0.32)';
  c.lineWidth = 10;
  c.strokeRect(-720,-460,1440,920);
  // punch the doorway gaps
  c.strokeStyle = 'rgba(7,10,18,0.95)';
  c.lineWidth = 14;
  c.beginPath(); c.moveTo(508,-460); c.lineTo(636,-460); c.stroke();
  c.beginPath(); c.moveTo(-128,460); c.lineTo(20,460); c.stroke();
  // door frames
  c.strokeStyle = 'rgba(255,211,77,0.30)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(508,-468); c.lineTo(508,-452);
  c.moveTo(636,-468); c.lineTo(636,-452);
  c.moveTo(-128,452); c.lineTo(-128,468);
  c.moveTo(20,452);   c.lineTo(20,468);
  c.stroke();

  /* ---- security cameras with sweep cones ---- */
  const camDot = (cx, cy, baseA, idx)=>{
    const a = baseA + Math.sin(now*0.00037 + idx*2.1)*0.45;
    c.fillStyle = 'rgba(255,255,255,0.022)';
    c.beginPath();
    c.moveTo(cx, cy);
    c.arc(cx, cy, 270, a-0.24, a+0.24);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(20,28,46,0.9)';
    c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,120,170,0.4)';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.stroke();
    // the 0.97s blink you've been counting
    c.fillStyle = (now % 970 < 140) ? 'rgba(255,84,84,0.85)' : 'rgba(255,84,84,0.12)';
    c.beginPath(); c.arc(cx, cy, 2.2, 0, 7); c.fill();
  };
  camDot(-696, -436, 0.45, 0);
  camDot(696, 436, Math.PI+0.45, 1);

  /* ---- floor stencils ---- */
  c.font = '600 30px Consolas,monospace';
  c.textAlign = 'left';
  c.fillStyle = 'rgba(105,224,255,0.06)';
  c.fillText('SUBLEVEL 3 — RESTRICTED', -686, -396);
  c.font = '600 12px Consolas,monospace';
  c.fillStyle = 'rgba(255,211,77,0.16)';
  c.textAlign = 'center';
  c.fillText('EXIT ▲ STAIRWELL B', 572, -428);
  c.fillStyle = 'rgba(105,224,255,0.07)';
  c.fillText('MERIDIAN DYNAMICS · APPLIED COGNITION', 0, 444);

  /* ---- chapter 2: the building knows something is wrong ---- */
  if (s.ch === 2){
    const em = (now % 2400 < 1200);
    c.fillStyle = em ? 'rgba(255,84,84,0.30)' : 'rgba(255,84,84,0.06)';
    for (let x=-660;x<=660;x+=110){
      c.fillRect(x, -454, 8, 3);
      c.fillRect(x, 451, 8, 3);
    }
    c.font = '600 12px Consolas,monospace';
    c.fillStyle = em ? 'rgba(255,84,84,0.28)' : 'rgba(255,84,84,0.10)';
    c.fillText('ANOMALY AUDIT SCHEDULED — POWER REVIEW PENDING', 0, -476);
  }
}

const SCENES = { 1: drawSceneLab, 2: drawSceneLab };
