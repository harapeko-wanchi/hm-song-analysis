/* ======= Setlist Generator ======= */

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

const THEMES = [
  {
    id: 'hype',
    label: '🔥 盛り上がり重視',
    desc: 'パーティー・疾走感が高い曲を中心に構成',
    weights: { party: 3, speed: 2, happy: 1.5, band: 1 },
    curveType: 'peak-mid',
  },
  {
    id: 'emo',
    label: '💜 エモ多め',
    desc: 'エモーショナルな曲を軸に緩急をつけた構成',
    weights: { emo: 3, cool: 2, complexity: 1.5 },
    curveType: 'valley',
  },
  {
    id: 'cute',
    label: '💗 かわいい全開',
    desc: 'キュート・子供心・ハッピー度の高い曲で統一',
    weights: { cute: 3, childlike: 2, happy: 2 },
    curveType: 'steady-up',
  },
  {
    id: 'cool',
    label: '🧊 クール&バンド',
    desc: 'クール・バンドサウンドを前面に出した構成',
    weights: { cool: 3, band: 2.5, speed: 1.5, complexity: 1 },
    curveType: 'peak-mid',
  },
  {
    id: 'balanced',
    label: '⚖️ バランス',
    desc: '全ジャンルから満遍なく選曲。緩急のある理想的なセトリ',
    weights: {},
    curveType: 'wave',
  },
  {
    id: 'festival',
    label: '🎪 フェス仕様',
    desc: '短時間で最大限沸かせる攻めのセットリスト',
    weights: { party: 3, speed: 2, band: 1.5, happy: 1 },
    curveType: 'all-high',
  },
];

/* ===== State ===== */
const DEFAULT_TITLE = 'ヘイマミーのセトリ';
let state = { title: DEFAULT_TITLE, items: [] };
let allSongs = [];
let songMap = {};
let activeTheme = 'hype';
let dragSrcIdx = null;
let selectedIdx = null;

/* ===== Core algorithm functions (unchanged) ===== */

function themeScore(song, themeId) {
  const theme = THEMES.find(t => t.id === themeId);
  const w = theme.weights;
  const keys = Object.keys(w);
  if (keys.length === 0) {
    return AXES.reduce((sum, ax) => sum + (song.scores[ax.key] || 0), 0);
  }
  return keys.reduce((sum, k) => sum + (song.scores[k] || 0) * w[k], 0);
}

function bpmCurve(n, type, minBPM, maxBPM) {
  const targets = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let factor;
    switch (type) {
      case 'peak-mid':
        factor = Math.sin(t * Math.PI * 0.9) * 0.7 + (t > 0.85 ? 0.3 : 0);
        break;
      case 'valley':
        factor = 1 - 0.6 * Math.sin(t * Math.PI);
        break;
      case 'steady-up':
        factor = 0.3 + 0.7 * t;
        break;
      case 'wave':
        factor = 0.5 + 0.4 * Math.sin(t * Math.PI * 2);
        break;
      case 'all-high':
        factor = 0.7 + 0.3 * Math.sin(t * Math.PI * 0.8);
        break;
      default:
        factor = 0.5;
    }
    targets.push(minBPM + factor * (maxBPM - minBPM));
  }
  return targets;
}

function generateSetlist(themeId, count) {
  const pool = allSongs.filter(s => s.scores && s.bpm);
  const scored = pool.map(s => ({ song: s, score: themeScore(s, themeId) }));
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, Math.min(count * 3, pool.length));
  const bpms = candidates.map(c => c.song.bpm);
  const minBPM = Math.min(...bpms);
  const maxBPM = Math.max(...bpms);
  const theme = THEMES.find(t => t.id === themeId);
  const targetBPMs = bpmCurve(count, theme.curveType, minBPM, maxBPM);
  const used = new Set();
  const setlist = [];
  for (let slot = 0; slot < count; slot++) {
    const target = targetBPMs[slot];
    const ranked = [];
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      const s = candidates[i].song;
      const bpmDist = Math.abs(s.bpm - target) / (maxBPM - minBPM + 1);
      const combined = candidates[i].score * 0.6 - bpmDist * 40 * 0.4;
      ranked.push({ idx: i, combined });
    }
    ranked.sort((a, b) => b.combined - a.combined);
    const topK = ranked.slice(0, Math.min(3, ranked.length));
    const weights = topK.map((_, i) => Math.pow(0.5, i));
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    let pick = topK[0];
    for (let i = 0; i < topK.length; i++) {
      r -= weights[i];
      if (r <= 0) { pick = topK[i]; break; }
    }
    if (pick) {
      used.add(pick.idx);
      setlist.push(candidates[pick.idx].song);
    }
  }
  return setlist;
}

function assignRoles(setlist) {
  const n = setlist.length;
  return setlist.map((s, i) => {
    if (i === 0) return 'OPENER';
    if (i === n - 1) return 'CLOSER';
    const energy = (s.scores.party || 0) + (s.scores.speed || 0);
    const prevE = i > 0 ? (setlist[i-1].scores.party || 0) + (setlist[i-1].scores.speed || 0) : 0;
    const nextE = i < n-1 ? (setlist[i+1].scores.party || 0) + (setlist[i+1].scores.speed || 0) : 0;
    if (energy > prevE && energy > nextE) return 'PEAK';
    const emo = (s.scores.emo || 0);
    if (emo > 6 && energy < 10) return 'BREATHER';
    return null;
  });
}

/* ===== Draw line chart ===== */
function drawLineChart(canvas, labels, datasets, yMin, yMax, yLabel, encorePositions = []) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = 160;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 20, bottom: 30, left: 48 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const n = labels.length;

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
  }

  // Y labels
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8888a0';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch * i / 4;
    const val = yMax - (yMax - yMin) * i / 4;
    ctx.fillText(Math.round(val), pad.left - 6, y);
  }

  // Y axis label
  ctx.save();
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8888a0';
  ctx.textAlign = 'center';
  ctx.translate(12, pad.top + ch / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // X labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8888a0';
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? pad.left + (cw * i) / (n - 1) : pad.left + cw / 2;
    ctx.fillText(labels[i], x, h - pad.bottom + 6);
  }

  // Datasets
  datasets.forEach(ds => {
    const pts = ds.data.map((v, i) => ({
      x: n > 1 ? pad.left + (cw * i) / (n - 1) : pad.left + cw / 2,
      y: pad.top + ch * (1 - (v - yMin) / (yMax - yMin)),
    }));

    if (ds.fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad.top + ch);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad.top + ch);
      ctx.closePath();
      ctx.fillStyle = ds.color + '18';
      ctx.fill();
    }

    // Line（noData 区間は破線）
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = ds.noData && (ds.noData[i] || ds.noData[i + 1]);
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.strokeStyle = seg ? ds.color + '50' : ds.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      if (seg) ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    pts.forEach((p, i) => {
      const isNoData = ds.noData && ds.noData[i];
      if (isNoData) {
        // 中央プロット：破線の空白円＋「データなし」
        ctx.save();
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = ds.color + '70';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = ds.color + 'aa';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('データなし', p.x, p.y - 8);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.color;
        ctx.fill();
        ctx.strokeStyle = '#0f0f14';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (ds.showValues) {
          ctx.font = '600 10px "Segoe UI", sans-serif';
          ctx.fillStyle = ds.color;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(Math.round(ds.data[i]), p.x, p.y - 7);
        }
      }
    });
  });

  // Encore position markers
  if (encorePositions.length > 0 && n > 1) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1.5;
    encorePositions.forEach(k => {
      if (k <= 0 || k >= n) return;
      const x = pad.left + (cw * (k - 0.5)) / (n - 1);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + ch);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.font = '600 9px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    encorePositions.forEach(k => {
      if (k <= 0 || k >= n) return;
      const x = pad.left + (cw * (k - 0.5)) / (n - 1);
      ctx.fillText('ENC', x, pad.top + 2);
    });
    ctx.restore();
  }
}

/* ===== URL encoding ===== */

function buildRawState(st) {
  const titlePart = (st.title && st.title !== DEFAULT_TITLE) ? st.title : '';
  const itemParts = st.items.map(item => {
    if (item.type === 'encore') return 'E';
    const idx = allSongs.findIndex(s => s.id === item.songId);
    if (idx === -1) return null;
    const token = idx.toString(36);
    return item.comment ? token + ':' + item.comment : token;
  }).filter(t => t !== null);
  return titlePart + '~' + itemParts.join('|');
}

function parseRawState(raw) {
  const tildeIdx = raw.indexOf('~');
  if (tildeIdx === -1) return { title: DEFAULT_TITLE, items: [] };
  const titlePart = raw.slice(0, tildeIdx);
  const itemsStr = raw.slice(tildeIdx + 1);
  const title = titlePart || DEFAULT_TITLE;
  const items = [];
  if (itemsStr) {
    itemsStr.split('|').forEach(token => {
      if (!token) return;
      if (token === 'E') { items.push({ type: 'encore' }); return; }
      const colonIdx = token.indexOf(':');
      const idxStr = colonIdx === -1 ? token : token.slice(0, colonIdx);
      const comment = colonIdx === -1 ? '' : token.slice(colonIdx + 1);
      const idx = parseInt(idxStr, 36);
      if (!isNaN(idx) && idx >= 0 && idx < allSongs.length) {
        items.push({ type: 'song', songId: allSongs[idx].id, comment });
      }
    });
  }
  return { title, items };
}

function encodeState(st) {
  const raw = buildRawState(st);
  return LZString.compressToEncodedURIComponent(raw);
}

function decodeState(search) {
  const params = new URLSearchParams(search);
  const d = params.get('d');
  if (!d) return null;
  const raw = LZString.decompressFromEncodedURIComponent(d);
  if (!raw) return null;
  return parseRawState(raw);
}

function syncURL() {
  const encoded = encodeState(state);
  const url = encoded ? '?d=' + encoded : location.pathname;
  history.replaceState(null, '', url);
}

/* ===== Utilities ===== */

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function songCount() {
  return state.items.filter(i => i.type === 'song').length;
}

function showToast(msg) {
  const toast = document.getElementById('slToast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}

/* ===== Item selection ===== */

function selectItem(idx) {
  selectedIdx = idx;
  updateSelection();
}

function deselectItem() {
  selectedIdx = null;
  updateSelection();
}

function updateSelection() {
  document.querySelectorAll('.sl-item').forEach(el => {
    el.classList.toggle('sl-item--selected', parseInt(el.dataset.idx) === selectedIdx);
  });

  const panel = document.getElementById('slCtrlPanel');
  if (selectedIdx === null || selectedIdx >= state.items.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const item = state.items[selectedIdx];
  const labelEl = document.getElementById('slCtrlPanelLabel');
  if (item.type === 'encore') {
    labelEl.textContent = 'アンコール';
  } else {
    const song = songMap[item.songId];
    labelEl.textContent = song ? song.title : '—';
  }
  document.getElementById('slCtrlUp').disabled = selectedIdx === 0;
  document.getElementById('slCtrlDown').disabled = selectedIdx === state.items.length - 1;
}

/* ===== Rendering ===== */

function renderItemEl(item, idx, songNum) {
  const el = document.createElement('div');
  el.dataset.idx = idx;

  if (item.type === 'encore') {
    el.className = 'sl-item sl-item--encore';
    el.innerHTML = `
      <div class="sl-item-encore-bar">
        <span class="sl-encore-label">── アンコール ──</span>
      </div>
    `;
    return el;
  }

  el.className = 'sl-item sl-item--song';
  el.draggable = true;

  const song = songMap[item.songId];
  if (!song) return el;

  const thumbHTML = song.thumbnail_url
    ? `<img src="${escapeAttr(song.thumbnail_url)}" alt="${escapeAttr(song.title)}" class="sl-item-thumb" loading="lazy">`
    : `<div class="sl-item-thumb sl-item-thumb--empty"></div>`;

  el.innerHTML = `
    <div class="sl-item-header">
      <span class="sl-drag-handle" aria-hidden="true">⠿</span>
      <span class="sl-item-num">${songNum}</span>
      ${thumbHTML}
      <div class="sl-item-info">
        <div class="sl-item-title">${escapeHtml(song.title)}</div>
        <div class="sl-item-meta">${song.bpm ? `BPM ${song.bpm}` : 'BPM —'} · ${escapeHtml(song.key || '—')} · ${escapeHtml(song.composer || '—')}</div>
      </div>
    </div>
    <div class="sl-item-body">
      <input type="text" class="sl-item-comment" data-idx="${idx}"
        maxlength="40" placeholder="コメントを追加（任意）"
        value="${escapeAttr(item.comment || '')}">
    </div>
  `;
  return el;
}

function renderEditor() {
  const list = document.getElementById('slList');
  const empty = document.getElementById('slEmpty');
  const badge = document.getElementById('slCountBadge');
  const addBtn = document.getElementById('slAddSongBtn');

  const count = songCount();
  badge.textContent = count + '曲';
  addBtn.disabled = count >= 33;

  if (state.items.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    document.getElementById('slCharts').hidden = true;
    return;
  }

  empty.hidden = true;
  list.innerHTML = '';
  let songNum = 0;
  state.items.forEach((item, idx) => {
    if (item.type === 'song') songNum++;
    list.appendChild(renderItemEl(item, idx, songNum));
  });

  renderCharts();
  attachDragHandlers();
  updateSelection();
}

function renderCharts() {
  const songs = state.items
    .filter(i => i.type === 'song')
    .map(i => songMap[i.songId])
    .filter(Boolean);

  const chartsEl = document.getElementById('slCharts');
  if (songs.length === 0) {
    chartsEl.hidden = true;
    return;
  }
  chartsEl.hidden = false;

  // Calculate encore positions (index in songs array where encore appears before)
  const encorePositions = [];
  let sIdx = 0;
  state.items.forEach(item => {
    if (item.type === 'encore') { encorePositions.push(sIdx); }
    else if (item.type === 'song') { sIdx++; }
  });

  const n = songs.length;
  const labels = songs.map((_, i) => `M${i + 1}`);

  // BPM chart — songs without BPM plotted at center of range
  const songsWithBpm = songs.filter(s => s.bpm);
  const bpmMin = songsWithBpm.length ? Math.min(...songsWithBpm.map(s => s.bpm)) - 15 : 60;
  const bpmMax = songsWithBpm.length ? Math.max(...songsWithBpm.map(s => s.bpm)) + 15 : 200;
  const midBpm = (bpmMin + bpmMax) / 2;
  const bpmNoData = songs.map(s => !s.bpm);
  const bpmData = songs.map(s => s.bpm || midBpm);

  drawLineChart(
    document.getElementById('bpmCanvas'),
    labels,
    [{ data: bpmData, color: '#f06c6c', fill: true, showValues: true, noData: bpmNoData }],
    bpmMin, bpmMax, 'BPM',
    encorePositions
  );

  // Mood chart — songs without scores plotted at center (5)
  const moodNoData = songs.map(s => !s.scores);
  const hypeData = songs.map(s => s.scores ? ((s.scores.party || 0) + (s.scores.happy || 0) + (s.scores.speed || 0)) / 3 : 5);
  const emoData  = songs.map(s => s.scores ? (s.scores.emo || 0) : 5);
  drawLineChart(
    document.getElementById('moodCanvas'),
    labels,
    [
      { data: hypeData, color: '#fcb040', fill: true,  showValues: false, noData: moodNoData },
      { data: emoData,  color: '#b06cf0', fill: false, showValues: false, noData: moodNoData },
    ],
    0, 10, 'Score',
    encorePositions
  );

  // Stats — データのある曲のみで集計
  const songsWithData = songs.filter(s => s.bpm && s.scores);
  const nd = songsWithData.length;
  const avgBPM = nd ? (songsWithData.reduce((a, s) => a + s.bpm, 0) / nd).toFixed(0) : '—';
  const bpmRange = nd ? `${Math.min(...songsWithData.map(s => s.bpm))}–${Math.max(...songsWithData.map(s => s.bpm))}` : '—';
  const composers = [...new Set(songs.map(s => s.composer).filter(Boolean))];
  const avgParty = nd ? (songsWithData.reduce((sum, s) => sum + (s.scores.party || 0), 0) / nd).toFixed(1) : '—';
  const avgEmo   = nd ? (songsWithData.reduce((sum, s) => sum + (s.scores.emo   || 0), 0) / nd).toFixed(1) : '—';

  document.getElementById('slStats').innerHTML = `
    <div class="sl-stat-item"><span class="sl-stat-label">曲数</span><span class="sl-stat-val">${n}曲</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均BPM</span><span class="sl-stat-val">${avgBPM}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">BPM幅</span><span class="sl-stat-val">${bpmRange}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">作曲家数</span><span class="sl-stat-val">${composers.length}人</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均お祭り感</span><span class="sl-stat-val">${avgParty}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均エモ</span><span class="sl-stat-val">${avgEmo}</span></div>
  `;
}

/* ===== State mutations ===== */

function addSong(songId) {
  if (songCount() >= 33) return;
  state.items.push({ type: 'song', songId, comment: '' });
  renderEditor();
  syncURL();
}

function addEncore() {
  state.items.push({ type: 'encore' });
  renderEditor();
  syncURL();
}

function removeItem(idx) {
  state.items.splice(idx, 1);
  if (selectedIdx === idx) selectedIdx = null;
  else if (selectedIdx !== null && selectedIdx > idx) selectedIdx--;
  renderEditor();
  syncURL();
}

function moveItem(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.items.length) return;
  const tmp = state.items[idx];
  state.items[idx] = state.items[newIdx];
  state.items[newIdx] = tmp;
  if (selectedIdx === idx) selectedIdx = newIdx;
  renderEditor();
  syncURL();
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-idx="${newIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

/* ===== Song picker modal ===== */

let pickerAxis = 'release';
let pickerOrder = 'desc';

function updatePickerChips() {
  document.querySelectorAll('#slPickerChips .sl-picker-chip').forEach(c => {
    const active = c.dataset.axis === pickerAxis;
    c.classList.toggle('active', active);
    c.textContent = active
      ? `${c.dataset.label} ${pickerOrder === 'desc' ? '▼' : '▲'}`
      : c.dataset.label;
  });
}

function openPicker() {
  const modal = document.getElementById('slPickerModal');
  modal.hidden = false;
  pickerAxis = 'release';
  pickerOrder = 'desc';
  updatePickerChips();
  renderPickerList();
}

function closePicker() {
  document.getElementById('slPickerModal').hidden = true;
}

function renderPickerList() {
  const list = document.getElementById('slPickerList');
  const desc = pickerOrder === 'desc';
  let filtered = [...allSongs];

  if (pickerAxis === 'release') {
    filtered.sort((a, b) => {
      // null = newest: top in desc, bottom in asc
      if (!a.release_date && !b.release_date) return 0;
      if (!a.release_date) return desc ? -1 : 1;
      if (!b.release_date) return desc ? 1 : -1;
      return desc
        ? b.release_date.localeCompare(a.release_date)
        : a.release_date.localeCompare(b.release_date);
    });
  } else if (pickerAxis === 'bpm') {
    filtered.sort((a, b) => {
      if (!a.bpm && !b.bpm) return 0;
      if (!a.bpm) return 1;
      if (!b.bpm) return -1;
      return desc ? b.bpm - a.bpm : a.bpm - b.bpm;
    });
  } else {
    filtered.sort((a, b) => {
      const sa = a.scores ? (a.scores[pickerAxis] ?? -1) : -1;
      const sb = b.scores ? (b.scores[pickerAxis] ?? -1) : -1;
      if (sa < 0 && sb < 0) return 0;
      if (sa < 0) return 1;
      if (sb < 0) return -1;
      return desc ? sb - sa : sa - sb;
    });
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="sl-modal-empty">見つかりません</div>';
    return;
  }

  list.innerHTML = '';
  filtered.forEach(song => {
    const item = document.createElement('div');
    item.className = 'sl-modal-item';
    const thumb = song.thumbnail_url
      ? `<img src="${escapeAttr(song.thumbnail_url)}" alt="" width="36" height="36" style="object-fit:cover;border-radius:4px;flex-shrink:0">`
      : '';
    item.innerHTML = `
      ${thumb}
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(song.title)}</div>
        <div style="font-size:.65rem;color:var(--muted)">${song.bpm ? `BPM ${song.bpm}` : 'BPM —'} · ${escapeHtml(song.composer || '—')}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      addSong(song.id);
      closePicker();
    });
    list.appendChild(item);
  });
}

/* ===== Auto-generation dialog ===== */

function openAutoDialog() {
  document.getElementById('slAutoDialog').hidden = false;
}

function closeAutoDialog() {
  document.getElementById('slAutoDialog').hidden = true;
}

/* ===== Share text ===== */

// Twitter重み付き文字数（CJK=2、ASCII/Latin=1）
function twitterLength(text) {
  let len = 0;
  for (const ch of text) len += ch.codePointAt(0) <= 0x10FF ? 1 : 2;
  return len;
}

function buildShareText() {
  const LIMIT = 257;
  const header = state.title || DEFAULT_TITLE;
  const hashtags = '#へいまみセトリメーカー';
  const orderLines = [];
  let songNum = 0;
  state.items.forEach(item => {
    if (item.type === 'encore') { orderLines.push('— アンコール —'); return; }
    songNum++;
    const song = songMap[item.songId];
    if (!song) return;
    const label = item.comment ? `${song.title} / ${item.comment}` : song.title;
    orderLines.push(`${songNum} ${label}`);
  });
  const full = [header, ...orderLines, hashtags].join('\n');
  if (twitterLength(full) <= LIMIT) return full;
  while (orderLines.length > 0) {
    orderLines.pop();
    while (orderLines.length > 0 && orderLines[orderLines.length - 1] === '— アンコール —') {
      orderLines.pop();
    }
    const trimmed = [header, ...orderLines, '…', hashtags].join('\n');
    if (twitterLength(trimmed) <= LIMIT) return trimmed;
  }
  return [header, '…', hashtags].join('\n');
}

/* ===== Drag & Drop ===== */

function attachDragHandlers() {
  const list = document.getElementById('slList');
  list.querySelectorAll('.sl-item--song[draggable]').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragSrcIdx = parseInt(el.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('sl-dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('sl-dragging');
      list.querySelectorAll('.sl-item').forEach(e => e.classList.remove('sl-drag-over'));
      dragSrcIdx = null;
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.querySelectorAll('.sl-item').forEach(e => e.classList.remove('sl-drag-over'));
      el.classList.add('sl-drag-over');
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = parseInt(el.dataset.idx);
      if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
      const tmp = state.items[dragSrcIdx];
      state.items[dragSrcIdx] = state.items[targetIdx];
      state.items[targetIdx] = tmp;
      renderEditor();
      syncURL();
    });
  });
}

/* ===== Event handlers ===== */

function attachEditorHandlers() {
  const list = document.getElementById('slList');

  list.addEventListener('click', e => {
    if (e.target.closest('input')) return; // コメント入力時は選択しない
    const itemEl = e.target.closest('.sl-item');
    if (itemEl) selectItem(parseInt(itemEl.dataset.idx));
  });

  const syncCommentDebounced = debounce((idx, value) => {
    if (state.items[idx] && state.items[idx].type === 'song') {
      state.items[idx].comment = value;
      syncURL();
    }
  }, 400);

  list.addEventListener('input', e => {
    const commentEl = e.target.closest('.sl-item-comment');
    if (commentEl) {
      syncCommentDebounced(parseInt(commentEl.dataset.idx), commentEl.value);
    }
  });
}

function attachActionHandlers() {
  // Title input
  const titleInput = document.getElementById('slTitleInput');
  const syncTitleDebounced = debounce(() => {
    state.title = titleInput.value.trim() || DEFAULT_TITLE;
    syncURL();
  }, 400);
  titleInput.addEventListener('input', syncTitleDebounced);

  // Add song
  document.getElementById('slAddSongBtn').addEventListener('click', openPicker);

  // Encore
  document.getElementById('slAddEncoreBtn').addEventListener('click', addEncore);

  // Auto-gen
  document.getElementById('slAutoGenBtn').addEventListener('click', openAutoDialog);

  // Dialog close
  document.getElementById('slDialogClose').addEventListener('click', closeAutoDialog);
  document.getElementById('slAutoDialog').addEventListener('click', e => {
    if (e.target === document.getElementById('slAutoDialog')) closeAutoDialog();
  });

  // Picker close
  document.getElementById('slPickerClose').addEventListener('click', closePicker);
  document.getElementById('slPickerModal').addEventListener('click', e => {
    if (e.target === document.getElementById('slPickerModal')) closePicker();
  });
  document.getElementById('slPickerChips').addEventListener('click', e => {
    const chip = e.target.closest('.sl-picker-chip');
    if (!chip) return;
    if (chip.dataset.axis === pickerAxis) {
      pickerOrder = pickerOrder === 'desc' ? 'asc' : 'desc';
    } else {
      pickerAxis = chip.dataset.axis;
      pickerOrder = 'desc';
    }
    updatePickerChips();
    renderPickerList();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAutoDialog(); closePicker(); deselectItem(); }
  });

  // Item control panel
  document.getElementById('slCtrlUp').addEventListener('click', () => {
    if (selectedIdx !== null) moveItem(selectedIdx, -1);
  });
  document.getElementById('slCtrlDown').addEventListener('click', () => {
    if (selectedIdx !== null) moveItem(selectedIdx, 1);
  });
  document.getElementById('slCtrlRemove').addEventListener('click', () => {
    if (selectedIdx !== null) removeItem(selectedIdx);
  });
  document.getElementById('slCtrlClose').addEventListener('click', deselectItem);

  // クリック外しで選択解除
  document.addEventListener('click', e => {
    if (!e.target.closest('.sl-item') && !e.target.closest('#slCtrlPanel')) {
      deselectItem();
    }
  });

  // Generate
  document.getElementById('generateBtn').addEventListener('click', () => {
    const count = parseInt(document.getElementById('countSlider').value, 10);
    const proceed = () => {
      const setlist = generateSetlist(activeTheme, count);
      state.items = setlist.map(s => ({ type: 'song', songId: s.id, comment: '' }));
      closeAutoDialog();
      renderEditor();
      syncURL();
    };
    if (state.items.length > 0) {
      if (confirm('現在のセトリを上書きしますか？')) proceed();
    } else {
      proceed();
    }
  });

  // X share
  document.getElementById('slShareTwitter').addEventListener('click', () => {
    const text = buildShareText();
    const url = location.href;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank', 'noopener'
    );
  });

  // Copy link
  document.getElementById('slCopyLink').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('リンクをコピーしました');
    } catch {
      showToast('コピーできませんでした');
    }
  });

  // Reset
  document.getElementById('slResetBtn').addEventListener('click', () => {
    if (!confirm('セトリをリセットしますか？')) return;
    state = { title: DEFAULT_TITLE, items: [] };
    document.getElementById('slTitleInput').value = '';
    renderEditor();
    syncURL();
  });
}

/* ===== Init ===== */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs;
    allSongs.forEach(s => { songMap[s.id] = s; });

    // Build theme buttons
    const themeList = document.getElementById('themeList');
    THEMES.forEach(theme => {
      const btn = document.createElement('button');
      btn.className = 'sl-theme-btn' + (theme.id === activeTheme ? ' active' : '');
      btn.textContent = theme.label;
      btn.title = theme.desc;
      btn.addEventListener('click', () => {
        activeTheme = theme.id;
        themeList.querySelectorAll('.sl-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      themeList.appendChild(btn);
    });

    // Count slider
    const slider = document.getElementById('countSlider');
    const countVal = document.getElementById('countVal');
    slider.addEventListener('input', () => { countVal.textContent = slider.value; });

    // Restore state from URL
    const restored = decodeState(location.search);
    if (restored) {
      state = restored;
      if (state.title !== DEFAULT_TITLE) {
        document.getElementById('slTitleInput').value = state.title;
      }
    }

    renderEditor();
    attachEditorHandlers();
    attachActionHandlers();
  })
  .catch(err => console.error('Failed to load songs.json', err));
