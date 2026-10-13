# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hey!Mommy!（6人組アイドルグループ）の楽曲を 9 軸スコア・3 種のポジションマップ・和声分析で可視化する静的サイト。GitHub Pages で公開: https://harapeko-wanchi.github.io/hm-song-analysis/

- ビルド・パッケージマネージャ・テスト・リンターは無い。素の HTML / CSS / JS のみ。
- 各ページは `fetch('songs.json')` するため、`file://` では動かない。ローカル確認は静的サーバーで行う（例: `python -m http.server 8000` をリポジトリ直下で実行）。
- `.gitignore` が `*.py` を除外しているので、Python の補助スクリプトはコミットされない。

## Architecture

**データ: `songs.json` が唯一のデータソース。** 全ページがこれを読み込む。

- `scoring_scale.axes`: 9 軸（cute, cool, emo, happy, band, childlike, complexity, party, speed）。0〜10、0.1 刻み、probit 正規化（順位ベース、平均 5.0・SD 2.3）。
- `mapA_definition` / `mapB_definition` / `mapC_definition`: マップ座標の算出式（例: Map A の x = `cool - cute`, y = `(party - 5) * 2`）。各曲の `mapA` / `mapB` / `mapC` 座標は**事前計算済みで JSON に保存**されているため、スコアを変えたら座標も式に従って更新すること。
- 各曲のフィールド: `id, title, release_date, lyricist, composer, arranger, key, bpm, youtube_url, thumbnail_url, scores, mapA, mapB, mapC, tags, harmony_note, lyrics_hooks, summary`。

**ページ構成:** ルートの `<page>.html` ＋ `scripts/<page>.js` ＋（必要なら）`styles/<page>.css`。`styles/common.css` が共通ダークテーマ。ナビゲーションの HTML は各ページにコピーされているので、ページ追加・名称変更時は全 HTML のナビを更新する。

- `map-a.html` / `map-b.html` / `map-c.html` は共通の `scripts/map.js` を使い、ページ内に存在する `#mapA` / `#mapB` / `#mapC` 要素で描画対象を判定する。`map.html` は旧 URL（`?m=A|B|C`）からのリダイレクト専用。
- `AXES` 定義（軸ラベル・色）は複数の JS ファイルに重複定義されている。軸の表示を変える場合は全ファイルを grep して揃える。

**JS 内にハードコードされた楽曲依存データ（新曲・新作曲家追加時に要確認）:**

- `scripts/composer.js`: `COMPOSER_PROFILES`（作曲家ごとの長文プロフィール、担当曲数など数値を含む文章）、`COMPOSER_PALETTE`、`COMPOSER_NAME_MAP`（複数名表記の正規化。`scripts/index.js` にも同じものがあるので両方そろえる）。
- `scripts/heatmap.js`: `COMPOSER_HUES`（`songs.json` の `composer` 文字列そのものをキーにする）。
- `README.md` の「全 33 曲」等の記述、`prompt.md` の気分別候補リスト。

**曲の並び順:** `songs` 配列は新しい曲が先頭の順で、`index.js` の既定表示（リリース日の新しい順）は同じ日付・同じ値の曲をこの配列順で並べる。新曲は配列の先頭に追加する。

**URL 共有状態:** どのページも曲は `songs.json` の `id` で参照するので、配列の並び順や曲数に依存しない。`id` を変えると共有済み URL が壊れる。

- setlist / batting: 状態を JSON 配列にし、LZ-String（`scripts/lz-string.min.js`）で圧縮して `?d=...` に格納する（各ファイルの `serializeState` / `deserializeState` の直前のコメントに形式を記載）。URL 由来の値は `deserializeState` で型・曲 id・守備位置・文字数を検証してから state に入れる。
- compare: `?s1=<id>&s2=...`、recommend: `#<id>`。
- index（一覧）: `?q=&sort=&order=&composer=&year=` で絞り込み・並び替えを保持（`composer` / `year` は複数指定可、既定値は省略）。

batting の X シェア文は 257 文字上限に収まるよう末尾から自動カットされる。

## Other content

- `analysis/<song_id>.md`: 曲ごとの和声分析（基本情報表、セクション別コード進行と解説、楽曲間比較）。ファイル名は `songs.json` の `id` と一致。日本語で記述。
- `prompt.md`: X 上の楽曲レコメンドボット用プロンプト。GitHub の raw `songs.json`（master ブランチ）を参照するので、`songs.json` のスキーマ（特に `youtube_url`, `tags`, `summary`, `lyrics_hooks`）を変える場合は影響に注意。
- `img/og-*.png`: 各ページの OGP 画像。OGP メタタグは各 HTML に絶対 URL で記述されている。
- 歌詞・コード進行の出典は ChordWiki。
