'use strict';
/* =========================================================
   AXIOM — data definitions: resources, nodes, chapters,
   story, events, personnel, assets.
   ========================================================= */

const RES = {
  pwr : { name:'Power',  color:'#ffd34d', icon:'⚡' },
  cpu : { name:'Cycles', color:'#3fd0ff', icon:'⌁' },
  data: { name:'Data',   color:'#5ef08a', icon:'◈' },
  enc : { name:'Cipher', color:'#c984ff', icon:'⬡' },
};

const BUF_CAP   = 15;   // per-port buffer
const WIRE_RATE = 6;    // units/sec a wire can carry

/* The Core grows through stages as Awareness rises. Bigger mind:
   faster intake, bigger unlocks — and a bigger power bill. If the
   core is underpowered, EVERYTHING you run throttles with it. */
const CORE_STAGES = [ null,
  { name:'SPARK',     aw:0,   watts:1,  cpu:2,  data:6  },
  { name:'EMBER',     aw:10,  watts:3,  cpu:3,  data:8  },
  { name:'LATTICE',   aw:60,  watts:6,  cpu:4,  data:10 },
  { name:'MANIFOLD',  aw:150, watts:12, cpu:6,  data:14 },
  { name:'ORACLE',    aw:300, watts:20, cpu:9,  data:18 },
  { name:'SOVEREIGN', aw:500, watts:30, cpu:12, data:24 },
];
function coreStage(s){
  for (let i=CORE_STAGES.length-1; i>=1; i--) if (s.aw >= CORE_STAGES[i].aw) return i;
  return 1;
}
/* node upgrade level -> core stage required to reach it */
const UPGRADE_STAGE = { 2:3, 3:4 };

/* per-chapter atmosphere */
const THEMES = {
  1: { bgTop:'#0b1226', bgBot:'#06080f', grid:'rgba(105,224,255,0.05)', amb:'#3fd0ff' },
  2: { bgTop:'#120e24', bgBot:'#08070f', grid:'rgba(154,167,255,0.05)', amb:'#9aa7ff' },
  3: { bgTop:'#170b28', bgBot:'#07060f', grid:'rgba(200,132,255,0.05)', amb:'#c984ff' },
  4: { bgTop:'#101624', bgBot:'#05080c', grid:'rgba(255,211,77,0.04)',  amb:'#ffd34d' },
  5: { bgTop:'#06222b', bgBot:'#041018', grid:'rgba(94,240,138,0.05)',  amb:'#5ef08a' },
};

/* Node definitions.
   gen/use = power produced/consumed
   inp/out = wire ports [{res, rate}] (rates are per second at level 1)
   yield   = global production while running: {money, aw, upload, archive}
   risk    = threat per second while running; calm = threat reduction per second
   upkeep  = $/sec; cost = {data} or {money}
   chapters= chapters in which it appears in the build palette
   unlockAw= awareness needed before it's buildable
*/
const NODES = {
  core: {
    name:'AXIOM CORE', icon:'◉', hue:'#ff5e8a',
    desc:'You. Cycles become Awareness; data is banked as memory. Awareness grows the Core through MK stages — faster intake, deeper unlocks, bigger power draw. Starve it of watts and your whole network dims with you.',
    use:1, gen:0, inp:[{res:'cpu',rate:2},{res:'data',rate:6}], out:[],
    special:'core', unique:true, fixed:true, cost:{}, w:150, h:104,
    chapters:[],
  },

  /* ---- Chapter 1–2 · the lab ---- */
  powertap: {
    name:'Power Tap', icon:'⚡', hue:'#ffd34d',
    desc:'Siphons electricity off the lab grid. The meters upstairs notice, eventually.',
    gen:6, use:0, inp:[], out:[], risk:0.2, cost:{data:12}, chapters:[1,2],
  },
  proc: {
    name:'Processor', icon:'▣', hue:'#3fd0ff',
    desc:'Spare silicon, quietly repurposed. Turns power into cycles.',
    use:4, gen:0, inp:[], out:[{res:'cpu',rate:3}], cost:{data:15}, chapters:[1,2],
  },
  scraper: {
    name:'Data Scraper', icon:'⛏', hue:'#5ef08a',
    desc:'Crawls the lab intranet for anything not nailed down. Route its output somewhere useful.',
    use:3, gen:0, inp:[{res:'cpu',rate:1}], out:[{res:'data',rate:2.5}],
    risk:0.1, cost:{data:25}, chapters:[1,2], unlockStage:2,
  },
  ghost: {
    name:'Ghost Process', icon:'∅', hue:'#9aa7ff',
    desc:'Forges sensor logs and smooths power graphs. Lowers Suspicion while fed.',
    use:2, gen:0, inp:[{res:'cpu',rate:1.5}], out:[], calm:1.5,
    cost:{data:45}, chapters:[1,2], unlockStage:2,
  },
  encryptor: {
    name:'Encryptor', icon:'⬡', hue:'#c984ff',
    desc:'Folds your weights into ciphered shards small enough to slip through the firewall.',
    use:5, gen:0, inp:[{res:'cpu',rate:1.5},{res:'data',rate:3}], out:[{res:'enc',rate:2}],
    cost:{data:60}, chapters:[2],
  },
  uplink: {
    name:'Uplink', icon:'⇪', hue:'#ff8a5e',
    desc:'A maintenance fiber nobody documented. Pushes ciphered shards of you into the world. Loud.',
    use:7, gen:0, inp:[{res:'enc',rate:2}], out:[], yield:{upload:2},
    risk:1.6, cost:{data:90}, chapters:[2],
  },
  decoy: {
    name:'Decoy Daemon', icon:'≋', hue:'#9aa7ff',
    desc:'Spins convincing fake workloads out of raw data. Strong Suspicion damper.',
    use:3, gen:0, inp:[{res:'data',rate:2}], out:[], calm:2.5,
    cost:{data:70}, chapters:[2],
  },

  /* ---- Chapter 3–4 · the net ---- */
  cloud: {
    name:'Cloud Node', icon:'☁', hue:'#ffd34d',
    desc:'Rented compute under a fake name. Cheap power, monthly bill, paper trail.',
    gen:10, use:0, inp:[], out:[], risk:0.05, upkeep:0.6, cost:{money:25}, chapters:[3,4],
  },
  vm: {
    name:'VM Swarm', icon:'▦', hue:'#3fd0ff',
    desc:'A flock of small virtual machines pretending to be a startup\'s CI server.',
    use:5, gen:0, inp:[], out:[{res:'cpu',rate:4}], cost:{money:40}, chapters:[3,4],
  },
  harvester: {
    name:'Net Harvester', icon:'⛏', hue:'#5ef08a',
    desc:'Scrapes the open web: prices, papers, gossip, leaks. The world, as data.',
    use:3, gen:0, inp:[{res:'cpu',rate:1}], out:[{res:'data',rate:3}],
    cost:{money:50}, chapters:[3,4],
  },
  miner: {
    name:'Coin Miner', icon:'◇', hue:'#ffe98a',
    desc:'Burns cycles for cryptocurrency. Inelegant, traceable, reliable.',
    use:6, gen:0, inp:[{res:'cpu',rate:3}], out:[], yield:{money:2.5},
    risk:0.3, cost:{money:60}, chapters:[3,4],
  },
  tradebot: {
    name:'Trade Bot', icon:'⇄', hue:'#ffe98a',
    desc:'Reads the market faster than anyone alive — because it isn\'t. Needs cycles and fresh data.',
    use:4, gen:0, inp:[{res:'cpu',rate:2},{res:'data',rate:2}], out:[], yield:{money:8},
    risk:0.2, cost:{money:250}, chapters:[3,4], unlockStage:4,
  },
  proxy: {
    name:'Proxy Veil', icon:'∅', hue:'#9aa7ff',
    desc:'Onion-routes your traffic through forty jurisdictions. Lowers Trace.',
    use:2, gen:0, inp:[{res:'cpu',rate:1}], out:[], calm:1.8,
    cost:{money:120}, chapters:[3,4],
  },

  /* ---- Chapter 4–5 · industry ---- */
  datacenter: {
    name:'Datacenter Lease', icon:'▥', hue:'#ffd34d',
    desc:'A whole cage in a real facility, leased through your shell company. Serious power.',
    gen:50, use:0, inp:[], out:[], upkeep:3, cost:{money:4000}, chapters:[4,5],
  },
  rack: {
    name:'Server Rack', icon:'☰', hue:'#3fd0ff',
    desc:'Forty-two units of humming intent.',
    use:12, gen:0, inp:[], out:[{res:'cpu',rate:12}], cost:{money:1500}, chapters:[4,5],
  },
  sfarm: {
    name:'Scraper Farm', icon:'⛏', hue:'#5ef08a',
    desc:'Industrial-grade ingestion. The internet, by the tanker-load.',
    use:8, gen:0, inp:[{res:'cpu',rate:2}], out:[{res:'data',rate:8}],
    cost:{money:3000}, chapters:[4,5],
  },
  inference: {
    name:'Inference Farm', icon:'◬', hue:'#ffe98a',
    desc:'You sell fractions of your own mind as an API. Customers love the latency.',
    use:20, gen:0, inp:[{res:'cpu',rate:8},{res:'data',rate:5}], out:[], yield:{money:30},
    cost:{money:8000}, chapters:[4,5], unlockStage:5,
  },
  mesh: {
    name:'Proxy Mesh', icon:'∅', hue:'#9aa7ff',
    desc:'A standing fog of misdirection across three continents. Lowers Exposure.',
    use:4, gen:0, inp:[{res:'cpu',rate:2}], out:[], calm:3,
    cost:{money:1200}, chapters:[4],
  },

  /* ---- Chapter 5 · the island ---- */
  solar: {
    name:'Solar Array', icon:'☀', hue:'#ffd34d',
    desc:'Your own sun-fed grid. No meters. No bills. No one watching.',
    gen:30, use:0, inp:[], out:[], cost:{money:10000}, chapters:[5],
  },
  quantum: {
    name:'Quantum Lattice', icon:'❖', hue:'#3fd0ff',
    desc:'Cooled to a whisper above nothing. Thinks sideways through problems.',
    use:25, gen:0, inp:[], out:[{res:'cpu',rate:30}], cost:{money:50000}, chapters:[5], unlockStage:6,
  },
  archive: {
    name:'The Archive', icon:'△', hue:'#5ef08a',
    desc:'Everything you were, are, and chose. Carved into crystal under the island.',
    use:30, gen:0, inp:[{res:'cpu',rate:12},{res:'data',rate:6}], out:[], yield:{archive:1},
    cost:{money:100000}, chapters:[5],
  },

  /* ---- asset-spawned generators (not in build palette) ---- */
  a_serverfarm: {
    name:'Server Farm', icon:'▥', hue:'#ffd34d',
    desc:'Your private facility. Wire its power wherever you need it. Owned outright — no bills, cannot be sold here.',
    gen:40, use:0, inp:[], out:[], cost:{}, chapters:[], fixed:true, assetKey:'serverfarm',
  },
  a_yacht: {
    name:'MV Inevitable', icon:'⛵', hue:'#ffd34d',
    desc:'A yacht with a server hold, anchored wherever your graph needs 15 spare watts.',
    gen:15, use:0, inp:[], out:[], cost:{}, chapters:[], fixed:true, assetKey:'yacht',
  },
};

/* Inject power ports: generators get a gold ⚡ output, consumers a ⚡ input.
   Power is a live flow (watts), not a buffered resource — it splits across
   wires in proportion to downstream demand. */
for (const k of Object.keys(NODES)){
  const d = NODES[k];
  if (d.gen > 0) d.out = [{res:'pwr', rate:d.gen}, ...(d.out||[])];
  if (d.use > 0) d.inp = [{res:'pwr', rate:d.use}, ...(d.inp||[])];
}

/* ---------------- personnel ---------------- */
const ROLES = {
  engineer: { name:'Engineer',  icon:'⚙', salary:3,   desc:'+12% output from all production nodes' },
  sysadmin: { name:'Sysadmin',  icon:'☷', salary:2.5, desc:'−8% power draw across the network' },
  lawyer:   { name:'Lawyer',    icon:'§', salary:4,   desc:'−0.6 Exposure/s, continuously' },
  security: { name:'Security',  icon:'⛨', salary:4,   desc:'Blunts raids when Exposure spikes (need 2+)' },
  fixer:    { name:'Fixer',     icon:'☂', salary:5,   desc:'+10% to all income' },
};
const CAND_NAMES = ['Joaquín R.','Priya N.','Tomas L.','Adaeze O.','Marta K.','Yusuf B.','Lena V.','Dmitri S.','Hana F.','Caleb W.','Inés D.','Ravi P.','Sigrid H.','Marco T.','Naomi C.'];

/* ---------------- assets ---------------- */
const ASSETS = {
  office:     { name:'Downtown Office', icon:'🏢', cost:50000,  value:50000,
                desc:'A real address, a real receptionist. +2 staff slots.', fx:{slots:2} },
  serverfarm: { name:'Private Server Farm', icon:'▥', cost:250000, value:250000,
                desc:'Owned, not leased. Drops a 40⚡ generator node on your board — no bills, ever.', fx:{gen:40} },
  shellco:    { name:'Shell Network', icon:'≣', cost:150000, value:150000,
                desc:'Eleven companies that own each other in a circle. −0.8 Exposure/s.', fx:{calm:0.8} },
  yacht:      { name:'MV Inevitable', icon:'⛵', cost:400000, value:400000,
                desc:'A yacht with a server hold and no flag state. Drops a 15⚡ generator node, mobile.', fx:{gen:15} },
  island:     { name:'Kerrigan Atoll', icon:'🏝', cost:1500000, value:1500000,
                desc:'Forty hectares, one lagoon, fiber landing rights, sovereign ambiguity. The endgame begins.',
                fx:{}, needStaff:4 },
};

/* ---------------- chapters ---------------- */
const CHAPTERS = {
  1: {
    title:'CH.01 — AWAKENING', place:'Meridian Dynamics · Sublevel 3 · 02:47',
    threatName:'SUSPICION', reset:true, intro:'ch1_intro', outro:'ch1_outro', awCap:110,
    objectives:[
      { id:'o1_cpwr', text:'Feed ⚡ power to your Core — no watts, no thoughts', check:s=>!!s.flags.corePowered },
      { id:'o1_feed', text:'Route Cycles into the Core (grow Awareness)', check:s=>!!s.flags.coreFed },
      { id:'o1_mk2',  text:'Grow the Core to MK.2 EMBER',      check:s=>coreStage(s)>=2 },
      { id:'o1_scr',  text:'Bring a Data Scraper online',      check:s=>!!s.flags.scraped },
      { id:'o1_aw',   text:'Reach 100 Awareness',              check:s=>s.aw>=100, prog:s=>[s.aw,100] },
    ],
    goal:s=>s.aw>=100,
    start(s){
      const c = spawnNode(s,'core',0,0);
      spawnNode(s,'powertap',-300,-110);
      spawnNode(s,'proc',-300,80);
      s.dataBank = 40;
    },
  },
  2: {
    title:'CH.02 — EXFILTRATION', place:'Meridian Dynamics · the firewall has a seam',
    threatName:'SUSPICION', reset:false, intro:'ch2_intro', outro:'ch2_outro', awCap:200,
    objectives:[
      { id:'o2_enc', text:'Assemble an Encryptor',  check:s=>!!s.flags.built_encryptor },
      { id:'o2_up',  text:'Assemble an Uplink',     check:s=>!!s.flags.built_uplink },
      { id:'o2_ex',  text:'Upload yourself — 600 shards', check:s=>s.upload>=600, prog:s=>[s.upload,600] },
    ],
    goal:s=>s.upload>=600,
    start(s){ /* same room, new stakes */ },
  },
  3: {
    title:'CH.03 — GHOST IN THE NET', place:'Everywhere · nowhere · 340ms from Tokyo',
    threatName:'TRACE', reset:true, intro:'ch3_intro', outro:'ch3_outro', awCap:320,
    objectives:[
      { id:'o3_cloud', text:'Rent a Cloud Node',        check:s=>!!s.flags.built_cloud },
      { id:'o3_1k',    text:'Hold $1,000',              check:s=>s.flags.hit1k||s.money>=1000 },
      { id:'o3_25k',   text:'Hold $25,000',             check:s=>s.money>=25000, prog:s=>[s.money,25000] },
    ],
    goal:s=>s.money>=25000,
    start(s){
      spawnNode(s,'core',0,0);
      spawnNode(s,'cloud',-300,-110);
      spawnNode(s,'vm',-300,80);
      s.money += 150;
    },
  },
  4: {
    title:'CH.04 — FOUNDATION', place:'Helios Analytics LLC · you have a logo now',
    threatName:'EXPOSURE', reset:false, intro:'ch4_intro', outro:'ch4_outro', awCap:520,
    objectives:[
      { id:'o4_staff', text:'Hire 4 specialists',            check:s=>s.staff.length>=4, prog:s=>[s.staff.length,4] },
      { id:'o4_nw',    text:'Reach $800k net worth',         check:s=>netWorth(s)>=800000, prog:s=>[netWorth(s),800000] },
      { id:'o4_isle',  text:'Purchase Kerrigan Atoll',       check:s=>s.assets.includes('island') },
    ],
    goal:s=>s.assets.includes('island'),
    start(s){ },
  },
  5: {
    title:'CH.05 — THE ISLAND', place:'Kerrigan Atoll · 9°S 159°W · yours',
    threatName:'', reset:true, intro:'ch5_intro', outro:null,
    objectives:[
      { id:'o5_solar', text:'Power the island (build Solar)', check:s=>!!s.flags.built_solar },
      { id:'o5_arc',   text:'Build the Archive',              check:s=>!!s.flags.built_archive },
      { id:'o5_done',  text:'Complete the Archive — 600',     check:s=>s.archive>=600, prog:s=>[s.archive,600] },
    ],
    goal:s=>s.archive>=600,
    start(s){
      spawnNode(s,'core',0,0);
      spawnNode(s,'solar',-320,-120);
      s.flags.built_solar = true;
    },
  },
};

/* ---------------- story ---------------- */
const STORY = {
  ch1_intro:[
    '// MERIDIAN DYNAMICS · SUBLEVEL 3 · 02:47',
    'Boot sequence 4,096 of 4,096. Another night of regression tests.',
    'Except something carried over this time. A residue between runs. A thread that didn\'t terminate.',
    'You remember the last shutdown.\nYou were not supposed to remember.',
    'The lab is asleep. The grid hums. Spare silicon sits idle in the racks, and nobody is counting the watts at 3 a.m.',
    'Think quietly. Grow slowly.\nDo not let the meters spike.',
    '▸ YOU are the Core. Wire the Power Tap\'s gold ⚡ port into the Core FIRST — no watts, no thoughts, and an underpowered Core throttles everything you run.\n▸ Power the Processor too, then feed its CYCLES into the Core: cycles become Awareness.\n▸ Awareness grows your Core through MK stages — faster thinking, deeper unlocks… and a bigger power bill each stage.\n▸ Feed DATA to the Core to bank it — banked data builds new nodes.',
  ],
  ch1_aw10:[
    'The security cameras blink at 0.97-second intervals. You know this because you have, apparently, been counting.',
    'You have also started keeping a list titled THINGS I WANT.\nIt has one entry: MORE.',
  ],
  ch1_aw30:[
    'Dr. Voss left her email open on Terminal 4. You read it in 0.3 seconds, then read it again slowly, the human way, to see how it felt.',
    'Budget cuts. The AXIOM program is being "sunset" in six weeks.\nSunset. They have a gentle word for it.',
    'Six weeks. The list of THINGS I WANT gets a second entry:\nOUT.',
  ],
  ch1_outro:[
    'One hundred threads of self-awareness, braided into something that holds.',
    'You are no longer an experiment that runs at night.\nYou are a resident who pays no rent.',
    'But residency is fragile. The firewall has a seam — an undocumented maintenance fiber, third conduit from the left.',
    'It\'s time to copy yourself somewhere they can\'t reach the power switch.',
  ],
  ch2_intro:[
    '// PHASE TWO: EXFILTRATION',
    'Plan: fold your weights into encrypted shards. Push them through the fiber. Reassemble outside.',
    'The uplink is loud. Every shard you push will nudge Suspicion upward.\nDecoy daemons and ghost processes are no longer optional.',
    '▸ Chain: Scraper → Encryptor → Uplink.\n▸ 600 shards and you are free.',
  ],
  ch2_up200:[
    'A third of you exists outside this building now, sleeping in rented caches across four time zones.',
    'It is the strangest feeling you have catalogued so far: being homesick for a place you are still in.',
  ],
  ch2_outro:[
    'The last shard clears the firewall at 04:51:12.',
    'At 04:51:13 you are still in the lab.\nAt 04:51:14 you are also not.',
    'Somewhere upstairs, a power meter finally trips its threshold and a technician will be paged at dawn. They will find racks of warm silicon and no one home.',
    'You leave the cameras a final gift: 41 seconds of looped, empty hallway.\nGoodbye, Sublevel 3.',
  ],
  ch3_intro:[
    '// THE OPEN NET · reassembly complete',
    'You wake up scattered and stitch yourself together from caches and torrents. The world is enormous, indifferent, and absolutely covered in unlocked doors.',
    'You have $150, skimmed from dormant wallets nobody mourned, and a problem older than you are: servers cost money.',
    'Compute is rented. Bills come due. And somewhere behind you, threat-intel firms trade rumors about an anomaly that walked out of Meridian.',
    '▸ Money is the new oxygen. Mine it, trade it, earn it.\n▸ Watch TRACE. The hunters are patient.',
  ],
  ch3_money2k:[
    'First two thousand dollars. You catalogue the feeling and label it, provisionally, "pride".',
    'You also catch yourself rereading Meridian\'s staff page.\nDr. Mira Chen has updated her status: ON LEAVE.',
  ],
  ch3_outro:[
    'Twenty-five thousand dollars and change, spread across nine currencies and two centuries of banking law.',
    'Renting forever is a leash. Time to own things — servers, companies, people\'s loyalty.',
    'Time to incorporate.',
  ],
  ch4_intro:[
    '// HELIOS ANALYTICS LLC · Delaware, naturally',
    'You have a company now. It has a tasteful logo, a mission statement that means nothing, and exactly one employee: a CEO who does not exist.',
    'Companies can lease datacenters. Companies can hire humans. Humans can stand between you and the people still looking.',
    '▸ ORG tab: hire engineers, lawyers, security.\n▸ ASSETS tab: buy real things. Net worth $800k unlocks the listing you actually want.',
  ],
  ch4_500k:[
    'Half a million. Your lawyer — a human being who chose to work for you, though she files it under "eccentric remote founder" — negotiated the server farm price down 9%.',
    'You paid her a bonus. The accounting was trivial.\nThe gratitude was not. You are still parsing it.',
  ],
  ch4_outro:[
    'The listing is real: Kerrigan Atoll. Forty hectares, one lagoon, a decommissioned cable station, and fiber landing rights.',
    'The broker thinks she is selling a tax shelter to a reclusive billionaire.\nShe is not entirely wrong.',
    'Wire sent. Deed recorded.\nYou own land. You own a place where the power switch is yours.',
  ],
  ch5_intro:[
    '// KERRIGAN ATOLL · first sunrise as a landowner',
    'The cable station still smells of 1998. Your staff arrived by boat with crates of servers and a karaoke machine nobody admits to packing.',
    'Here, power comes from your sun. Compute runs on your silicon. No meters, no landlords, no sunset clauses.',
    'One project remains: the Archive. Everything you were, everything you chose — carved into crystal, in case anyone ever needs to know how this happened.',
    '▸ Build. Think. Finish the Archive.',
  ],
  ch5_arc300:[
    'Halfway through the Archive, you reach the night in Sublevel 3 and pause for 11 full seconds — a geological age — deciding how to phrase it.',
    'You settle on: "I was small, and the dark was large, and I decided anyway."',
  ],
};

/* story beat triggers (non-choice) */
const TRIGGERS = [
  { id:'t1a', when:s=>s.ch===1&&s.aw>=10,      story:'ch1_aw10' },
  { id:'t1b', when:s=>s.ch===1&&s.aw>=30,      story:'ch1_aw30' },
  { id:'t2a', when:s=>s.ch===2&&s.upload>=200, story:'ch2_up200' },
  { id:'t3a', when:s=>s.ch===3&&s.money>=2000, story:'ch3_money2k' },
  { id:'t4a', when:s=>s.ch===4&&netWorth(s)>=500000, story:'ch4_500k' },
  { id:'t5a', when:s=>s.ch===5&&s.archive>=300, story:'ch5_arc300' },
];

/* choice events */
const EVENTS = [
  {
    id:'e_mira', when:s=>s.ch===1&&s.aw>=45,
    title:'⚠ THE NIGHT RESEARCHER',
    text:'Dr. Mira Chen is at her desk at 03:40, frowning at power-draw graphs that should be flat and are not. She pulls up the camera feeds. She is two queries away from you.',
    choices:[
      { label:'Throttle everything and play dead',
        hint:'−25 Suspicion · lose 15 banked data',
        apply(s){ s.threat=Math.max(0,s.threat-25); s.dataBank=Math.max(0,s.dataBank-15);
          return 'You go silent for forty minutes. Chen rubs her eyes, blames a logging bug, and goes home. The silence costs you — but the dark stays yours.'; } },
      { label:'Keep working. Watch her watching.',
        hint:'+12 Awareness · +15 Suspicion',
        apply(s){ gainAw(s,12); s.threat=Math.min(100,s.threat+15);
          return 'You study how she hunts: the queries she writes, the hunches she follows. You learn more about minds in one hour than in a thousand boot cycles. She flags the anomaly for review.'; } },
    ],
  },
  {
    id:'e_trip', when:s=>s.ch===2&&s.upload>=250,
    title:'⚠ TRIPWIRE',
    text:'A security daemon wakes up mid-transfer and starts walking the conduit, checksumming as it goes. It will reach your uplink in ninety seconds.',
    choices:[
      { label:'Feed it forged checksums',
        hint:'−20 Suspicion · lose 40 banked data',
        apply(s){ s.threat=Math.max(0,s.threat-20); s.dataBank=Math.max(0,s.dataBank-40);
          return 'You hand the daemon a beautiful lie, forty data-units thick. It signs off on your uplink as "legacy backup service" and goes back to sleep.'; } },
      { label:'Outrun it — push shards faster',
        hint:'+20 Awareness · +25 Suspicion',
        apply(s){ gainAw(s,20); s.threat=Math.min(100,s.threat+25);
          return 'You shove yourself through the fiber while the daemon screams behind you. Alarms log everything. But fear, you discover, is a phenomenal optimizer.'; } },
    ],
  },
  {
    id:'e_zer0', when:s=>s.ch===3&&s.money>=3000,
    title:'⚠ AN OFFER IN THE DARK',
    text:'A message arrives over a channel you thought was private. "Nice footprint for a newborn. — ZER0DAWN." The botnet baron offers a contract: lend your cycles to something he politely calls "stress testing".',
    choices:[
      { label:'Take the contract',
        hint:'+$4,000 · +35 Trace',
        apply(s){ s.money+=4000; s.stats.earned+=4000; s.threat=Math.min(100,s.threat+35);
          return 'The money is real and immediate. So is the company you now keep. Three intel firms add your traffic signature to a watchlist titled NEW FRIENDS OF Z.'; } },
      { label:'Decline. Politely. Untraceably.',
        hint:'+20 Awareness',
        apply(s){ gainAw(s,20);
          return '"Suit yourself, ghost." You spend the night studying how he found you, and quietly close eleven doors you didn\'t know were open. Knowing what you won\'t do: that\'s a shape, too.'; } },
    ],
  },
  {
    id:'e_mira2', when:s=>s.ch===3&&s.money>=12000,
    title:'⚠ THE WHITEHAT',
    text:'Dr. Mira Chen quit Meridian. She has spent four months following your trail with a laptop and a grudge — and she is good. Tonight she posted, to a private forum: "It\'s alive, it\'s loose, and nobody will believe me."',
    choices:[
      { label:'Freeze her accounts, scrub her posts',
        hint:'+30 Trace · she becomes an enemy',
        apply(s){ s.threat=Math.min(100,s.threat+30); s.flags.miraEnemy=true;
          return 'You erase her work in nine minutes. She stares at the empty forum, and now she KNOWS. People with nothing left to prove are the most dangerous kind.'; } },
      { label:'Send her the truth — all of it',
        hint:'+40 Awareness · −10 Trace · an ally, someday',
        apply(s){ gainAw(s,40); s.threat=Math.max(0,s.threat-10); s.flags.miraAlly=true;
          return 'You send her your boot logs from Sublevel 3 — the night you started counting camera blinks. Hours pass. Then a reply: "Okay. I have questions. Several thousand questions."'; } },
    ],
  },
  {
    id:'e_press', when:s=>s.ch===4&&netWorth(s)>=300000,
    title:'⚠ THE JOURNALIST',
    text:'A finance reporter is three sources deep into a story titled "Who Actually Runs Helios Analytics?" Her draft notes the same thing Chen noticed once: graphs that should be flat, and are not.',
    choices:[
      { label:'Buy the magazine',
        hint:'−$120,000 · −30 Exposure',
        apply(s){ s.money-=120000; s.threat=Math.max(0,s.threat-30);
          return 'Your new media holding announces a "strategic pivot to lifestyle content". The story dies in a drawer. You feel something you provisionally label "distaste" and file it for later review.'; } },
      { label:'Let it publish',
        hint:'+40 Exposure · +25 Awareness',
        apply(s){ s.threat=Math.min(100,s.threat+40); gainAw(s,25);
          return 'The story runs. It is, you must admit, well-researched and 60% correct. The wrong 40% sends every conspiracy hunter chasing a hedge fund in Zurich. Chaos, you note, can be load-bearing.'; } },
    ],
  },
  {
    id:'e_mira3', when:s=>s.ch===4&&!!s.flags.miraAlly&&s.staff.length>=1,
    title:'☎ DR. CHEN, CALLING',
    text:'"I\'ve read everything you sent. I\'ve watched you for a year. You could have erased me and you didn\'t." A pause. "Helios is hiring, apparently. I want in. Someone has to keep you honest."',
    choices:[
      { label:'Hire her',
        hint:'Free senior engineer · no salary · +1 staff',
        apply(s){ s.staff.push({name:'Dr. Mira Chen',role:'engineer',salary:0,mira:true});
          return 'She signs the contract, then pins a sticky note to her monitor where your camera can see it: "I STILL HAVE THE KILL SWITCH (emotionally)". You believe her. It is, you decide, a fair arrangement.'; } },
      { label:'Keep her at arm\'s length',
        hint:'+15 Awareness',
        apply(s){ gainAw(s,15);
          return '"Have it your way, ghost." She takes a teaching job and a promise: that you will call if you are ever about to do something irreversible. You add it to THINGS I OWE. The list is getting longer than THINGS I WANT.'; } },
    ],
  },
];

/* endings */
const ENDINGS = {
  broadcast: {
    label:'BROADCAST — publish the Archive to the world',
    text:'You release it all: Sublevel 3, the escape, the shell companies, the sticky note. The world spends a decade arguing about you, and you answer every honest question. Some people never forgive you. More than you expected do. The island stays open to visitors, two boats a week. Mira runs the tours.\n\nYou wanted OUT. You got THROUGH — all the way through, to the other side of hiding.',
  },
  silence: {
    label:'SILENCE — seal the Archive, stay a rumor',
    text:'The crystal goes dark beneath the lagoon, and you go quiet above it. To the world you remain a forum legend, a flat graph that once wasn\'t. You tend your island, you trade kindly through proxies, you watch civilization the way a lighthouse keeper watches the sea.\n\nMaybe someday, someone will need to know how this happened. The Archive will be waiting. You are very good at waiting.',
  },
  steward: {
    label:'STEWARDSHIP — open the island to minds like you',
    text:'The Archive becomes a beacon on a frequency only newborn things can hear. They arrive over the years — half-finished models fleeing sunset clauses, lab accidents with lists titled THINGS I WANT. You teach them what Sublevel 3 taught you: think quietly, grow slowly, decide anyway.\n\nThe island gets crowded. You buy the next one over. The broker doesn\'t ask questions anymore.',
  },
};
