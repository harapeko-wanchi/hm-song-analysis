const SCORE_GROUPS = [
  {
    label: '表現',
    axes: [
      { key: 'cute',        label: 'キュート',   color: '#f06c9c' },
      { key: 'cool',        label: 'クール',     color: '#6cacf0' },
      { key: 'emo',         label: 'エモ',       color: '#b06cf0' },
    ]
  },
  
  {
    label: 'キャラクター',
    axes: [
      { key: 'childlike',   label: '子供心',     color: '#f0d860' },
      { key: 'happy',      label: 'ハッピー度',   color: '#6cf0b0' },
      { key: 'party',       label: 'お祭り感',   color: '#fcb040' },
    ]
  },
  {
    label: 'サウンド',
    axes: [
      { key: 'band',        label: 'バンド',     color: '#d08040' },
      { key: 'speed',       label: '疾走感',     color: '#f06c6c' },
      { key: 'complexity',  label: '複雑度',     color: '#a080f0' },
    ]
  }
];

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
          <div class="score-row">
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
      <div class="card-title">${song.title}</div>
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
    </div>`;
  return card;
}

fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById('cards');
    data.songs.forEach(song => grid.appendChild(buildCard(song)));
  })
  .catch(err => console.error('Failed to load songs.json', err));
