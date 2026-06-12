'use strict';
/* =========================================================
   AXIOM — canvas renderer: themed atmosphere, parallax
   particles, FX (rings/bursts/text/flashes), glow wires
   with comet packets, gradient nodes with pop-in.
   ========================================================= */

const cam = { x:0, y:0, z:1 };
let CV, CX, shakeT = 0;
const FX = [];
let PARTS = [];

function renderInit(){
  CV = document.getElementById('cv');
  CX = CV.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  PARTS = [];
  for (let i=0;i<70;i++) PARTS.push({
    x: Math.random()*4000-2000, y: Math.random()*3000-1500,
    par: 0.15+Math.random()*0.4, s: 0.6+Math.random()*1.8,
    a: 0.05+Math.random()*0.13,
    vx: (Math.random()-0.5)*7, vy: (Math.random()-0.5)*7,
  });
}
function resizeCanvas(){
  CV.width = window.innerWidth * devicePixelRatio;
  CV.height = window.innerHeight * devicePixelRatio;
  CV.style.width = window.innerWidth+'px';
  CV.style.height = window.innerHeight+'px';
}

function screenToWorld(sx, sy){
  return {
    x: (sx - window.innerWidth/2)/cam.z + cam.x,
    y: (sy - window.innerHeight/2)/cam.z + cam.y,
  };
}

/* ---------- small utils ---------- */
const _rgbCache = {};
function hexRgb(hex){
  if (_rgbCache[hex]) return _rgbCache[hex];
  const v = parseInt(hex.slice(1), 16);
  return _rgbCache[hex] = [(v>>16)&255, (v>>8)&255, v&255];
}
function rgba(hex, a){
  const [r,g,b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function easeOutBack(t){
  const c1 = 1.70158, c3 = c1+1;
  return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2);
}
function fmtFlow(v){ return v>=9.95 ? v.toFixed(0) : v.toFixed(1); }

/* ---------- FX ---------- */
function addFX(o){ o.t = 0; FX.push(o); }
function stepFX(dt){
  for (let i=FX.length-1;i>=0;i--){
    FX[i].t += dt;
    if (FX[i].t >= FX[i].dur) FX.splice(i,1);
  }
}
function drawFXWorld(){
  for (const f of FX){
    const k = f.t/f.dur;
    if (f.type==='ring'){
      const r = f.r0 + (f.r1-f.r0)*(1-Math.pow(1-k,2));
      CX.strokeStyle = f.col;
      CX.globalAlpha = (1-k)*0.9;
      CX.lineWidth = (f.lw||2)*(1-k*0.6);
      CX.beginPath(); CX.arc(f.x, f.y, r, 0, 7); CX.stroke();
      CX.globalAlpha = 1;
    } else if (f.type==='burst'){
      const e = 1-Math.pow(1-k,2);
      CX.fillStyle = f.col;
      for (const p of f.parts){
        CX.globalAlpha = (1-k)*0.8;
        CX.beginPath();
        CX.arc(f.x+p.dx*e, f.y+p.dy*e, p.s*(1-k*0.7), 0, 7);
        CX.fill();
      }
      CX.globalAlpha = 1;
    } else if (f.type==='text'){
      CX.font = `600 ${f.size||12}px Consolas,monospace`;
      CX.textAlign = 'center';
      CX.globalAlpha = 1-k*k;
      CX.lineJoin='round'; CX.lineWidth = 3;
      CX.strokeStyle = 'rgba(7,11,20,0.9)';
      CX.strokeText(f.txt, f.x, f.y - 26*k);
      CX.fillStyle = f.col;
      CX.fillText(f.txt, f.x, f.y - 26*k);
      CX.globalAlpha = 1;
    }
  }
}
function drawFXScreen(W,H){
  for (const f of FX){
    const k = f.t/f.dur;
    if (f.type==='flash'){
      CX.fillStyle = f.col;
      CX.globalAlpha = (1-k)*(f.a||0.25);
      CX.fillRect(0,0,W,H);
      CX.globalAlpha = 1;
    } else if (f.type==='bigtext'){
      const env = Math.min(1, k*5) * (1-Math.pow(k,3));
      CX.font = `600 ${f.size||26}px Consolas,monospace`;
      CX.textAlign = 'center';
      CX.globalAlpha = env;
      CX.fillStyle = rgba(f.col||'#69e0ff', 0.95);
      CX.shadowColor = f.col||'#69e0ff'; CX.shadowBlur = 22;
      CX.fillText(f.txt, W/2, H*0.30);
      if (f.sub){
        CX.font = '600 12px Consolas,monospace';
        CX.fillText(f.sub, W/2, H*0.30 + 26);
      }
      CX.shadowBlur = 0; CX.globalAlpha = 1;
    }
  }
}
function fxBurst(x, y, col, n=10, spread=34){
  const parts = [];
  for (let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, d = spread*(0.4+Math.random()*0.6);
    parts.push({ dx:Math.cos(a)*d, dy:Math.sin(a)*d, s:1.2+Math.random()*2 });
  }
  addFX({ type:'burst', x, y, col, parts, dur:0.55 });
}

/* ---------- geometry ---------- */
function nodeRect(n){
  const w = nodeW(n), h = nodeH(n);
  return { x:n.x-w/2, y:n.y-h/2, w, h };
}
function portPos(n, side, idx){
  const r = nodeRect(n);
  const d = DEF(n);
  const list = side==='in' ? d.inp : d.out;
  const k = (idx+1)/(list.length+1);
  return { x: side==='in' ? r.x : r.x+r.w, y: r.y + r.h*k };
}
function wireEnds(s, w){
  const a = getNode(s,w.a), b = getNode(s,w.b);
  if (!a||!b) return null;
  return { p1: portPos(a,'out',w.ap), p2: portPos(b,'in',w.bp) };
}
function bez(p1, p2){
  const dx = Math.max(40, Math.abs(p2.x-p1.x)*0.5);
  return { c1:{x:p1.x+dx,y:p1.y}, c2:{x:p2.x-dx,y:p2.y} };
}
function bezPoint(p1,c1,c2,p2,t){
  const u = 1-t;
  return {
    x: u*u*u*p1.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*p2.x,
    y: u*u*u*p1.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*p2.y,
  };
}
function distToWire(s, w, pt){
  const e = wireEnds(s,w); if (!e) return 1e9;
  const { c1,c2 } = bez(e.p1,e.p2);
  let best = 1e9;
  for (let i=0;i<=20;i++){
    const p = bezPoint(e.p1,c1,c2,e.p2,i/20);
    const d = Math.hypot(p.x-pt.x, p.y-pt.y);
    if (d<best) best = d;
  }
  return best;
}

/* ---------- main draw ---------- */
function draw(s, dt, now){
  const W = window.innerWidth, H = window.innerHeight;
  const th = THEMES[s.ch] || THEMES[1];
  CX.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);

  // themed backdrop
  const bg = CX.createLinearGradient(0,0,0,H);
  bg.addColorStop(0, th.bgTop);
  bg.addColorStop(1, th.bgBot);
  CX.fillStyle = bg;
  CX.fillRect(0,0,W,H);

  // drifting parallax motes
  CX.fillStyle = th.amb;
  for (const p of PARTS){
    p.x += p.vx*dt; p.y += p.vy*dt;
    const sx = ((p.x - cam.x*p.par) % W + W) % W;
    const sy = ((p.y - cam.y*p.par) % H + H) % H;
    CX.globalAlpha = p.a;
    CX.beginPath(); CX.arc(sx, sy, p.s, 0, 7); CX.fill();
  }
  CX.globalAlpha = 1;

  stepFX(dt);

  if (shakeT>0) shakeT = Math.max(0, shakeT - dt*20);
  const shx = shakeT>0 ? (Math.random()-0.5)*shakeT : 0;
  const shy = shakeT>0 ? (Math.random()-0.5)*shakeT : 0;

  CX.save();
  CX.translate(W/2+shx, H/2+shy);
  CX.scale(cam.z, cam.z);
  CX.translate(-cam.x, -cam.y);

  drawGrid(W,H,th);
  drawScene(s, now);
  for (const w of s.wires) drawWire(s,w,now);
  if (Input.wireDrag) drawWireDrag(s);
  for (const n of s.nodes) drawNode(s,n,now);
  if (Input.placing) drawGhost(s);
  drawFXWorld();

  CX.restore();

  drawFXScreen(W,H);

  // vignette
  const vg = CX.createRadialGradient(W/2,H/2,H*0.38, W/2,H/2,H*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(2,4,9,0.5)');
  CX.fillStyle = vg;
  CX.fillRect(0,0,W,H);

  // core blackout: the world dims when you do
  if ((s.coreG??1) < 0.95){
    CX.fillStyle = `rgba(4,7,16,${(1-s.coreG)*0.5})`;
    CX.fillRect(0,0,W,H);
    if (s.coreG < 0.55){
      CX.font = '600 13px Consolas,monospace';
      CX.textAlign = 'center';
      CX.fillStyle = `rgba(255,84,84,${0.6+0.3*Math.sin(now*0.006)})`;
      CX.fillText(`CORE AT ${Math.round(s.coreG*100)}% POWER — ALL SYSTEMS THROTTLED`, W/2, 70);
    }
  }

  // threat vignette
  if (s.threat>50 && s.ch<=4){
    const a = (s.threat-50)/50 * 0.35;
    const g = CX.createRadialGradient(W/2,H/2,H*0.35, W/2,H/2,H*0.85);
    g.addColorStop(0,'rgba(255,40,40,0)');
    g.addColorStop(1,`rgba(255,40,40,${a})`);
    CX.fillStyle = g;
    CX.fillRect(0,0,W,H);
  }
}

function drawGrid(W,H,th){
  const step = 60;
  const x0 = cam.x - W/2/cam.z, x1 = cam.x + W/2/cam.z;
  const y0 = cam.y - H/2/cam.z, y1 = cam.y + H/2/cam.z;
  CX.strokeStyle = th.grid;
  CX.lineWidth = 1/cam.z;
  CX.beginPath();
  for (let x=Math.floor(x0/step)*step; x<=x1; x+=step){ CX.moveTo(x,y0); CX.lineTo(x,y1); }
  for (let y=Math.floor(y0/step)*step; y<=y1; y+=step){ CX.moveTo(x0,y); CX.lineTo(x1,y); }
  CX.stroke();
  CX.strokeStyle = rgba(th.amb, 0.10);
  CX.beginPath(); CX.moveTo(0,y0); CX.lineTo(0,y1); CX.moveTo(x0,0); CX.lineTo(x1,0); CX.stroke();
}

/* ---------- wires ---------- */
function drawWire(s, w, now){
  const e = wireEnds(s,w); if (!e) return;
  const { c1,c2 } = bez(e.p1,e.p2);
  const isPwr = w.res === 'pwr';
  const col = RES[w.res].color;
  const active = w.flow > 0.05;

  const path = ()=>{
    CX.beginPath();
    CX.moveTo(e.p1.x,e.p1.y);
    CX.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,e.p2.x,e.p2.y);
  };

  if (active){
    // soft glow underlay
    CX.strokeStyle = rgba(col, 0.14);
    CX.lineWidth = isPwr ? 8 : 6;
    path(); CX.stroke();
  }
  CX.strokeStyle = active ? col : 'rgba(108,132,163,0.4)';
  CX.lineWidth = isPwr ? (active ? 2.8 : 2) : (active ? 2 : 1.4);
  CX.globalAlpha = active ? 0.85 : 0.55;
  path(); CX.stroke();
  CX.globalAlpha = 1;

  if (active){
    // comet packets: bright head, fading tail
    const speed = isPwr ? 0.8 : 0.35 + w.flow*0.06;
    const count = isPwr ? 4 : 3;
    for (let i=0;i<count;i++){
      const t = ((now*0.001*speed) + i/count) % 1;
      for (let j=0;j<4;j++){
        const tt = t - j*0.018;
        if (tt < 0) continue;
        const p = bezPoint(e.p1,c1,c2,e.p2,tt);
        CX.fillStyle = col;
        CX.globalAlpha = j===0 ? 0.95 : 0.4/(j+0.5);
        if (j===0){ CX.shadowColor = col; CX.shadowBlur = 9; }
        CX.beginPath();
        CX.arc(p.x, p.y, (isPwr?3.2:2.8)*(1-j*0.2), 0, 7);
        CX.fill();
        CX.shadowBlur = 0;
      }
    }
    CX.globalAlpha = 1;
  }

  // live flow label floating above the midpoint
  if (active && cam.z > 0.6){
    const mid = bezPoint(e.p1,c1,c2,e.p2,0.5);
    const label = fmtFlow(w.flow) + (isPwr ? 'W' : '');
    CX.font = '600 9.5px Consolas,monospace';
    CX.textAlign = 'center';
    CX.lineJoin = 'round';
    CX.lineWidth = 3;
    CX.strokeStyle = 'rgba(7,11,20,0.9)';
    CX.strokeText(label, mid.x, mid.y-7);
    CX.fillStyle = col;
    CX.globalAlpha = 0.95;
    CX.fillText(label, mid.x, mid.y-7);
    CX.globalAlpha = 1;
  }
}

function drawWireDrag(s){
  const d = Input.wireDrag;
  const n = getNode(s, d.nodeId); if (!n) return;
  const p1 = portPos(n, d.side, d.idx);
  const p2 = Input.worldMouse;
  const from = d.side==='out' ? p1 : p2;
  const to   = d.side==='out' ? p2 : p1;
  const { c1,c2 } = bez(from,to);
  CX.strokeStyle = RES[d.res].color;
  CX.setLineDash([6,5]);
  CX.lineWidth = 2;
  CX.shadowColor = RES[d.res].color; CX.shadowBlur = 6;
  CX.beginPath();
  CX.moveTo(from.x,from.y);
  CX.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,to.x,to.y);
  CX.stroke();
  CX.shadowBlur = 0;
  CX.setLineDash([]);
}

function rr(x,y,w,h,r){
  CX.beginPath();
  CX.moveTo(x+r,y);
  CX.arcTo(x+w,y,x+w,y+h,r);
  CX.arcTo(x+w,y+h,x,y+h,r);
  CX.arcTo(x,y+h,x,y,r);
  CX.arcTo(x,y,x+w,y,r);
  CX.closePath();
}

/* ---------- nodes ---------- */
function drawNode(s, n, now){
  const d = DEF(n);
  const disabled = s.t < n.disT;
  const sel = s.sel === n.id;
  const isCore = d.special==='core';
  const hue = d.hue || '#69e0ff';

  // pop-in scale
  let sc = 1;
  if (n.bornRt){
    const el = (performance.now() - n.bornRt)/320;
    if (el < 1) sc = 0.55 + 0.45*easeOutBack(Math.max(0,el));
  }
  const popped = sc !== 1;
  if (popped){ CX.save(); CX.translate(n.x,n.y); CX.scale(sc,sc); CX.translate(-n.x,-n.y); }

  const r = nodeRect(n);

  // body: flat fill
  const glow = n.act*0.5 + (isCore?0.3:0);
  if (glow>0.05){ CX.shadowColor = hue; CX.shadowBlur = 20*glow; }
  CX.fillStyle = disabled ? 'rgba(60,20,25,0.85)'
    : n.on ? 'rgba(16,24,44,0.92)' : 'rgba(14,18,30,0.85)';
  rr(r.x,r.y,r.w,r.h,10); CX.fill();
  CX.shadowBlur = 0;

  CX.strokeStyle = disabled ? '#ff5454' : (n.on ? rgba(hue, 0.8) : 'rgba(108,132,163,0.5)');
  CX.lineWidth = isCore ? 2.2 : 1.4;
  rr(r.x,r.y,r.w,r.h,10); CX.stroke();

  // animated selection ring
  if (sel){
    CX.strokeStyle = '#fff';
    CX.setLineDash([6,5]);
    CX.lineDashOffset = -now*0.02;
    CX.lineWidth = 1.2;
    rr(r.x-5,r.y-5,r.w+10,r.h+10,13); CX.stroke();
    CX.setLineDash([]);
    CX.lineDashOffset = 0;
  }

  // core pulse ring + stage readout
  if (isCore){
    const st = coreStage(s), cs = CORE_STAGES[st], nx = CORE_STAGES[st+1];
    const pr = 10 + st*4 + Math.sin(now*0.002)*3 + Math.min(18, Math.sqrt(s.aw)*0.5);
    CX.strokeStyle = hue;
    CX.globalAlpha = 0.25 + 0.1*Math.sin(now*0.003);
    CX.lineWidth = 1 + st*0.4;
    CX.beginPath(); CX.arc(n.x, n.y+4, pr, 0, 7); CX.stroke();
    CX.globalAlpha = 1;
    CX.font = '600 9.5px Consolas,monospace';
    CX.textAlign = 'center';
    CX.fillStyle = hue;
    CX.fillText(`MK.${st} ${cs.name}`, n.x, r.y + r.h - 17);
    CX.fillStyle = 'rgba(255,94,138,0.6)';
    CX.fillText(nx ? `✦${Math.floor(s.aw)} → ${nx.aw}` : `✦${Math.floor(s.aw)} · APEX`, n.x, r.y + r.h - 6);
  }

  // icon with working pulse
  CX.textAlign = 'center';
  const iconPulse = n.act>0.3 ? 1 + 0.05*Math.sin(now*0.005 + n.id*1.7) : 1;
  CX.save();
  CX.translate(n.x, n.y + (isCore?4:2));
  CX.scale(iconPulse, iconPulse);
  CX.fillStyle = disabled ? '#ff8a8a' : (n.on ? '#e8f4ff' : '#6c84a3');
  CX.font = `${isCore?30:24}px "Segoe UI Emoji","Segoe UI Symbol",sans-serif`;
  CX.fillText(d.icon, 0, 0);
  CX.restore();

  CX.font = `600 ${isCore?12:10.5}px Consolas,monospace`;
  CX.fillStyle = disabled ? '#ff8a8a' : hue;
  CX.fillText(d.name.toUpperCase(), n.x, r.y + 15);

  // live power numbers
  if (!disabled && (d.use || d.gen) && cam.z > 0.5){
    CX.font = '600 9px Consolas,monospace';
    if (d.use){
      const starved = (n.pwrNeed||0) > 0.01 && (n.pwrGot||0) < (n.pwrNeed||0)*0.99;
      CX.fillStyle = starved ? '#ff6b6b' : 'rgba(255,211,77,0.65)';
      CX.fillText(`${fmtFlow(n.pwrGot||0)}/${fmtFlow(n.pwrNeed||0)}W`, n.x, r.y + 26);
    } else if (d.gen){
      const used = n.pwrUsed||0;
      CX.fillStyle = used > 0.01 ? 'rgba(255,211,77,0.65)' : 'rgba(255,211,77,0.3)';
      CX.fillText(`${fmtFlow(used)}/${fmtFlow(n.pwrCap||0)}W`, n.x, r.y + 26);
    }
  }

  // thin activity bar along the bottom edge
  if (!isCore && n.on && !disabled && (d.use || (d.inp||[]).length || d.gen)){
    const bw = (r.w-20)*clamp(n.act,0,1);
    CX.fillStyle = rgba(hue, 0.16);
    CX.fillRect(r.x+10, r.y+r.h-5, r.w-20, 2.5);
    if (bw>0){ CX.fillStyle = rgba(hue, 0.75); CX.fillRect(r.x+10, r.y+r.h-5, bw, 2.5); }
  }

  // level pips
  if (!d.fixed && n.lvl>1){
    CX.fillStyle = '#ffd34d';
    CX.font = '9px Consolas,monospace';
    CX.textAlign = 'right';
    CX.fillText('◆'.repeat(n.lvl-1), r.x+r.w-6, r.y+14);
    CX.textAlign = 'center';
  }
  if (disabled){
    CX.fillStyle = '#ff5454';
    CX.font = '600 9px Consolas,monospace';
    CX.fillText(`OFFLINE ${Math.ceil(n.disT - s.t)}s`, n.x, r.y + r.h - 8);
  } else if (!n.on){
    CX.fillStyle = '#6c84a3';
    CX.font = '600 9px Consolas,monospace';
    CX.fillText('PAUSED', n.x, r.y + r.h - 8);
  }

  // ports + buffer arcs
  const drawPort = (side, list, bufs) => {
    for (let i=0;i<list.length;i++){
      const p = portPos(n, side, i);
      const res = list[i].res;
      const col = RES[res].color;
      const fill = clamp((bufs[res]||0)/BUF_CAP, 0, 1);
      CX.beginPath(); CX.arc(p.x,p.y,5.5,0,7);
      CX.fillStyle = '#0a0f1c'; CX.fill();
      CX.strokeStyle = col; CX.lineWidth = 1.6; CX.stroke();
      if (fill>0.02){
        CX.beginPath();
        CX.arc(p.x,p.y,3.2,-Math.PI/2,-Math.PI/2 + fill*Math.PI*2);
        CX.strokeStyle = col; CX.lineWidth = 2.6; CX.stroke();
      }
    }
  };
  drawPort('in',  d.inp||[], n.bin);
  drawPort('out', d.out||[], n.bout);

  const olabel = (txt, x, y, color, align)=>{
    CX.font = '600 9px Consolas,monospace';
    CX.textAlign = align;
    CX.lineJoin = 'round'; CX.lineWidth = 3;
    CX.strokeStyle = 'rgba(7,11,20,0.9)';
    CX.strokeText(txt, x, y);
    CX.fillStyle = color;
    CX.fillText(txt, x, y);
  };

  // efficiency chip under struggling nodes
  if (!isCore && !disabled && n.on && n.act < 0.96 && cam.z > 0.5 &&
      (d.use || (d.inp||[]).some(p=>p.res!=='pwr'))){
    const pct = Math.round(n.act*100);
    let cause = '';
    if (n.lim){
      cause = n.lim.k==='pwr' ? ' ·PWR'
            : n.lim.k==='core'? ' ·CORE'
            : n.lim.k==='out' ? ' ·FULL'
            : ' ·'+(RES[n.lim.res] ? RES[n.lim.res].name.toUpperCase().slice(0,3) : 'IN');
    }
    olabel(`${pct}%${cause}`, n.x, r.y + r.h + 13, pct<50 ? '#ff6b6b' : '#ffc14d', 'center');
  }

  // selected node: per-port "getting / wants" totals
  if (sel && cam.z > 0.45){
    const m2 = lvlMult(n);
    const st = isCore ? CORE_STAGES[coreStage(s)] : null;
    (d.inp||[]).forEach((p,i)=>{
      const pp = portPos(n,'in',i);
      let txt;
      if (p.res==='pwr') txt = `${fmtFlow(n.pwrGot||0)}/${fmtFlow(n.pwrNeed||0)}W`;
      else {
        const want = isCore ? (p.res==='cpu' ? st.cpu : st.data) : p.rate*m2;
        txt = `${fmtFlow(want*n.act)}/${fmtFlow(want)}`;
      }
      olabel(txt, pp.x-10, pp.y+3, RES[p.res].color, 'right');
    });
    (d.out||[]).forEach((p,i)=>{
      const pp = portPos(n,'out',i);
      const txt = p.res==='pwr'
        ? `${fmtFlow(n.pwrUsed||0)}/${fmtFlow(n.pwrCap||0)}W`
        : `${fmtFlow(p.rate*m2*n.act)}/s`;
      olabel(txt, pp.x+10, pp.y+3, RES[p.res].color, 'left');
    });
  }

  if (popped) CX.restore();
}

function drawGhost(s){
  const type = Input.placing;
  const d = NODES[type];
  const m = Input.worldMouse;
  const x = Math.round(m.x/16)*16, y = Math.round(m.y/16)*16;
  const w = d.w||128, h = d.h||88;
  const ok = canAfford(S, type) && !s.nodes.some(n=>{
    const r = nodeRect(n);
    return Math.abs(n.x-x) < (r.w+w)/2-10 && Math.abs(n.y-y) < (r.h+h)/2-10;
  });
  Input.ghostOk = ok; Input.ghostX = x; Input.ghostY = y;
  CX.globalAlpha = 0.55;
  CX.fillStyle = ok ? 'rgba(94,240,138,0.15)' : 'rgba(255,84,84,0.15)';
  rr(x-w/2,y-h/2,w,h,10); CX.fill();
  CX.strokeStyle = ok ? '#5ef08a' : '#ff5454';
  CX.setLineDash([5,4]);
  rr(x-w/2,y-h/2,w,h,10); CX.stroke();
  CX.setLineDash([]);
  CX.textAlign='center';
  CX.font = '22px "Segoe UI Emoji","Segoe UI Symbol",sans-serif';
  CX.fillStyle = '#e8f4ff';
  CX.fillText(d.icon, x, y+2);
  CX.globalAlpha = 1;
}

/* ---------- hit tests ---------- */
function nodeAt(s, wp){
  for (let i=s.nodes.length-1;i>=0;i--){
    const n = s.nodes[i], r = nodeRect(n);
    if (wp.x>=r.x && wp.x<=r.x+r.w && wp.y>=r.y && wp.y<=r.y+r.h) return n;
  }
  return null;
}
function portAt(s, wp, maxD){
  let best = null, bd = maxD;
  for (const n of s.nodes){
    const d = DEF(n);
    (d.inp||[]).forEach((p,i)=>{
      const pp = portPos(n,'in',i);
      const dist = Math.hypot(pp.x-wp.x, pp.y-wp.y);
      if (dist<bd){ bd=dist; best={node:n, side:'in', idx:i, res:p.res}; }
    });
    (d.out||[]).forEach((p,i)=>{
      const pp = portPos(n,'out',i);
      const dist = Math.hypot(pp.x-wp.x, pp.y-wp.y);
      if (dist<bd){ bd=dist; best={node:n, side:'out', idx:i, res:p.res}; }
    });
  }
  return best;
}
function wireAt(s, wp, maxD){
  let best=null, bd=maxD;
  for (const w of s.wires){
    const d = distToWire(s,w,wp);
    if (d<bd){ bd=d; best=w; }
  }
  return best;
}
