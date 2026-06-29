/***********************************************************
 * Letter Generator - Render Proxy Server
 * Forwards requests from the GitHub Pages frontend to the
 * Apps Script Web App (avoids CORS issues with Apps Script).
 ***********************************************************/
const express = require('express');
const cors = require('cors');

const app = express();

// ⚠️ PASTE your Apps Script Web App URL here (ends in /exec)
const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/', (req, res) => {
  res.send('Letter Generator proxy is running.');
});

app.post('/generate', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', ...req.body })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Non-JSON response from Apps Script:', text.slice(0, 500));
      return res.status(502).json({ success: false, error: 'Apps Script returned an unexpected response. Check the deployment URL/permissions.' });
    }

    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Letter Generator proxy listening on port ${PORT}`));
