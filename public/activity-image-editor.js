const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);
const LANDING_FILE = path.join(__dirname, 'landing.html');

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return String(value)
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '');
}

function decodeHtml(value) {
  return String(value)
    .replace(/&middot;/g, '·')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getLandingHtml() {
  return fs.readFileSync(LANDING_FILE, 'utf8');
}

function getActivitiesDataText(html) {
  const marker = 'const activitiesData =';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return '';
  
  // Find the start of the array `[`
  const arrayStartIdx = html.indexOf('[', startIdx + marker.length);
  if (arrayStartIdx === -1) return '';
  
  // Count brackets to find the matching closing bracket `]`
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = arrayStartIdx; i < html.length; i++) {
    const char = html[i];
    
    // Handle string escaping to avoid matching brackets inside strings
    if (inString) {
      if (char === stringChar && html[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    } else if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }
    
    if (char === '[') {
      braceCount++;
    } else if (char === ']') {
      braceCount--;
      if (braceCount === 0) {
        return html.substring(arrayStartIdx, i + 1);
      }
    }
  }
  return '';
}

function getActivities() {
  const html = getLandingHtml();
  const arrayText = getActivitiesDataText(html);
  if (!arrayText) return [];
  
  const activitiesData = new Function(`return ${arrayText}`)();
  
  return activitiesData.map((act, index) => {
    const fr = act.fr || {};
    return {
      index: index,
      name: decodeHtml(fr.name || ''),
      imageUrl: decodeHtml(act.img || ''),
      thumbnailUrl: decodeHtml(act.img || ''),
      cost: '',
      category: act.category || 'all',
      meta: decodeHtml(fr.infoMeta || fr.meta || ''),
    };
  });
}

function updateActivityImages(updates) {
  const byIndex = new Map();
  updates.forEach(item => {
    if (Number.isInteger(item.index) && typeof item.imageUrl === 'string') {
      byIndex.set(item.index, item.imageUrl.trim());
    }
  });

  const html = getLandingHtml();
  const arrayText = getActivitiesDataText(html);
  if (!arrayText) return { changed: 0, total: 0 };

  const imgPattern = /([\s{,]\s*img:\s*['"])([^'"]*)(['"])/g;
  let index = -1;
  let changed = 0;

  const newArrayText = arrayText.replace(imgPattern, (full, quoteStart, oldUrl, quoteEnd) => {
    index += 1;
    if (!byIndex.has(index)) return full;

    const nextUrl = byIndex.get(index);
    if (oldUrl === nextUrl) return full;

    changed += 1;
    return quoteStart + nextUrl + quoteEnd;
  });

  if (changed > 0) {
    const nextHtml = html.replace(arrayText, newArrayText);
    fs.writeFileSync(LANDING_FILE, nextHtml, 'utf8');
  }

  return { changed, total: index + 1 };
}

function renderApp() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AQA Activity Image Editor</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #06121f;
      --panel: #0b1b2d;
      --panel2: #10243a;
      --line: rgba(255,255,255,0.1);
      --text: #edf7ff;
      --muted: #8aa6bb;
      --accent: #00d8ff;
      --primary: #0ea5e9;
      --danger: #fb7185;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgba(6,18,31,0.9);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(12px);
    }
    .bar {
      max-width: 1180px;
      margin: 0 auto;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    h1 {
      margin: 0;
      font-size: clamp(20px, 3vw, 30px);
      letter-spacing: 0;
      line-height: 1.15;
    }
    .status {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    button, a.button {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel2);
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      padding: 9px 13px;
      cursor: pointer;
      text-decoration: none;
    }
    button:hover, a.button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    button.primary {
      background: var(--primary);
      border-color: var(--primary);
      color: #fff;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 18px 20px 42px;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .row {
      display: grid;
      grid-template-columns: 132px minmax(170px, 230px) minmax(240px, 1fr);
      gap: 14px;
      align-items: center;
      padding: 12px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    img {
      width: 132px;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      border-radius: 6px;
      background: #020813;
      border: 1px solid var(--line);
      display: block;
    }
    .name {
      font-size: 15px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      margin-top: 4px;
    }
    label {
      display: grid;
      gap: 7px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    input {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(255,255,255,0.06);
      color: var(--text);
      font: inherit;
      font-size: 13px;
      padding: 10px 11px;
      outline: none;
    }
    input:focus {
      border-color: var(--accent);
    }
    .field-actions {
      display: flex;
      gap: 8px;
      margin-top: 9px;
      flex-wrap: wrap;
    }
    .dirty input {
      border-color: var(--accent);
    }
    .error img {
      border-color: var(--danger);
    }
    @media (max-width: 760px) {
      .bar { align-items: flex-start; flex-direction: column; }
      .actions { justify-content: flex-start; }
      .row { grid-template-columns: 94px 1fr; }
      img { width: 94px; }
      label { grid-column: 1 / -1; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div>
        <h1>Activity Image Editor</h1>
        <div class="status" id="status">Loading</div>
      </div>
      <div class="actions">
        <a class="button" href="/landing" target="_blank" rel="noopener">Open landing</a>
        <button type="button" onclick="reloadActivities()">Reload</button>
        <button type="button" class="primary" onclick="saveActivities()">Save changes</button>
      </div>
    </div>
  </header>
  <main>
    <div class="grid" id="grid"></div>
  </main>
  <script>
    let activities = [];
    const originals = new Map();

    const grid = document.getElementById('grid');
    const statusEl = document.getElementById('status');

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    async function reloadActivities() {
      setStatus('Loading');
      const response = await fetch('/api/activities');
      activities = await response.json();
      originals.clear();
      activities.forEach(activity => originals.set(activity.index, activity.imageUrl));
      renderRows();
      setStatus(activities.length + ' activities loaded');
    }

    function renderRows() {
      grid.innerHTML = activities.map(activity => '<section class="row" data-index="' + activity.index + '">' +
        '<img src="' + escapeHtml(activity.imageUrl) + '" alt="">' +
        '<div><div class="name">' + escapeHtml(activity.name) + '</div>' +
        '<div class="meta">' + escapeHtml(activity.category) + ' · ' + escapeHtml(activity.cost) + '</div>' +
        '<div class="meta">' + escapeHtml(activity.meta) + '</div></div>' +
        '<label>Image URL<input value="' + escapeHtml(activity.imageUrl) + '" data-index="' + activity.index + '"></label>' +
      '</section>').join('');

      grid.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', event => {
          const row = event.target.closest('.row');
          const img = row.querySelector('img');
          const activity = activities.find(item => item.index === Number(event.target.dataset.index));
          activity.imageUrl = event.target.value.trim();
          img.src = activity.imageUrl;
          row.classList.toggle('dirty', activity.imageUrl !== originals.get(activity.index));
        });
      });

      grid.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', event => event.target.closest('.row').classList.add('error'));
        img.addEventListener('load', event => event.target.closest('.row').classList.remove('error'));
      });
    }

    async function saveActivities() {
      setStatus('Saving');
      const response = await fetch('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities })
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Save failed');
        return;
      }
      activities.forEach(activity => originals.set(activity.index, activity.imageUrl));
      document.querySelectorAll('.dirty').forEach(row => row.classList.remove('dirty'));
      setStatus(result.changed + ' image URL changes saved');
    }

    reloadActivities().catch(error => setStatus(error.message));
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/') {
      send(res, 200, renderApp(), 'text/html; charset=utf-8');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/landing') {
      send(res, 200, getLandingHtml(), 'text/html; charset=utf-8');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/activities') {
      send(res, 200, JSON.stringify(getActivities()), 'application/json; charset=utf-8');
      return;
    }

    if (req.method === 'PUT' && url.pathname === '/api/activities') {
      const payload = JSON.parse(await readBody(req));
      if (!payload || !Array.isArray(payload.activities)) {
        send(res, 400, JSON.stringify({ error: 'Invalid activity payload' }), 'application/json; charset=utf-8');
        return;
      }
      const result = updateActivityImages(payload.activities);
      send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
      return;
    }

    send(res, 404, 'Not found');
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }), 'application/json; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`Activity image editor running at http://localhost:${PORT}`);
});
