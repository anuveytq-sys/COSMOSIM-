from pathlib import Path
import re
import sys

p = Path("static/index.html")
s = p.read_text(encoding="utf-8")

if 'id="spaceMenuButton"' in s:
    sys.exit("Space Menu already exists; no changes made.")

if "</style>" not in s or 'id="pause"' not in s or "function animate(){" not in s:
    sys.exit("HTML anchors not found. Original file left unchanged.")

css = """
#topRightActions{display:flex;align-items:center;gap:8px}
#spaceMenuButton{font-size:19px;background:linear-gradient(135deg,#6558ff,#b34cff)}
#spaceMenu{display:none;position:fixed;z-index:50;top:70px;right:12px;width:min(320px,calc(100vw - 24px));max-height:70vh;overflow:auto;padding:12px;background:#080d20f5;border:1px solid #786bff;border-radius:16px;backdrop-filter:blur(16px)}
#spaceMenu.open{display:block}
#spaceMenu .menuHeading{color:#aebaff;font-size:11px;letter-spacing:2px;padding:8px}
#spaceMenu .simChoice{display:block;width:100%;text-align:left;margin:5px 0;padding:11px;background:#101831;border:1px solid #303b66;color:#eef2ff}
#spaceMenu .simChoice.active{border-color:#a18aff;background:#29204e}
#simInfo{display:none;position:fixed;z-index:10;right:12px;bottom:12px;width:min(300px,calc(100vw - 24px));max-height:35vh;overflow:auto}
#simInfo p{font-size:12px;line-height:1.5}
@media(max-width:520px){#spaceMenu{top:62px}#simInfo{max-height:28vh}}
"""

menu = """
<div id="spaceMenu">
 <div class="menuHeading">✦ SPACE SIMULATION SELECTOR</div>
 <button class="simChoice active" data-sim="blackhole">🕳️ Black Hole Lab — Original</button>
 <button class="simChoice" data-sim="solar">☀️ Solar System — Tap a planet</button>
 <button class="simChoice" data-sim="bhcollision">🌀 Black Hole Collision</button>
 <button class="simChoice" data-sim="wormhole">🛸 Wormhole Explorer</button>
 <button class="simChoice" data-sim="whitehole">✨ White Hole Model</button>
 <button class="simChoice" data-sim="nebula">🌌 Nebula Explorer</button>
 <button class="simChoice" data-sim="galaxy">🌠 Galaxy Studio</button>
 <button class="simChoice" data-sim="pulsar">💫 Pulsar Lab</button>
 <button class="simChoice" data-sim="collisions">💥 Cosmic Collision Lab</button>
 <button id="collisionType" style="display:none;width:100%;padding:10px;margin-top:8px">Change collision type</button>
</div>
<div id="simInfo" class="panel">
 <h3 id="simTitle">Simulation</h3>
 <p id="simDescription"></p>
 <p style="font-size:10px;color:#9ba8d0">Illustrative 3D model; not a full astrophysics solver.</p>
</div>
"""

js = r"""
// COSMOSIM Space Menu extension
const sx={active:"blackhole",t:0,kind:0};
const sg={};
const picks=[];
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const menuEl=document.getElementById("spaceMenu");
const infoEl=document.getElementById("simInfo");
const titleEl=document.getElementById("simTitle");
const descEl=document.getElementById("simDescription");

function groupFor(id){
 const g=new THREE.Group();g.visible=false;scene.add(g);sg[id]=g;return g;
}
function ball(g,r,c){
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),
  new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.35,roughness:.65}));
 g.add(m);return m;
}
function glow(c,op=.7){
 return new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:op,
  blending:THREE.AdditiveBlending,depthWrite:false});
}
function ring(g,r,c){
 const m=new THREE.Mesh(new THREE.TorusGeometry(r,.025,8,64),glow(c));
 g.add(m);return m;
}

// Solar system
{
 const g=groupFor("solar");
 ball(g,1.15,0xffa52f);
 const data=[
  ["Mercury",.14,2.2,0x999999,"Small, rocky and cratered."],
  ["Venus",.22,3.2,0xd8a45c,"Thick atmosphere and extreme greenhouse heating."],
  ["Earth",.24,4.4,0x2585ed,"A world with liquid-water oceans and known life."],
  ["Mars",.19,5.6,0xb94c32,"A cold, rusty planet with a thin atmosphere."],
  ["Jupiter",.52,7.2,0xc48c6a,"The largest planet, famous for its giant storms."],
  ["Saturn",.43,9.2,0xd7bf8c,"A gas giant with magnificent rings."],
  ["Uranus",.32,11.2,0x70cbd2,"An ice giant with an extreme axial tilt."],
  ["Neptune",.31,13.1,0x315de1,"A distant ice giant with powerful winds."]
 ];
 const planets=[];
 data.forEach((d,i)=>{
  const orbit=new THREE.Mesh(new THREE.RingGeometry(d[2]-.012,d[2]+.012,96),
   new THREE.MeshBasicMaterial({color:0x52648c,side:THREE.DoubleSide,transparent:true,opacity:.55}));
  orbit.rotation.x=-Math.PI/2;g.add(orbit);
  const m=ball(g,d[1],d[3]);m.userData.planet=d;
  if(d[0]==="Saturn"){
   const r=new THREE.Mesh(new THREE.RingGeometry(.52,.78,64),
    new THREE.MeshBasicMaterial({color:0xe0d0a5,side:THREE.DoubleSide}));
   r.rotation.x=1.3;m.add(r);
  }
  picks.push(m);planets.push({m,r:d[2],a:i*.8,rate:.12/Math.sqrt(d[2])});
 });
 g.userData={planets};
}

// Binary black holes
{
 const g=groupFor("bhcollision"),pair=[];
 for(let i=0;i<2;i++){
  const b=new THREE.Group();g.add(b);
  ball(b,.7,0x03030b);ring(b,.92,i?0x9d72ff:0xff9247);
  pair.push(b);
 }
 const rem=ball(g,1.1,0x8d72ff);rem.visible=false;
 const waves=[];
 for(let i=0;i<4;i++)waves.push(ring(g,1+i*.7,0x7c9dff));
 g.userData={pair,rem,waves};
}

// Wormhole tunnel
{
 const g=groupFor("wormhole"),hoops=[];
 for(let i=0;i<17;i++){
  const h=ring(g,1+i*.025,i%2?0x8d58ff:0x40eaff);
  h.position.z=(i-8)*.8;hoops.push(h);
 }
 const tube=new THREE.Mesh(new THREE.CylinderGeometry(1,1.4,14,32,1,true),
  new THREE.MeshBasicMaterial({color:0x5941a0,wireframe:true,transparent:true,opacity:.2}));
 tube.rotation.x=Math.PI/2;g.add(tube);g.userData={hoops};
}

// White hole: theoretical outward-flow concept
{
 const g=groupFor("whitehole"),parts=[];
 ball(g,.65,0xffffff);
 const h=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glow(0x70dfff,.2));g.add(h);
 for(let i=0;i<220;i++){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),glow(i%3?0x76dfff:0xffffff));
  m.userData={a:Math.random()*6.28,r:.6+Math.random()*7,z:(Math.random()-.5)*2,v:.02+Math.random()*.035};
  g.add(m);parts.push(m);
 }
 g.userData={h,parts};
}

// Nebula cloud
{
 const g=groupFor("nebula"),pos=[],col=[];
 const palette=[0x7857ff,0xe64cff,0x43d9ff,0xff78c4].map(c=>new THREE.Color(c));
 for(let i=0;i<4800;i++){
  const arm=i%4,a=Math.random()*6.28,r=Math.sqrt(Math.random())*8;
  pos.push(Math.cos(a)*r+(arm-1.5)*2, (Math.random()-.5)*(1+r*.4),Math.sin(a)*r*.5);
  const c=palette[arm].clone().multiplyScalar(.4+Math.random()*.7);col.push(c.r,c.g,c.b);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 g.add(new THREE.Points(geo,new THREE.PointsMaterial({size:.1,vertexColors:true,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false})));
}

// Spiral galaxy
{
 const g=groupFor("galaxy"),pos=[],col=[];
 for(let i=0;i<4200;i++){
  const r=Math.sqrt(Math.random())*9,arm=Math.floor(Math.random()*4);
  const a=arm*Math.PI/2+r*.45+(Math.random()-.5)*.4;
  pos.push(Math.cos(a)*r,(Math.random()-.5)*.15,Math.sin(a)*r);
  const c=new THREE.Color(0xffe5b8).lerp(new THREE.Color(0x728aff),r/9);
  col.push(c.r,c.g,c.b);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
 g.add(new THREE.Points(geo,new THREE.PointsMaterial({size:1.5,sizeAttenuation:false,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));
 ball(g,.5,0xffd7a0);
}

// Pulsar with rotating beams
{
 const g=groupFor("pulsar");
 ball(g,.65,0x55cfff);ring(g,.9,0x6bdfff);
 const beams=[];
 for(let i=0;i<2;i++){
  const b=new THREE.Mesh(new THREE.ConeGeometry(.22,7,16,1,true),glow(0x66cfff,.24));
  b.position.y=i?3.4:-3.4;if(!i)b.rotation.x=Math.PI;
  g.add(b);beams.push(b);
 }
 g.userData={beams};
}

// Collision models
{
 const g=groupFor("collisions");
 const a=ball(g,1,0xff9845),b=ball(g,.8,0xffe0a0);
 const flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),glow(0xffffff,0));g.add(flash);
 const debris=[];
 for(let i=0;i<100;i++){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.04,0),glow([0xff9a48,0x6edfff,0xc4a0ff][i%3],0));
  m.userData={a:Math.random()*6.28,v:.025+Math.random()*.05};g.add(m);debris.push(m);
 }
 g.userData={a,b,flash,debris};
}

const simInfo={
 blackhole:["Black Hole Lab","Your original black-hole simulation and its existing controls."],
 solar:["Solar System","Tap a planet to view its description. Orbits and planet sizes are compressed for display."],
 bhcollision:["Black Hole Collision","Two black holes spiral around each other before a stylized merger."],
 wormhole:["Wormhole Explorer","A hypothetical spacetime tunnel visualized with glowing rings. Wormholes have not been observed."],
 whitehole:["White Hole Model","A theoretical white-hole concept with particles flowing outward; no white holes have been confirmed."],
 nebula:["Nebula Explorer","A colorful procedural cloud inspired by nebulae made of gas and dust."],
 galaxy:["Galaxy Studio","Explore a rotating, procedural spiral galaxy."],
 pulsar:["Pulsar Lab","A spinning neutron-star model with sweeping beams."],
 collisions:["Cosmic Collision Lab","Watch two objects approach, flash, and eject illustrative debris."]
};

function baseVisible(v){
 hole.visible=v;glow.visible=v;photonRing.visible=v;lensHalo.visible=v;
 diskGroup.visible=v&&diskOn;asteroids.visible=v;light.visible=v;
 orbiters.forEach(o=>{o.mesh.visible=v;o.light.visible=v;if(o.ring)o.ring.visible=v;});
 galaxies.forEach(g=>g.visible=v);
}
function chooseSim(id){
 sx.active=id;sx.t=0;menuEl.classList.remove("open");
 document.querySelectorAll(".simChoice").forEach(b=>b.classList.toggle("active",b.dataset.sim===id));
 baseVisible(id==="blackhole");
 Object.entries(sg).forEach(([k,g])=>g.visible=k===id);
 const original=id==="blackhole";
 document.getElementById("controls").style.display=original?"block":"none";
 document.getElementById("stats").style.display=original?"block":"none";
 infoEl.style.display=original?"none":"block";
 titleEl.textContent=simInfo[id][0];descEl.textContent=simInfo[id][1];
 camera.position.set(0,5,id==="solar"?23:21);
 controls.target.set(0,0,0);
 controls.minDistance=3;controls.maxDistance=75;
 if(original){
  camera.position.set(0,11,25);controls.target.set(0,0,0);
  controls.minDistance=7;controls.maxDistance=65;updateLabels();
 }
 controls.update();
}
document.getElementById("spaceMenuButton").addEventListener("click",()=>menuEl.classList.toggle("open"));
document.querySelectorAll(".simChoice").forEach(b=>b.addEventListener("click",()=>chooseSim(b.dataset.sim)));
document.addEventListener("pointerdown",e=>{
 if(!menuEl.contains(e.target)&&e.target.id!=="spaceMenuButton")menuEl.classList.remove("open");
});
renderer.domElement.addEventListener("pointerdown",e=>{
 if(sx.active!=="solar")return;
 const r=renderer.domElement.getBoundingClientRect();
 pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));
 ray.setFromCamera(pointer,camera);
 const hit=ray.intersectObjects(picks,false)[0];
 if(hit&&hit.object.userData.planet){
  const d=hit.object.userData.planet;
  titleEl.textContent=d[0];descEl.textContent=d[4];
 }
});
function updateExtraSimulation(){
 const t=sx.t,id=sx.active;
 if(id==="solar"){
  sg.solar.userData.planets.forEach(p=>{
   p.a+=p.rate*.12;p.m.position.set(Math.cos(p.a)*p.r,0,Math.sin(p.a)*p.r);p.m.rotation.y+=.01;
  });
 }else if(id==="bhcollision"){
  const d=sg.bhcollision.userData,merged=t>9;
  d.pair.forEach((b,i)=>{
   const a=t*(.7+i*.04)+i*Math.PI,r=.6+Math.max(0,4-t*.35);
   b.position.set(Math.cos(a)*r,Math.sin(a*.7)*.3,Math.sin(a)*r*.5);b.visible=!merged;
  });
  d.rem.visible=merged;d.rem.scale.setScalar(merged?1+.05*Math.sin(t*2):.01);
  d.waves.forEach((w,i)=>{const q=(t*.2+i*.6)%4;w.scale.setScalar(1+q);w.material.opacity=.4*(1-q/4);});
  if(t>20)sx.t=0;
 }else if(id==="wormhole"){
  sg.wormhole.userData.hoops.forEach((h,i)=>{h.rotation.z=t*.15+i*.025;h.scale.x=1+.12*Math.sin(t+i*.3);});
 }else if(id==="whitehole"){
  const d=sg.whitehole.userData;d.h.scale.setScalar(1+.12*Math.sin(t*2));
  d.parts.forEach(p=>{p.userData.r+=p.userData.v;if(p.userData.r>8)p.userData.r=.6;
   p.position.set(Math.cos(p.userData.a)*p.userData.r,Math.sin(p.userData.a)*p.userData.r,p.userData.z);});
 }else if(id==="nebula"||id==="galaxy"){
  sg[id].rotation.y+=id==="galaxy"?.002:.0008;
 }else if(id==="pulsar"){
  sg.pulsar.userData.beams.forEach(b=>b.rotation.y+=.045);
 }else if(id==="collisions"){
  const d=sg.collisions.userData,hit=t>4,phase=Math.min(1,t/4);
  d.a.position.x=-4+phase*4;d.b.position.x=4-phase*4;
  d.flash.scale.setScalar(hit?1+((t-4)%2):.01);
  d.flash.material.opacity=hit?Math.max(0,.6-((t-4)%2)*.3):0;
  d.debris.forEach(p=>{const r=hit?((t-4)%4)*p.userData.v*15:0;
   p.position.set(Math.cos(p.userData.a)*r,Math.sin(p.userData.a)*r,Math.sin(p.userData.a*2)*r*.3);
   p.material.opacity=hit?Math.max(0,.8-r/8):0;
  });
  if(t>10)sx.t=0;
 }
}
"""

# Prepare everything in memory and validate before writing.
pause = re.compile(r'<button\b(?=[^>]*\bid=["\']pause["\'])[^>]*>.*?</button>', re.S)
m = pause.search(s)
if not m:
    sys.exit("Pause button not found; original HTML left unchanged.")

new_pause = '<div id="topRightActions"><button id="spaceMenuButton" class="secondary" aria-label="Open simulations">☰</button>' + m.group(0) + '</div>'
s2 = s[:m.start()] + new_pause + s[m.end():]
s2 = s2.replace("</style>", css + "\n</style>", 1)
stats_anchor = '<div id="stats" class="panel">'
if stats_anchor not in s2:
    sys.exit("Stats panel anchor not found; original HTML left unchanged.")
s2 = s2.replace(stats_anchor, menu + "\n" + stats_anchor, 1)
anchor = "function animate(){"
if s2.count(anchor) != 1:
    sys.exit("Animation anchor is ambiguous; original HTML left unchanged.")
s2 = s2.replace(anchor, js + "\n" + anchor, 1)
# Advance the added simulations only while the existing pause toggle is off.
s2 = s2.replace("function animate(){", "function animate(){", 1)
needle = "  time+=.01;"
if needle not in s2:
    sys.exit("Animation clock anchor not found; original HTML left unchanged.")
s2 = s2.replace(needle, needle + '\n  if(sx.active!=="blackhole"){sx.t+=.016*speed;updateExtraSimulation();}', 1)

backup = Path("static/index.html.before-space-menu")
if not backup.exists():
    backup.write_text(s, encoding="utf-8")
p.write_text(s2, encoding="utf-8")
print("COSMOSIM Space Menu installed.")
print("Backup:", backup)
print("Added 8 simulation modes.")
