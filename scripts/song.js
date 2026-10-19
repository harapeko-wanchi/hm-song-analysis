/* ====== Song detail page: song.html?id=<song id> ====== */

const MAPS = [
  { key: 'mapA', def: 'mapA_definition', name: 'ステージ', tab: 'stage' },
  { key: 'mapB', def: 'mapB_definition', name: 'サウンド', tab: 'sound' },
  { key: 'mapC', def: 'mapC_definition', name: 'ムード',   tab: 'mood' },
];
const MAP_RANGE = 10.5;  // same as map.js

/* Set up a canvas for crisp drawing at the device pixel ratio; returns a context in CSS px */
function hiDpiContext(canvas, w, h) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

function renderHeader(song) {
  const credits = [
    song.lyricist && `作詞: ${escapeHtml(song.lyricist)}`,
    song.composer && `作曲: ${escapeHtml(song.composer)}`,
    song.arranger && `編曲: ${escapeHtml(song.arranger)}`,
  ].filter(Boolean).join('<span class="sd-sep">/</span>');
  const thumb = song.thumbnail_url
    ? `<a class="sd-thumb" href="${escapeHtml(song.youtube_url || '#')}" target="_blank" rel="noopener">
         <img src="${escapeHtml(song.thumbnail_url)}" alt="${escapeHtml(song.title)}">
         ${song.youtube_url ? '<span class="sd-play">▶</span>' : ''}
       </a>`
    : `<div class="sd-thumb sd-thumb-empty">${escapeHtml(song.title)}</div>`;
  return `
    <header class="sd-header">
      ${thumb}
      <div class="sd-head-body">
        <h1 class="sd-title">${escapeHtml(song.title)}</h1>
        <div class="sd-meta">
          <span>${escapeHtml(song.release_date)}</span>
          <span>Key: ${escapeHtml(song.key)}</span>
          <span>BPM ${escapeHtml(song.bpm)}</span>
        </div>
        <div class="sd-credits">${credits}</div>
        ${song.summary ? `<p class="sd-summary">${escapeHtml(song.summary)}</p>` : ''}
        <div class="tags">${(song.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>
        ${song.youtube_url ? `<a class="sd-youtube" href="${escapeHtml(song.youtube_url)}" target="_blank" rel="noopener">▶ YouTube で聴く</a>` : ''}
      </div>
    </header>`;
}

function renderScores(song) {
  const rows = AXES.map(ax => {
    const v = song.scores?.[ax.key];
    return `<div class="sd-score-row">
      <span class="sd-score-label" style="color:${ax.color}">${ax.label}</span>
      <span class="sd-score-val">${v ?? '–'}</span>
    </div>`;
  }).join('');
  return `
    <section class="sd-card sd-radar-card">
      <h2 class="sd-h2">9軸スコア</h2>
      <canvas id="sdRadar" class="sd-radar" aria-label="9軸スコアのレーダーチャート"></canvas>
      <div class="sd-score-list">${rows}</div>
    </section>`;
}

function renderPositions(song, data) {
  const items = MAPS.map((m, i) => {
    const p = song[m.key] || { x: 0, y: 0 };
    return `<a class="sd-mini" href="map.html?m=${m.tab}&song=${encodeURIComponent(song.id)}">
      <canvas id="sdMini${i}" aria-label="${m.name}マップ上の位置"></canvas>
      <span class="sd-mini-name">${m.name}</span>
      <span class="sd-mini-area q-${mapQuadrantOf(p)}">${escapeHtml(MAP_AREAS[m.key][mapQuadrantOf(p)])}</span>
      <span class="sd-mini-coord">(${p.x}, ${p.y})</span>
      <span class="sd-mini-axes">${escapeHtml(data[m.def]?.x_label || '')}<br>${escapeHtml(data[m.def]?.y_label || '')}</span>
    </a>`;
  }).join('');
  return `
    <section class="sd-card">
      <h2 class="sd-h2">ポジションマップ</h2>
      <div class="sd-minis">${items}</div>
    </section>`;
}

function renderHooks(song) {
  if (!song.lyrics_hooks?.length) return '';
  return `
    <section class="sd-card">
      <h2 class="sd-h2">歌詞フック</h2>
      <div class="sd-hooks">${song.lyrics_hooks.map(h => `<span class="hook">${escapeHtml(h)}</span>`).join('')}</div>
    </section>`;
}

function renderSimilar(song, songs) {
  const similar = songs
    .filter(s => s.id !== song.id && s.scores)
    .map(s => ({ song: s, sim: cosineSim(song, s) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5);
  const cards = similar.map(({ song: s, sim }) => `
    <a class="sd-sim" href="${songUrl(s.id)}">
      ${s.thumbnail_url ? `<img src="${escapeHtml(s.thumbnail_url)}" alt="" loading="lazy">` : '<span class="sd-sim-noimg"></span>'}
      <span class="sd-sim-title">${escapeHtml(s.title)}</span>
      <span class="sd-sim-pct">${(sim * 100).toFixed(1)}%</span>
    </a>`).join('');
  return `
    <section class="sd-card">
      <h2 class="sd-h2">似ている曲 <a class="sd-more" href="recommend.html#${encodeURIComponent(song.id)}">レコメンドで詳しく →</a></h2>
      <div class="sd-sims">${cards}</div>
    </section>`;
}

function renderPager(song, songs) {
  const i = songs.findIndex(s => s.id === song.id);
  const newer = songs[i - 1], older = songs[i + 1];  // songs.json is newest first
  const link = (s, cls, label) => s
    ? `<a class="sd-pager-link ${cls}" href="${songUrl(s.id)}"><span class="sd-pager-dir">${label}</span><span>${escapeHtml(s.title)}</span></a>`
    : '<span></span>';
  return `<nav class="sd-pager" aria-label="前後の曲">${link(older, 'prev', '← ひとつ前の曲')}${link(newer, 'next', '次の曲 →')}</nav>`;
}

function drawSongRadar(song) {
  const canvas = document.getElementById('sdRadar');
  const card = canvas.parentElement;
  const cs = getComputedStyle(card);
  const inner = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const size = Math.max(200, Math.min(360, inner));
  const ctx = hiDpiContext(canvas, size, size);
  drawRadar(ctx, size, size, [{
    values: song.scores, visible: true,
    stroke: '#e8337f', fill: 'rgba(232,51,127,.18)', dotRadius: 3, lineWidth: 2,
  }], { labelMargin: 46, labelOffset: 20, labelFontSize: 12, showGridLabels: false });
}

function drawMiniMaps(song, songs) {
  const rootStyle = getComputedStyle(document.documentElement);
  MAPS.forEach((m, i) => {
    const canvas = document.getElementById('sdMini' + i);
    const size = 130;
    const ctx = hiDpiContext(canvas, size, size);
    const toPx = (x, y) => [(x + MAP_RANGE) / (MAP_RANGE * 2) * size, (MAP_RANGE - y) / (MAP_RANGE * 2) * size];

    // Quadrant tints, as on map.html
    const half = size / 2;
    [['tl', 0, 0], ['tr', half, 0], ['bl', 0, half], ['br', half, half]].forEach(([q, x, y]) => {
      ctx.fillStyle = rootStyle.getPropertyValue('--q-' + q);
      ctx.fillRect(x, y, half, half);
    });
    ctx.fillStyle = rootStyle.getPropertyValue('--q-c');
    ctx.beginPath(); ctx.arc(half, half, MAP_CENTER_RADIUS / MAP_RANGE * half, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(45,35,70,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(45,35,70,.18)';
    songs.forEach(s => {
      if (s.id === song.id || !s[m.key]) return;
      const [x, y] = toPx(s[m.key].x, s[m.key].y);
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    });

    const p = song[m.key];
    if (!p) return;
    const [x, y] = toPx(p.x, p.y);
    ctx.fillStyle = '#e8337f';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(232,51,127,.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
  });
}

function showStatus(html) {
  document.getElementById('song').innerHTML = `<p class="sd-status">${html}</p>`;
}

fetch('songs.json')
  .then(r => r.json())
  .then(async data => {
    const id = new URLSearchParams(location.search).get('id');
    const song = data.songs.find(s => s.id === id);
    if (!song) {
      showStatus(`曲が見つかりませんでした。<a href="songs.html">楽曲一覧</a>から選んでください。`);
      return;
    }
    document.title = `${song.title} — Hey!Mommy! Song Analysis`;

    const main = document.getElementById('song');
    main.innerHTML = `
      <a class="sd-back" href="songs.html">← 楽曲一覧</a>
      ${renderHeader(song)}
      <div class="sd-grid">
        ${renderScores(song)}
        ${renderPositions(song, data)}
      </div>
      ${renderHooks(song)}
      ${renderSimilar(song, data.songs)}
      <section class="sd-card sd-analysis">
        <h2 class="sd-h2">楽曲分析</h2>
        <div class="md" id="sdAnalysis"><p class="sd-status">読み込み中…</p></div>
      </section>
      ${renderPager(song, data.songs)}`;

    drawSongRadar(song);
    drawMiniMaps(song, data.songs);
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => drawSongRadar(song), 150); });

    // id has been matched against songs.json above, so it is safe to use in the path
    const box = document.getElementById('sdAnalysis');
    try {
      const res = await fetch(`analysis/${encodeURIComponent(song.id)}.md`);
      if (!res.ok) throw new Error(res.status);
      // The page already shows the title, so drop the file's leading "# … — 楽曲分析"
      const md = (await res.text()).replace(/^#\s[^\n]*\n/, '');
      box.innerHTML = renderMarkdown(md);
    } catch (err) {
      box.innerHTML = '<p class="sd-status">楽曲分析を読み込めませんでした。</p>';
      console.error('Failed to load analysis', err);
    }
  })
  .catch(err => {
    showStatus('データを読み込めませんでした。');
    console.error('Failed to load songs.json', err);
  });
