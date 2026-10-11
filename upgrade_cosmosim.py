from pathlib import Path

p = Path("static/index.html")
s = p.read_text()

# Compact, collapsible controls
s = s.replace(
    '#controls{left:12px;bottom:12px;width:min(355px,calc(100vw - 24px));max-height:55vh;overflow:auto}',
    '#controls{left:12px;bottom:12px;width:min(300px,calc(100vw - 24px));max-height:35vh;overflow:auto;transition:transform .25s ease}#controls.collapsed{transform:translateY(calc(100% - 48px))}#panelToggle{width:100%;text-align:left;margin-bottom:8px}'
)

if 'id="panelToggle"' not in s:
    s = s.replace(
        '<h3>SPACE COMMAND</h3>',
        '<button type="button" id="panelToggle" class="secondary">⌄ Space controls</button><div id="panelBody"><h3>SPACE COMMAND</h3>'
    )
    s = s.replace(
        '</div>\n<div id="hint">',
        '</div></div>\n<div id="hint">'
    )

# Multiple orbital objects
if 'id="count"' not in s:
    s = s.replace(
        '<label>Orbital speed:',
        '<label>Orbiting objects: <b id="countLabel">7</b></label><input id="count" type="range" min="1" max="20" value="7"><label>Orbital speed:'
    )

start = s.find('const star=new THREE.Mesh')
end = s.find('let mass=10,distance=7,speed=1,diskOn=true,paused=false,time=0;')

if start != -1 and end != -1:
    replacement = """
const orbiters=[];
const colors=[0x9fdcff,0xffb45c,0xff78c8,0x9cffb1,0xd0a0ff,0xffed9a,0x80fff0,0xff806e,0x94a7ff,0xc5ff8a];
function rebuildOrbiters(count){
  for(const o of orbiters){
    scene.remove(o.mesh); scene.remove(o.light);
    o.mesh.geometry.dispose(); o.mesh.material.dispose();
  }
  orbiters.length=0;
  for(let i=0;i<count;i++){
    const color=colors[i%colors.length];
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.22,20,14),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.1}));
    const light=new THREE.PointLight(color,2,3);
    scene.add(mesh); scene.add(light);
    orbiters.push({mesh,light,radius:distance*(.68+(i%5)*.12),angle:2*Math.PI*i/count,rate:1/Math.sqrt(.5+(i%5)*.3),inclination:(i%5-2)*.12});
  }
}
let mass=10,distance=7,speed=1,diskOn=true,paused=false,time=0,objectCount=7;
"""
    s = s[:start] + replacement + s[end+len('let mass=10,distance=7,speed=1,diskOn=true,paused=false,time=0;'):]

s = s.replace(
    "$('speedOut').textContent=speed.toFixed(1)+'×';$('diskOut').textContent=diskOn?'Active':'Hidden';",
    "$('speedOut').textContent=speed.toFixed(1)+'×';$('diskOut').textContent=diskOn?'Active':'Hidden';if($('countLabel'))$('countLabel').textContent=objectCount;"
)
s = s.replace(
    "if(typeof d.disk==='boolean')diskOn=d.disk;",
    "if(typeof d.disk==='boolean')diskOn=d.disk;if(Number.isFinite(Number(d.count)))objectCount=Math.max(1,Math.min(20,Math.round(Number(d.count))));rebuildOrbiters(objectCount);"
)
s = s.replace(
    "$('speed').value=speed;",
    "$('speed').value=speed;if($('count'))$('count').value=objectCount;"
)
s = s.replace(
    "$('speed').addEventListener('input',e=>{speed=+e.target.value;updateLabels()});",
    "$('speed').addEventListener('input',e=>{speed=+e.target.value;updateLabels()});if($('count'))$('count').addEventListener('input',e=>{objectCount=+e.target.value;rebuildOrbiters(objectCount);updateLabels()});if($('panelToggle'))$('panelToggle').onclick=()=>{$('controls').classList.toggle('collapsed');$('panelToggle').textContent=$('controls').classList.contains('collapsed')?'⌃ Space controls':'⌄ Space controls'};"
)
s = s.replace(
    "  const a=time*speed;\n  star.position.set(Math.cos(a)*distance,Math.sin(a*.7)*.4,Math.sin(a)*distance);\n  starLight.position.copy(star.position);",
    "  for(const o of orbiters){o.angle+=.009*speed*o.rate;o.mesh.position.set(Math.cos(o.angle)*o.radius,Math.sin(o.angle*1.7)*o.inclination*3,Math.sin(o.angle)*o.radius);o.light.position.copy(o.mesh.position)}"
)
s = s.replace(
    "updateLabels();\nfunction animate(){",
    "rebuildOrbiters(objectCount);\nupdateLabels();\nfunction animate(){"
)

p.write_text(s)
print("Upgrade script applied.")
