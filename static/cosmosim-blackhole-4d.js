(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D__) return;
  window.__COSMOSIM_BLACKHOLE_4D__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const state = {
    enabled: false,
    mass: 10,
    disk: true,
    time: 0,
    raf: 0,
    three: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    root: null,
    funnel: null,
    grid: new THREEGroupPlaceholder(),
    lensing: null,
    diskGroup: null,
    stars: null,
    blackHole: null,
    photonRing: null,
    resizeObserver: null
  };

  // The placeholder is replaced immediately after THREE is loaded. Keeping the
  // state shape simple makes this module safe to load beside the original lab.
  function THREEGroupPlaceholder() {}

  const css = document.createElement('style');
  css.textContent = `
    #cosmosim4DButton{
      width:100%;margin-top:8px;background:linear-gradient(135deg,#151a28,#35415f);
      border:1px solid #8e9fca;color:#f7f9ff;box-shadow:0 0 14px #9fb5ff12
    }
    #cosmosim4DButton.is-on{
      background:linear-gradient(135deg,#ffffff,#cbd4e5);color:#05070b;
      border-color:#fff;box-shadow:0 0 24px #fff9
    }
    #cosmosim4DStage{
      position:absolute;inset:0;display:none;overflow:hidden;z-index:1;
      background:#010204;touch-action:none
    }
    #cosmosim4DStage.is-on{display:block}
    #cosmosim4DCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
    #cosmosim4DBadge{
      position:absolute;left:50%;top:14px;transform:translateX(-50%);pointer-events:none;
      padding:7px 12px;border:1px solid #ffffff35;border-radius:999px;background:#020306a8;
      color:#f8f9ff;font:800 9px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.14em;
      white-space:nowrap;text-shadow:0 0 12px #fff
    }
    #cosmosim4DHint{
      position:absolute;left:50%;bottom:14px;transform:translateX(-50%);pointer-events:none;
      color:#c8d0dfaa;font:700 9px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.08em
    }
    @media(max-width:520px){#cosmosim4DBadge{top:10px;font-size:8px}#cosmosim4DHint{bottom:8px;font-size:8px}}
  `;
  document.head.appendChild(css);

  const viewport = $('#space');
  if (!viewport) return;

  const stage = document.createElement('div');
  stage.id = 'cosmosim4DStage';
  stage.innerHTML = `
    <canvas id="cosmosim4DCanvas" aria-label="Three dimensional black hole spacetime funnel"></canvas>
    <div id="cosmosim4DBadge">4D VISION · SCHWARZSCHILD SPACETIME</div>
    <div id="cosmosim4DHint">DRAG · PAN / SCROLL · ZOOM / PINCH · ZOOM</div>
  `;
  viewport.appendChild(stage);
  const canvas = $('#cosmosim4DCanvas', stage);

  const originals = () => [...viewport.querySelectorAll('canvas:not(#cosmosim4DCanvas)')];
  function setOriginalVisible(show) {
    originals().forEach(node => {
      if (show) {
        node.style.display = node.dataset.cosmosim4dDisplay || '';
        node.style.visibility = node.dataset.cosmosim4dVisibility || '';
      } else {
        if (node.dataset.cosmosim4dDisplay === undefined) node.dataset.cosmosim4dDisplay = node.style.display;
        if (node.dataset.cosmosim4dVisibility === undefined) node.dataset.cosmosim4dVisibility = node.style.visibility;
        node.style.display = 'none';
        node.style.visibility = 'hidden';
      }
    });
  }

  async function loadThree() {
    if (state.three) return state.three;
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const controlsModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');
    state.three = { THREE, OrbitControls: controlsModule.OrbitControls };
    return state.three;
  }

  function physicalRsKm(mass) {
    // Schwarzschild radius for one solar mass is about 2.953 km.
    return 2.95325008 * mass;
  }

  function buildStars(THREE) {
    const count = 6500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color(0xffffff), c2 = new THREE.Color(0xc8d8ff), c3 = new THREE.Color(0xffe7c2);
    for (let i = 0; i < count; i++) {
      const radius = 75 + Math.random() * 260;
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = radius * s * Math.cos(a);
      pos[i * 3 + 1] = radius * u;
      pos[i * 3 + 2] = radius * s * Math.sin(a);
      const c = Math.random() < .14 ? c3 : (Math.random() < .35 ? c2 : c1);
      const b = .42 + Math.random() * .58;
      col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: .42, sizeAttenuation: true, vertexColors: true, transparent: true,
      opacity: .92, depthWrite: false, blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  function makeGlowTexture(THREE) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128,128,0,128,128,128);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.12,'rgba(255,255,255,.96)');
    g.addColorStop(.32,'rgba(255,245,205,.52)');
    g.addColorStop(.62,'rgba(255,180,75,.13)');
    g.addColorStop(1,'rgba(255,120,20,0)');
    x.fillStyle=g; x.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }

  function buildFunnel(THREE, mass) {
    const group = new THREE.Group();
    group.name = 'SchwarzschildSpacetimeFunnel';

    const minDim = Math.min(stage.clientWidth || innerWidth, stage.clientHeight || innerHeight);
    // Visual normalization only: physical Rs is reported separately. The
    // geometry preserves the Schwarzschild mass relationship and the embedding
    // diagram shape while remaining legible on a screen.
    const rs = Math.max(1.55, minDim * (.009 + mass * .00034));
    const outer = Math.max(20, Math.min(38, minDim * .032));
    const depth = rs * (2.8 + .055 * mass);
    const radialSteps = 30;
    const angularSteps = 96;

    function radiusAt(i) {
      const u = i / radialSteps;
      return rs * 1.08 + Math.pow(u, 1.72) * (outer - rs * 1.08);
    }
    function yAt(r) {
      // Schwarzschild embedding-diagram-inspired depth: z ~ -2 sqrt(Rs(r-Rs)).
      // The coefficient is visually normalized, while Rs itself scales with M.
      return -depth * Math.sqrt(Math.max(0, (r - rs) / Math.max(.001, outer - rs)));
    }
    function point(r, a) {
      return new THREE.Vector3(Math.cos(a) * r, yAt(r), Math.sin(a) * r);
    }

    // A subtle dark surface gives the grid a continuous 3D substrate.
    const verts = [];
    const indices = [];
    for (let i=0;i<=radialSteps;i++) {
      const r=radiusAt(i);
      for (let j=0;j<=angularSteps;j++) {
        const p=point(r,j/angularSteps*Math.PI*2);
        verts.push(p.x,p.y,p.z);
      }
    }
    for (let i=0;i<radialSteps;i++) for (let j=0;j<angularSteps;j++) {
      const a=i*(angularSteps+1)+j, b=a+1, c=a+(angularSteps+1), d=c+1;
      indices.push(a,c,b,b,c,d);
    }
    const surfaceGeo=new THREE.BufferGeometry();
    surfaceGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    surfaceGeo.setIndex(indices); surfaceGeo.computeVertexNormals();
    const surfaceMat=new THREE.MeshStandardMaterial({
      color:0x05070a,roughness:.94,metalness:.04,transparent:true,opacity:.62,
      side:THREE.DoubleSide
    });
    const surface=new THREE.Mesh(surfaceGeo,surfaceMat); group.add(surface);

    // Circumferential grid rings: every ring is a true contour on the same funnel.
    const ringMat=new THREE.LineBasicMaterial({color:0xdfe7f2,transparent:true,opacity:.28});
    const innerMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.52});
    const radialMat=new THREE.LineBasicMaterial({color:0xeaf0f8,transparent:true,opacity:.34});
    const glowMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.68});
    const grid=new THREE.Group(); grid.name='InwardCurvatureGrid';

    for(let i=0;i<=radialSteps;i++){
      const r=radiusAt(i),pts=[];
      for(let j=0;j<=angularSteps;j++) pts.push(point(r,j/angularSteps*Math.PI*2));
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      grid.add(new THREE.LineLoop(geo,i<5?innerMat:ringMat));
    }
    // Radial lines are fixed geodesic-like tracks on the funnel. They never
    // wander sideways: each follows a constant angular coordinate into the well.
    const spokeCount=64;
    for(let j=0;j<spokeCount;j++){
      const a=j/spokeCount*Math.PI*2,pts=[];
      for(let i=0;i<=radialSteps;i++) pts.push(point(radiusAt(i),a));
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      grid.add(new THREE.Line(geo,j%8===0?glowMat:radialMat));
    }
    group.add(grid);
    group.userData={rs,outer,depth,radialSteps,angularSteps,radiusAt,yAt,point,grid};
    return group;
  }

  function buildBlackHole(THREE, mass) {
    const group = new THREE.Group(); group.name='RelativisticBlackHole';
    const minDim=Math.min(stage.clientWidth||innerWidth,stage.clientHeight||innerHeight);
    const rs=Math.max(1.55,minDim*(.009+mass*.00034));

    const shadowMat=new THREE.MeshBasicMaterial({color:0x000000,roughness:1});
    const shadow=new THREE.Mesh(new THREE.SphereGeometry(rs*1.03,96,64),shadowMat);
    shadow.scale.y=.92; group.add(shadow);

    const corona=new THREE.Mesh(new THREE.SphereGeometry(rs*1.24,64,48),new THREE.MeshBasicMaterial({
      color:0x050505,transparent:true,opacity:.22,side:THREE.BackSide,depthWrite:false
    })); group.add(corona);

    const ring=new THREE.Mesh(new THREE.TorusGeometry(rs*1.50,Math.max(.07,rs*.045),20,256),new THREE.MeshBasicMaterial({
      color:0xffffff,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false
    }));
    ring.rotation.x=Math.PI/2; group.add(ring);

    const ring2=new THREE.Mesh(new THREE.TorusGeometry(rs*1.58,Math.max(.12,rs*.10),16,256),new THREE.MeshBasicMaterial({
      color:0xffd9a0,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false
    }));
    ring2.rotation.x=Math.PI/2; group.add(ring2);

    const glowTex=makeGlowTexture(THREE);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffffff,transparent:true,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false}));
    sprite.scale.set(rs*5.8,rs*5.8,1); group.add(sprite);

    group.userData={rs,shadow,corona,ring,ring2,sprite};
    return group;
  }

  function buildAccretionDisk(THREE, mass) {
    const group=new THREE.Group(); group.name='RelativisticAccretionDisk';
    const minDim=Math.min(stage.clientWidth||innerWidth,stage.clientHeight||innerHeight);
    const rs=Math.max(1.55,minDim*(.009+mass*.00034));
    group.rotation.x=.12;

    // Layered toroidal plasma gives real 3D thickness instead of a flat ellipse.
    const layers=[
      {r:rs*2.0,t:rs*.16,c:0xffffff,o:.72},
      {r:rs*2.55,t:rs*.20,c:0xffd18b,o:.48},
      {r:rs*3.25,t:rs*.24,c:0xff7a32,o:.30},
      {r:rs*4.05,t:rs*.18,c:0xff4b1f,o:.18}
    ];
    for(const d of layers){
      const torus=new THREE.Mesh(new THREE.TorusGeometry(d.r,d.t,16,256),new THREE.MeshBasicMaterial({
        color:d.c,transparent:true,opacity:d.o,blending:THREE.AdditiveBlending,depthWrite:false
      }));
      group.add(torus);
    }

    const count=5200,pos=new Float32Array(count*3),colors=new Float32Array(count*3);
    const hot=new THREE.Color(0xffffff),warm=new THREE.Color(0xff8a32),red=new THREE.Color(0xff2c12);
    for(let i=0;i<count;i++){
      const f=Math.random(),r=rs*2.0+f*rs*2.9, a=Math.random()*Math.PI*2;
      const thickness=(Math.random()-.5)*Math.max(.06,rs*.12)*(1-f*.55);
      pos[i*3]=Math.cos(a)*r; pos[i*3+1]=thickness; pos[i*3+2]=Math.sin(a)*r;
      const c=f<.18?hot:warm.clone().lerp(red,Math.pow(f,1.4));
      const b=.45+.55*Math.random(); colors[i*3]=c.r*b; colors[i*3+1]=c.g*b; colors[i*3+2]=c.b*b;
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const points=new THREE.Points(geo,new THREE.PointsMaterial({size:Math.max(.035,rs*.028),vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    group.add(points);
    group.userData={rs,points,layers};
    return group;
  }

  function buildLensing(THREE,mass){
    const group=new THREE.Group();group.name='GravitationalLensing';
    const minDim=Math.min(stage.clientWidth||innerWidth,stage.clientHeight||innerHeight);
    const rs=Math.max(1.55,minDim*(.009+mass*.00034));
    for(let i=0;i<12;i++){
      const r=rs*(1.7+i*.48);
      const curve=new THREE.EllipseCurve(0,0,r,r*(.42+.025*i),Math.PI*.05,Math.PI*1.95,false,0);
      const pts=curve.getPoints(180).map(p=>new THREE.Vector3(p.x,rs*(.015*i),p.y));
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({
        color:i<3?0xffffff:0xdbe5f3,transparent:true,opacity:i<3?.24:.085,blending:THREE.AdditiveBlending,depthWrite:false
      }));
      line.rotation.y=(i-6)*.035;group.add(line);
    }
    return group;
  }

  function updateMassDependentGeometry() {
    if(!state.three||!state.funnel||!state.blackHole||!state.diskGroup||!state.lensing)return;
    const {THREE}=state.three;
    const parent=state.root;
    const old=[state.funnel,state.blackHole,state.diskGroup,state.lensing];
    old.forEach(o=>parent.remove(o));
    old.forEach(o=>{o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){const ms=Array.isArray(n.material)?n.material:[n.material];ms.forEach(m=>m.dispose&&m.dispose());}});});
    state.funnel=buildFunnel(THREE,state.mass);
    state.blackHole=buildBlackHole(THREE,state.mass);
    state.diskGroup=buildAccretionDisk(THREE,state.mass);
    state.lensing=buildLensing(THREE,state.mass);
    parent.add(state.funnel,state.lensing,state.diskGroup,state.blackHole);
  }

  async function initRenderer() {
    const loaded=await loadThree();
    const {THREE,OrbitControls}=loaded;
    if(state.renderer)return;
    state.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    state.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    state.renderer.setSize(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight),false);
    state.renderer.outputColorSpace=THREE.SRGBColorSpace;
    state.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure=1.35;

    state.scene=new THREE.Scene();
    state.scene.background=new THREE.Color(0x010204);
    state.camera=new THREE.PerspectiveCamera(48,Math.max(1,stage.clientWidth)/Math.max(1,stage.clientHeight),.05,500);
    state.camera.position.set(0,13,30);
    state.controls=new OrbitControls(state.camera,state.renderer.domElement);
    state.controls.enableDamping=true;state.controls.dampingFactor=.075;
    state.controls.enablePan=true;state.controls.panSpeed=.55;
    state.controls.enableZoom=true;state.controls.zoomSpeed=.8;
    state.controls.rotateSpeed=.55;state.controls.minDistance=8;state.controls.maxDistance=80;
    state.controls.target.set(0,-2,0);state.controls.update();

    state.root=new THREE.Group();state.scene.add(state.root);
    state.stars=buildStars(THREE);state.scene.add(state.stars);

    state.scene.add(new THREE.HemisphereLight(0xaec8ff,0x030405,.55));
    const key=new THREE.PointLight(0xffffff,9,70,2);key.position.set(5,8,8);state.scene.add(key);
    const rim=new THREE.PointLight(0xff6a2a,5,50,2);rim.position.set(-8,3,-5);state.scene.add(rim);

    state.funnel=buildFunnel(THREE,state.mass);
    state.blackHole=buildBlackHole(THREE,state.mass);
    state.diskGroup=buildAccretionDisk(THREE,state.mass);
    state.lensing=buildLensing(THREE,state.mass);
    state.root.add(state.funnel,state.lensing,state.diskGroup,state.blackHole);

    // Gentle depth motion: the fabric is stationary in space; only plasma and
    // distant stars animate. This avoids fake wandering curvature lines.
    window.addEventListener('resize',resizeRenderer,{passive:true});
    state.resizeObserver=new ResizeObserver(resizeRenderer);state.resizeObserver.observe(stage);
  }

  function resizeRenderer(){
    if(!state.renderer||!state.camera)return;
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
    state.renderer.setSize(w,h,false);state.camera.aspect=w/h;state.camera.updateProjectionMatrix();
  }

  function animate(){
    if(!state.enabled){state.raf=0;return;}
    const now=performance.now();
    if(state.lastTime==null)state.lastTime=now;
    const dt=Math.min(.04,(now-state.lastTime)/1000);state.lastTime=now;state.time+=dt;
    const d=state.diskGroup;
    if(d){
      d.rotation.y += dt*.22;
      const pts=d.userData.points;
      if(pts)pts.rotation.y += dt*.34;
    }
    if(state.blackHole){
      const r=state.blackHole.userData.ring,r2=state.blackHole.userData.ring2;
      if(r)r.material.opacity=.74+.18*Math.sin(state.time*2.3);
      if(r2)r2.material.opacity=.13+.07*Math.sin(state.time*1.7+.8);
    }
    if(state.stars)state.stars.rotation.y += dt*.0018;
    state.controls.update();state.renderer.render(state.scene,state.camera);
    state.raf=requestAnimationFrame(animate);
  }

  function setEnabled(on){
    state.enabled=!!on;
    stage.classList.toggle('is-on',state.enabled);
    setOriginalVisible(!state.enabled);
    const button=$('#cosmosim4DButton');
    if(button){
      button.classList.toggle('is-on',state.enabled);
      button.textContent=state.enabled?'◉ 4D VISION · ON':'◉ 4D VISION · OFF';
      button.setAttribute('aria-pressed',String(state.enabled));
    }
    if(state.enabled){
      initRenderer().then(()=>{resizeRenderer();state.lastTime=performance.now();if(!state.raf)state.raf=requestAnimationFrame(animate);}).catch(err=>{
        console.error('COSMOSIM 4D renderer failed:',err);setEnabled(false);
      });
    }else if(state.raf){
      cancelAnimationFrame(state.raf);state.raf=0;
    }
  }

  function installButton(){
    const panel=$('#panelBody');
    if(!panel)return;
    let b=$('#cosmosim4DButton');
    if(!b){
      b=document.createElement('button');b.id='cosmosim4DButton';b.type='button';b.className='secondary';
      b.textContent='◉ 4D VISION · OFF';b.title='Open the 3D Schwarzschild spacetime-funnel view for the original Black Hole Lab';
      b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>{
        const active=window.__COSMOSIM_ACTIVE_SIM__||'blackhole';
        if(active!=='blackhole')return;
        setEnabled(!state.enabled);
      });
      panel.appendChild(b);
    }
    const active=window.__COSMOSIM_ACTIVE_SIM__||'blackhole';
    b.style.display=active==='blackhole'?'block':'none';
    if(active!=='blackhole'&&state.enabled)setEnabled(false);
  }

  document.querySelectorAll('.simChoice').forEach(button=>button.addEventListener('click',()=>{
    window.__COSMOSIM_ACTIVE_SIM__=button.dataset.sim;
    installButton();
    if(button.dataset.sim!=='blackhole')setEnabled(false);
  }));
  const initial=$('.simChoice.active');
  window.__COSMOSIM_ACTIVE_SIM__=initial?.dataset.sim||'blackhole';
  const observer=new MutationObserver(installButton);observer.observe(document.body,{childList:true,subtree:true});
  installButton();
})();
