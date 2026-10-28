(() => {
  'use strict';
  if (window.__COSMOSIM_BLACKHOLE_4D__) return;
  window.__COSMOSIM_BLACKHOLE_4D__ = true;

  const $ = (s, r = document) => r.querySelector(s);
  const state = { on: false, mass: 10, dpr: 1, w: 0, h: 0, raf: 0, last: performance.now(), t: 0 };

  const style = document.createElement('style');
  style.textContent = `
    #cosmosim4DButton{width:100%;margin-top:8px;background:linear-gradient(135deg,#171c2d,#39435f);border:1px solid #93a4cf;color:#f5f7ff;box-shadow:0 0 18px #9fb5ff18}
    #cosmosim4DButton.is-on{background:linear-gradient(135deg,#f7f9ff,#b9c4d9);color:#05070d;border-color:#fff;box-shadow:0 0 22px #fff8}
    #cosmosim4DOverlay{position:fixed;inset:0;z-index:1;display:none;pointer-events:none;mix-blend-mode:normal}
    #cosmosim4DOverlay.is-on{display:block}
    #cosmosim4DCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
    #cosmosim4DLabel{position:absolute;left:50%;top:86px;transform:translateX(-50%);padding:7px 11px;border:1px solid #dfe7f766;border-radius:999px;background:#03050bcc;color:#f7f9ff;font:700 9px/1 ui-monospace,SFMono-Regular,monospace;letter-spacing:.16em;text-shadow:0 0 9px #fff;opacity:.92}
    #cosmosim4DOverlay.is-on~#stats{filter:grayscale(1)}
    body.cosmosim-4d-active #space{filter:grayscale(1) contrast(1.08)}
    body.cosmosim-4d-active #stats,body.cosmosim-4d-active #controls,body.cosmosim-4d-active #top{filter:grayscale(1)}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'cosmosim4DOverlay';
  overlay.innerHTML = '<canvas id="cosmosim4DCanvas" aria-hidden="true"></canvas><div id="cosmosim4DLabel">4D VISION · SCHWARZSCHILD SPACETIME GRID</div>';
  document.body.appendChild(overlay);
  const canvas = $('#cosmosim4DCanvas', overlay);
  const ctx = canvas.getContext('2d');

  function resize() {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    state.w = Math.max(1, innerWidth);
    state.h = Math.max(1, innerHeight);
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function currentMass() {
    const input = $('#mass');
    const m = input ? Number(input.value) : state.mass;
    state.mass = Number.isFinite(m) ? Math.max(3, Math.min(50, m)) : 10;
    return state.mass;
  }

  // A monotonic inward warp: every sampled point is displaced strictly along
  // the radial direction toward the black-hole centre. No free-floating lines.
  function warpPoint(x, y, cx, cy, strength) {
    const dx = x - cx, dy = y - cy;
    const r = Math.hypot(dx, dy);
    const R = Math.max(1, Math.min(state.w, state.h) * .48);
    const q = Math.min(1, r / R);
    const pull = strength * R * .34 * Math.pow(1 - q, 1.65) / (1 + r / 105);
    const k = r > 0.001 ? Math.max(0, (r - pull) / r) : 0;
    return { x: cx + dx * k, y: cy + dy * k };
  }

  function strokeWarpedLine(points, alpha, width) {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = `rgba(245,248,255,${alpha})`;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawWarpedPlane(cx, cy, strength, scale, yOffset, alpha) {
    const spanX = state.w * scale;
    const spanY = state.h * scale;
    const stepX = Math.max(30, Math.min(54, state.w / 25));
    const stepY = Math.max(30, Math.min(54, state.h / 19));
    const farX = Math.ceil(spanX / stepX);
    const farY = Math.ceil(spanY / stepY);
    const perspective = Math.max(.55, 1 - Math.abs(yOffset) * .0012);

    for (let i = -farX; i <= farX; i++) {
      const x0 = cx + i * stepX * perspective;
      const pts = [];
      for (let j = -28; j <= 28; j++) {
        const u = j / 28;
        const y = cy + u * spanY + yOffset;
        const x = x0 + u * yOffset * .22;
        pts.push(warpPoint(x, y, cx, cy, strength));
      }
      strokeWarpedLine(pts, alpha * (.72 + .28 * (1 - Math.min(1, Math.abs(i) / farX))), .85);
    }

    for (let j = -farY; j <= farY; j++) {
      const y0 = cy + j * stepY * perspective + yOffset;
      const pts = [];
      for (let i = -34; i <= 34; i++) {
        const u = i / 34;
        const x = cx + u * spanX;
        const y = y0 + u * yOffset * .18;
        pts.push(warpPoint(x, y, cx, cy, strength));
      }
      strokeWarpedLine(pts, alpha * (.72 + .28 * (1 - Math.min(1, Math.abs(j) / farY))), .85);
    }
  }

  function drawRadialField(cx, cy, strength) {
    // Curved radial geodesic-like tracks. They all terminate at the same
    // centre instead of drifting independently.
    const rays = 56;
    const outer = Math.max(state.w, state.h) * .78;
    for (let i = 0; i < rays; i++) {
      const a = i / rays * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= 1.001; s += .025) {
        const r = 16 + s * outer;
        const bend = strength * outer * .15 * Math.pow(1 - s, 2.2);
        const rr = Math.max(8, r - bend);
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
      }
      strokeWarpedLine(pts, .08 + .08 * (i % 3 === 0), .65);
    }
  }

  function drawCurvatureRings(cx, cy, strength) {
    const maxR = Math.max(state.w, state.h) * .58;
    for (let i = 0; i < 34; i++) {
      const base = 25 + i * maxR / 34;
      ctx.beginPath();
      for (let k = 0; k <= 360; k += 3) {
        const a = k * Math.PI / 180;
        const anis = 1 + .18 * Math.sin(a * 2 + i * .11);
        const r = base * anis;
        const p = warpPoint(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .72, cx, cy, strength * 1.12);
        if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      const alpha = .18 * (1 - i / 40);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = i < 7 ? 1.05 : .65;
      ctx.stroke();
    }
  }

  function drawHole(cx, cy, strength, mass) {
    const base = Math.min(state.w, state.h) * (.052 + mass * .0012);
    const photon = base * (1.75 + .05 * strength);
    const glow = ctx.createRadialGradient(cx, cy, base * .45, cx, cy, photon * 2.8);
    glow.addColorStop(0, 'rgba(255,255,255,.30)');
    glow.addColorStop(.28, 'rgba(255,255,255,.15)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, photon * 2.8, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, .34);
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, photon * (.82 + i * .026), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${.06 + (16 - i) * .032})`;
      ctx.lineWidth = 1.2 + i * .24;
      ctx.shadowBlur = 12 + i * .4;
      ctx.shadowColor = '#fff';
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, base, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.beginPath(); ctx.arc(cx, cy, base, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = Math.max(1.5, base * .035);
    ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.stroke(); ctx.shadowBlur = 0;
  }

  function frame(now) {
    if (!state.on) { state.raf = 0; return; }
    const dt = Math.min(.05, (now - state.last) / 1000);
    state.last = now;
    state.t += dt;
    ctx.clearRect(0, 0, state.w, state.h);
    const cx = state.w * .5;
    const cy = state.h * .52;
    const mass = currentMass();
    // Schwarzschild scaling: Rs = 2GM/c², so the dimensionless visual
    // curvature grows with mass. The visual factor is normalized for this lab.
    const schwarzschildFactor = Math.sqrt(mass / 10);
    const strength = Math.min(1.55, .68 * schwarzschildFactor);

    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(0, 0, state.w, state.h);
    ctx.globalCompositeOperation = 'screen';
    drawWarpedPlane(cx, cy, strength, 1.35, -state.h * .20, .20);
    drawWarpedPlane(cx, cy, strength * 1.06, 1.15, state.h * .17, .16);
    drawRadialField(cx, cy, strength);
    drawCurvatureRings(cx, cy, strength);
    ctx.globalCompositeOperation = 'source-over';
    drawHole(cx, cy, strength, mass);

    // Fine moving light traces are constrained to the same radial geometry,
    // so animation never creates wandering grid lines.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 18; i++) {
      const a = state.t * (.035 + i * .001) + i * Math.PI * 2 / 18;
      const p0 = warpPoint(cx + Math.cos(a) * 26, cy + Math.sin(a) * 19, cx, cy, strength);
      const p1 = warpPoint(cx + Math.cos(a) * 220, cy + Math.sin(a) * 155, cx, cy, strength);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = .7; ctx.stroke();
    }
    ctx.restore();

    state.raf = requestAnimationFrame(frame);
  }

  function setEnabled(on) {
    state.on = !!on;
    overlay.classList.toggle('is-on', state.on);
    document.body.classList.toggle('cosmosim-4d-active', state.on);
    const button = $('#cosmosim4DButton');
    if (button) {
      button.classList.toggle('is-on', state.on);
      button.textContent = state.on ? '◉ 4D VISION · ON' : '◉ 4D VISION · OFF';
      button.setAttribute('aria-pressed', String(state.on));
    }
    if (state.on) {
      if (window.__COSMOSIM_4D_GRAYSCALE__) window.__COSMOSIM_4D_GRAYSCALE__(true);
      state.last = performance.now();
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    } else if (state.raf) {
      cancelAnimationFrame(state.raf); state.raf = 0;
      ctx.clearRect(0, 0, state.w, state.h);
    }
  }

  function installButton() {
    if ($('#cosmosim4DButton')) return;
    const actions = $('#controls .actions');
    const panelBody = $('#panelBody');
    if (!actions || !panelBody) return;
    const button = document.createElement('button');
    button.id = 'cosmosim4DButton';
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '◉ 4D VISION · OFF';
    button.title = 'Show curved four-dimensional spacetime grid for the original Black Hole Lab';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (window.__COSMOSIM_ACTIVE_SIM__ && window.__COSMOSIM_ACTIVE_SIM__ !== 'blackhole') return;
      setEnabled(!state.on);
    });
    panelBody.appendChild(button);
  }

  function observeSimulation() {
    document.querySelectorAll('.simChoice').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.sim;
      window.__COSMOSIM_ACTIVE_SIM__ = id;
      if (id !== 'blackhole') setEnabled(false);
    }));
    const original = document.querySelector('.simChoice[data-sim="blackhole"]');
    if (original) window.__COSMOSIM_ACTIVE_SIM__ = 'blackhole';
  }

  const observer = new MutationObserver(() => installButton());
  observer.observe(document.body, { childList: true, subtree: true });
  installButton();
  observeSimulation();
  resize();
  addEventListener('resize', resize);

  // The original Black Hole Lab uses #mass as its only mass control. Listen to
  // it directly so the curvature reacts continuously and monotonically to mass.
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'mass') state.mass = Number(e.target.value) || state.mass;
  }, true);
})();
