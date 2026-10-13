/* COSMOSIM Destruction Lab — object-specific 3D effects overlay. Earth is intentionally untouched. */
(() => {
  if (window.__COSMOSIMObjectEffects) return;
  window.__COSMOSIMObjectEffects = true;

  const THREE_URL = 'https://esm.sh/three@0.160.0';
  let THREE, renderer, scene, camera, raf, last = 0, active = false;
  let target = 'Earth', attack = 'alien', burst = 0, effects = [];
  let canvas, stage;

  const palette = {
    Sun: 0xff8b2d,
    'Black Hole': 0xff8f42,
    Wormhole: 0x9b63ff,
    Galaxy: 0x79a9ff,
    Saturn: 0xf0c878,
    Mars: 0xff5935,
    Moon: 0xbcc7d8
  };

  function getTarget() {
    const el = document.getElementById('dlTargetName');
    return el ? el.textContent.trim().replace(/\s+/g, ' ').replace(/^NO OBJECT$/,'Earth') : 'Earth';
  }

  function makeCanvas() {
    stage = document.getElementById('destructionStage');
    if (!stage || canvas) return !!stage;
    canvas = document.createElement('canvas');
    canvas.id = 'cosmosObjectFx';
    Object.assign(canvas.style, {position:'absolute', inset:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'32'});
    stage.appendChild(canvas);
    return true;
  }

  function disposeObject(o) {
    o.traverse?.(n => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose?.());
    });
  }

  function clear() {
    effects.forEach(e => { scene.remove(e.obj); disposeObject(e.obj); });
    effects = [];
  }

  function add(obj, life, update) {
    scene.add(obj);
    effects.push({obj, age:0, life, update});
  }

  function glowMat(color, opacity=.9, wire=false) {
    return new THREE.MeshBasicMaterial({color, transparent:true, opacity, wireframe:wire, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false, side:THREE.DoubleSide});
  }

  function launchSun(power) {
    const r = 3.05;
    // A solar attack becomes a 3D coronal eruption: loops, arcs, flare shell and radial plasma.
    for (let i=0;i<Math.min(9,4+power);i++) {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(r*(1.02+i*.045), .045+power*.012, 10, 96), glowMat(i%2 ? 0xffd46a : 0xff5a18, .78));
      tor.rotation.set(Math.random()*1.5, Math.random()*1.5, Math.random()*1.5);
      add(tor, 2.5, (o,t)=>{o.scale.setScalar(1+t*(.45+power*.08));o.rotation.x+=.01;o.rotation.y+=.025;o.material.opacity=Math.max(0,.78*(1-t/2.5));});
    }
    const shell = new THREE.Mesh(new THREE.SphereGeometry(r*1.02, 48, 32), glowMat(0xff7b21,.16,true));
    add(shell, 1.9, (o,t)=>{o.scale.setScalar(1+t*(1.8+power*.5));o.material.opacity=Math.max(0,.16*(1-t/1.9));});
    for(let i=0;i<28+power*8;i++){
      const p=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.05,6,6),glowMat(i%2?0xffc85b:0xff5421,.95));
      const d=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize();p.position.copy(d.multiplyScalar(r*(1.02+Math.random()*.12)));p.userData.v=d.clone().multiplyScalar(.025+Math.random()*.06);add(p,2.2,(o,t)=>{o.position.add(o.userData.v);o.scale.setScalar(1+t*1.5);o.material.opacity=Math.max(0,1-t/2.2);});
    }
  }

  function launchBlackHole(power) {
    const r = 2.0;
    // Event-horizon attack: warped rings collapse inward while the accretion flow twists around the horizon.
    for(let i=0;i<7;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r*(.72+i*.10),.025+power*.008,12,128),glowMat(i%2?0xffc46b:0xa85cff,.8));
      ring.rotation.x=1.13; ring.rotation.z=i*.18;
      add(ring,2.8,(o,t)=>{const q=t/2.8;o.scale.setScalar(1+q*(2.4+power*.25));o.rotation.z+=.08;o.material.opacity=Math.max(0,.8*(1-q));});
    }
    const horizon=new THREE.Mesh(new THREE.SphereGeometry(r*.72,48,32),glowMat(0x000000,.35));
    add(horizon,2.1,(o,t)=>{o.scale.setScalar(1+Math.sin(t*9)*.035+t*(.18+power*.03));});
    for(let i=0;i<44+power*8;i++){
      const p=new THREE.Mesh(new THREE.SphereGeometry(.018+Math.random()*.035,5,5),glowMat(i%3?0xff8a32:0xffd06e,.9));
      const a=Math.random()*Math.PI*2, rr=r*(1.0+Math.random()*1.2);p.position.set(Math.cos(a)*rr,.08*Math.sin(a*3),Math.sin(a)*rr);p.userData.a=a;p.userData.r=rr;p.userData.v=.035+Math.random()*.07;
      add(p,3.1,(o,t)=>{o.userData.a+=o.userData.v;o.userData.r=Math.max(.45,o.userData.r-.008*(1+power*.18));o.position.set(Math.cos(o.userData.a)*o.userData.r,.08*Math.sin(o.userData.a*3),Math.sin(o.userData.a)*o.userData.r);o.material.opacity=Math.max(0,1-t/3.1);});
    }
  }

  function launchSaturn(power) {
    const r=2.55;
    // Saturn is attacked through its ring system: a 3D radial ring wave and individual ring fragments.
    for(let i=0;i<6;i++){
      const ring=new THREE.Mesh(new THREE.RingGeometry(r*(1.18+i*.12),r*(1.24+i*.12),160),glowMat(i%2?0xffe2a0:0xff9b45,.65));
      ring.rotation.x=1.27;
      add(ring,2.7,(o,t)=>{const q=t/2.7;o.scale.setScalar(1+q*(1.4+power*.2));o.rotation.z+=.015*(i+1);o.material.opacity=Math.max(0,.65*(1-q));});
    }
    for(let i=0;i<30+power*8;i++){
      const a=Math.random()*Math.PI*2, rr=r*(1.25+Math.random()*.75);
      const shard=new THREE.Mesh(new THREE.BoxGeometry(.035,.035,.10+Math.random()*.15),glowMat(0xffc878,.9));
      shard.position.set(Math.cos(a)*rr,0,Math.sin(a)*rr);shard.rotation.z=Math.random()*2;shard.userData.v=new THREE.Vector3(Math.cos(a),(.5-Math.random())*.25,Math.sin(a)).multiplyScalar(.018+Math.random()*.04);
      add(shard,2.4,(o,t)=>{o.position.add(o.userData.v);o.rotation.x+=.07;o.rotation.y+=.05;o.material.opacity=Math.max(0,1-t/2.4);});
    }
  }

  function launchGalaxy(power) {
    const r=3.6;
    // Galaxy attack: spiral-arm tidal shear plus a narrow quasar-like jet.
    for(let arm=0;arm<4;arm++){
      const pts=[];
      for(let j=0;j<80;j++){const q=j/79, rr=.25+q*r, a=arm*Math.PI/2+q*4.2;pts.push(new THREE.Vector3(Math.cos(a)*rr,Math.sin(a*2.2)*.12,Math.sin(a)*rr));}
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:arm%2?0x9c72ff:0x73cfff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending}));
      add(line,3,(o,t)=>{o.rotation.y+=.018;o.scale.setScalar(1+t*(.32+power*.04));o.material.opacity=Math.max(0,.9*(1-t/3));});
    }
    const jet=new THREE.Mesh(new THREE.CylinderGeometry(.08,.34,r*2.4,24,1,true),glowMat(0x7bd7ff,.8));
    jet.rotation.z=Math.PI/2;jet.position.x=r*.65;
    add(jet,2.5,(o,t)=>{o.scale.x=1+t*(1.5+power*.25);o.scale.y=1+t*.25;o.scale.z=1+t*.25;o.material.opacity=Math.max(0,.8*(1-t/2.5));});
    for(let i=0;i<55+power*12;i++){
      const a=Math.random()*Math.PI*2, rr=r*(.4+Math.random()*.9);const p=new THREE.Mesh(new THREE.SphereGeometry(.012+Math.random()*.028,5,5),glowMat(i%3?0xb9a4ff:0xffd9a5,.85));p.position.set(Math.cos(a)*rr,(Math.random()-.5)*.25,Math.sin(a)*rr);p.userData.v=new THREE.Vector3((Math.random()-.5)*.018,(Math.random()-.5)*.018,(Math.random()-.5)*.018);add(p,2.8,(o,t)=>{o.position.add(o.userData.v);o.rotation.y+=.03;o.material.opacity=Math.max(0,.85*(1-t/2.8));});
    }
  }

  function launchWormhole(power) {
    const r=2.35;
    // Wormhole attack: the throat itself ripples in depth, with nested portal rings and a twisting tunnel.
    for(let i=0;i<9;i++){
      const tor=new THREE.Mesh(new THREE.TorusGeometry(r*(.45+i*.085),.035+power*.008,10,96),glowMat(i%2?0x55eaff:0xc05cff,.8));
      tor.position.z=(i-4)*.16;tor.rotation.x=Math.PI/2;
      add(tor,2.9,(o,t)=>{const q=t/2.9;o.scale.setScalar(1+Math.sin(t*8+i)*.06+q*(.7+power*.15));o.position.z+=(i-4)*.001;o.rotation.z+=.035*(i%2?1:-1);o.material.opacity=Math.max(0,.8*(1-q));});
    }
    const throat=new THREE.Mesh(new THREE.TorusGeometry(r*.7,.18,24,128),glowMat(0x72e8ff,.55));
    add(throat,2.2,(o,t)=>{o.scale.setScalar(1+Math.sin(t*10)*.18+t*.5);o.rotation.x+=.03;o.rotation.y+=.04;o.material.opacity=Math.max(0,.55*(1-t/2.2));});
  }

  function launchMars(power) {
    const r=2.15;
    // Mars attack: dust plume and glowing crust fissures, distinct from the other bodies.
    for(let i=0;i<5;i++){
      const crack=new THREE.Mesh(new THREE.TorusGeometry(r*(.48+i*.13),.018+power*.006,6,48),glowMat(0xff5a32,.75));
      crack.rotation.set(Math.random(),Math.random(),Math.random());
      add(crack,2.2,(o,t)=>{o.scale.setScalar(1+t*(.8+power*.1));o.rotation.z+=.04;o.material.opacity=Math.max(0,.75*(1-t/2.2));});
    }
    for(let i=0;i<38+power*8;i++){
      const p=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.055,6,6),glowMat(i%2?0xc85a31:0xff9a54,.85));const d=new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1).normalize();p.position.copy(d.multiplyScalar(r));p.userData.v=d.multiplyScalar(.018+Math.random()*.045);add(p,2.6,(o,t)=>{o.position.add(o.userData.v);o.material.opacity=Math.max(0,.85*(1-t/2.6));});
    }
  }

  function launchMoon(power) {
    const r=1.65;
    // Moon attack: crater shock rings and slow-moving rocky fragments.
    for(let i=0;i<5;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.35+i*.24,.025+power*.008,8,64),glowMat(i%2?0xd8e5ff:0x8f9caf,.85));
      ring.rotation.set(Math.random(),Math.random(),Math.random());
      add(ring,2.1,(o,t)=>{o.scale.setScalar(1+t*(2.4+power*.25));o.rotation.z+=.03;o.material.opacity=Math.max(0,.85*(1-t/2.1));});
    }
    for(let i=0;i<18+power*5;i++){
      const p=new THREE.Mesh(new THREE.IcosahedronGeometry(.035+Math.random()*.07,0),new THREE.MeshStandardMaterial({color:0x8d929b,emissive:0x273040,emissiveIntensity:.5}));p.position.set((Math.random()-.5)*1.3,(Math.random()-.5)*1.3,(Math.random()-.5)*1.3);p.userData.v=p.position.clone().normalize().multiplyScalar(.018+Math.random()*.03);add(p,2.8,(o,t)=>{o.position.add(o.userData.v);o.rotation.x+=.05;o.rotation.y+=.04;o.material.opacity=Math.max(0,1-t/2.8);});
    }
  }

  function launch(power) {
    target = getTarget();
    if (target === 'Earth') return; // Earth already has the user's approved effects.
    burst++;
    clear();
    const p=Math.max(1,Math.min(5,power||3));
    if(target==='Sun') launchSun(p);
    else if(target==='Black Hole') launchBlackHole(p);
    else if(target==='Saturn') launchSaturn(p);
    else if(target==='Galaxy') launchGalaxy(p);
    else if(target==='Wormhole') launchWormhole(p);
    else if(target==='Mars') launchMars(p);
    else if(target==='Moon') launchMoon(p);
  }

  async function init() {
    if (!makeCanvas()) return;
    try {
      THREE=await import(THREE_URL);
      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,100);
      camera.position.set(0,3.6,12.2);camera.lookAt(0,0,0);
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
      scene.add(new THREE.AmbientLight(0x8090c0,.8));
      const light=new THREE.PointLight(0xffffff,110,50);light.position.set(-6,6,9);scene.add(light);
      active=true;window.addEventListener('resize',resize);raf=requestAnimationFrame(loop);
    } catch(e){ console.warn('COSMOSIM object-effects overlay unavailable',e); }
  }

  function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
  function loop(now){raf=requestAnimationFrame(loop);if(!renderer||!scene)return;const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!active){renderer.clear();return;}for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;e.update?.(e.obj,e.age);if(e.age>=e.life){scene.remove(e.obj);disposeObject(e.obj);effects.splice(i,1);}}renderer.render(scene,camera);}

  function wire() {
    const attackBox=document.getElementById('dlAttackChoices');
    const launchBtn=document.getElementById('dlAttackNow');
    if(attackBox)attackBox.addEventListener('click',()=>{const a=document.querySelector('#dlAttackChoices .dl-choice.active');if(a)attack=a.dataset.attack||attack;});
    if(launchBtn)launchBtn.addEventListener('click',()=>{const strength=+(document.getElementById('dlStrength')?.value||3);setTimeout(()=>launch(strength),0);});
    const clearBtn=document.getElementById('dlClear');if(clearBtn)clearBtn.addEventListener('click',()=>clear());
    const observer=new MutationObserver(()=>{target=getTarget();if(target==='Earth')clear();});
    const name=document.getElementById('dlTargetName');if(name)observer.observe(name,{childList:true,characterData:true,subtree:true});
  }

  function boot(){if(!document.getElementById('destructionStage')){setTimeout(boot,300);return;}init().then(wire);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();