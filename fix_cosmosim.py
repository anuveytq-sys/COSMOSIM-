from pathlib import Path
import re
import shutil

p = Path("static/index.html")
s = p.read_text()
shutil.copy2(p, Path("static/index.html.before-physics-fix"))

start = s.find("function rebuildOrbiters(count){")
end = s.find("\nlet mass=10,distance=7,speed=1,diskOn=true,paused=false,time=0,objectCount=7;", start)

if start < 0 or end < 0:
raise SystemExit("Could not find the expected orbit code. Backup is safe; no changes made.")

new_function = r'''function rebuildOrbiters(count){
// Remove every previous orbital object before creating the requested count.
for(const o of orbiters){
scene.remove(o.mesh);
scene.remove(o.light);
o.mesh.geometry.dispose();
o.mesh.material.dispose();
}
orbiters.length=0;

count=Math.max(1,Math.min(20,Math.round(Number(count)||1)));

for(let i=0;i<count;i++){
const color=colors[i%colors.length];
const mesh=new THREE.Mesh(
new THREE.SphereGeometry(.19,20,14),
new THREE.MeshStandardMaterial({
color,
emissive:color,
emissiveIntensity:.8,
roughness:.35,
metalness:.12
})
);
const light=new THREE.PointLight(color,1.2,2.5);

// Spread objects across several orbital radii and tilted orbital planes.
const radius=distance*(.90+.12*(i%6));
const inclination=((i%5)-2)*.10;
const node=i*2.399963229728653;
const angle=2*Math.PI*i/count;

scene.add(mesh);
scene.add(light);
orbiters.push({mesh,light,radius,inclination,node,angle});

}

if($('count')) $('count').value=count;
if($('countLabel')) $('countLabel').textContent=count;
}'''

s = s[:start] + new_function + s[end:]

old_distance = "$('distance').addEventListener('input',e=>{distance=+e.target.value;updateLabels()});"
new_distance = "$('distance').addEventListener('input',e=>{distance=+e.target.value;rebuildOrbiters(objectCount);updateLabels()});"
if old_distance not in s:
raise SystemExit("Could not find distance slider handler. Backup created; no changes saved.")
s = s.replace(old_distance, new_distance, 1)

old_count = "if($('count'))$('count').addEventListener('input',e=>{objectCount=+e.target.value;rebuildOrbiters(objectCount);updateLabels()});"
new_count = """if($('count'))$('count').addEventListener('input',e=>{
objectCount=Math.max(1,Math.min(20,Math.round(+e.target.value)));
rebuildOrbiters(objectCount);
updateLabels();
});"""
if old_count not in s:
raise SystemExit("Could not find count slider handler. Backup created; no changes saved.")
s = s.replace(old_count, new_count, 1)

old_orbit = "for(const o of orbiters){o.angle+=.009speedo.rate;o.mesh.position.set(Math.cos(o.angle)o.radius,Math.sin(o.angle1.7)o.inclination3,Math.sin(o.angle)o.radius);o.light.position.copy(o.mesh.position)}"
new_orbit = r'''for(const o of orbiters){
// Kepler-inspired motion: closer orbits move faster.
const orbitalRate=Math.sqrt(mass/10)Math.pow(distance/o.radius,1.5);
o.angle+=.009speedorbitalRate;

const ca=Math.cos(o.angle),sa=Math.sin(o.angle);
const cn=Math.cos(o.node),sn=Math.sin(o.node);
const ci=Math.cos(o.inclination),si=Math.sin(o.inclination);

o.mesh.position.set(
o.radius*(cnca-snsaci),
o.radiussasi,
o.radius(snca+cnsa*ci)
);
o.light.position.copy(o.mesh.position);
}'''
if old_orbit not in s:
raise SystemExit("Could not find old orbit animation. Backup created; no changes saved.")
s = s.replace(old_orbit, new_orbit, 1)

p.write_text(s)
print("COSMOSIM updated successfully.")
print("Backup: static/index.html.before-physics-fix")
print("Orbit count now rebuilds on count and distance changes.")
print("Orbital motion now uses radius-dependent, Kepler-inspired speeds.")
