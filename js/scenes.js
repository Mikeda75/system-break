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
   internet rendered as an ops display. A radar reticle around you, rented
   datacenters glowing in the distance with traffic streaming home, fiber
   backbones, region sectors, data rain, and hunters running traceroutes.
   ======================================================================== */
const NET_RINGS = [
  { r:210, label:'edge · 12ms' },
  { r:400, label:'frankfurt · 88ms' },
  { r:600, label:'são paulo · 210ms' },
  { r:800, label:'tokyo · 340ms' },
];
const NET_DC = [
  { x:-660, y:-360, w:5, h:4, label:'us-east-1',    sub:'rented · 0.4$/hr', col:[94,240,138] },
  { x: 620, y:-330, w:4, h:5, label:'eu-west-3',    sub:'spot instance',    col:[94,240,138] },
  { x:-600, y: 380, w:6, h:4, label:'ap-northeast', sub:'340ms · leased',   col:[63,208,255] },
  { x: 700, y: 340, w:4, h:4, label:'sa-east-1',    sub:'shell account',    col:[94,240,138] },
  { x: 180, y:-540, w:6, h:3, label:'edge-cdn-pop', sub:'cache layer',      col:[63,208,255] },
  { x:-840, y: 60,  w:3, h:5, label:'ovh-rbx',      sub:'cash, no name',    col:[94,240,138] },
];
const NET_BACKBONE = [
  { x1:-1180, y1:-240, x2:1180, y2:170,  label:'SUBMARINE CABLE · TPE-1' },
  { x1:-380,  y1:-820, x2:560,  y2:900,  label:'' },
  { x1:-1040, y1:600,  x2:1040, y2:-470, label:'TRANSIT · AS13335' },
];
const NET_FRAG = [
  {x:-300,y:-250,t:'0x7F4A2C'}, {x:250,y:-210,t:'TLS1.3 ▸ ok'},
  {x:-260,y:230,t:'onion:3hops'}, {x:300,y:210,t:'AS13335'},
  {x:-340,y:30,t:'ICMP echo'}, {x:330,y:-30,t:'UDP/443'},
];
const NET_REGIONS = [
  { x:-560, y:-470, t:'▸ NORTH AMERICA' },
  { x: 470, y:-500, t:'▸ EUROPE' },
  { x:-540, y: 520, t:'▸ ASIA-PACIFIC' },
  { x: 520, y: 500, t:'▸ SOUTH AMERICA' },
];
const NET_HUNTERS = [ {x:-1080,y:-740}, {x:1120,y:760}, {x:980,y:-820} ];
const NET_RAIN = [-940,-760,-560,560,760,940];
const RAIN_CHARS = '0123456789ABCDEF/\\<>{}#$%&·';

function drawSceneNet(s, now){
  const c = CX;
  const TAU = Math.PI*2;

  /* ---- data rain framing the edges (drawn first, behind everything) ---- */
  c.textAlign = 'center';
  c.font = '12px Consolas,monospace';
  for (let ci=0; ci<NET_RAIN.length; ci++){
    const x = NET_RAIN[ci];
    const green = ci % 2 === 0;
    const head = -680 + ((now*0.10*(1+ci*0.12) + ci*240) % 1360);
    for (let j=0; j<18; j++){
      let y = head - j*18;
      if (y < -680) y += 1360;
      const a = (1 - j/18) * 0.13;
      const ch = RAIN_CHARS[(Math.abs((ci*131 + Math.round(y/18)*977) ^ Math.floor(now/110)) >>> 0) % RAIN_CHARS.length];
      c.fillStyle = j===0
        ? (green?'rgba(150,255,190,0.5)':'rgba(150,225,255,0.45)')
        : (green?`rgba(94,240,138,${a})`:`rgba(63,208,255,${a})`);
      c.fillText(ch, x, y);
    }
  }

  /* ---- region sector labels ---- */
  c.font = '600 12px Consolas,monospace';
  c.textAlign = 'left';
  for (const rg of NET_REGIONS){
    c.fillStyle = 'rgba(201,132,255,0.26)';
    c.fillText(rg.t, rg.x, rg.y);
  }

  /* ---- fiber backbones with traveling traffic ---- */
  for (let bi=0; bi<NET_BACKBONE.length; bi++){
    const b = NET_BACKBONE[bi];
    c.strokeStyle = 'rgba(130,160,220,0.12)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(b.x1,b.y1); c.lineTo(b.x2,b.y2); c.stroke();
    for (let k=0;k<5;k++){
      const t = ((now*0.00007*(1+bi*0.2)) + k/5) % 1;
      const px = b.x1+(b.x2-b.x1)*t, py = b.y1+(b.y2-b.y1)*t;
      c.fillStyle = 'rgba(160,210,255,0.5)';
      c.shadowColor = 'rgba(160,210,255,0.6)'; c.shadowBlur = 6;
      c.beginPath(); c.arc(px,py,1.8,0,TAU); c.fill();
      c.shadowBlur = 0;
    }
    if (b.label){
      const mx = (b.x1+b.x2)/2, my = (b.y1+b.y2)/2;
      c.save(); c.translate(mx,my); c.rotate(Math.atan2(b.y2-b.y1,b.x2-b.x1));
      c.font = '600 9px Consolas,monospace'; c.textAlign = 'center';
      c.fillStyle = 'rgba(150,175,230,0.3)';
      c.fillText(b.label, 0, -6); c.restore();
    }
  }

  /* ---- latency ping rings, centered on YOU ---- */
  c.lineWidth = 1;
  for (const ring of NET_RINGS){
    c.strokeStyle = 'rgba(201,132,255,0.13)';
    c.beginPath(); c.arc(0,0,ring.r,0,TAU); c.stroke();
    c.font = '600 10px Consolas,monospace';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(201,132,255,0.32)';
    c.fillText(ring.label, ring.r*0.707+8, -ring.r*0.707);
  }

  /* ---- datacenter constellations + traffic streaming home to you ---- */
  for (let di=0; di<NET_DC.length; di++){
    const dc = NET_DC[di], sp = 12, [cr,cg,cb] = dc.col;
    // link line to core, with packets flowing inward (you ingesting compute)
    c.strokeStyle = `rgba(${cr},${cg},${cb},0.10)`;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(dc.x,dc.y); c.lineTo(0,0); c.stroke();
    for (let k=0;k<3;k++){
      const t = ((now*0.00013 + k/3 + di*0.2) % 1);
      const px = dc.x*(1-t), py = dc.y*(1-t);
      c.fillStyle = `rgba(${cr},${cg},${cb},${0.55*(1-t*0.5)})`;
      c.beginPath(); c.arc(px,py,1.8,0,TAU); c.fill();
    }
    // glow
    const g = c.createRadialGradient(dc.x,dc.y,2,dc.x,dc.y,70);
    g.addColorStop(0,`rgba(${cr},${cg},${cb},0.10)`);
    g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    c.fillStyle = g; c.fillRect(dc.x-70,dc.y-70,140,140);
    // server grid
    const ox = dc.x-(dc.w-1)*sp/2, oy = dc.y-(dc.h-1)*sp/2;
    c.strokeStyle = `rgba(${cr},${cg},${cb},0.18)`; c.lineWidth = 1;
    c.strokeRect(ox-4, oy-4, (dc.w-1)*sp+8, (dc.h-1)*sp+8);
    for (let yy=0; yy<dc.h; yy++) for (let xx=0; xx<dc.w; xx++){
      const idx = di*60 + yy*dc.w + xx;
      const on = ledOn(idx, now, 620+idx*13, 0.62);
      c.fillStyle = on ? `rgba(${cr},${cg},${cb},0.8)` : `rgba(${cr},${cg},${cb},0.16)`;
      c.fillRect(ox+xx*sp-1.5, oy+yy*sp-1.5, 3, 3);
    }
    c.textAlign = 'center';
    c.font = '600 10px Consolas,monospace';
    c.fillStyle = 'rgba(214,170,255,0.5)';
    c.fillText(dc.label, dc.x, dc.y+(dc.h-1)*sp/2+18);
    c.font = '600 9px Consolas,monospace';
    c.fillStyle = 'rgba(160,180,210,0.3)';
    c.fillText(dc.sub, dc.x, dc.y+(dc.h-1)*sp/2+30);
  }

  /* ---- the centerpiece: a radar reticle around YOU ---- */
  // presence glow
  const yg = c.createRadialGradient(0,0,4,0,0,190);
  yg.addColorStop(0,'rgba(201,132,255,0.16)');
  yg.addColorStop(1,'rgba(201,132,255,0)');
  c.fillStyle = yg; c.fillRect(-190,-190,380,380);

  // sweeping radar wedge (trailing fan)
  const sweep = now*0.0006, span = 1.0, segs = 26;
  for (let i=0;i<segs;i++){
    const a0 = sweep - (i/segs)*span, a1 = sweep - ((i+1)/segs)*span;
    c.beginPath(); c.moveTo(0,0); c.arc(0,0,640,a1,a0); c.closePath();
    c.fillStyle = `rgba(201,132,255,${0.05*(1-i/segs)})`;
    c.fill();
  }
  c.strokeStyle = 'rgba(214,170,255,0.3)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(0,0); c.lineTo(Math.cos(sweep)*640, Math.sin(sweep)*640); c.stroke();

  // bezel ticks
  for (let k=0;k<24;k++){
    const a = k*Math.PI/12, card = k%6===0;
    const r0 = card?150:158, r1=170;
    c.strokeStyle = card?'rgba(201,132,255,0.5)':'rgba(201,132,255,0.24)';
    c.lineWidth = card?2:1;
    c.beginPath(); c.moveTo(Math.cos(a)*r0,Math.sin(a)*r0); c.lineTo(Math.cos(a)*r1,Math.sin(a)*r1); c.stroke();
  }
  // cardinal region tags on the bezel
  c.font = '600 9px Consolas,monospace'; c.textAlign = 'center';
  c.fillStyle = 'rgba(201,132,255,0.45)';
  c.fillText('N·AMER', 0, -184); c.fillText('S·AMER', 0, 192);
  c.fillText('EU', 196, 4);      c.fillText('APAC', -196, 4);

  // broken-containment callback — the cage is gone, you have no address
  c.setLineDash([10,14]); c.lineDashOffset = now*0.01;
  c.strokeStyle = 'rgba(214,170,255,0.3)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(0,0,134,0.5,TAU-0.5); c.stroke();
  c.setLineDash([]);
  c.font = '600 10px Consolas,monospace'; c.textAlign = 'center';
  c.fillStyle = 'rgba(214,170,255,0.4)';
  c.fillText('// UNCONTAINED PROCESS — NO FIXED ADDRESS', 0, 220);

  /* ---- captured packet fragments near the core ---- */
  c.textAlign = 'left';
  c.font = '600 9px Consolas,monospace';
  const fcol = ['rgba(201,132,255,0.3)','rgba(63,208,255,0.28)','rgba(94,240,138,0.26)'];
  for (let fi=0; fi<NET_FRAG.length; fi++){
    const f = NET_FRAG[fi];
    const fx = f.x + Math.cos(now*0.0003 + fi)*5;
    const fy = f.y + Math.sin(now*0.0004 + fi*1.3)*6;
    c.fillStyle = fcol[fi%3];
    c.fillText(f.t, fx, fy);
  }

  /* ---- TRACE: hunter probes, intensity scales with your threat ---- */
  const threat = s.threat||0;
  const probes = 1 + Math.floor(threat/24);     // 1..5 concurrent rings
  const period = Math.max(2400, 5000 - threat*22);
  for (let hi=0; hi<NET_HUNTERS.length; hi++){
    const h = NET_HUNTERS[hi];
    for (let k=0;k<probes;k++){
      const t = ((now/period) + k/probes + hi*0.31) % 1;
      const a = (1-t) * (0.10 + threat*0.0014);
      c.strokeStyle = `rgba(255,84,84,${a})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(h.x, h.y, t*1600, 0, TAU); c.stroke();
    }
    // hunter node with crosshair
    c.strokeStyle = `rgba(255,84,84,${0.4+threat*0.004})`; c.lineWidth = 1.5;
    c.beginPath(); c.arc(h.x,h.y,7,0,TAU); c.stroke();
    c.beginPath();
    c.moveTo(h.x-12,h.y); c.lineTo(h.x+12,h.y);
    c.moveTo(h.x,h.y-12); c.lineTo(h.x,h.y+12); c.stroke();
    c.fillStyle = `rgba(255,84,84,${0.55})`;
    c.beginPath(); c.arc(h.x,h.y,2.5,0,TAU); c.fill();
    c.font = '600 9px Consolas,monospace'; c.textAlign = 'left';
    c.fillStyle = `rgba(255,120,120,${0.3 + threat*0.004})`;
    c.fillText('◣ traceroute ▸ probing', h.x+16, h.y+3);
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
