/* COSMOSIM Destruction Lab — isolated mode; does not alter the original simulation scenes. */
(() => {
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  let booted = false, active = false, paused = false, frame = 0, last = 0;
  let renderer, scene, camera, orbit, targetGroup, targetMesh, targetType = 'Earth';
  let hp = 100, maxHp = 100, attackerLevel = 2, attackKind = 'alien', attackTimer = 0;
  let effects = [], debris = [], satellites = [], objectPanelOpen = true, attackPanelOpen = true;
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
    Earth:[['alien','👽 Alien assault',2],['nuke','☢️ Nuclear strike',3],['moon','🌕 Moon impact',4],['asteroids','☄️ Asteroid barrage',2],['beam','⚡ Orbital energy beam',3]],
    Moon:[['alien','👽 Alien assault',2],['asteroids','☄️ Asteroid barrage',2],['nuke','☢️ Nuclear strike',3],['moon','🪨 Heavy impactor',3]],
    Mars:[['alien','👽 Alien assault',2],['nuke','☢️ Nuclear strike',3],['asteroids','☄️ Asteroid barrage',2],['beam','⚡ Orbital energy beam',3]],
    Saturn:[['alien','👽 Fleet bombardment',3],['asteroids','☄️ Asteroid barrage',2],['supernova','💥 Stellar shockwave',4],['beam','⚡ Orbital energy beam',3]],
    Sun:[['alien','👽 Heavy alien fleet',3],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Supernova shockwave',5],['blackpulse','🕳️ Gravity pulse',3]],
    'Black Hole':[['alien','👽 Heavy alien fleet',3],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Stellar shockwave',3],['blackpulse','🕳️ Gravity pulse',5]],
    Wormhole:[['alien','👽 Fleet destabilizer',2],['antimatter','✨ Antimatter pulse',4],['blackpulse','🕳️ Gravity pulse',5],['beam','⚡ Energy beam',3]],
    Galaxy:[['alien','👽 Galactic armada',4],['antimatter','✨ Antimatter pulse',4],['supernova','💥 Supernova shockwave',5],['blackpulse','🕳️ Gravity pulse',5]]
  };
  const opts = {Earth:{r:2.6,color:0x1c70c9,hp:100},Moon:{r:1.65,color:0xaaaeb7,hp:65},Mars:{r:2.15,color:0xb54c32,hp:80},Saturn:{r:2.5,color:0xc6a66c,hp:140},Sun:{r:3.0,color:0xff8a22,hp:220},'Black Hole':{r:2.25,color:0x03030b,hp:260},Wormhole:{r:2.35,color:0x7d54ff,hp:180},Galaxy:{r:3.6,color:0x8265df,hp:320}};
  function injectStyle(){
    if($('destructionStyle'))return;
    const s=document.createElement('style');s.id='destructionStyle';s.textContent=`
      #destructionStage{position:fixed;inset:0;z-index:30;background:radial-gradient(ellipse at 50% 48%,#101b42 0%,#03040b 70%);display:none}
      #destructionStage canvas{display:block;width:100%;height:100%;touch-action:none}
      .dl-panel{position:fixed;z-index:36;width:min(285px,calc(100vw - 28px));max-height:44vh;overflow:auto;padding:12px;border:1px solid #6d7fc0aa;border-radius:15px;background:linear-gradient(145deg,#0a1225ee,#050814e8);backdrop-filter:blur(13px);box-shadow:0 12px 40px #0008;color:#eef3ff;font:12px system-ui,Arial}
      .dl-panel h3{margin:0 30px 8px 0;font-size:13px;letter-spacing:1px}
      .dl-close{position:absolute;right:8px;top:8px;width:27px;height:27px;padding:0;border-radius:50%;background:#303957;font-size:16px}
      .dl-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .dl-choice{width:100%;padding:9px 7px;text-align:left;background:#111c36;border:1px solid #33436c;color:#eaf0ff;font-size:11px}
      .dl-choice.active{border-color:#a995ff;background:#302653}
      .dl-panel label{display:block;color:#b5c3e8;margin:9px 0 4px;font-size:11px}
      .dl-panel input[type=range]{width:100%;accent-color:#a58bff}
      .dl-row{display:flex;gap:6px;margin-top:7px}.dl-row button{flex:1;font-size:11px;padding:8px 6px}
      #dlObjects{left:12px;top:86px}#dlAttackers{left:12px;top:calc(86px + min(44vh,370px) + 10px)}
      #dlStatus{position:fixed;z-index:35;right:12px;bottom:14px;width:min(300px,calc(100vw - 24px));padding:12px;border:1px solid #52618d88;border-radius:14px;background:#050a18d9;color:#e9efff;font:12px/1.55 system-ui;backdrop-filter:blur(10px)}
      #dlStatus strong{color:#8cecff}#dlHealth{height:7px;background:#25304c;border-radius:99px;overflow:hidden;margin:7px 0}#dlHealthFill{height:100%;width:100%;background:linear-gradient(90deg,#50e2a2,#f5d15c);transition:width .25s}
      #dlTop{position:fixed;z-index:36;top:12px;left:50%;transform:translateX(-50%);padding:8px 13px;border:1px solid #6c7fba;border-radius:999px;background:#070d1ce8;font:700 11px system-ui;letter-spacing:1.5px;white-space:nowrap}
      #dlExit{position:fixed;z-index:38;right:12px;top:78px}\n      .dl-reopen{position:fixed;z-index:37;left:12px;padding:8px 10px;border:1px solid #6d7fc0;background:#101a32;color:#eef3ff;border-radius:999px;font:700 11px system-ui;box-shadow:0 5px 18px #0008}\n      #dlReopenObjects{top:88px}#dlReopenAttackers{top:128px}
      @media(max-width:600px){.dl-panel{width:min(240px,calc(100vw - 24px));max-height:35vh;padding:9px}#dlObjects{top:76px;left:8px}#dlAttackers{top:auto;bottom:92px;left:8px;max-height:28vh}#dlStatus{right:8px;bottom:8px;width:calc(100vw - 272px);min-width:125px;font-size:10px;padding:8px}#dlTop{top:12px;font-size:9px}#dlExit{right:8px;top:57px;padding:8px;font-size:10px}.dl-choice{font-size:10px;padding:7px 5px}}
    `;document.head.appendChild(s);
  }
  function makeUI(){
    injectStyle();
    canvasHost=document.createElement('div');canvasHost.id='destructionStage';document.body.appendChild(canvasHost);
    const top=document.createElement('div');top.id='dlTop';top.textContent='COSMOSIM · DESTRUCTION LAB';document.body.appendChild(top);
    const exit=document.createElement('button');exit.id='dlExit';exit.className='secondary';exit.textContent='← Exit Lab';exit.onclick=exitMode;document.body.appendChild(exit);
    objectPanel=document.createElement('section');objectPanel.id='dlObjects';objectPanel.className='dl-panel';objectPanel.innerHTML='<button class="dl-close" id="dlCloseObjects" aria-label="Hide object panel">×</button><h3>📍 OBJECT BAY</h3><div style="color:#9eadd5;margin-bottom:8px">Choose an object. It stays anchored at this fixed point.</div><div class="dl-grid" id="dlObjectChoices"></div><div class="dl-row"><button id="dlRemove" class="secondary">− Remove object</button><button id="dlRestore">↻ Restore</button></div>';
    attackPanel=document.createElement('section');attackPanel.id='dlAttackers';attackPanel.className='dl-panel';attackPanel.innerHTML='<button class="dl-close" id="dlCloseAttackers" aria-label="Hide attacker panel">×</button><h3>⚔️ DESTRUCTION SYSTEMS</h3><div style="color:#9eadd5;margin-bottom:8px">Attacker strength controls damage and impact effects.</div><div class="dl-grid" id="dlAttackChoices"></div><label>Attacker strength · <b id="dlStrengthLabel">2 / 5</b></label><input id="dlStrength" type="range" min="1" max="5" value="2"><div class="dl-row"><button id="dlAttackNow">▶ Launch attack</button><button id="dlClear" class="secondary">Clear effects</button></div>';
    const reopenObj=document.createElement('button');reopenObj.id='dlReopenObjects';reopenObj.className='dl-reopen';reopenObj.textContent='＋ Object Bay';reopenObj.style.display='none';reopenObj.onclick=()=>{objectPanel.style.display='block';objectPanelOpen=true;reopenObj.style.display='none';};document.body.appendChild(reopenObj);const reopenAtk=document.createElement('button');reopenAtk.id='dlReopenAttackers';reopenAtk.className='dl-reopen';reopenAtk.textContent='＋ Attackers';reopenAtk.style.display='none';reopenAtk.onclick=()=>{attackPanel.style.display='block';attackPanelOpen=true;reopenAtk.style.display='none';};document.body.appendChild(reopenAtk);\n    const status=document.createElement('div');status.id='dlStatus';status.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px"><b id="dlTargetName">EARTH</b><span id="dlHpText">Integrity 100%</span></div><div id="dlHealth"><div id="dlHealthFill"></div></div><div id="dlAttackName"><strong>Ready:</strong> choose an attacker</div><div id="dlStatusText" style="color:#aebde2;margin-top:4px">Object is fixed at the central display point.</div>';
    document.body.append(objectPanel,attackPanel,status);statusEl=$('dlStatusText');healthEl=$('dlHealthFill');targetNameEl=$('dlTargetName');attackNameEl=$('dlAttackName');
    $('dlCloseObjects').onclick=()=>{objectPanel.style.display='none';objectPanelOpen=false;$('dlReopenObjects').style.display='block';};
    $('dlCloseAttackers').onclick=()=>{attackPanel.style.display='none';attackPanelOpen=false;$('dlReopenAttackers').style.display='block';};
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
  function buildTarget(type){
    if(!scene)return;
    if(targetGroup){scene.remove(targetGroup);targetGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}
    targetType=type;const data=opts[type];targetGroup=new THREE.Group();targetGroup.position.set(0,0,0);scene.add(targetGroup);satellites=[];
    const mat=(color,rough=.8,metal=.02,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
    if(type==='Earth'||type==='Moon'||type==='Mars'||type==='Saturn'||type==='Sun'){
      let material=mat(data.color,type==='Sun'?.4:.9,0,{emissive:type==='Sun'?0xff4b08:0x071222,emissiveIntensity:type==='Sun'?1.15:.08});
      if(type==='Earth')material=mat(0xffffff,.86,.01,{map:earthTexture(),emissive:0x06213d,emissiveIntensity:.18});
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(data.r,80,56),material);targetGroup.add(sphere);targetMesh=sphere; sphere.castShadow=true;
      if(type==='Earth'||type==='Mars')for(let i=0;i<(type==='Earth'?30:55);i++){const r=data.r*(.95+Math.random()*.045),a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);const crater=new THREE.Mesh(new THREE.CircleGeometry(type==='Earth'?.018:.045,10),new THREE.MeshBasicMaterial({color:type==='Earth'?0x478d56:0x6d2c20,transparent:true,opacity:.28,side:THREE.DoubleSide}));crater.position.set(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));crater.lookAt(crater.position.clone().multiplyScalar(2));targetGroup.add(crater);}
      if(type==='Earth'){
        const atmo=new THREE.Mesh(new THREE.SphereGeometry(data.r*1.09,64,48),new THREE.MeshBasicMaterial({color:0x319bff,transparent:true,opacity:.13,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));targetGroup.add(atmo);
        const cloud=new THREE.Mesh(new THREE.SphereGeometry(data.r*1.018,64,48),new THREE.MeshBasicMaterial({color:0xeaf7ff,transparent:true,opacity:.12,wireframe:true,depthWrite:false}));targetGroup.add(cloud);
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
    if(statusEl)statusEl.textContent=type+' placed at the fixed centre point. Choose a destroyer to launch an animated attack.';
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
  function launchAttack(){
    if(!active||!targetGroup||!targetGroup.visible){statusEl.textContent='Add an object at the fixed point before launching an attack.';return;}
    const power=+ $('dlStrength').value;attackerLevel=power;
    const baseDamage={1:5,2:10,3:17,4:26,5:38}[power];const scale=opts[targetType].hp/100;
    const damage=Math.min(hp,Math.round(baseDamage*scale*(attackKind==='moon'||attackKind==='supernova'?1.25:1)));
    hp=Math.max(0,hp-damage);updateHealth();attackNameEl.innerHTML='<strong>Impact:</strong> '+attackKind+' · strength '+power+'/5 · −'+damage+' integrity';
    statusEl.textContent=attacks[targetType].find(a=>a[0]===attackKind)?.[1]+' launched. Approximate energy model: stronger attackers cause more damage; object remains at the same location.';
    if(attackKind==='alien'){
      const ship=new THREE.Group();const hull=new THREE.Mesh(new THREE.ConeGeometry(.28,.9,8),new THREE.MeshStandardMaterial({color:0x9eb4cc,metalness:.8,roughness:.25,emissive:0x143b61}));hull.rotation.z=-Math.PI/2;ship.add(hull);
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.8,.05,.22),new THREE.MeshStandardMaterial({color:0x5b6b9c,metalness:.8}));ship.add(wing);
      ship.position.set(0,1,-12);addEffect(ship,3,(o,t)=>{o.position.x=Math.sin(t*4)*.7;o.position.z=-12+t*4.2;if(Math.floor(t*5)!==Math.floor((t-.04)*5)){const p=makeProjectile(0xff3d65,.07);p.position.copy(o.position);const dest=new THREE.Vector3(0,0,0);const dir=dest.sub(p.position).normalize();addEffect(p,1.2,(q,tt)=>q.position.addScaledVector(dir,9*tt));}});
    } else if(attackKind==='nuke'||attackKind==='moon'||attackKind==='asteroids'){
      const count=attackKind==='moon'?1:attackKind==='nuke'?1:Math.min(12,3+power*2);
      for(let i=0;i<count;i++){const p=makeProjectile(attackKind==='nuke'?0xffd27d:(attackKind==='moon'?0xb4bdce:0x998a78),attackKind==='moon'?.65:.12+power*.025);p.position.set((Math.random()-.5)*3,(Math.random()-.5)*4,attackKind==='asteroids'?10:-10);const start=p.position.clone(),dest=new THREE.Vector3((Math.random()-.5)*1.2,(Math.random()-.5)*1.2,0);addEffect(p,1.8,(q,t)=>q.position.lerpVectors(start,dest,Math.min(1,t/1.8)));if(attackKind==='moon')break;}
    } else if(attackKind==='beam'||attackKind==='antimatter'||attackKind==='blackpulse'){
      const color=attackKind==='beam'?0x5be8ff:attackKind==='antimatter'?0xff62e7:0x9e79ff;const geo=attackKind==='blackpulse'?new THREE.TorusGeometry(1,.06,8,64):new THREE.CylinderGeometry(.12,.5,9,24,1,true);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(0,0,4);if(attackKind!=='blackpulse')m.rotation.x=Math.PI/2;addEffect(m,1.8,(o,t)=>{o.scale.setScalar(.4+t*1.6);o.material.opacity=Math.max(0,.8-t*.4);if(attackKind==='blackpulse')o.rotation.z=t*2;});
    } else if(attackKind==='supernova'){
      const wave=new THREE.Mesh(new THREE.SphereGeometry(.5,32,24),new THREE.MeshBasicMaterial({color:0xffa04d,wireframe:true,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));addEffect(wave,2.2,(o,t)=>{o.scale.setScalar(1+t*10);o.material.opacity=Math.max(0,.8-t*.35);});
    }
    // Brief luminous impact ring and restrained fragments; no object translation.
    const impact=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),new THREE.MeshBasicMaterial({color:0xffb85e,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));addEffect(impact,1.0,(o,t)=>{o.scale.setScalar(1+t*12);o.material.opacity=Math.max(0,.8-t*.8);});
    for(let i=0;i<Math.min(20,4+power*3);i++){const d=new THREE.Mesh(new THREE.IcosahedronGeometry(.035+Math.random()*.045,0),new THREE.MeshStandardMaterial({color:0xffa26a,emissive:0x7a1c08}));d.position.set((Math.random()-.5)*opts[targetType].r*2,(Math.random()-.5)*opts[targetType].r*2,(Math.random()-.5)*opts[targetType].r*2);d.userData.v=new THREE.Vector3((Math.random()-.5)*1.8,(Math.random()-.5)*1.8,(Math.random()-.5)*1.8);addEffect(d,2,(o,t)=>{o.position.addScaledVector(o.userData.v,.025);o.rotation.x+=.03;o.rotation.y+=.04;o.material.opacity=Math.max(0,1-t/2);});}
    if(hp===0){targetGroup.visible=false;statusEl.textContent=targetType+' destroyed in this visual experiment. The display point is unchanged; press Restore to respawn it.';}
  }
  async function setupThree(){
    if(booted)return;booted=true;
    const THREE=await import(THREE_URL);
    scene=new THREE.Scene();scene.background=new THREE.Color(0x030611);scene.fog=new THREE.FogExp2(0x030611,.006);
    camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,900);camera.position.set(0,4.8,13);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;canvasHost.appendChild(renderer.domElement);
    const Controls=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');orbit=new Controls.OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.minDistance=5;orbit.maxDistance=38;orbit.target.set(0,0,0);
    scene.add(new THREE.AmbientLight(0x8396c4,1.25));const key=new THREE.PointLight(0xffd8a0,140,60);key.position.set(-7,8,8);scene.add(key);const fill=new THREE.PointLight(0x3c75ff,55,45);fill.position.set(7,-3,-8);scene.add(fill);
    const starGeo=new THREE.BufferGeometry(),pos=[];for(let i=0;i<5000;i++){const r=70+Math.random()*220,a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1);pos.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xc4d6ff,size:1.1,sizeAttenuation:false})));
    makeUI();chooseObject('Earth');window.addEventListener('resize',resize);loop=animate;requestAnimationFrame(loop);
  }
  function resize(){if(!renderer||!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  function animate(now){
    requestAnimationFrame(loop);if(!renderer||!scene)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;frame+=dt;
    if(active&&!paused){
      if(targetGroup&&targetGroup.visible){targetGroup.rotation.y+=dt*(targetType==='Galaxy'?.08:.035);targetGroup.children.forEach(o=>{if(o.userData.satellite){o.position.x=Math.cos(frame*.55)*4.3;o.position.z=Math.sin(frame*.55)*4.3;}});}
      for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;if(e.update)e.update(e.mesh,e.age);if(e.age>=e.life){scene.remove(e.mesh);e.mesh.traverse?.(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose?.();});effects.splice(i,1);}}
      if(targetType==='Sun'&&targetGroup?.visible)targetGroup.children.forEach((o,i)=>{if(i>1&&o.material?.transparent)o.scale.setScalar(1+Math.sin(frame*2+i)*.018);});
    }
    if(orbit)orbit.update();renderer.render(scene,camera);
  }
  function enterMode(){
    active=true;paused=false;document.body.classList.add('dl-active');$('space').style.visibility='hidden';
    ['controls','stats','simInfo','simControls','hint','hudToggle'].forEach(id=>{if($(id))$(id).style.display='none';});
    $('destructionStage').style.display='block';objectPanel.style.display=objectPanelOpen?'block':'none';attackPanel.style.display=attackPanelOpen?'block':'none';$('dlReopenObjects').style.display=objectPanelOpen?'none':'block';$('dlReopenAttackers').style.display=attackPanelOpen?'none':'block';
    $('spaceMenu').classList.remove('open');document.querySelectorAll('.simChoice').forEach(b=>b.classList.toggle('active',b.dataset.sim==='destruction'));
    if($('pause'))$('pause').style.display='none';
  }
  function exitMode(){
    if(!active)return;active=false;canvasHost.style.display='none';objectPanel.style.display='none';attackPanel.style.display='none';$('dlReopenObjects').style.display='none';$('dlReopenAttackers').style.display='none';
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
        if(!booted){await setupThree();}enterMode();return;
      }
      if(active){e.preventDefault();e.stopImmediatePropagation();exitMode();setTimeout(()=>b.click(),0);}
    },true);
  }
  function onReady(){attachMenu();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',onReady);else onReady();
})();