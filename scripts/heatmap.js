/* ====== Config ====== */
const AXES = [
  { key: 'cute',       label: 'キュート',  shortLabel: 'Cute' },
  { key: 'cool',       label: 'クール',    shortLabel: 'Cool' },
  { key: 'emo',        label: 'エモ',      shortLabel: 'Emo' },
  { key: 'childlike',  label: '子供心',    shortLabel: 'Child' },
  { key: 'happy',      label: 'ハッピー',  shortLabel: 'Happy' },
  { key: 'party',      label: 'お祭り感',  shortLabel: 'Party' },
  { key: 'band',       label: 'バンド',    shortLabel: 'Band' },
  { key: 'speed',      label: '疾走感',    shortLabel: 'Speed' },
  { key: 'complexity', label: '複雑度',    shortLabel: 'Cmplx' },
];

let allSongs = [];
let sortKey = 'release';
let sortAsc = true;     // true for the quick-sort buttons
let colSort = null;      // { key, asc } for column header sort
let colorMode = 'unified'; // 'unified' | 'composer'

/* ====== Composer color palettes ====== */
const COMPOSER_HUES = {
  'NNBS.':               { hBase: 260, hRange: 80, label: 'NNBS.' },           // purple → pink
  'AILI':                { hBase: 190, hRange: 60, label: 'AILI' },            // teal → blue
  'しえりーほ':          { hBase: 30,  hRange: 40, label: 'しえりーほ' },       // orange → yellow
  '山崎あおい':          { hBase: 100, hRange: 50, label: '山崎あおい' },       // green → teal
  '阿久津健太郎':        { hBase: 0,   hRange: 30, label: '阿久津健太郎' },     // red
  '古橋勇紀':            { hBase: 340, hRange: 30, label: '古橋勇紀' },         // rose
  '早川博隆/柿迫ヒカル': { hBase: 50,  hRange: 30, label: '早川博隆/柿迫ヒカル' }, // gold
  '徳田光希、大竹智之':  { hBase: 160, hRange: 40, label: '徳田光希、大竹智之' }, // cyan
};
const DEFAULT_HUE = { hBase: 260, hRange: 80 };

function getComposerPalette(composer) {
  return COMPOSER_HUES[composer] || DEFAULT_HUE;
}

/* ====== Color scale ====== */
function scoreColor(val, composer) {
  const t = Math.max(0, Math.min(1, val / 10));
  if (colorMode === 'composer' && composer) {
    const p = getComposerPalette(composer);
    const h = p.hBase + t * p.hRange;
    const s = 45 + t * 35;       // 45% → 80%
    const l = 14 + t * 48;       // 14% → 62%
    return `hsl(${h},${s}%,${l}%)`;
  }
  // Unified (original purple → pink)
  const h = 260 + t * 80;
  const s = 50 + t * 30;
  const l = 15 + t * 50;
  return `hsl(${h},${s}%,${l}%)`;
}
function scoreTextColor(val) {
  return val >= 5 ? '#fff' : 'rgba(255,255,255,.55)';
}

/* ====== Sort logic ====== */
function sortSongs(songs) {
  // If column header sort is active, use that
  if (colSort) {
    const k = colSort.key;
    const dir = colSort.asc ? 1 : -1;
    if (k === 'title') return [...songs].sort((a, b) => dir * a.title.localeCompare(b.title, 'ja'));
    if (k === 'bpm') return [...songs].sort((a, b) => dir * ((a.bpm || 0) - (b.bpm || 0)));
    // Axis key
    return [...songs].sort((a, b) => dir * ((a.scores?.[k] ?? 0) - (b.scores?.[k] ?? 0)));
  }

  const arr = [...songs];
  switch (sortKey) {
    case 'release':
      return arr.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    case 'bpm':
      return arr.sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
    case 'composer':
      return arr.sort((a, b) => (a.composer || '').localeCompare(b.composer || '', 'ja') || a.title.localeCompare(b.title, 'ja'));
    default:
      return arr;
  }
}

/* ====== Build table ====== */
function render() {
  const thead = document.getElementById('hmHead');
  const tbody = document.getElementById('hmBody');

  // Head
  let headHTML = '<tr><th data-col="title">曲名</th>';
  AXES.forEach(ax => {
    const isSorted = colSort && colSort.key === ax.key;
    headHTML += `<th data-col="${ax.key}" class="${isSorted ? 'sorted' + (colSort.asc ? ' asc' : '') : ''}">${ax.label}</th>`;
  });
  headHTML += '<th data-col="bpm" class="' + (colSort && colSort.key === 'bpm' ? 'sorted' + (colSort.asc ? ' asc' : '') : '') + '">BPM</th>';
  headHTML += '</tr>';
  thead.innerHTML = headHTML;

  // Body
  const sorted = sortSongs(allSongs);
  let bodyHTML = '';

  sorted.forEach(song => {
    bodyHTML += `<tr>`;
    bodyHTML += `<td title="${song.composer || ''}">${song.title}</td>`;
    AXES.forEach(ax => {
      const val = song.scores?.[ax.key];
      if (val == null) {
        bodyHTML += '<td>–</td>';
      } else {
        const bg = scoreColor(val, song.composer);
        const fg = scoreTextColor(val);
        bodyHTML += `<td data-song="${song.title}" data-axis="${ax.label}" data-val="${val}">` +
          `<span class="hm-cell" style="background:${bg};color:${fg}">${val.toFixed(1)}</span></td>`;
      }
    });
    bodyHTML += `<td>${song.bpm ?? '–'}</td>`;
    bodyHTML += '</tr>';
  });

  // Stats row — averages
  bodyHTML += '<tr class="stats-row"><td>平均</td>';
  AXES.forEach(ax => {
    const vals = allSongs.map(s => s.scores?.[ax.key]).filter(v => v != null);
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const bg = scoreColor(avg);
    const fg = scoreTextColor(avg);
    bodyHTML += `<td><span class="hm-cell" style="background:${bg};color:${fg}">${avg.toFixed(1)}</span></td>`;
  });
  const avgBpm = allSongs.reduce((s, x) => s + (x.bpm || 0), 0) / allSongs.length;
  bodyHTML += `<td>${Math.round(avgBpm)}</td></tr>`;

  tbody.innerHTML = bodyHTML;

  // Re-attach column header click handlers
  thead.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (colSort && colSort.key === col) {
        colSort.asc = !colSort.asc;
      } else {
        colSort = { key: col, asc: col === 'title' };
      }
      // Deactivate quick-sort buttons
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      render();
    });
  });
}

/* ====== Tooltip ====== */
function initTooltip() {
  const tip = document.getElementById('hmTooltip');
  const tbody = document.getElementById('hmBody');

  tbody.addEventListener('mouseover', e => {
    const td = e.target.closest('td[data-song]');
    if (!td) { tip.classList.remove('visible'); return; }
    tip.querySelector('.tt-song').textContent = td.dataset.song;
    tip.querySelector('.tt-axis').textContent = `${td.dataset.axis}: ${Number(td.dataset.val).toFixed(1)} / 10`;
    tip.classList.add('visible');
  });

  tbody.addEventListener('mousemove', e => {
    if (!tip.classList.contains('visible')) return;
    const pad = 12;
    let x = e.clientX + pad, y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  });

  tbody.addEventListener('mouseleave', () => tip.classList.remove('visible'));
}

/* ====== Quick-sort buttons ====== */
function initSortBar() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sortKey = btn.dataset.sort;
      colSort = null;
      render();
    });
  });
}

/* ====== Color mode toggle ====== */
function initColorMode() {
  document.querySelectorAll('.color-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      colorMode = btn.dataset.mode;
      updateLegend();
      render();
    });
  });
}

function updateLegend() {
  const unified = document.getElementById('unifiedLegend');
  const composer = document.getElementById('composerLegend');
  if (colorMode === 'unified') {
    unified.style.display = '';
    composer.style.display = 'none';
  } else {
    unified.style.display = 'none';
    composer.style.display = '';
    buildComposerLegend();
  }
}

function buildComposerLegend() {
  const el = document.getElementById('composerLegend');
  // Collect unique composers in data
  const composers = [...new Set(allSongs.map(s => s.composer).filter(Boolean))];
  el.innerHTML = composers.map(c => {
    const p = getComposerPalette(c);
    const gradFrom = `hsl(${p.hBase},45%,14%)`;
    const gradTo   = `hsl(${p.hBase + p.hRange},80%,62%)`;
    return `<div class="composer-legend-item">
      <span class="composer-legend-swatch" style="background:linear-gradient(90deg,${gradFrom},${gradTo})"></span>
      <span>${p.label || c}</span>
    </div>`;
  }).join('');
}

/* ====== Init ====== */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs.filter(s => s.scores);
    render();
    initSortBar();
    initTooltip();
    initColorMode();
  });
