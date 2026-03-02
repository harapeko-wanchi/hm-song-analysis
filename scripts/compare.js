/* ====== Config ====== */
const SLOT_COLORS = [
  { fill: 'rgba(124,108,240,.25)', stroke: '#7c6cf0', name: '#7c6cf0' },
  { fill: 'rgba(240,108,156,.25)', stroke: '#f06c9c', name: '#f06c9c' },
  { fill: 'rgba(108,240,176,.25)', stroke: '#6cf0b0', name: '#6cf0b0' },
];
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
const MAX_SLOTS = 3;
const MAX_VAL = 10;
let allSongs = [];
let selected = [null, null, null]; // song IDs

/* ====== Init ====== */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs.filter(s => s.scores);
    allSongs.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    buildSlots();
    // Restore from URL params
    const params = new URLSearchParams(location.search);
    for (let i = 0; i < MAX_SLOTS; i++) {
      const id = params.get('s' + (i + 1));
      if (id && allSongs.find(s => s.id === id)) {
        selected[i] = id;
        document.getElementById('sel' + i).value = id;
      }
    }
    draw();
  });

/* ====== Slot UI ====== */
function buildSlots() {
  const wrap = document.getElementById('slots');
  for (let i = 0; i < MAX_SLOTS; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerHTML = `
      <span class="slot-dot" style="background:${SLOT_COLORS[i].stroke}"></span>
      <select id="sel${i}">
        <option value="">― 曲${i + 1}を選択 ―</option>
        ${allSongs.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
      </select>
      <button class="slot-clear" data-idx="${i}" title="クリア">✕</button>
    `;
    wrap.appendChild(slot);

    slot.querySelector('select').addEventListener('change', e => {
      selected[i] = e.target.value || null;
      updateURL();
      draw();
    });
    slot.querySelector('.slot-clear').addEventListener('click', () => {
      selected[i] = null;
      document.getElementById('sel' + i).value = '';
      updateURL();
      draw();
    });
  }
}

function updateURL() {
  const params = new URLSearchParams();
  selected.forEach((id, i) => { if (id) params.set('s' + (i + 1), id); });
  const qs = params.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

/* ====== Draw radar ====== */
function draw() {
  const canvas = document.getElementById('radarCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 90;
  const n = AXES.length;
  const dpr = window.devicePixelRatio || 1;

  ctx.clearRect(0, 0, W, H);

  // Background grid
  const levels = [2, 4, 6, 8, 10];
  ctx.lineWidth = 1;
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
    ctx.strokeStyle = lv === 10 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)';
    ctx.stroke();

    // Level label
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lv, cx + 8, cy - r + 18);
  });

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const ex = cx + R * Math.cos(angle);
    const ey = cy + R * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    const lx = cx + (R + 36) * Math.cos(angle);
    const ly = cy + (R + 36) * Math.sin(angle);
    ctx.fillStyle = AXES[i].color;
    ctx.font = 'bold 24px "Segoe UI", "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(AXES[i].label, lx, ly);
  }

  // Draw selected songs
  const songs = selected.map(id => id ? allSongs.find(s => s.id === id) : null);

  songs.forEach((song, si) => {
    if (!song || !song.scores) return;
    ctx.beginPath();
    AXES.forEach((ax, i) => {
      const val = song.scores[ax.key] ?? 0;
      const r = R * val / MAX_VAL;
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = SLOT_COLORS[si].fill;
    ctx.fill();
    ctx.strokeStyle = SLOT_COLORS[si].stroke;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dots
    AXES.forEach((ax, i) => {
      const val = song.scores[ax.key] ?? 0;
      const r = R * val / MAX_VAL;
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = SLOT_COLORS[si].stroke;
      ctx.fill();
    });
  });

  // Legend
  buildLegend(songs);
  // Diff table
  buildDiff(songs);
}

function buildLegend(songs) {
  const el = document.getElementById('legend');
  el.innerHTML = songs.filter(Boolean).map((s, i) => {
    const idx = selected.indexOf(s.id);
    return `<div class="legend-item">
      <span class="legend-swatch" style="background:${SLOT_COLORS[idx].stroke}"></span>
      ${s.title}
    </div>`;
  }).join('');
}

function buildDiff(songs) {
  const wrap = document.getElementById('diffSection');
  const valid = songs.filter(Boolean);
  if (valid.length === 0) {
    wrap.innerHTML = '<div class="empty-msg">上のセレクタから曲を選んでください</div>';
    return;
  }

  // Find max per axis
  const maxPer = {};
  AXES.forEach(ax => {
    let best = -1, bestIdx = -1;
    valid.forEach((s, i) => {
      const v = s.scores[ax.key] ?? 0;
      if (v > best) { best = v; bestIdx = i; }
    });
    maxPer[ax.key] = bestIdx;
  });

  let html = '<div class="diff-title">スコア比較テーブル</div>';
  html += '<div style="overflow-x:auto">';
  html += '<table class="diff-table"><thead><tr><th>軸</th>';
  valid.forEach((s, i) => {
    const idx = selected.indexOf(s.id);
    html += `<th style="color:${SLOT_COLORS[idx].stroke}">${s.title}</th>`;
  });
  if (valid.length >= 2) html += '<th>差</th>';
  html += '</tr></thead><tbody>';

  AXES.forEach(ax => {
    html += `<tr><td>${ax.label}</td>`;
    const vals = valid.map(s => s.scores[ax.key] ?? 0);
    valid.forEach((s, i) => {
      const v = vals[i];
      const isMax = i === maxPer[ax.key] && valid.length >= 2;
      html += `<td class="val${isMax ? ' max-cell' : ''}">${v.toFixed(1)}</td>`;
    });
    if (valid.length >= 2) {
      const diff = Math.max(...vals) - Math.min(...vals);
      html += `<td class="val" style="color:${diff >= 4 ? '#f06c6c' : diff >= 2 ? '#fcb040' : 'var(--muted)'}">${diff.toFixed(1)}</td>`;
    }
    html += '</tr>';
  });

  // BPM row
  html += `<tr><td>BPM</td>`;
  valid.forEach(s => { html += `<td class="val">${s.bpm ?? '–'}</td>`; });
  if (valid.length >= 2) {
    const bpms = valid.map(s => s.bpm || 0);
    html += `<td class="val">${Math.max(...bpms) - Math.min(...bpms)}</td>`;
  }
  html += '</tr>';

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

/* Redraw on resize */
window.addEventListener('resize', () => { draw(); });
