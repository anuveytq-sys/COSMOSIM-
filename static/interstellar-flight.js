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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 3000);
camera.position.set(0, 0.8, 6);

scene.add(new THREE.HemisphereLight(0x91baff, 0x080a20, 1.25));
scene.add(new THREE.AmbientLight(0x536aa0, .42));
const sunLight = new THREE.PointLight(0xffc46e, 5.5, 180, 1.5);
sunLight.position.set(0, 2, -38);
scene.add(sunLight);

// Layered additive nebula particle clouds.
for (const [layer, color] of [0x4b3cff, 0x13bfe7, 0xb02bff, 0xff477e].entries()) {
  const positions = new Float32Array(950 * 3);
  for (let i = 0; i < 950; i++) {
    const cluster = i % 3;
    positions[i*3] = (cluster - 1) * 34 + (Math.random() - .5) * 35;
    positions[i*3+1] = (Math.random() - .5) * 28 + Math.sin(i * .07) * 3;
    positions[i*3+2] = -24 - Math.random() * 145;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const cloud = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 1.0 + layer * .22, transparent: true, opacity: .11,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  cloud.userData.parallax = .82 + layer * .035;
  scene.add(cloud);
}

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
  maxSpeed: 24,
  spawn: new THREE.Vector3(0, 0, 6),
  wormholeCooldown: 0,
  blackHoleWarning: 0,
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
    body.mass = 34;
    body.mesh = makeGlowSphere(1.0, 0x010108, 0x05020b);
    const disk = new THREE.Mesh(new THREE.TorusGeometry(1.45, .22, 14, 128),
      new THREE.MeshStandardMaterial({color: 0xff7a32, emissive: 0xff3b08, emissiveIntensity: 2.2, metalness: .25, roughness: .3, side: THREE.DoubleSide}));
    disk.rotation.x = .22; body.mesh.add(disk);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(1.85, .075, 10, 128),
      new THREE.MeshBasicMaterial({color: 0xffd49a, transparent: true, opacity: .85}));
    outer.rotation.x = .22; body.mesh.add(outer);
    body.mesh.add(new THREE.Mesh(new THREE.TorusGeometry(1.13, .035, 8, 128),
      new THREE.MeshBasicMaterial({color: 0xfff0c7, transparent: true, opacity: .98})));
    body.mesh.add(new THREE.Mesh(new THREE.SphereGeometry(1.55, 32, 24),
      new THREE.MeshBasicMaterial({color: 0x6d39ff, transparent: true, opacity: .075, side: THREE.BackSide})));
    body.name = 'Black Hole';
  } else if (type === 'wormhole') {
    body.mass = 0;
    body.mesh = new THREE.Group();
    body.mesh.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, .18, 16, 128),
      new THREE.MeshBasicMaterial({color: 0x62e7ff, transparent: true, opacity: .96})));
    body.mesh.add(new THREE.Mesh(new THREE.TorusGeometry(.82, .06, 10, 128),
      new THREE.MeshBasicMaterial({color: 0xa16dff, transparent: true, opacity: .96})));
    body.mesh.add(new THREE.Mesh(new THREE.CircleGeometry(.78, 64),
      new THREE.MeshBasicMaterial({color: 0x2d0f78, transparent: true, opacity: .6, side: THREE.DoubleSide})));
    body.exitMesh = new THREE.Group();
    body.exitMesh.add(new THREE.Mesh(new THREE.TorusGeometry(1.08, .16, 14, 112),
      new THREE.MeshBasicMaterial({color: 0xff65d8, transparent: true, opacity: .9})));
    body.exitMesh.add(new THREE.Mesh(new THREE.TorusGeometry(.82, .05, 10, 112),
      new THREE.MeshBasicMaterial({color: 0x68f8ff, transparent: true, opacity: .95})));
    objectGroup.add(body.exitMesh);
    body.name = 'Wormhole A';
  } else {
    body.mass = 1;
    body.mesh = makeGlowSphere(1.25, 0xffa83b, 0xff6818);
    body.mesh.material.emissiveIntensity = 2.4;
    body.mesh.add(new THREE.Mesh(new THREE.SphereGeometry(1.52, 32, 24),
      new THREE.MeshBasicMaterial({color: 0xff8c25, transparent: true, opacity: .12, side: THREE.BackSide})));
    body.mesh.add(new THREE.PointLight(0xffa33b, 3.5, 65, 1.7));
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
      p.material.emissiveIntensity = .42;
      body.mesh.add(p);
      body.planets.push({name, mesh: p, orbit, angle: Math.random() * Math.PI * 2, radius: r});
      if (name === 'Saturn') {
        const rings = new THREE.Mesh(new THREE.TorusGeometry(r * 1.45, .055, 8, 48),
          new THREE.MeshStandardMaterial({color: 0xe3cfa1, roughness: .7, metalness: .15, transparent: true, opacity: .8}));
        rings.rotation.x = Math.PI / 2.5; p.add(rings);
      }
    }
    const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.075, 0),
      new THREE.MeshStandardMaterial({color: 0x8c8d9b, roughness: .92, metalness: .08}), 260);
    const dummy = new THREE.Object3D();
    for (let i=0;i<260;i++) {
      const angle=Math.random()*Math.PI*2, radius=13+Math.random()*7;
      dummy.position.set(Math.cos(angle)*radius,(Math.random()-.5)*1.6,Math.sin(angle)*radius);
      dummy.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      dummy.scale.setScalar(.45+Math.random()*2.2); dummy.updateMatrix(); belt.setMatrixAt(i,dummy.matrix);
    }
    belt.instanceMatrix.needsUpdate=true; body.mesh.add(belt); body.asteroidBelt=belt;
  }
  body.mesh.userData.cosmosimBody = body;
  objectGroup.add(body.mesh);
  objects.push(body);
  return body;
}

function placeBody(body, pos) {
  body.mesh.position.copy(pos);
  if (body.type === 'wormhole') {
    body.linked = new THREE.Vector3(pos.x + 1.5, pos.y, pos.z - 28);
    if (body.exitMesh) body.exitMesh.position.copy(body.linked);
  }
}

function clearBodies() {
  while (objects.length) {
    const body = objects.pop();
    objectGroup.remove(body.mesh);
    if (body.exitMesh) objectGroup.remove(body.exitMesh);
  }
}

function addDefaultScene() {
  clearBodies();
  const solar = addBody('solar'); placeBody(solar, new THREE.Vector3(0, 0, -78));
  const bh = addBody('blackhole'); placeBody(bh, new THREE.Vector3(10, 1.5, -38));
  const wh = addBody('wormhole'); placeBody(wh, new THREE.Vector3(-8, 1, -56));
  updateTargetOptions();
}

// Game-style flight: W/S thrust, A/D or left/right steer, arrows pitch.
function handleInput(dt) {
  if (keys.has('KeyA') || keys.has('ArrowLeft')) shipState.yaw += 1.65 * dt;
  if (keys.has('KeyD') || keys.has('ArrowRight')) shipState.yaw -= 1.65 * dt;
  if (keys.has('ArrowUp')) shipState.pitch = THREE.MathUtils.clamp(shipState.pitch + 1.15 * dt, -1.25, 1.25);
  if (keys.has('ArrowDown')) shipState.pitch = THREE.MathUtils.clamp(shipState.pitch - 1.15 * dt, -1.25, 1.25);
  if (keys.has('KeyQ')) shipState.roll += 1.35 * dt;
  if (keys.has('KeyE')) shipState.roll -= 1.35 * dt;
  const orientation = new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ');
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(orientation).normalize();
  const acceleration = new THREE.Vector3();
  if (keys.has('KeyW')) acceleration.addScaledVector(forward, shipState.thrust);
  if (keys.has('KeyS')) acceleration.addScaledVector(forward, -shipState.thrust * .68);
  if (keys.has('Space')) shipState.velocity.addScaledVector(forward, -shipState.thrust * 1.9 * dt);
  shipState.velocity.addScaledVector(acceleration, dt);
  shipState.velocity.multiplyScalar(Math.pow(.998, dt * 60));
  const speed = shipState.velocity.length();
  if (speed > shipState.maxSpeed) shipState.velocity.multiplyScalar(shipState.maxSpeed / speed);
  shipState.position.addScaledVector(shipState.velocity, dt);
}

function gravityAndWormholes(dt) {
  shipState.wormholeCooldown = Math.max(0, shipState.wormholeCooldown - dt);
  shipState.blackHoleWarning = Math.max(0, shipState.blackHoleWarning - dt);
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(
    new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ')).normalize();
  for (const body of objects) {
    const offset = body.mesh.position.clone().sub(shipState.position);
    const distance = Math.max(offset.length(), .001), r2 = distance * distance;
    if (body.type === 'blackhole') {
      const accel = (1.65 * body.mass) / (r2 + 2.4);
      shipState.velocity.addScaledVector(offset.clone().normalize(), accel * dt);
      if (distance < 8 && shipState.blackHoleWarning <= 0) {
        setFlightMessage('GRAVITY WELL: black-hole pull is increasing. Thrust away to escape!');
        shipState.blackHoleWarning = 1.5;
      }
      if (distance < 1.25) {
        shipState.position.copy(body.mesh.position).add(new THREE.Vector3(0, 0, 4.2));
        shipState.velocity.set(0, 0, 0);
        setFlightMessage('EVENT HORIZON: craft captured by the black hole. Recovery point restored.');
      }
    } else if (body.type === 'wormhole') {
      if (distance < 1.7 && body.linked && shipState.wormholeCooldown <= 0) {
        shipState.position.copy(body.linked).addScaledVector(forward, 3.2);
        shipState.wormholeCooldown = 2.2;
        setFlightMessage('WORMHOLE TRANSIT: crossed the throat and emerged from the linked exit!');
      }
    } else if (body.type === 'solar') {
      const accel = 1.15 / (r2 + 3.5);
      shipState.velocity.addScaledVector(offset.clone().normalize(), accel * dt);
      for (const p of body.planets) {
        p.angle += .32 * Math.pow(Math.max(.2, 3.3 / p.orbit), 1.5) * dt;
        p.mesh.position.set(Math.cos(p.angle) * p.orbit, Math.sin(p.angle * .35) * .12, Math.sin(p.angle) * p.orbit);
      }
      if (body.asteroidBelt) body.asteroidBelt.rotation.y += dt * .018;
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
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ')).normalize();
  shipState.position.copy(destination).addScaledVector(forward, -5.5);
  shipState.velocity.copy(forward).multiplyScalar(2.2);
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
      <div class="flightRow"><b>Drive</b><span>W/S thrust · A/D steer</span></div>
      <div class="flightRow"><b>Look</b><span>Arrow keys or drag screen</span></div>
      <div class="flightRow"><b>Brake / Roll</b><span>Space · Q/E</span></div>
      <div class="flightRow"><b>Physics</b><span>Gravity wells · event horizon · wormhole transit</span></div>
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
      <div id="flightMessage">W to accelerate, S to reverse, A/D to steer. Drag to look around.</div>
    </div>`;
  document.body.appendChild(panel);
  let deckToggle = document.getElementById('flightDeckToggle');
  if (!deckToggle) {
    deckToggle = document.createElement('button');
    deckToggle.id = 'flightDeckToggle'; deckToggle.type = 'button';
    deckToggle.textContent = 'Hide Flight Deck';
    document.body.appendChild(deckToggle);
    deckToggle.addEventListener('click', () => {
      const deck = document.getElementById('interstellarPanelRoot');
      const hidden = deck.style.display === 'none';
      deck.style.display = hidden ? 'block' : 'none';
      deckToggle.textContent = hidden ? 'Hide Flight Deck' : 'Show Flight Deck';
      deckToggle.setAttribute('aria-expanded', String(hidden));
    });
  }

  document.getElementById('flightAddBH').onclick = () => {
    const b = addBody('blackhole');
    placeBody(b, shipState.position.clone().add(new THREE.Vector3(0, 0, -20).applyEuler(new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ'))));
    updateTargetOptions(); setFlightMessage('Black hole added ahead. Its gravitational pull is active.');
  };
  document.getElementById('flightAddWH').onclick = () => {
    const w = addBody('wormhole');
    placeBody(w, shipState.position.clone().add(new THREE.Vector3(0, 0, -22).applyEuler(new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ'))));
    updateTargetOptions(); setFlightMessage('Wormhole added ahead. Its linked exit is 28 scene units beyond the mouth.');
  };
  document.getElementById('flightAddSolar').onclick = () => {
    const solar = addBody('solar');
    placeBody(solar, shipState.position.clone().add(new THREE.Vector3(0, 0, -34).applyEuler(new THREE.Euler(shipState.pitch, shipState.yaw, shipState.roll, 'YXZ'))));
    updateTargetOptions(); setFlightMessage('Solar system added. Select a planet system target and fly manually.');
  };
  document.getElementById('flightGo').onclick = () => goToTarget(document.getElementById('flightTarget').value);
  document.getElementById('flightTarget').onchange = e => { targetName = e.target.value; };
  document.getElementById('flightReset').onclick = resetFlight;
  return panel;
}

function resetFlight() {
  shipState.position.copy(shipState.spawn);
  shipState.velocity.set(0, 0, -2.2);
  shipState.yaw = 0; shipState.pitch = 0; shipState.roll = 0;
  shipState.wormholeCooldown = 0; shipState.blackHoleWarning = 0;
  addDefaultScene();
  setFlightMessage('Flight reset. WASD to drive; gravity and wormhole transit are active.');
}

function showFlight(active) {
  const panel = buildFlightPanel();
  document.body.classList.toggle('interstellar-flight-active', active);
  panel.style.display = active ? 'block' : 'none';
  const deckToggle = document.getElementById('flightDeckToggle');
  if (deckToggle) { deckToggle.style.display = active ? 'block' : 'none'; deckToggle.textContent = 'Hide Flight Deck'; deckToggle.setAttribute('aria-expanded', 'true'); }
  touchPad.style.display = active ? 'block' : 'none';
  // The shared command deck belongs to the other simulations; hide it only
  // while Interstellar Flight is selected so its own deck is the only one shown.
  const sharedControls = document.getElementById('simControls');
  if (active && sharedControls) sharedControls.style.display = 'none';
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
  // Run after COSMOSIM's own chooseSim handler, which updates its shared panels.
  btn.addEventListener('click', () => showFlight(btn.dataset.sim === 'interstellar'));
});

window.addEventListener('keydown', e => {
  if (flightCanvas.style.display !== 'block') return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

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
  const down = e => { e.preventDefault(); keys.add(code); b.setPointerCapture?.(e.pointerId); };
  const up = e => { e.preventDefault(); keys.delete(code); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
}

const style = document.createElement('style');
style.textContent = `
#interstellarFlightCanvas{cursor:crosshair;touch-action:none}
body:not(.interstellar-flight-active) #interstellarPanelRoot{display:none!important;}
body:not(.interstellar-flight-active) #flightTouchPad{display:none!important;}
body.interstellar-flight-active #simControls{display:none!important;}
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
#flightTouchPad button{width:54px;height:50px;margin:4px;padding:0;background:linear-gradient(145deg,#1a3761ee,#080f24ee);border:1px solid #72d9ff;color:#fff;border-radius:14px;font-size:21px;box-shadow:0 4px 18px #0008;touch-action:none}
#flightDeckToggle{display:none;position:fixed;z-index:32;right:14px;bottom:14px;border:1px solid #6bdfff;border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#152e52f5,#231448f5);color:#f4fbff;font:700 12px system-ui;box-shadow:0 5px 20px #0009}
@media(max-width:700px){#interstellarPanelRoot{max-height:40vh;right:8px;bottom:72px;width:min(330px,calc(100vw - 16px));}#interstellarPanelRoot .flightActions{grid-template-columns:repeat(3,minmax(0,1fr))}#flightTouchPad{left:7px;bottom:8px}#flightDeckToggle{right:8px;bottom:8px}}
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
  scene.children.forEach(o => { if (o.isPoints && o !== starPoints && o.userData.parallax) o.position.copy(shipState.position).multiplyScalar(o.userData.parallax); });
  objectGroup.children.forEach(o => { if (o.userData.cosmosimBody?.type === 'wormhole') o.rotation.z += dt * .35; });
  const deckToggle = document.getElementById('flightDeckToggle');
  if (deckToggle && deckToggle.style.display !== 'none') deckToggle.textContent = document.getElementById('interstellarPanelRoot')?.style.display === 'none' ? 'Show Flight Deck' : 'Hide Flight Deck';
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
