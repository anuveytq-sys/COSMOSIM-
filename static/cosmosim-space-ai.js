(() => {
  'use strict';

  const STORAGE_KEY = 'cosmosim.openrouter.apiKey.v1';
  const MODEL_KEY = 'cosmosim.openrouter.model.v1';
  const API_BASE_KEY = 'cosmosim.openrouter.backendUrl.v1';
  const DEFAULT_API_BASE = 'https://cosmosim-ai.onrender.com';
  const $ = (selector, root = document) => root.querySelector(selector);

  const style = document.createElement('style');
  style.textContent = `
    #cosmosimAiDialog{position:fixed;z-index:10020;inset:0;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(1,4,14,.82);backdrop-filter:blur(8px);color:#eef2ff;font:13px/1.5 system-ui,Arial}
    #cosmosimAiDialog[hidden]{display:none!important}
    #cosmosimAiDialog .ai-window{width:min(520px,100%);max-height:calc(100dvh - 28px);overflow:auto;border:1px solid #7b6cff;border-radius:17px;background:linear-gradient(145deg,#0a1125,#050914);box-shadow:0 18px 70px #000c}
    #cosmosimAiDialog .ai-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 17px;background:#0a1125f5;border-bottom:1px solid #303d61}
    #cosmosimAiDialog .ai-head h2{font-size:15px;letter-spacing:.8px;margin:0;color:#e6e2ff}
    #cosmosimAiDialog .ai-close{min-height:34px;padding:5px 11px;background:#222e4c;border:1px solid #43557e;border-radius:8px;color:#fff}
    #cosmosimAiSection{padding:15px 17px 18px}
    #cosmosimAiSection h3{font-size:13px;letter-spacing:.7px;margin:0 0 7px;color:#dbe4ff}
    #cosmosimAiSection .ai-copy{font-size:10px;line-height:1.5;color:#aab8db;margin:5px 0 9px}
    #cosmosimAiSection label{display:block;font-size:11px;color:#bdc7e5;margin:10px 0 4px}
    #cosmosimAiSection input,#cosmosimAiSection textarea{display:block;box-sizing:border-box;width:100%;min-width:0;background:#080b16;color:#fff;border:1px solid #414968;border-radius:9px;padding:10px;font:12px/1.4 system-ui,Arial}
    #cosmosimAiSection textarea{min-height:90px;resize:vertical}
    #cosmosimAiSection .ai-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
    #cosmosimAiSection .ai-actions button{flex:1 1 40%;min-height:37px;font-size:11px;padding:9px 7px;background:#222e4c;border:1px solid #43557e;border-radius:8px;color:#fff}
    #cosmosimAiSection .ai-actions button.ai-primary{background:linear-gradient(135deg,#6558ff,#a348e9);border-color:#8c7dff}
    #cosmosimAiSection .ai-actions button:disabled{opacity:.5;cursor:wait}
    #cosmosimAiSection .ai-status{font:10px/1.5 ui-monospace,monospace;color:#84e8ff;background:#080d1b;border:1px solid #303d61;border-radius:8px;padding:9px;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere}
    #cosmosimAiSection .ai-answer{font-size:12px;line-height:1.6;color:#e5eaff;white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;margin-top:10px}
    #cosmosimAiSection .ai-answer:empty{display:none}
    @media(max-width:520px){#cosmosimAiDialog{padding:8px}#cosmosimAiDialog .ai-window{max-height:calc(100dvh - 16px)}#cosmosimAiSection{padding:13px}}
  `;
  document.head.appendChild(style);

  function init() {
    let dialog = $('#cosmosimAiDialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'cosmosimAiDialog';
      dialog.hidden = true;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'cosmosimAiDialogTitle');
      dialog.innerHTML = `
        <div class="ai-window">
          <div class="ai-head"><h2 id="cosmosimAiDialogTitle">✦ COSMOSIM SPACE AI</h2><button type="button" class="ai-close" id="cosmosimAiClose" aria-label="Close Space AI">✕ Close</button></div>
          <section id="cosmosimAiSection" aria-label="OpenRouter AI settings and space assistant">
            <h3>OPENROUTER CONNECTION</h3>
            <p class="ai-copy">Use your own OpenRouter API key. The key is stored in this browser only and sent to your configured backend when you test or ask a question.</p>
            <label for="cosmosimAiKey">OpenRouter API key</label>
            <input id="cosmosimAiKey" type="password" autocomplete="off" spellcheck="false" placeholder="Paste your OpenRouter API key" aria-describedby="cosmosimAiSecurityNote">
            <label for="cosmosimAiModel">Model ID</label>
            <input id="cosmosimAiModel" type="text" autocomplete="off" spellcheck="false" placeholder="openrouter/auto">
            <p class="ai-copy">You can use <b>openrouter/auto</b> or enter a model ID supported by your OpenRouter account.</p>
            <label for="cosmosimAiBackend">Render backend URL</label>
            <input id="cosmosimAiBackend" type="url" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://your-service.onrender.com">
            <div class="ai-actions">
              <button type="button" class="ai-primary" id="cosmosimAiSave">Save settings locally</button>
              <button type="button" id="cosmosimAiTest">Test API connection</button>
              <button type="button" id="cosmosimAiClear">Forget saved key</button>
            </div>
            <div class="ai-status" id="cosmosimAiStatus" role="status" aria-live="polite">Not connected · enter your key and backend URL.</div>
            <p class="ai-copy" id="cosmosimAiSecurityNote">Security: browser storage is not encrypted. Avoid shared devices and never commit your key to GitHub. OpenRouter usage may incur costs.</p>
            <hr style="border:0;border-top:1px solid #303d61;margin:17px 0">
            <h3>ASK COSMOSIM SPACE AI</h3>
            <label for="cosmosimAiQuestion">Your space question</label>
            <textarea id="cosmosimAiQuestion" maxlength="4000" placeholder="Why do black holes have an event horizon?"></textarea>
            <div class="ai-actions"><button type="button" class="ai-primary" id="cosmosimAiAsk">Ask COSMOSIM AI ↗</button><button type="button" id="cosmosimAiClearAnswer">Clear answer</button></div>
            <div class="ai-answer" id="cosmosimAiAnswer" aria-live="polite"></div>
          </section>
        </div>`;
      document.body.appendChild(dialog);
    }
    if (dialog.dataset.initialized === 'true') return true;
    dialog.dataset.initialized = 'true';

    const section = $('#cosmosimAiSection', dialog);
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

    function saved(key) { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } }
    function setStatus(message, good = false) {
      status.textContent = message;
      status.style.color = good ? '#8fffc9' : '#84e8ff';
    }
    function currentKey() { return keyInput.value.trim() || saved(STORAGE_KEY); }
    function baseUrl() {
      const raw = backendInput.value.trim().replace(/\\/+$/, '');
      if (!raw) throw new Error('Enter your deployed Render backend URL first.');
      let parsed;
      try { parsed = new URL(raw); } catch (_) { throw new Error('The backend URL is not a valid URL.'); }
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
        const base = backendInput.value.trim().replace(/\\/+$/, '');
        if (base) localStorage.setItem(API_BASE_KEY, base);
        else localStorage.removeItem(API_BASE_KEY);
        return true;
      } catch (_) { setStatus('Could not save settings in browser storage. Check browser privacy settings.'); return false; }
    }
    function restore() {
      keyInput.value = saved(STORAGE_KEY);
      modelInput.value = saved(MODEL_KEY) || 'openrouter/auto';
      backendInput.value = saved(API_BASE_KEY) || DEFAULT_API_BASE;
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
      if (!keyInput.value.trim()) { setStatus('Paste an OpenRouter API key before saving.'); keyInput.focus(); return; }
      if (!backendInput.value.trim()) { setStatus('Enter your deployed Render backend URL before saving.'); backendInput.focus(); return; }
      try { baseUrl(); } catch (error) { setStatus(error.message); return; }
      if (persistSettings()) setStatus('Settings saved in this browser. Test the connection next.', true);
    });
    testButton.addEventListener('click', async () => {
      if (busy) return;
      const key = currentKey();
      if (!key) { setStatus('Enter your OpenRouter API key first.'); keyInput.focus(); return; }
      setBusy(true); setStatus('Checking backend and OpenRouter connection…');
      try {
        const data = await request('/api/openrouter/test', { api_key: key });
        persistSettings();
        setStatus('✓ OpenRouter connection successful. ' + (data.message || ''), true);
      } catch (error) {
        setStatus('Connection failed: ' + error.message + (error instanceof TypeError ? ' Check the Render URL, service status, and CORS settings.' : ''));
      } finally { setBusy(false); }
    });
    askButton.addEventListener('click', async () => {
      if (busy) return;
      const key = currentKey();
      const question = askInput.value.trim();
      if (!key) { setStatus('Enter your OpenRouter API key first.'); keyInput.focus(); return; }
      if (question.length < 2) { setStatus('Type a space question first.'); askInput.focus(); return; }
      setBusy(true); answer.textContent = ''; setStatus('Sending your question to COSMOSIM Space AI…');
      try {
        const data = await request('/api/openrouter/ask', {
          api_key: key, question, model: modelInput.value.trim() || 'openrouter/auto'
        });
        persistSettings();
        answer.textContent = data.answer || 'No answer returned.';
        setStatus('✓ Answer received · ' + (data.model || modelInput.value.trim() || 'OpenRouter model'), true);
      } catch (error) {
        setStatus('Could not get an answer: ' + error.message + (error instanceof TypeError ? ' Check the Render URL, service status, and CORS settings.' : ''));
      } finally { setBusy(false); }
    });
    clearButton.addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); keyInput.value = ''; setStatus('Saved key removed from this browser. This does not revoke it at OpenRouter.'); }
      catch (_) { setStatus('Browser storage could not be cleared.'); }
    });
    $('#cosmosimAiClearAnswer', section).addEventListener('click', () => { answer.textContent = ''; setStatus('Answer cleared.'); });
    $('#cosmosimAiClose', dialog).addEventListener('click', () => { dialog.hidden = true; });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.hidden = true; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !dialog.hidden) dialog.hidden = true; });
    document.addEventListener('cosmosim:open-space-ai', () => {
      dialog.hidden = false;
      keyInput.focus({ preventScroll: true });
    });
    const quickButton = $('#cosmosimAiQuickButton');
    if (quickButton) quickButton.addEventListener('click', () => { dialog.hidden = false; keyInput.focus({ preventScroll: true }); });
    restore();
    return true;
  }

  function start() {
    if (init()) return;
    let tries = 0;
    const timer = setInterval(() => { tries += 1; if (init() || tries > 100) clearInterval(timer); }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();