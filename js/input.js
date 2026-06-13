'use strict';
/* =========================================================
   SYSTEM BREAK — input: pan/zoom, placement, wiring, selection.
   ========================================================= */

const Input = {
  placing:null, wireDrag:null, worldMouse:{x:0,y:0},
  ghostOk:false, ghostX:0, ghostY:0,
  drag:null, // {kind:'pan'|'node', ...}
  downAt:null,

  init(cv){
    cv.addEventListener('mousedown', e=> this.down(e));
    window.addEventListener('mousemove', e=> this.move(e));
    window.addEventListener('mouseup', e=> this.up(e));
    cv.addEventListener('wheel', e=> this.wheel(e), {passive:false});
    cv.addEventListener('contextmenu', e=> e.preventDefault());
    window.addEventListener('keydown', e=> this.key(e));
  },

  down(e){
    if (UI.modalOpen()) return;
    const wp = screenToWorld(e.clientX, e.clientY);
    this.worldMouse = wp;
    this.downAt = {x:e.clientX, y:e.clientY, moved:false};

    if (e.button === 2){
      // right click: cancel placement, else delete wire under cursor
      if (this.placing){ this.placing = null; return; }
      const w = wireAt(S, wp, 10/cam.z);
      if (w){ removeWire(S, w); UI.blip(300); return; }
      return;
    }
    if (e.button !== 0) return;

    if (this.placing){
      if (this.ghostOk){
        const n = buildNode(S, this.placing, this.ghostX, this.ghostY);
        if (n){
          UI.chord(440);
          UI.log(`${NODES[this.placing].name} online.`);
          addFX({type:'ring', x:n.x, y:n.y, r0:14, r1:70, dur:0.45, col:NODES[this.placing].hue||'#69e0ff', lw:2});
          if (!e.shiftKey || !canAfford(S, this.placing)) this.placing = null;
        }
      } else UI.blip(220);
      return;
    }

    // port → wire drag
    const port = portAt(S, wp, 14/Math.max(cam.z,0.5));
    if (port){
      this.wireDrag = { nodeId: port.node.id, side: port.side, idx: port.idx, res: port.res };
      return;
    }
    // node → move-drag (selection resolved on mouseup if no movement)
    const n = nodeAt(S, wp);
    if (n){
      this.drag = { kind:'node', id:n.id, ox: wp.x-n.x, oy: wp.y-n.y };
      return;
    }
    // empty → pan
    this.drag = { kind:'pan', sx:e.clientX, sy:e.clientY, cx:cam.x, cy:cam.y };
  },

  move(e){
    const wp = screenToWorld(e.clientX, e.clientY);
    this.worldMouse = wp;
    if (this.downAt && Math.hypot(e.clientX-this.downAt.x, e.clientY-this.downAt.y) > 4)
      this.downAt.moved = true;

    if (this.drag){
      if (this.drag.kind==='pan'){
        cam.x = this.drag.cx - (e.clientX-this.drag.sx)/cam.z;
        cam.y = this.drag.cy - (e.clientY-this.drag.sy)/cam.z;
      } else if (this.drag.kind==='node'){
        const n = getNode(S, this.drag.id);
        if (n){
          n.x = Math.round((wp.x-this.drag.ox)/16)*16;
          n.y = Math.round((wp.y-this.drag.oy)/16)*16;
        }
      }
    }
  },

  up(e){
    if (this.wireDrag){
      const wp = screenToWorld(e.clientX, e.clientY);
      const port = portAt(S, wp, 18/Math.max(cam.z,0.5));
      if (port && port.side !== this.wireDrag.side && port.res === this.wireDrag.res){
        const out = this.wireDrag.side==='out'
          ? {id:this.wireDrag.nodeId, p:this.wireDrag.idx}
          : {id:port.node.id, p:port.idx};
        const inn = this.wireDrag.side==='in'
          ? {id:this.wireDrag.nodeId, p:this.wireDrag.idx}
          : {id:port.node.id, p:port.idx};
        if (addWire(S, out.id, out.p, inn.id, inn.p)){
          UI.blip(740, 0.08, 0.04);
          const dst = getNode(S, inn.id);
          if (dst){
            const pp = portPos(dst, 'in', inn.p);
            fxBurst(pp.x, pp.y, RES[this.wireDrag.res].color, 7, 16);
          }
        } else UI.blip(220);
      }
      this.wireDrag = null;
      this.downAt = null;
      return;
    }
    if (this.drag && this.drag.kind==='node' && this.downAt && !this.downAt.moved){
      S.sel = this.drag.id;
      UI.blip(500, 0.04, 0.03);
    } else if (this.drag && this.drag.kind==='pan' && this.downAt && !this.downAt.moved){
      S.sel = null;
    }
    this.drag = null;
    this.downAt = null;
  },

  wheel(e){
    e.preventDefault();
    if (UI.modalOpen()) return;
    const before = screenToWorld(e.clientX, e.clientY);
    cam.z = clamp(cam.z * (e.deltaY>0 ? 0.88 : 1.14), 0.35, 2.2);
    const after = screenToWorld(e.clientX, e.clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  },

  key(e){
    if (UI.modalOpen()) return;
    if (e.key === 'Escape'){ this.placing = null; S.sel = null; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel){
      const n = getNode(S, S.sel);
      if (n){
        const px = n.x, py = n.y, hue = DEF(n).hue||'#69e0ff';
        if (sellNode(S, n)){ UI.blip(300); fxBurst(px, py, hue, 12, 40); }
      }
    }
  },
};
