/* ======= Recommend — 楽曲レコメンド ======= */

const AXES = [
  { key: 'cute',       label: 'キュート',   color: '#f06c9c' },
  { key: 'cool',       label: 'クール',     color: '#6cacf0' },
  { key: 'emo',        label: 'エモ',       color: '#b06cf0' },
  { key: 'childlike',  label: '子供心',     color: '#f0d860' },
  { key: 'happy',      label: 'ハッピー度', color: '#6cf0b0' },
  { key: 'party',      label: 'お祭り感',   color: '#fcb040' },
  { key: 'band',       label: 'バンド',     color: '#d08040' },
  { key: 'speed',      label: '疾走感',     color: '#f06c6c' },
  { key: 'complexity', label: '複雑度',     color: '#a080f0' },
];

let allSongs = [];

/* ---- Cosine similarity ---- */
function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const ax of AXES) {
    const va = a.scores[ax.key] || 0;
    const vb = b.scores[ax.key] || 0;
    dot  += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function findSimilar(song, n = 5) {
  return allSongs
    .filter(s => s.id !== song.id && s.scores)
    .map(s => ({ song: s, sim: cosineSim(song, s) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n);
}

/* ---- Radar drawing ---- */
function drawRadar(canvas, songs, colors, size = 400) {
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, size, size);

  // Grid
  for (let ring = 1; ring <= 5; ring++) {
    const rr = r * ring / 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = startAngle + i * angleStep;
      const x = cx + rr * Math.cos(a);
      const y = cy + rr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.stroke();
  }

  // Axis lines + labels
  const labelPad = size * 0.46;
  ctx.font = `600 ${Math.round(size * 0.03)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.stroke();
    ctx.fillStyle = AXES[i].color;
    ctx.fillText(AXES[i].label, cx + labelPad * Math.cos(a), cy + labelPad * Math.sin(a));
  }

  // Data polygons
  songs.forEach((song, si) => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = startAngle + i * angleStep;
      const val = (song.scores[AXES[i].key] || 0) / 10;
      const x = cx + r * val * Math.cos(a);
      const y = cy + r * val * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    const c = colors[si];
    ctx.fillStyle = c + '30';
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/* ---- Display ---- */
function showResult(songId) {
  const song = allSongs.find(s => s.id === songId);
  if (!song || !song.scores) return;

  document.getElementById('recEmpty').style.display = 'none';
  document.getElementById('recResult').style.display = '';

  // Source card
  const src = document.getElementById('recSource');
  const thumbHTML = song.thumbnail_url
    ? `<div class="rec-source-thumb"><img src="${song.thumbnail_url}" alt="${song.title}" loading="lazy"></div>`
    : '';
  src.innerHTML = `
    ${thumbHTML}
    <div class="rec-source-info">
      <div class="rec-source-title">${song.title}</div>
      <div class="rec-source-meta">
        ${song.release_date ? `<span>${song.release_date}</span>` : ''}
        ${song.key ? `<span>Key: ${song.key}</span>` : ''}
        ${song.bpm ? `<span>BPM ${song.bpm}</span>` : ''}
        ${song.composer ? `<span>♪ ${song.composer}</span>` : ''}
      </div>
      ${song.summary ? `<div style="font-size:.78rem;color:var(--muted);line-height:1.6">${song.summary}</div>` : ''}
    </div>
    <div class="rec-source-radar"><canvas id="srcRadar"></canvas></div>
  `;
  drawRadar(document.getElementById('srcRadar'), [song], ['#7c6cf0'], 400);

  // Similar songs
  const similar = findSimilar(song);
  const list = document.getElementById('recList');
  list.innerHTML = '';

  similar.forEach((item, idx) => {
    const s = item.song;
    const pct = (item.sim * 100).toFixed(1);
    const card = document.createElement('div');
    card.className = 'rec-card';

    const rankClass = idx < 3 ? ` rank-${idx + 1}` : '';
    const thumbHTML = s.thumbnail_url
      ? `<div class="rec-card-thumb"><img src="${s.thumbnail_url}" alt="${s.title}" loading="lazy"></div>`
      : '';

    // Axis comparison bars
    const axesHTML = AXES.map(ax => {
      const srcVal = song.scores[ax.key] || 0;
      const tgtVal = s.scores[ax.key] || 0;
      const diff = Math.abs(srcVal - tgtVal);
      const closeness = Math.max(0, 1 - diff / 10);
      const barPct = (closeness * 100).toFixed(0);
      return `<div class="rec-axis-row">
        <span class="rec-axis-label">${ax.label}</span>
        <div class="rec-axis-bar-bg"><div class="rec-axis-bar" style="width:${barPct}%;background:${ax.color}"></div></div>
        <span class="rec-axis-vals">${srcVal}→${tgtVal}</span>
      </div>`;
    }).join('');

    const canvasId = `recRadar${idx}`;

    card.innerHTML = `
      <div class="rec-rank${rankClass}">${idx + 1}</div>
      ${thumbHTML}
      <div class="rec-card-body">
        <div class="rec-card-title">${s.title}</div>
        <div class="rec-card-meta">
          ${s.release_date ? `<span>${s.release_date}</span>` : ''}
          ${s.key ? `<span>Key: ${s.key}</span>` : ''}
          ${s.bpm ? `<span>BPM ${s.bpm}</span>` : ''}
          ${s.composer ? `<span>♪ ${s.composer}</span>` : ''}
        </div>
        <div class="rec-sim-badge">類似度 <span class="rec-sim-pct">${pct}%</span></div>
        <div class="rec-axes">${axesHTML}</div>
      </div>
      <div class="rec-card-radar"><canvas id="${canvasId}"></canvas></div>
    `;
    list.appendChild(card);

    // Draw overlay radar: source (dim) + target
    drawRadar(document.getElementById(canvasId), [song, s], ['rgba(124,108,240,.3)', AXES[idx % AXES.length].color], 300);
  });
}

/* ---- Init ---- */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs.filter(s => s.scores);
    const sel = document.getElementById('songSelect');

    // Sort alphabetically for the dropdown
    const sorted = [...allSongs].sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    sorted.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.title;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
      if (sel.value) showResult(sel.value);
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
      const idx = Math.floor(Math.random() * allSongs.length);
      sel.value = allSongs[idx].id;
      showResult(allSongs[idx].id);
    });

    // Handle URL hash
    if (location.hash) {
      const id = location.hash.slice(1);
      if (allSongs.some(s => s.id === id)) {
        sel.value = id;
        showResult(id);
      }
    }
  })
  .catch(err => console.error('Failed to load songs.json', err));
