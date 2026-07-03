const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);

function getEventsAstroPath() {
  const candidates = [
    path.join(__dirname, '../../aqasportsdotpro/src/pages/events.astro'),
    'C:/Users/dell/Desktop/aqasportsdotpro/src/pages/events.astro',
    path.join(__dirname, '../src/pages/events.astro'),
    path.join(__dirname, 'events.astro')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return candidates[0];
}

const LANDING_FILE = getEventsAstroPath();

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
  
  const arrayStartIdx = html.indexOf('[', startIdx + marker.length);
  if (arrayStartIdx === -1) return '';
  
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = arrayStartIdx; i < html.length; i++) {
    const char = html[i];
    
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
  
  try {
    return new Function(`return ${arrayText}`)();
  } catch (err) {
    console.error("Error evaluating activitiesData array:", err);
    return [];
  }
}

function saveActivities(newActivities) {
  const html = getLandingHtml();
  const arrayText = getActivitiesDataText(html);
  if (!arrayText) throw new Error('Could not find activitiesData array in events.astro');

  // Format array to look nice inside events.astro
  const newArrayText = JSON.stringify(newActivities, null, 2);
  const nextHtml = html.replace(arrayText, newArrayText);
  fs.writeFileSync(LANDING_FILE, nextHtml, 'utf8');
}

function renderApp() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AQA Activity Editor</title>
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
      --success: #10b981;
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
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    h1 {
      margin: 0;
      font-size: clamp(20px, 3vw, 24px);
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
      transition: all 0.2s ease;
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
    button.primary:hover {
      background: #0284c7;
      border-color: #0284c7;
    }
    button.danger {
      background: var(--danger);
      border-color: var(--danger);
      color: #fff;
    }
    button.danger:hover {
      background: #e11d48;
      border-color: #e11d48;
    }
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 18px 20px 60px;
    }
    .grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .row {
      display: flex;
      gap: 20px;
      padding: 20px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      position: relative;
    }
    .card-side {
      width: 150px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      flex-shrink: 0;
    }
    img.preview-img {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      border-radius: 8px;
      background: #020813;
      border: 1px solid var(--line);
      display: block;
    }
    .fields-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .field-row {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 16px;
    }
    .lang-fields {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .lang-group {
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lang-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--accent);
      border-bottom: 1px solid var(--line);
      padding-bottom: 4px;
      margin-bottom: 2px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    input, select, textarea {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      color: var(--text);
      font: inherit;
      font-size: 12.5px;
      padding: 8px 10px;
      outline: none;
      transition: border-color 0.2s ease;
    }
    textarea {
      resize: vertical;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
    }
    .error img.preview-img {
      border-color: var(--danger);
    }
    
    .add-section {
      background: var(--panel2);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 24px;
      margin-top: 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .add-section h2 {
      margin: 0 0 8px 0;
      font-size: 18px;
      color: var(--accent);
    }
    
    @media (max-width: 900px) {
      .lang-fields { grid-template-columns: 1fr; }
      .row { flex-direction: column; }
      .card-side { width: 100%; flex-direction: row; }
      .card-side img { width: 120px; }
      .card-side button { margin-left: auto; width: auto; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div>
        <h1>Activity Database Editor</h1>
        <div class="status" id="status">Loading...</div>
      </div>
      <div class="actions">
        <a class="button" href="http://localhost:4321/events" target="_blank" rel="noopener">Open Live Site</a>
        <button type="button" onclick="reloadActivities()">Reload</button>
        <button type="button" class="primary" onclick="saveActivities()">Save changes</button>
      </div>
    </div>
  </header>
  <main>
    <div class="grid" id="grid"></div>
    
    <section class="add-section">
      <h2>Add New Activity</h2>
      <div class="fields-side">
        <div class="field-row">
          <label>Category
            <select id="new-category">
              <option value="aquatique">Aquatic & Underwater</option>
              <option value="nature">Nature & Adventure</option>
            </select>
          </label>
          <label>Image URL
            <input type="text" id="new-img" placeholder="https://example.com/image.jpg">
          </label>
        </div>
        
        <div class="lang-fields">
          <div class="lang-group">
            <div class="lang-title">French</div>
            <label>Name <input type="text" id="new-name-fr" placeholder="Initiation..."></label>
            <label>Label <input type="text" id="new-meta-fr" placeholder="Mer &middot; Cours..."></label>
            <label>Description <textarea id="new-desc-fr" rows="3" placeholder="Apprenez les bases..."></textarea></label>
          </div>
          <div class="lang-group">
            <div class="lang-title">English</div>
            <label>Name <input type="text" id="new-name-en" placeholder="Initiation..."></label>
            <label>Label <input type="text" id="new-meta-en" placeholder="Sea &middot; Lessons..."></label>
            <label>Description <textarea id="new-desc-en" rows="3" placeholder="Learn the basics..."></textarea></label>
          </div>
          <div class="lang-group">
            <div class="lang-title">Arabic</div>
            <label>Name <input type="text" id="new-name-ar" placeholder="مبتدئ..."></label>
            <label>Label <input type="text" id="new-meta-ar" placeholder="بحر &middot; دروس..."></label>
            <label>Description <textarea id="new-desc-ar" rows="3" placeholder="تعلم أساسيات..."></textarea></label>
          </div>
        </div>
        
        <div style="text-align: right; margin-top: 8px;">
          <button type="button" class="primary" onclick="addActivity()" style="padding: 10px 20px;">Add Activity</button>
        </div>
      </div>
    </section>
  </main>
  
  <script>
    let activities = [];
    let isDirty = false;

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
      setStatus('Loading...');
      try {
        const response = await fetch('/api/activities');
        activities = await response.json();
        renderRows();
        isDirty = false;
        setStatus(activities.length + ' activities loaded');
      } catch (err) {
        setStatus('Error loading activities: ' + err.message);
      }
    }

    function renderRows() {
      grid.innerHTML = activities.map((activity) => {
        return \`
        <section class="row" id="row-\${activity.id}">
          <div class="card-side">
            <img src="\${escapeHtml(activity.img || '')}" alt="" class="preview-img">
            <button type="button" class="danger" onclick="deleteActivity(\${activity.id})" style="width:100%;">Delete</button>
          </div>
          <div class="fields-side">
            <div class="field-row">
              <label>Category
                <select onchange="updateField(\${activity.id}, 'category', this.value)">
                  <option value="aquatique" \${activity.category === 'aquatique' ? 'selected' : ''}>Aquatic</option>
                  <option value="nature" \${activity.category === 'nature' ? 'selected' : ''}>Nature</option>
                </select>
              </label>
              <label>Image URL
                <input type="text" value="\${escapeHtml(activity.img || '')}" oninput="updateField(\${activity.id}, 'img', this.value)">
              </label>
            </div>
            
            <div class="lang-fields">
              <div class="lang-group">
                <div class="lang-title">French</div>
                <label>Name <input type="text" value="\${escapeHtml(activity.fr?.name || '')}" oninput="updateTranslationField(\${activity.id}, 'fr', 'name', this.value)"></label>
                <label>Label <input type="text" value="\${escapeHtml(activity.fr?.infoMeta || '')}" oninput="updateTranslationField(\${activity.id}, 'fr', 'infoMeta', this.value)"></label>
                <label>Description <textarea rows="2" oninput="updateTranslationField(\${activity.id}, 'fr', 'desc', this.value)">\${escapeHtml(activity.fr?.desc || '')}</textarea></label>
              </div>
              <div class="lang-group">
                <div class="lang-title">English</div>
                <label>Name <input type="text" value="\${escapeHtml(activity.en?.name || '')}" oninput="updateTranslationField(\${activity.id}, 'en', 'name', this.value)"></label>
                <label>Label <input type="text" value="\${escapeHtml(activity.en?.infoMeta || '')}" oninput="updateTranslationField(\${activity.id}, 'en', 'infoMeta', this.value)"></label>
                <label>Description <textarea rows="2" oninput="updateTranslationField(\${activity.id}, 'en', 'desc', this.value)">\${escapeHtml(activity.en?.desc || '')}</textarea></label>
              </div>
              <div class="lang-group">
                <div class="lang-title">Arabic</div>
                <label>Name <input type="text" value="\${escapeHtml(activity.ar?.name || '')}" oninput="updateTranslationField(\${activity.id}, 'ar', 'name', this.value)"></label>
                <label>Label <input type="text" value="\${escapeHtml(activity.ar?.infoMeta || '')}" oninput="updateTranslationField(\${activity.id}, 'ar', 'infoMeta', this.value)"></label>
                <label>Description <textarea rows="2" oninput="updateTranslationField(\${activity.id}, 'ar', 'desc', this.value)">\${escapeHtml(activity.ar?.desc || '')}</textarea></label>
              </div>
            </div>
          </div>
        </section>
        \`;
      }).join('');

      // Add image preview updater & error handlers
      grid.querySelectorAll('.row').forEach(row => {
        const img = row.querySelector('img.preview-img');
        if (img) {
          img.addEventListener('error', () => row.classList.add('error'));
          img.addEventListener('load', () => row.classList.remove('error'));
        }
      });
    }

    function markDirty() {
      isDirty = true;
      setStatus('Changes pending - click Save changes');
    }

    function updateField(id, field, value) {
      const activity = activities.find(a => a.id === id);
      if (activity) {
        activity[field] = value;
        if (field === 'img') {
          const row = document.getElementById('row-' + id);
          if (row) {
            const img = row.querySelector('img.preview-img');
            if (img) img.src = value;
          }
        }
        markDirty();
      }
    }

    function updateTranslationField(id, lang, field, value) {
      const activity = activities.find(a => a.id === id);
      if (activity) {
        if (!activity[lang]) activity[lang] = {};
        activity[lang][field] = value;
        
        // Parallel meta setting (sync meta with infoMeta)
        if (field === 'infoMeta') {
          activity[lang]['meta'] = value; 
        }
        markDirty();
      }
    }

    function deleteActivity(id) {
      if (!confirm('Are you sure you want to delete this activity?')) return;
      activities = activities.filter(a => a.id !== id);
      renderRows();
      markDirty();
    }

    function addActivity() {
      const category = document.getElementById('new-category').value;
      const img = document.getElementById('new-img').value.trim();
      
      const nameFr = document.getElementById('new-name-fr').value.trim();
      const metaFr = document.getElementById('new-meta-fr').value.trim();
      const descFr = document.getElementById('new-desc-fr').value.trim();
      
      const nameEn = document.getElementById('new-name-en').value.trim();
      const metaEn = document.getElementById('new-meta-en').value.trim();
      const descEn = document.getElementById('new-desc-en').value.trim();
      
      const nameAr = document.getElementById('new-name-ar').value.trim();
      const metaAr = document.getElementById('new-meta-ar').value.trim();
      const descAr = document.getElementById('new-desc-ar').value.trim();

      if (!nameFr && !nameEn && !nameAr) {
        alert('Please fill in at least one name.');
        return;
      }

      // Generate ID
      const nextId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1;
      
      // Calculate delay based on index
      const delay = 'd' + ((activities.length % 4) + 1);

      const newActivity = {
        id: nextId,
        category,
        delay,
        img: img || 'https://i.ibb.co/35cDmNw5/Gemini-Generated-Image-rk89wqrk89wqrk89.png',
        fr: { name: nameFr, desc: descFr, meta: metaFr, infoMeta: metaFr },
        en: { name: nameEn, desc: descEn, meta: metaEn, infoMeta: metaEn },
        ar: { name: nameAr, desc: descAr, meta: metaAr, infoMeta: metaAr }
      };

      activities.push(newActivity);
      renderRows();
      markDirty();
      
      // Clear Form Fields
      document.getElementById('new-img').value = '';
      document.getElementById('new-name-fr').value = '';
      document.getElementById('new-meta-fr').value = '';
      document.getElementById('new-desc-fr').value = '';
      document.getElementById('new-name-en').value = '';
      document.getElementById('new-meta-en').value = '';
      document.getElementById('new-desc-en').value = '';
      document.getElementById('new-name-ar').value = '';
      document.getElementById('new-meta-ar').value = '';
      document.getElementById('new-desc-ar').value = '';
      
      // Scroll to the bottom row
      setTimeout(() => {
        const newRow = document.getElementById('row-' + nextId);
        if (newRow) newRow.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    async function saveActivities() {
      setStatus('Saving...');
      try {
        const response = await fetch('/api/activities', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities })
        });
        
        if (response.ok) {
          isDirty = false;
          setStatus('All changes saved successfully');
        } else {
          const result = await response.json();
          setStatus('Save failed: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        setStatus('Network error saving changes: ' + err.message);
      }
    }

    reloadActivities().catch(error => setStatus(error.message));
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && (url.pathname.startsWith('/image/') || url.pathname.startsWith('/public/image/'))) {
      const cleanPath = url.pathname.replace(/^\/public/, '');
      let filePath = path.join(__dirname, '..', cleanPath);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, cleanPath);
      }
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === '.png') mime = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.svg') mime = 'image/svg+xml';
        else if (ext === '.gif') mime = 'image/gif';
        
        res.writeHead(200, { 'Content-Type': mime });
        res.end(fs.readFileSync(filePath));
        return;
      }
    }

    if (req.method === 'GET' && url.pathname === '/') {
      send(res, 200, renderApp(), 'text/html; charset=utf-8');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/landing') {
      res.writeHead(302, { 'Location': 'http://localhost:4321/events' });
      res.end();
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
      saveActivities(payload.activities);
      send(res, 200, JSON.stringify({ success: true }), 'application/json; charset=utf-8');
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
