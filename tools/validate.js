#!/usr/bin/env node
/*
 * songs.json と、それに依存する JS / Markdown の整合性チェック。
 * 使い方: リポジトリ直下で `node tools/validate.js`
 * エラーがあれば終了コード 1。警告だけなら 0。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const errors = [];
const warnings = [];
const error = msg => errors.push(msg);
const warn = msg => warnings.push(msg);

/*
 * JS ファイルから `const NAME = <リテラル>;` のリテラル部分を取り出して評価する。
 * ブラウザ用のファイルを丸ごと実行せずに、定数だけを読むため。
 */
function readConst(rel, name) {
  const src = read(rel);
  const m = new RegExp(`const\\s+${name}\\s*=\\s*`).exec(src);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0, quote = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '/' && src[i + 1] === '/') i = src.indexOf('\n', i);
    else if (ch === '/' && src[i + 1] === '*') i = src.indexOf('*/', i) + 1;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') { if (--depth === 0) { i++; break; } }
  }
  return vm.runInNewContext('(' + src.slice(start, i) + ')');
}

/* ====== songs.json ====== */
let data;
try {
  data = JSON.parse(read('songs.json'));
} catch (e) {
  console.error('songs.json を読めません: ' + e.message);
  process.exit(1);
}
const songs = data.songs || [];
const scale = data.scoring_scale || {};
const axisKeys = scale.axes || [];
const label = s => `${s.id || '(id なし)'}`;

const REQUIRED = ['id', 'title', 'release_date', 'composer', 'key', 'bpm', 'scores',
  'mapA', 'mapB', 'mapC', 'tags', 'harmony_note', 'lyrics_hooks', 'summary'];
const NULLABLE = ['lyricist', 'arranger', 'youtube_url', 'thumbnail_url'];

const ids = new Set();
let prevDate = null;
songs.forEach((s, i) => {
  const at = `songs[${i}] ${label(s)}`;

  REQUIRED.forEach(k => { if (s[k] == null || s[k] === '') error(`${at}: ${k} がありません`); });
  NULLABLE.forEach(k => { if (!(k in s)) error(`${at}: ${k} フィールドがありません（無い場合は null）`); });

  // id: 共有 URL のキーなので重複・不正文字は致命的
  if (s.id != null) {
    if (!/^[a-z0-9_]+$/.test(s.id)) error(`${at}: id は英小文字・数字・_ のみにしてください`);
    if (ids.has(s.id)) error(`${at}: id が重複しています`);
    ids.add(s.id);
  }

  // 並び順: 新しい曲が先頭
  if (s.release_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.release_date) || isNaN(Date.parse(s.release_date))) {
      error(`${at}: release_date は YYYY-MM-DD 形式にしてください（${s.release_date}）`);
    } else {
      if (prevDate && s.release_date > prevDate) error(`${at}: 配列は新しい曲が先頭の順にしてください（${s.release_date} が ${prevDate} より後に来ています）`);
      prevDate = s.release_date;
    }
  }

  if (s.bpm != null && (typeof s.bpm !== 'number' || s.bpm < 60 || s.bpm > 260)) warn(`${at}: bpm が想定外の値です（${s.bpm}）`);

  // scores: scoring_scale.axes と同じ軸、範囲内、step 刻み
  if (s.scores) {
    const keys = Object.keys(s.scores);
    axisKeys.filter(k => !keys.includes(k)).forEach(k => error(`${at}: scores.${k} がありません`));
    keys.filter(k => !axisKeys.includes(k)).forEach(k => error(`${at}: scores.${k} は scoring_scale.axes にない軸です`));
    keys.forEach(k => {
      const v = s.scores[k];
      if (typeof v !== 'number' || v < scale.min || v > scale.max) error(`${at}: scores.${k} が範囲外です（${v}）`);
      else if (scale.step && Math.abs(Math.round(v / scale.step) * scale.step - v) > 1e-9) error(`${at}: scores.${k} が ${scale.step} 刻みではありません（${v}）`);
    });

    // マップ座標: 各 map*_definition の式で再計算して比較
    for (const m of ['A', 'B', 'C']) {
      const def = data[`map${m}_definition`];
      const p = s[`map${m}`];
      if (!def || !p) continue;
      for (const axis of ['x', 'y']) {
        const expected = vm.runInNewContext(def[`${axis}_formula`], { ...s.scores });
        if (typeof p[axis] !== 'number' || Math.abs(p[axis] - expected) > 0.05) {
          error(`${at}: map${m}.${axis} = ${p[axis]} ですが、式 ${def[`${axis}_formula`]} では ${+expected.toFixed(2)} です`);
        }
      }
    }
  }

  // YouTube
  if (s.youtube_url && !/^https:\/\/(youtu\.be\/|www\.youtube\.com\/watch\?v=)[\w-]{11}/.test(s.youtube_url)) warn(`${at}: youtube_url の形式が想定外です`);
  if (s.thumbnail_url && !/^https:\/\/img\.youtube\.com\/vi\/[\w-]{11}\/\w+\.jpg$/.test(s.thumbnail_url)) warn(`${at}: thumbnail_url の形式が想定外です`);
  if (!s.youtube_url) warn(`${at}: youtube_url が null です`);

  if (Array.isArray(s.tags) && s.tags.length === 0) warn(`${at}: tags が空です`);
  if (Array.isArray(s.lyrics_hooks) && s.lyrics_hooks.length === 0) warn(`${at}: lyrics_hooks が空です`);
});

/* ====== analysis/<id>.md ====== */
const mdIds = fs.readdirSync(path.join(ROOT, 'analysis')).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
songs.forEach(s => { if (s.id && !mdIds.includes(s.id)) error(`analysis/${s.id}.md がありません`); });
mdIds.filter(id => !ids.has(id)).forEach(id => error(`analysis/${id}.md に対応する曲が songs.json にありません`));

/* ====== JS 内にハードコードされたデータ ====== */
const nameMap = readConst('scripts/composer.js', 'COMPOSER_NAME_MAP') || {};
const profiles = readConst('scripts/composer.js', 'COMPOSER_PROFILES') || {};
const palette = readConst('scripts/composer.js', 'COMPOSER_PALETTE') || [];
const hues = readConst('scripts/heatmap.js', 'COMPOSER_HUES') || {};
const indexNameMap = readConst('scripts/index.js', 'COMPOSER_NAME_MAP');

const composers = [...new Set(songs.map(s => s.composer).filter(Boolean))];
composers.forEach(c => {
  const key = nameMap[c] || c;
  if (!profiles[key]) error(`scripts/composer.js: COMPOSER_PROFILES に「${key}」がありません${key !== c ? `（作曲「${c}」）` : ''}`);
  if (!hues[c]) error(`scripts/heatmap.js: COMPOSER_HUES に「${c}」がありません（songs.json の composer 文字列そのままがキー）`);
});
Object.keys(hues).filter(c => !composers.includes(c)).forEach(c => warn(`scripts/heatmap.js: COMPOSER_HUES の「${c}」はどの曲にも使われていません`));
if (composers.length > palette.length) error(`scripts/composer.js: COMPOSER_PALETTE が ${palette.length} 色しかありません（作曲家 ${composers.length} 組）`);

if (indexNameMap && JSON.stringify(indexNameMap) !== JSON.stringify(nameMap)) {
  error('scripts/index.js と scripts/composer.js の COMPOSER_NAME_MAP が一致しません');
}

// プロフィール中の「全N曲中M曲」
const countByKey = {};
songs.forEach(s => { if (s.composer) { const k = nameMap[s.composer] || s.composer; countByKey[k] = (countByKey[k] || 0) + 1; } });
for (const [key, prof] of Object.entries(profiles)) {
  for (const text of Object.values(prof)) {
    for (const m of String(text).matchAll(/全(\d+)曲中(\d+)曲/g)) {
      if (+m[1] !== songs.length || +m[2] !== countByKey[key]) {
        error(`scripts/composer.js: ${key} のプロフィール「${m[0]}」は 全${songs.length}曲中${countByKey[key] || 0}曲 のはずです`);
      }
    }
  }
}

// AXES: 各ファイルの軸キー・色がそろっているか
const axesFiles = ['compare', 'composer', 'heatmap', 'recommend', 'setlist'].map(f => `scripts/${f}.js`);
const axesDefs = axesFiles.map(f => [f, readConst(f, 'AXES')]).filter(([, v]) => v);
const groups = readConst('scripts/index.js', 'SCORE_GROUPS');
if (groups) axesDefs.push(['scripts/index.js (SCORE_GROUPS)', groups.flatMap(g => g.axes)]);
axesDefs.forEach(([f, axes]) => {
  const keys = axes.map(a => a.key).sort().join(',');
  if (keys !== [...axisKeys].sort().join(',')) error(`${f}: 軸が scoring_scale.axes と一致しません`);
});
const colorOf = {};
axesDefs.forEach(([f, axes]) => axes.forEach(a => {
  if (!a.color) return;
  if (colorOf[a.key] && colorOf[a.key].color !== a.color) warn(`${f}: 軸 ${a.key} の色 ${a.color} が ${colorOf[a.key].file} の ${colorOf[a.key].color} と違います`);
  else colorOf[a.key] = { color: a.color, file: f };
}));

/* ====== README ====== */
for (const m of read('README.md').matchAll(/全 ?(\d+) ?曲/g)) {
  if (+m[1] !== songs.length) error(`README.md: 「${m[0]}」は 全 ${songs.length} 曲 のはずです`);
}

/* ====== 結果 ====== */
warnings.forEach(w => console.log('WARN  ' + w));
errors.forEach(e => console.log('ERROR ' + e));
console.log(`\n${songs.length} 曲 / 作曲家 ${composers.length} 組: エラー ${errors.length} 件、警告 ${warnings.length} 件`);
process.exit(errors.length ? 1 : 0);
