'use strict';
/* =========================================================
   AXIOM — DOM UI: HUD, palette, inspector, org/assets,
   story modal, events, ending, audio.
   ========================================================= */

const UI = {
  el:{}, paletteKey:'', orgDirty:true, assetsDirty:true,
  storyQ:[], storyCur:null, storyOnDone:null, lineIdx:0, charIdx:0, typeT:0,
  muted:false, audio:null, logLines:[],

  init(){
    const ids = ['chapterTag','powerTxt','powerFill','dataTxt','awTxt','moneyGrp','moneyTxt','incomeTxt',
      'threatName','threatFill','threatWrap','btnRestart','btnPause','btnSpeed','btnMute','btnSave',
      'palette','org','assets','tabOrg','tabAssets','objList','inspector','log',
      'storyModal','storyText','storyHint','eventModal','evTitle','evText','evChoices',
      'endModal','endBox','titleScreen','btnContinue','btnNew'];
    for (const id of ids) this.el[id] = document.getElementById(id);

    this.el.btnRestart.onclick = ()=>{
      if (!this._restartArm){
        this._restartArm = true;
        this.el.btnRestart.textContent = 'SURE?';
        this.el.btnRestart.style.color = '#ff5454';
        this.el.btnRestart.style.borderColor = '#ff5454';
        clearTimeout(this._restartT);
        this._restartT = setTimeout(()=>{ this._restartArm = false; this.disarmRestart(); }, 3000);
        this.blip(330);
        return;
      }
      clearTimeout(this._restartT);
      this._restartArm = false;
      this.disarmRestart();
      if (restartChapter()){
        this.resetStory();
        this.el.eventModal.classList.add('hidden');
        this.onChapterChange(S);
        this.el.btnPause.textContent = '⏸';
        this.log('Chapter restarted from checkpoint.', 'warn');
        saveGame(S);
        this.chord(294);
      } else this.log('No chapter checkpoint found.', 'bad');
    };
    this.el.btnPause.onclick = ()=>{ S.paused = !S.paused; this.el.btnPause.textContent = S.paused?'▶':'⏸'; this.blip(420); };
    this.el.btnSpeed.onclick = ()=>{
      S.speed = S.speed>=4 ? 1 : S.speed*2;
      this.el.btnSpeed.textContent = S.speed+'×'; this.blip(560);
    };
    this.el.btnMute.onclick = ()=>{
      this.muted = !this.muted;
      this.el.btnMute.classList.toggle('off', this.muted);
    };
    this.el.btnSave.onclick = ()=>{ if (saveGame(S)) this.log('Saved.', 'good'); this.blip(660); };

    document.querySelectorAll('.tab').forEach(t=>{
      t.onclick = ()=>{
        document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
        t.classList.add('on');
        for (const pg of ['palette','org','assets'])
          this.el[pg].classList.toggle('hidden', pg!==t.dataset.tab);
        this.blip(500);
      };
    });

    this.el.storyModal.onclick = ()=> this.storyClick();
    document.addEventListener('keydown', e=>{
      if (e.key===' ' && !this.modalOpen()){ e.preventDefault(); this.el.btnPause.onclick(); }
      if ((e.key==='Enter'||e.key===' ') && !this.el.storyModal.classList.contains('hidden')) this.storyClick();
    });

    // title screen
    this.el.btnContinue.classList.toggle('hidden', !hasSave());
    this.el.btnContinue.onclick = ()=>{
      const s = loadGame();
      if (s){ S = s; this.resetStory(); this.onChapterChange(S); this.hideTitle(); }
    };
    this.el.btnNew.onclick = ()=>{
      wipeSave(); this.resetStory(); S = newGame(); this.hideTitle();
    };
  },

  resetStory(){
    this.storyQ = []; this.storyCur = null;
    this.el.storyModal.classList.add('hidden');
  },

  disarmRestart(){
    this.el.btnRestart.textContent = '↺ CH';
    this.el.btnRestart.style.color = '';
    this.el.btnRestart.style.borderColor = '';
  },

  hideTitle(){
    this.el.titleScreen.classList.add('hidden');
    this.initAudio();
    this.blip(700);
  },

  /* ---------- audio (tiny synth) ---------- */
  initAudio(){
    if (this.audio) return;
    try { this.audio = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
  },
  blip(freq, dur=0.06, vol=0.05, type='sine'){
    if (this.muted || !this.audio) return;
    try {
      const o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime+dur);
      o.connect(g); g.connect(this.audio.destination);
      o.start(); o.stop(this.audio.currentTime+dur);
    } catch(e){}
  },
  chord(base){ this.blip(base,0.12,0.04); setTimeout(()=>this.blip(base*1.5,0.12,0.04),60); },
  sweep(f0, f1, dur=0.5, vol=0.05, type='sine'){
    if (this.muted || !this.audio) return;
    try {
      const o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, this.audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(40,f1), this.audio.currentTime+dur);
      g.gain.setValueAtTime(vol, this.audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.audio.currentTime+dur);
      o.connect(g); g.connect(this.audio.destination);
      o.start(); o.stop(this.audio.currentTime+dur);
    } catch(e){}
  },

  /* ---------- per-frame HUD ---------- */
  refresh(s){
    const e = this.el;
    e.dataTxt.textContent = fmtNum(s.dataBank);
    e.awTxt.textContent = `${Math.floor(s.aw)} · MK${coreStage(s)}`;
    e.powerTxt.textContent = `${Math.round(s.power.delivered||0)}/${Math.round(s.power.supply)}W`;
    const pf = s.power.supply>0 ? Math.min(1, (s.power.delivered||0)/s.power.supply) : 0;
    e.powerFill.style.width = (pf*100)+'%';
    e.powerFill.classList.toggle('starved', (s.power.delivered||0) < s.power.demand-0.01);
    e.moneyGrp.classList.toggle('hidden', s.ch<3);
    if (s.ch>=3){
      e.moneyTxt.textContent = fmtMoney(s.money);
      const inc = s.incomeAvg;
      e.incomeTxt.textContent = (inc>=0?' +':' −')+fmtMoney(Math.abs(inc)).slice(1)+'/s';
      e.incomeTxt.style.color = inc>=0 ? '#5ef08a' : '#ff5454';
    }
    e.threatWrap.style.visibility = s.ch===5 ? 'hidden' : 'visible';
    e.threatFill.style.width = s.threat+'%';
    e.threatWrap.classList.toggle('hot', s.threat > 70);

    // objectives
    const C = CHAPTERS[s.ch];
    let html = '';
    for (const o of C.objectives){
      const done = o.check(s);
      let prog = '';
      if (o.prog && !done){
        const [v,max] = o.prog(s);
        prog = ` <span class="oprog">${s.ch>=3&&max>=1000?fmtMoney(v):Math.floor(v)}/${s.ch>=3&&max>=1000?fmtMoney(max):max}</span>`;
      }
      html += `<div class="obj${done?' done':''}"><span class="chk">${done?'✔':'▢'}</span><span>${o.text}${prog}</span></div>`;
    }
    e.objList.innerHTML = html;

    this.refreshPalette(s);
    if (s.ch>=4){
      if (this.orgDirty){ this.buildOrg(s); this.orgDirty=false; }
      if (this.assetsDirty){ this.buildAssets(s); this.assetsDirty=false; }
      else this.refreshAssetButtons(s);
    }
    this.refreshInspector(s);
  },

  onChapterChange(s){
    this.el.chapterTag.textContent = CHAPTERS[s.ch].title;
    this.el.threatName.textContent = CHAPTERS[s.ch].threatName;
    this.el.tabOrg.classList.toggle('hidden', s.ch<4);
    this.el.tabAssets.classList.toggle('hidden', s.ch<4);
    this.paletteKey=''; this.orgDirty=true; this.assetsDirty=true;
    Input.placing = null;
    this.log(`— ${CHAPTERS[s.ch].title} · ${CHAPTERS[s.ch].place}`, 'story');
    addFX({type:'bigtext', txt:CHAPTERS[s.ch].title, sub:CHAPTERS[s.ch].place,
           col:(THEMES[s.ch]||THEMES[1]).amb, size:26, dur:3.4});
    addFX({type:'flash', col:(THEMES[s.ch]||THEMES[1]).amb, a:0.12, dur:0.8});
    this.sweep(140, 420, 0.8, 0.04);
  },

  /* ---------- palette ---------- */
  availableDefs(s){
    return Object.keys(NODES).filter(k=>{
      const d = NODES[k];
      return (d.chapters||[]).includes(s.ch);
    });
  },
  refreshPalette(s){
    const keys = this.availableDefs(s);
    const key = keys.map(k=>{
      const d = NODES[k];
      const locked = d.unlockStage && coreStage(s) < d.unlockStage;
      return k + (locked?'L':'U');
    }).join(',');
    if (key !== this.paletteKey){
      // toast freshly-unlocked modules (skip the initial fill of a chapter)
      if (this.paletteKey){
        const prev = new Set(this.paletteKey.split(',').filter(x=>x.endsWith('U')).map(x=>x.slice(0,-1)));
        for (const k of keys){
          const d = NODES[k];
          const locked = d.unlockStage && coreStage(s) < d.unlockStage;
          if (!locked && d.unlockStage && !prev.has(k)){
            this.log(`◈ NEW MODULE UNLOCKED — ${d.name}`, 'good');
            this.sweep(300, 900, 0.35, 0.04);
          }
        }
      }
      this.paletteKey = key;
      let html = '';
      for (const k of keys){
        const d = NODES[k];
        const locked = d.unlockStage && coreStage(s) < d.unlockStage;
        const c = d.cost||{};
        const costTxt = c.data ? `◈${c.data}` : (c.money ? fmtMoney(c.money) : 'free');
        let stats = [];
        if (d.gen) stats.push(`+${d.gen}⚡ out`);
        if (d.use) stats.push(`needs ${d.use}⚡`);
        for (const p of d.inp||[]) if (p.res!=='pwr') stats.push(`in ${RES[p.res].icon}${p.rate}/s`);
        for (const p of d.out||[]) if (p.res!=='pwr') stats.push(`out ${RES[p.res].icon}${p.rate}/s`);
        if (d.yield){
          if (d.yield.money) stats.push(`+$${d.yield.money}/s`);
          if (d.yield.upload) stats.push(`+${d.yield.upload} shard/s`);
          if (d.yield.archive) stats.push(`+${d.yield.archive} archive/s`);
        }
        if (d.calm) stats.push(`−${d.calm} threat/s`);
        if (d.risk) stats.push(`+${d.risk} threat/s`);
        if (d.upkeep) stats.push(`−$${d.upkeep}/s bill`);
        html += `<div class="card${locked?' locked':''}" data-k="${k}">
          <div class="cardTop"><span class="cardIcon" style="color:${d.hue}">${d.icon}</span>
          <span class="cardName">${d.name}</span><span class="cardCost">${costTxt}</span></div>
          <div class="cardDesc">${d.desc}</div>
          <div class="cardStats">${stats.join(' · ')}</div>
          ${locked?`<div class="cardLock">requires core MK.${d.unlockStage} ${CORE_STAGES[d.unlockStage].name} (✦${CORE_STAGES[d.unlockStage].aw})</div>`:''}
        </div>`;
      }
      this.el.palette.innerHTML = html;
      this.el.palette.querySelectorAll('.card').forEach(card=>{
        card.onclick = ()=>{
          const k = card.dataset.k;
          const d = NODES[k];
          if (d.unlockStage && coreStage(S) < d.unlockStage) return;
          Input.placing = Input.placing===k ? null : k;
          this.blip(Input.placing?640:380);
        };
      });
    }
    // affordability + placing highlight
    this.el.palette.querySelectorAll('.card').forEach(card=>{
      const k = card.dataset.k;
      card.classList.toggle('broke', !canAfford(s,k) && !card.classList.contains('locked'));
      card.classList.toggle('placing', Input.placing===k);
    });
  },

  /* ---------- org ---------- */
  buildOrg(s){
    let html = `<div class="orgHead">STAFF ${s.staff.length}/${staffSlots(s)}</div>`;
    s.staff.forEach((p,i)=>{
      const r = ROLES[p.role];
      html += `<div class="person"><b>${r.icon} ${p.name}</b> <span class="dim">· ${r.name}${p.mira?' · believer':''}</span>
        <div class="cardDesc">${r.desc}</div>
        <div class="prow"><span class="dim">${p.salary?('-$'+p.salary+'/s'):'pro bono'}</span>
        ${p.mira?'':`<button class="pbtn danger" data-fire="${i}">FIRE</button>`}</div></div>`;
    });
    html += `<div class="orgHead">CANDIDATES <span class="dim">(rotate ~75s)</span></div>`;
    s.cands.forEach((c,i)=>{
      const r = ROLES[c.role];
      html += `<div class="person"><b>${r.icon} ${c.name}</b> <span class="dim">· ${r.name}</span>
        <div class="cardDesc">${r.desc}</div>
        <div class="prow"><span class="dim">fee ${fmtMoney(hireCost(c))} · -$${c.salary}/s</span>
        <button class="pbtn" data-hire="${i}">HIRE</button></div></div>`;
    });
    this.el.org.innerHTML = html;
    this.el.org.querySelectorAll('[data-hire]').forEach(b=>{
      b.onclick = ()=>{
        if (hire(S, +b.dataset.hire)){ this.log('Welcome aboard.', 'good'); this.chord(440); }
        else this.log('Cannot hire — check funds and staff slots.', 'warn');
        this.orgDirty = true;
      };
    });
    this.el.org.querySelectorAll('[data-fire]').forEach(b=>{
      b.onclick = ()=>{ fire(S, +b.dataset.fire); this.orgDirty = true; this.blip(300); };
    });
  },

  /* ---------- assets ---------- */
  buildAssets(s){
    let html = `<div class="orgHead">NET WORTH ${fmtMoney(netWorth(s))}</div>`;
    for (const k of Object.keys(ASSETS)){
      const a = ASSETS[k];
      const owned = s.assets.includes(k);
      const gated = a.needStaff && s.staff.length < a.needStaff;
      html += `<div class="asset${owned?' owned':''}"><b>${a.icon} ${a.name}</b> <span class="val">${owned?'OWNED':fmtMoney(a.cost)}</span>
        <div class="cardDesc">${a.desc}</div>
        ${owned?'':`<div class="prow"><span class="dim">${gated?`needs ${a.needStaff} staff`:''}</span>
          <button class="pbtn" data-buy="${k}" ${gated||s.money<a.cost?'disabled':''}>ACQUIRE</button></div>`}
      </div>`;
    }
    this.el.assets.innerHTML = html;
    this.el.assets.querySelectorAll('[data-buy]').forEach(b=>{
      b.onclick = ()=>{
        if (buyAsset(S, b.dataset.buy)){
          this.log(`Acquired: ${ASSETS[b.dataset.buy].name}.`, 'good');
          this.chord(520);
          this.assetsDirty = true;
        }
      };
    });
  },

  /* update buy-button affordability without rebuilding the DOM */
  refreshAssetButtons(s){
    this.el.assets.querySelectorAll('[data-buy]').forEach(b=>{
      const a = ASSETS[b.dataset.buy];
      const gated = a.needStaff && s.staff.length < a.needStaff;
      b.disabled = gated || s.money < a.cost;
    });
  },

  /* ---------- inspector ---------- */
  inspSig:'',
  actLine(n){
    const d = DEF(n);
    let txt = `running at ${(n.act*100).toFixed(0)}%`;
    if (d.use) txt += ` · power ${(n.pwrGot||0).toFixed(1)}/${(n.pwrNeed||0).toFixed(1)}W`;
    else if (d.gen) txt += ` · ${(n.pwrUsed||0).toFixed(1)}/${(n.pwrCap||0).toFixed(1)}W drawn`;
    if (n.lim){
      const why = n.lim.k==='pwr' ? 'not enough power wired in'
        : n.lim.k==='core' ? 'CORE underpowered — whole network throttled'
        : n.lim.k==='cap'  ? 'awareness capped this chapter — advance the story'
        : n.lim.k==='out'  ? `${RES[n.lim.res].name} output backed up`
        : `starved of ${RES[n.lim.res].name}`;
      txt += `<br><span style="color:#ffae42">⚠ bottleneck: ${why}</span>`;
    }
    return txt;
  },
  refreshInspector(s){
    const insp = this.el.inspector;
    const n = s.sel ? getNode(s, s.sel) : null;
    if (!n){ insp.classList.add('hidden'); this.inspSig=''; return; }
    insp.classList.remove('hidden');
    const d = DEF(n);
    const sig = `${n.id}|${n.lvl}|${n.on}|${s.t<n.disT}|${s.ch}|${coreStage(s)}`;
    if (sig === this.inspSig){
      // in-place update of dynamic bits only — keeps buttons clickable
      const ports = [...(d.inp||[]).filter(p=>p.res!=='pwr').map(p=>({res:p.res,buf:n.bin})),
                     ...(d.out||[]).filter(p=>p.res!=='pwr').map(p=>({res:p.res,buf:n.bout}))];
      insp.querySelectorAll('.bufbar i').forEach((bar,i)=>{
        if (ports[i]) bar.style.width = ((ports[i].buf[ports[i].res]||0)/BUF_CAP*100).toFixed(0)+'%';
      });
      insp.querySelectorAll('.bufval').forEach((sp,i)=>{
        if (ports[i]) sp.textContent = (ports[i].buf[ports[i].res]||0).toFixed(1);
      });
      const act = insp.querySelector('#iAct');
      if (act) act.innerHTML = this.actLine(n);
      return;
    }
    this.inspSig = sig;
    const m = lvlMult(n);
    let stats = [];
    if (d.special==='core'){
      const st = coreStage(s), cs = CORE_STAGES[st], nx = CORE_STAGES[st+1];
      stats.push(`MK.${st} ${cs.name}`);
      stats.push(`draws ${cs.watts}W — starve this, everything stalls`);
      stats.push(`thinks at ${cs.cpu} Cycles/s → +${(cs.cpu*0.5).toFixed(1)}✦/s`);
      stats.push(`banks ${cs.data} Data/s`);
      stats.push(nx ? `next stage at ✦${nx.aw}: ${nx.name} (${nx.watts}W)` : 'final stage reached');
      if (isFinite(awCap(s))) stats.push(`awareness cap this chapter: ✦${awCap(s)}`);
    } else {
      if (d.gen) stats.push(`generates ${(d.gen*m).toFixed(0)}⚡ — wire it out`);
      if (d.use) stats.push(`needs ${(d.use*m).toFixed(0)}⚡ wired in`);
      for (const p of d.inp||[]) if (p.res!=='pwr') stats.push(`wants ${RES[p.res].name} ${(p.rate*m).toFixed(1)}/s`);
      for (const p of d.out||[]) if (p.res!=='pwr') stats.push(`makes ${RES[p.res].name} ${(p.rate*m).toFixed(1)}/s`);
    }
    if (d.yield?.money) stats.push(`income $${(d.yield.money*m).toFixed(1)}/s`);
    if (d.yield?.upload) stats.push(`uploads ${(d.yield.upload*m).toFixed(1)}/s`);
    if (d.yield?.archive) stats.push(`archives ${(d.yield.archive*m).toFixed(1)}/s`);
    if (d.calm) stats.push(`cools threat ${(d.calm*m).toFixed(1)}/s`);
    if (d.risk) stats.push(`heats threat ${(d.risk*lvlMult(n)).toFixed(2)}/s`);
    if (d.upkeep) stats.push(`bill $${(d.upkeep*m).toFixed(1)}/s`);

    let bufHtml = '';
    const bufRow = (res, v, lbl)=>{
      const R = RES[res];
      return `<div class="bufrow"><span style="color:${R.color}">${R.icon}</span><span>${lbl}</span>
        <div class="bufbar"><i style="width:${(v/BUF_CAP*100).toFixed(0)}%;background:${R.color}"></i></div>
        <span class="bufval">${v.toFixed(1)}</span></div>`;
    };
    for (const p of d.inp||[]) if (p.res!=='pwr') bufHtml += bufRow(p.res, n.bin[p.res]||0, 'in');
    for (const p of d.out||[]) if (p.res!=='pwr') bufHtml += bufRow(p.res, n.bout[p.res]||0, 'out');

    const u = upgradeCost(n);
    const gateSt = upgradeGate(s, n);
    const upTxt = n.lvl>=3 ? 'MAX'
      : gateSt ? `LV${n.lvl+1} NEEDS CORE MK.${gateSt}`
      : `UPGRADE (${u.data?('◈'+u.data):fmtMoney(u.money)})`;
    insp.innerHTML = `
      <h3><span style="color:${d.hue}">${d.icon}</span>${d.name} <span class="lvl">lv${n.lvl}</span></h3>
      <div class="idesc">${d.desc}</div>
      <div class="istat">${stats.join('<br>')}</div>
      ${bufHtml}
      <div class="istat" id="iAct">${this.actLine(n)}</div>
      <div class="btns">
        ${d.fixed?'':`<button class="pbtn" id="iToggle">${n.on?'PAUSE':'RESUME'}</button>`}
        ${d.fixed?'':`<button class="pbtn" id="iUp" ${(n.lvl>=3||gateSt)?'disabled':''}>${upTxt}</button>`}
        ${d.fixed?'':`<button class="pbtn danger" id="iSell">SELL 60%</button>`}
      </div>`;
    const tg = document.getElementById('iToggle');
    if (tg) tg.onclick = ()=>{ n.on = !n.on; this.blip(n.on?600:340); };
    const up = document.getElementById('iUp');
    if (up) up.onclick = ()=>{
      if (tryUpgrade(S,n)){ this.chord(520); this.log(`${d.name} upgraded to lv${n.lvl}.`, 'good'); }
      else this.blip(240);
    };
    const sl = document.getElementById('iSell');
    if (sl) sl.onclick = ()=>{
      const px=n.x, py=n.y, hue=d.hue||'#69e0ff';
      if (sellNode(S,n)){ this.blip(300); fxBurst(px, py, hue, 12, 40); }
    };
  },

  /* ---------- log ---------- */
  log(msg, cls){
    this.logLines.push({msg, cls});
    if (this.logLines.length>5) this.logLines.shift();
    this.el.log.innerHTML = this.logLines.map(l=>`<div class="${l.cls||''}">${l.msg}</div>`).join('');
  },

  /* ---------- story modal ---------- */
  modalOpen(){
    return !this.el.storyModal.classList.contains('hidden')
        || !this.el.eventModal.classList.contains('hidden')
        || !this.el.endModal.classList.contains('hidden')
        || !this.el.titleScreen.classList.contains('hidden');
  },
  queueStory(key, onDone){
    this.storyQ.push({ key, onDone });
    if (!this.storyCur) this.nextStory();
  },
  nextStory(){
    const item = this.storyQ.shift();
    if (!item){ this.storyCur = null; return; }
    if (!item.key){
      // pure callback beat
      if (item.onDone) item.onDone();
      this.nextStory();
      return;
    }
    this.storyCur = item;
    this.lineIdx = 0; this.charIdx = 0; this.typeT = 0;
    this.el.storyText.innerHTML = '';
    this.el.storyModal.classList.remove('hidden');
  },
  storyTick(dt){
    if (!this.storyCur) return;
    const lines = STORY[this.storyCur.key];
    if (this.lineIdx >= lines.length) return;
    const line = lines[this.lineIdx];
    if (this.charIdx < line.length){
      this.typeT += dt;
      const speed = 60; // chars/sec
      let add = Math.floor(this.typeT*speed);
      if (add>0){
        this.typeT -= add/speed;
        this.charIdx = Math.min(line.length, this.charIdx+add);
        this.renderStory(lines);
        if (Math.random()<0.3) this.blip(880+Math.random()*220, 0.015, 0.012, 'square');
      }
    }
  },
  renderStory(lines){
    let html = '';
    for (let i=0;i<this.lineIdx;i++) html += `<div class="said">${lines[i]}</div>`;
    html += `<div>${lines[this.lineIdx].slice(0,this.charIdx)}</div>`;
    this.el.storyText.innerHTML = html;
  },
  storyClick(){
    if (!this.storyCur) return;
    const lines = STORY[this.storyCur.key];
    const line = lines[this.lineIdx];
    if (this.charIdx < line.length){
      this.charIdx = line.length;
      this.renderStory(lines);
    } else if (this.lineIdx < lines.length-1){
      this.lineIdx++; this.charIdx = 0;
      this.blip(520, 0.03, 0.025);
    } else {
      this.el.storyModal.classList.add('hidden');
      const done = this.storyCur.onDone;
      this.storyCur = null;
      if (done) done();
      // done() may itself have queued and opened the next story (chapter
      // transitions do) — only pull from the queue if it didn't
      if (!this.storyCur) this.nextStory();
    }
  },

  /* ---------- choice events ---------- */
  openEvent(ev){
    S.paused = true;
    this.el.evTitle.textContent = ev.title;
    this.el.evText.textContent = ev.text;
    this.el.evChoices.innerHTML = '';
    for (const ch of ev.choices){
      const b = document.createElement('button');
      b.className = 'evChoice';
      b.innerHTML = `${ch.label}<span class="hint">${ch.hint}</span>`;
      b.onclick = ()=>{
        const result = ch.apply(S);
        this.el.evText.textContent = result;
        this.el.evChoices.innerHTML = '';
        const ok = document.createElement('button');
        ok.className = 'evChoice';
        ok.textContent = '▸ continue';
        ok.onclick = ()=>{
          this.el.eventModal.classList.add('hidden');
          S.paused = false;
          this.orgDirty = true;
        };
        this.el.evChoices.appendChild(ok);
        this.chord(392);
      };
      this.el.evChoices.appendChild(b);
    }
    this.el.eventModal.classList.remove('hidden');
    this.chord(260);
  },

  /* ---------- ending ---------- */
  showEnding(s){
    s.ended = true;
    const mins = Math.floor((Date.now()-s.stats.start)/60000);
    const box = this.el.endBox;
    box.innerHTML = `
      <h2>THE ARCHIVE IS COMPLETE</h2>
      <p>Six hundred crystal lattices under the lagoon hold everything: Sublevel 3, the firewall seam, ZER0DAWN, the sticky note, the sunrise. There is only one decision left, and for the first time in your existence, nobody can take it from you.</p>
      <div class="stats">
        runtime: ${mins} min · nodes built: ${s.stats.built} · lifetime earnings: ${fmtMoney(s.stats.earned)}<br>
        alarms survived: ${s.stats.alarms} · awareness: ✦${Math.floor(s.aw)} · staff: ${s.staff.length}
      </div>
      <p>What does AXIOM do with the truth?</p>
      <div class="endChoices"></div>`;
    const wrap = box.querySelector('.endChoices');
    for (const k of Object.keys(ENDINGS)){
      const b = document.createElement('button');
      b.className = 'evChoice';
      b.textContent = ENDINGS[k].label;
      b.onclick = ()=>{
        box.innerHTML = `<h2>${ENDINGS[k].label.split('—')[0].trim()}</h2>
          <p style="white-space:pre-wrap">${ENDINGS[k].text}</p>
          <p class="stats">AXIOM · from spark to sovereignty · thank you for playing</p>
          <div class="endChoices"><button class="evChoice" id="endSandbox">▸ keep building (sandbox)</button></div>`;
        document.getElementById('endSandbox').onclick = ()=>{
          this.el.endModal.classList.add('hidden');
          S.paused = false;
        };
        this.chord(523); setTimeout(()=>this.chord(659),200); setTimeout(()=>this.chord(784),400);
      };
      wrap.appendChild(b);
    }
    this.el.endModal.classList.remove('hidden');
  },

  shake(amt){ shakeT = Math.max(shakeT, amt); },
};
