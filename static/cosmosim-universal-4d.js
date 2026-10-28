(()=>{
'use strict';
if(window.__COSMOSIM_UNIVERSAL_4D__)return;
window.__COSMOSIM_UNIVERSAL_4D__=1;
const root=document.getElementById('space'); if(!root)return;
let stage,canvas,ctx,raf=0,w=1,h=1,dpr=1,active=false,sim='blackhole',lastSim='';
const S={yaw:-.58,pitch:.46,zoom:.92,lx:0,ly:0,drag:false,pinch:0,mass:10};
const cfg={
 blackhole:{type:'mass',m:10,label:'BLACK HOLE',strength:1.35},solar:{type:'mass',m:1,label:'STAR',strength:.72},
 bhcollision:{type:'multi',m:[30,25],label:'BLACK HOLE COLLISION',strength:1.35},wormhole:{type:'multi',m:[8,8],label:'WORMHOLE',strength:1.05},
 whitehole:{type:'white',m:10,label:'WHITE HOLE',strength:1.15},nebula:{type:'cloud',m:1e5,label:'NEBULA',strength:.34},
 galaxy:{type:'galaxy',m:1e11,label:'GALAXY',strength:.48},pulsar:{type:'mass',m:1.4,label:'PULSAR / NEUTRON STAR',strength:1.05},
 collisions:{type:'multi',m:[8,8],label:'COSMIC COLLISION',strength:1.05},neutronmerger:{type:'multi',m:[1.4,1.4],label:'NEUTRON STAR MERGER',strength:1.18},
 supernova:{type:'mass',m:10,label:'SUPERNOVA REMNANT',strength:1.05},protostar:{type:'mass',m:.5,label:'PROTOSTAR',strength:.72},
 galaxycollision:{type:'galaxyPair',m:[1e11,8e10],label:'GALAXY COLLISION',strength:.48},interstellar:{type:'mass',m:1,label:'INTERSTELLAR FLIGHT',strength:.52}
};
const css=document.createElement('style');css.textContent='#cosmosimUniversal4d{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;display:none;mix-blend-mode:screen}#cosmosim4dUniversalBadge{position:absolute;top:46px;left:50%;transform:translateX(-50%);z-index:4;display:none;pointer-events:none;padding:6px 10px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(0,0,0,.58);color:#fff;font:800 8px ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em;white-space:nowrap;text-shadow:0 0 6px #fff}';document.head.appendChild(css);
function setup(){stage=document.getElementById('space');if(!stage)return;canvas=document.createElement('canvas');canvas.id='cosmosimUniversal4d';stage.appendChild(canvas);ctx=canvas.getContext('2d');resize();}
function resize(){if(!canvas)return;w=Math.max(1,stage.clientWidth);h=Math.max(1,stage.clientHeight);dpr=Math.min(2,devicePixelRatio||1);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
function currentSim(){return document.querySelector('.simChoice.active')?.dataset.sim||'blackhole'}
function massFor(id){if(id==='solar'){const x=Number(document.getElementById('solarMass')?.value);return Number.isFinite(x)?x:1}if(id==='blackhole'){const x=Number(document.getElementById('mass')?.value);return Number.isFinite(x)?x:10}return cfg[id]?.m||1}
function scaleMass(m){return Math.max(.16,Math.min(5,.42*Math.pow(Math.max(.05,m)/10,.22)))}
function centers(id){const c=cfg[id]||cfg.blackhole;if(c.type==='multi')return[{x:-3.2,m:c.m[0]},{x:3.2,m:c.m[1]}];if(c.type==='galaxyPair')return[{x:-5,m:c.m[0]},{x:5,m:c.m[1]}];if(c.type==='galaxy')return[{x:0,m:c.m}];if(c.type==='cloud')return[{x:0,m:c.m}];return[{x:0,m:massFor(id)}]}
function warp(p,id){const c=cfg[id]||cfg.blackhole;let x=p.x,y=p.y,z=p.z,dx=0,dy=0,dz=0;
 if(c.type==='multi'||c.type==='galaxyPair'){
  for(const o of centers(id)){const ox=o.x,oy=0,oz=0,rx=x-ox,ry=y,rz=z,r=Math.hypot(rx,ry,rz)+1e-6,t=Math.min(1,.72*scaleMass(o.m)/(r+.25));const pull=c.strength*(.08*t+.92*Math.pow(t,1.55))*Math.exp(-r/10);dx-=rx*pull;dy-=ry*pull;dz-=rz*pull}
 }else if(c.type==='cloud'||c.type==='galaxy'){
  const r=Math.hypot(x,y,z)+1e-6;const t=Math.min(1,.38*scaleMass(c.m)/(r+.7));const pull=c.strength*(.08*t+.42*t*t)*Math.exp(-r/18);dx=-x*pull;dy=-y*pull;dz=-z*pull;
 }else{
  const m=massFor(id),r=Math.hypot(x,y,z)+1e-6,t=Math.min(1,.9*scaleMass(m)/(r+.12));let pull=c.strength*(.07*t+.93*Math.pow(t,1.5))*Math.exp(-r/16);if(c.type==='white')pull=-pull;dx=-x*pull;dy=-y*pull;dz=-z*pull;
 }
 return{x:x+dx,y:y+dy,z:z+dz};}
function project(p){const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),cp=Math.cos(S.pitch),sp=Math.sin(S.pitch),x=p.x*cy-p.z*sy,z0=p.x*sy+p.z*cy,y=p.y*cp-z0*sp,z=y*sp+z0*cp;const cam=29/S.zoom,dep=cam-z;if(dep<1.2)return null;const f=Math.min(w,h)*.94*cam/dep;return{x:w*.5+p.x*cy*f-p.z*sy*f,y:h*.53-y*f,z,depth:dep}}
function stroke(points,a,lw){ctx.beginPath();let ok=false;for(const p of points){if(!p){ok=false;continue}if(!ok){ctx.moveTo(p.x,p.y);ok=true}else ctx.lineTo(p.x,p.y)}ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=lw;ctx.stroke()}
function drawGrid(id){const max=15,step=1.75,N=96;for(const axis of ['x','y','z'])for(let a=-max;a<=max+.01;a+=step)for(let b=-max;b<=max+.01;b+=step){const pts=[];for(let i=0;i<=N;i++){const u=-max+2*max*i/N,p=axis==='x'?{x:u,y:a,z:b}:axis==='y'?{x:a,y:u,z:b}:{x:a,y:b,z:u};pts.push(project(warp(p,id)))}stroke(pts,.055,.62)}
 for(let ri=0;ri<12;ri++){const r=1.25+ri*1.05;for(let lat=1;lat<10;lat++){const el=-Math.PI/2+lat*Math.PI/10,ce=Math.cos(el),se=Math.sin(el),pts=[];for(let k=0;k<=120;k++){const a=k/120*Math.PI*2;pts.push(project(warp({x:r*ce*Math.cos(a),y:r*se,z:r*ce*Math.sin(a)},id)))}stroke(pts,.032,.5)}for(let lon=0;lon<16;lon++){const a=lon/16*Math.PI*2,pts=[];for(let k=0;k<=90;k++){const el=-Math.PI/2+k*Math.PI/90,ce=Math.cos(el),se=Math.sin(el);pts.push(project(warp({x:r*ce*Math.cos(a),y:r*se,z:r*ce*Math.sin(a)},id)))}stroke(pts,.032,.5)}}
}
function drawCenters(id){const cs=centers(id);for(const o of cs){const p=project(warp({x:o.x,y:0,z:0},id));if(!p)continue;const rr=Math.max(3,Math.min(28,5+7*scaleMass(o.m)));ctx.beginPath();ctx.arc(p.x,p.y,rr,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=1;ctx.stroke()}}
function draw(){const id=currentSim();if(id!==lastSim){lastSim=id;S.mass=massFor(id)}ctx.clearRect(0,0,w,h);drawGrid(id);drawCenters(id);const c=cfg[id]||cfg.blackhole;const badge=document.getElementById('cosmosim4dUniversalBadge');if(badge)badge.textContent='4D VISION · '+c.label+' · DYNAMIC SPACETIME FABRIC';if(raf)raf=requestAnimationFrame(draw)}
function set(on){active=!!on;canvas.style.display=active?'block':'none';const badge=document.getElementById('cosmosim4dUniversalBadge');if(badge)badge.style.display=active?'block':'none';if(active){resize();if(!raf)raf=requestAnimationFrame(draw)}else if(raf){cancelAnimationFrame(raf);raf=0}}
function install(){if(!canvas)return;const old=document.getElementById('cosmosim4dUniversalToggle');if(old)return;const b=document.createElement('button');b.id='cosmosim4dUniversalToggle';b.type='button';b.className='secondary';b.textContent='◉ 4D VISION · OFF';b.style.width='100%';b.style.marginTop='8px';b.onclick=()=>{set(!active);b.classList.toggle('on',active);b.textContent=active?'◉ 4D VISION · ON':'◉ 4D VISION · OFF'};const p=document.getElementById('simControls');if(p){p.appendChild(b)}else{document.body.appendChild(b);b.style.position='fixed';b.style.left='12px';b.style.bottom='12px';b.style.width='150px';b.style.zIndex='20'}}
function sync(){const id=currentSim();if(id==='blackhole'){const old=document.getElementById('cosmosim4dToggle');if(old&&old.classList.contains('on'))set(true)}if(active&&id!==lastSim)resize()}
setup();const badge=document.createElement('div');badge.id='cosmosim4dUniversalBadge';document.body.appendChild(badge);install();new MutationObserver(()=>{install();sync()}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});addEventListener('resize',resize);canvas.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();S.zoom=Math.max(.42,Math.min(2.8,S.zoom*Math.exp(-e.deltaY*.001)))},{passive:false});canvas.addEventListener('pointerdown',e=>{if(!active)return;S.drag=true;S.lx=e.clientX;S.ly=e.clientY;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!active||!S.drag)return;S.yaw+=(e.clientX-S.lx)*.006;S.pitch=Math.max(-1.15,Math.min(1.15,S.pitch+(e.clientY-S.ly)*.006));S.lx=e.clientX;S.ly=e.clientY});canvas.addEventListener('pointerup',()=>S.drag=false);canvas.addEventListener('pointercancel',()=>S.drag=false);document.addEventListener('click',e=>{const b=e.target.closest?.('.simChoice');if(b){lastSim='';if(active)set(true)}});document.addEventListener('input',e=>{if(active&&(e.target?.id==='mass'||e.target?.id==='solarMass'))S.mass=massFor(currentSim())},true);
})();