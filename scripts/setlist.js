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
    weights: {},          // all equal
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

let allSongs = [];
let activeTheme = 'hype';

/* ---- Scoring for theme ---- */
function themeScore(song, themeId) {
  const theme = THEMES.find(t => t.id === themeId);
  const w = theme.weights;
  const keys = Object.keys(w);
  if (keys.length === 0) {
    // balanced — sum all axes equally
    return AXES.reduce((sum, ax) => sum + (song.scores[ax.key] || 0), 0);
  }
  return keys.reduce((sum, k) => sum + (song.scores[k] || 0) * w[k], 0);
}

/* ---- BPM target curve generation ---- */
function bpmCurve(n, type, minBPM, maxBPM) {
  const targets = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0..1
    let factor;
    switch (type) {
      case 'peak-mid':
        // Rise to peak at ~60%, then slight dip, final burst
        factor = Math.sin(t * Math.PI * 0.9) * 0.7 + (t > 0.85 ? 0.3 : 0);
        break;
      case 'valley':
        // Start medium, dip to emotional valley mid, rise at end
        factor = 1 - 0.6 * Math.sin(t * Math.PI);
        break;
      case 'steady-up':
        // Gradual climb
        factor = 0.3 + 0.7 * t;
        break;
      case 'wave':
        // Wave pattern — up/down/up
        factor = 0.5 + 0.4 * Math.sin(t * Math.PI * 2);
        break;
      case 'all-high':
        // Start strong, stay high
        factor = 0.7 + 0.3 * Math.sin(t * Math.PI * 0.8);
        break;
      default:
        factor = 0.5;
    }
    targets.push(minBPM + factor * (maxBPM - minBPM));
  }
  return targets;
}

/* ---- Generate setlist ---- */
function generateSetlist(themeId, count) {
  const pool = allSongs.filter(s => s.scores && s.bpm);

  // Score all songs for theme
  const scored = pool.map(s => ({ song: s, score: themeScore(s, themeId) }));
  scored.sort((a, b) => b.score - a.score);

  // Take top candidates (2x count to have room for BPM matching)
  const candidates = scored.slice(0, Math.min(count * 3, pool.length));

  // Get BPM range from candidates
  const bpms = candidates.map(c => c.song.bpm);
  const minBPM = Math.min(...bpms);
  const maxBPM = Math.max(...bpms);

  const theme = THEMES.find(t => t.id === themeId);
  const targetBPMs = bpmCurve(count, theme.curveType, minBPM, maxBPM);

  // Greedy assignment: for each slot, pick from top-k candidates with randomness
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

    // Pick randomly from top 3 candidates (weighted toward higher scores)
    const topK = ranked.slice(0, Math.min(3, ranked.length));
    const weights = topK.map((_, i) => Math.pow(0.5, i)); // 1, 0.5, 0.25
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

/* ---- Assign roles ---- */
function assignRoles(setlist) {
  const n = setlist.length;
  return setlist.map((s, i) => {
    if (i === 0) return 'OPENER';
    if (i === n - 1) return 'CLOSER';
    // Peak: highest party+speed in middle section
    const energy = (s.scores.party || 0) + (s.scores.speed || 0);
    const prevE = i > 0 ? (setlist[i-1].scores.party || 0) + (setlist[i-1].scores.speed || 0) : 0;
    const nextE = i < n-1 ? (setlist[i+1].scores.party || 0) + (setlist[i+1].scores.speed || 0) : 0;
    if (energy > prevE && energy > nextE && i > 0 && i < n - 1) return 'PEAK';
    // Breather: lowest energy
    const emo = (s.scores.emo || 0);
    if (emo > 6 && energy < 10) return 'BREATHER';
    return null;
  });
}

/* ---- Draw line chart ---- */
function drawLineChart(canvas, labels, datasets, yMin, yMax, yLabel) {
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
  const n = labels.length;
  for (let i = 0; i < n; i++) {
    const x = pad.left + (cw * i) / (n - 1);
    ctx.fillText(labels[i], x, h - pad.bottom + 6);
  }

  // Draw datasets
  datasets.forEach(ds => {
    const pts = ds.data.map((v, i) => ({
      x: pad.left + (cw * i) / (n - 1),
      y: pad.top + ch * (1 - (v - yMin) / (yMax - yMin)),
    }));

    // Area fill
    if (ds.fill) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad.top + ch);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, pad.top + ch);
      ctx.closePath();
      ctx.fillStyle = ds.color + '18';
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots + value labels
    pts.forEach((p, i) => {
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
    });
  });
}

/* ---- Display setlist ---- */
function displaySetlist(setlist) {
  document.getElementById('slEmpty').style.display = 'none';
  document.getElementById('slResult').style.display = '';

  const roles = assignRoles(setlist);
  const n = setlist.length;

  const bpmLabels = setlist.map((_, i) => `M${i + 1}`);
  const bpmData = setlist.map(s => s.bpm);

  // Setlist cards (render first, above charts)
  const list = document.getElementById('slList');
  list.innerHTML = '';
  setlist.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'sl-card';

    const thumbHTML = s.thumbnail_url
      ? `<div class="sl-card-thumb">${s.youtube_url ? `<a href="${s.youtube_url}" target="_blank" rel="noopener" title="YouTubeで再生">` : ''}<img src="${s.thumbnail_url}" alt="${s.title}" loading="lazy">${s.youtube_url ? '</a>' : ''}</div>`
      : '';

    const role = roles[i];
    const roleMap = {
      OPENER:   { label: 'OPENER', cls: 'role-opener' },
      CLOSER:   { label: 'CLOSER', cls: 'role-closer' },
      PEAK:     { label: 'PEAK',   cls: 'role-peak' },
      BREATHER: { label: 'BREATHER', cls: 'role-breather' },
    };
    const roleBadge = role && roleMap[role]
      ? `<span class="sl-badge ${roleMap[role].cls}">${roleMap[role].label}</span>`
      : '';

    card.innerHTML = `
      <div class="sl-num">${i + 1}</div>
      ${thumbHTML}
      <div class="sl-card-body">
        <div class="sl-card-title">${s.title}</div>
        <div class="sl-card-meta">
          <span>BPM ${s.bpm}</span>
          <span>Key: ${s.key}</span>
          <span>♪ ${s.composer}</span>
        </div>
        <div class="sl-card-badges">
          ${roleBadge}
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  // BPM chart
  const bpmMin = Math.min(...bpmData) - 15;
  const bpmMax = Math.max(...bpmData) + 15;
  drawLineChart(
    document.getElementById('bpmCanvas'),
    bpmLabels,
    [{ data: bpmData, color: '#f06c6c', fill: true, showValues: true }],
    bpmMin, bpmMax, 'BPM'
  );

  // Mood chart — party + happy as "盛り上がり", emo as "エモ"
  const hypeData = setlist.map(s => ((s.scores.party || 0) + (s.scores.happy || 0) + (s.scores.speed || 0)) / 3);
  const emoData = setlist.map(s => s.scores.emo || 0);
  drawLineChart(
    document.getElementById('moodCanvas'),
    bpmLabels,
    [
      { data: hypeData, color: '#fcb040', fill: true, showValues: false },
      { data: emoData, color: '#b06cf0', fill: false, showValues: false },
    ],
    0, 10, 'Score'
  );

  // Legend is now HTML-based (see #moodLegend in setlist.html)

  // Stats
  const avgBPM = (bpmData.reduce((a, b) => a + b, 0) / n).toFixed(0);
  const bpmRange = `${Math.min(...bpmData)}–${Math.max(...bpmData)}`;
  const composers = [...new Set(setlist.map(s => s.composer))];
  const avgParty = (setlist.reduce((sum, s) => sum + (s.scores.party || 0), 0) / n).toFixed(1);
  const avgEmo = (setlist.reduce((sum, s) => sum + (s.scores.emo || 0), 0) / n).toFixed(1);

  document.getElementById('slStats').innerHTML = `
    <div class="sl-stat-item"><span class="sl-stat-label">曲数</span><span class="sl-stat-val">${n}曲</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均BPM</span><span class="sl-stat-val">${avgBPM}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">BPM幅</span><span class="sl-stat-val">${bpmRange}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">作曲家数</span><span class="sl-stat-val">${composers.length}人</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均お祭り感</span><span class="sl-stat-val">${avgParty}</span></div>
    <div class="sl-stat-item"><span class="sl-stat-label">平均エモ</span><span class="sl-stat-val">${avgEmo}</span></div>
  `;
}

/* ---- Init ---- */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs.filter(s => s.scores && s.bpm);

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

    // Generate
    document.getElementById('generateBtn').addEventListener('click', () => {
      const count = parseInt(slider.value, 10);
      const setlist = generateSetlist(activeTheme, count);
      displaySetlist(setlist);
    });
  })
  .catch(err => console.error('Failed to load songs.json', err));
