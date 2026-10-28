(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D__) return;
  window.__COSMOSIM_BLACKHOLE_4D__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const state = {
    on: false, mass: 10, zoom: 1, minZoom: .5, maxZoom: 4,
    w: 1, h: 1, dpr: 1, raf: 0, last: 0,
    drag: false, dx: 0, dy: 0, ox: 0, oy: 0
  };

  const css = document.createElement('style');
  css.textContent = `
    #cosmosim4DButton{width:100%;margin-top:8px;background:linear-gradient(135deg,#171c2d,#39435f);border:1px solid #93a4cf;color:#f5f7ff}
    #cosmosim4DButton.is-on{background:#f5f7ff;color:#05070d;border-color:#fff;box-shadow:0 0 20px #fff8}
    /* The 4D renderer is a child of #space, so the normal COSMOSIM HUD stays above it. */
    #cosmosim4DStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:5;touch-action:none}
    #cosmosim4DStage.is-on{display:block}
    #cosmosim4DCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}
    #cosmosim4DCanvas.dragging{cursor:grabbing}
    #cosmosim4DBadge{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:7px 11px;border:1px solid #fff4;border-radius:999px;background:#000b;color:#fff;font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;pointer-events:none;white-space:nowrap}
  `;
  document.head.appendChild(css);

  const viewport = $('#space');
  if (!viewport) return;
  const stage = document.createElement('div');
  stage.id = 'cosmosim4DStage';
  stage.innerHTML = '<canvas id="cosmosim4DCanvas" aria-label="Black hole 4D vision"></canvas><div id="cosmosim4DBadge">4D VISION · SCHWARZSCHILD SPACETIME</div>';
  viewport.appendChild(stage);
  const canvas = $('#cosmosim4DCanvas', stage);
  const ctx = canvas.getContext('2d');

  function resize() {
    const r = stage.getBoundingClientRect();
    state.w = Math.max(1, r.width); state.h = Math.max(1, r.height);
    state.dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function currentMass() {
    const el = $('#mass');
    const m = el ? Number(el.value) : state.mass;
    return state.mass = Number.isFinite(m) ? Math.max(1, Math.min(50, m)) : 10;
  }

  // Schwarzschild radius: Rs = 2GM/c². For the visualization we normalize
  // Rs to the viewport; its dependence on mass remains linear.
  function warp(x, y, cx, cy, curvature) {
    const dx = x - cx, dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r < 0.001) return {x:cx,y:cy};
    const scale = Math.min(state.w, state.h);
    const rs = Math.max(12, scale * .020) * (state.mass / 10) * state.zoom;
    const range = Math.max(150, scale * .78) * state.zoom;
    const core = Math.max(18, scale * .055) * state.zoom;
    const u = Math.min(1, r / range);
    // Smooth inward radial displacement. No line is allowed to wander sideways:
    // every point moves only toward the common black-hole centre.
    const potential = Math.pow(Math.max(0, 1 - u), 2.25);
    const schwarzschildTerm = Math.min(.88, rs / Math.max(r, rs));
    const pull = range * curvature * (.18 * schwarzschildTerm + .42 * potential * schwarzschildTerm);
    const targetR = Math.max(core * .48, r - pull);
    const k = targetR / r;
    return {x:cx + dx*k, y:cy + dy*k};
  }

  function drawGrid(cx, cy, curvature) {
    const spacing = Math.max(22, 42 / Math.sqrt(state.zoom));
    const span = Math.max(state.w, state.h) * 1.9 / state.zoom;
    const count = Math.ceil(span / spacing);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.27)';
    ctx.lineWidth = .65;
    for (let i=-count;i<=count;i++) {
      const x = cx + i*spacing + state.ox;
      ctx.beginPath();
      for (let j=-count;j<=count;j++) {
        const p = warp(x, cy+j*spacing+state.oy, cx, cy, curvature);
        if (j===-count) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    for (let j=-count;j<=count;j++) {
      const y = cy + j*spacing + state.oy;
      ctx.beginPath();
      for (let i=-count;i<=count;i++) {
        const p = warp(cx+i*spacing+state.ox, y, cx, cy, curvature);
        if (i===-count) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCurvatureRings(cx, cy, curvature) {
    const max = Math.max(state.w,state.h)*.82/state.zoom;
    ctx.save();
    for (let i=1;i<=48;i++) {
      const r=max*i/48;
      ctx.beginPath();
      for (let a=0;a<=Math.PI*2+.02;a+=.025) {
        const p=warp(cx+Math.cos(a)*r+state.ox,cy+Math.sin(a)*r*.76+state.oy,cx,cy,curvature*.92);
        if(a===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle=`rgba(255,255,255,${.13*(1-i/55)})`;
      ctx.lineWidth=i<9?1:.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBlackHole(cx, cy, m) {
    const base=Math.max(18,Math.min(state.w,state.h)*(.035+m*.0013))*state.zoom;
    const photon=base*1.85;
    const glow=ctx.createRadialGradient(cx,cy,base*.2,cx,cy,photon*3);
    glow.addColorStop(0,'rgba(255,255,255,.34)');
    glow.addColorStop(.25,'rgba(255,255,255,.15)');
    glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,photon*3,0,Math.PI*2);ctx.fill();

    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.34);ctx.shadowColor='#fff';
    for(let i=0;i<20;i++){
      ctx.beginPath();ctx.arc(0,0,photon*(.72+i*.024),0,Math.PI*2);
      ctx.strokeStyle=`rgba(255,255,255,${.055+(20-i)*.035})`;
      ctx.lineWidth=1.1+i*.25;ctx.shadowBlur=9+i*.55;ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,base,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(cx,cy,base,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,base*.035);ctx.shadowColor='#fff';ctx.shadowBlur=20;ctx.stroke();ctx.shadowBlur=0;
  }

  function frame(){
    if(!state.on){state.raf=0;return;}
    ctx.clearRect(0,0,state.w,state.h);ctx.fillStyle='#000';ctx.fillRect(0,0,state.w,state.h);
    const cx=state.w/2+state.ox,cy=state.h/2+state.oy,m=currentMass();
    const curvature=Math.min(1.8,.44*(m/10));
    drawGrid(cx,cy,curvature);drawCurvatureRings(cx,cy,curvature);drawBlackHole(cx,cy,m);
    state.raf=requestAnimationFrame(frame);
  }

  // The existing 3D Black Hole is the only underlying canvas. We hide it only
  // while 4D mode is active, then restore its exact prior display state.
  const originals=()=>[...viewport.querySelectorAll('canvas:not(#cosmosim4DCanvas)')];
  function setOriginalVisible(show){
    originals().forEach(n=>{
      if(show){n.style.display=n.dataset.cosmosim4dDisplay||'';n.style.visibility=n.dataset.cosmosim4dVisibility||'';}
      else{n.dataset.cosmosim4dDisplay=n.style.display;n.dataset.cosmosim4dVisibility=n.style.visibility;n.style.display='none';n.style.visibility='hidden';}
    });
  }

  function setEnabled(on){
    state.on=!!on;stage.classList.toggle('is-on',state.on);setOriginalVisible(!state.on);
    const b=$('#cosmosim4DButton');
    if(b){b.classList.toggle('is-on',state.on);b.textContent=state.on?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';b.setAttribute('aria-pressed',String(state.on));}
    if(state.on){resize();state.last=performance.now();if(!state.raf)state.raf=requestAnimationFrame(frame);}
    else{if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;ctx.clearRect(0,0,state.w,state.h);}
  }

  function zoomAt(factor,x,y){
    const old=state.zoom,n=Math.max(state.minZoom,Math.min(state.maxZoom,old*factor));
    if(n===old)return;state.zoom=n;
    if(x!=null){const r=stage.getBoundingClientRect(),px=x-r.left-state.w/2,py=y-r.top-state.h/2,z=n/old;state.ox=px-(px-state.ox)*z;state.oy=py-(py-state.oy)*z;}
  }
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.12:.89,e.clientX,e.clientY)},{passive:false});
  canvas.addEventListener('pointerdown',e=>{state.drag=true;state.dx=e.clientX;state.dy=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!state.drag)return;state.ox+=e.clientX-state.dx;state.oy+=e.clientY-state.dy;state.dx=e.clientX;state.dy=e.clientY});
  const end=e=>{state.drag=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId)}catch(_){}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);

  const touches=new Map();let pinch=0;
  canvas.addEventListener('touchstart',e=>{for(const t of e.changedTouches)touches.set(t.identifier,[t.clientX,t.clientY]);if(touches.size===2){const a=[...touches.values()];pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}},{passive:false});
  canvas.addEventListener('touchmove',e=>{if(touches.size!==2)return;e.preventDefault();for(const t of e.changedTouches)touches.set(t.identifier,[t.clientX,t.clientY]);const a=[...touches.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(pinch)zoomAt(d/pinch);pinch=d},{passive:false});
  const touchEnd=e=>{for(const t of e.changedTouches)touches.delete(t.identifier);if(touches.size<2)pinch=0};
  canvas.addEventListener('touchend',touchEnd,{passive:false});canvas.addEventListener('touchcancel',touchEnd,{passive:false});

  function installButton(){
    if($('#cosmosim4DButton'))return;const p=$('#panelBody');if(!p)return;
    const b=document.createElement('button');b.id='cosmosim4DButton';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.title='Black Hole 4D spacetime view';b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(window.__COSMOSIM_ACTIVE_SIM__&&window.__COSMOSIM_ACTIVE_SIM__!=='blackhole')return;setEnabled(!state.on)});p.appendChild(b);
  }
  document.querySelectorAll('.simChoice').forEach(b=>b.addEventListener('click',()=>{window.__COSMOSIM_ACTIVE_SIM__=b.dataset.sim;if(b.dataset.sim!=='blackhole')setEnabled(false)}));
  const observer=new MutationObserver(installButton);observer.observe(document.body,{childList:true,subtree:true});installButton();
  addEventListener('resize',resize);
})();
