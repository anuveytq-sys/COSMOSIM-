(()=>{
'use strict';
if(window.__COSMOSIM_BLACKHOLE_4D_V6__)return;
window.__COSMOSIM_BLACKHOLE_4D_V6__=1;
const root=document.getElementById('space');
if(!root)return;
const css=document.createElement('style');
css.textContent=`#cosmosim4dToggle{width:100%;margin-top:8px;background:#090d15;border:1px solid #e9edf7;color:#fff}#cosmosim4dToggle.on{background:#fff;color:#000;box-shadow:0 0 22px rgba(255,255,255,.45)}#cosmosim4dStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:1}#cosmosim4dStage.on{display:block}#cosmosim4dCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}#cosmosim4dCanvas.dragging{cursor:grabbing}#cosmosim4dBadge{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;padding:7px 12px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:800 9px/1.1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.14em;white-space:nowrap;text-shadow:0 0 7px #fff}#cosmosim4dHint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;color:rgba(255,255,255,.62);font:700 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em;white-space:nowrap}body.cosmosim4d-on #space>canvas:not(#cosmosim4dCanvas){visibility:hidden!important}@media(max-width:520px){#cosmosim4dBadge{top:8px;font-size:7px;max-width:88vw;overflow:hidden;text-overflow:ellipsis}#cosmosim4dHint{font-size:7px;bottom:7px}}`;
document.head.appendChild(css);
const stage=document.createElement('div');stage.id='cosmosim4dStage';stage.innerHTML='<canvas id="cosmosim4dCanvas"></canvas><div id="cosmosim4dBadge">4D VISION · 3D SCHWARZSCHILD SPACETIME FABRIC</div><div id="cosmosim4dHint">DRAG · ROTATE / PAN &nbsp; SCROLL · ZOOM &nbsp; PINCH · ZOOM</div>';root.appendChild(stage);
const canvas=stage.querySelector('#cosmosim4dCanvas'),ctx=canvas.getContext('2d',{alpha:false});
const S={active:false,mass:10,zoom:.92,yaw:-.58,pitch:.46,panX:0,panY:0,dpr:1,w:1,h:1,last:0,raf:0,drag:false,lx:0,ly:0,pinch:0};
const stars=[];for(let i=0;i<1100;i++){const r=48+Math.random()*165,az=Math.random()*Math.PI*2,el=Math.asin(2*Math.random()-1);stars.push({x:r*Math.cos(el)*Math.cos(az),y:r*Math.sin(el),z:r*Math.cos(el)*Math.sin(az),tw:Math.random()*6.28,s:.25+Math.random()*1.05});}
function resize(){S.w=Math.max(1,stage.clientWidth);S.h=Math.max(1,stage.clientHeight);S.dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.floor(S.w*S.dpr);canvas.height=Math.floor(S.h*S.dpr);ctx.setTransform(S.dpr,0,0,S.dpr,0,0)}
function massValue(){const e=document.getElementById('mass'),m=Number(e?.value);return Number.isFinite(m)?Math.max(3,Math.min(50,m)):S.mass}
function rsKm(M){return 2.95325008*M}
function rs(M){return .34*Math.pow(M/10,.82)}
function rotate(p){const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),cp=Math.cos(S.pitch),sp=Math.sin(S.pitch),x=p.x*cy-p.z*sy,z0=p.x*sy+p.z*cy;return{x,y:p.y*cp-z0*sp,z:p.y*sp+z0*cp}}
function project(p){const q=rotate(p),cam=29/S.zoom,depth=cam-q.z;if(depth<1.2)return null;const f=Math.min(S.w,S.h)*.94*cam/depth;return{x:S.w*.5+q.x*f+S.panX,y:S.h*.53-q.y*f+S.panY,z:q.z,depth}}
// Strong, monotonic Schwarzschild-inspired inward compression for the visible fabric.
// The old field was too weak outside the event-horizon scale to produce visible
// curvature. This mapping keeps the outer grid recognizable while increasingly
// compressing every spatial direction toward the black-hole centre.
function warp(p,M){
 const r=Math.hypot(p.x,p.y,p.z);
 if(r<1e-6)return{x:0,y:0,z:0};
 const R=rs(M);
 const t=R/(r+R);
 const pull=Math.min(.94,(.06+.94*Math.pow(t,.55))*Math.exp(-r/22));
 const s=Math.max(.055,1-pull);
 return{x:p.x*s,y:p.y*s,z:p.z*s};
}
function stroke(points,a,w){if(points.length<2)return;ctx.beginPath();let started=false;for(const p of points){if(!p){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=w;ctx.stroke()}
function avgDepth(points){let d=0,n=0;for(const p of points){if(p){d+=p.depth;n++}}return n?d/n:28}
function gridAlpha(points,base){const z=avgDepth(points);const depth=Math.max(.62,Math.min(1.16,1-(z-8)*.010));return base*depth}
function drawStars(M){const cx=S.w*.5+S.panX,cy=S.h*.53+S.panY,R=rs(M);for(const st of stars){const p=project(warp(st,M));if(!p)continue;const d=Math.hypot(st.x,st.y,st.z),lens=Math.min(.30,(R*R*3.2)/Math.max(1,d*d)),x=p.x+(p.x-cx)*lens,y=p.y+(p.y-cy)*lens,alpha=.13+.45*(.5+.5*Math.sin(S.last*.00035+st.tw));ctx.fillStyle=`rgba(255,255,255,${alpha})`;const sz=Math.max(.35,st.s*(1+Math.max(0,p.depth)/80));ctx.fillRect(x,y,sz,sz)}}
function drawVolumetricGrid(M){
 const max=14.5,levels=17,step=max*2/(levels-1),N=100;
 // Three complete orthogonal line families make the fabric volumetric rather than a single plane.
 for(const axis of ['x','y','z']){
  for(let a=0;a<levels;a++) for(let b=0;b<levels;b++){
   const c1=-max+a*step,c2=-max+b*step,pts=[];
   for(let i=0;i<=N;i++){
    const u=-max+2*max*i/N;
    let p;
    if(axis==='x')p={x:u,y:c1,z:c2};
    else if(axis==='y')p={x:c1,y:u,z:c2};
    else p={x:c1,y:c2,z:u};
    pts.push(project(warp(p,M)));
   }
   // Uniform grid weight: no special center lines and no random highlighted tracks.
   stroke(pts,gridAlpha(pts,.105),.78);
  }
 }
 // Additional curved depth rings reinforce that the fabric surrounds the hole in all directions.
 for(let ring=0;ring<15;ring++){
  const r=1.15+ring*(max-1.15)/14;
  for(let lat=0;lat<9;lat++){
   const el=-Math.PI/2+(lat+1)*Math.PI/10,ce=Math.cos(el),se=Math.sin(el),pts=[];
   for(let k=0;k<=150;k++){const a=k/150*Math.PI*2;pts.push(project(warp({x:r*ce*Math.cos(a),y:r*se,z:r*ce*Math.sin(a)},M)))}
   stroke(pts,gridAlpha(pts,.070),.62);
  }
  for(let lon=0;lon<16;lon++){
   const a=lon/16*Math.PI*2,pts=[];
   for(let k=0;k<=100;k++){const el=-Math.PI/2+k/100*Math.PI,ce=Math.cos(el),se=Math.sin(el);pts.push(project(warp({x:r*ce*Math.cos(a),y:r*se,z:r*ce*Math.sin(a)},M)))}
   stroke(pts,gridAlpha(pts,.070),.62);
  }
 }
 // A sparse radial geodesic family makes the inward direction explicit without overpowering the Cartesian fabric.
 const rays=44;
 for(let i=0;i<rays;i++){
  const az=i/rays*Math.PI*2,el=-.82+((i*11)%23)/22*1.64,ce=Math.cos(el),se=Math.sin(el),pts=[];
  for(let j=0;j<=80;j++){const r=.38+max*j/80;pts.push(project(warp({x:r*ce*Math.cos(az),y:r*se,z:r*ce*Math.sin(az)},M)))}
  stroke(pts,gridAlpha(pts,.060),.58);
 }
}
function drawAccretion(M){const R=rs(M),tilt=.38,rows=10,seg=260;for(let j=0;j<rows;j++){const rad=Math.max(R*1.75,2)+j*.68,pts=[];for(let k=0;k<=seg;k++){const a=k/seg*Math.PI*2,wob=.018*Math.sin(a*7+j),x=rad*Math.cos(a),z=rad*Math.sin(a),y=z*tilt+wob;pts.push(project(warp({x,y,z},M)))}stroke(pts,.085+j*.018,1+j*.08)}for(let i=0;i<1000;i++){const baseR=2+((i*37)%1000)/1000*6,a=i/1000*Math.PI*2*7,z=baseR*Math.sin(a),x=baseR*Math.cos(a),y=z*tilt+Math.sin(i*2.1)*.04,p=project(warp({x,y,z},M));if(!p)continue;const hot=Math.max(.18,1-baseR/8);ctx.fillStyle=`rgba(255,255,255,${.16+.55*hot})`;ctx.fillRect(p.x,p.y,1.0+.65*hot,1.0+.65*hot)}}
function drawPhotonRing(M){const R=rs(M),cx=S.w*.5+S.panX,cy=S.h*.53+S.panY,shadowR=R*1.42;for(let k=0;k<7;k++){const r=shadowR*(1.01+k*.028);ctx.save();ctx.translate(cx,cy);ctx.rotate(-.1);ctx.scale(1,.48);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${.09+.035*(7-k)})`;ctx.lineWidth=.7+k*.13;ctx.shadowBlur=5+k*.6;ctx.shadowColor='#fff';ctx.stroke();ctx.restore()}ctx.shadowBlur=0}
function drawBlackHole(M){const R=rs(M),cx=S.w*.5+S.panX,cy=S.h*.53+S.panY,shadowR=R*1.42,halo=ctx.createRadialGradient(cx,cy,shadowR*.45,cx,cy,shadowR*2.35);halo.addColorStop(0,'rgba(255,255,255,0)');halo.addColorStop(.48,'rgba(255,255,255,.035)');halo.addColorStop(.72,'rgba(255,255,255,.14)');halo.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,shadowR*2.35,0,Math.PI*2);ctx.fill();drawPhotonRing(M);const g=ctx.createRadialGradient(cx-R*.25,cy-R*.22,R*.08,cx,cy,shadowR);g.addColorStop(0,'#000');g.addColorStop(.72,'#000');g.addColorStop(.92,'rgba(0,0,0,.98)');g.addColorStop(1,'rgba(0,0,0,.12)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,shadowR,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(cx,cy);ctx.rotate(-.1);ctx.scale(1,.48);ctx.beginPath();ctx.arc(0,0,shadowR*1.025,Math.PI*.08,Math.PI*1.08);ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=1.3;ctx.shadowBlur=16;ctx.shadowColor='#fff';ctx.stroke();ctx.restore();ctx.shadowBlur=0}
function render(){if(!S.active){S.raf=0;return}S.mass=massValue();ctx.setTransform(S.dpr,0,0,S.dpr,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,S.w,S.h);drawStars(S.mass);drawVolumetricGrid(S.mass);drawAccretion(S.mass);drawBlackHole(S.mass);ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='700 8px ui-monospace,SFMono-Regular,monospace';ctx.fillText('Rs = '+rsKm(S.mass).toFixed(1)+' km  ·  α = 4GM/(bc²) = 2Rs/b  ·  STATIC ISOTROPIC CURVATURE  ·  MASS '+S.mass.toFixed(1)+' M☉',12,S.h-12);S.raf=requestAnimationFrame(render)}
function hideOriginal(on){root.querySelectorAll('canvas').forEach(c=>{if(c!==canvas)c.style.visibility=on?'hidden':''})}
function set(on){S.active=!!on;stage.classList.toggle('on',S.active);document.body.classList.toggle('cosmosim4d-on',S.active);hideOriginal(S.active);const b=document.getElementById('cosmosim4dToggle');if(b){b.classList.toggle('on',S.active);b.textContent=S.active?'◉ 4D VISION · ON':'◉ 4D VISION · OFF'}if(S.active){resize();S.last=performance.now();if(!S.raf)S.raf=requestAnimationFrame(render)}else if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}}
function installButton(){if(document.getElementById('cosmosim4dToggle'))return;const p=document.getElementById('panelBody');if(!p)return;const b=document.createElement('button');b.id='cosmosim4dToggle';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.onclick=()=>{const active=document.querySelector('.simChoice.active')?.dataset.sim;if(active==='blackhole'||!active)set(!S.active)};p.appendChild(b)}
canvas.addEventListener('wheel',e=>{if(!S.active)return;e.preventDefault();S.zoom=Math.max(.42,Math.min(2.8,S.zoom*Math.exp(-e.deltaY*.001)))} ,{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!S.active)return;S.drag=true;S.lx=e.clientX;S.ly=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!S.active||!S.drag)return;const dx=e.clientX-S.lx,dy=e.clientY-S.ly;S.lx=e.clientX;S.ly=e.clientY;S.yaw+=dx*.006;S.pitch=Math.max(-1.15,Math.min(1.15,S.pitch+dy*.006))});canvas.addEventListener('pointerup',e=>{S.drag=false;canvas.classList.remove('dragging');canvas.releasePointerCapture?.(e.pointerId)});canvas.addEventListener('pointercancel',()=>{S.drag=false;canvas.classList.remove('dragging')});canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)S.pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(S.pinch>0)S.zoom=Math.max(.42,Math.min(2.8,S.zoom*d/S.pinch));S.pinch=d}},{passive:true});canvas.addEventListener('touchend',()=>{S.pinch=0},{passive:true});
addEventListener('resize',resize);document.addEventListener('input',e=>{if(e.target?.id==='mass'&&S.active)S.mass=massValue()},true);document.addEventListener('click',e=>{const b=e.target.closest?.('.simChoice[data-sim]');if(!b)return;if(b.dataset.sim!=='blackhole'&&S.active)set(false)},true);new MutationObserver(installButton).observe(document.body,{childList:true,subtree:true});installButton();resize();window.__COSMOSIM_4D_SET_ACTIVE__=set;
window.__COSMOSIM_4D_IS_ACTIVE__=()=>S.active;
})();
