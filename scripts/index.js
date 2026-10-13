/* Card score sections: axis keys refer to AXES in common.js */
const SCORE_GROUPS = [
  { label: '表現',         keys: ['cute', 'cool', 'emo'] },
  { label: 'キャラクター', keys: ['childlike', 'happy', 'party'] },
  { label: 'サウンド',     keys: ['band', 'speed', 'complexity'] },
].map(g => ({ label: g.label, axes: g.keys.map(k => AXES.find(a => a.key === k)) }));

function buildCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';

  // Thumbnail header
  let thumbHTML;
  if (song.thumbnail_url) {
    const href = song.youtube_url || '#';
    thumbHTML = `
      <a href="${href}" target="_blank" rel="noopener" class="card-thumb">
        <img src="${song.thumbnail_url}" alt="${song.title}" loading="lazy">
        <div class="play-icon">▶</div>
      </a>`;
  } else {
    thumbHTML = `<div class="card-thumb-placeholder">${song.title}</div>`;
  }

  // Scores — grouped with section labels
  let barsHTML;
  if (song.scores) {
    barsHTML = SCORE_GROUPS.map(group => {
      const rows = group.axes.map(ax => {
        const val = song.scores[ax.key];
        if (val == null) return '';
        const pct = (val / 10 * 100).toFixed(0);
        return `
          <div class="score-row" data-axis="${ax.key}">
            <span class="score-label">${ax.label}</span>
            <div class="score-bar-bg">
              <div class="score-bar" style="width:${pct}%;background:${ax.color}"></div>
            </div>
            <span class="score-val">${val}</span>
          </div>`;
      }).join('');
      if (!rows.trim()) return '';
      return `<div class="score-group">
        <div class="score-group-label">${group.label}</div>
        ${rows}
      </div>`;
    }).join('');
  } else {
    barsHTML = '<div class="unscored">未分析</div>';
  }

  // Tags
  const tagsHTML = (song.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');

  // Lyrics hooks
  const hooksHTML = (song.lyrics_hooks || []).map(t => `<span class="hook">${t}</span>`).join('');



  card.innerHTML = `
    ${thumbHTML}
    <div class="card-body">
      <a class="card-title song-link" href="${songUrl(song.id)}">${song.title}</a>
      <div class="card-meta">
        ${song.release_date ? `<span>${song.release_date}</span>` : ''}
        ${song.key ? `<span>Key: ${song.key}</span>` : ''}
        ${song.bpm ? `<span>BPM ${song.bpm}</span>` : ''}
        ${song.composer ? `<span>♪ ${song.composer}${song.arranger && song.arranger !== song.composer ? ' / 編曲: ' + song.arranger : ''}</span>` : ''}
      </div>
      ${song.note ? `<div class="card-note">${song.note}</div>` : ''}
      <div class="score-section">${barsHTML}</div>
      ${song.summary ? `<div class="card-summary">${song.summary}</div>` : ''}
      ${song.harmony_note ? `<details class="card-details"><summary class="card-details-summary">🎵 和声解析</summary><div class="harmony-note">${song.harmony_note}</div></details>` : ''}
      ${hooksHTML ? `<details class="card-details"><summary class="card-details-summary">🎤 歌詞フック</summary><div class="hooks-section">${hooksHTML}</div></details>` : ''}
      <div class="tags">${tagsHTML}</div>
      <a class="card-detail-link" href="${songUrl(song.id)}">詳しい分析を読む →</a>
    </div>`;
  return card;
}

/* ====== Filter & sort ====== */

const composerKey = song => composerKeyOf(song.composer);
const releaseYear = song => (song.release_date || '').slice(0, 4);

const AXIS_LIST = SCORE_GROUPS.flatMap(g => g.axes);
// defaultOrder: the direction a sort starts in when it is selected
const SORTS = [
  { id: 'release', label: 'リリース日', defaultOrder: 'desc' },
  { id: 'title',   label: '曲名',       defaultOrder: 'asc' },
  { id: 'bpm',     label: 'BPM',        defaultOrder: 'desc' },
  ...AXIS_LIST.map(ax => ({ id: ax.key, label: ax.label, defaultOrder: 'desc', axis: ax.key })),
];
const DEFAULT_SORT = 'release';

const normalize = s => String(s).normalize('NFKC').toLowerCase();

let entries = [];   // [{ song, card, index, haystack }]
const view = { q: '', sort: DEFAULT_SORT, order: 'desc', composers: new Set(), years: new Set() };

function sortValue(entry, sort) {
  const s = entry.song;
  if (sort.id === 'release') return s.release_date || '';
  if (sort.id === 'title') return s.title || '';
  if (sort.id === 'bpm') return s.bpm ?? null;
  return s.scores?.[sort.axis] ?? null;
}

function compareEntries(a, b, sort, dir) {
  const va = sortValue(a, sort), vb = sortValue(b, sort);
  // Songs without a value always go last, whatever the direction
  if (va == null || vb == null) {
    if (va != null) return -1;
    if (vb != null) return 1;
  } else {
    const c = typeof va === 'string' ? va.localeCompare(vb, 'ja') : va - vb;
    if (c !== 0) return c * dir;
  }
  return a.index - b.index;  // ties keep the songs.json order (newest first)
}

function applyView() {
  const terms = normalize(view.q).split(/\s+/).filter(Boolean);
  const visible = entries.filter(e =>
    (view.composers.size === 0 || view.composers.has(composerKey(e.song))) &&
    (view.years.size === 0 || view.years.has(releaseYear(e.song))) &&
    terms.every(t => e.haystack.includes(t))
  );

  const sort = SORTS.find(s => s.id === view.sort);
  const dir = view.order === 'asc' ? 1 : -1;
  visible.sort((a, b) => compareEntries(a, b, sort, dir));

  const grid = document.getElementById('cards');
  const shown = new Set(visible);
  entries.forEach(e => { if (!shown.has(e)) e.card.remove(); });
  visible.forEach(e => {
    grid.appendChild(e.card);
    e.card.querySelectorAll('.score-row').forEach(row => row.classList.toggle('sorted', row.dataset.axis === sort.axis));
  });

  const filtered = terms.length > 0 || view.composers.size > 0 || view.years.size > 0;
  document.getElementById('ltCount').textContent = filtered
    ? `${visible.length} / ${entries.length} 曲`
    : `全 ${entries.length} 曲`;
  document.getElementById('ltEmpty').hidden = visible.length > 0;
  document.getElementById('ltReset').hidden = !filtered && view.sort === DEFAULT_SORT && view.order === 'desc';

  document.getElementById('ltOrder').textContent = view.order === 'asc' ? '↑ 昇順' : '↓ 降順';
  document.querySelectorAll('.lt-chip').forEach(chip => {
    const set = chip.dataset.kind === 'composer' ? view.composers : view.years;
    chip.setAttribute('aria-pressed', set.has(chip.dataset.value) ? 'true' : 'false');
  });
}

/*
 * URL format: ?q=<keyword>&sort=<release|title|bpm|axis key>&order=<asc|desc>&composer=<name>&year=<yyyy>
 * composer / year may repeat. Parameters at their default value are omitted.
 * Values read from the URL are validated against the loaded songs before use.
 */
function writeUrl() {
  const p = new URLSearchParams();
  if (view.q) p.set('q', view.q);
  const sort = SORTS.find(s => s.id === view.sort);
  if (view.sort !== DEFAULT_SORT) p.set('sort', view.sort);
  if (view.order !== sort.defaultOrder) p.set('order', view.order);
  view.composers.forEach(c => p.append('composer', c));
  view.years.forEach(y => p.append('year', y));
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}

function readUrl(composerNames, years) {
  const p = new URLSearchParams(location.search);
  view.q = (p.get('q') || '').slice(0, 100);
  const sort = SORTS.find(s => s.id === p.get('sort')) || SORTS.find(s => s.id === DEFAULT_SORT);
  view.sort = sort.id;
  view.order = ['asc', 'desc'].includes(p.get('order')) ? p.get('order') : sort.defaultOrder;
  view.composers = new Set(p.getAll('composer').filter(c => composerNames.includes(c)));
  view.years = new Set(p.getAll('year').filter(y => years.includes(y)));
}

function buildChips(containerId, kind, items) {
  const box = document.getElementById(containerId);
  items.forEach(({ value, label, count, title }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'lt-chip';
    chip.dataset.kind = kind;
    chip.dataset.value = value;
    if (title) chip.title = title;
    chip.innerHTML = `${label}<span class="lt-chip-count">${count}</span>`;
    chip.addEventListener('click', () => {
      const set = kind === 'composer' ? view.composers : view.years;
      set.has(value) ? set.delete(value) : set.add(value);
      update();
    });
    box.appendChild(chip);
  });
}

function update() {
  applyView();
  writeUrl();
}

function initToolbar(songs) {
  // Composer chips: most songs first, like composer.html
  const byComposer = {};
  songs.forEach(s => {
    const key = composerKey(s);
    if (!key) return;
    (byComposer[key] ||= { count: 0, names: new Set() }).count++;
    byComposer[key].names.add(s.composer);
  });
  const composerItems = Object.entries(byComposer)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], 'ja'))
    .map(([key, v]) => ({ value: key, label: key, count: v.count, title: [...v.names].join(' / ') }));

  // Year chips: newest first
  const byYear = {};
  songs.forEach(s => { const y = releaseYear(s); if (y) byYear[y] = (byYear[y] || 0) + 1; });
  const yearItems = Object.keys(byYear).sort().reverse()
    .map(y => ({ value: y, label: y, count: byYear[y] }));

  readUrl(composerItems.map(i => i.value), yearItems.map(i => i.value));

  buildChips('ltComposers', 'composer', composerItems);
  buildChips('ltYears', 'year', yearItems);

  const select = document.getElementById('ltSort');
  SORTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.axis ? `スコア: ${s.label}` : s.label;
    select.appendChild(opt);
  });
  select.value = view.sort;
  select.addEventListener('change', () => {
    view.sort = select.value;
    view.order = SORTS.find(s => s.id === view.sort).defaultOrder;
    update();
  });

  document.getElementById('ltOrder').addEventListener('click', () => {
    view.order = view.order === 'asc' ? 'desc' : 'asc';
    update();
  });

  const search = document.getElementById('ltSearch');
  search.value = view.q;
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { view.q = search.value.trim(); update(); }, 150);
  });

  document.getElementById('ltReset').addEventListener('click', () => {
    Object.assign(view, { q: '', sort: DEFAULT_SORT, order: 'desc', composers: new Set(), years: new Set() });
    search.value = '';
    select.value = DEFAULT_SORT;
    update();
  });
}

fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    entries = data.songs.map((song, index) => ({
      song,
      index,
      card: buildCard(song),
      haystack: normalize([
        song.title, song.lyricist, song.composer, song.arranger, song.key,
        song.summary, song.harmony_note,
        ...(song.tags || []), ...(song.lyrics_hooks || []),
      ].filter(Boolean).join('\n')),
    }));
    initToolbar(data.songs);
    applyView();
  })
  .catch(err => console.error('Failed to load songs.json', err));
