/* ====== Top page: today's pick and rankings ====== */

let songs = [];

// Ranking metrics: BPM and the 9 axes (ids match the list page's ?sort= values)
const RANK_METRICS = [
  { id: 'bpm', label: 'BPM', value: s => s.bpm },
  ...AXES.map(ax => ({ id: ax.key, label: ax.label, value: s => s.scores?.[ax.key] })),
];

function renderAxisChips() {
  document.getElementById('axisChips').innerHTML = AXES.map(ax =>
    `<span class="home-axis" style="--c:${ax.color}">${ax.label}</span>`).join('');
}

// The pick's area on each position map
const PICK_MAPS = [
  { key: 'mapA', name: 'ステージ', tab: 'stage' },
  { key: 'mapB', name: 'サウンド', tab: 'sound' },
  { key: 'mapC', name: 'ムード',   tab: 'mood' },
];

function pickAreas(song) {
  return PICK_MAPS.filter(m => song[m.key]).map(m => {
    const q = mapQuadrantOf(song[m.key]);
    return `<a class="home-pick-area q-${q}" href="map.html?m=${m.tab}&song=${encodeURIComponent(song.id)}" title="${m.name}マップで見る">` +
      `<small>${m.name}</small>${escapeHtml(MAP_AREAS[m.key][q])}</a>`;
  }).join('');
}

function renderPick(prevId) {
  const pool = songs.length > 1 ? songs.filter(s => s.id !== prevId) : songs;
  const song = pool[Math.floor(Math.random() * pool.length)];
  const el = document.getElementById('pick');
  el.dataset.id = song.id;
  el.innerHTML = `
    <a class="home-pick-thumb" href="${songUrl(song.id)}">
      ${song.thumbnail_url ? `<img src="${smallThumb(song.thumbnail_url)}" alt="" loading="lazy">` : ''}
    </a>
    <div class="home-pick-body">
      <a class="home-pick-title" href="${songUrl(song.id)}">${escapeHtml(song.title)}</a>
      <div class="home-pick-meta">${[song.release_date, song.bpm && `BPM ${song.bpm}`, song.composer && `♪ ${song.composer}`].filter(Boolean).map(escapeHtml).join(' ・ ')}</div>
      <div class="home-pick-areas">${pickAreas(song)}</div>
      ${song.summary ? `<p class="home-pick-summary">${escapeHtml(song.summary)}</p>` : ''}
    </div>`;
}

function renderRank() {
  const metric = RANK_METRICS.find(m => m.id === document.getElementById('rankAxis').value);
  const top = songs.filter(s => metric.value(s) != null)
    .sort((a, b) => metric.value(b) - metric.value(a))
    .slice(0, 5);
  document.getElementById('rank').innerHTML = top.map(s => `
    <li><a href="${songUrl(s.id)}">${escapeHtml(s.title)}</a><span class="home-rank-val">${metric.value(s)}</span></li>`).join('');
  document.getElementById('rankMore').href = 'songs.html?sort=' + metric.id;
}

/* ---- Card visuals, drawn from the song data ---- */
const thumbImg = s => s.thumbnail_url ? `<img src="${smallThumb(s.thumbnail_url)}" alt="" loading="lazy">` : '<span></span>';

// Song list: the newest jackets
function renderListVisual() {
  document.getElementById('visList').innerHTML = songs.slice(0, 12).map(thumbImg).join('');
}

// Position map: every song at its stage-map position (same scale as map.js: ±10.5)
function renderMapVisual() {
  const pct = v => 6 + (v + 10.5) / 21 * 88;
  document.getElementById('visMap').innerHTML = '<i class="h"></i><i class="v"></i>' + songs.filter(s => s.mapA).map(s =>
    `<span style="left:${pct(s.mapA.x)}%;top:${100 - pct(s.mapA.y)}%">${thumbImg(s)}</span>`).join('');
}

// Recommend: a random song, its closest match and their radars overlaid
function renderRecVisual() {
  const scored = songs.filter(s => s.scores);
  const a = scored[Math.floor(Math.random() * scored.length)];
  const b = scored.filter(s => s !== a).sort((x, y) => cosineSim(a, y) - cosineSim(a, x))[0];
  const el = document.getElementById('visRec');
  el.innerHTML = `
    <span class="home-rec-song">${thumbImg(a)}</span>
    <span class="home-rec-mid"><canvas></canvas><b>${(cosineSim(a, b) * 100).toFixed(0)}%</b></span>
    <span class="home-rec-song">${thumbImg(b)}</span>`;
  const canvas = el.querySelector('canvas'), size = 104, dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.height = size * dpr;
  canvas.style.width = canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  drawRadar(ctx, size, size, [
    { values: a.scores, visible: true, stroke: '#7c6cf0', fill: 'rgba(124,108,240,.3)', lineWidth: 1.5, showDots: false },
    { values: b.scores, visible: true, stroke: '#f06c9c', fill: 'rgba(240,108,156,.25)', lineWidth: 1.5, showDots: false },
  ], { labelMargin: 6, showAxisLabels: false });
  document.getElementById('recLink').href = 'recommend.html#' + encodeURIComponent(a.id);
}

renderAxisChips();

fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    songs = data.songs;
    document.getElementById('songCount').textContent = ` ${songs.length} `;

    renderListVisual();
    renderMapVisual();
    renderRecVisual();
    renderPick();
    document.getElementById('pickAgain').addEventListener('click', () =>
      renderPick(document.getElementById('pick').dataset.id));

    const sel = document.getElementById('rankAxis');
    sel.innerHTML = RANK_METRICS.map(m => `<option value="${m.id}">${m.label}</option>`).join('');
    // Start from a random metric on each visit
    sel.value = RANK_METRICS[Math.floor(Math.random() * RANK_METRICS.length)].id;
    sel.addEventListener('change', renderRank);
    renderRank();
  })
  .catch(err => console.error('Failed to load songs.json', err));
