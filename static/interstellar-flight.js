import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// COSMOSIM Interstellar Flight upgrade.
// This is isolated to the Interstellar Flight menu item. Other simulations keep
// their original renderer and controls.
const host = document.getElementById('space');
if (!host) throw new Error('COSMOSIM space host not found');

const originalCanvas = host.querySelector('canvas');
const flightCanvas = document.createElement('canvas');
flightCanvas.id = 'interstellarFlightCanvas';
Object.assign(flightCanvas.style, {
  position: 'fixed', inset: '0', width: '100%', height: '100%',
  zIndex: '1', display: 'none', touchAction: 'none'
});
host.appendChild(flightCanvas);

const renderer = new THREE.WebGLRenderer({canvas: flightCanvas, antialias: true, alpha: false});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 3000);
camera.position.set(0, 0.8, 6);

scene.add(new THREE.AmbientLight(0x7188b5, 1.1));
const sunLight = new THREE.PointLight(0xffc46e, 3.2, 120);
scene.add(sunLight);

// Ship: the camera is the cockpit. The small HUD ship is shown ahead for orientation.
const ship = new THREE.Group();
const hull = new THREE.Mesh(
  new THREE.ConeGeometry(0.22, 1.05, 12),
  new THREE.MeshStandardMaterial({color: 0xb9c7d8, metalness: .72, roughness: .27, emissive: 0x162b45, emissiveIntensity: .55})
);
hull.rotation.x = -Math.PI / 2;
ship.add(hull);
const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(.16, 18, 12),
  new THREE.MeshPhysicalMaterial({color: 0x45d9ff, emissive: 0x087da5, emissiveIntensity: 1.1, transparent: true, opacity: .82, metalness: .4, roughness: .12})
);
cockpit.position.set(0, .12, -.15); cockpit.scale.set(1, .55, 1.2); ship.add(cockpit);
for (const side of [-1, 1]) {
  const wing = new THREE.Mesh(new THREE.BoxGeometry(.08, .035, .58), new THREE.MeshStandardMaterial({color: 0x71829e, metalness: .55, roughness: .35}));
  wing.position.set(side * .28, -.03, .14); wing.rotation.y = side * .16; ship.add(wing);
  const engine = new THREE.Mesh(new THREE.ConeGeometry(.06, .32, 10, 1, true), new THREE.MeshBasicMaterial({color: 0x42d9ff, transparent: true, opacity: .9}));
  engine.position.set(side * .13, -.02, .46); engine.rotation.x = Math.PI; ship.add(engine);
}
scene.add(ship);

const stars = [];
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(5200 * 3);
for (let i = 0; i < 5200; i++) {
  starPositions[i * 3] = (Math.random() - .5) * 180;
  starPositions[i * 3 + 1] = (Math.random() - .5) * 110;
  starPositions[i * 3 + 2] = -15 - Math.random() * 170;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0xcfe2ff, size: .12, sizeAttenuation: true, transparent: true, opacity: .95}));
scene.add(starPoints);

const objects = [];
const objectGroup = new THREE.Group();
scene.add(objectGroup);
const clock = new THREE.Clock();
const shipState = {
  position: new THREE.Vector3(0, 0, 6),
  velocity: new THREE.Vector3(0, 0, -2.2),
  yaw: 0,
  pitch: 0,
  roll: 0,
  thrust: 5.5,
  maxSpeed: 16,
};

const keys = new Set();
const mouse = {active: false, lastX: 0, lastY: 0};

function makeGlowSphere(radius, color, emissive = color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 28, 20),
    new THREE.MeshStandardMaterial({color, emissive, emissiveIntensity: .9, roughness: .6, metalness: .05})
  );
  return mesh;
}

function addBody(type) {
  const body = {type, mass: 1, velocity: new THREE.Vector3(), linked: null, mesh: null, name: type};
  if (type === 'blackhole') {
    body.mass = 30;
    body.mesh = makeGlowSphere(1.05, 0x010108, 0x05020b);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, .075, 10, 96), new THREE.MeshBasicMaterial({color: 0xffa14e, transparent: true, opacity: .85}));
    body.mesh.add(ring);
    body.name = 'Black Hole';
  } else if (type === 'wormhole') {
    body.mass = 0;
    body.mesh = new THREE.Group();
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(1.1, .18, 12, 96), new THREE.MeshBasicMaterial({color: 0x62e7ff, transparent: true, opacity: .8}));
    const inner = new THREE.Mesh(new THREE.TorusGeometry(.82, .06, 8, 96), new THREE.MeshBasicMaterial({color: 0xa16dff, transparent: true, opacity: .8}));
    body.mesh.add(mouth, inner);
    body.name = 'Wormhole A';
  } else {
    body.mass = 1;
    body.mesh = makeGlowSphere(1.25, 0xff9d28, 0xff6b16);
    body.name = 'Solar System';
    body.planets = [];
    const data = [
      ['Mercury', .08, 1.8, 0xb9b2a8], ['Venus', .14, 2.5, 0xd6a35d],
      ['Earth', .16, 3.3, 0x3c86d8], ['Mars', .12, 4.1, 0xb94d37],
      ['Jupiter', .34, 5.5, 0xc88f67], ['Saturn', .29, 7.0, 0xd6c08a],
      ['Uranus', .22, 8.5, 0x65c6d0], ['Neptune', .21, 10.0, 0x4068db]
    ];
    for (const [name, r, orbit, color] of data) {
      const p = makeGlowSphere(r, color, color);
      body.mesh.add(p); body.planets.push({name, mesh: p, orbit, angle: Math.random() * Math.PI * 2, radius: r});
    }
  }
  body.mesh.userData.cosmosimBody = body;
  objectGroup.add(body.mesh);
  objects.push(body);
  return body;
}

function placeBody(body, pos) {
  body.mesh.position.copy(pos);
  if (body.type === 'wormhole') {
    body.linked = new THREE.Vector3(pos.x, pos.y, pos.z - 28);
  }
}

function clearBodies() {
  while (objects.length) {
    const body = objects.pop();
    objectGroup.remove(body.mesh);
  }
}

function addDefaultScene() {
  clearBodies();
  const solar = addBody('solar'); placeBody(solar, new THREE.Vector3(0, 0, -42));
  const bh = addBody('blackhole'); placeBody(bh, new THREE.Vector3(12, 0, -65));
  const wh = addBody('wormhole'); placeBody(wh, new THREE.Vector3(-12, 1, -85));
  updateTargetOptions();
}

// Flight controls: W/S forward/back, A/D strafe left/right, arrows look, Q/E roll, Space brake.
function handleInput(dt) {
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(ship.rotation).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyEuler(ship.rotation).normalize();
  let acceleration = new THREE.Vector3();
  if (keys.has('KeyW') || keys.has('ArrowUp')) acceleration.addScaledVector(forward, shipState.thrust);
  if (keys.has('KeyS') || keys.has('ArrowDown')) acceleration.addScaledVector(forward, -shipState.thrust * .72);
  if (keys.has('KeyA') || keys.has('ArrowLeft')) acceleration.addScaledVector(right, -shipState.thrust * .82);
  if (keys.has('KeyD') || keys.has('ArrowRight')) acceleration.addScaledVector(right, shipState.thrust * .82);
  if (keys.has('KeyQ')) shipState.roll += 1.5 * dt;
  if (keys.has('KeyE')) shipState.roll -= 1.5 * dt;
  if (keys.has('Space')) shipState.velocity.multiplyScalar(Math.pow(.08, dt));
  shipState.velocity.addScaledVector(acceleration, dt);
  const speed = shipState.velocity.length();
  if (speed > shipState.maxSpeed) shipState.velocity.multiplyScalar(shipState.maxSpeed / speed);
  shipState.position.addScaledVector(shipState.velocity, dt);
}

function gravityAndWormholes(dt) {
  for (const body of objects) {
    const offset = body.mesh.position.clone().sub(shipState.position);
    const r2 = Math.max(offset.lengthSq(), .45 * .45);
    if (body.type === 'blackhole') {
      // Newtonian gravity with a deliberately strong visual scale for this game-like simulator.
      // Acceleration follows GM/r^2 and becomes very strong near the event-horizon proxy.
      const accel = 0.95 * body.mass / r2;
      shipState.velocity.addScaledVector(offset.normalize(), accel * dt);
      if (offset.length() < 1.28) {
        shipState.velocity.multiplyScalar(.35);
        setFlightMessage('BLACK HOLE: extreme gravitational pull — steer away or escape with thrust.');
      }
    }
    if (body.type === 'wormhole') {
      const distance = offset.length();
      if (distance < 1.55 && body.linked) {
        shipState.position.copy(body.linked).add(new THREE.Vector3(0, 0, 2));
        shipState.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        setFlightMessage('WORMHOLE TRANSIT: teleported to the linked exit.');
      }
    }
    if (body.type === 'solar') {
      // Sun's gravity is scaled from GM/r^2. Planets are visual orbital markers.
      const accel = 2.2 / r2;
      shipState.velocity.addScaledVector(offset.normalize(), accel * dt);
      for (const p of body.planets) {
        p.angle += .32 * Math.pow(Math.max(.2, 3.3 / p.orbit), 1.5) * dt;
        p.mesh.position.set(Math.cos(p.angle) * p.orbit, 0, Math.sin(p.angle) * p.orbit);
      }
    }
  }
}

function updateFlightCamera() {
  camera.position.copy(shipState.position);
  ship.rotation.set(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ');
  camera.rotation.copy(ship.rotation);
  ship.visible = false;
}

let targetName = 'Free flight';
function goToTarget(name) {
  const body = objects.find(o => o.name === name || (name === 'Solar System' && o.type === 'solar'));
  if (!body) return;
  const destination = body.mesh.position.clone();
  shipState.position.copy(destination.add(new THREE.Vector3(0, 0, 4)));
  shipState.velocity.set(0, 0, -1.2);
  targetName = body.name;
  setFlightMessage('Autopilot jump: positioned near ' + body.name + '. Manual controls remain active.');
}

function updateTargetOptions() {
  const select = document.getElementById('flightTarget');
  if (!select) return;
  select.innerHTML = '<option>Free flight</option>' + objects.map(o => `<option>${o.name}</option>`).join('');
}

function setFlightMessage(text) {
  const el = document.getElementById('flightMessage');
  if (el) el.textContent = text;
}

function buildFlightPanel() {
  // Keep Interstellar Flight controls in their own panel. Never replace the
  // shared #simControls panel used by the other COSMOSIM simulations.
  let panel = document.getElementById('interstellarPanelRoot');
  if (panel) return panel;
  panel = document.createElement('section');
  panel.id = 'interstellarPanelRoot';
  panel.innerHTML = `
    <div id="interstellarPanel">
      <h3>🚀 INTERSTELLAR FLIGHT DECK</h3>
      <div class="flightRow"><b>Controls</b><span>W/S = front/back · A/D = left/right</span></div>
      <div class="flightRow"><b>Look</b><span>Arrow keys · drag mouse/touch to turn</span></div>
      <div class="flightRow"><b>Brake</b><span>Space · Q/E = roll</span></div>
      <div class="flightActions">
        <button id="flightAddBH" type="button">＋ Black Hole</button>
        <button id="flightAddWH" type="button">＋ Wormhole</button>
        <button id="flightAddSolar" type="button">＋ Solar System</button>
      </div>
      <label for="flightTarget">Navigate to</label>
      <select id="flightTarget"><option>Free flight</option></select>
      <div class="flightActions">
        <button id="flightGo" type="button">Go there</button>
        <button id="flightReset" type="button" class="secondary">Reset flight</button>
      </div>
      <div id="flightMessage">WASD to fly. Gravity, wormhole transit and orbital motion are active.</div>
    </div>`;
  document.body.appendChild(panel);

  document.getElementById('flightAddBH').onclick = () => {
    const b = addBody('blackhole');
    placeBody(b, shipState.position.clone().add(new THREE.Vector3(8, 0, -24).applyEuler(ship.rotation)));
    updateTargetOptions(); setFlightMessage('Black hole added ahead. Its gravitational pull is active.');
  };
  document.getElementById('flightAddWH').onclick = () => {
    const w = addBody('wormhole');
    placeBody(w, shipState.position.clone().add(new THREE.Vector3(-5, 0, -28).applyEuler(ship.rotation)));
    updateTargetOptions(); setFlightMessage('Wormhole added ahead. Its linked exit is 28 scene units beyond the mouth.');
  };
  document.getElementById('flightAddSolar').onclick = () => {
    const solar = addBody('solar');
    placeBody(solar, shipState.position.clone().add(new THREE.Vector3(5, 0, -38).applyEuler(ship.rotation)));
    updateTargetOptions(); setFlightMessage('Solar system added. Select a planet system target and fly manually.');
  };
  document.getElementById('flightGo').onclick = () => goToTarget(document.getElementById('flightTarget').value);
  document.getElementById('flightTarget').onchange = e => { targetName = e.target.value; };
  document.getElementById('flightReset').onclick = resetFlight;
  return panel;
}

function resetFlight() {
  shipState.position.set(0, 0, 6);
  shipState.velocity.set(0, 0, -2.2);
  shipState.yaw = 0; shipState.pitch = 0; shipState.roll = 0;
  addDefaultScene();
  setFlightMessage('Flight reset. WASD to drive; gravity and wormhole transit are active.');
}

function showFlight(active) {
  const panel = buildFlightPanel();
  panel.style.display = active ? 'block' : 'none';
  touchPad.style.display = active ? 'block' : 'none';
  document.body.classList.toggle('interstellar-flight-active', active);
  flightCanvas.style.display = active ? 'block' : 'none';
  if (originalCanvas) originalCanvas.style.visibility = active ? 'hidden' : 'visible';
  if (active) {
    resetFlight();
    renderer.setSize(innerWidth, innerHeight);
  } else {
    keys.clear();
    mouse.active = false;
  }
}

// Menu selection happens in the original module. Capture clicks in the menu so the
// isolated flight renderer is enabled only for Interstellar Flight.
document.querySelectorAll('#spaceMenu .simChoice').forEach(btn => {
  btn.addEventListener('click', () => showFlight(btn.dataset.sim === 'interstellar'), true);
});

window.addEventListener('keydown', e => {
  if (flightCanvas.style.display !== 'block') return;
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keys.delete(e.code));

flightCanvas.addEventListener('pointerdown', e => { mouse.active = true; mouse.lastX = e.clientX; mouse.lastY = e.clientY; flightCanvas.setPointerCapture?.(e.pointerId); });
flightCanvas.addEventListener('pointermove', e => {
  if (!mouse.active || flightCanvas.style.display !== 'block') return;
  const dx = e.clientX - mouse.lastX, dy = e.clientY - mouse.lastY;
  mouse.lastX = e.clientX; mouse.lastY = e.clientY;
  shipState.yaw -= dx * .0026;
  shipState.pitch = THREE.MathUtils.clamp(shipState.pitch - dy * .0022, -1.35, 1.35);
});
flightCanvas.addEventListener('pointerup', () => { mouse.active = false; });
flightCanvas.addEventListener('pointercancel', () => { mouse.active = false; });

// Mobile drive buttons are added as a small overlay; they map to the same keyboard codes.
const touchPad = document.createElement('div');
touchPad.id = 'flightTouchPad';
touchPad.style.display = 'none';
touchPad.innerHTML = '<button data-key="KeyW">▲</button><div><button data-key="KeyA">◀</button><button data-key="KeyS">▼</button><button data-key="KeyD">▶</button></div>';
document.body.appendChild(touchPad);
for (const b of touchPad.querySelectorAll('button')) {
  const code = b.dataset.key;
  const down = e => { e.preventDefault(); keys.add(code); };
  const up = e => { e.preventDefault(); keys.delete(code); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
}

const style = document.createElement('style');
style.textContent = `
#interstellarFlightCanvas{cursor:crosshair}
#interstellarPanelRoot{display:none;position:fixed;z-index:30;right:12px;bottom:12px;width:min(360px,calc(100vw - 24px));max-height:46vh;overflow:auto;padding:14px;border:1px solid #52618d88;border-radius:16px;background:linear-gradient(145deg,rgba(9,14,32,.96),rgba(4,7,18,.94));backdrop-filter:blur(12px);color:#eef2ff;font:11px system-ui,Arial}
#interstellarPanelRoot h3{margin:0 0 8px;font-size:13px;letter-spacing:.5px}
#interstellarPanelRoot label{display:block;margin:8px 0 4px;color:#b9c5e4}
#interstellarPanelRoot .flightRow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;color:#b9c5e4}
#interstellarPanelRoot .flightRow span{color:#eef2ff;text-align:right}
#interstellarPanelRoot select{width:100%;background:#080b16;color:#fff;border:1px solid #414968;border-radius:9px;padding:9px}
#interstellarPanelRoot button{padding:8px 5px;font-size:10px;background:#172447;border:1px solid #52618d;color:#eef2ff;border-radius:8px}
#interstellarPanelRoot .flightActions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px}
#interstellarPanelRoot #flightMessage{font-size:10px;line-height:1.4;color:#9feaff;margin-top:7px}
#flightTouchPad{display:none;position:fixed;z-index:31;left:14px;bottom:14px;touch-action:none;user-select:none;text-align:center}
#flightTouchPad button{width:46px;height:42px;margin:3px;padding:0;background:#101b36dd;border:1px solid #6074ad;color:#fff;border-radius:10px;font-size:18px}
@media(max-width:700px){#interstellarPanelRoot{max-height:40vh;right:8px;bottom:8px;width:min(330px,calc(100vw - 16px));}#interstellarPanelRoot .flightActions{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;
document.head.appendChild(style);

function animate() {
  requestAnimationFrame(animate);
  if (flightCanvas.style.display !== 'block') return;
  const dt = Math.min(clock.getDelta(), .04);
  handleInput(dt);
  gravityAndWormholes(dt);
  updateFlightCamera();
  // Parallax: keep the background starfield around the craft while the ship moves.
  starPoints.position.copy(shipState.position).multiplyScalar(.92);
  objectGroup.children.forEach(o => { if (o.userData.cosmosimBody?.type === 'wormhole') o.rotation.z += dt * .35; });
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

buildFlightPanel();
addDefaultScene();
