(() => {
  'use strict';
  // COSMOSIM accessibility controls, adapted from EYENEX NEURAL's face-landmark
  // tracking. Camera frames are processed locally in this browser; no video is uploaded.
  const $ = (s, root = document) => root.querySelector(s);
  const style = document.createElement('style');
  style.textContent = `
    #cosmosimSettingsButton{min-width:40px;height:40px;padding:8px 10px;font-size:18px;line-height:1;background:linear-gradient(135deg,#263657,#43517c);border:1px solid #7d91c7;box-shadow:0 0 16px #5e75ff22}
    #topRightActions{gap:6px}
    #topRightActions button{white-space:nowrap}
    #cosmosimTrackingDialog{position:fixed;z-index:10001;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(390px,calc(100vw - 24px));max-height:calc(100dvh - 28px);overflow:auto;padding:17px;border:1px solid #6378bc;border-radius:16px;background:linear-gradient(145deg,#0a1125f7,#050914fa);color:#eef2ff;box-shadow:0 18px 70px #000c;font:13px/1.5 system-ui,Arial}
    #cosmosimTrackingDialog[hidden]{display:none}
    #cosmosimTrackingDialog .ct-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
    #cosmosimTrackingDialog h2{font-size:16px;margin:0;letter-spacing:.5px}
    #cosmosimTrackingDialog .ct-copy{color:#aab8db;font-size:11px;margin:7px 0 12px}
    #cosmosimTrackingDialog .ct-status{font:10px/1.5 ui-monospace,monospace;letter-spacing:.4px;color:#84e8ff;padding:7px 9px;border:1px solid #384a79;border-radius:8px;margin:9px 0}
    #cosmosimTrackingDialog .ct-preview{position:relative;aspect-ratio:16/9;max-height:190px;background:#02040b;border:1px solid #303d61;border-radius:9px;overflow:hidden}
    #cosmosimTrackingDialog video{display:block;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:0}
    #cosmosimTrackingDialog video.ct-live{opacity:1}
    #cosmosimTrackingDialog .ct-preview-label{position:absolute;inset:0;display:grid;place-items:center;color:#7888ae;font:10px ui-monospace,monospace;letter-spacing:1px;pointer-events:none}
    #cosmosimTrackingDialog .ct-preview-label[hidden]{display:none}
    #cosmosimTrackingDialog .ct-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
    #cosmosimTrackingDialog .ct-actions button{flex:1 1 42%;min-height:37px;padding:8px 9px;font-size:11px;background:#222e4c;border:1px solid #43557e}
    #cosmosimTrackingDialog .ct-actions button.primary{background:linear-gradient(135deg,#6558ff,#a348e9)}
    #cosmosimTrackingDialog .ct-actions button:disabled{opacity:.4;cursor:not-allowed}
    #cosmosimTrackingDialog .ct-note{color:#9caccd;font-size:10px;margin:11px 0 0}
    #cosmosimTrackingDialog .ct-close{flex:0 0 auto!important;min-height:32px!important;padding:5px 9px!important}
    .cosmosim-tracking-pointer{position:fixed;z-index:10002;width:19px;height:19px;border:2px solid #72f2ff;border-radius:50%;box-shadow:0 0 0 5px #72f2ff22,0 0 18px #42dfffaa;transform:translate(-50%,-50%);pointer-events:none;display:none;will-change:left,top}
    .cosmosim-tracking-pointer.is-active{display:block}
    .cosmosim-tracking-pointer:after{content:"";position:absolute;inset:5px;border-radius:50%;background:#72f2ff}
    .cosmosim-tracking-pointer.is-confirming{border-color:#8fffc9;box-shadow:0 0 0 8px #8fffc933,0 0 22px #8fffc9cc}
    @media(max-width:520px){
      #topRightActions{gap:4px}
      #topRightActions button{padding:8px 9px;font-size:11px}
      #topRightActions #spaceMenuButton{min-width:35px;padding:7px;font-size:17px}
      #topRightActions #cosmosimSettingsButton{min-width:35px;height:35px;padding:6px;font-size:17px}
      #topRightActions #pause{font-size:10px;padding:8px 7px}
      #top .brand{font-size:14px;letter-spacing:1px}
      #top .sub{font-size:8px;max-width:145px}
    }
  `;
  document.head.appendChild(style);

  const topActions = $('#topRightActions');
  const menuButton = $('#spaceMenuButton');
  if (!topActions || !menuButton) return;

  const settingsButton = document.createElement('button');
  settingsButton.id = 'cosmosimSettingsButton';
  settingsButton.className = 'secondary';
  settingsButton.type = 'button';
  settingsButton.textContent = '⚙';
  settingsButton.title = 'Head and eye tracking settings';
  settingsButton.setAttribute('aria-label', 'Open head and eye tracking settings');
  menuButton.insertAdjacentElement('afterend', settingsButton);

  const dialog = document.createElement('section');
  dialog.id = 'cosmosimTrackingDialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'cosmosimTrackingTitle');
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="ct-head"><h2 id="cosmosimTrackingTitle">HEAD &amp; EYE TRACKING</h2><button type="button" class="ct-close" id="ctClose" aria-label="Close settings">✕</button></div>
    <p class="ct-copy">Use head movement or eye gaze to steer the on-screen pointer. Enable blink confirmation to activate the control beneath the pointer. Camera processing stays in this browser.</p>
    <div class="ct-preview"><video id="ctVideo" muted playsinline aria-label="Mirrored camera preview"></video><div class="ct-preview-label" id="ctPreviewLabel">CAMERA OFF</div></div>
    <div class="ct-status" id="ctStatus" role="status" aria-live="polite">CAMERA OFF · READY</div>
    <div class="ct-actions">
      <button class="primary" id="ctStart" type="button">Start tracking</button>
      <button id="ctCalibrate" type="button" disabled>Calibrate center</button>
      <button id="ctMode" type="button" disabled>Pointer mode: HEAD</button>
      <button id="ctBlink" type="button" disabled>Blink confirm: OFF</button>
      <button id="ctDwell" type="button" disabled>Dwell scroll: OFF</button>
      <button id="ctPause" type="button" disabled>Pause tracking</button>
      <button id="ctStop" type="button" disabled>Stop camera</button>
    </div>
    <p class="ct-note">Tip: allow camera access, look at the center of the screen, then select Calibrate center. With Blink confirm ON, a detected blink clicks the control beneath the pointer. For dwell scrolling, hold the pointer near the top or bottom edge of a scrollable panel. Camera access requires HTTPS or localhost.</p>
  `;
  document.body.appendChild(dialog);

  const video = $('#ctVideo'), previewLabel = $('#ctPreviewLabel'), status = $('#ctStatus');
  const startButton = $('#ctStart'), calibrateButton = $('#ctCalibrate'), modeButton = $('#ctMode');
  const blinkButton = $('#ctBlink'), dwellButton = $('#ctDwell'), pauseButton = $('#ctPause'), stopButton = $('#ctStop');
  let stream = null, landmarker = null, raf = 0, paused = false, blinkConfirm = false, dwellScroll = false;
  let baseline = null, smoothed = null, eyeBaseline = null, eyeSmoothed = null;
  let pointerMode = 'head', closedAt = 0, lastFrameAt = 0, lastConfirmAt = 0, blinkConsumed = false;
  let dwellTarget = null, dwellDirection = 0, dwellStartedAt = 0, lastDwellScrollAt = 0;
  let pointer = null, pointerX = innerWidth / 2, pointerY = innerHeight / 2;

  function say(message, active = false) {
    status.textContent = message;
    status.style.color = active ? '#8fffc9' : '#84e8ff';
  }
  function ensurePointer() {
    if (pointer) return pointer;
    pointer = document.createElement('div');
    pointer.className = 'cosmosim-tracking-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(pointer);
    return pointer;
  }
  function updatePointer(x, y) {
    const previousX = pointerX, previousY = pointerY;
    pointerX = Math.max(8, Math.min(innerWidth - 8, x));
    pointerY = Math.max(8, Math.min(innerHeight - 8, y));
    const node = ensurePointer();
    node.style.left = pointerX + 'px';
    node.style.top = pointerY + 'px';
    node.classList.add('is-active');
    if (Math.abs(pointerX - previousX) + Math.abs(pointerY - previousY) > 0.5) {
      window.dispatchEvent(new CustomEvent('cosmosim-tracking-move', {
        detail: { x: pointerX, y: pointerY, dx: pointerX - previousX, dy: pointerY - previousY }
      }));
    }
  }
  function setButtons(active) {
    calibrateButton.disabled = !active;
    modeButton.disabled = !active;
    blinkButton.disabled = !active;
    dwellButton.disabled = !active;
    pauseButton.disabled = !active;
    stopButton.disabled = !active;
    startButton.disabled = active;
    modeButton.textContent = 'Pointer mode: ' + (pointerMode === 'head' ? 'HEAD' : 'EYE GAZE');
    blinkButton.textContent = 'Blink confirm: ' + (blinkConfirm ? 'ON' : 'OFF');
    dwellButton.textContent = 'Dwell scroll: ' + (dwellScroll ? 'ON' : 'OFF');
    pauseButton.textContent = paused ? 'Resume tracking' : 'Pause tracking';
  }
  function safeConfirmAtPointer() {
    const now = performance.now();
    if (now - lastConfirmAt < 420) return;
    lastConfirmAt = now;
    const hit = document.elementFromPoint(pointerX, pointerY);
    if (!hit) { say('No control under the pointer.'); return; }
    const control = hit.closest('button,a[href],input[type="button"],input[type="checkbox"],input[type="radio"],input[type="range"],select,summary,[role="button"]');
    if (!control || control.matches(':disabled,[aria-disabled="true"]')) {
      say('Move the pointer directly over an enabled button or control.');
      return;
    }
    // Never let an involuntary blink execute the text command form. Other existing
    // COSMOSIM buttons, including pause and simulation selection, remain available.
    const commandSubmit = control.matches('#commandForm button[type="submit"],#commandForm input[type="submit"]');
    if (control.matches('form button[type="submit"],form input[type="submit"]') && !commandSubmit) {
      say('This submit control requires a deliberate touch or click.');
      return;
    }
    if (commandSubmit) {
      const commandInput = $('#command');
      if (!commandInput || !commandInput.value.trim()) {
        say('Enter a simulation command first, then blink while the Execute button is under the pointer.');
        return;
      }
    }
    try {
      control.focus({ preventScroll: true });
      if (control.matches('input[type="checkbox"],input[type="radio"]')) {
        control.click();
      } else {
        control.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true, clientX: pointerX, clientY: pointerY, button: 0, buttons: 1 }));
        control.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse', isPrimary: true, clientX: pointerX, clientY: pointerY, button: 0, buttons: 0 }));
        control.click();
      }
      say('Blink click: ' + ((control.getAttribute('aria-label') || control.textContent || control.id || 'control').trim().replace(/\s+/g, ' ').slice(0, 50)), true);
    } catch (_) {
      say('Could not activate that control; try a direct touch or click.');
    }
  }
  function findScrollableAtPointer() {
    const nodes = document.elementsFromPoint(pointerX, pointerY);
    for (const node of nodes) {
      if (!node || node === pointer) continue;
      let current = node;
      while (current && current !== document.body) {
        if (current instanceof HTMLElement) {
          const style = getComputedStyle(current);
          const canScroll = /(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 4;
          if (canScroll) return current;
        }
        current = current.parentElement;
      }
    }
    return null;
  }

  function updateDwellScroll(now) {
    if (!dwellScroll || !stream || paused || !baseline || !pointer) {
      dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0;
      return;
    }
    const target = findScrollableAtPointer();
    if (!target) { dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0; return; }
    const rect = target.getBoundingClientRect();
    const edge = Math.min(64, Math.max(28, rect.height * 0.18));
    let direction = 0;
    if (pointerY <= rect.top + edge && target.scrollTop > 0) direction = -1;
    else if (pointerY >= rect.bottom - edge && target.scrollTop + target.clientHeight < target.scrollHeight - 1) direction = 1;
    if (!direction) { dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0; return; }
    if (target !== dwellTarget || direction !== dwellDirection) {
      dwellTarget = target; dwellDirection = direction; dwellStartedAt = now; lastDwellScrollAt = now;
      return;
    }
    if (now - dwellStartedAt < 300) return;
    const elapsed = Math.min(50, now - lastDwellScrollAt);
    lastDwellScrollAt = now;
    target.scrollTop += direction * Math.max(4, elapsed * 0.72);
  }

  function blendshape(categories, name) {
    const entry = categories && categories.find(item => item.categoryName === name);
    return entry ? entry.score : 0;
  }
  async function loadLandmarker() {
    const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
    const files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    return vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU'
      },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
      minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55, minTrackingConfidence: 0.55
    });
  }
  function tick() {
    if (!stream || !landmarker || paused || document.hidden) {
      if (stream && !paused && document.hidden) raf = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const now = performance.now();
      if (now - lastFrameAt >= 45) {
        lastFrameAt = now;
        try {
          const result = landmarker.detectForVideo(video, now);
          const face = result.faceLandmarks && result.faceLandmarks[0];
          if (face && face[1]) {
            const nose = face[1], sample = { x: nose.x, y: nose.y };
            if (face[468] && face[473]) {
              const eyeSample = { x: (face[468].x + face[473].x) / 2, y: (face[468].y + face[473].y) / 2 };
              if (!eyeSmoothed) eyeSmoothed = eyeSample;
              else { eyeSmoothed.x += (eyeSample.x - eyeSmoothed.x) * 0.28; eyeSmoothed.y += (eyeSample.y - eyeSmoothed.y) * 0.28; }
            }
            if (!smoothed) smoothed = sample;
            else { smoothed.x += (sample.x - smoothed.x) * 0.22; smoothed.y += (sample.y - smoothed.y) * 0.22; }
            if (baseline) {
              let x, y;
              if (pointerMode === 'eye' && eyeBaseline && eyeSmoothed) {
                x = (0.5 - (eyeSmoothed.x - eyeBaseline.x) * 7.0) * innerWidth;
                y = (0.5 + (eyeSmoothed.y - eyeBaseline.y) * 8.0) * innerHeight;
              } else {
                x = (0.5 - (smoothed.x - baseline.x) * 3.2) * innerWidth;
                y = (0.5 + (smoothed.y - baseline.y) * 3.2) * innerHeight;
              }
              updatePointer(x, y);
              say(blinkConfirm ? 'TRACKING · BLINK CONFIRM ON' : 'TRACKING · ' + pointerMode.toUpperCase(), true);
            }
            const categories = result.faceBlendshapes && result.faceBlendshapes[0] && result.faceBlendshapes[0].categories;
            const left = blendshape(categories, 'eyeBlinkLeft'), right = blendshape(categories, 'eyeBlinkRight');
            const closed = (left + right) / 2 > 0.38 && Math.min(left, right) > 0.18;
            if (closed && closedAt === 0) { closedAt = now; blinkConsumed = false; }
            if (closed && blinkConfirm && !blinkConsumed && closedAt > 0 && now - closedAt >= 70) {
              blinkConsumed = true;
              if (pointer) pointer.classList.add('is-confirming');
              safeConfirmAtPointer();
              setTimeout(() => pointer && pointer.classList.remove('is-confirming'), 220);
            }
            if (!closed && closedAt > 0) {
              const duration = now - closedAt;
              if (blinkConfirm && !blinkConsumed && duration >= 45 && duration <= 1100) {
                blinkConsumed = true;
                if (pointer) pointer.classList.add('is-confirming');
                safeConfirmAtPointer();
                setTimeout(() => pointer && pointer.classList.remove('is-confirming'), 350);
              }
              closedAt = 0;
            }
          } else {
            say('FACE NOT DETECTED · CENTER YOUR FACE');
          }
        } catch (_) {
          say('Tracking frame issue. Try stopping and restarting the camera.');
        }
      }
    }
    updateDwellScroll(performance.now());
    raf = requestAnimationFrame(tick);
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      say('Camera unavailable. Open the website over HTTPS in a supported browser.');
      return;
    }
    startButton.disabled = true;
    say('REQUESTING CAMERA PERMISSION…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }
      });
      video.srcObject = stream;
      await video.play();
      say('LOADING FACE TRACKING MODEL…');
      landmarker = await loadLandmarker();
      baseline = smoothed = eyeBaseline = eyeSmoothed = null;
      paused = false;
      video.classList.add('ct-live');
      previewLabel.hidden = true;
      setButtons(true);
      ensurePointer();
      say('CAMERA READY · CALIBRATE CENTER');
      tick();
    } catch (error) {
      await stopCamera('CAMERA START FAILED · ' + (error && error.name === 'NotAllowedError' ? 'PERMISSION DENIED' : (error && error.message ? error.message.slice(0, 90) : 'MODEL UNAVAILABLE')));
      startButton.disabled = false;
    }
  }
  async function stopCamera(message = 'CAMERA OFF · VIDEO STREAM RELEASED') {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; paused = false; blinkConfirm = false; dwellScroll = false; closedAt = 0; blinkConsumed = false;
    dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; video.pause(); video.srcObject = null;
    video.classList.remove('ct-live'); previewLabel.hidden = false; previewLabel.textContent = 'CAMERA OFF';
    if (landmarker) { try { landmarker.close(); } catch (_) {} }
    landmarker = null;
    if (pointer) pointer.classList.remove('is-active', 'is-confirming');
    setButtons(false); startButton.disabled = false; say(message);
  }

  settingsButton.addEventListener('click', () => {
    dialog.hidden = false;
    ensurePointer();
  });
  $('#ctClose').addEventListener('click', () => { dialog.hidden = true; });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.hidden = true; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.hidden) dialog.hidden = true; });
  startButton.addEventListener('click', startCamera);
  calibrateButton.addEventListener('click', () => {
    if (!smoothed) { say('FACE NOT DETECTED · TRY AGAIN'); return; }
    baseline = { x: smoothed.x, y: smoothed.y };
    eyeBaseline = eyeSmoothed ? { x: eyeSmoothed.x, y: eyeSmoothed.y } : null;
    updatePointer(innerWidth / 2, innerHeight / 2);
    say('CENTER CALIBRATED · ' + pointerMode.toUpperCase(), true);
  });
  modeButton.addEventListener('click', () => {
    pointerMode = pointerMode === 'head' ? 'eye' : 'head';
    if (smoothed) baseline = { x: smoothed.x, y: smoothed.y };
    if (eyeSmoothed) eyeBaseline = { x: eyeSmoothed.x, y: eyeSmoothed.y };
    setButtons(!!stream);
    say(pointerMode === 'eye' ? 'EYE GAZE MODE · RECALIBRATE CENTER' : 'HEAD POINTER MODE · RECALIBRATE CENTER');
  });
  blinkButton.addEventListener('click', () => {
    blinkConfirm = !blinkConfirm;
    blinkButton.textContent = 'Blink confirm: ' + (blinkConfirm ? 'ON' : 'OFF');
    say(blinkConfirm ? 'BLINK CONFIRM ON · DELIBERATE BLINK TO CLICK' : 'BLINK CONFIRM OFF · POINTER STILL TRACKS');
  });
  dwellButton.addEventListener('click', () => {
    dwellScroll = !dwellScroll;
    dwellButton.textContent = 'Dwell scroll: ' + (dwellScroll ? 'ON' : 'OFF');
    dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0;
    say(dwellScroll ? 'DWELL SCROLL ON · HOLD POINTER AT A PANEL EDGE' : 'DWELL SCROLL OFF');
  });
  pauseButton.addEventListener('click', () => {
    if (!stream) return;
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume tracking' : 'Pause tracking';
    if (paused) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (pointer) pointer.classList.remove('is-active');
      dwellTarget = null; dwellDirection = 0; dwellStartedAt = 0;
      say('TRACKING PAUSED · CAMERA STILL ON');
    } else {
      say('TRACKING RESUMED · RECALIBRATE IF NEEDED', true);
      tick();
    }
  });
  stopButton.addEventListener('click', () => stopCamera());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && stream) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (pointer) pointer.classList.remove('is-active');
    } else if (!document.hidden && stream && !paused) tick();
  });
  window.addEventListener('resize', () => {
    pointerX = Math.min(pointerX, innerWidth - 8);
    pointerY = Math.min(pointerY, innerHeight - 8);
  });
})();