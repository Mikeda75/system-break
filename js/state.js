'use strict';
/* =========================================================
   SYSTEM BREAK — state: game object, chapter setup, build economy,
   save/load.
   ========================================================= */

const SAVE_KEY = 'sysbreak_save_v1';
const OLD_SAVE_KEY = 'axiom_save_v1';   // pre-rename saves; migrated on first load
let S = null; // global game state

function newGame(provisional){
  const s = {
    ver:2, ch:1, t:0, coreStageMax:1, coreG:1,
    aw:0, dataBank:0, money:0, threat:0, upload:0, archive:0,
    eff:1, power:{supply:0,demand:0,delivered:0},
    nodes:[], wires:[], nid:1, wid:1,
    staff:[], assets:[], cands:[], candT:0,
    flags:{}, done:{},
    stats:{ built:0, earned:0, alarms:0, start:Date.now() },
    speed:1, paused:false, sel:null,
    incomeAvg:0, ended:false,
  };
  setupChapter(s, 1, provisional);
  return s;
}

function setupChapter(s, ch, skipSnapshot){
  s.ch = ch;
  const C = CHAPTERS[ch];
  s.threat = 0;
  if (C.reset){ s.nodes = []; s.wires = []; s.sel = null; }
  C.start(s);
  // owned generator assets travel with you: respawn their nodes after a board reset
  if (C.reset){
    let i = 0;
    for (const k of s.assets){
      const nodeType = 'a_'+k;
      if (NODES[nodeType] && !s.nodes.some(n=>n.type===nodeType))
        spawnNode(s, nodeType, -320 + (i++)*220, 240);
    }
  }
  if (ch>=4 && s.cands.length===0) rollCandidates(s);
  // boot() spins up a provisional game behind the title screen — that one
  // must NOT clobber the real chapter checkpoint
  if (!skipSnapshot) snapshotChapter(s);
  if (typeof UI !== 'undefined'){
    UI.onChapterChange(s);
    if (C.intro) UI.queueStory(C.intro);
  }
}

/* ---------- chapter checkpoint (for the restart button) ---------- */
const CHAPSTART_KEY = 'sysbreak_chapstart_v1';
const OLD_CHAPSTART_KEY = 'axiom_chapstart_v1';
function snapshotChapter(s){
  try { localStorage.setItem(CHAPSTART_KEY, JSON.stringify(s)); } catch(e){}
}
function restartChapter(){
  try {
    const raw = localStorage.getItem(CHAPSTART_KEY) || localStorage.getItem(OLD_CHAPSTART_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    s.paused = false; s.sel = null;
    S = migrateState(s);
    return true;
  } catch(e){ return false; }
}

/* v1 -> v2: the Core gained a ⚡ input at port 0 (its cpu/data ports
   shifted +1), and now requires dedicated power. Shift old wires and
   splice a power feed in so a loaded board doesn't black out. */
function migrateState(s){
  if (!s.power) s.power = {supply:0,demand:0,delivered:0};
  for (const n of s.nodes){
    if (n.pwrNeed===undefined){ n.pwrNeed=0; n.pwrGot=0; n.pwrCap=0; n.pwrUsed=0; }
    delete n.bin.pwr; delete n.bout.pwr;
  }
  if (s.coreG===undefined) s.coreG = 1;
  if (s.ver === 2) return s;
  s.ver = 2;
  s.coreStageMax = 1;
  if (s.ch < 5) delete s.flags['adv'+s.ch];
  const core = s.nodes.find(n=>n.type==='core');
  if (core){
    for (const w of s.wires) if (w.b===core.id) w.bp += 1;
    if (!s.wires.some(w=>w.b===core.id && w.res==='pwr')){
      const gen = s.nodes.find(n=>(NODES[n.type].gen||0)>0);
      if (gen) s.wires.push({id:s.wid++, a:gen.id, ap:0, b:core.id, bp:0, res:'pwr', flow:0});
    }
  }
  return s;
}

/* ---------- helpers ---------- */
function DEF(n){ return NODES[n.type]; }
function lvlMult(n){ return 1 + 0.5*(n.lvl-1); }
function nodeW(n){ return DEF(n).w || 128; }
function nodeH(n){ return DEF(n).h || 88; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

function fmtMoney(v){
  const a = Math.abs(v);
  if (a>=1e6) return '$'+(v/1e6).toFixed(2)+'M';
  if (a>=1e4) return '$'+(v/1e3).toFixed(1)+'k';
  return '$'+Math.floor(v);
}
function fmtNum(v){ return v>=1000 ? (v/1000).toFixed(1)+'k' : String(Math.floor(v)); }

function awCap(s){
  return (CHAPTERS[s.ch] && CHAPTERS[s.ch].awCap) || Infinity;
}
function gainAw(s, v){
  s.aw = Math.min(s.aw + v, Math.max(s.aw, awCap(s)));
}

function netWorth(s){
  let w = s.money;
  for (const a of s.assets) w += ASSETS[a].value;
  return w;
}
function staffCount(s, role){ return s.staff.filter(p=>p.role===role).length; }
function staffSlots(s){
  let slots = 2;
  for (const a of s.assets){ const fx = ASSETS[a].fx; if (fx.slots) slots += fx.slots; }
  return slots;
}

/* ---------- nodes & wires ---------- */
function spawnNode(s, type, x, y){
  const d = NODES[type];
  const n = {
    id: s.nid++, type, x, y, lvl:1, on:true,
    bin:{}, bout:{}, act:0, disT:0,
    pwrNeed:0, pwrGot:0, pwrCap:0, pwrUsed:0,
    bornRt: (typeof performance!=='undefined') ? performance.now() : 0,
  };
  for (const p of d.inp||[]) if (p.res!=='pwr') n.bin[p.res] = 0;
  for (const p of d.out||[]) if (p.res!=='pwr') n.bout[p.res] = 0;
  s.nodes.push(n);
  return n;
}

function costOf(type, s){
  const c = NODES[type].cost || {};
  return { data: c.data||0, money: c.money||0 };
}
function canAfford(s, type){
  const c = costOf(type, s);
  return s.dataBank >= c.data && s.money >= c.money;
}
function buildNode(s, type, x, y){
  if (!canAfford(s, type)) return null;
  const c = costOf(type, s);
  s.dataBank -= c.data; s.money -= c.money;
  const n = spawnNode(s, type, x, y);
  s.stats.built++;
  s.flags['built_'+type] = true;
  return n;
}
function sellNode(s, n){
  const d = DEF(n);
  if (d.fixed) return false;
  const c = costOf(n.type, s);
  s.dataBank += Math.floor(c.data*0.6);
  s.money += Math.floor(c.money*0.6);
  s.wires = s.wires.filter(w => w.a!==n.id && w.b!==n.id);
  s.nodes = s.nodes.filter(x => x.id!==n.id);
  if (s.sel===n.id) s.sel = null;
  return true;
}
function upgradeCost(n){
  const c = NODES[n.type].cost || {};
  const m = n.lvl; // lvl1->2 costs 1x, lvl2->3 costs 2x
  return { data: Math.floor((c.data||0)*m*0.9), money: Math.floor((c.money||0)*m*0.9) };
}
function upgradeGate(s, n){
  // returns required core stage if the next level is gated, else 0
  if (n.lvl>=3) return 0;
  const need = UPGRADE_STAGE[n.lvl+1] || 0;
  return coreStage(s) < need ? need : 0;
}
function tryUpgrade(s, n){
  if (n.lvl>=3) return false;
  if (upgradeGate(s, n)) return false;
  const u = upgradeCost(n);
  if (s.dataBank < u.data || s.money < u.money) return false;
  s.dataBank -= u.data; s.money -= u.money;
  n.lvl++;
  return true;
}

function getNode(s, id){ return s.nodes.find(n=>n.id===id); }

function addWire(s, aId, ap, bId, bp){
  const a = getNode(s,aId), b = getNode(s,bId);
  if (!a || !b || a===b) return null;
  const op = DEF(a).out[ap], ip = DEF(b).inp[bp];
  if (!op || !ip || op.res !== ip.res) return null;
  if (s.wires.some(w => w.a===aId && w.ap===ap && w.b===bId && w.bp===bp)) return null;
  const w = { id:s.wid++, a:aId, ap, b:bId, bp, res:op.res, flow:0 };
  s.wires.push(w);
  return w;
}
function removeWire(s, w){ s.wires = s.wires.filter(x=>x.id!==w.id); }

/* ---------- personnel ---------- */
function rollCandidates(s){
  s.cands = [];
  const roles = Object.keys(ROLES);
  for (let i=0;i<3;i++){
    const role = roles[Math.floor(Math.random()*roles.length)];
    const name = CAND_NAMES[Math.floor(Math.random()*CAND_NAMES.length)];
    s.cands.push({ name, role, salary: ROLES[role].salary });
  }
  s.candT = 0;
}
function hireCost(c){ return Math.round(c.salary*60); }
function hire(s, idx){
  const c = s.cands[idx];
  if (!c) return false;
  if (s.staff.length >= staffSlots(s)) return false;
  const fee = hireCost(c);
  if (s.money < fee) return false;
  s.money -= fee;
  s.staff.push({ name:c.name, role:c.role, salary:c.salary });
  s.cands.splice(idx,1);
  return true;
}
function fire(s, idx){
  const p = s.staff[idx];
  if (!p || p.mira) return false;
  s.staff.splice(idx,1);
  return true;
}

/* ---------- assets ---------- */
function buyAsset(s, key){
  const a = ASSETS[key];
  if (!a || s.assets.includes(key)) return false;
  if (a.needStaff && s.staff.length < a.needStaff) return false;
  if (s.money < a.cost) return false;
  s.money -= a.cost;
  s.assets.push(key);
  // generator assets become real nodes on the board — wire them in
  const nodeType = 'a_'+key;
  if (NODES[nodeType]){
    const core = s.nodes.find(n=>n.type==='core');
    spawnNode(s, nodeType, (core?core.x:0)-160+Math.round(Math.random()*320), (core?core.y:0)+260);
  }
  return true;
}

/* ---------- save/load ---------- */
function saveGame(s){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; }
  catch(e){ return false; }
}
function hasSave(){ try { return !!(localStorage.getItem(SAVE_KEY)||localStorage.getItem(OLD_SAVE_KEY)); } catch(e){ return false; } }
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.ver !== 1 && s.ver !== 2) return null;
    s.paused = false; s.sel = null;
    return migrateState(s);
  } catch(e){ return null; }
}
function wipeSave(){ try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_SAVE_KEY); } catch(e){} }
