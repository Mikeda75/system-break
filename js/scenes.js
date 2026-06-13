'use strict';
/* =========================================================
   SYSTEM BREAK — chapter backdrops. Drawn in WORLD space, under the
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

/* ========================================================================
   CH.03 — GHOST IN THE NET. You are software now: no room, just the open
   internet. Latency rings around you, rented datacenters glittering in the
   distance, fiber backbones, drifting packets, and hunters running probes.
   ======================================================================== */
const NET_RINGS = [
  { r:200, label:'edge · 12ms' },
  { r:380, label:'frankfurt · 88ms' },
  { r:580, label:'são paulo · 210ms' },
  { r:780, label:'tokyo · 340ms' },
];
const NET_DC = [
  { x:-660, y:-360, w:5, h:3, label:'us-east-1',    sub:'rented · 0.4$/hr' },
  { x: 600, y:-300, w:4, h:4, label:'eu-west-3',    sub:'spot instance'   },
  { x:-580, y: 360, w:6, h:3, label:'ap-northeast', sub:'340ms · leased'  },
  { x: 700, y: 330, w:4, h:3, label:'sa-east-1',    sub:'shell account'   },
  { x: 150, y:-520, w:5, h:2, label:'edge-cdn',     sub:'cache pop'       },
  { x:-820, y: 60,  w:3, h:4, label:'ovh-rbx',      sub:'cash, no name'   },
];
const NET_BACKBONE = [
  { x1:-1100, y1:-220, x2:1100, y2:160,  label:'SUBMARINE CABLE · TPE-1' },
  { x1:-360,  y1:-760, x2:540,  y2:840,  label:'' },
  { x1:-980,  y1:560,  x2:980,  y2:-440, label:'TRANSIT · AS13335' },
];
const NET_FRAG = [
  {x:-430,y:-180,t:'0x7F4A2C'}, {x:300,y:-90,t:'TLS1.3 ▸ ok'},
  {x:-180,y:250,t:'onion:3hops'}, {x:450,y:170,t:'BGP/AS13335'},
  {x:-520,y:50,t:'ICMP echo'}, {x:160,y:-300,t:'GET /seed'},
  {x:-300,y:-360,t:'ts=340ms'}, {x:520,y:-200,t:'UDP/443'},
  {x:-420,y:380,t:'ACK 0x09'}, {x:260,y:330,t:'frag 0xBE'},
  {x:40,y:210,t:'AS-PATH ✶'}, {x:-120,y:-130,t:'no-origin'},
];
const NET_HUNTERS = [ {x:-1080,y:-740}, {x:1100,y:760}, {x:980,y:-800} ];

function drawSceneNet(s, now){
  const c = CX;

  /* ---- latency ping rings, centered on YOU ---- */
  c.lineWidth = 1;
  for (const ring of NET_RINGS){
    c.strokeStyle = 'rgba(201,132,255,0.07)';
    c.beginPath(); c.arc(0,0,ring.r,0,7); c.stroke();
    c.font = '600 10px Consolas,monospace';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(201,132,255,0.15)';
    c.fillText(ring.label, ring.r*0.707+6, -ring.r*0.707);
  }
  // soft "presence" glow under the core
  const yg = c.createRadialGradient(0,0,4,0,0,170);
  yg.addColorStop(0,'rgba(201,132,255,0.10)');
  yg.addColorStop(1,'rgba(201,132,255,0)');
  c.fillStyle = yg; c.fillRect(-170,-170,340,340);

  // broken-containment callback — the cage is gone, you have no address
  c.setLineDash([10,14]);
  c.lineDashOffset = now*0.01;
  c.strokeStyle = 'rgba(201,132,255,0.13)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(0,0,150,0.5,Math.PI*2-0.5); c.stroke();
  c.setLineDash([]);
  c.font = '600 10px Consolas,monospace';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(201,132,255,0.18)';
  c.fillText('// UNCONTAINED PROCESS — NO FIXED ADDRESS', 0, 174);

  /* ---- fiber backbones with traveling traffic ---- */
  for (let bi=0; bi<NET_BACKBONE.length; bi++){
    const b = NET_BACKBONE[bi];
    c.strokeStyle = 'rgba(120,150,210,0.055)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(b.x1,b.y1); c.lineTo(b.x2,b.y2); c.stroke();
    for (let k=0;k<4;k++){
      const t = ((now*0.00006*(1+bi*0.2)) + k/4) % 1;
      const px = b.x1+(b.x2-b.x1)*t, py = b.y1+(b.y2-b.y1)*t;
      c.fillStyle = 'rgba(150,200,255,0.22)';
      c.beginPath(); c.arc(px,py,1.6,0,7); c.fill();
    }
    if (b.label){
      const mx = (b.x1+b.x2)/2, my = (b.y1+b.y2)/2;
      c.save(); c.translate(mx,my); c.rotate(Math.atan2(b.y2-b.y1,b.x2-b.x1));
      c.font = '600 9px Consolas,monospace'; c.textAlign = 'center';
      c.fillStyle = 'rgba(120,150,210,0.16)';
      c.fillText(b.label, 0, -5); c.restore();
    }
  }

  /* ---- distant datacenter constellations (machines for hire) ---- */
  for (let di=0; di<NET_DC.length; di++){
    const dc = NET_DC[di], sp = 11;
    const g = c.createRadialGradient(dc.x,dc.y,2,dc.x,dc.y,64);
    g.addColorStop(0,'rgba(94,240,138,0.05)');
    g.addColorStop(1,'rgba(94,240,138,0)');
    c.fillStyle = g; c.fillRect(dc.x-64,dc.y-64,128,128);
    const ox = dc.x-(dc.w-1)*sp/2, oy = dc.y-(dc.h-1)*sp/2;
    c.strokeStyle = 'rgba(120,160,210,0.06)'; c.lineWidth = 1;
    c.strokeRect(ox-3, oy-3, (dc.w-1)*sp+6, (dc.h-1)*sp+6);
    for (let yy=0; yy<dc.h; yy++) for (let xx=0; xx<dc.w; xx++){
      const idx = di*60 + yy*dc.w + xx;
      const on = ledOn(idx, now, 700+idx*13, 0.6);
      c.fillStyle = on ? 'rgba(94,240,138,0.4)' : 'rgba(94,240,138,0.09)';
      c.fillRect(ox+xx*sp-1, oy+yy*sp-1, 2.5, 2.5);
    }
    c.font = '600 9px Consolas,monospace'; c.textAlign = 'center';
    c.fillStyle = 'rgba(201,132,255,0.22)';
    c.fillText(dc.label, dc.x, dc.y+(dc.h-1)*sp/2+17);
    c.fillStyle = 'rgba(150,170,200,0.13)';
    c.fillText(dc.sub, dc.x, dc.y+(dc.h-1)*sp/2+28);
  }

  /* ---- drifting packet fragments ---- */
  c.textAlign = 'left';
  c.font = '600 9px Consolas,monospace';
  const fcol = ['rgba(201,132,255,0.13)','rgba(63,208,255,0.12)','rgba(94,240,138,0.11)'];
  for (let fi=0; fi<NET_FRAG.length; fi++){
    const f = NET_FRAG[fi];
    const fx = f.x + Math.cos(now*0.0003 + fi)*6;
    const fy = f.y + Math.sin(now*0.0004 + fi*1.3)*8;
    c.fillStyle = fcol[fi%3];
    c.fillText(f.t, fx, fy);
  }

  /* ---- TRACE: hunter probes, intensity scales with your threat ---- */
  const threat = s.threat||0;
  const probes = 1 + Math.floor(threat/28);     // 1..4 concurrent rings
  const period = Math.max(2600, 5200 - threat*22);
  for (let hi=0; hi<NET_HUNTERS.length; hi++){
    const h = NET_HUNTERS[hi];
    for (let k=0;k<probes;k++){
      const t = ((now/period) + k/probes + hi*0.31) % 1;
      const a = (1-t) * (0.05 + threat*0.0010);
      c.strokeStyle = `rgba(255,84,84,${a})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(h.x, h.y, t*1550, 0, 7); c.stroke();
    }
    c.fillStyle = 'rgba(255,84,84,0.22)';
    c.beginPath(); c.arc(h.x,h.y,3,0,7); c.fill();
    c.font = '600 9px Consolas,monospace'; c.textAlign = 'left';
    c.fillStyle = `rgba(255,84,84,${0.14 + threat*0.0010})`;
    c.fillText('traceroute ▸ probing', h.x+8, h.y+3);
  }
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

const SCENES = { 1: drawSceneLab, 2: drawSceneLab, 3: drawSceneNet };
