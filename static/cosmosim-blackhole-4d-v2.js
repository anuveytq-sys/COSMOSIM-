(()=>{
'use strict';
if(window.__COSMOSIM_BLACKHOLE_4D_V3__)return;
window.__COSMOSIM_BLACKHOLE_4D_V3__=1;
const root=document.getElementById('space');
if(!root)return;

const css=document.createElement('style');
css.textContent=`
#cosmosim4dToggle{width:100%;margin-top:8px;background:#0b0f18;border:1px solid #d9e0ef;color:#fff}
#cosmosim4dToggle.on{background:#fff;color:#000;box-shadow:0 0 20px rgba(255,255,255,.55)}
#cosmosim4dStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:1}
#cosmosim4dStage.on{display:block}
#cosmosim4dCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
#cosmosim4dCanvas.dragging{cursor:grabbing}
#cosmosim4dBadge{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;padding:7px 12px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(0,0,0,.68);color:#fff;font:800 9px/1.1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.14em;white-space:nowrap;text-shadow:0 0 9px #fff}
#cosmosim4dHint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;color:rgba(255,255,255,.65);font:700 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em;white-space:nowrap}
body.cosmosim4d-on #space>canvas:not(#cosmosim4dCanvas){visibility:hidden!important}
@media(max-width:520px){#cosmosim4dBadge{top:8px;font-size:7px;max-width:86vw;overflow:hidden;text-overflow:ellipsis}#cosmosim4dHint{font-size:7px;bottom:7px}}
`;
document.head.appendChild(css);

const stage=document.createElement('div');
stage.id='cosmosim4dStage';
stage.innerHTML='<canvas id="cosmosim4dCanvas"></canvas><div id="cosmosim4dBadge">4D VISION · VOLUMETRIC SCHWARZSCHILD SPACETIME</div><div id="cosmosim4dHint">DRAG · ROTATE / PAN &nbsp; SCROLL · ZOOM &nbsp; PINCH · ZOOM</div>';
root.appendChild(stage);
const canvas=stage.querySelector('#cosmosim4dCanvas');
const ctx=canvas.getContext('2d',{alpha:false});

const S={active:false,mass:10,zoom:1.0,yaw:-.28,pitch:.28,panX:0,panY:0,dpr:1,w:1,h:1,last:0,t:0,raf:0,drag:false,lx:0,ly:0,pinch:0};
const stars=[];
for(let i=0;i<1800;i++){
 const r=30+Math.random()*150,a=Math.random()*Math.PI*2,z=(Math.random()-.5)*2*r;
 const q=Math.sqrt(Math.max(.1,r*r-z*z));
 stars.push({x:q*Math.cos(a),y:q*Math.sin(a),z,tw:Math.random()*6.28,s:.25+Math.random()*1.5});
}

function resize(){
 S.w=Math.max(1,stage.clientWidth);S.h=Math.max(1,stage.clientHeight);S.dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.floor(S.w*S.dpr);canvas.height=Math.floor(S.h*S.dpr);ctx.setTransform(S.dpr,0,0,S.dpr,0,0);
}
function massValue(){const e=document.getElementById('mass');const m=Number(e?.value);return Number.isFinite(m)?Math.max(1,Math.min(100,m)):S.mass}
function rsNorm(M){return .78*Math.pow(M/10,.72)}
function schwarzschildKm(M){return 2.95325008*M}

// Perspective projection of a real 3D volume. The grid is not a 2D plane:
// it is a family of spherical shells plus radial 3D geodesic tracks, all
// displaced toward the same central potential well.
function rotate(p){
 const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),cp=Math.cos(S.pitch),sp=Math.sin(S.pitch);
 const x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy;
 return {x,y:p.y*cp-z*sp,z:p.y*sp+z*cp};
}
function project(p){
 const q=rotate(p);const cam=30/S.zoom;const depth=cam-q.z; if(depth<1)return null;
 const f=430*cam/depth;
 return {x:S.w*.5+q.x*f+S.panX,y:S.h*.53-q.y*f+S.panY,z:q.z,depth};
}
function potential(r,M){
 const R=rsNorm(M);const u=Math.max(.002,r);const weak=Math.min(.92,R/u);const strong=Math.min(.86,Math.pow(R/u,1.75)*.72);
 return Math.min(.96,.20*weak+strong);
}
function bendPoint(p,M){
 const r=Math.hypot(p.x,p.y,p.z);if(r<.001)return {x:0,y:0,z:0};
 const k=potential(r,M);
 const scale=Math.max(.045,1-k*(.72+.28*Math.exp(-r/5)));
 return {x:p.x*scale,y:p.y*scale,z:p.z*scale};
}
function stroke(points,a,w){
 if(points.length<2)return;ctx.beginPath();
 let started=false;
 for(const p of points){if(!p){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}
 ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=w;ctx.stroke();
}
function drawStars(M){
 const cx=S.w*.5,cy=S.h*.53,R=rsNorm(M)*2.8;
 for(const st of stars){
  const p=project(st);if(!p)continue;
  const r2=Math.hypot(st.x,st.y,st.z);const near=Math.max(0,1-r2/180);const d=Math.hypot(st.x,st.y,st.z);
  const ang=Math.atan2(st.y,st.x);const lens=.35*Math.min(1,R*R/Math.max(1,d*d));
  const x=p.x+(p.x-cx)*lens,y=p.y+(p.y-cy)*lens;
  const alpha=.18+.55*(.5+.5*Math.sin(S.t*.8+st.tw));
  ctx.fillStyle=`rgba(255,255,255,${alpha})`;const sz=Math.max(.35,st.s*(1+p.depth/70));ctx.fillRect(x,y,sz,sz);
  if(near>.2&&Math.abs(ang)<.12)ctx.fillRect(x+sz*1.5,y,sz*2.5,.45);
 }
}
function drawVolumetricGrid(M){
 const max=13,levels=17,step=(max*2)/(levels-1);
 // Nested spherical shells make the fabric visibly volumetric in every direction.
 for(let shell=0;shell<13;shell++){
  const R=1.65+shell*(max-1.65)/12;
  const latCount=15,lonCount=28,seg=110;
  const shellAlpha=.075+(12-shell)*.012;
  for(let li=1;li<latCount;li++){
   const lat=-Math.PI/2+Math.PI*li/latCount,pts=[];
   for(let k=0;k<=seg;k++){
    const a=2*Math.PI*k/seg;
    pts.push(project(bendPoint({x:R*Math.cos(lat)*Math.cos(a),y:R*Math.sin(lat),z:R*Math.cos(lat)*Math.sin(a)},M)));
   }
   stroke(pts,shellAlpha+(li%3===0?.025:0),li<4?1.0:.65);
  }
  for(let lo=0;lo<lonCount;lo++){
   const a=2*Math.PI*lo/lonCount,pts=[];
   for(let k=0;k<=seg;k++){
    const lat=-Math.PI/2+Math.PI*k/seg;
    pts.push(project(bendPoint({x:R*Math.cos(lat)*Math.cos(a),y:R*Math.sin(lat),z:R*Math.cos(lat)*Math.sin(a)},M)));
   }
   stroke(pts,shellAlpha*.9+(lo%4===0?.018:0),.62);
  }
 }
 // Three mutually perpendicular 3D lattices: depth layers remain visible
 // around and behind the hole, rather than becoming one flat sheet.
 for(let a=0;a<levels;a++)for(let b=0;b<levels;b++){
  const y=-max+a*step,z=-max+b*step,pts=[];
  for(let i=0;i<=90;i++){const x=-max+2*max*i/90;pts.push(project(bendPoint({x,y,z},M)))}
  stroke(pts,.065+(a===8&&b===8?.05:0),.55);
 }
 for(let a=0;a<levels;a++)for(let b=0;b<levels;b++){
  const x=-max+a*step,z=-max+b*step,pts=[];
  for(let i=0;i<=90;i++){const y=-max+2*max*i/90;pts.push(project(bendPoint({x,y,z},M)))}
  stroke(pts,.06+(a===8&&b===8?.05:0),.55);
 }
 for(let a=0;a<levels;a++)for(let b=0;b<levels;b++){
  const x=-max+a*step,y=-max+b*step,pts=[];
  for(let i=0;i<=90;i++){const z=-max+2*max*i/90;pts.push(project(bendPoint({x,y,z},M)))}
  stroke(pts,.055+(a===8&&b===8?.05:0),.55);
 }
 // Radial depth spokes emphasize that curvature surrounds the black hole.
 const rays=72;
 for(let i=0;i<rays;i++){
  const az=2*Math.PI*i/rays,el=-.75+1.5*((i%13)/12),pts=[];
  const ce=Math.cos(el),se=Math.sin(el);
  for(let j=0;j<=75;j++){const r=.55+(12.5-.55)*j/75;pts.push(project(bendPoint({x:r*ce*Math.cos(az),y:r*se,z:r*ce*Math.sin(az)},M)))}
  stroke(pts,i%6===0?.075:.035,i%6===0?.72:.42);
 }
}
function drawAccretion(M){
 const R=rsNorm(M),tilt=.22,rows=7,seg=220;
 for(let j=0;j<rows;j++){
  const rad=R*1.85+j*(7.8-R*1.35)/Math.max(1,rows-1),pts=[];
  for(let k=0;k<=seg;k++){
   const a=2*Math.PI*k/seg;const wob=.035*Math.sin(a*5+S.t*2+j);
   const x=rad*Math.cos(a),z=rad*Math.sin(a),y=(z*.22)+wob;
   const q=bendPoint({x,y,z},M);pts.push(project(q));
  }
  stroke(pts,.10+j*.035,1.0+j*.12);
 }
 // Dense photon particles.
 for(let i=0;i<650;i++){
  const a=(i/650)*Math.PI*2*5+S.t*(.4+M*.002),rad=R*1.75+((i*37)%1000)/1000*6.5;
  const q=bendPoint({x:rad*Math.cos(a),y:(Math.sin(a*3+i)*.02),z:rad*Math.sin(a)},M),p=project(q);if(!p)continue;
  const alpha=.22+.55*(1-rad/10);ctx.fillStyle=`rgba(255,255,255,${Math.max(.12,alpha)})`;ctx.fillRect(p.x,p.y,1.0,1.0);
 }
}
function drawBlackHole(M){
 const R=rsNorm(M),cx=S.w*.5+S.panX,cy=S.h*.53+S.panY;
 const g=ctx.createRadialGradient(cx,cy,R*.45,cx,cy,R*5.2);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.28,'rgba(0,0,0,.98)');g.addColorStop(.58,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R*5.2,0,Math.PI*2);ctx.fill();
 // Event horizon / shadow.
 ctx.fillStyle='#000';ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();
 // Bright photon ring, slightly elliptical from the viewing angle.
 ctx.save();ctx.translate(cx,cy);ctx.rotate(-.06);ctx.scale(1,.48);for(let i=0;i<12;i++){ctx.beginPath();ctx.arc(0,0,R*(1.55+i*.025),0,Math.PI*2);ctx.strokeStyle=`rgba(255,255,255,${.045+i*.055})`;ctx.lineWidth=1.2+i*.18;ctx.shadowBlur=10+i;ctx.shadowColor='#fff';ctx.stroke()}ctx.restore();ctx.shadowBlur=0;
 // Depth cue: inner black gradient and far-side halo.
 const inner=ctx.createRadialGradient(cx-R*.2,cy-R*.1,R*.1,cx,cy,R*1.55);inner.addColorStop(0,'rgba(255,255,255,.10)');inner.addColorStop(.32,'rgba(0,0,0,.35)');inner.addColorStop(.68,'rgba(0,0,0,.85)');inner.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=inner;ctx.beginPath();ctx.arc(cx,cy,R*1.55,0,Math.PI*2);ctx.fill();
}
function render(now){if(!S.active){S.raf=0;return}const dt=Math.min(.05,(now-S.last)/1000);S.last=now;S.t+=dt;S.mass=massValue();
 ctx.fillStyle='#000';ctx.fillRect(0,0,S.w,S.h);drawStars(S.mass);drawVolumetricGrid(S.mass);drawAccretion(S.mass);drawBlackHole(S.mass);
 ctx.fillStyle='rgba(255,255,255,.68)';ctx.font='700 8px ui-monospace,SFMono-Regular,monospace';ctx.fillText('Rs = '+schwarzschildKm(S.mass).toFixed(1)+' km  ·  3D CURVATURE FIELD  ·  MASS '+S.mass.toFixed(1)+' M☉',12,S.h-12);
 S.raf=requestAnimationFrame(render)}
function hideOriginal(on){root.querySelectorAll('canvas').forEach(c=>{if(c!==canvas)c.style.visibility=on?'hidden':''})}
function set(on){S.active=!!on;stage.classList.toggle('on',S.active);document.body.classList.toggle('cosmosim4d-on',S.active);hideOriginal(S.active);const b=document.getElementById('cosmosim4dToggle');if(b){b.classList.toggle('on',S.active);b.textContent=S.active?'◉ 4D VISION · ON':'◉ 4D VISION · OFF'}if(S.active){resize();S.last=performance.now();if(!S.raf)S.raf=requestAnimationFrame(render)}else if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}}
function installButton(){if(document.getElementById('cosmosim4dToggle'))return;const p=document.getElementById('panelBody');if(!p)return;const b=document.createElement('button');b.id='cosmosim4dToggle';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.onclick=()=>set(!S.active);p.appendChild(b)}
canvas.addEventListener('wheel',e=>{if(!S.active)return;e.preventDefault();S.zoom=Math.max(.48,Math.min(2.7,S.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!S.active)return;S.drag=true;S.lx=e.clientX;S.ly=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!S.active||!S.drag)return;const dx=e.clientX-S.lx,dy=e.clientY-S.ly;S.lx=e.clientX;S.ly=e.clientY;if(e.buttons===1){S.yaw+=dx*.006;S.pitch=Math.max(-1.15,Math.min(1.15,S.pitch+dy*.006))}else{S.panX+=dx;S.panY+=dy}});
canvas.addEventListener('pointerup',e=>{S.drag=false;canvas.classList.remove('dragging');canvas.releasePointerCapture?.(e.pointerId)});
canvas.addEventListener('pointercancel',()=>{S.drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)S.pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(S.pinch>0)S.zoom=Math.max(.48,Math.min(2.7,S.zoom*d/S.pinch));S.pinch=d}},{passive:true});
canvas.addEventListener('touchend',()=>{S.pinch=0},{passive:true});
addEventListener('resize',resize);
document.addEventListener('input',e=>{if(e.target?.id==='mass'&&S.active)S.mass=massValue()},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('.simChoice[data-sim]');if(b&&b.dataset.sim!=='blackhole'&&S.active)set(false)},true);
new MutationObserver(installButton).observe(document.body,{childList:true,subtree:true});
installButton();resize();
window.__COSMOSIM_4D_SET_ACTIVE__=set;
})();