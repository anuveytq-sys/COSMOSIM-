(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D__) return;
  window.__COSMOSIM_BLACKHOLE_4D__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const state = { on:false, mass:10, zoom:1, minZoom:.55, maxZoom:4.5, w:1, h:1, dpr:1, raf:0, last:0, t:0, panX:0, panY:0, drag:false, dx:0, dy:0, pinch:0, stars:[] };

  const css = document.createElement('style');
  css.textContent = `
    #cosmosim4DButton{width:100%;margin-top:8px;background:linear-gradient(135deg,#171c2d,#39435f);border:1px solid #93a4cf;color:#f5f7ff}
    #cosmosim4DButton.is-on{background:#f5f7ff;color:#05070d;border-color:#fff;box-shadow:0 0 20px #fff8}
    #cosmosim4DStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:5;touch-action:none}
    #cosmosim4DStage.is-on{display:block}
    #cosmosim4DCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}
    #cosmosim4DCanvas.dragging{cursor:grabbing}
    #cosmosim4DBadge{position:absolute;left:50%;top:12px;transform:translateX(-50%);padding:7px 11px;border:1px solid #fff4;border-radius:999px;background:#000b;color:#fff;font:700 9px/1 ui-monospace,monospace;letter-spacing:.12em;pointer-events:none;white-space:nowrap}
  `;
  document.head.appendChild(css);

  const viewport = $('#space');
  if (!viewport) return;
  const stage = document.createElement('div');
  stage.id = 'cosmosim4DStage';
  stage.innerHTML = '<canvas id="cosmosim4DCanvas" aria-label="Black hole 4D vision"></canvas><div id="cosmosim4DBadge">4D VISION · SCHWARZSCHILD SPACETIME</div>';
  viewport.appendChild(stage);
  const canvas = $('#cosmosim4DCanvas', stage);
  const ctx = canvas.getContext('2d', { alpha:false });

  function resize(){
    const r=stage.getBoundingClientRect();
    state.w=Math.max(1,r.width); state.h=Math.max(1,r.height); state.dpr=Math.min(2,devicePixelRatio||1);
    canvas.width=Math.floor(state.w*state.dpr); canvas.height=Math.floor(state.h*state.dpr);
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    if(!state.stars.length) seedStars();
  }

  function currentMass(){
    const el=$('#mass'); const m=el?Number(el.value):state.mass;
    state.mass=Number.isFinite(m)?Math.max(1,Math.min(50,m)):10; return state.mass;
  }

  function seedStars(){
    const n=Math.min(520,Math.max(220,Math.floor(state.w*state.h/9000)));
    state.stars=Array.from({length:n},(_,i)=>({
      x:((Math.sin(i*12.9898)*43758.5453)%1+1)%1,
      y:((Math.sin(i*78.233+17.1)*43758.5453)%1+1)%1,
      s:.25+((i*37%100)/100)*1.35,
      a:.18+((i*53%100)/100)*.62
    }));
  }

  // Schwarzschild radius: Rs = 2GM/c². The mass relationship is retained,
  // then normalised to the viewport so the lab remains visually readable.
  function radii(mass){
    const unit=Math.min(state.w,state.h);
    const rs=Math.max(8,unit*.014)*(mass/6)*state.zoom;
    return {rs,photon:rs*1.5,shadow:rs*2.6,disk:rs*4.8};
  }

  // Weak-field light deflection: alpha ≈ 4GM/(c²b) = 2Rs/b.
  function gravitationalDeflection(r,mass){
    const rs=radii(mass).rs; const b=Math.max(r,rs*1.02);
    return Math.min(1.65,2*rs/b);
  }

  // Embedding-diagram-inspired Schwarzschild spatial slice. The steep rise
  // close to Rs creates the visible funnel/depth rather than a flat sheet.
  function funnelDepth(r,mass){
    const rs=radii(mass).rs; const u=Math.max(0,r-rs*1.05);
    return 2.0*Math.sqrt(rs*u);
  }

  function project(r,a,mass,cx,cy){
    const rs=radii(mass).rs;
    const z=funnelDepth(r,mass);
    const deflection=gravitationalDeflection(r,mass);
    const bentR=Math.max(rs*.96,r*(1-.22*deflection));
    const x=cx+Math.cos(a)*bentR+state.panX;
    const y=cy+Math.sin(a)*bentR*.54-z*.43+state.panY;
    return {x,y,z,r:bentR};
  }

  function strokePath(points,alpha,width,glow=0){
    if(points.length<2)return;
    ctx.save(); ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=`rgba(245,248,255,${alpha})`; ctx.lineWidth=width;
    if(glow){ctx.shadowBlur=glow;ctx.shadowColor='#fff';}
    ctx.stroke(); ctx.restore();
  }

  function drawStars(cx,cy,mass){
    const lens=radii(mass).shadow*1.9;
    for(const s of state.stars){
      const x=s.x*state.w,y=s.y*state.h,dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy);
      let sx=x,sy=y;
      if(r<lens&&r>1){const pull=Math.min(.34,(lens-r)/lens*.30);sx=cx+dx*(1-pull);sy=cy+dy*(1-pull);}
      ctx.fillStyle=`rgba(255,255,255,${s.a})`;ctx.beginPath();ctx.arc(sx,sy,s.s,0,Math.PI*2);ctx.fill();
    }
  }

  function drawFunnelGrid(cx,cy,mass){
    const unit=Math.min(state.w,state.h),maxR=Math.max(state.w,state.h)*.92/state.zoom,rs=radii(mass).rs;
    const rings=Math.max(25,Math.min(46,Math.floor(unit/18))),spokes=64;

    // Curved latitude rings on the Schwarzschild funnel.
    for(let i=0;i<rings;i++){
      const u=i/(rings-1),r=rs*1.03+Math.pow(u,1.25)*maxR,pts=[];
      for(let k=0;k<=240;k++){const a=k/240*Math.PI*2;pts.push(project(r,a,mass,cx,cy));}
      const depth=Math.max(0,Math.min(1,(r-rs)/maxR));
      strokePath(pts,.12+.16*(1-depth),i<4?1:.62,i<3?4:0);
    }

    // Radial tracks: every line follows the same inward gravitational
    // deflection field, so there are no wandering/free-floating grid lines.
    for(let i=0;i<spokes;i++){
      const a0=i/spokes*Math.PI*2,pts=[];
      for(let j=0;j<=70;j++){
        const u=j/70,r=rs*1.02+Math.pow(u,.78)*maxR,bend=gravitationalDeflection(r,mass);
        const a=a0+(Math.PI/18)*bend*Math.sign(Math.sin(a0*2+.3));
        pts.push(project(r,a,mass,cx,cy));
      }
      strokePath(pts,.14+.09*(i%4===0),.55);
    }

    // Dense inner mesh: strongest curvature is concentrated around the hole.
    for(let i=0;i<13;i++){
      const r=rs*(1.04+i*.22),pts=[];
      for(let k=0;k<=220;k++){const a=k/220*Math.PI*2;pts.push(project(r,a,mass,cx,cy));}
      strokePath(pts,.18-i*.008,1,i<2?6:0);
    }
  }

  function drawLensingArcs(cx,cy,mass){
    const {photon,shadow}=radii(mass);
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.55);
    for(let n=0;n<7;n++){
      const rr=shadow*(1.10+n*.22);
      ctx.beginPath();ctx.arc(0,0,rr,Math.PI*.08,Math.PI*.92);ctx.strokeStyle=`rgba(255,255,255,${.06+.025*(6-n)})`;ctx.lineWidth=1.1;ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,rr,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
    }
    ctx.restore();
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.55);ctx.beginPath();ctx.arc(0,0,photon,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=Math.max(1.4,radii(mass).rs*.055);ctx.shadowBlur=18;ctx.shadowColor='#fff';ctx.stroke();ctx.restore();
  }

  function drawAccretionDisk(cx,cy,mass,time){
    const {rs,disk}=radii(mass),inner=rs*2.2,outer=disk;
    ctx.save();ctx.translate(cx,cy-rs*.06);ctx.rotate(-.08);ctx.scale(1,.27);
    for(let layer=0;layer<10;layer++){
      const r=inner+(outer-inner)*layer/10;ctx.beginPath();ctx.arc(0,0,r,Math.PI*.04,Math.PI*1.96);
      const phase=time*(.55+layer*.018),front=.34+.16*Math.sin(phase+layer*.7);
      ctx.strokeStyle=`rgba(255,255,255,${front})`;ctx.lineWidth=Math.max(1.2,rs*(.055-layer*.002));ctx.shadowBlur=layer<3?16:5;ctx.shadowColor='#fff';ctx.stroke();
    }
    for(let i=0;i<110;i++){
      const f=i/110,r=inner+(outer-inner)*f,a=(i*2.399+time*(.18+f*.26))%(Math.PI*2),x=Math.cos(a)*r,y=Math.sin(a)*r;
      const alpha=.08+.30*(1-f)+.12*Math.max(0,Math.cos(a));ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.beginPath();ctx.arc(x,y,Math.max(.45,rs*.018*(1-f*.45)),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function drawBlackHole(cx,cy,mass){
    const {rs,shadow,photon}=radii(mass);
    const halo=ctx.createRadialGradient(cx,cy,shadow*.25,cx,cy,shadow*2.5);
    halo.addColorStop(0,'rgba(255,255,255,.18)');halo.addColorStop(.25,'rgba(255,255,255,.08)');halo.addColorStop(.6,'rgba(255,255,255,.025)');halo.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,shadow*2.5,0,Math.PI*2);ctx.fill();

    // Deep central shadow: the event horizon itself emits no light.
    const core=ctx.createRadialGradient(cx,cy-rs*.18,rs*.08,cx,cy,rs*1.35);
    core.addColorStop(0,'#000');core.addColorStop(.75,'#000');core.addColorStop(1,'#080808');
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,rs*1.04,0,Math.PI*2);ctx.fill();

    // Relativistic photon ring / critical curve: r_ph = 3sqrt(3)GM/c² = 1.5Rs.
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.55);
    ctx.beginPath();ctx.arc(0,0,photon,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.90)';ctx.lineWidth=Math.max(1.5,rs*.065);ctx.shadowBlur=24;ctx.shadowColor='#fff';ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,photon*1.13,Math.PI*.12,Math.PI*.94);ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=Math.max(1,rs*.035);ctx.stroke();
    ctx.restore();

    // Foreground rim supplies a spherical depth cue without drawing a fake surface.
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.56);ctx.beginPath();ctx.arc(0,0,rs*1.03,Math.PI*.08,Math.PI*1.92);ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=Math.max(1,rs*.025);ctx.stroke();ctx.restore();
  }

  function draw(){
    if(!state.on){state.raf=0;return;}
    const now=performance.now(),dt=Math.min(.05,(now-state.last)/1000||0);state.last=now;state.t+=dt;
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,state.w,state.h);
    const mass=currentMass(),cx=state.w*.5,cy=state.h*.57;
    drawStars(cx,cy,mass);drawFunnelGrid(cx,cy,mass);drawLensingArcs(cx,cy,mass);drawAccretionDisk(cx,cy,mass,state.t);drawBlackHole(cx,cy,mass);
    state.raf=requestAnimationFrame(draw);
  }

  // Hide only the original simulation canvas while 4D is active. Restore its
  // exact prior inline state when 4D is switched off.
  const originals=()=>[...viewport.querySelectorAll('canvas:not(#cosmosim4DCanvas)')];
  function setOriginalVisible(show){
    originals().forEach(node=>{
      if(show){node.style.display=node.dataset.cosmosim4dDisplay||'';node.style.visibility=node.dataset.cosmosim4dVisibility||'';}
      else{node.dataset.cosmosim4dDisplay=node.style.display;node.dataset.cosmosim4dVisibility=node.style.visibility;node.style.display='none';node.style.visibility='hidden';}
    });
  }

  function setEnabled(on){
    state.on=!!on;stage.classList.toggle('is-on',state.on);setOriginalVisible(!state.on);
    const b=$('#cosmosim4DButton');
    if(b){b.classList.toggle('is-on',state.on);b.textContent=state.on?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';b.setAttribute('aria-pressed',String(state.on));}
    if(state.on){resize();state.last=performance.now();if(!state.raf)state.raf=requestAnimationFrame(draw);}
    else{if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;ctx.clearRect(0,0,state.w,state.h);}
  }

  function zoomAt(factor,x,y){
    const old=state.zoom,next=Math.max(state.minZoom,Math.min(state.maxZoom,old*factor));if(next===old)return;state.zoom=next;
    if(x!=null){const r=stage.getBoundingClientRect(),px=x-r.left-state.w/2,py=y-r.top-state.h/2,z=next/old;state.panX=px-(px-state.panX)*z;state.panY=py-(py-state.panY)*z;}
  }
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.13:.885,e.clientX,e.clientY);},{passive:false});
  canvas.addEventListener('pointerdown',e=>{state.drag=true;state.dx=e.clientX;state.dy=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!state.drag)return;state.panX+=e.clientX-state.dx;state.panY+=e.clientY-state.dy;state.dx=e.clientX;state.dy=e.clientY;});
  const end=e=>{state.drag=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId);}catch(_){} };canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);

  const touches=new Map();
  canvas.addEventListener('touchstart',e=>{for(const t of e.changedTouches)touches.set(t.identifier,[t.clientX,t.clientY]);if(touches.size===2){const a=[...touches.values()];state.pinch=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);}},{passive:false});
  canvas.addEventListener('touchmove',e=>{if(touches.size!==2)return;e.preventDefault();for(const t of e.changedTouches)touches.set(t.identifier,[t.clientX,t.clientY]);const a=[...touches.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);if(state.pinch)zoomAt(d/state.pinch);state.pinch=d;},{passive:false});
  const touchEnd=e=>{for(const t of e.changedTouches)touches.delete(t.identifier);if(touches.size<2)state.pinch=0;};canvas.addEventListener('touchend',touchEnd,{passive:false});canvas.addEventListener('touchcancel',touchEnd,{passive:false});

  function installButton(){
    if($('#cosmosim4DButton'))return;const p=$('#panelBody');if(!p)return;
    const b=document.createElement('button');b.id='cosmosim4DButton';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.title='Black Hole 4D spacetime view';b.setAttribute('aria-pressed','false');
    b.addEventListener('click',()=>{if(window.__COSMOSIM_ACTIVE_SIM__&&window.__COSMOSIM_ACTIVE_SIM__!=='blackhole')return;setEnabled(!state.on);});p.appendChild(b);
  }
  document.querySelectorAll('.simChoice').forEach(b=>b.addEventListener('click',()=>{window.__COSMOSIM_ACTIVE_SIM__=b.dataset.sim;if(b.dataset.sim!=='blackhole')setEnabled(false);}));
  const observer=new MutationObserver(installButton);observer.observe(document.body,{childList:true,subtree:true});installButton();addEventListener('resize',resize);
})();
