# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hey!Mommy!（6人組アイドルグループ）の楽曲を 9 軸スコア・3 種のポジションマップ・和声分析で可視化する静的サイト。GitHub Pages で公開: https://harapeko-wanchi.github.io/hm-song-analysis/

- ビルド・パッケージマネージャ・テスト・リンターは無い。素の HTML / CSS / JS のみ。
- 各ページは `fetch('songs.json')` するため、`file://` では動かない。ローカル確認は静的サーバーで行う（リポジトリ直下で `node tools/serve.js` を実行し http://localhost:8000/ を開く。Python があれば `python -m http.server 8000` でも可）。
- `.gitignore` が `*.py` を除外しているので、Python の補助スクリプトはコミットされない。
- `node tools/validate.js` で `songs.json` と関連ファイルの整合性をチェックできる（マップ座標と式、id 重複、並び順、`analysis/<id>.md` の有無、作曲家のプロフィール・色の登録漏れ、README の曲数など）。曲の追加・スコア変更の後は必ず実行する。

## Architecture

**データ: `songs.json` が唯一のデータソース。** 全ページがこれを読み込む。

- `scoring_scale.axes`: 9 軸（cute, cool, emo, happy, band, childlike, complexity, party, speed）。0〜10、0.1 刻み、probit 正規化（順位ベース、平均 5.0・SD 2.3）。
- `mapA_definition` / `mapB_definition` / `mapC_definition`: マップ座標の算出式（例: Map A の x = `cool - cute`, y = `(party - 5) * 2`）。各曲の `mapA` / `mapB` / `mapC` 座標は**事前計算済みで JSON に保存**されているため、スコアを変えたら座標も式に従って更新すること。
- 各曲のフィールド: `id, title, release_date, lyricist, composer, arranger, key, bpm, youtube_url, thumbnail_url, scores, mapA, mapB, mapC, tags, harmony_note, lyrics_hooks, summary`。

**ページ構成:** ルートの `<page>.html` ＋ `scripts/<page>.js` ＋（必要なら）`styles/<page>.css`。`styles/common.css` が共通ダークテーマ。ナビゲーションの HTML は各ページにコピーされているので、ページ追加・名称変更時は全 HTML のナビを更新する。

- `map-a.html` / `map-b.html` / `map-c.html` は共通の `scripts/map.js` を使い、ページ内に存在する `#mapA` / `#mapB` / `#mapC` 要素で描画対象を判定する。`map.html` は旧 URL（`?m=A|B|C`）からのリダイレクト専用。曲名ラベルは他の曲のサムネイルや先に表示したラベルと重なると隠し（`songs.json` の順＝新しい曲を優先）、ズームで間隔が開くと再表示する。曲のサムネイルは詳細ページ（`song.html`）へのリンク（YouTube はツールチップから。タッチ端末ではタップでツールチップを開く）。
- `song.html?id=<id>` は曲ごとの詳細ページ（`scripts/song.js`）。ヘッダー・レーダー・3 マップ上の位置・似ている曲 TOP 5 を描き、`analysis/<id>.md` を `scripts/markdown.js`（分析ファイルが使う書式だけに対応した最小の Markdown 変換。HTML はすべてエスケープ）で記事として表示する。一覧・レコメンド・ヒートマップ・マップのツールチップの曲名から `songUrl(id)`（`common.js`）でリンクしている。レーダー描画は `scripts/radar.js` を `composer.html` と共用。
- `scripts/common.js` に共通定義をまとめている: `AXES`（9軸の key・ラベル・色・英語短縮ラベル）、`COMPOSER_NAME_MAP`（共作表記を代表名にまとめる）、`COMPOSER_COLORS`（作曲家ごとのレーダー色とヒートマップ色相）。これらを使うページは `common.js` をページ用スクリプトより先に読み込む。各ページの JS に同じ定数を再定義しない（`tools/validate.js` が検出する）。

**JS 内にハードコードされた楽曲依存データ（新曲・新作曲家追加時に要確認）:**

- `scripts/common.js`: 新しい作曲家は `COMPOSER_COLORS` に色を追加（キーは代表名）。共作表記なら `COMPOSER_NAME_MAP` にも追加。
- `scripts/composer.js`: `COMPOSER_PROFILES`（作曲家ごとの長文プロフィール、担当曲数など数値を含む文章。キーは代表名）。
- `README.md` の「全 33 曲」等の記述、`prompt.md` の気分別候補リスト。

**曲の並び順:** `songs` 配列は新しい曲が先頭の順で、`index.js` の既定表示（リリース日の新しい順）は同じ日付・同じ値の曲をこの配列順で並べる。新曲は配列の先頭に追加する。

**URL 共有状態:** どのページも曲は `songs.json` の `id` で参照するので、配列の並び順や曲数に依存しない。`id` を変えると共有済み URL が壊れる。

- setlist / batting: 状態を JSON 配列にし、LZ-String（`scripts/lz-string.min.js`）で圧縮して `?d=...` に格納する（各ファイルの `serializeState` / `deserializeState` の直前のコメントに形式を記載）。URL 由来の値は `deserializeState` で型・曲 id・守備位置・文字数を検証してから state に入れる。
- compare: `?s1=<id>&s2=...`、recommend: `#<id>`。
- timeline（年表）: `?m=<bpm|軸 key>` で表示する指標を保持（既定の BPM は省略）。
- index（一覧）: `?q=&sort=&order=&composer=&year=` で絞り込み・並び替えを保持（`composer` / `year` は複数指定可、既定値は省略）。

batting の X シェア文は 257 文字上限に収まるよう末尾から自動カットされる。

## Other content

- `analysis/<song_id>.md`: 曲ごとの楽曲分析。音楽ジャーナリストのレビュー／音楽誌の分析記事の文体で書く（リード文、基本情報、論点ごとの小見出し、楽曲を追う、カタログの中で、総評）。書き方の決まりは `docs/analysis-style.md`。ファイル名は `songs.json` の `id` と一致。`analysis/` には曲以外の md を置かない（`tools/validate.js` がエラーにする）。
- `prompt.md`: X 上の楽曲レコメンドボット用プロンプト。GitHub の raw `songs.json`（master ブランチ）を参照するので、`songs.json` のスキーマ（特に `youtube_url`, `tags`, `summary`, `lyrics_hooks`）を変える場合は影響に注意。
- `img/og-*.png`: 各ページの OGP 画像。OGP メタタグは各 HTML に絶対 URL で記述されている。
- 歌詞・コード進行の出典は ChordWiki。
