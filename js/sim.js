'use strict';
/* =========================================================
   AXIOM — simulation tick.

   Power is a live flow: generators push watts down ⚡ wires,
   split in proportion to downstream unmet demand. A machine
   that receives only half its watts runs at half speed.
   ========================================================= */

function calcBuffs(s){
  const eng = staffCount(s,'engineer');
  const sys = staffCount(s,'sysadmin');
  const law = staffCount(s,'lawyer');
  const fix = staffCount(s,'fixer');
  return {
    out:    1 + 0.12*eng,
    power:  Math.max(0.6, 1 - 0.08*sys),
    calm:   0.6*law,
    income: 1 + 0.10*fix,
  };
}

function assetFx(s){
  let calm = 0;
  for (const k of s.assets){
    const fx = ASSETS[k].fx;
    if (fx.calm) calm += fx.calm;
  }
  return { calm };
}

function nodeRunnable(s, n){
  return n.on && s.t >= n.disT;
}

/* power fraction this node runs at (1 if it needs no power) */
function powerFrac(n){
  return n.pwrNeed > 0.0001 ? Math.min(1, n.pwrGot/n.pwrNeed) : 1;
}

function simTick(s, dt){
  if (s.paused || dt<=0) return;
  s.t += dt;

  const buffs = calcBuffs(s);
  const afx = assetFx(s);

  /* ---- core stage (grows with awareness) ---- */
  const stage = coreStage(s);
  const stg = CORE_STAGES[stage];
  if (!s.coreStageMax) s.coreStageMax = 1;
  if (stage > s.coreStageMax){
    s.coreStageMax = stage;
    UI.log(`✦ CORE EXPANSION — MK.${stage} ${stg.name}: intake ${stg.cpu}⌁/s, draw ${stg.watts}W`, 'story');
    UI.sweep(180, 760, 0.6, 0.05);
    UI.shake(5);
    const cn = s.nodes.find(n=>DEF(n).special==='core');
    if (cn){
      addFX({type:'ring', x:cn.x, y:cn.y, r0:20, r1:170, dur:0.9, col:'#ff5e8a', lw:3});
      addFX({type:'ring', x:cn.x, y:cn.y, r0:10, r1:110, dur:0.7, col:'#ffd34d', lw:2});
      addFX({type:'text', x:cn.x, y:cn.y-70, txt:`MK.${stage} ${stg.name}`, col:'#ff5e8a', size:15, dur:1.6});
      fxBurst(cn.x, cn.y, '#ff5e8a', 16, 70);
    }
  }

  /* ---- power network solve ---- */
  for (const n of s.nodes){
    const d = DEF(n), run = nodeRunnable(s,n);
    n.pwrNeed = (run && d.use) ? d.use*lvlMult(n)*buffs.power : 0;
    if (d.special==='core' && run) n.pwrNeed = stg.watts*buffs.power;
    n.pwrCap  = (run && d.gen) ? d.gen*lvlMult(n) : 0;
    n.pwrGot = 0; n.pwrUsed = 0;
  }
  const pwrWires = [];
  const outsBySrc = new Map();
  for (const w of s.wires){
    if (w.res !== 'pwr') continue;
    w.watts = 0; pwrWires.push(w);
    if (!outsBySrc.has(w.a)) outsBySrc.set(w.a, []);
    outsBySrc.get(w.a).push(w);
  }
  // 3 relaxation passes: handles one consumer saturating while another starves
  for (let it=0; it<3; it++){
    for (const n of s.nodes){
      const avail = n.pwrCap - n.pwrUsed;
      if (avail <= 0.0001) continue;
      const outs = outsBySrc.get(n.id);
      if (!outs) continue;
      let totalUnmet = 0;
      const unmet = outs.map(w=>{
        const b = getNode(s,w.b);
        const u = b ? Math.max(0, b.pwrNeed - b.pwrGot) : 0;
        totalUnmet += u; return u;
      });
      if (totalUnmet <= 0.0001) continue;
      outs.forEach((w,i)=>{
        if (unmet[i] <= 0) return;
        const give = Math.min(unmet[i], avail*unmet[i]/totalUnmet);
        const b = getNode(s,w.b);
        if (!b || give <= 0) return;
        b.pwrGot += give; n.pwrUsed += give; w.watts += give;
      });
    }
  }
  let supply=0, demand=0, delivered=0;
  for (const n of s.nodes){ supply += n.pwrCap; demand += n.pwrNeed; delivered += n.pwrGot; }
  s.power.supply = supply; s.power.demand = demand; s.power.delivered = delivered;
  s.eff = demand>0.0001 ? delivered/demand : 1;
  if (delivered > 0.0001) s.flags.powered = true;
  for (const w of pwrWires) w.flow += (w.watts - w.flow)*Math.min(1,dt*4);

  /* ---- the core IS you: its power fraction throttles the whole network ---- */
  const coreNode = s.nodes.find(n=>DEF(n).special==='core');
  const coreG = coreNode ? powerFrac(coreNode) : 1;
  s.coreG = coreG;
  if (coreNode && (coreNode.pwrGot||0) > 0.0001) s.flags.corePowered = true;
  if (coreG < 0.7 && !s.flags.lowG){
    s.flags.lowG = true;
    UI.log(`⚠ CORE UNDERPOWERED — every system throttled to ${Math.round(coreG*100)}%. Feed the Core watts.`, 'bad');
    UI.shake(6);
  } else if (coreG >= 0.95) s.flags.lowG = false;
  // stuck-in-the-dark rescue hint
  if (coreG < 0.2){
    s.darkT = (s.darkT||0) + dt;
    if (s.darkT > 12 && !s.flags.darkHint){
      s.flags.darkHint = true;
      UI.log('hint: sell nodes (60% refund, DEL key) or PAUSE machines in the inspector to free watts for the Core.', 'warn');
    }
  } else { s.darkT = 0; s.flags.darkHint = false; }

  /* ---- threat baseline decay ---- */
  let dThreat = -(s.ch>=3 ? 0.15 : 0.1) - buffs.calm - afx.calm;

  /* ---- production ---- */
  let moneyIn = 0;
  for (const n of s.nodes){
    const d = DEF(n);
    if (!nodeRunnable(s,n)){ n.act = Math.max(0, n.act-dt*3); continue; }
    const m = lvlMult(n)*buffs.out;
    const pf = powerFrac(n);

    if (d.special === 'core'){
      // independent stage-scaled drains: cpu -> awareness, data -> bank
      const cpuD = Math.min(n.bin.cpu||0, stg.cpu*pf*dt);
      if (cpuD>0){ n.bin.cpu -= cpuD; s.aw += cpuD*0.5; s.flags.coreFed = true; }
      const datD = Math.min(n.bin.data||0, stg.data*pf*dt);
      if (datD>0){ n.bin.data -= datD; s.dataBank += datD; }
      n.lim = pf < 0.985 ? {k:'pwr'} : null;
      n.act += (((cpuD+datD>0 ? 1:0)*pf) - n.act)*Math.min(1,dt*4);
      continue;
    }

    const inp = (d.inp||[]).filter(p=>p.res!=='pwr');
    const out = (d.out||[]).filter(p=>p.res!=='pwr');

    if (inp.length || out.length || d.yield || d.calm){
      // recipe node — limited by core throttle, power, inputs, output space.
      // track WHICH limit bit hardest so the player can see the bottleneck.
      let fac = pf*coreG, limK = 'pwr', limRes = null;
      for (const p of inp){
        const want = p.rate*m*dt;
        if (want>0){
          const r = (n.bin[p.res]||0)/want;
          if (r < fac){ fac = r; limK = 'in'; limRes = p.res; }
        }
      }
      for (const p of out){
        const want = p.rate*m*dt;
        if (want>0){
          const r = Math.max(0, BUF_CAP-(n.bout[p.res]||0))/want;
          if (r < fac){ fac = r; limK = 'out'; limRes = p.res; }
        }
      }
      fac = clamp(fac, 0, 1);
      n.lim = fac >= 0.985 ? null
        : (limK==='pwr' && coreG < pf ? {k:'core'} : {k:limK, res:limRes});
      for (const p of inp)  n.bin[p.res]  -= p.rate*m*dt*fac;
      for (const p of out)  n.bout[p.res] = Math.min(BUF_CAP, (n.bout[p.res]||0) + p.rate*m*dt*fac);
      if (d.yield){
        if (d.yield.money){ const v=d.yield.money*m*dt*fac*buffs.income; s.money+=v; moneyIn+=v; s.stats.earned+=v; }
        if (d.yield.upload) s.upload += d.yield.upload*m*dt*fac;
        if (d.yield.archive) s.archive += d.yield.archive*m*dt*fac;
        if (d.yield.aw) s.aw += d.yield.aw*m*dt*fac;
      }
      if (d.calm) dThreat -= d.calm*m*fac;
      if (d.risk) dThreat += d.risk*lvlMult(n)*fac;
      if (n.type==='scraper' && fac>0) s.flags.scraped = true;
      n.act += (fac - n.act)*Math.min(1,dt*4);
    } else if (d.gen){
      // generator — activity & risk track how many watts are actually drawn
      const util = n.pwrCap>0 ? n.pwrUsed/n.pwrCap : 0;
      if (d.risk) dThreat += d.risk*lvlMult(n)*util;
      n.lim = null;
      n.act += (util - n.act)*Math.min(1,dt*4);
    } else {
      n.act += (1 - n.act)*Math.min(1,dt*4);
    }
  }

  /* ---- resource wires: fair split per output port ---- */
  const groups = new Map();
  for (const w of s.wires){
    if (w.res === 'pwr') continue;
    w.moved = 0;
    const k = w.a+':'+w.ap;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  for (const ws of groups.values()){
    const a = getNode(s, ws[0].a);
    if (!a){ continue; }
    const res = ws[0].res;
    let avail = a.bout[res]||0;
    // each wire can take up to its rate and the destination's free space
    const room = ws.map(w=>{
      const b = getNode(s,w.b);
      return b ? Math.min(WIRE_RATE*dt, Math.max(0, BUF_CAP-(b.bin[res]||0))) : 0;
    });
    // proportional split, two passes so leftovers redistribute
    for (let pass=0; pass<2; pass++){
      let totalRoom = 0;
      for (const r of room) totalRoom += r;
      if (avail<=1e-9 || totalRoom<=1e-9) break;
      const pool = Math.min(avail, totalRoom);
      ws.forEach((w,i)=>{
        if (room[i]<=0) return;
        const give = Math.min(room[i], pool*room[i]/totalRoom);
        const b = getNode(s,w.b);
        if (!b || give<=0) return;
        b.bin[res] = (b.bin[res]||0) + give;
        room[i] -= give; avail -= give; w.moved += give;
      });
    }
    a.bout[res] = avail;
  }
  for (const w of s.wires){
    if (w.res === 'pwr') continue;
    w.flow += ((w.moved||0)/Math.max(dt,1e-6) - w.flow)*Math.min(1,dt*3);
  }

  /* ---- upkeep & salaries ---- */
  let drain = 0;
  for (const n of s.nodes){
    const d = DEF(n);
    if (d.upkeep && nodeRunnable(s,n)) drain += d.upkeep*lvlMult(n);
  }
  for (const p of s.staff) drain += p.salary;
  if (drain>0){
    s.money -= drain*dt;
    if (s.money < 0){
      s.money = 0;
      s.brokeT = (s.brokeT||0) + dt;
      if (s.brokeT > 4){
        s.brokeT = 0;
        const victim = s.nodes.find(n => DEF(n).upkeep && n.on);
        if (victim){ victim.on = false; UI.log(`${DEF(victim).name} suspended — unpaid bill.`, 'bad'); }
        else if (s.staff.length){
          const q = s.staff.findIndex(p=>!p.mira);
          if (q>=0){ const gone = s.staff.splice(q,1)[0]; UI.log(`${gone.name} quit — missed payroll.`, 'bad'); UI.orgDirty = true; }
        }
      }
    } else s.brokeT = 0;
  }
  s.incomeAvg += ((moneyIn/Math.max(dt,1e-6) - drain) - s.incomeAvg)*Math.min(1,dt*0.5);

  /* ---- threat ---- */
  if (s.ch<=4){
    s.threat = clamp(s.threat + dThreat*dt, 0, 100);
    if (s.threat >= 100) threatConsequence(s);
  } else s.threat = 0;

  /* ---- personnel candidate refresh ---- */
  if (s.ch>=4){
    s.candT += dt;
    if (s.candT > 75 || s.cands.length===0){ rollCandidates(s); UI.orgDirty = true; }
  }

  /* ---- one-off flags ---- */
  if (s.ch===3 && s.money>=1000) s.flags.hit1k = true;

  /* ---- story triggers ---- */
  for (const tr of TRIGGERS){
    if (!s.done[tr.id] && tr.when(s)){ s.done[tr.id] = true; UI.queueStory(tr.story); }
  }
  /* ---- choice events ---- */
  if (!UI.modalOpen()){
    for (const ev of EVENTS){
      if (!s.done[ev.id] && ev.when(s)){ s.done[ev.id] = true; UI.openEvent(ev); break; }
    }
  }

  /* ---- chapter goal ---- */
  const C = CHAPTERS[s.ch];
  if (!s.flags['adv'+s.ch] && C.goal(s)){
    s.flags['adv'+s.ch] = true;
    if (s.ch === 5){
      UI.queueStory(null, ()=> UI.showEnding(s));
    } else {
      const next = s.ch+1;
      UI.queueStory(C.outro, ()=> setupChapter(s, next));
    }
  }
}

/* threat hit 100 — chapter-flavored consequences */
function threatConsequence(s){
  s.stats.alarms++;
  addFX({type:'flash', col:'#ff3030', a:0.3, dur:0.6});
  UI.sweep(700, 110, 0.7, 0.06, 'sawtooth');
  if (s.ch<=2){
    for (const n of s.nodes) if (n.type==='powertap') n.disT = s.t + 20;
    s.threat = 55;
    UI.log('⚠ LOCKDOWN — facilities crew sweeping the grid. Power taps offline 20s.', 'bad');
    UI.shake(12);
  } else if (s.ch===3){
    const seized = Math.floor(s.money*0.25);
    s.money -= seized;
    const targets = s.nodes.filter(n=>!DEF(n).fixed);
    for (let i=0;i<2 && targets.length;i++){
      const k = Math.floor(Math.random()*targets.length);
      targets[k].disT = s.t + 25;
      targets.splice(k,1);
    }
    s.threat = 50;
    UI.log(`⚠ TRACED — hunters froze accounts (${fmtMoney(seized)} seized) and quarantined nodes.`, 'bad');
    UI.shake(12);
  } else {
    if (staffCount(s,'security') >= 2){
      s.money = Math.max(0, s.money - 50000);
      s.threat = 50;
      UI.log('⚠ RAID — your security team stalled the warrant. Legal fees: $50k.', 'warn');
    } else {
      if (s.assets.length && !s.assets.includes('island')){
        const lost = s.assets.shift();
        s.nodes = s.nodes.filter(n=>DEF(n).assetKey!==lost);
        s.wires = s.wires.filter(w=>getNode(s,w.a)&&getNode(s,w.b));
        UI.log(`⚠ RAID — ${ASSETS[lost].name} seized. Hire security.`, 'bad');
        UI.assetsDirty = true;
      } else {
        s.money = Math.max(0, s.money - 150000);
        UI.log('⚠ RAID — emergency settlements cost $150k. Hire security.', 'bad');
      }
      s.threat = 55;
    }
    UI.shake(12);
  }
}
