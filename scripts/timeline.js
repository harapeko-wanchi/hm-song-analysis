/* ====== Timeline: release-order list + yearly trend of one metric ====== */

const ACCENT = '#7c6cf0';     // yearly mean line (the emphasised series)
const MUTED_DOT = '#8888a0';  // individual songs (context)
const SURFACE = '#22222e';    // --card: ring around markers

const METRICS = [
  { key: 'bpm', label: 'BPM', get: s => s.bpm },
  ...AXES.map(ax => ({ key: ax.key, label: ax.label, get: s => s.scores?.[ax.key] })),
];

let songs = [];
let metric = METRICS[0];

const yearOf = s => s.release_date.slice(0, 4);
const timeOf = s => Date.parse(s.release_date);
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (m, v) => m.key === 'bpm' ? String(Math.round(v)) : v.toFixed(1);

function yearlyStats() {
  const byYear = {};
  songs.forEach(s => (byYear[yearOf(s)] ||= []).push(s));
  return Object.keys(byYear).sort().map(y => ({
    year: y,
    songs: byYear[y],
    avg: Object.fromEntries(METRICS.map(m => [m.key, mean(byYear[y].map(m.get))])),
  }));
}

/* ---------- Chart (SVG) ---------- */
function niceRange(m) {
  if (m.key !== 'bpm') return { min: 0, max: 10, ticks: [0, 2, 4, 6, 8, 10] };
  const vals = songs.map(m.get);
  const min = Math.floor((Math.min(...vals) - 5) / 20) * 20;
  const max = Math.ceil((Math.max(...vals) + 5) / 20) * 20;
  const ticks = [];
  for (let v = min; v <= max; v += 40) ticks.push(v);
  return { min, max, ticks };
}

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

function renderChart() {
  const box = document.getElementById('tlChart');
  box.textContent = '';
  const W = box.clientWidth;
  const H = W < 560 ? 260 : 320;
  const pad = { top: 16, right: 56, bottom: 30, left: 40 };
  const stats = yearlyStats();
  const { min, max, ticks } = niceRange(metric);

  const firstYear = +stats[0].year, lastYear = +stats[stats.length - 1].year;
  const t0 = Date.UTC(firstYear, 0, 1), t1 = Date.UTC(lastYear + 1, 0, 1);
  const x = t => pad.left + (t - t0) / (t1 - t0) * (W - pad.left - pad.right);
  const y = v => pad.top + (1 - (v - min) / (max - min)) * (H - pad.top - pad.bottom);

  const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${metric.label}の推移` }, box);

  // Gridlines + y ticks (solid hairlines, recessive)
  ticks.forEach(v => {
    svgEl('line', { x1: pad.left, x2: W - pad.right, y1: y(v), y2: y(v), class: 'tl-grid' }, svg);
    svgEl('text', { x: pad.left - 8, y: y(v) + 4, class: 'tl-axis', 'text-anchor': 'end' }, svg).textContent = v;
  });
  // Year bands: boundary hairline + label centred in the year
  for (let yr = firstYear; yr <= lastYear; yr++) {
    const a = x(Date.UTC(yr, 0, 1)), b = x(Date.UTC(yr + 1, 0, 1));
    if (yr > firstYear) svgEl('line', { x1: a, x2: a, y1: pad.top, y2: H - pad.bottom, class: 'tl-grid' }, svg);
    svgEl('text', { x: (a + b) / 2, y: H - 8, class: 'tl-axis', 'text-anchor': 'middle' }, svg).textContent = yr;
  }

  // Songs: muted dots, each a link with a 24px+ hit area
  songs.forEach(s => {
    const v = metric.get(s);
    if (v == null) return;
    const a = svgEl('a', { href: songUrl(s.id), class: 'tl-dot', 'aria-label': `${s.title} ${metric.label} ${fmt(metric, v)}` }, svg);
    const cx = x(timeOf(s)), cy = y(v);
    svgEl('circle', { cx, cy, r: 13, fill: 'transparent' }, a);
    svgEl('circle', { cx, cy, r: 4, fill: MUTED_DOT, stroke: SURFACE, 'stroke-width': 2, class: 'tl-dot-mark' }, a);
    const tip = () => showTip(a, `<strong>${fmt(metric, v)}</strong> ${escapeHtml(metric.label)}<br><span>${escapeHtml(s.title)}</span><br><small>${escapeHtml(s.release_date)}</small>`);
    a.addEventListener('pointerenter', tip);
    a.addEventListener('focus', tip);
    a.addEventListener('pointerleave', hideTip);
    a.addEventListener('blur', hideTip);
  });

  // Yearly mean: the emphasised series (2px line + ringed markers at mid-year)
  const pts = stats.map(st => [x(Date.UTC(+st.year, 6, 1)), y(st.avg[metric.key]), st]);
  svgEl('polyline', { points: pts.map(p => p[0] + ',' + p[1]).join(' '), fill: 'none', stroke: ACCENT, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  pts.forEach(([px, py, st]) => {
    const g = svgEl('g', { class: 'tl-mean', tabindex: 0, 'aria-label': `${st.year}年の平均 ${fmt(metric, st.avg[metric.key])}（${st.songs.length}曲）` }, svg);
    svgEl('circle', { cx: px, cy: py, r: 13, fill: 'transparent' }, g);
    svgEl('circle', { cx: px, cy: py, r: 5, fill: ACCENT, stroke: SURFACE, 'stroke-width': 2 }, g);
    const tip = () => showTip(g, `<strong>${fmt(metric, st.avg[metric.key])}</strong> ${st.year}年の平均<br><small>${st.songs.length}曲</small>`);
    g.addEventListener('pointerenter', tip);
    g.addEventListener('focus', tip);
    g.addEventListener('pointerleave', hideTip);
    g.addEventListener('blur', hideTip);
  });
  // Direct label only at the end of the line
  const [lx, ly, last] = pts[pts.length - 1];
  svgEl('text', { x: lx + 10, y: ly + 4, class: 'tl-endlabel' }, svg).textContent = fmt(metric, last.avg[metric.key]);
}

/* ---------- Tooltip ---------- */
const tipEl = () => document.getElementById('tlTooltip');
function showTip(target, html) {
  const t = tipEl();
  t.innerHTML = html;
  t.hidden = false;
  const r = target.getBoundingClientRect();
  const tw = t.offsetWidth, th = t.offsetHeight;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
  let top = r.top - th - 8;
  if (top < 8) top = r.bottom + 8;
  t.style.left = left + 'px';
  t.style.top = top + 'px';
}
function hideTip() { tipEl().hidden = true; }

/* ---------- Table view ---------- */
function renderTable() {
  const stats = yearlyStats();
  const head = '<thead><tr><th>年</th><th>曲数</th>' + METRICS.map(m => `<th class="${m === metric ? 'is-current' : ''}">${escapeHtml(m.label)}</th>`).join('') + '</tr></thead>';
  const body = '<tbody>' + stats.map(st => '<tr><th>' + st.year + '</th><td>' + st.songs.length + '</td>' +
    METRICS.map(m => `<td class="${m === metric ? 'is-current' : ''}">${fmt(m, st.avg[m.key])}</td>`).join('') + '</tr>').join('') + '</tbody>';
  document.getElementById('tlTable').innerHTML = head + body;
}

/* ---------- Metric selector (one row above the chart) ---------- */
function renderMetrics() {
  const box = document.getElementById('tlMetrics');
  box.innerHTML = METRICS.map(m => `<button type="button" class="tl-metric" data-key="${m.key}" aria-pressed="${m === metric}">${escapeHtml(m.label)}</button>`).join('');
  box.querySelectorAll('.tl-metric').forEach(b => b.addEventListener('click', () => {
    metric = METRICS.find(m => m.key === b.dataset.key);
    update();
  }));
}

function update() {
  document.querySelectorAll('.tl-metric').forEach(b => b.setAttribute('aria-pressed', b.dataset.key === metric.key));
  document.getElementById('tlChartTitle').textContent = `${metric.label}の推移`;
  renderChart();
  renderTable();
  // ?m=<metric key>; the default (BPM) is omitted
  const p = new URLSearchParams(location.search);
  metric === METRICS[0] ? p.delete('m') : p.set('m', metric.key);
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
}

/* ---------- Release-order list grouped by year ---------- */
function renderYears() {
  const stats = yearlyStats();
  document.getElementById('tlYears').innerHTML = stats.map(st => `
    <section class="tl-year" id="y${st.year}">
      <h2 class="tl-year-title">${st.year}<span class="tl-year-meta">${st.songs.length}曲 ・ 平均 BPM ${Math.round(st.avg.bpm)}</span></h2>
      <ol class="tl-songs">
        ${[...st.songs].sort((a, b) => timeOf(a) - timeOf(b)).map(s => `
          <li class="tl-song">
            <time class="tl-date" datetime="${escapeHtml(s.release_date)}">${escapeHtml(s.release_date.slice(5).replace('-', '/'))}</time>
            <a class="tl-song-card" href="${songUrl(s.id)}">
              ${s.thumbnail_url ? `<img src="${escapeHtml(s.thumbnail_url)}" alt="" loading="lazy">` : '<span class="tl-noimg"></span>'}
              <span class="tl-song-body">
                <span class="tl-song-title">${escapeHtml(s.title)}</span>
                <span class="tl-song-meta">♪ ${escapeHtml(s.composer)} ・ Key ${escapeHtml(s.key)} ・ BPM ${escapeHtml(s.bpm)}</span>
                ${s.summary ? `<span class="tl-song-summary">${escapeHtml(s.summary)}</span>` : ''}
              </span>
            </a>
          </li>`).join('')}
      </ol>
    </section>`).join('');
}

fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    songs = data.songs.filter(s => s.release_date && s.scores);
    metric = METRICS.find(m => m.key === new URLSearchParams(location.search).get('m')) || METRICS[0];
    renderMetrics();
    renderYears();
    update();
    const setNavH = () => document.documentElement.style.setProperty('--nav-h', document.querySelector('.nav').offsetHeight + 'px');
    setNavH();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { setNavH(); renderChart(); }, 150); });
  })
  .catch(err => console.error('Failed to load songs.json', err));
