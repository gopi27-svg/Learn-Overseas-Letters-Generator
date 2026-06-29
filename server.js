/***********************************************************
 * Letter Generator - Render Server
 * - Serves the frontend (public/index.html) directly at your
 *   Render URL, so you open the portal from the Render URL.
 * - Proxies API calls to the Apps Script Web App (avoids CORS
 *   issues, and adds a clear timeout instead of hanging forever).
 ***********************************************************/
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ⚠️ PASTE your Apps Script Web App URL here (must end in /exec)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzVyNuMHPU5K1ruUsuw36vfPI2xIkwToMH79_8R4dU6ohDOaZaXLiNiOugS6YePeqvl/exec';

const TIMEOUT_MS = 110000; // 110s — generous for Drive/Docs operations

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, appsScriptConfigured: !APPS_SCRIPT_URL.startsWith('PASTE_') });
});

// Single generic passthrough — body must include "action"
app.post('/api', async (req, res) => {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PASTE_') === 0) {
    return res.status(500).json({ success: false, error: 'Server misconfigured: APPS_SCRIPT_URL is not set in server.js.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Non-JSON response from Apps Script:', text.slice(0, 800));
      return res.status(502).json({
        success: false,
        error: 'Apps Script returned an unexpected (non-JSON) response. This usually means the Web App deployment URL is wrong, or "Who has access" is not set to Anyone. Check the Apps Script deployment settings.'
      });
    }

    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Apps Script request timed out');
      return res.status(504).json({ success: false, error: 'The request to Apps Script timed out after ' + (TIMEOUT_MS / 1000) + 's. If this is the first request in a while, Render free tier may be waking up — please try again.' });
    }
    console.error('Proxy error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    clearTimeout(timeoutId);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Letter Generator server listening on port ${PORT}`));
