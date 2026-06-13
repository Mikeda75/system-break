'use strict';
/* =========================================================
   SYSTEM BREAK — boot & main loop.
   ========================================================= */

let lastT = 0, saveT = 0;

function boot(){
  renderInit();
  UI.init();
  Input.init(CV);
  S = newGame(true);      // provisional backdrop game — replaced at the title screen
  requestAnimationFrame(loop);
}

function loop(now){
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (now - lastT)/1000 || 0);
  lastT = now;

  UI.storyTick(dt);

  const uiPaused = UI.modalOpen();
  if (S && !uiPaused){
    const sdt = dt * S.speed;
    // sub-step for stability at high speed
    const steps = Math.max(1, Math.ceil(sdt/0.05));
    for (let i=0;i<steps;i++) simTick(S, sdt/steps);

    saveT += dt;
    if (saveT > 15){ saveT = 0; saveGame(S); }
  }

  if (S) draw(S, dt, now);
  if (S && !uiPaused) UI.refresh(S);
}

boot();
