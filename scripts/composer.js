/* ====== Config ====== */
const AXES = [
  { key: 'cute',       label: 'キュート',  color: '#f06c9c' },
  { key: 'cool',       label: 'クール',    color: '#6cacf0' },
  { key: 'emo',        label: 'エモ',      color: '#b06cf0' },
  { key: 'childlike',  label: '子供心',    color: '#f0d860' },
  { key: 'happy',      label: 'ハッピー',  color: '#6cf0b0' },
  { key: 'party',      label: 'お祭り感',  color: '#fcb040' },
  { key: 'band',       label: 'バンド',    color: '#d08040' },
  { key: 'speed',      label: '疾走感',    color: '#f06c6c' },
  { key: 'complexity', label: '複雑度',    color: '#a080f0' },
];
const MAX_VAL = 10;

/* Composer visual palette — stroke colors chosen to be distinguishable on dark bg */
const COMPOSER_PALETTE = [
  { stroke: '#b080f0', fill: 'rgba(176,128,240,.2)' },  // NNBS. — purple
  { stroke: '#50c8e8', fill: 'rgba(80,200,232,.2)' },   // AILI — teal
  { stroke: '#f0a040', fill: 'rgba(240,160,64,.2)' },   // しえりーほ — orange
  { stroke: '#60d880', fill: 'rgba(96,216,128,.2)' },   // 山崎あおい — green
  { stroke: '#f06060', fill: 'rgba(240,96,96,.2)' },    // 阿久津健太郎 — red
  { stroke: '#f080a8', fill: 'rgba(240,128,168,.2)' },  // 古橋勇紀 — rose
  { stroke: '#d8c050', fill: 'rgba(216,192,80,.2)' },   // 早川博隆 — gold
  { stroke: '#50d8c0', fill: 'rgba(80,216,192,.2)' },   // 徳田光希 — cyan
];

let composerData = [];  // [{ name, songs, avg, bpms, palette }]
let visible = {};       // name → bool

/* ====== Build data ====== */
function buildComposerData(songs) {
  const map = {};
  songs.forEach(s => {
    if (!s.scores || !s.composer) return;
    if (!map[s.composer]) map[s.composer] = [];
    map[s.composer].push(s);
  });

  // Sort by song count desc then name
  const sorted = Object.entries(map).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ja'));

  composerData = sorted.map(([name, songs], i) => {
    const avg = {};
    AXES.forEach(ax => {
      const vals = songs.map(s => s.scores[ax.key]).filter(v => v != null);
      avg[ax.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const bpms = songs.map(s => s.bpm).filter(Boolean);
    return {
      name,
      songs,
      avg,
      bpmMin: Math.min(...bpms),
      bpmMax: Math.max(...bpms),
      bpmAvg: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0,
      palette: COMPOSER_PALETTE[i % COMPOSER_PALETTE.length],
    };
  });

  composerData.forEach(c => { visible[c.name] = true; });
}

/* ====== Radar drawing helper ====== */
function drawRadar(ctx, W, H, datasets, options = {}) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - (options.labelMargin || 70);
  const n = AXES.length;

  ctx.clearRect(0, 0, W, H);

  // Grid
  const levels = [2, 4, 6, 8, 10];
  levels.forEach(lv => {
    const r = R * lv / MAX_VAL;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = lv === 10 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showGridLabels) {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.font = `${options.gridFontSize || 18}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(lv, cx + 6, cy - r + 14);
    }
  });

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const ex = cx + R * Math.cos(angle);
    const ey = cy + R * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showAxisLabels !== false) {
      const lx = cx + (R + (options.labelOffset || 28)) * Math.cos(angle);
      const ly = cy + (R + (options.labelOffset || 28)) * Math.sin(angle);
      ctx.fillStyle = AXES[i].color;
      ctx.font = `bold ${options.labelFontSize || 20}px "Segoe UI","Noto Sans JP",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(AXES[i].label, lx, ly);
    }
  }

  // Data polygons
  datasets.forEach(ds => {
    if (!ds.visible) return;
    ctx.beginPath();
    AXES.forEach((ax, i) => {
      const val = ds.values[ax.key] ?? 0;
      const r = R * val / MAX_VAL;
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = ds.fill;
    ctx.fill();
    ctx.strokeStyle = ds.stroke;
    ctx.lineWidth = ds.lineWidth || 2.5;
    ctx.stroke();

    // Dots
    if (ds.showDots !== false) {
      AXES.forEach((ax, i) => {
        const val = ds.values[ax.key] ?? 0;
        const r = R * val / MAX_VAL;
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, ds.dotRadius || 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.stroke;
        ctx.fill();
      });
    }
  });
}

/* ====== Overview Chart ====== */
function drawOverview() {
  const canvas = document.getElementById('overviewCanvas');
  const ctx = canvas.getContext('2d');
  const datasets = composerData.map(c => ({
    values: c.avg,
    stroke: c.palette.stroke,
    fill: c.palette.fill,
    visible: visible[c.name],
    lineWidth: c.songs.length >= 3 ? 3 : 2,
    dotRadius: c.songs.length >= 3 ? 5 : 3,
    showDots: true,
  }));
  drawRadar(ctx, canvas.width, canvas.height, datasets, {
    showGridLabels: true,
    labelMargin: 80,
    labelOffset: 34,
    labelFontSize: 22,
    gridFontSize: 18,
  });
}

/* ====== Overview Legend ====== */
function buildOverviewLegend() {
  const el = document.getElementById('overviewLegend');
  el.innerHTML = composerData.map(c => `
    <div class="legend-row${visible[c.name] ? '' : ' dimmed'}" data-composer="${c.name}">
      <span class="legend-swatch" style="background:${c.palette.stroke}"></span>
      <span class="legend-name">${c.name}</span>
      <span class="legend-count">${c.songs.length}曲</span>
    </div>
  `).join('');

  el.querySelectorAll('.legend-row').forEach(row => {
    row.addEventListener('click', () => {
      const name = row.dataset.composer;
      visible[name] = !visible[name];
      row.classList.toggle('dimmed', !visible[name]);
      drawOverview();
    });
  });
}

/* ====== Composer Cards ====== */
function buildCards() {
  const wrap = document.getElementById('composerCards');
  wrap.innerHTML = '';

  composerData.forEach((c, ci) => {
    const card = document.createElement('div');
    card.className = 'c-card';

    // Find strongest & weakest axis
    let maxAx = AXES[0], minAx = AXES[0];
    AXES.forEach(ax => {
      if (c.avg[ax.key] > c.avg[maxAx.key]) maxAx = ax;
      if (c.avg[ax.key] < c.avg[minAx.key]) minAx = ax;
    });

    // Stats rows
    const stats = [
      { label: '最高軸', val: `${maxAx.label} ${c.avg[maxAx.key].toFixed(1)}`, cls: 'high' },
      { label: '最低軸', val: `${minAx.label} ${c.avg[minAx.key].toFixed(1)}`, cls: 'low' },
      { label: 'BPM帯', val: c.songs.length > 1 ? `${c.bpmMin}–${c.bpmMax}` : `${c.bpmAvg}` },
      { label: 'BPM平均', val: `${c.bpmAvg}` },
    ];

    const statsHTML = stats.map(s =>
      `<div class="stat-row"><span class="stat-label">${s.label}</span><span class="stat-val${s.cls ? ' ' + s.cls : ''}">${s.val}</span></div>`
    ).join('');

    const songsHTML = c.songs
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
      .map(s => `<span class="c-song-tag">${s.title}</span>`)
      .join('');

    card.innerHTML = `
      <div class="c-card-head">
        <span class="c-card-dot" style="background:${c.palette.stroke}"></span>
        <span class="c-card-name">${c.name}</span>
        <span class="c-card-badge">${c.songs.length}曲</span>
      </div>
      <div class="c-card-body">
        <div class="c-card-radar"><canvas id="cardCanvas${ci}" width="400" height="400"></canvas></div>
        <div class="c-card-stats">${statsHTML}</div>
      </div>
      <div class="c-card-songs">
        <div class="c-card-songs-title">担当楽曲</div>
        <div class="c-card-songs-list">${songsHTML}</div>
      </div>
    `;
    wrap.appendChild(card);

    // Draw individual radar
    requestAnimationFrame(() => {
      const cv = document.getElementById(`cardCanvas${ci}`);
      if (!cv) return;
      const ctx = cv.getContext('2d');
      drawRadar(ctx, cv.width, cv.height, [{
        values: c.avg,
        stroke: c.palette.stroke,
        fill: c.palette.fill.replace('.2)', '.35)'),
        visible: true,
        lineWidth: 3,
        dotRadius: 6,
        showDots: true,
      }], {
        showGridLabels: false,
        showAxisLabels: true,
        labelMargin: 60,
        labelOffset: 22,
        labelFontSize: 17,
      });
    });
  });
}

/* ====== Comparison Table ====== */
function buildTable() {
  const wrap = document.getElementById('cmpTableSection');
  let html = '<div class="cmp-table-title">全作曲家 平均スコア比較</div>';
  html += '<div class="cmp-scroll"><table class="cmp-table"><thead><tr><th>作曲家</th><th>曲数</th>';
  AXES.forEach(ax => { html += `<th>${ax.label}</th>`; });
  html += '<th>BPM平均</th></tr></thead><tbody>';

  // Find max/min per axis across composers
  const maxPer = {}, minPer = {};
  AXES.forEach(ax => {
    let maxV = -1, minV = 999, maxI = 0, minI = 0;
    composerData.forEach((c, i) => {
      const v = c.avg[ax.key];
      if (v > maxV) { maxV = v; maxI = i; }
      if (v < minV) { minV = v; minI = i; }
    });
    maxPer[ax.key] = maxI;
    minPer[ax.key] = minI;
  });

  composerData.forEach((c, ci) => {
    html += `<tr><td style="color:${c.palette.stroke};font-weight:700">${c.name}</td>`;
    html += `<td>${c.songs.length}</td>`;
    AXES.forEach(ax => {
      const v = c.avg[ax.key];
      const isMax = ci === maxPer[ax.key] && composerData.length > 1;
      const isMin = ci === minPer[ax.key] && composerData.length > 1;
      html += `<td class="${isMax ? 'max-cell' : isMin ? 'min-cell' : ''}">${v.toFixed(1)}</td>`;
    });
    html += `<td>${c.bpmAvg}</td></tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

/* ====== Init ====== */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    buildComposerData(data.songs);
    drawOverview();
    buildOverviewLegend();
    buildCards();
    buildTable();
  });

window.addEventListener('resize', () => drawOverview());
