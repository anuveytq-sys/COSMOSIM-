import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D_VOLUMETRIC__) return;
  window.__COSMOSIM_BLACKHOLE_4D_VOLUMETRIC__ = true;

  const root = document.getElementById('space');
  if (!root) return;

  const style = document.createElement('style');
  style.textContent = `
    #cosmosim4DButton{display:block;width:100%;margin-top:8px;background:linear-gradient(135deg,#f7f8fb,#aeb7c7);color:#05070b;border:1px solid #fff;font-weight:900;letter-spacing:.4px}
    #cosmosim4DButton.on{background:#fff;color:#000;box-shadow:0 0 18px #fff8}
    #cosmosim4DStage{position:absolute;inset:0;display:none;overflow:hidden;background:#000;z-index:1;touch-action:none}
    #cosmosim4DStage.on{display:block}
    #cosmosim4DStage canvas{display:block;width:100%;height:100%}
    #cosmosim4DReadout{position:absolute;left:16px;top:16px;padding:8px 10px;border:1px solid #fff5;border-radius:9px;background:#000b;color:#fff;font:700 9px/1.45 ui-monospace,SFMono-Regular,monospace;letter-spacing:.11em;pointer-events:none;text-shadow:0 0 8px #fff}
    #cosmosim4DReadout b{font-size:12px}
  `;
  document.head.appendChild(style);

  const stage = document.createElement('div');
  stage.id = 'cosmosim4DStage';
  stage.innerHTML = '<div id="cosmosim4DReadout"><b>4D VISION</b><br>VOLUMETRIC SCHWARZSCHILD SPACETIME<br><span id="cosmosim4DPhysics"></span></div>';
  root.appendChild(stage);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, .018);

  const camera = new THREE.PerspectiveCamera(48, 1, .05, 500);
  camera.position.set(10, 7, 19);

  const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  stage.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.enablePan = true;
  orbit.enableZoom = true;
  orbit.minDistance = 6;
  orbit.maxDistance = 65;
  orbit.rotateSpeed = .55;
  orbit.zoomSpeed = .85;
  orbit.panSpeed = .55;
  orbit.target.set(0,0,0);

  scene.add(new THREE.AmbientLight(0xffffff,.32));
  const rim = new THREE.PointLight(0xffffff,130,70);
  rim.position.set(8,10,14);
  scene.add(rim);

  const state = {enabled:false,mass:10,lastMass:10};
  const grid = new THREE.Group();
  const shells = new THREE.Group();
  const stars = new THREE.Group();
  scene.add(grid,shells,stars);

  // Physical Schwarzschild radius: Rs = 2GM/c² = 2.95325 km per solar mass.
  // The renderer maps that physical scale into a normalized visual laboratory scale.
  function rsVisual(m){ return 1.34*Math.pow(Math.max(3,m)/10,.72); }
  function warp(x,y,z,m){
    const r=Math.hypot(x,y,z)||1e-5;
    const rs=rsVisual(m);
    const weak=Math.min(.72,2*rs/r);          // 2Rs/r = 4GM/(rc²)
    const strong=Math.min(.90,.72*Math.pow(rs/Math.max(r,rs),1.55));
    const inward=Math.min(.94,.18*weak + strong*(.62+.025*m));
    const s=Math.max(.035,1-inward);
    return new THREE.Vector3(x*s,y*s,z*s);
  }

  function rebuildGrid(){
    while(grid.children.length)grid.remove(grid.children[0]);
    while(shells.children.length)shells.remove(shells.children[0]);
    const m=state.mass, span=12, n=21, samples=71;

    // Three complete orthogonal line families. This is a volumetric 3-D lattice,
    // not a single x-y sheet: lines exist through x, y AND z directions.
    for(let family=0;family<3;family++){
      const positions=[],colors=[];
      for(let i=0;i<n;i++){
        const fixed=(i/(n-1)-.5)*2*span;
        for(let j=0;j<samples-1;j++){
          const a=(j/(samples-1)-.5)*2*span;
          const b=((j+1)/(samples-1)-.5)*2*span;
          let p1,p2;
          if(family===0){p1=warp(fixed,a,0,m);p2=warp(fixed,b,0,m);}
          if(family===1){p1=warp(a,fixed,0,m);p2=warp(b,fixed,0,m);}
          if(family===2){p1=warp(a,0,fixed,m);p2=warp(b,0,fixed,m);}
          positions.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);
          const d1=.48+.52*(1-Math.min(1,Math.abs(p1.z)/(span*1.5)));
          const d2=.48+.52*(1-Math.min(1,Math.abs(p2.z)/(span*1.5)));
          colors.push(d1,d1,d1,d2,d2,d2);
        }
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
      grid.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.30,depthWrite:false,blending:THREE.AdditiveBlending})));
    }

    // Spherical shells and meridians supply the missing depth cue: the fabric wraps
    // around the hole from every direction instead of sitting on a flat plane.
    for(let s=0;s<8;s++){
      const R=2.0+s*1.38, pos=[];
      for(let lat=1;lat<15;lat++){
        const p=Math.PI*lat/15;
        for(let k=0;k<96;k++){
          const a=2*Math.PI*k/96, b=2*Math.PI*(k+1)/96;
          const p1=warp(R*Math.sin(p)*Math.cos(a),R*Math.cos(p),R*Math.sin(p)*Math.sin(a),m);
          const p2=warp(R*Math.sin(p)*Math.cos(b),R*Math.cos(p),R*Math.sin(p)*Math.sin(b),m);
          pos.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);
        }
      }
      for(let lon=0;lon<32;lon++){
        const a=2*Math.PI*lon/32;
        for(let k=0;k<30;k++){
          const p=Math.PI*k/30,b=Math.PI*(k+1)/30;
          const p1=warp(R*Math.sin(p)*Math.cos(a),R*Math.cos(p),R*Math.sin(p)*Math.sin(a),m);
          const p2=warp(R*Math.sin(b)*Math.cos(a),R*Math.cos(b),R*Math.sin(b)*Math.sin(a),m);
          pos.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);
        }
      }
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      shells.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.10+(7-s)*.010,depthWrite:false})));
    }
  }

  // Black-hole shadow, photon ring and monochrome relativistic accretion disk.
  const black = new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshBasicMaterial({color:0x000000}));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.13,72,48),new THREE.MeshBasicMaterial({color:0x202020,transparent:true,opacity:.42,side:THREE.BackSide}));
  scene.add(black,halo);

  const photon = new THREE.Mesh(new THREE.TorusGeometry(1.52,.085,24,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.98,blending:THREE.AdditiveBlending,depthWrite:false}));
  const photonGlow = new THREE.Mesh(new THREE.TorusGeometry(1.58,.23,20,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.17,blending:THREE.AdditiveBlending,depthWrite:false}));
  photon.rotation.x=1.02;photonGlow.rotation.x=1.02;scene.add(photon,photonGlow);

  const disk=new THREE.Group();
  disk.rotation.x=.34;scene.add(disk);
  for(let i=0;i<7;i++){
    const r=1.72+i*.40;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.026+i*.006,14,256),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.12+(6-i)*.055,blending:THREE.AdditiveBlending,depthWrite:false}));
    disk.add(ring);
  }

  const starGeo=new THREE.BufferGeometry(),starPos=[];
  for(let i=0;i<3000;i++){
    const r=55+Math.random()*190,a=Math.random()*Math.PI*2,z=(Math.random()-.5)*2*r,s=Math.sqrt(Math.max(0,r*r-z*z));
    starPos.push(s*Math.cos(a),s*Math.sin(a),z);
  }
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPos,3));
  stars.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:.12,sizeAttenuation:true,transparent:true,opacity:.62})));

  function updatePhysics(){
    const m=state.mass, rv=rsVisual(m), rsKm=2.95325008*m;
    document.getElementById('cosmosim4DPhysics').textContent='Rs = '+rsKm.toFixed(2)+' km · α ≈ 4GM/(bc²) · M = '+m.toFixed(1)+' M☉';
    black.scale.setScalar(rv);halo.scale.setScalar(rv*1.08);photon.scale.setScalar(rv/1.34);photonGlow.scale.setScalar(rv/1.34);disk.scale.setScalar(rv/1.34);
  }

  const originalCanvases=[];
  function hideOriginal(){
    originalCanvases.length=0;
    root.querySelectorAll(':scope > canvas').forEach(c=>{originalCanvases.push([c,c.style.display]);c.style.display='none';});
  }
  function restoreOriginal(){originalCanvases.forEach(([c,d])=>c.style.display=d);originalCanvases.length=0;}

  function set4D(on){
    state.enabled=!!on;
    stage.classList.toggle('on',state.enabled);
    if(state.enabled){
      hideOriginal();
      state.mass=Number(document.getElementById('mass')?.value||10);
      state.lastMass=state.mass;rebuildGrid();updatePhysics();resize();
    }else restoreOriginal();
    const b=document.getElementById('cosmosim4DButton');
    if(b){b.classList.toggle('on',state.enabled);b.textContent=state.enabled?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';b.setAttribute('aria-pressed',String(state.enabled));}
  }

  function resize(){const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
  addEventListener('resize',resize);

  function ensureButton(){
    if(document.getElementById('cosmosim4DButton'))return;
    const body=document.getElementById('panelBody');if(!body)return;
    const b=document.createElement('button');b.id='cosmosim4DButton';b.type='button';b.textContent='◉ 4D VISION · OFF';b.setAttribute('aria-pressed','false');body.appendChild(b);
    b.addEventListener('click',()=>{const active=document.querySelector('.simChoice.active')?.dataset.sim;if(active&&active!=='blackhole')return;set4D(!state.enabled);});
  }
  ensureButton();
  new MutationObserver(ensureButton).observe(document.body,{childList:true,subtree:true});

  document.querySelectorAll('.simChoice').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.sim!=='blackhole'&&state.enabled)set4D(false);}));

  // The volumetric renderer uses OrbitControls: drag/pan, wheel zoom, and touch pinch/rotate.
  stage.addEventListener('wheel',e=>{if(state.enabled){e.preventDefault();orbit.dollyIn(Math.pow(.95,e.deltaY/40));orbit.update();}},{passive:false});

  function animate(){
    requestAnimationFrame(animate);
    if(!state.enabled)return;
    const m=Number(document.getElementById('mass')?.value||10);
    if(m!==state.lastMass){state.mass=m;state.lastMass=m;rebuildGrid();updatePhysics();}
    orbit.update();
    grid.rotation.y+=.00035;
    shells.rotation.y+=.00035;
    disk.rotation.z+=.0010;
    renderer.render(scene,camera);
  }
  resize();
  animate();
})();
