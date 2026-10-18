#!/usr/bin/env node
/*
 * OGP 画像（img/og-<page>.png, 1200×630）を tools/og.html から撮り直す。
 * ヘッドレスの Edge か Chrome を使う（見つからなければ環境変数 BROWSER にパスを指定）。
 * 使い方: リポジトリ直下で `node tools/og.js`（一部だけ: `node tools/og.js map songs`）
 * 撮るページの一覧と文言は tools/og.html の OG_PAGES にある。
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

const targets = process.argv.slice(2).length ? process.argv.slice(2) : PAGES;
const unknown = targets.filter(t => !PAGES.includes(t));
if (unknown.length) {
  console.error('不明なページ: ' + unknown.join(', ') + '（候補: ' + PAGES.join(', ') + '）');
  process.exit(1);
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
  } finally {
    server.kill();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}, 500);
