(() => {
  'use strict';

  const STORAGE_KEY = 'cosmosim.openrouter.apiKey.v1';
  const MODEL_KEY = 'cosmosim.openrouter.model.v1';
  const API_BASE_KEY = 'cosmosim.openrouter.backendUrl.v1';
  const DEFAULT_API_BASE = 'https://cosmosim-ai.onrender.com';
  const $ = (selector, root = document) => root.querySelector(selector);

  const style = document.createElement('style');
  style.textContent = `
    #cosmosimAiSection{border-top:1px solid #303d61;margin-top:15px;padding-top:13px}
    #cosmosimAiSection h3{font-size:13px;letter-spacing:.7px;margin:0 0 7px;color:#dbe4ff}
    #cosmosimAiSection .ai-copy{font-size:10px;line-height:1.5;color:#aab8db;margin:5px 0 9px}
    #cosmosimAiSection label{display:block;font-size:11px;color:#bdc7e5;margin:8px 0 4px}
    #cosmosimAiSection input,#cosmosimAiSection textarea{display:block;width:100%;min-width:0;background:#080b16;color:#fff;border:1px solid #414968;border-radius:9px;padding:10px;font:12px/1.4 system-ui,Arial}
    #cosmosimAiSection textarea{min-height:75px;resize:vertical}
    #cosmosimAiSection .ai-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
    #cosmosimAiSection .ai-actions button{flex:1 1 42%;font-size:10px;padding:9px 7px;background:#222e4c;border:1px solid #43557e}
    #cosmosimAiSection .ai-actions button.ai-primary{background:linear-gradient(135deg,#6558ff,#a348e9);border-color:#8c7dff}
    #cosmosimAiSection .ai-actions button:disabled{opacity:.5;cursor:wait}
    #cosmosimAiSection .ai-status{font:10px/1.5 ui-monospace,monospace;color:#84e8ff;background:#080d1b;border:1px solid #303d61;border-radius:8px;padding:8px;margin-top:9px;white-space:pre-wrap;overflow-wrap:anywhere}
    #cosmosimAiSection .ai-answer{font-size:12px;line-height:1.6;color:#e5eaff;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}
    #cosmosimAiSection .ai-answer:empty{display:none}
  `;
  document.head.appendChild(style);

  function init() {
    const dialog = $('#cosmosimTrackingDialog');
    if (!dialog || $('#cosmosimAiSection')) return false;

    const section = document.createElement('section');
    section.id = 'cosmosimAiSection';
    section.innerHTML = `
      <h3>✦ COSMOSIM SPACE AI</h3>
      <p class="ai-copy">Connect your own OpenRouter key to ask questions about planets, black holes, astrophysics, missions, and the universe. The key is stored only in this browser's local storage and sent to the configured Render proxy when you test or ask a question.</p>
      <label for="cosmosimAiKey">OpenRouter API key</label>
      <input id="cosmosimAiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your OpenRouter key" aria-describedby="cosmosimAiSecurityNote">
      <label for="cosmosimAiModel">Model (optional)</label>
      <input id="cosmosimAiModel" type="text" autocomplete="off" spellcheck="false" placeholder="openrouter/auto">
      <label for="cosmosimAiBackend">Render backend URL</label>
      <input id="cosmosimAiBackend" type="url" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://your-service.onrender.com">
      <div class="ai-actions">
        <button type="button" class="ai-primary" id="cosmosimAiSave">Save locally</button>
        <button type="button" id="cosmosimAiTest">Test key</button>
        <button type="button" id="cosmosimAiClear">Forget saved key</button>
      </div>
      <div class="ai-status" id="cosmosimAiStatus" role="status" aria-live="polite">Not connected · enter your key and backend URL.</div>
      <p class="ai-copy" id="cosmosimAiSecurityNote">Security: a key saved in browser storage is not encrypted and is accessible to this browser profile. Do not use a shared device. Never put your key in GitHub or a public Render environment variable. OpenRouter usage may incur costs depending on your account/model.</p>
      <label for="cosmosimAiQuestion">Ask a space question</label>
      <textarea id="cosmosimAiQuestion" maxlength="4000" placeholder="Why do black holes have an event horizon?"></textarea>
      <div class="ai-actions"><button type="button" class="ai-primary" id="cosmosimAiAsk">Ask COSMOSIM AI ↗</button><button type="button" id="cosmosimAiClearAnswer">Clear answer</button></div>
      <div class="ai-answer" id="cosmosimAiAnswer" aria-live="polite"></div>
    `;

    // Add AI controls after existing tracking controls without replacing them.
    const note = $('.ct-note', dialog);
    (note || dialog.lastElementChild || dialog).insertAdjacentElement('afterend', section);

    const keyInput = $('#cosmosimAiKey', section);
    const modelInput = $('#cosmosimAiModel', section);
    const backendInput = $('#cosmosimAiBackend', section);
    const status = $('#cosmosimAiStatus', section);
    const answer = $('#cosmosimAiAnswer', section);
    const askInput = $('#cosmosimAiQuestion', section);
    const saveButton = $('#cosmosimAiSave', section);
    const testButton = $('#cosmosimAiTest', section);
    const askButton = $('#cosmosimAiAsk', section);
    const clearButton = $('#cosmosimAiClear', section);
    let busy = false;

    function saved(key) {
      try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
    }
    function setStatus(message, good = false) {
      status.textContent = message;
      status.style.color = good ? '#8fffc9' : '#84e8ff';
    }
    function currentKey() { return keyInput.value.trim() || saved(STORAGE_KEY); }
    function baseUrl() {
      const raw = backendInput.value.trim().replace(/\/+$/, '');
      if (!raw) throw new Error('Enter your deployed Render backend URL first.');
      let parsed;
      try { parsed = new URL(raw); } catch (_) { throw new Error('The backend URL is not valid.'); }
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') throw new Error('Use an HTTPS Render URL.');
      return parsed.origin;
    }
    function persistSettings() {
      try {
        const key = keyInput.value.trim();
        if (key) localStorage.setItem(STORAGE_KEY, key);
        else localStorage.removeItem(STORAGE_KEY);
        const model = modelInput.value.trim();
        if (model) localStorage.setItem(MODEL_KEY, model);
        else localStorage.removeItem(MODEL_KEY);
        const base = backendInput.value.trim().replace(/\/+$/, '');
        if (base) localStorage.setItem(API_BASE_KEY, base);
        else localStorage.removeItem(API_BASE_KEY);
        return true;
      } catch (_) {
        setStatus('Could not save settings in browser storage. Check browser privacy/storage settings.');
        return false;
      }
    }
    function restore() {
      keyInput.value = saved(STORAGE_KEY);
      modelInput.value = saved(MODEL_KEY) || 'openrouter/auto';
      backendInput.value = saved(API_BASE_KEY) || DEFAULT_API_BASE;
      if (saved(STORAGE_KEY)) setStatus('Key found in this browser · press Test key to verify it.');
    }
    async function request(path, body) {
      const base = baseUrl();
      const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout ? AbortSignal.timeout(50000) : undefined
      });
      let data = {};
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(data.detail || ('Backend request failed (' + response.status + ').'));
      return data;
    }
    function setBusy(value) {
      busy = value;
      [saveButton, testButton, askButton, clearButton].forEach(button => button.disabled = value);
    }
    saveButton.addEventListener('click', () => {
      if (!keyInput.value.trim()) { setStatus('Paste an OpenRouter key before saving.'); keyInput.focus(); return; }
      if (!backendInput.value.trim()) { setStatus('Add your Render backend URL before saving.'); backendInput.focus(); return; }
      try { baseUrl(); } catch (error) { setStatus(error.message); return; }
      if (persistSettings()) setStatus('Settings saved locally in this browser. Now test the key.', true);
    });
    testButton.addEventListener('click', async () => {
      if (busy) return;
      const key = currentKey();
      if (!key) { setStatus('Enter your OpenRouter key first.'); keyInput.focus(); return; }
      setBusy(true); setStatus('Testing connection with OpenRouter…');
      try {
        const data = await request('/api/openrouter/test', { api_key: key });
        persistSettings();
        setStatus('✓ Connection successful. ' + (data.message || 'OpenRouter is responding.'), true);
      } catch (error) {
        setStatus('Connection failed: ' + error.message);
      } finally { setBusy(false); }
    });
    askButton.addEventListener('click', async () => {
      if (busy) return;
      const key = currentKey();
      const question = askInput.value.trim();
      if (!key) { setStatus('Enter your OpenRouter key first.'); keyInput.focus(); return; }
      if (question.length < 2) { setStatus('Type a space question first.'); askInput.focus(); return; }
      setBusy(true); answer.textContent = ''; setStatus('COSMOSIM AI is thinking…');
      try {
        const data = await request('/api/openrouter/ask', {
          api_key: key,
          question,
          model: modelInput.value.trim() || 'openrouter/auto'
        });
        persistSettings();
        answer.textContent = data.answer || 'No answer returned.';
        setStatus('✓ Answer received · ' + (data.model || 'OpenRouter model'), true);
      } catch (error) {
        setStatus('Could not get an answer: ' + error.message);
      } finally { setBusy(false); }
    });
    clearButton.addEventListener('click', () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        keyInput.value = '';
        setStatus('Saved key removed from this browser. The key is not revoked at OpenRouter.');
      } catch (_) { setStatus('Browser storage could not be cleared.'); }
    });
    $('#cosmosimAiClearAnswer', section).addEventListener('click', () => {
      answer.textContent = '';
      setStatus('Answer cleared.');
    });
    keyInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') testButton.click();
    });
    askInput.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') askButton.click();
    });
    restore();
    return true;
  }

  function waitForDialog() {
    if (init()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (init() || tries > 100) clearInterval(timer);
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForDialog, { once: true });
  else waitForDialog();
})();