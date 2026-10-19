/* ====== Shared definitions — loaded before each page script ====== */

/* 9-axis score definitions (order is the radar / table column order) */
const AXES = [
  { key: 'cute',       label: 'キュート',   shortLabel: 'Cute',  color: '#f0508c' },
  { key: 'cool',       label: 'クール',     shortLabel: 'Cool',  color: '#3a8ee6' },
  { key: 'emo',        label: 'エモ',       shortLabel: 'Emo',   color: '#9b4fe0' },
  { key: 'childlike',  label: '子供心',     shortLabel: 'Child', color: '#e0a800' },
  { key: 'happy',      label: 'ハッピー度', shortLabel: 'Happy', color: '#1fb877' },
  { key: 'party',      label: 'お祭り感',   shortLabel: 'Party', color: '#f08c00' },
  { key: 'band',       label: 'バンド',     shortLabel: 'Band',  color: '#c46a2a' },
  { key: 'speed',      label: '疾走感',     shortLabel: 'Speed', color: '#ec4545' },
  { key: 'complexity', label: '複雑度',     shortLabel: 'Cmplx', color: '#7a5cf0' },
];

/* Co-written credits are grouped under one representative name */
const COMPOSER_NAME_MAP = {
  '徳田光希、大竹智之': '徳田光希',
  '草川瞬、RUSH EYE': '草川瞬',
};
function composerKeyOf(composer) {
  return COMPOSER_NAME_MAP[composer] || composer || '';
}

/*
 * Colors per composer (keyed by representative name).
 * stroke / fill: radar charts and tabs (composer.html)
 * hBase / hRange: heatmap hue range from score 0 to 10 (heatmap.html)
 */
const COMPOSER_COLORS = {
  'NNBS.':               { stroke: '#b080f0', fill: 'rgba(176,128,240,.2)', hBase: 260, hRange: 80 }, // purple → pink
  'AILI':                { stroke: '#50c8e8', fill: 'rgba(80,200,232,.2)',  hBase: 190, hRange: 60 }, // teal → blue
  'しえりーほ':          { stroke: '#f0a040', fill: 'rgba(240,160,64,.2)',  hBase: 30,  hRange: 40 }, // orange → yellow
  '山崎あおい':          { stroke: '#60d880', fill: 'rgba(96,216,128,.2)',  hBase: 100, hRange: 50 }, // green → teal
  '阿久津健太郎':        { stroke: '#f06060', fill: 'rgba(240,96,96,.2)',   hBase: 0,   hRange: 30 }, // red
  '古橋勇紀':            { stroke: '#f080a8', fill: 'rgba(240,128,168,.2)', hBase: 340, hRange: 30 }, // rose
  '早川博隆/柿迫ヒカル': { stroke: '#d8c050', fill: 'rgba(216,192,80,.2)',  hBase: 50,  hRange: 30 }, // gold
  '草川瞬':              { stroke: '#a8d840', fill: 'rgba(168,216,64,.2)',  hBase: 85,  hRange: 15 }, // chartreuse
  '徳田光希':            { stroke: '#50d8c0', fill: 'rgba(80,216,192,.2)',  hBase: 160, hRange: 40 }, // cyan
};
/* Fallback for a composer not yet listed above (tools/validate.js reports it) */
const DEFAULT_COMPOSER_COLOR = { stroke: '#a0a0b8', fill: 'rgba(160,160,184,.2)', hBase: 260, hRange: 80 };
function composerColorOf(composer) {
  return COMPOSER_COLORS[composerKeyOf(composer)] || DEFAULT_COMPOSER_COLOR;
}

/* Cosine similarity of two songs' 9-axis scores (recommend.html, song.html) */
function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (const ax of AXES) {
    const va = a.scores[ax.key] || 0;
    const vb = b.scores[ax.key] || 0;
    dot  += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Area names of the position maps: the four quadrants and the center (map.html, song.html) */
const MAP_AREAS = {
  mapA: { tl: '胸キュン☆ブチ上げ', tr: '攻め！全力アゲ',       bl: '甘くてじんわり', br: '大人のエモ',     c: 'ど真ん中アイドル' },
  mapB: { tl: 'デジタル爆走',      tr: 'ロック全開！',         bl: 'チルいビート',   br: 'まったりバンド', c: '王道ポップ' },
  mapC: { tl: '洗練ポジティブ',    tr: 'わちゃわちゃパラダイス', bl: 'ヒリヒリ覚醒',   br: '切なかわいい',   c: '等身大ガール' },
};
/* Radius of the center area, in map coordinates (axes run -10 to 10) */
const MAP_CENTER_RADIUS = 3;
/* Area key of a map coordinate: 'c' near the origin, otherwise the quadrant
   (a point on an axis counts as the upper / right side) */
function mapQuadrantOf(p) {
  if (Math.hypot(p.x, p.y) <= MAP_CENTER_RADIUS) return 'c';
  return (p.y >= 0 ? 't' : 'b') + (p.x >= 0 ? 'r' : 'l');
}

/* Link to a song's detail page */
function songUrl(id) {
  return 'song.html?id=' + encodeURIComponent(id);
}

/* 320x180 YouTube thumbnail for small displays (maps, lists); maxresdefault is 1280x720.
   (hqdefault / sddefault are 4:3 with black bars, so they don't crop well.) */
function smallThumb(url) {
  return url ? url.replace('/maxresdefault.jpg', '/mqdefault.jpg') : url;
}
