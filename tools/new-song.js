#!/usr/bin/env node
/*
 * 新曲を songs.json に追加し、analysis/<id>.md の雛形を作る。
 * 使い方（リポジトリ直下で）:
 *   node tools/new-song.js --template > new-song.json   入力ファイルの雛形を出力
 *   node tools/new-song.js new-song.json                追加する
 *   node tools/new-song.js new-song.json --dry-run      書き込まずに、計算したマップ座標と追加位置だけ表示
 *
 * やること:
 * - 入力を検証（必須項目、id の形式と重複、日付、9 軸スコアの範囲と 0.1 刻み）
 * - mapA / mapB / mapC を songs.json の map*_definition の式で計算
 * - youtube（URL か動画 ID）から youtube_url と thumbnail_url を作る
 * - songs 配列のリリース日順の位置（ふつうは先頭）に差し込む。既存の曲は書き換えない
 * - analysis/<id>.md を docs/analysis-style.md の構成で作る（既にあれば作らない）
 * - README.md の「全 N 曲」を更新
 * - 最後に tools/validate.js を実行し、残りの作業（作曲家の色・プロフィールなど）を表示
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const write = (rel, text) => fs.writeFileSync(path.join(ROOT, rel), text);

const TEMPLATE = {
  id: 'new_song_id',
  title: '曲名',
  release_date: 'YYYY-MM-DD',
  lyricist: '作詞（不明なら null）',
  composer: '作曲',
  arranger: '編曲（不明なら null）',
  key: 'C major',
  bpm: 120,
  youtube: 'https://youtu.be/XXXXXXXXXXX（URL か動画 ID。無ければ null）',
  thumbnail: null,
  scores: { cute: 5.0, cool: 5.0, emo: 5.0, band: 5.0, speed: 5.0, complexity: 5.0, childlike: 5.0, party: 5.0, happy: 5.0 },
  tags: ['タグ'],
  harmony_note: '和声ノート',
  lyrics_hooks: ['歌詞フック'],
  summary: '一般ファン向けの紹介文',
};

const args = process.argv.slice(2);
if (args.includes('--template')) {
  console.log(JSON.stringify(TEMPLATE, null, 2));
  console.error('※ thumbnail は、サムネイルを別の動画から取るときだけ URL か動画 ID を入れる');
  console.error('※ scores の付け方は docs/scoring.md（既存の曲と比べて 0.5 刻みで置く）');
  process.exit(0);
}
const dryRun = args.includes('--dry-run');
const inputPath = args.find(a => !a.startsWith('--'));
if (!inputPath) {
  console.error('使い方: node tools/new-song.js <入力.json> [--dry-run]（雛形は --template）');
  process.exit(1);
}

const fail = msgs => {
  msgs.forEach(m => console.error('ERROR ' + m));
  process.exit(1);
};

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  fail([`${inputPath} を読めません: ${e.message}`]);
}

const src = read('songs.json');
const data = JSON.parse(src);
const songs = data.songs;
const scale = data.scoring_scale;

/* ====== 入力の検証 ====== */
const errors = [];
['id', 'title', 'release_date', 'composer', 'key', 'bpm', 'scores', 'tags', 'harmony_note', 'lyrics_hooks', 'summary']
  .forEach(k => { if (input[k] == null || input[k] === '') errors.push(`${k} がありません`); });
if (input.id != null) {
  if (!/^[a-z0-9_]+$/.test(input.id)) errors.push('id は英小文字・数字・_ のみにしてください');
  if (songs.some(s => s.id === input.id)) errors.push(`id「${input.id}」は既に使われています`);
}
if (input.title && songs.some(s => s.title === input.title)) errors.push(`曲名「${input.title}」は既にあります`);
if (input.release_date && (!/^\d{4}-\d{2}-\d{2}$/.test(input.release_date) || isNaN(Date.parse(input.release_date)))) {
  errors.push(`release_date は YYYY-MM-DD 形式にしてください（${input.release_date}）`);
}
if (input.bpm != null && typeof input.bpm !== 'number') errors.push('bpm は数値にしてください');
['tags', 'lyrics_hooks'].forEach(k => { if (input[k] != null && !Array.isArray(input[k])) errors.push(`${k} は配列にしてください`); });

// スコアの軸の並びは既存の曲（先頭の曲）に合わせる
const scoreKeys = Object.keys(songs[0].scores);
if (input.scores) {
  scale.axes.filter(k => !(k in input.scores)).forEach(k => errors.push(`scores.${k} がありません`));
  Object.keys(input.scores).filter(k => !scale.axes.includes(k)).forEach(k => errors.push(`scores.${k} は scoring_scale.axes にない軸です`));
  Object.entries(input.scores).forEach(([k, v]) => {
    if (typeof v !== 'number' || v < scale.min || v > scale.max) errors.push(`scores.${k} が ${scale.min}〜${scale.max} の範囲外です（${v}）`);
    else if (Math.abs(Math.round(v / scale.step) * scale.step - v) > 1e-9) errors.push(`scores.${k} が ${scale.step} 刻みではありません（${v}）`);
  });
}

// YouTube の URL か動画 ID から 11 文字の ID を取り出す
function youtubeId(v, name) {
  if (v == null || v === '') return null;
  const m = /^([\w-]{11})$/.exec(v) || /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/.exec(v);
  if (!m) { errors.push(`${name} から YouTube の動画 ID を読み取れません（${v}）`); return null; }
  return m[1];
}
const videoId = youtubeId(input.youtube, 'youtube');
const thumbId = youtubeId(input.thumbnail, 'thumbnail') || videoId;

if (errors.length) fail(errors);

/* ====== 曲のデータを組み立てる ====== */
const round1 = v => { const r = Math.round(v * 10) / 10; return r === 0 ? 0 : r; };   // -0 を 0 に
const scores = Object.fromEntries(scoreKeys.map(k => [k, input.scores[k]]));
const mapOf = m => {
  const def = data[`map${m}_definition`];
  return { x: round1(vm.runInNewContext(def.x_formula, { ...scores })), y: round1(vm.runInNewContext(def.y_formula, { ...scores })) };
};
const song = {
  id: input.id,
  title: input.title,
  release_date: input.release_date,
  lyricist: input.lyricist ?? null,
  composer: input.composer,
  arranger: input.arranger ?? null,
  key: input.key,
  bpm: input.bpm,
  youtube_url: videoId ? `https://youtu.be/${videoId}` : null,
  thumbnail_url: thumbId ? `https://img.youtube.com/vi/${thumbId}/maxresdefault.jpg` : null,
  scores,
  mapA: mapOf('A'),
  mapB: mapOf('B'),
  mapC: mapOf('C'),
  tags: input.tags,
  harmony_note: input.harmony_note,
  lyrics_hooks: input.lyrics_hooks,
  summary: input.summary,
};

/* songs.json の先頭の曲と同じ書式で 1 曲分を整形する（スコアと座標は小数 1 桁、座標は 1 行） */
function formatSong(s) {
  const I = '      ';
  const num = v => v.toFixed(1);
  const fields = Object.entries(s).map(([k, v]) => {
    let val;
    if (k === 'scores') val = '{\n' + Object.entries(v).map(([a, x]) => `${I}  ${JSON.stringify(a)}: ${num(x)}`).join(',\n') + `\n${I}}`;
    else if (/^map[ABC]$/.test(k)) val = `{ "x": ${num(v.x)}, "y": ${num(v.y)} }`;
    else if (Array.isArray(v)) val = v.length ? '[\n' + v.map(x => `${I}  ${JSON.stringify(x)}`).join(',\n') + `\n${I}]` : '[]';
    else val = JSON.stringify(v);
    return `${I}${JSON.stringify(k)}: ${val}`;
  });
  return '    {\n' + fields.join(',\n') + '\n    }';
}

// 新しい曲が先頭の順。同じ日付の曲よりは前に置く
let index = songs.findIndex(s => s.release_date <= song.release_date);
if (index === -1) index = songs.length;

console.log(`「${song.title}」を songs[${index}] に追加します` + (index > 0 ? `（${songs[index - 1].title} の後）` : '（先頭）'));
for (const m of ['A', 'B', 'C']) {
  const def = data[`map${m}_definition`];
  console.log(`  map${m}: (${song[`map${m}`].x}, ${song[`map${m}`].y})   x = ${def.x_formula}, y = ${def.y_formula}`);
}
if (dryRun) {
  console.log('\n--dry-run のため書き込みません');
  process.exit(0);
}

/* ====== songs.json に差し込む（既存の曲の書式はそのまま） ====== */
let insertAt;
if (index < songs.length) {
  const m = new RegExp(`\\n    \\{\\s*\\n\\s*"id": ${JSON.stringify(songs[index].id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(src);
  if (!m) fail([`songs.json で ${songs[index].id} の位置が見つかりません`]);
  insertAt = m.index + 1;
  write('songs.json', src.slice(0, insertAt) + formatSong(song) + ',\n' + src.slice(insertAt));
} else {
  insertAt = src.lastIndexOf('    }\n  ]') + '    }'.length;
  write('songs.json', src.slice(0, insertAt) + ',\n' + formatSong(song) + src.slice(insertAt));
}
// 書き込んだ結果が正しく読めて、新曲が意図した位置にあるか
const after = JSON.parse(read('songs.json'));
if (after.songs[index].id !== song.id || after.songs.length !== songs.length + 1) fail(['songs.json への追加結果が想定と違います。git diff で確認してください']);
console.log('songs.json: 追加しました');

/* ====== analysis/<id>.md の雛形 ====== */
const mdPath = `analysis/${song.id}.md`;
if (fs.existsSync(path.join(ROOT, mdPath))) {
  console.log(`${mdPath}: 既にあるので作りませんでした`);
} else {
  const rows = [
    ['リリース', song.release_date],
    ['作詞', song.lyricist],
    ['作曲', song.composer],
    ['編曲', song.arranger],
    ['Key', song.key],
    ['BPM', song.bpm],
    ['編成', '（編成を書く）'],
  ].filter(([, v]) => v != null);   // 不明な項目は行ごと省く（docs/analysis-style.md）
  write(mdPath, `# ${song.title} — 楽曲分析

（リード文: この曲を一言で言うと何か、どこを聴けばいいかを 2〜3 文で書く）

## 基本情報

| 項目 | 値 |
|------|-----|
${rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## （論点の見出し: 内容が分かる言い切りの句。2〜4 本）

（本文）

## 楽曲を追う

### Intro

（コード進行のコードブロックと解説）

## カタログの中で

（Hey!Mommy! の他の曲・同じ作曲家の曲との比較）

## 総評

（締めの 1〜2 段落）
`);
  console.log(`${mdPath}: 雛形を作りました（docs/analysis-style.md に沿って書く）`);
}

/* ====== README.md の「全 N 曲」 ====== */
const readme = read('README.md');
const newReadme = readme.replace(/全( ?)(\d+)( ?)曲/g, (s, a, n, b) => +n === songs.length ? `全${a}${songs.length + 1}${b}曲` : s);
if (newReadme !== readme) {
  write('README.md', newReadme);
  console.log(`README.md: 曲数を ${songs.length + 1} に更新しました`);
}

/* ====== 作曲家と、手で直すもの ====== */
const common = vm.runInNewContext(read('scripts/common.js') + ';({ COMPOSER_NAME_MAP, COMPOSER_COLORS })');
const composerKey = common.COMPOSER_NAME_MAP[song.composer] || song.composer;
const todo = [`${mdPath} の本文を書く`];
if (!common.COMPOSER_COLORS[composerKey]) {
  console.log(`\n新しい作曲家です: ${song.composer}`);
  if (/[、,/／&＆×]/.test(song.composer)) todo.push(`共作表記なら scripts/common.js の COMPOSER_NAME_MAP に「${song.composer}」→ 代表名 を追加`);
  todo.push('scripts/common.js の COMPOSER_COLORS に色を追加（キーは代表名）');
  todo.push('scripts/composer.js の COMPOSER_PROFILES にプロフィールを追加（キーは代表名）');
} else {
  todo.push(`scripts/composer.js の「${composerKey}」のプロフィールの担当曲数など、数値を含む文章を見直す`);
}
todo.push('曲数や最新曲が写る OGP 画像を撮り直す: node tools/og.js index songs song map recommend');

console.log('\n--- tools/validate.js ---');
const result = spawnSync(process.execPath, [path.join(__dirname, 'validate.js')], { stdio: 'inherit' });

console.log('\n残りの作業:');
todo.forEach(t => console.log('  - ' + t));
process.exit(result.status ?? 1);
