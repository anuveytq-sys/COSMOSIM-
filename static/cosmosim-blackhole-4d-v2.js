(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D_V2__) return;
  window.__COSMOSIM_BLACKHOLE_4D_V2__ = true;

  const viewport = document.getElementById('space');
  if (!viewport) return;

  const state = {
    on: false,
    mass: 10,
    three: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    stage: null,
    root: null,
    fabric: null,
    hole: null,
    disk: null,
    stars: null,
    raf: 0,
    resizeObserver: null,
    rebuildTimer: 0,
    originalCanvas: new Map(),
    last: performance.now()
  };

  const css = document.createElement('style');
  css.textContent = `
    #cosmosim4DV2Stage{position:absolute;inset:0;display:none;overflow:hidden;z-index:1;background:#000;touch-action:none}
    #cosmosim4DV2Stage.on{display:block}
    #cosmosim4DV2Canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    #cosmosim4DV2Badge{position:absolute;left:50%;top:12px;transform:translateX(-50%);pointer-events:none;color:#fff;background:#000b;border:1px solid #fff4;border-radius:999px;padding:7px 12px;font:800 9px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.16em;white-space:nowrap;text-shadow:0 0 12px #fff}
    #cosmosim4DV2Hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);pointer-events:none;color:#ffffffaa;font:700 9px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.09em;white-space:nowrap}
    #cosmosim4DV2Button{width:100%;margin-top:8px;background:linear-gradient(135deg,#171717,#3d3d3d);color:#fff;border:1px solid #aaa;box-shadow:0 0 14px #fff2}
    #cosmosim4DV2Button.on{background:linear-gradient(135deg,#fff,#bbb);color:#050505;border-color:#fff;box-shadow:0 0 20px #fff8}
    @media(max-width:520px){#cosmosim4DV2Badge{top:8px;font-size:8px}#cosmosim4DV2Hint{bottom:7px;font-size:8px}}
  `;
  document.head.appendChild(css);

  const stage = document.createElement('div');
  stage.id = 'cosmosim4DV2Stage';
  stage.innerHTML = '<canvas id="cosmosim4DV2Canvas" aria-label="3D Schwarzschild spacetime fabric visualization"></canvas><div id="cosmosim4DV2Badge">4D VISION · SCHWARZSCHILD SPACETIME</div><div id="cosmosim4DV2Hint">DRAG / PAN · SCROLL ZOOM · PINCH ZOOM</div>';
  viewport.appendChild(stage);
  state.stage = stage;
  const canvas = stage.querySelector('#cosmosim4DV2Canvas');

  function activeBlackHole(){
    const active = document.querySelector('.simChoice.active');
    return !active || active.dataset.sim === 'blackhole';
  }

  function setOriginalVisible(show){
    viewport.querySelectorAll('canvas').forEach(node => {
      if (node === canvas) return;
      if (!state.originalCanvas.has(node)) state.originalCanvas.set(node,{display:node.style.display,visibility:node.style.visibility});
      const old = state.originalCanvas.get(node);
      if (show){ node.style.display=old.display; node.style.visibility=old.visibility; }
      else { node.style.display='none'; node.style.visibility='hidden'; }
    });
  }

  async function loadThree(){
    if(state.three) return state.three;
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const {OrbitControls} = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');
    state.three={THREE,OrbitControls};
    return state.three;
  }

  function physicalRsKm(mass){ return 2.95325008 * mass; }
  function visualRs(THREE,mass){ return Math.max(.42,physicalRsKm(mass)*.025); }

  function buildStars(THREE,rs){
    const count=9000;
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const radius=75+Math.random()*260;
      const u=Math.random()*2-1;
      const a=Math.random()*Math.PI*2;
      const s=Math.sqrt(1-u*u);
      positions[i*3]=radius*s*Math.cos(a);
      positions[i*3+1]=radius*u;
      positions[i*3+2]=radius*s*Math.sin(a);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const mat=new THREE.ShaderMaterial({
      uniforms:{uRs:{value:rs}},
      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      vertexShader:`
        uniform float uRs;
        varying float vBrightness;
        void main(){
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          float b=max(length(mv.xy),0.35);
          // Weak-field gravitational light deflection: alpha ~= 2 Rs / b.
          float alpha=min(0.42,(2.0*uRs)/(b+0.8));
          float push=1.0+alpha*0.75;
          mv.xy*=push;
          vBrightness=clamp(0.55+alpha*1.4,0.55,1.0);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp(1.15+vBrightness*1.45,1.1,3.2);
        }
      `,
      fragmentShader:`
        varying float vBrightness;
        void main(){
          vec2 p=gl_PointCoord-0.5;
          float d=length(p);
          float a=smoothstep(0.5,0.0,d)*vBrightness;
          gl_FragColor=vec4(vec3(1.0),a);
        }
      `
    });
    return new THREE.Points(geo,mat);
  }

  function makeFabric(THREE,mass){
    const group=new THREE.Group();
    group.name='3D_Inward_Spacetime_Fabric';
    const rs=visualRs(THREE,mass);
    const extent=22;
    const inner=Math.min(extent*.92,Math.max(rs*2.8,2.8));
    const depth=2*Math.sqrt(Math.max(.01,rs*(inner-rs)));
    const divisions=42;
    const vertices=[];
    const index=(i,j)=>i*(divisions+1)+j;
    function height(x,z){
      const r=Math.sqrt(x*x+z*z);
      const rr=Math.max(rs*1.015,r);
      const local=2*Math.sqrt(Math.max(.0001,rs*(rr-rs)));
      const outer=2*Math.sqrt(Math.max(.0001,rs*(inner-rs)));
      const well=-Math.max(0,outer-local);
      const taper=Math.min(1,Math.max(0,(r-rs)/(inner-rs)));
      return well*(0.86+0.14*taper);
    }
    for(let i=0;i<=divisions;i++){
      const x=-extent+(2*extent*i/divisions);
      for(let j=0;j<=divisions;j++){
        const z=-extent+(2*extent*j/divisions);
        vertices.push(x,height(x,z),z);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const lines=new THREE.Group();
    const farMat=new THREE.LineBasicMaterial({color:0xbfc2c7,transparent:true,opacity:.28});
    const nearMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.60});
    const glowMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.16});

    for(let i=0;i<=divisions;i++){
      const ptsA=[],ptsB=[];
      for(let j=0;j<=divisions;j++){
        const a=vertices[index(i,j)*3];
        const b=vertices[index(i,j)*3+1];
        const c=vertices[index(i,j)*3+2];
        ptsA.push(new THREE.Vector3(a,b,c));
        const d=vertices[index(j,i)*3],e=vertices[index(j,i)*3+1],f=vertices[index(j,i)*3+2];
        ptsB.push(new THREE.Vector3(d,e,f));
      }
      const ga=new THREE.BufferGeometry().setFromPoints(ptsA);
      const gb=new THREE.BufferGeometry().setFromPoints(ptsB);
      lines.add(new THREE.Line(ga,i%5===0?nearMat:farMat));
      lines.add(new THREE.Line(gb,i%5===0?nearMat:farMat));
    }

    // Concentric contours emphasize the radial inward curvature and create a
    // continuous 3D well instead of disconnected or wandering 2D curves.
    for(let k=0;k<30;k++){
      const r=rs*1.03 + (extent-rs*1.03)*(k/29);
      const pts=[];
      for(let n=0;n<=192;n++){
        const a=n/192*Math.PI*2;
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        pts.push(new THREE.Vector3(x,height(x,z)+.018,z));
      }
      const g=new THREE.BufferGeometry().setFromPoints(pts);
      lines.add(new THREE.LineLoop(g,k<7?nearMat:farMat));
    }

    // Soft duplicate grid gives the white fabric a restrained luminous edge.
    const glow=lines.clone();
    glow.children.forEach(l=>{l.material=glowMat;l.scale.setScalar(1.001);});
    group.add(glow,lines);

    const rimGeo=new THREE.TorusGeometry(extent*.92,.018,8,256);
    const rim=new THREE.Mesh(rimGeo,new THREE.MeshBasicMaterial({color:0x888b90,transparent:true,opacity:.28}));
    rim.rotation.x=Math.PI/2;
    rim.position.y=height(extent*.92,0)+.02;
    group.add(rim);

    group.userData={rs,extent,depth,height};
    return group;
  }

  function makeBlackHole(THREE,mass,fabric){
    const group=new THREE.Group();
    group.name='3D_Schwarzschild_Black_Hole';
    const rs=fabric.userData.rs;
    const centerY=fabric.userData.height(0,0)-rs*.08;

    const shadow=new THREE.Mesh(
      new THREE.SphereGeometry(rs*1.48,96,64),
      new THREE.MeshStandardMaterial({color:0x000000,roughness:1,metalness:0})
    );
    shadow.position.y=centerY; group.add(shadow);

    const rim=new THREE.Mesh(
      new THREE.TorusGeometry(rs*1.52,Math.max(.045,rs*.035),24,256),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false})
    );
    rim.rotation.x=Math.PI/2; rim.position.y=centerY; group.add(rim);

    const photon=new THREE.Mesh(
      new THREE.TorusGeometry(rs*1.74,Math.max(.025,rs*.018),16,256),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false})
    );
    photon.rotation.x=Math.PI/2; photon.position.y=centerY; group.add(photon);

    const arcA=new THREE.Mesh(
      new THREE.TorusGeometry(rs*2.05,Math.max(.018,rs*.014),12,180,Math.PI*1.48),
      new THREE.MeshBasicMaterial({color:0xd8dadd,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false})
    );
    arcA.rotation.set(Math.PI/2+.24,0,.18); arcA.position.y=centerY; group.add(arcA);

    const arcB=arcA.clone();
    arcB.rotation.set(Math.PI/2-.24,0,-.18); arcB.material=arcA.material.clone(); arcB.material.opacity=.32; group.add(arcB);

    const halo=new THREE.Mesh(
      new THREE.SphereGeometry(rs*2.2,48,32),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.035,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false})
    );
    halo.position.y=centerY; group.add(halo);

    group.userData={rs,centerY,shadow,rim,photon,arcA,arcB,halo};
    return group;
  }

  function makeDisk(THREE,mass,fabric){
    const group=new THREE.Group();
    group.name='3D_Monochrome_Relativistic_Accretion_Disk';
    const rs=fabric.userData.rs;
    const y=fabric.userData.height(0,0)-rs*.03;
    group.position.y=y;
    group.rotation.set(.22,0,.10);

    const rings=[
      [rs*2.0,rs*.075,0xffffff,.95],
      [rs*2.35,rs*.12,0xe7e7e7,.72],
      [rs*2.85,rs*.16,0xbfc0c2,.46],
      [rs*3.55,rs*.19,0x8e9094,.30],
      [rs*4.3,rs*.12,0x6d6f73,.18]
    ];
    rings.forEach(([r,t,c,o])=>{
      const torus=new THREE.Mesh(new THREE.TorusGeometry(r,t,18,320),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));
      torus.rotation.x=Math.PI/2; group.add(torus);
    });

    const count=6500;
    const pos=new Float32Array(count*3);
    const col=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const f=Math.random();
      const r=rs*1.95+Math.pow(f,.72)*rs*2.55;
      const a=Math.random()*Math.PI*2;
      const thickness=(Math.random()-.5)*rs*.18*(1-f*.72);
      pos[i*3]=Math.cos(a)*r;
      pos[i*3+1]=thickness;
      pos[i*3+2]=Math.sin(a)*r;
      const b=Math.max(.22,.98-f*.72)*(0.65+Math.random()*.35);
      col[i*3]=b;col[i*3+1]=b;col[i*3+2]=b;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const points=new THREE.Points(geo,new THREE.PointsMaterial({size:Math.max(.025,rs*.035),vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
    group.add(points);
    group.userData={points,rings};
    return group;
  }

  function buildScene(){
    const {THREE,OrbitControls}=state.three;
    if(state.scene){
      state.scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}});
      state.scene.clear();
    }
    const mass=Number(document.getElementById('mass')?.value)||10;
    state.mass=mass;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x000000);
    state.scene=scene;

    const camera=state.camera||new THREE.PerspectiveCamera(52,1,.1,1000);
    state.camera=camera;
    camera.position.set(0,9.5,19.5);

    if(state.controls){state.controls.dispose();state.controls=null;}
    const controls=new OrbitControls(camera,canvas);
    controls.enableDamping=true;
    controls.dampingFactor=.055;
    controls.enablePan=true;
    controls.screenSpacePanning=true;
    controls.minDistance=6;
    controls.maxDistance=85;
    controls.zoomSpeed=.85;
    controls.panSpeed=.8;
    controls.rotateSpeed=.65;
    controls.target.set(0,-2.5,0);
    controls.update();
    state.controls=controls;

    const hemi=new THREE.HemisphereLight(0xffffff,0x080808,1.25);scene.add(hemi);
    const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(8,18,10);scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-12,5,-10);scene.add(fill);

    const fabric=makeFabric(THREE,mass);
    const hole=makeBlackHole(THREE,mass,fabric);
    const disk=makeDisk(THREE,mass,fabric);
    const stars=buildStars(THREE,fabric.userData.rs);
    scene.add(stars,fabric,disk,hole);
    state.fabric=fabric;state.hole=hole;state.disk=disk;state.stars=stars;

    const readout=document.getElementById('massOut');
    if(readout) readout.textContent=mass+' M☉';
  }

  function resize(){
    if(!state.renderer||!state.camera)return;
    const w=Math.max(1,stage.clientWidth||viewport.clientWidth||innerWidth);
    const h=Math.max(1,stage.clientHeight||viewport.clientHeight||innerHeight);
    state.renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
    state.renderer.setSize(w,h,false);
    state.camera.aspect=w/h;state.camera.updateProjectionMatrix();
  }

  async function enable(){
    if(!activeBlackHole()) return;
    if(!state.renderer){
      await loadThree();
      const {THREE}=state.three;
      state.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
      state.renderer.outputColorSpace=THREE.SRGBColorSpace;
      state.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      state.renderer.toneMappingExposure=1.18;
      buildScene();
      state.resizeObserver=new ResizeObserver(resize);state.resizeObserver.observe(stage);
      addEventListener('resize',resize,{passive:true});
    }
    if(!state.scene) buildScene();
    resize();
    state.on=true;
    stage.classList.add('on');
    setOriginalVisible(false);
    state.last=performance.now();
    if(!state.raf) state.raf=requestAnimationFrame(frame);
    updateButton();
  }

  function disable(){
    state.on=false;
    stage.classList.remove('on');
    setOriginalVisible(true);
    if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;}
    updateButton();
  }

  function frame(now){
    if(!state.on){state.raf=0;return;}
    const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
    const t=now*.001;
    if(state.disk){
      state.disk.rotation.y+=dt*.13;
      const p=state.disk.userData.points;
      if(p)p.rotation.y+=dt*.20;
    }
    if(state.hole){
      state.hole.userData.rim.material.opacity=.82+.13*Math.sin(t*2.2);
      state.hole.userData.photon.material.opacity=.40+.18*Math.sin(t*1.7+.8);
      state.hole.userData.arcA.rotation.z=.18+Math.sin(t*.25)*.05;
      state.hole.userData.arcB.rotation.z=-.18-Math.sin(t*.21)*.05;
    }
    if(state.controls)state.controls.update();
    state.renderer.render(state.scene,state.camera);
    state.raf=requestAnimationFrame(frame);
  }

  function rebuild(){
    if(!state.on)return;
    clearTimeout(state.rebuildTimer);
    state.rebuildTimer=setTimeout(()=>{buildScene();resize();},120);
  }

  function updateButton(){
    const b=document.getElementById('cosmosim4DV2Button');
    if(!b)return;
    b.classList.toggle('on',state.on);
    b.textContent=state.on?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';
    b.setAttribute('aria-pressed',String(state.on));
    b.style.display=activeBlackHole()?'block':'none';
  }

  function installButton(){
    const body=document.getElementById('panelBody');
    if(!body||document.getElementById('cosmosim4DV2Button'))return;
    const b=document.createElement('button');
    b.id='cosmosim4DV2Button';b.type='button';b.className='secondary';
    b.textContent='◉ 4D VISION · OFF';
    b.addEventListener('click',()=>state.on?disable():enable());
    body.appendChild(b);updateButton();
  }

  document.addEventListener('input',e=>{
    if(e.target?.id==='mass'){
      state.mass=Number(e.target.value)||10;
      if(state.on)rebuild();
    }
  },true);

  document.addEventListener('click',e=>{
    const choice=e.target.closest?.('.simChoice');
    if(choice){
      if(choice.dataset.sim!=='blackhole') disable();
      setTimeout(updateButton,0);
    }
  },true);

  const observer=new MutationObserver(installButton);
  observer.observe(document.body,{childList:true,subtree:true});
  installButton();
})();
