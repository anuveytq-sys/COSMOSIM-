(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D_VOLUMETRIC__) return;
  window.__COSMOSIM_BLACKHOLE_4D_VOLUMETRIC__ = true;

  const root = document.getElementById('space');
  if (!root) return;

  const state = {
    enabled: false,
    mass: 10,
    zoom: 18,
    target: new THREE.Vector3(0, 0, 0),
    yaw: 0.42,
    pitch: 0.16,
    distance: 18,
    lastX: 0,
    lastY: 0,
    dragging: false,
    pinch: 0,
    savedCanvasDisplay: [],
    raf: 0
  };

  const style = document.createElement('style');
  style.textContent = `
    #cosmosim4DButton{display:block;width:100%;margin-top:8px;background:linear-gradient(135deg,#f7f8fb,#9fa8b8);color:#07090e;border:1px solid #fff;font-weight:900;letter-spacing:.4px}
    #cosmosim4DButton.on{background:#fff;color:#000;box-shadow:0 0 18px #fff8}
    #cosmosim4DStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:1;touch-action:none}
    #cosmosim4DStage.on{display:block}
    #cosmosim4DStage canvas{display:block;width:100%;height:100%}
    #cosmosim4DReadout{position:absolute;left:16px;top:16px;padding:8px 10px;border:1px solid #fff5;border-radius:9px;background:#0009;color:#fff;font:700 9px/1.45 ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em;pointer-events:none;text-shadow:0 0 8px #fff}
    #cosmosim4DReadout b{font-size:12px}
  `;
  document.head.appendChild(style);

  const stage = document.createElement('div');
  stage.id = 'cosmosim4DStage';
  stage.innerHTML = '<div id="cosmosim4DReadout"><b>4D VISION</b><br>VOLUMETRIC SCHWARZSCHILD SPACETIME<br><span id="cosmosim4DPhysics">Rs = 29.53 km · α ≈ 4GM/(bc²)</span></div>';
  root.appendChild(stage);

  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const root = document.getElementById('space');
const stage = document.getElementById('cosmosim4DStage');
const readout = document.getElementById('cosmosim4DPhysics');
const state = window.__COSMOSIM_4D_STATE__;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.018);
const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 500);
camera.position.set(10, 6, 18);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = true;
controls.minDistance = 7;
controls.maxDistance = 65;
controls.target.set(0,0,0);
controls.rotateSpeed = .55;
controls.zoomSpeed = .8;
controls.panSpeed = .55;

const ambient = new THREE.AmbientLight(0xffffff, .35); scene.add(ambient);
const key = new THREE.PointLight(0xffffff, 150, 80); key.position.set(7,8,12); scene.add(key);

const gridGroup = new THREE.Group();
scene.add(gridGroup);
const depthGroup = new THREE.Group();
scene.add(depthGroup);

function rsVisual(mass){ return 1.35 * Math.pow(Math.max(3,mass)/10, .72); }
function bendStrength(mass){
  const rs = rsVisual(mass);
  return Math.min(.91, .36 + .58 * Math.pow(rs/1.35, .72));
}
function warpPoint(x,y,z,mass){
  const r = Math.hypot(x,y,z) || .0001;
  const rs = rsVisual(mass);
  const weak = Math.min(.72, 2 * rs / r);
  const strong = Math.min(.88, .70 * Math.pow(rs / Math.max(r,rs), 1.7));
  const deflection = Math.min(.93, .16 * weak + strong * bendStrength(mass));
  const scale = Math.max(.055, 1 - deflection);
  return new THREE.Vector3(x*scale, y*scale, z*scale);
}

function makeLineSet(count, span, samples, mass, family, opacity){
  const positions=[];
  const colors=[];
  const color = new THREE.Color(0xf4f6fa);
  for(let i=0;i<count;i++){
    const u = (i/(count-1)-.5)*2;
    for(let j=0;j<samples-1;j++){
      const a = (j/(samples-1)-.5)*2*span;
      const b = ((j+1)/(samples-1)-.5)*2*span;
      let p1,p2;
      if(family===0){ p1=warpPoint(u*span,a,0,mass); p2=warpPoint(u*span,b,0,mass); }
      if(family===1){ p1=warpPoint(a,u*span,0,mass); p2=warpPoint(b,u*span,0,mass); }
      if(family===2){ p1=warpPoint(a,0,u*span,mass); p2=warpPoint(b,0,u*span,mass); }
      positions.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);
      const depth1=.55+.45*(1-Math.min(1,Math.abs(p1.z)/(span*1.6)));
      const depth2=.55+.45*(1-Math.min(1,Math.abs(p2.z)/(span*1.6)));
      colors.push(color.r*depth1,color.g*depth1,color.b*depth1,color.r*depth2,color.g*depth2,color.b*depth2);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});
  return new THREE.LineSegments(geo,mat);
}

function buildVolume(){
  while(gridGroup.children.length) gridGroup.remove(gridGroup.children[0]);
  const mass=state.mass;
  const span=11;
  // Three orthogonal families form a true volumetric lattice rather than a plane.
  for(let f=0;f<3;f++) gridGroup.add(makeLineSet(19,span,65,mass,f,.34));

  // Nested spherical latitude/longitude shells make the depth of the fabric explicit.
  for(let shell=0;shell<7;shell++){
    const radius=2.4+shell*1.25;
    const seg=96;
    const pos=[];
    for(let lat=1;lat<12;lat++){
      const phi=Math.PI*lat/12;
      for(let k=0;k<seg;k++){
        const a=2*Math.PI*k/seg, a2=2*Math.PI*(k+1)/seg;
        const p1=warpPoint(radius*Math.sin(phi)*Math.cos(a),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(a),mass);
        const p2=warpPoint(radius*Math.sin(phi)*Math.cos(a2),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(a2),mass);
        pos.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);
      }
    }
    for(let lon=0;lon<24;lon++){
      const a=2*Math.PI*lon/24;
      for(let k=0;k<24;k++){
        const p= Math.PI*k/24, p2=Math.PI*(k+1)/24;
        const q1=warpPoint(radius*Math.sin(p)*Math.cos(a),radius*Math.cos(p),radius*Math.sin(p)*Math.sin(a),mass);
        const q2=warpPoint(radius*Math.sin(p2)*Math.cos(a),radius*Math.cos(p2),radius*Math.sin(p2)*Math.sin(a),mass);
        pos.push(q1.x,q1.y,q1.z,q2.x,q2.y,q2.z);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    const m=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.075+(6-shell)*.012,depthWrite:false});
    depthGroup.add(new THREE.LineSegments(g,m));
  }
}

const shadow = new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshBasicMaterial({color:0x000000}));
scene.add(shadow);
const shadowHalo = new THREE.Mesh(new THREE.SphereGeometry(1.12,64,48),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.45,side:THREE.BackSide}));
scene.add(shadowHalo);

const photon = new THREE.Mesh(new THREE.TorusGeometry(1.52,.075,24,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.98,blending:THREE.AdditiveBlending,depthWrite:false}));
photon.rotation.x=Math.PI*.5; scene.add(photon);
const photonGlow = new THREE.Mesh(new THREE.TorusGeometry(1.58,.22,20,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.20,blending:THREE.AdditiveBlending,depthWrite:false}));
photonGlow.rotation.x=Math.PI*.5; scene.add(photonGlow);

const disk = new THREE.Group();
disk.rotation.x=.34;scene.add(disk);
for(let i=0;i<5;i++){
  const r=1.75+i*.48;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.035+i*.006,12,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.16+(4-i)*.07,blending:THREE.AdditiveBlending,depthWrite:false}));
  disk.add(ring);
}

const starGeo=new THREE.BufferGeometry();
const starPos=[];
for(let i=0;i<2600;i++){
  const r=55+Math.random()*190;
  const a=Math.random()*Math.PI*2;
  const z=(Math.random()-.5)*2*r;
  const s=Math.sqrt(Math.max(0,r*r-z*z));
  starPos.push(s*Math.cos(a),s*Math.sin(a),z);
}
starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:.13,sizeAttenuation:true,transparent:true,opacity:.62}))); 

function updatePhysics(){
  const m=state.mass;
  const rsKm=2.95325008*m;
  if(readout) readout.textContent=`Rs = ${rsKm.toFixed(2)} km · α ≈ 4GM/(bc²) · M = ${m.toFixed(1)} M☉`;
  const rv=rsVisual(m);
  shadow.scale.setScalar(rv);
  shadowHalo.scale.setScalar(rv*1.08);
  photon.scale.setScalar(rv/1.35);
  photonGlow.scale.setScalar(rv/1.35);
  disk.scale.setScalar(rv/1.35);
}

window.__COSMOSIM_4D_SET__ = on => {
  state.enabled=!!on;
  stage.classList.toggle('on',state.enabled);
  if(state.enabled){
    document.querySelectorAll('#space > canvas').forEach(c=>{c.dataset.cosmosimOriginalDisplay=c.style.display;c.style.display='none';});
    buildVolume();updatePhysics();resize();
  }else{
    document.querySelectorAll('#space > canvas').forEach(c=>{c.style.display=c.dataset.cosmosimOriginalDisplay||'';delete c.dataset.cosmosimOriginalDisplay;});
  }
};

function resize(){const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
addEventListener('resize',resize);

let lastMass=state.mass;
function loop(){
  if(state.enabled){
    const m=Number(document.getElementById('mass')?.value||10);
    if(m!==lastMass){state.mass=m;buildVolume();updatePhysics();lastMass=m;}
    controls.update();
    // Slow spacetime rotation gives the volumetric lattice changing depth cues.
    gridGroup.rotation.y += .00055;
    depthGroup.rotation.y += .00055;
    disk.rotation.z += .0012;
    renderer.render(scene,camera);
  }
  requestAnimationFrame(loop);
}
loop();

stage.addEventListener('wheel',e=>{if(!state.enabled)return;e.preventDefault();controls.dollyIn(Math.pow(.95,e.deltaY/40));controls.update();},{passive:false});

function buttonReady(){
  if(document.getElementById('cosmosim4DButton'))return;
  const body=document.getElementById('panelBody');
  if(!body)return;
  const b=document.createElement('button');
  b.id='cosmosim4DButton';b.type='button';b.textContent='◉ 4D VISION · OFF';b.setAttribute('aria-pressed','false');
  body.appendChild(b);
  b.addEventListener('click',()=>{
    const active=document.querySelector('.simChoice.active')?.dataset.sim;
    if(active&&active!=='blackhole')return;
    const next=!state.enabled;
    b.classList.toggle('on',next);b.textContent=next?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';b.setAttribute('aria-pressed',String(next));
    window.__COSMOSIM_4D_SET__(next);
  });
}
buttonReady();
new MutationObserver(buttonReady).observe(document.body,{childList:true,subtree:true});

// Turning 4D off/on from the simulation selector never changes other simulations.
document.querySelectorAll('.simChoice').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.dataset.sim!=='blackhole' && state.enabled){
    state.enabled=false;stage.classList.remove('on');
    document.querySelectorAll('#space > canvas').forEach(c=>{c.style.display=c.dataset.cosmosimOriginalDisplay||'';delete c.dataset.cosmosimOriginalDisplay;});
    const b=document.getElementById('cosmosim4DButton');if(b){b.classList.remove('on');b.textContent='◉ 4D VISION · OFF';}
  }
}));

resize();
`;
  document.body.appendChild(script);

  // Bridge state into the module scope without leaking any simulation objects.
  window.__COSMOSIM_4D_STATE__ = state;
  new MutationObserver(() => {
    const b = document.getElementById('cosmosim4DButton');
    if (b && !b.dataset.bridge) {
      b.dataset.bridge = '1';
    }
  }).observe(document.body,{childList:true,subtree:true});
})();
