(()=>{
'use strict';
if(window.__COSMOSIM_BLACKHOLE_GRID_BEND__)return;
window.__COSMOSIM_BLACKHOLE_GRID_BEND__=1;
const root=document.getElementById('space');
if(!root)return;
let stage,canvas,ctx,raf=0,dpr=1,w=1,h=1;
const S={yaw:-.42,pitch:.34,zoom:1};
const css=document.createElement('style');
css.textContent='#cosmosim4dGridBend{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;display:none;mix-blend-mode:screen}#cosmosim4dStage.on #cosmosim4dGridBend{display:block}';
document.head.appendChild(css);
function setup(){stage=document.getElementById('cosmosim4dStage');if(!stage||canvas)return false;canvas=document.createElement('canvas');canvas.id='cosmosim4dGridBend';stage.appendChild(canvas);ctx=canvas.getContext('2d');resize();return true}
function resize(){if(!canvas)return;w=Math.max(1,stage.clientWidth);h=Math.max(1,stage.clientHeight);dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
function mass(){const m=Number(document.getElementById('mass')?.value);return Number.isFinite(m)?Math.max(3,Math.min(50,m)):10}
function holeRadius(M){return Math.min(w,h)*.040*Math.pow(M/10,.82)*1.42}
function project(x,y,z){const cy=Math.cos(S.yaw),sy=Math.sin(S.yaw),cp=Math.cos(S.pitch),sp=Math.sin(S.pitch);const x1=x*cy-z*sy,z1=x*sy+z*cy,y1=y*cp-z1*sp,z2=y*sp+z1*cp;const cam=30/S.zoom,depth=cam-z2;if(depth<2)return null;const f=Math.min(w,h)*.90*cam/depth;return{x:w*.5+x1*f,y:h*.53-y1*f,z:z2,depth}}

// Stronger Schwarzschild-inspired visual deformation for the SURROUNDING FABRIC.
// Rs = 2GM/c^2. This is a visualization, not a numerical GR solver.
// The deformation is radial and monotonic: every grid point is pulled toward
// the same black-hole centre, with a sharply increasing gradient near Rs.
function bend(x,y,z,M){
 const r=Math.hypot(x,y,z);if(r<1e-5)return{x:0,y:0,z:0};
 const rs=.34*Math.pow(M/10,.82);
 const field=7.2*Math.pow(M/10,.50);
 const near=rs*2.8;
 const farPull=.72*field/(r+field);
 const nearPull=1.55*Math.pow(near/(r+near),2.35);
 const tidal=1.05*Math.exp(-Math.pow(r/(near*1.9),2));
 const pull=Math.min(.965,farPull*.58+nearPull*.72+tidal*.22);
 const scale=Math.max(.035,1-pull);
 return{x:x*scale,y:y*scale,z:z*scale};
}
function line(points,a,width){ctx.beginPath();let ok=false;for(const p of points){if(!p){ok=false;continue}if(!ok){ctx.moveTo(p.x,p.y);ok=true}else ctx.lineTo(p.x,p.y)}ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=width;ctx.stroke()}
function draw(M){
 const max=16,step=1.28,N=120;
 // Dense orthogonal 3-D fabric. The full XYZ families are all deformed by
 // bend(), so nearby lines visibly bow inward rather than crossing straight.
 for(const axis of ['x','y','z']){
  for(let a=-max;a<=max+.01;a+=step)for(let b=-max;b<=max+.01;b+=step){
   const pts=[];
   for(let i=0;i<=N;i++){
    const u=-max+2*max*i/N;
    const p=axis==='x'?{x:u,y:a,z:b}:axis==='y'?{x:a,y:u,z:b}:{x:a,y:b,z:u};
    const q=bend(p.x,p.y,p.z,M);pts.push(project(q));
   }
   line(pts,.105,.78);
  }
 }
 // Volumetric spherical shells: these make the pull readable from every
 // viewing direction instead of suggesting a single rubber-sheet plane.
 for(let ri=0;ri<20;ri++){
  const r=.95+ri*(max-.95)/19;
  for(let lat=0;lat<12;lat++){
   const el=-Math.PI/2+(lat+1)*Math.PI/13,ce=Math.cos(el),se=Math.sin(el),pts=[];
   for(let k=0;k<=170;k++){const a=k/170*Math.PI*2;const q=bend(r*ce*Math.cos(a),r*se,r*ce*Math.sin(a),M);pts.push(project(q))}
   line(pts,.052,.58);
  }
  for(let lon=0;lon<28;lon++){
   const a=lon/28*Math.PI*2,pts=[];
   for(let k=0;k<=120;k++){const el=-Math.PI/2+k/120*Math.PI,ce=Math.cos(el),se=Math.sin(el);const q=bend(r*ce*Math.cos(a),r*se,r*ce*Math.sin(a),M);pts.push(project(q))}
   line(pts,.052,.58);
  }
 }
 // Strong radial tracks emphasize that the field converges from all directions.
 const rays=88;
 const exclude=holeRadius(M)*1.60;
 for(let ray=0;ray<rays;ray++){
  const az=ray/rays*Math.PI*2,el=-.98+((ray*17)%89)/88*1.96,ce=Math.cos(el),se=Math.sin(el),pts=[];
  for(let j=0;j<=150;j++){
   const r=.22+15.78*j/150,q=bend(r*ce*Math.cos(az),r*se,r*ce*Math.sin(az),M),p=project(q);
   if(p){const rr=Math.hypot(p.x-w*.5,p.y-h*.53);pts.push(rr<exclude?null:p)}else pts.push(null);
  }
  line(pts,.070,.62);
 }
 // Do not draw over the existing black-hole core/photon ring.
 ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.ellipse(w*.5,h*.53,exclude,exclude*.54,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function render(){if(!stage||!stage.classList.contains('on')){if(raf){cancelAnimationFrame(raf);raf=0}return}ctx.clearRect(0,0,w,h);draw(mass());raf=requestAnimationFrame(render)}
function watch(){if(!setup()){requestAnimationFrame(watch);return}new MutationObserver(()=>{if(stage.classList.contains('on')&&!raf){resize();raf=requestAnimationFrame(render)}}).observe(stage,{attributes:true,attributeFilter:['class']});addEventListener('resize',resize)}
watch();
})();