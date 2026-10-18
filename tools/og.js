#!/usr/bin/env node
/*
 * OGP 画像（img/og-<page>.png, 1200×630）を tools/og.html から撮り直す。
 * ヘッドレスの Edge か Chrome を使う（見つからなければ環境変数 BROWSER にパスを指定）。
 * 使い方: リポジトリ直下で `node tools/og.js`（一部だけ: `node tools/og.js map songs`）
 * 撮るページの一覧と文言は tools/og.html の OG_PAGES にある。
 *
 * 撮り直したページは、HTML の og:image を `img/og-<page>.png?v=<撮影日時>` に書き換える。
 * X などは画像をキャッシュするので、URL を変えて新しい画像を取りに行かせるため。
 * 撮影せずに書き換えだけ行うなら `--version-only`。
 */
'use strict';

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8765;
const PAGES = ['index', 'songs', 'song', 'map', 'heatmap', 'timeline', 'composer', 'compare', 'recommend', 'setlist', 'batting'];

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = CANDIDATES.find(p => fs.existsSync(p));
if (!browser) {
  console.error('Edge / Chrome が見つかりません。環境変数 BROWSER にパスを指定してください。');
  process.exit(1);
}

const args = process.argv.slice(2);
const versionOnly = args.includes('--version-only');
const names = args.filter(a => !a.startsWith('--'));
const targets = names.length ? names : PAGES;
const unknown = targets.filter(t => !PAGES.includes(t));
if (unknown.length) {
  console.error('不明なページ: ' + unknown.join(', ') + '（候補: ' + PAGES.join(', ') + '）');
  process.exit(1);
}

// og:image の URL に ?v=<YYYYMMDDHHmm> を付け直す（index は index.html、他は <page>.html）
function bumpVersion(keys) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ver = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  for (const key of keys) {
    const file = path.join(ROOT, `${key}.html`);
    const html = fs.readFileSync(file, 'utf8');
    const re = new RegExp(`img/og-${key}\\.png(\\?v=[^"]*)?"`);
    if (!re.test(html)) { console.error(`${key}.html に og:image (img/og-${key}.png) がありません`); process.exitCode = 1; continue; }
    fs.writeFileSync(file, html.replace(re, `img/og-${key}.png?v=${ver}"`));
  }
  console.log(`og:image を ?v=${ver} に更新: ${keys.join(', ')}`);
}

if (versionOnly) {
  bumpVersion(targets);
  process.exit();
}

const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hm-og-'));

setTimeout(() => {
  try {
    for (const key of targets) {
      const out = path.join(ROOT, 'img', `og-${key}.png`);
      execFileSync(browser, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
        `--user-data-dir=${profile}`,
        '--window-size=1200,630', '--force-device-scale-factor=1',
        '--virtual-time-budget=15000',
        `--screenshot=${out}`,
        `http://localhost:${PORT}/tools/og.html?p=${key}`,
      ], { stdio: 'ignore' });
      console.log('img/og-' + key + '.png');
    }
    bumpVersion(targets);
  } finally {
    server.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}, 500);
