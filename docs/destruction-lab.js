/* COSMOSIM Destruction Lab — isolated mode; does not alter the original simulation scenes. */
(() => {
  const THREE_URL = 'https://esm.sh/three@0.160.0';
  let booted = false, active = false, paused = false, frame = 0, last = 0;
  window.COSMOSIMDestructionReady = false;
  let THREE, renderer, scene, camera, orbit, targetGroup, targetMesh, targetType = 'Earth';
  let hp = 100, maxHp = 100, attackerLevel = 2, attackKind = 'alien', attackTimer = 0;
  let effects = [], debris = [], satellites = [], damageMarks = [], finalDestruction = null, starField = null, nebulaField = null, objectPanelOpen = true, attackPanelOpen = true, statusPanelOpen = true, impactSequence = 0, impactNormalForAttack = null;
  let objectPanel, attackPanel, statusEl, healthEl, targetNameEl, attackNameEl, canvasHost, loop;
  const $ = id => document.getElementById(id);
  const objectOptions = [
    ['Earth','🌍','Continents, oceans, clouds and atmosphere'],
    ['Moon','🌕','Cratered rocky satellite'],
    ['Mars','🔴','Rust-red desert planet'],
    ['Saturn','🪐','Gas giant with rings'],
    ['Sun','☀️','Luminous star with a plasma corona'],
    ['Black Hole','🕳️','Event horizon and glowing accretion disk'],
    ['Wormhole','🌀','A luminous tunnel throat'],
    ['Galaxy','🌌','A spiral galaxy with a bright core']
  ];
  const attacks = {
    Earth:[['alien','👽 Alien assault',2],['nuke','☢️ Nuclear strike',3],['moon','🌕 Moon impact',4],['asteroids','☄️ Asteroid barrage',2],['beam','⚡ Orbital energy beam',3],['throughhole','🛰️ Planet-piercer',5],['railgun','🚀 Railgun lance',4],['plasma','🔥 Plasma eruption',3],['drill','🌀 Tectonic drill',3],['ringburst','💫 Orbital ring burst',4]],
    Moon:[['alien','👽 Alien assault',2],['asteroids','☄️ Asteroid barrage',2],['nuke','☢️ Nuclear strike',3],['moon','🪨 Heavy impactor',3],['throughhole','🛰️ Lunar bore-through',5],['railgun','🚀 Railgun lance',4],['drill','🌀 Deep-core drill',3],['shatter','💎 Crust shatterwave',4]],
    Mars:[['alien','👽 Alien assault',2],['nuke','☢️ Nuclear strike',3],['asteroids','☄️ Asteroid barrage',2],['beam','⚡ Orbital energy beam',3],['throughhole','🛰️ Core piercer',5],['railgun','🚀 Magnetic railgun',4],['plasma','🔥 Plasma geyser',3],['shatter','🌋 Crust rupture',4]],
    Saturn:[['alien','👽 Fleet bombardment',3],['asteroids','☄️ Asteroid barrage',2],['supernova','💥 Stellar shockwave',4],['beam','⚡ Orbital energy beam',3],['ringburst','💫 Ring-system blast',4],['plasma','🔥 Plasma lance',4],['gravitywell','🌀 Tidal gravity well',5],['throughhole','🛰️ Atmosphere piercer',5]],
    Sun:[['alien','👽 Heavy alien fleet',3],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Supernova shockwave',5],['blackpulse','🕳️ Gravity pulse',3],['plasma','🔥 Coronal plasma lance',4],['gravitywell','🌀 Tidal gravity well',5],['ringburst','💫 Magnetic flare rings',4],['rift','🟣 Space-time rupture',5]],
    'Black Hole':[['alien','👽 Heavy alien fleet',3],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Stellar shockwave',3],['blackpulse','🕳️ Gravity pulse',5],['gravitywell','🌀 Event-horizon surge',5],['rift','🟣 Space-time rupture',5],['ringburst','💫 Accretion ring burst',4],['railgun','🚀 Relativistic lance',4]],
    Wormhole:[['alien','👽 Fleet destabilizer',2],['antimatter','✨ Antimatter pulse',4],['blackpulse','🕳️ Gravity pulse',5],['beam','⚡ Energy beam',3],['rift','🟣 Wormhole shear',5],['gravitywell','🌀 Tidal collapse',5],['ringburst','💫 Portal ring burst',4],['railgun','🚀 Dimensional lance',4]],
    Galaxy:[['alien','👽 Galactic armada',4],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Supernova shockwave',5],['blackpulse','🕳️ Gravity pulse',5],['rift','🟣 Galactic space-time tear',5],['gravitywell','🌀 Spiral tidal wave',5],['ringburst','💫 Spiral-arm burst',4],['plasma','🔥 Quasar jet',5]]
  };
  const opts = {Earth:{r:2.6,color:0x1c70c9,hp:100},Moon:{r:1.65,color:0xaaaeb7,hp:65},Mars:{r:2.15,color:0xb54c32,hp:80},Saturn:{r:2.5,color:0xc6a66c,hp:140},Sun:{r:3.0,color:0xff8a22,hp:220},'Black Hole':{r:2.25,color:0x03030b,hp:260},Wormhole:{r:2.35,color:0x7d54ff,hp:180},Galaxy:{r:3.6,color:0x8265df,hp:320}};
  function injectStyle(){
    if($('destructionStyle'))return;
    const s=document.createElement('style');s.id='destructionStyle';s.textContent=`
      #destructionStage{position:fixed;inset:0;z-index:30;background:radial-gradient(ellipse at 50% 48%,#101b42 0%,#03040b 70%);display:none}
      #destructionStage canvas{display:block;width:100%;height:100%;touch-action:none}
      .dl-panel{position:fixed;z-index:36;width:min(285px,calc(100vw - 28px));max-height:min(58vh,560px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#586b9d #091020;padding:12px;border:1px solid #6d7fc0aa;border-radius:15px;background:linear-gradient(145deg,#0a1225ee,#050814e8);backdrop-filter:blur(13px);box-shadow:0 12px 40px #0008;color:#eef3ff;font:12px system-ui,Arial}
      .dl-panel h3{margin:0 30px 8px 0;font-size:13px;letter-spacing:1px}
      .dl-close{position:absolute;right:8px;top:8px;width:27px;height:27px;padding:0;border-radius:50%;background:#303957;font-size:16px}
      .dl-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .dl-choice{width:100%;padding:9px 7px;text-align:left;background:#111c36;border:1px solid #33436c;color:#eaf0ff;font-size:11px}
      .dl-choice.active{border-color:#a995ff;background:#302653}
      .dl-panel label{display:block;color:#b5c3e8;margin:9px 0 4px;font-size:11px}
      .dl-panel input[type=range]{width:100%;accent-color:#a58bff}
      .dl-row{display:flex;gap:6px;margin-top:7px}.dl-row button{flex:1;font-size:11px;padding:8px 6px}
      #dlObjects{left:50%;transform:translateX(-50%);bottom:12px;top:auto;width:min(820px,calc(100vw - 330px));max-width:calc(100vw - 330px);max-height:min(30vh,280px);overflow-y:auto;overflow-x:hidden}#dlObjects .dl-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;overflow:visible;padding:2px 0 7px}#dlObjects .dl-choice{min-width:0;width:100%;flex:none;text-align:center;padding:10px 4px}#dlAttackers{left:12px;top:86px;bottom:auto;width:245px;max-height:calc(100vh - 112px);overflow-y:auto}#dlAttackers .dl-grid{grid-template-columns:1fr;overflow-y:auto;max-height:38vh}
      #dlStatus{position:fixed;z-index:35;right:12px;bottom:14px;width:min(300px,calc(100vw - 24px));max-height:32vh;overflow-y:auto;overscroll-behavior:contain;padding:12px;border:1px solid #52618d88;border-radius:14px;background:#050a18d9;color:#e9efff;font:12px/1.55 system-ui;backdrop-filter:blur(10px)}
      #dlStatus .dl-status-close{position:absolute;right:7px;top:7px;width:25px;height:25px;padding:0;border-radius:50%;background:#303957;font-size:16px}#dlStatus strong{color:#8cecff}#dlHealth{height:7px;background:#25304c;border-radius:99px;overflow:hidden;margin:7px 0}#dlHealthFill{height:100%;width:100%;background:linear-gradient(90deg,#50e2a2,#f5d15c);transition:width .25s}
      #dlTop{position:fixed;z-index:36;top:12px;left:50%;transform:translateX(-50%);padding:8px 13px;border:1px solid #6c7fba;border-radius:999px;background:#070d1ce8;font:700 11px system-ui;letter-spacing:1.5px;white-space:nowrap}
      #dlExit{position:fixed;z-index:38;right:12px;top:78px}
      .dl-reopen{position:fixed;z-index:37;left:12px;padding:8px 10px;border:1px solid #6d7fc0;background:#101a32;color:#eef3ff;border-radius:999px;font:700 11px system-ui;box-shadow:0 5px 18px #0008}
      #dlReopenObjects{top:88px}#dlReopenAttackers{top:128px}#dlReopenStatus{left:auto;right:12px;top:168px;width:auto;max-width:max-content;white-space:nowrap}
      @media(max-width:700px){.dl-panel{padding:8px}#dlObjects{left:8px;transform:none;bottom:8px;top:auto;width:calc(100vw - 16px);max-width:none;max-height:32vh}#dlObjects .dl-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:visible;gap:5px}#dlObjects .dl-choice{min-width:0;width:100%;padding:8px 2px;font-size:9px}#dlAttackers{left:8px;top:65px;bottom:auto;width:min(190px,52vw);max-height:calc(100vh - 100px);overflow-y:auto}#dlAttackers .dl-grid{grid-template-columns:1fr 1fr;max-height:17vh;overflow:auto}#dlStatus{right:8px;bottom:calc(28vh + 18px);width:min(190px,45vw);min-width:0;max-height:22vh;font-size:10px;padding:8px}#dlTop{top:12px;font-size:9px}#dlExit{right:8px;top:49px;padding:7px;font-size:10px}#dlReopenStatus{left:auto;right:8px;top:137px;width:auto;max-width:max-content;white-space:nowrap}.dl-choice{font-size:10px;padding:7px 5px}.dl-panel h3{font-size:11px}}
    `;document.head.appendChild(s);
  }
  function makeUI(){
    injectStyle();
    canvasHost=document.createElement('div');canvasHost.id='destructionStage';document.body.appendChild(canvasHost);
    const top=document.createElement('div');top.id='dlTop';top.textContent='COSMOSIM';document.body.appendChild(top);
    const exit=document.createElement('button');exit.id='dlExit';exit.className='secondary';exit.textContent='← Exit Lab';exit.onclick=exitMode;document.body.appendChild(exit);
    objectPanel=document.createElement('section');objectPanel.id='dlObjects';objectPanel.className='dl-panel';objectPanel.innerHTML='<button class="dl-close" id="dlCloseObjects" aria-label="Hide object panel">×</button><h3>📍 OBJECT BAY</h3><div style="color:#9eadd5;margin-bottom:8px">Choose an object. It stays anchored at this fixed point.</div><div class="dl-grid" id="dlObjectChoices"></div><div class="dl-row"><button id="dlRemove" class="secondary">− Remove object</button><button id="dlRestore">↻ Restore</button></div>';
    attackPanel=document.createElement('section');attackPanel.id='dlAttackers';attackPanel.className='dl-panel';attackPanel.innerHTML='<button class="dl-close" id="dlCloseAttackers" aria-label="Hide attacker panel">×</button><h3>⚔️ DESTRUCTION SYSTEMS</h3><div style="color:#9eadd5;margin-bottom:8px">Attacker strength controls damage and impact effects.</div><div class="dl-grid" id="dlAttackChoices"></div><label>Attacker strength · <b id="dlStrengthLabel">2 / 5</b></label><input id="dlStrength" type="range" min="1" max="5" value="2"><div class="dl-row"><button id="dlAttackNow">▶ Launch attack</button><button id="dlClear" class="secondary">Clear effects</button></div>';
    const reopenObj=document.createElement('button');reopenObj.id='dlReopenObjects';reopenObj.className='dl-reopen';reopenObj.textContent='＋ Object Bay';reopenObj.style.display='none';reopenObj.onclick=()=>{objectPanel.style.display='block';objectPanelOpen=true;reopenObj.style.display='none';};document.body.appendChild(reopenObj);const reopenAtk=document.createElement('button');reopenAtk.id='dlReopenAttackers';reopenAtk.className='dl-reopen';reopenAtk.textContent='＋ Attackers';reopenAtk.style.display='none';reopenAtk.onclick=()=>{attackPanel.style.display='block';attackPanelOpen=true;reopenAtk.style.display='none';};document.body.appendChild(reopenAtk);
    const status=document.createElement('div');status.id='dlStatus';status.innerHTML='<button class="dl-status-close" id="dlCloseStatus" aria-label="Hide status panel">×</button><div style="display:flex;justify-content:space-between;gap:8px;padding-right:24px"><b id="dlTargetName">EARTH</b><span id="dlHpText">Integrity 100%</span></div><div id="dlHealth"><div id="dlHealthFill"></div></div><div id="dlAttackName"><strong>Ready:</strong> choose an attacker</div><div id="dlStatusText" style="color:#aebde2;margin-top:4px">Object is fixed at the central display point.</div>';const reopenStatus=document.createElement('button');reopenStatus.id='dlReopenStatus';reopenStatus.className='dl-reopen';reopenStatus.textContent='＋ Status';reopenStatus.style.display='none';reopenStatus.onclick=()=>{status.style.display='block';statusPanelOpen=true;reopenStatus.style.display='none';};document.body.appendChild(reopenStatus);
    document.body.append(objectPanel,attackPanel,status);statusEl=$('dlStatusText');healthEl=$('dlHealthFill');targetNameEl=$('dlTargetName');attackNameEl=$('dlAttackName');
    $('dlCloseObjects').onclick=()=>{objectPanel.style.display='none';objectPanelOpen=false;$('dlReopenObjects').style.display='block';};
    $('dlCloseAttackers').onclick=()=>{attackPanel.style.display='none';attackPanelOpen=false;$('dlReopenAttackers').style.display='block';};$('dlCloseStatus').onclick=()=>{status.style.display='none';statusPanelOpen=false;$('dlReopenStatus').style.display='block';};
    objectOptions.forEach(([name,icon,desc])=>{const b=document.createElement('button');b.className='dl-choice';b.dataset.object=name;b.innerHTML=icon+' '+name;b.title=desc;b.onclick=()=>chooseObject(name);$('dlObjectChoices').appendChild(b);});
    $('dlRemove').onclick=()=>{if(targetGroup){targetGroup.visible=false;hp=0;updateHealth();statusEl.textContent=targetType+' removed from its fixed display point.';targetNameEl.textContent='NO OBJECT';}};
    $('dlRestore').onclick=()=>chooseObject(targetType);
    $('dlStrength').oninput=e=>{$('dlStrengthLabel').textContent=e.target.value+' / 5';attackerLevel=+e.target.value;};
    $('dlAttackNow').onclick=launchAttack;
    $('dlClear').onclick=()=>{effects.forEach(e=>{scene.remove(e.mesh);e.mesh.geometry?.dispose();if(e.mesh.material?.dispose)e.mesh.material.dispose();});effects=[];debris.forEach(d=>scene.remove(d));debris=[];statusEl.textContent='Transient attack effects cleared; object integrity unchanged.';};
  }
  function earthTexture(){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#2479c9');g.addColorStop(.5,'#0d4e9a');g.addColorStop(1,'#041c4b');x.fillStyle=g;x.fillRect(0,0,1024,512);
    const land=[[[80,130],[125,85],[210,72],[260,115],[240,160],[205,188],[190,245],[155,275],[120,225]],[[245,255],[275,285],[285,345],[260,415],[235,375],[220,315]],[[440,100],[500,65],[560,80],[590,130],[555,160],[525,205],[480,195],[450,150]],[[505,210],[550,220],[575,285],[550,355],[525,395],[500,320]],[[630,90],[700,65],[755,90],[785,135],[745,165],[710,145],[680,190],[640,155]],[[740,300],[790,270],[835,300],[820,350],[770,365]]];
    land.forEach((pts,i)=>{x.beginPath();pts.forEach(([a,b],j)=>j?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fillStyle=i%3===0?'#c7b77a':'#438451';x.fill();x.strokeStyle='#75a76a';x.lineWidth=4;x.stroke();});
    for(let i=0;i<150;i++){x.fillStyle='rgba(255,255,255,'+(.08+Math.random()*.2)+')';x.beginPath();x.ellipse(Math.random()*1024,Math.random()*512,8+Math.random()*38,2+Math.random()*7,Math.random(),0,Math.PI*2);x.fill();}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function proceduralSurfaceTexture(type){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');
    const p=({Moon:['#a9adb5','#555963','#e1e3e6'],Mars:['#b95836','#652a20','#e59a65'],Saturn:['#c9b27d','#80674b','#eee0b5'],Sun:['#ff7b16','#b82b08','#ffe16a']})[type]||['#999','#444','#ddd'];
    const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,p[2]);g.addColorStop(.48,p[0]);g.addColorStop(1,p[1]);x.fillStyle=g;x.fillRect(0,0,1024,512);
    if(type==='Saturn'){for(let y=0;y<512;y++){x.fillStyle=y%17<5?'rgba(76,53,35,.22)':'rgba(255,242,204,.10)';x.fillRect(0,y,1024,1+Math.max(0,Math.sin(y*.12)*2));}const storm=x.createRadialGradient(680,245,2,680,245,58);storm.addColorStop(0,'rgba(115,67,38,.72)');storm.addColorStop(1,'rgba(190,142,91,0)');x.fillStyle=storm;x.fillRect(610,175,140,140);}
    else {for(let i=0;i<(type==='Moon'?90:1600);i++){const a=Math.random()*1024,b=Math.random()*512,r=1+Math.random()*(type==='Moon'?20:15);x.fillStyle=i%3===0?'rgba(255,255,255,.12)':'rgba(20,20,20,.10)';x.beginPath();x.ellipse(a,b,r,r*(.35+Math.random()*.6),Math.random(),0,Math.PI*2);x.fill();}if(type==='Mars'){x.fillStyle='rgba(245,198,144,.62)';x.fillRect(0,0,1024,15);x.fillRect(0,497,1024,15);}}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  function makeNebulaTexture(){
    const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
    for(let i=0;i<18;i++){const a=60+Math.random()*392,b=60+Math.random()*392,r=40+Math.random()*120,g=x.createRadialGradient(a,b,2,a,b,r),color=['86,66,255','40,142,255','221,70,180','38,215,210'][i%4];g.addColorStop(0,'rgba('+color+',.20)');g.addColorStop(.55,'rgba('+color+',.07)');g.addColorStop(1,'rgba('+color+',0)');x.fillStyle=g;x.fillRect(a-r,b-r,r*2,r*2);}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  function buildTarget(type){
    if(!scene)return;
    if(targetGroup){scene.remove(targetGroup);targetGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}
    targetType=type;const data=opts[type];damageMarks=[];finalDestruction=null;targetMesh=null;targetGroup=new THREE.Group();targetGroup.position.set(0,0,0);scene.add(targetGroup);satellites=[];
    const mat=(color,rough=.8,metal=.02,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
    if(type==='Earth'||type==='Moon'||type==='Mars'||type==='Saturn'||type==='Sun'){
      let material=mat(data.color,type==='Sun'?.4:.9,0,{emissive:type==='Sun'?0xff4b08:0x071222,emissiveIntensity:type==='Sun'?1.15:.08});
      if(type==='Earth')material=mat(0xffffff,.78,.01,{map:earthTexture(),emissive:0x06213d,emissiveIntensity:.14});
      else if(type==='Moon'||type==='Mars'||type==='Saturn')material=mat(0xffffff,.92,.01,{map:proceduralSurfaceTexture(type),emissive:type==='Mars'?0x220600:0x080808,emissiveIntensity:.06});
      else if(type==='Sun')material=mat(0xffffff,.38,0,{map:proceduralSurfaceTexture('Sun'),emissive:0xff4b08,emissiveIntensity:1.6});
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(data.r,256,192),material);targetGroup.add(sphere);targetMesh=sphere;sphere.castShadow=true;
      const planetMaps={Earth:'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',Moon:'https://threejs.org/examples/textures/planets/moon_1024.jpg',Mars:'https://threejs.org/examples/textures/planets/mars_1k_color.jpg'};
      const textureLoader=new THREE.TextureLoader();
      if(planetMaps[type])textureLoader.load(planetMaps[type],tex=>{if(targetMesh===sphere&&sphere.material){tex.colorSpace=THREE.SRGBColorSpace;sphere.material.map=tex;sphere.material.color.set(0xffffff);sphere.material.needsUpdate=true;}},undefined,()=>{});
      if(type==='Earth'){textureLoader.load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',tex=>{if(targetMesh===sphere&&sphere.material){sphere.material.normalMap=tex;sphere.material.normalScale.set(.55,.55);sphere.material.needsUpdate=true;}},undefined,()=>{});textureLoader.load('https://threejs.org/examples/textures/planets/earth_clouds_1024.png',tex=>{if(targetType==='Earth'&&targetGroup){tex.colorSpace=THREE.SRGBColorSpace;const cloud=targetGroup.children.find(o=>o.userData.cloudLayer);if(cloud){cloud.material.map=tex;cloud.material.wireframe=false;cloud.material.opacity=.38;cloud.material.needsUpdate=true;}}},undefined,()=>{});}
      if(type==='Earth'||type==='Mars')for(let i=0;i<(type==='Earth'?30:55);i++){const r=data.r*(.95+Math.random()*.045),a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);const crater=new THREE.Mesh(new THREE.CircleGeometry(type==='Earth'?.018:.045,10),new THREE.MeshBasicMaterial({color:type==='Earth'?0x478d56:0x6d2c20,transparent:true,opacity:.28,side:THREE.DoubleSide}));crater.position.set(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));crater.lookAt(crater.position.clone().multiplyScalar(2));targetGroup.add(crater);}
      if(type==='Earth'){
        const atmo=new THREE.Mesh(new THREE.SphereGeometry(data.r*1.09,64,48),new THREE.MeshBasicMaterial({color:0x319bff,transparent:true,opacity:.13,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));targetGroup.add(atmo);
        const cloud=new THREE.Mesh(new THREE.SphereGeometry(data.r*1.018,64,48),new THREE.MeshBasicMaterial({color:0xeaf7ff,transparent:true,opacity:.13,wireframe:true,depthWrite:false}));cloud.userData.cloudLayer=true;targetGroup.add(cloud);
        const moon=new THREE.Mesh(new THREE.SphereGeometry(.18,24,16),mat(0xbec5d2));moon.position.set(4.3,.8,0);moon.userData.satellite=true;targetGroup.add(moon);satellites.push(moon);
      }
      if(type==='Saturn'){const r=new THREE.Mesh(new THREE.RingGeometry(data.r*1.25,data.r*1.9,128),new THREE.MeshStandardMaterial({color:0xdac79a,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.88}));r.rotation.x=1.27;targetGroup.add(r);}
      if(type==='Sun'){for(let i=0;i<4;i++){const corona=new THREE.Mesh(new THREE.SphereGeometry(data.r*(1.1+i*.13),40,32),new THREE.MeshBasicMaterial({color:i%2?0xff6a20:0xffd05d,transparent:true,opacity:.045,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));targetGroup.add(corona);}}
    } else if(type==='Black Hole'){
      targetMesh=new THREE.Mesh(new THREE.SphereGeometry(data.r*.64,64,48),new THREE.MeshBasicMaterial({color:0x000000}));targetGroup.add(targetMesh);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(data.r*.83,.07,12,128),new THREE.MeshBasicMaterial({color:0xffdfaa,blending:THREE.AdditiveBlending,toneMapped:false}));ring.rotation.x=1.13;targetGroup.add(ring);
      for(let i=0;i<4;i++){const disk=new THREE.Mesh(new THREE.RingGeometry(data.r*(.78+i*.16),data.r*(.9+i*.16),128),new THREE.MeshBasicMaterial({color:[0xff8a34,0xffc56b,0xa46cff,0xff5e4c][i],transparent:true,opacity:.42-i*.06,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));disk.rotation.x=1.12;targetGroup.add(disk);}
      const halo=new THREE.Mesh(new THREE.SphereGeometry(data.r*1.22,40,32),new THREE.MeshBasicMaterial({color:0x512a91,transparent:true,opacity:.12,side:THREE.BackSide,blending:THREE.AdditiveBlending}));targetGroup.add(halo);
    } else if(type==='Wormhole'){
      targetMesh=new THREE.Mesh(new THREE.SphereGeometry(data.r*.78,48,32),new THREE.MeshBasicMaterial({color:0x030414,side:THREE.BackSide}));targetGroup.add(targetMesh);
      for(let i=0;i<20;i++){const tor=new THREE.Mesh(new THREE.TorusGeometry(data.r*(.45+i*.025),.025+i*.002,8,96),new THREE.MeshBasicMaterial({color:i%2?0x4ceaff:0xa45bff,transparent:true,opacity:.7-i*.025,blending:THREE.AdditiveBlending,depthWrite:false}));tor.position.z=(i-10)*.14;targetGroup.add(tor);}
    } else if(type==='Galaxy'){
      targetMesh=new THREE.Group();targetGroup.add(targetMesh);
      for(let i=0;i<3600;i++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*data.r,arm=Math.floor(Math.random()*4)*Math.PI/2,ang=arm+r*.72+(Math.random()-.5)*.55;const star=new THREE.Mesh(new THREE.SphereGeometry(.018+Math.random()*.025,4,4),new THREE.MeshBasicMaterial({color:i%5===0?0x8deaff:(i%3===0?0xffc9ee:0xd9dcff)}));star.position.set(Math.cos(ang)*r,(Math.random()-.5)*.22,Math.sin(ang)*r);targetMesh.add(star);}
      const core=new THREE.Mesh(new THREE.SphereGeometry(.48,24,16),new THREE.MeshBasicMaterial({color:0xffd8a0,blending:THREE.AdditiveBlending}));targetMesh.add(core);
    }
    targetGroup.userData.baseScale=1;hp=maxHp=data.hp;updateHealth();
    if(targetNameEl)targetNameEl.textContent=type.toUpperCase();
    document.querySelectorAll('.dl-choice[data-object]').forEach(b=>b.classList.toggle('active',b.dataset.object===type));
    if(statusEl)statusEl.textContent=type+' placed at the fixed centre point. Choose any object in the 4-column Object Bay grid; each attack leaves a visible crater whose 3D depth and radius scale with strength.';
    refreshAttackChoices();
  }
  function updateHealth(){
    const pct=maxHp?Math.max(0,hp/maxHp*100):0;if(healthEl)healthEl.style.width=pct+'%';
    if($('dlHpText'))$('dlHpText').textContent='Integrity '+Math.round(pct)+'%';
    if(healthEl)healthEl.style.background=pct<25?'#ff526e':pct<55?'#f4b64b':'linear-gradient(90deg,#50e2a2,#f5d15c)';
  }
  function refreshAttackChoices(){
    const box=$('dlAttackChoices');if(!box)return;box.innerHTML='';
    (attacks[targetType]||attacks.Earth).forEach(([id,label,level])=>{const b=document.createElement('button');b.className='dl-choice';b.dataset.attack=id;b.textContent=label;b.onclick=()=>{attackKind=id;attackerLevel=Math.max(+ $('dlStrength').value,level);$('dlStrength').value=attackerLevel;$('dlStrengthLabel').textContent=attackerLevel+' / 5';document.querySelectorAll('.dl-choice[data-attack]').forEach(x=>x.classList.toggle('active',x.dataset.attack===id));$('dlAttackName').innerHTML='<strong>Selected:</strong> '+label;};box.appendChild(b);});
    const first=box.querySelector('button');if(first)first.click();
  }
  function chooseObject(type){buildTarget(type);}
  function addEffect(mesh,life,update){scene.add(mesh);effects.push({mesh,life,age:0,update});}
  function makeProjectile(color,r=.18){return new THREE.Mesh(new THREE.SphereGeometry(r,16,12),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.4,metalness:.2,roughness:.3}));}
  function addSurfaceDamage(power,normal){
    if(!targetGroup||!targetMesh||!['Earth','Moon','Mars','Saturn'].includes(targetType))return;
    const geometry=targetMesh.geometry;
    const radius=geometry?.parameters?.radius||opts[targetType].r;
    normal=normal?normal.clone().normalize():new THREE.Vector3(0,0,1);
    const angularRadius=.20+power*.075;
    const depth=radius*(.035+power*.028);
    const craterRadius=radius*angularRadius;
    const profile=(angle)=>{
      const q=angle/angularRadius;
      const bowl=Math.exp(-q*q*4.2);
      const rim=Math.exp(-Math.pow((q-.88)/.14,2));
      return -depth*bowl+depth*.40*rim;
    };
    // Physically deform the actual sphere geometry, not just draw a decal on top.
    if(geometry?.attributes?.position){
      const position=geometry.attributes.position;
      for(let i=0;i<position.count;i++){
        const v=new THREE.Vector3(position.getX(i),position.getY(i),position.getZ(i));
        const oldRadius=v.length();if(!oldRadius)continue;
        const direction=v.clone().normalize();
        const angle=Math.acos(THREE.MathUtils.clamp(direction.dot(normal),-1,1));
        if(angle<angularRadius*1.12){
          v.addScaledVector(direction,profile(angle));
          position.setXYZ(i,v.x,v.y,v.z);
        }
      }
      position.needsUpdate=true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
    // Build a dense bowl mesh on the same spherical coordinates as the impact.
    // It follows the deformed surface so the crater cannot float at a random offset.
    const tangent=new THREE.Vector3().crossVectors(normal,new THREE.Vector3(0,1,0));
    if(tangent.lengthSq()<.001)tangent.crossVectors(normal,new THREE.Vector3(1,0,0));
    tangent.normalize();
    const bitangent=new THREE.Vector3().crossVectors(normal,tangent).normalize();
    const rings=28,segments=96,positions=[],colors=[],indices=[];
    const innerColor=new THREE.Color(targetType==='Moon'?0x17191d:0x201710);
    const midColor=new THREE.Color(targetType==='Moon'?0x514a43:(targetType==='Mars'?0x58271c:0x39251c));
    const rimColor=new THREE.Color(targetType==='Moon'?0xc6b9a3:(targetType==='Mars'?0xb55b38:0x92714c));
    const outerColor=new THREE.Color(targetType==='Moon'?0x77736d:(targetType==='Mars'?0x9c4730:0x46613e));
    for(let ring=0;ring<=rings;ring++){
      const q=ring/rings;
      const angle=angularRadius*q;
      const radial=normal.clone().multiplyScalar(Math.cos(angle));
      for(let seg=0;seg<=segments;seg++){
        const theta=seg/segments*Math.PI*2;
        const direction=radial.clone()
          .addScaledVector(tangent,Math.sin(angle)*Math.cos(theta))
          .addScaledVector(bitangent,Math.sin(angle)*Math.sin(theta)).normalize();
        const r=radius+profile(angle)+.004;
        positions.push(direction.x*r,direction.y*r,direction.z*r);
        let color;
        if(q<.56)color=innerColor.clone().lerp(midColor,q/.56);
        else if(q<.86)color=midColor.clone().lerp(rimColor,(q-.56)/.30);
        else color=rimColor.clone().lerp(outerColor,(q-.86)/.14);
        const roughnessVariation=1+(Math.sin(theta*17+ring*2.1)*.035);
        color.multiplyScalar(roughnessVariation);
        colors.push(color.r,color.g,color.b);
      }
    }
    for(let ring=0;ring<rings;ring++){
      for(let seg=0;seg<segments;seg++){
        const a=ring*(segments+1)+seg,b=a+segments+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
    const craterGeometry=new THREE.BufferGeometry();
    craterGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    craterGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    craterGeometry.setIndex(indices);
    craterGeometry.computeVertexNormals();
    const craterMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:.01,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const crater=new THREE.Mesh(craterGeometry,craterMaterial);
    crater.userData.impactCrater=true;
    targetGroup.add(crater);
    damageMarks.push(crater);
    if(damageMarks.length>24){
      const old=damageMarks.shift();targetGroup.remove(old);
      old.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose?.();});
    }
  }
  function addThroughHole(power,normal,hitPoint,worldNormal){
    if(!targetGroup||!targetMesh||!['Earth','Moon','Mars','Saturn'].includes(targetType))return;
    const radius=targetMesh.geometry?.parameters?.radius||opts[targetType].r;
    const holeRadius=radius*(.105+power*.027);
    const axis=normal.clone().normalize();
    const geom=targetMesh.geometry;
    // Remove the actual sphere triangles around BOTH ends of the bore.
    // With those faces gone, the starfield/background is genuinely visible through the planet.
    if(geom?.attributes?.position&&geom.index){
      const pos=geom.attributes.position, old=geom.index.array, kept=[];
      const cosLimit=Math.cos(Math.asin(Math.min(.48,holeRadius/radius))*1.02);
      for(let i=0;i<old.length;i+=3){
        const ids=[old[i],old[i+1],old[i+2]];
        const dirs=ids.map(id=>new THREE.Vector3(pos.getX(id),pos.getY(id),pos.getZ(id)).normalize());
        const insideBothEnds=dirs.every(d=>Math.abs(d.dot(axis))>cosLimit);
        if(!insideBothEnds)kept.push(ids[0],ids[1],ids[2]);
      }
      geom.setIndex(kept);
      // Keep a darkened, recessed inner tunnel, but never cap either opening.
      geom.computeVertexNormals();geom.computeBoundingSphere();
    }
    const tunnelMaterial=new THREE.MeshBasicMaterial({color:0x050711,side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false});
    const tunnel=new THREE.Mesh(new THREE.CylinderGeometry(holeRadius*.83,holeRadius*.83,radius*1.94,48,1,true),tunnelMaterial);
    tunnel.position.set(0,0,0);
    tunnel.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
    targetGroup.add(tunnel);damageMarks.push(tunnel);
    // Bright rims sit at both openings; the center stays open so distant space can be seen.
    for(const sign of [-1,1]){
      const localEnd=axis.clone().multiplyScalar(radius*.985*sign);
      const end=targetGroup.localToWorld(localEnd);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(holeRadius*1.02,.035+power*.009,12,72),new THREE.MeshStandardMaterial({color:targetType==='Mars'?0xff6a35:0x91eaff,emissive:targetType==='Mars'?0x8b1c08:0x164f78,emissiveIntensity:1.4,metalness:.25,roughness:.42,side:THREE.DoubleSide}));
      rim.position.copy(end);
      rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),worldNormal.clone().multiplyScalar(sign));
      targetGroup.add(rim);damageMarks.push(rim);
      addEffect(rim,2.0,(o,t)=>{o.scale.setScalar(1+t*.28);o.material.emissiveIntensity=Math.max(.15,1.4-t*.55);});
    }
    const glow=new THREE.Mesh(new THREE.CylinderGeometry(holeRadius*.91,holeRadius*.91,radius*1.9,48,1,true),new THREE.MeshBasicMaterial({color:targetType==='Mars'?0xff4c20:0x51cfff,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    glow.position.set(0,0,0);glow.quaternion.copy(tunnel.quaternion);
    addEffect(glow,1.7,(o,t)=>{o.material.opacity=Math.max(0,.45*(1-t/1.7));});
  }
  function addSignatureAttack(kind,power,hitPoint,worldNormal){
    const colors={throughhole:0x63e8ff,railgun:0x6fe8ff,plasma:0xff5c24,drill:0xffd36c,shatter:0xb8c7ff,gravitywell:0x9a6bff,rift:0xe35bff,ringburst:0x76dcff};
    const color=colors[kind]||0xffa45c, radius=opts[targetType].r;
    if(kind==='throughhole'){addThroughHole(power,impactNormalForAttack,hitPoint,worldNormal);return;}
    if(kind==='railgun'||kind==='drill'||kind==='plasma'){
      const length=kind==='railgun'?radius*5.8:kind==='drill'?radius*4.6:radius*3.8;
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(kind==='drill'?.12:.055,kind==='drill'?.28:.16,length,24,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
      beam.position.copy(hitPoint).addScaledVector(worldNormal,length*.45);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),worldNormal.clone().negate());
      addEffect(beam,kind==='drill'?2.5:1.7,(o,t)=>{o.scale.set(kind==='drill'?1:1+t*.25,1,kind==='drill'?1:1+t*.25);o.material.opacity=Math.max(0,.92-t*.48);o.rotation.y+=kind==='drill'?.32:.025;});
      const burst=new THREE.Mesh(new THREE.SphereGeometry(.25+power*.06,32,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
      burst.position.copy(hitPoint);addEffect(burst,1.35,(o,t)=>{o.scale.setScalar(1+t*(3+power));o.material.opacity=Math.max(0,.9-t*.65);});
    } else if(kind==='gravitywell'||kind==='rift'){
      const rings=[];
      for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*(.35+i*.19),.025+power*.008,10,96),new THREE.MeshBasicMaterial({color:i%2?color:0x9ebcff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));ring.position.copy(hitPoint);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),worldNormal);addEffect(ring,2.4,(o,t)=>{o.rotation.z+=kind==='rift'?.08:-.035;o.scale.setScalar(kind==='rift'?1+t*.65:1+t*.18);o.material.opacity=Math.max(0,.8-t*.3);});rings.push(ring);}
      const pulse=new THREE.Mesh(new THREE.SphereGeometry(radius*.42,32,24),new THREE.MeshBasicMaterial({color,wireframe:true,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false}));pulse.position.copy(hitPoint);addEffect(pulse,2.2,(o,t)=>{o.scale.setScalar(1+t*(kind==='rift'?4:2.8));o.rotation.y+=.04;o.material.opacity=Math.max(0,.75-t*.32);});
    } else if(kind==='ringburst'||kind==='shatter'){
      for(let i=0;i<(kind==='shatter'?3:5);i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.3+i*.19,.035+power*.006,10,72),new THREE.MeshBasicMaterial({color:i%2?color:0xffbb6c,transparent:true,opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));ring.position.copy(hitPoint);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),worldNormal);addEffect(ring,1.8+i*.12,(o,t)=>{o.scale.setScalar(1+t*(3+power));o.rotation.z+=kind==='shatter'?.11:.025;o.material.opacity=Math.max(0,.92-t*.5);});}
      if(kind==='shatter')for(let i=0;i<18+power*5;i++){const shard=new THREE.Mesh(new THREE.TetrahedronGeometry(.06+Math.random()*.09),new THREE.MeshStandardMaterial({color:0x9eb9d8,emissive:0x203f70,emissiveIntensity:1}));shard.position.copy(hitPoint);shard.userData.v=worldNormal.clone().multiplyScalar(.7+Math.random()*power).add(new THREE.Vector3((Math.random()-.5)*power,(Math.random()-.5)*power,(Math.random()-.5)*power));addEffect(shard,2.2,(o,t)=>{o.position.addScaledVector(o.userData.v,.035);o.rotation.x+=.08;o.rotation.y+=.06;o.scale.setScalar(Math.max(.01,1-t/2.2));});}
    }
  }
  function beginFinalDestruction(){
    if(finalDestruction||!targetGroup)return;
    const duration=2.5,radius=opts[targetType].r;finalDestruction={age:0,duration,halves:[]};
    if(targetMesh?.isMesh&&targetMesh.geometry?.type==='SphereGeometry'){
      const r=targetMesh.geometry.parameters.radius||radius,material=targetMesh.material;
      const a=new THREE.Mesh(new THREE.SphereGeometry(r,64,48,0,Math.PI,0,Math.PI),Array.isArray(material)?material.map(m=>m.clone()):material.clone());
      const b=new THREE.Mesh(new THREE.SphereGeometry(r,64,48,0,Math.PI,0,Math.PI),Array.isArray(material)?material.map(m=>m.clone()):material.clone());
      a.rotation.y=0;b.rotation.y=Math.PI;a.castShadow=b.castShadow=true;targetMesh.visible=false;targetGroup.add(a,b);finalDestruction.halves=[a,b];
    }
    const flash=new THREE.Mesh(new THREE.SphereGeometry(radius*.24,24,18),new THREE.MeshBasicMaterial({color:0xffdca0,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    addEffect(flash,1.1,(o,t)=>{o.scale.setScalar(1+t*8);o.material.opacity=Math.max(0,.9-t*.8);});
    const wave=new THREE.Mesh(new THREE.SphereGeometry(radius*.9,32,24),new THREE.MeshBasicMaterial({color:0xff6738,wireframe:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}));
    addEffect(wave,1.7,(o,t)=>{o.scale.setScalar(1+t*2.6);o.material.opacity=Math.max(0,.72-t*.42);});
    const color=targetType==='Sun'?0xffbb57:targetType==='Earth'?0x6f8fbd:targetType==='Mars'?0xc86b48:0xaaaeb7;
    for(let i=0;i<42;i++){const d=new THREE.Mesh(new THREE.IcosahedronGeometry(.045+Math.random()*.09,0),new THREE.MeshStandardMaterial({color,emissive:targetType==='Sun'?0xff5a12:0x21100a,roughness:.85}));const dir=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize();d.position.copy(dir.clone().multiplyScalar(radius*(.65+Math.random()*.45)));d.userData.v=dir.multiplyScalar(.45+Math.random()*1.8);addEffect(d,2.6,(o,t)=>{o.position.addScaledVector(o.userData.v,.035);o.rotation.x+=.04;o.rotation.y+=.055;o.scale.setScalar(Math.max(.05,1-t/2.6));});}
    if(statusEl)statusEl.textContent=targetType+' is breaking apart — animated fragments and shockwave in progress.';
  }
  function launchAttack(){
    if(!active||!targetGroup||!targetGroup.visible){statusEl.textContent='Add an object at the fixed point before launching an attack.';return;}
    const power=+ $('dlStrength').value;attackerLevel=power;
    // Pick a distinct point on the visible hemisphere. Projectile, flash, ejecta and crater share this exact point.
    const phase=impactSequence++*2.399963229728653;
    const nx=Math.sin(phase)*.42,ny=Math.cos(phase*1.37)*.32;
    const impactNormal=new THREE.Vector3(nx,ny,Math.sqrt(Math.max(.2,1-nx*nx-ny*ny))).normalize();
    const surfaceRadius=targetMesh?.geometry?.parameters?.radius||opts[targetType].r;
    const hitPoint=targetGroup.localToWorld(impactNormal.clone().multiplyScalar(surfaceRadius));
    const worldNormal=impactNormal.clone().applyQuaternion(targetGroup.quaternion).normalize();
    impactNormalForAttack=impactNormal.clone();
    addSurfaceDamage(power,impactNormal);
    const baseDamage={1:5,2:10,3:17,4:26,5:38}[power];const scale=opts[targetType].hp/100;
    const damage=Math.min(hp,Math.round(baseDamage*scale*(attackKind==='moon'||attackKind==='supernova'?1.25:1)));
    hp=Math.max(0,hp-damage);updateHealth();attackNameEl.innerHTML='<strong>Impact:</strong> '+attackKind+' · strength '+power+'/5 · −'+damage+' integrity';
    statusEl.textContent=attacks[targetType].find(a=>a[0]===attackKind)?.[1]+' hit the marked surface point. Strength '+power+'/5 creates a larger and deeper crater with a raised rim, ejecta and an expanding impact wave.';
    if(attackKind==='alien'){
      const ship=new THREE.Group();const hull=new THREE.Mesh(new THREE.ConeGeometry(.28,.9,8),new THREE.MeshStandardMaterial({color:0x9eb4cc,metalness:.8,roughness:.25,emissive:0x143b61}));hull.rotation.z=-Math.PI/2;ship.add(hull);
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.8,.05,.22),new THREE.MeshStandardMaterial({color:0x5b6b9c,metalness:.8}));ship.add(wing);
      const start=hitPoint.clone().addScaledVector(worldNormal,11);ship.position.copy(start);addEffect(ship,2.7,(o,t)=>{o.position.lerpVectors(start,hitPoint,Math.min(1,t/2.7));o.rotation.y+=.04;if(Math.floor(t*5)!==Math.floor((t-.04)*5)){const p=makeProjectile(0xff3d65,.07);p.position.copy(o.position);const dest=hitPoint.clone();const dir=dest.sub(p.position).normalize();addEffect(p,Math.max(.3,p.position.distanceTo(hitPoint)/9),(q,tt)=>q.position.addScaledVector(dir,9*tt));}});
    } else if(attackKind==='nuke'||attackKind==='moon'||attackKind==='asteroids'){
      const count=attackKind==='moon'?1:attackKind==='nuke'?1:Math.min(12,3+power*2);
      for(let i=0;i<count;i++){const p=makeProjectile(attackKind==='nuke'?0xffd27d:(attackKind==='moon'?0xb4bdce:0x998a78),attackKind==='moon'?.65:.12+power*.025);const spread=new THREE.Vector3((Math.random()-.5)*1.5,(Math.random()-.5)*1.5,0);const start=hitPoint.clone().addScaledVector(worldNormal,10).add(spread);p.position.copy(start);const dest=hitPoint.clone();addEffect(p,1.8,(q,t)=>q.position.lerpVectors(start,dest,Math.min(1,t/1.8)));if(attackKind==='moon')break;}
    } else if(attackKind==='beam'||attackKind==='antimatter'||attackKind==='blackpulse'){
      const color=attackKind==='beam'?0x5be8ff:attackKind==='antimatter'?0xff62e7:0x9e79ff;const geo=attackKind==='blackpulse'?new THREE.TorusGeometry(.55,.06,12,64):new THREE.CylinderGeometry(.12,.5,9,32,1,true);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(hitPoint);if(attackKind!=='blackpulse'){m.position.addScaledVector(worldNormal,4.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),worldNormal.clone().negate());}addEffect(m,1.8,(o,t)=>{o.scale.setScalar(.4+t*1.6);o.material.opacity=Math.max(0,.9-t*.4);if(attackKind==='blackpulse')o.rotation.z=t*2;});
    } else if(attackKind==='supernova'){
      const wave=new THREE.Mesh(new THREE.SphereGeometry(.5,48,32),new THREE.MeshBasicMaterial({color:0xffa04d,wireframe:true,transparent:true,opacity:.85,blending:THREE.AdditiveBlending}));wave.position.copy(hitPoint);addEffect(wave,2.2,(o,t)=>{o.scale.setScalar(1+t*(5+power));o.material.opacity=Math.max(0,.85-t*.38);});
    }
    if(['throughhole','railgun','plasma','drill','shatter','gravitywell','rift','ringburst'].includes(attackKind))addSignatureAttack(attackKind,power,hitPoint,worldNormal);
    // Brief luminous impact ring and restrained fragments; no object translation.
    const impact=new THREE.Mesh(new THREE.SphereGeometry(.18+power*.035,32,24),new THREE.MeshBasicMaterial({color:0xffb85e,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));impact.position.copy(hitPoint);addEffect(impact,1.15,(o,t)=>{o.scale.setScalar(1+t*(4+power*1.5));o.material.opacity=Math.max(0,.95-t*.82);});
    const shock=new THREE.Mesh(new THREE.TorusGeometry(.25+power*.08,.035+power*.006,10,64),new THREE.MeshBasicMaterial({color:0xff8d5c,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));shock.position.copy(hitPoint);shock.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),worldNormal);addEffect(shock,1.25,(o,t)=>{o.scale.setScalar(1+t*(3+power));o.material.opacity=Math.max(0,.95-t*.8);});
    for(let i=0;i<Math.min(32,8+power*5);i++){const d=new THREE.Mesh(new THREE.IcosahedronGeometry(.025+Math.random()*.055*power/3,0),new THREE.MeshStandardMaterial({color:i%3===0?0xffd3a1:0xff7547,emissive:0x8a2108,emissiveIntensity:1.4,transparent:true}));d.position.copy(hitPoint).add(new THREE.Vector3((Math.random()-.5)*power*.6,(Math.random()-.5)*power*.6,(Math.random()-.5)*power*.6));d.userData.v=worldNormal.clone().multiplyScalar(1+Math.random()*power).add(new THREE.Vector3((Math.random()-.5)*power,(Math.random()-.5)*power,(Math.random()-.5)*power));addEffect(d,2.4,(o,t)=>{o.position.addScaledVector(o.userData.v,.035);o.rotation.x+=.05;o.rotation.y+=.06;o.material.opacity=Math.max(0,1-t/2.4);});}
    if(hp===0)beginFinalDestruction();
  }
  async function setupThree(){
    if(booted)return;booted=true;
    // Build the controls first so a WebGL/CDN failure never leaves a blank space screen.
    makeUI();
    try{
      THREE=await import(THREE_URL);
      scene=new THREE.Scene();scene.background=new THREE.Color(0x02040c);scene.fog=new THREE.FogExp2(0x02040c,.0032);
      camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,1100);camera.position.set(0,3.6,12.2);
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;canvasHost.appendChild(renderer.domElement);
      const Controls=await import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js');orbit=new Controls.OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=5;orbit.maxDistance=38;orbit.target.set(0,0,0);
      scene.add(new THREE.HemisphereLight(0x9ebdff,0x080b20,.8));scene.add(new THREE.AmbientLight(0x6f82b7,.42));const key=new THREE.PointLight(0xffd8a0,185,75);key.position.set(-7,8,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const fill=new THREE.PointLight(0x3c75ff,78,55);fill.position.set(7,-3,-8);scene.add(fill);const rimLight=new THREE.PointLight(0x6d54ff,48,60);rimLight.position.set(1,7,-10);scene.add(rimLight);
      const starGeo=new THREE.BufferGeometry(),pos=[];for(let i=0;i<8500;i++){const r=70+Math.random()*220,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);pos.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));starField=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd6e2ff,size:1.15,sizeAttenuation:false,transparent:true,opacity:.95}));scene.add(starField);nebulaField=new THREE.Mesh(new THREE.PlaneGeometry(130,85),new THREE.MeshBasicMaterial({map:makeNebulaTexture(),transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));nebulaField.position.set(0,0,-55);scene.add(nebulaField);const nebula2=new THREE.Mesh(new THREE.PlaneGeometry(95,68),new THREE.MeshBasicMaterial({map:makeNebulaTexture(),transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));nebula2.position.set(-35,12,-72);nebula2.rotation.z=-.42;scene.add(nebula2);nebulaField.userData.secondary=nebula2;
      chooseObject('Earth');window.addEventListener('resize',resize);loop=animate;requestAnimationFrame(loop);window.COSMOSIMDestructionReady = true;
    }catch(err){
      console.error('COSMOSIM Destruction Lab failed to initialise:',err);
      if(statusEl)statusEl.textContent='3D engine failed to start: '+(err&&err.message?err.message:String(err))+'. Check internet access, then reload the page.';
      throw err;
    }
  }
  function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  function animate(now){
    requestAnimationFrame(loop);if(!renderer||!scene)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;frame+=dt;
    if(active&&!paused){
      if(targetGroup&&targetGroup.visible){targetGroup.rotation.y+=dt*(targetType==='Galaxy'?.08:.035);targetGroup.children.forEach(o=>{if(o.userData.satellite){o.position.x=Math.cos(frame*.55)*4.3;o.position.z=Math.sin(frame*.55)*4.3;}});}
      for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;if(e.update)e.update(e.mesh,e.age);if(e.age>=e.life){scene.remove(e.mesh);e.mesh.traverse?.(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose?.();});effects.splice(i,1);}}
      if(targetType==='Sun'&&targetGroup?.visible)targetGroup.children.forEach((o,i)=>{if(i>1&&o.material?.transparent)o.scale.setScalar(1+Math.sin(frame*2+i)*.018);});
      if(finalDestruction&&targetGroup){finalDestruction.age+=dt;const t=finalDestruction.age,d=finalDestruction.duration;if(finalDestruction.halves.length===2){const a=finalDestruction.halves[0],b=finalDestruction.halves[1];a.position.x=-Math.max(0,t-.12)*1.55;a.position.y=-Math.max(0,t-.12)*.38;a.rotation.z=-t*.7;b.position.x=Math.max(0,t-.12)*1.8;b.position.y=Math.max(0,t-.12)*.58;b.rotation.z=t*.95;}else{targetGroup.scale.setScalar(Math.max(.015,1-t/d));targetGroup.rotation.z+=dt*.7;}if(t>=d){targetGroup.visible=false;finalDestruction=null;if(statusEl)statusEl.textContent=targetType+' destroyed. Choose Restore to rebuild the object at its fixed display point.';}}
      if(starField){starField.rotation.y=frame*.0018;starField.rotation.x=Math.sin(frame*.08)*.006;}if(nebulaField){nebulaField.rotation.z=frame*.0012;if(nebulaField.userData.secondary)nebulaField.userData.secondary.rotation.z=-.42+frame*.0007;}
    }
    if(orbit)orbit.update();renderer.render(scene,camera);
  }
  function enterMode(){
    active=true;paused=false;document.body.classList.add('dl-active');$('space').style.visibility='hidden';
    ['controls','stats','simInfo','simControls','hint','hudToggle'].forEach(id=>{if($(id))$(id).style.display='none';});
    $('destructionStage').style.display='block';objectPanel.style.display=objectPanelOpen?'block':'none';attackPanel.style.display=attackPanelOpen?'block':'none';$('dlReopenObjects').style.display=objectPanelOpen?'none':'block';$('dlReopenAttackers').style.display=attackPanelOpen?'none':'block';$('dlStatus').style.display=statusPanelOpen?'block':'none';$('dlReopenStatus').style.display=statusPanelOpen?'none':'block';
    $('spaceMenu').classList.remove('open');document.querySelectorAll('.simChoice').forEach(b=>b.classList.toggle('active',b.dataset.sim==='destruction'));
    if($('pause'))$('pause').style.display='none';
  }
  function exitMode(){
    if(!active)return;active=false;canvasHost.style.display='none';objectPanel.style.display='none';attackPanel.style.display='none';$('dlReopenObjects').style.display='none';$('dlReopenAttackers').style.display='none';$('dlStatus').style.display='none';$('dlReopenStatus').style.display='none';
    $('space').style.visibility='visible';['controls','stats','simInfo','simControls','hint','hudToggle'].forEach(id=>{if($(id))$(id).style.display='';});
    if($('pause'))$('pause').style.display='';document.body.classList.remove('dl-active');
    const selected=document.querySelector('.simChoice[data-sim="blackhole"]');if(selected)selected.click();
  }
  function attachMenu(){
    const menu=$('spaceMenu');if(!menu)return;
    if(!menu.querySelector('[data-sim="destruction"]')){
      const h=document.createElement('div');h.className='menuHeading';h.textContent='✦ INTERACTIVE SANDBOX';menu.appendChild(h);
      const b=document.createElement('button');b.className='simChoice';b.dataset.sim='destruction';b.textContent='🌍 Destruction Lab — Object vs Attacker';menu.appendChild(b);
    }
    menu.addEventListener('click',async e=>{
      const b=e.target.closest('.simChoice');if(!b)return;
      if(b.dataset.sim==='destruction'){
        e.preventDefault();e.stopImmediatePropagation();
        try{if(!booted){await setupThree();}enterMode();}catch(err){if(canvasHost&&objectPanel){enterMode();if(statusEl)statusEl.textContent='The 3D engine failed; showing the built-in space scene instead.';}else{console.error(err);}if(typeof window.showDestructionFallback==='function')window.showDestructionFallback();}return;
      }
      if(active){e.preventDefault();e.stopImmediatePropagation();exitMode();setTimeout(()=>b.click(),0);}
    },true);
  }
  // Expose a stable entry point for the main simulator menu as well as the capture listener.
  window.COSMOSIMDestructionOpen = async function(){
    try { if(!booted) await setupThree(); enterMode(); }
    catch(err) {
      console.error('Destruction Lab startup failed',err);
      if(canvasHost && objectPanel) {
        enterMode();
        if(statusEl) statusEl.textContent='3D engine failed to start: '+(err&&err.message?err.message:String(err))+'. Showing the built-in space scene instead.';
      }
      if(typeof window.showDestructionFallback==='function') window.showDestructionFallback();
    }
  };
  function onReady(){attachMenu();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady);else onReady();
})();