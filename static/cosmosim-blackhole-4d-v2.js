(()=>{
'use strict';
if(window.__COSMOSIM_BLACKHOLE_4D_V4__)return;
window.__COSMOSIM_BLACKHOLE_4D_V4__=1;
const root=document.getElementById('space');
if(!root)return;

const css=document.createElement('style');
css.textContent=`
#cosmosim4dToggle{width:100%;margin-top:8px;background:#090d15;border:1px solid #e9edf7;color:#fff}
#cosmosim4dToggle.on{background:#fff;color:#000;box-shadow:0 0 22px rgba(255,255,255,.6)}
#cosmosim4dStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:1}
#cosmosim4dStage.on{display:block}
#cosmosim4dCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
#cosmosim4dCanvas.dragging{cursor:grabbing}
#cosmosim4dBadge{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;padding:7px 12px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font:800 9px/1.1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.14em;white-space:nowrap;text-shadow:0 0 9px #fff}
#cosmosim4dHint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:3;pointer-events:none;color:rgba(255,255,255,.66);font:700 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em;white-space:nowrap}
body.cosmosim4d-on #space>canvas:not(#cosmosim4dCanvas){visibility:hidden!important}
@media(max-width:520px){#cosmosim4dBadge{top:8px;font-size:7px;max-width:88vw;overflow:hidden;text-overflow:ellipsis}#cosmosim4dHint{font-size:7px;bottom:7px}}
`;
document.head.appendChild(css);

const stage=document.createElement('div');
stage.id='cosmosim4dStage';
stage.innerHTML='<canvas id="cosmosim4dCanvas"></canvas><div id="cosmosim4dBadge">4D VISION · 3D SCHWARZSCHILD SPACETIME FABRIC</div><div id="cosmosim4dHint">DRAG · ROTATE / PAN &nbsp; SCROLL · ZOOM &nbsp; PINCH · ZOOM</div>';
root.appendChild(stage);
const canvas=stage.querySelector('#cosmosim4dCanvas');
const ctx=canvas.getContext('2d',{alpha:false});

const S={active:false,mass:10,zoom:.95,yaw:-.55,pitch:.38,panX:0,panY:0,dpr:1,w:1,h:1,last:0,t:0,raf:0,drag:false,lx:0,ly:0,pinch:0};
const stars=[];
for(let i=0;i<1500;i++){
 const r=38+Math.random()*155,az=Math.random()*Math.PI*2,el=Math.asin(2*Math.random()-1);
 stars.push({x:r*Math.cos(el)*Math.cos(az),y:r*Math.sin(el),z:r*Math.cos(el)*Math.sin(az),tw:Math.random()*6.28,s:.25+Math.random()*1.35});
}

function resize(){
 S.w=Math.max(1,stage.clientWidth);S.h=Math.max(1,stage.clientHeight);S.dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.floor(S.w*S.dpr);canvas.height=Math.floor(S.h*S.dpr);ctx.setTransform(S.dpr,0,0,S.dpr,0,0);
}
function massValue(){const e=document.getElementById('mass');const m=Number(e?.value);return Number.isFinite(m)?Math.max(3,Math.min(50,m)):S.mass}
function rsKm(M){return 2.95325008*M}
function rs(M){return .34*Math.pow(M/10,.82)}
function rotate(p){
 const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),cp=Math.cos(S.pitch),sp=Math.sin(S.pitch);
 const x=p.x*cy-p.z*sy,z0=p.x*sy+p.z*cy;
 return {x,y:p.y*cp-z0*sp,z:p.y*sp+z0*cp};
}
function project(p){
 const q=rotate(p);const cam=27/S.zoom;const depth=cam-q.z;if(depth<1.1)return null;
 const f=Math.min(S.w,S.h)*.92*cam/depth;
 return {x:S.w*.5+q.x*f+S.panX,y:S.h*.53-q.y*f+S.panY,z:q.z,depth};
}
function warp(p,M){
 const r=Math.hypot(p.x,p.y,p.z);if(r<1e-5)return {x:0,y:0,z:0};
 const R=rs(M);
 const weak=R/(r+.16);
 const strong=Math.pow(Math.min(1.8,R/(r+.08)),1.55);
 const pull=Math.min(.78,.16*weak+.23*strong)*Math.exp(-r/18);
 const s=Math.max(.22,1-pull);
 return {x:p.x*s,y:p.y*s,z:p.z*s};
}
function stroke(points,a,w){
 if(points.length<2)return;ctx.beginPath();let started=false;
 for(const p of points){if(!p){started=false;continue}if(!started){ctx.moveTo(p.x,p.y);started=true}else ctx.lineTo(p.x,p.y)}
 ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=w;ctx.stroke();
}
function lineDepth(points){let d=0,n=0;for(const p of points){if(p){d+=p.depth;n++}}return n?Math.max(.18,Math.min(1.15,1-(d/n+27)*.018)):.5}
function drawStars(M){
 const cx=S.w*.5+S.panX,cy=S.h*.53+S.panY,R=rs(M);
 for(const st of stars){
  const q=warp(st,M),p=project(q);if(!p)continue;
  const d=Math.hypot(st.x,st.y,st.z);const lens=Math.min(.32,(R*R*4)/Math.max(1,d*d));
  const x=p.x+(p.x-cx)*lens,y=p.y+(p.y-cy)*lens;
  const alpha=.16+.58*(.5+.5*Math.sin(S.t*.75+st.tw));
  ctx.fillStyle=`rgba(255,255,255,${alpha})`;
  const sz=Math.max(.35,st.s*(1+Math.max(0,p.depth)/70));ctx.fillRect(x,y,sz,sz);
  if(lens>.035){ctx.globalAlpha=.35;ctx.fillRect(x-(p.x-cx)*.12,y-(p.y-cy)*.12,sz*.45,sz*.45);ctx.globalAlpha=1}
 }
}
function drawGridFamily(axis,M){
 const max=12.8,levels=15,step=(max*2)/(levels-1);
 for(let a=0;a<levels;a++)for(let b=0;b<levels;b++){
  const c1=-max+a*step,c2=-max+b*step,pts=[];
  for(let i=0;i<=96;i++){
   const u=-max+2*max*i/96;let p;
   if(axis==='x')p={x:u,y:c1,z:c2};
   else if(axis==='y')p={x:c1,y:u,z:c2};
   else p={x:c1,y:c2,z:u};
   pts.push(project(warp(p,M)));
  }
  const mid=(levels-1)/2,central=(Math.abs(a-mid)<.51||Math.abs(b-mid)<.51),depth=lineDepth(pts);
  stroke(pts,(.040+.030*depth)*(central?1.7:1),central?.75:.48);
 }
}
function drawInwardGeodesics(M){
 const max=13.2;
 for(let ring=0;ring<4;ring++){
  const azCount=24+ring*8;
  for(let i=0;i<azCount;i++){
   const az=i/azCount*Math.PI*2+(ring%2)*.06,el=-.72+(i%9)/8*1.44,ce=Math.cos(el),se=Math.sin(el),pts=[];
   for(let j=0;j<=80;j++){const r=.48+max*j/80;pts.push(project(warp({x:r*ce*Math.cos(az),y:r*se,z:r*ce*Math.sin(az)},M)))}
   stroke(pts,ring===0?.070:ring===1?.045:.027,ring===0?.72:.42);
  }
 }
}
function drawCurvatureContours(M){
 for(let n=0;n<7;n++){
  const rad=1.1+n*1.55,pts=[];
  for(let k=0;k<=240;k++){const a=k/240*Math.PI*2,y=.06*Math.sin(a*3+S.t*.6);pts.push(project(warp({x:rad*Math.cos(a),y,z:rad*Math.sin(a)},M)))}
  stroke(pts,.055-n*.004,.58);
 }
}
function drawAccretion(M){
 const R=rs(M),tilt=.38,rows=8,seg=240;
 for(let j=0;j<rows;j++){
  const rad=Math.max(R*1.75,2.0)+j*.78,pts=[];
  for(let k=0;k<=seg;k++){const a=k/seg*Math.PI*2,wob=.035*Math.sin(a*7+S.t*2.1+j),x=rad*Math.cos(a),z=rad*Math.sin(a),y=z*tilt+wob;pts.push(project(warp({x,y,z},M)))}
  stroke(pts,.10+j*.025,1.0+j*.10);
 }
 for(let j=0;j<5;j++){
  const rad=2.15+j*.82,pts=[];
  for(let k=0;k<=200;k++){const a=k/200*Math.PI*2,z=rad*Math.sin(a),x=rad*Math.cos(a),y=z*tilt+(j-2)*.07;pts.push(project(warp({x,y,z},M)))}
  stroke(pts,.055,.55);
 }
 for(let i=0;i<850;i++){
  const baseR=2+((i*37)%1000)/1000*6,a=i/850*Math.PI*2*7+S.t*(.85+1.9/Math.pow(baseR,1.35)),z=baseR*Math.sin(a),x=baseR*Math.cos(a),y=z*tilt+Math.sin(i*2.1)*.045,p=project(warp({x,y,z},M));
  if(!p)continue;const hot=Math.max(.18,1-baseR/8);ctx.fillStyle=`rgba(255,255,255,${.18+.60*hot})`;ctx.fillRect(p.x,p.y,1.05+.7*hot,1.05+.7*hot);
 }
}
function drawPhotonLensing(M){
 const R=rs(M),cx=S.w*.5+S.panX,cy=S.h*.53+S.panY;
 for(let k=0;k<10;k++){
  const b=R*2.15+k*.55,deflect=Math.min(.72,(2*R)/Math.max(.3,b));ctx.beginPath();
  for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,radial=b*(1+deflect*.16*Math.cos(a*2)),x=cx+Math.cos(a)*radial*(1.02+.02*Math.sin(S.t+i)),y=cy+Math.sin(a)*radial*.42;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.strokeStyle=`rgba(255,255,255,${.025+.012*k})`;ctx.lineWidth=.55;ctx.stroke();
 }
}
function drawBlackHole(M){
 const R=rs(M),cx=S.w*.5+S.panX,cy=S.h*.53+S.panY,shadowR=R*1.42;
 const halo=ctx.createRadialGradient(cx,cy,shadowR*.55,cx,cy,shadowR*2.25);
 halo.addColorStop(0,'rgba(255,255,255,0)');halo.addColorStop(.48,'rgba(255,255,255,.05)');halo.addColorStop(.70,'rgba(255,255,255,.13)');halo.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,shadowR*2.25,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(cx,cy);ctx.rotate(-.10);ctx.scale(1,.48);
 for(let i=0;i<15;i++){const r=shadowR*(1.02+i*.018);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);const grad=ctx.createLinearGradient(-r,0,r,0);grad.addColorStop(0,'rgba(255,255,255,.24)');grad.addColorStop(.38,'rgba(255,255,255,.98)');grad.addColorStop(.62,'rgba(255,255,255,.70)');grad.addColorStop(1,'rgba(255,255,255,.18)');ctx.strokeStyle=grad;ctx.lineWidth=1+i*.15;ctx.shadowBlur=7+i*.7;ctx.shadowColor='#fff';ctx.stroke()}
 ctx.restore();ctx.shadowBlur=0;
 const g=ctx.createRadialGradient(cx-R*.22,cy-R*.18,R*.08,cx,cy,shadowR);g.addColorStop(0,'#000');g.addColorStop(.70,'#000');g.addColorStop(.90,'rgba(0,0,0,.98)');g.addColorStop(1,'rgba(0,0,0,.20)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,shadowR,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.translate(cx,cy);ctx.rotate(-.1);ctx.scale(1,.48);ctx.beginPath();ctx.arc(0,0,shadowR*1.02,Math.PI*.10,Math.PI*1.10);ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=1.2;ctx.shadowBlur=14;ctx.shadowColor='#fff';ctx.stroke();ctx.restore();ctx.shadowBlur=0;
}
function render(now){
 if(!S.active){S.raf=0;return}
 const dt=Math.min(.05,(now-S.last)/1000);S.last=now;S.t+=dt;S.mass=massValue();
 ctx.setTransform(S.dpr,0,0,S.dpr,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,S.w,S.h);
 drawStars(S.mass);drawGridFamily('x',S.mass);drawGridFamily('y',S.mass);drawGridFamily('z',S.mass);drawInwardGeodesics(S.mass);drawCurvatureContours(S.mass);drawPhotonLensing(S.mass);drawAccretion(S.mass);drawBlackHole(S.mass);
 ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='700 8px ui-monospace,SFMono-Regular,monospace';ctx.fillText('Rs = '+rsKm(S.mass).toFixed(1)+' km  ·  α≈4GM/(bc²)  ·  MASS '+S.mass.toFixed(1)+' M☉',12,S.h-12);
 S.raf=requestAnimationFrame(render);
}
function hideOriginal(on){root.querySelectorAll('canvas').forEach(c=>{if(c!==canvas)c.style.visibility=on?'hidden':''})}
function set(on){S.active=!!on;stage.classList.toggle('on',S.active);document.body.classList.toggle('cosmosim4d-on',S.active);hideOriginal(S.active);const b=document.getElementById('cosmosim4dToggle');if(b){b.classList.toggle('on',S.active);b.textContent=S.active?'◉ 4D VISION · ON':'◉ 4D VISION · OFF'}if(S.active){resize();S.last=performance.now();if(!S.raf)S.raf=requestAnimationFrame(render)}else if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}}
function installButton(){if(document.getElementById('cosmosim4dToggle'))return;const p=document.getElementById('panelBody');if(!p)return;const b=document.createElement('button');b.id='cosmosim4dToggle';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.onclick=()=>set(!S.active);p.appendChild(b)}
canvas.addEventListener('wheel',e=>{if(!S.active)return;e.preventDefault();S.zoom=Math.max(.42,Math.min(2.8,S.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(!S.active)return;S.drag=true;S.lx=e.clientX;S.ly=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!S.active||!S.drag)return;const dx=e.clientX-S.lx,dy=e.clientY-S.ly;S.lx=e.clientX;S.ly=e.clientY;if(e.buttons===1){S.yaw+=dx*.006;S.pitch=Math.max(-1.15,Math.min(1.15,S.pitch+dy*.006))}else{S.panX+=dx;S.panY+=dy}});
canvas.addEventListener('pointerup',e=>{S.drag=false;canvas.classList.remove('dragging');canvas.releasePointerCapture?.(e.pointerId)});canvas.addEventListener('pointercancel',()=>{S.drag=false;canvas.classList.remove('dragging')});
canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)S.pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)},{passive:true});
canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(S.pinch>0)S.zoom=Math.max(.42,Math.min(2.8,S.zoom*d/S.pinch));S.pinch=d}},{passive:true});
canvas.addEventListener('touchend',()=>{S.pinch=0},{passive:true});
addEventListener('resize',resize);document.addEventListener('input',e=>{if(e.target?.id==='mass'&&S.active)S.mass=massValue()},true);document.addEventListener('click',e=>{const b=e.target.closest?.('.simChoice[data-sim]');if(b&&b.dataset.sim!=='blackhole'&&S.active)set(false)},true);
new MutationObserver(installButton).observe(document.body,{childList:true,subtree:true});installButton();resize();window.__COSMOSIM_4D_SET_ACTIVE__=set;
})();