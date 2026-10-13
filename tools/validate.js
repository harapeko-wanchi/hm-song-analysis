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

/* ====== 共通定義（scripts/common.js）と JS 内にハードコードされたデータ ====== */
// common.js は宣言だけのファイルなので、そのまま評価して定数を取り出す
const common = vm.runInNewContext(read('scripts/common.js') + ';({ AXES, COMPOSER_NAME_MAP, COMPOSER_COLORS })');
const nameMap = common.COMPOSER_NAME_MAP;
const colors = common.COMPOSER_COLORS;
const profiles = readConst('scripts/composer.js', 'COMPOSER_PROFILES') || {};
const keyOf = c => nameMap[c] || c;

const composers = [...new Set(songs.map(s => s.composer).filter(Boolean))];
const composerKeys = [...new Set(composers.map(keyOf))];
composers.forEach(c => {
  const key = keyOf(c);
  const note = key !== c ? `（作曲「${c}」）` : '';
  if (!profiles[key]) error(`scripts/composer.js: COMPOSER_PROFILES に「${key}」がありません${note}`);
  if (!colors[key]) error(`scripts/common.js: COMPOSER_COLORS に「${key}」がありません${note}`);
});
Object.keys(colors).filter(k => !composerKeys.includes(k)).forEach(k => warn(`scripts/common.js: COMPOSER_COLORS の「${k}」はどの曲にも使われていません`));
Object.keys(profiles).filter(k => !composerKeys.includes(k)).forEach(k => warn(`scripts/composer.js: COMPOSER_PROFILES の「${k}」はどの曲にも使われていません`));
Object.entries(nameMap).forEach(([from, to]) => {
  if (!composers.includes(from)) warn(`scripts/common.js: COMPOSER_NAME_MAP の「${from}」はどの曲にも使われていません`);
  if (composers.includes(to)) warn(`scripts/common.js: COMPOSER_NAME_MAP で「${from}」を「${to}」にまとめていますが、「${to}」単独の表記の曲もあります（両方まとめて扱われます）`);
});

// プロフィール中の「全N曲中M曲」
const countByKey = {};
songs.forEach(s => { if (s.composer) { const k = keyOf(s.composer); countByKey[k] = (countByKey[k] || 0) + 1; } });
for (const [key, prof] of Object.entries(profiles)) {
  for (const text of Object.values(prof)) {
    for (const m of String(text).matchAll(/全(\d+)曲中(\d+)曲/g)) {
      if (+m[1] !== songs.length || +m[2] !== countByKey[key]) {
        error(`scripts/composer.js: ${key} のプロフィール「${m[0]}」は 全${songs.length}曲中${countByKey[key] || 0}曲 のはずです`);
      }
    }
  }
}

// AXES: scoring_scale.axes と同じ軸がそろっているか、他のファイルに定義が残っていないか
const axesKeys = common.AXES.map(a => a.key);
if ([...axesKeys].sort().join(',') !== [...axisKeys].sort().join(',')) error('scripts/common.js: AXES の軸が scoring_scale.axes と一致しません');
common.AXES.forEach(a => ['label', 'shortLabel', 'color'].forEach(k => { if (!a[k]) error(`scripts/common.js: AXES の ${a.key} に ${k} がありません`); }));
fs.readdirSync(path.join(ROOT, 'scripts')).filter(f => f.endsWith('.js') && f !== 'common.js').forEach(f => {
  const src = read('scripts/' + f);
  ['AXES', 'COMPOSER_NAME_MAP', 'COMPOSER_COLORS'].forEach(name => {
    if (new RegExp(`^const ${name}\\b`, 'm').test(src)) error(`scripts/${f}: ${name} は scripts/common.js にまとめてください`);
  });
});

/* ====== README ====== */
for (const m of read('README.md').matchAll(/全 ?(\d+) ?曲/g)) {
  if (+m[1] !== songs.length) error(`README.md: 「${m[0]}」は 全 ${songs.length} 曲 のはずです`);
}

/* ====== 結果 ====== */
warnings.forEach(w => console.log('WARN  ' + w));
errors.forEach(e => console.log('ERROR ' + e));
console.log(`\n${songs.length} 曲 / 作曲家 ${composers.length} 組: エラー ${errors.length} 件、警告 ${warnings.length} 件`);
process.exit(errors.length ? 1 : 0);
