/* ====== Config ====== */
const AXES = [
  { key: 'cute',       label: 'キュート',  color: '#f06c9c' },
  { key: 'cool',       label: 'クール',    color: '#6cacf0' },
  { key: 'emo',        label: 'エモ',      color: '#b06cf0' },
  { key: 'childlike',  label: '子供心',    color: '#f0d860' },
  { key: 'happy',      label: 'ハッピー',  color: '#6cf0b0' },
  { key: 'party',      label: 'お祭り感',  color: '#fcb040' },
  { key: 'band',       label: 'バンド',    color: '#d08040' },
  { key: 'speed',      label: '疾走感',    color: '#f06c6c' },
  { key: 'complexity', label: '複雑度',    color: '#a080f0' },
];
const MAX_VAL = 10;

/* Composer visual palette — stroke colors chosen to be distinguishable on dark bg */
const COMPOSER_PALETTE = [
  { stroke: '#b080f0', fill: 'rgba(176,128,240,.2)' },  // NNBS. — purple
  { stroke: '#50c8e8', fill: 'rgba(80,200,232,.2)' },   // AILI — teal
  { stroke: '#f0a040', fill: 'rgba(240,160,64,.2)' },   // しえりーほ — orange
  { stroke: '#60d880', fill: 'rgba(96,216,128,.2)' },   // 山崎あおい — green
  { stroke: '#f06060', fill: 'rgba(240,96,96,.2)' },    // 阿久津健太郎 — red
  { stroke: '#f080a8', fill: 'rgba(240,128,168,.2)' },  // 古橋勇紀 — rose
  { stroke: '#d8c050', fill: 'rgba(216,192,80,.2)' },   // 早川博隆 — gold
  { stroke: '#50d8c0', fill: 'rgba(80,216,192,.2)' },   // 徳田光希 — cyan
];

/* ====== Composer Profiles ====== */
const COMPOSER_PROFILES = {
  'NNBS.': {
    summary: 'Hey!Mommy!楽曲の約半数を手がけるメイン・ソングライター。打ち込み系サウンドを主戦場に、少ないコードで最大のエネルギーを引き出す"ミニマリスト"的手法を持ち味とする。',
    background: 'Hey!Mommy!の楽曲制作チームにおける中核的存在。作詞・作曲を一手に担うスタイルで、グループの音楽的アイデンティティを最も強く規定してきた作曲家。エレクトロポップやダンスミュージックをベースとしつつ、わずか2〜4コードのループでも強烈な推進力を生み出す"少数精鋭"のコードワークが特徴。',
    role: 'カタログ全30曲中16曲を担当し、Hey!Mommy!サウンドの"基準点（デフォルト）"を形成。高BPM×打ち込み×ナンセンスワードという三位一体のスタイルで、ライブ映えするパーティーチューンを量産してきた。レーダーチャートでは「お祭り感」「子供心」「疾走感」が顕著に高く、グループの"全力はしゃぎ！"を音楽的に体現する存在。',
    signature: 'I7/♭7（ミクソリディアン・ドミナント化トニック）は3曲で使用されるNNBS.の"署名コード"。I-V始動のVerse構造、ナンセンスワードの多用（「モチモチキュルルン」「レリビ」「ぴびび」等）、全音階上行/下行バスラインも繰り返し登場する定番手法。',
    evolution: '初期作品（BEACH! BEACH!、Hey!Baby!等）ではI-V-vi-IVの王道進行やシンプルな3〜4コード循環で「まっすぐなハッピー」を量産。中期（GALAXY! GALAXY!、POJI POJI GO）でI7/♭7シグネチャーを確立し、クロマティック・メディアント揺動（E↔G）やフリジアン色など和声パレットを拡大。最新作PLAYFUL ROMANTICでは全音階7音下行バスという前例のない手法を導入し、セルフタイトルアンセムとして楽曲メドレー歌詞まで盛り込む——コード数は少なくとも手法は確実に深化し続けている。',
    bpmNote: 'BPM帯は125〜210と幅広いが、180〜200の超高速域に集中する傾向。BPM206のビスケットケース、BPM210のHey! get up kidsなどカタログ最速クラスの楽曲を多数保有。',
    lyricsTheme: 'ナンセンス語・オノマトペを多用したコール映え重視の歌詞が主流。「夢」「仲間」「全力」をテーマに、聴き手を肯定し続ける"祝祭的ポジ"が一貫した作風。',
  },
  'AILI': {
    summary: 'クール×エモーションの二刀流。ヘンドリクスコードからリディアン浮遊和声まで、作品ごとに大胆に手法を変える"カメレオン型"ソングライター。',
    background: 'NNBS.と並ぶHey!Mommy!のレギュラー作家。作詞・作曲の両方を担当し、J-POPの枠組みの中にジャズやロックの語彙を自然に忍ばせる、知的かつ大胆なハーモニーセンスが持ち味。楽曲ごとにサウンドの方向性をガラリと変え、ポップ・アンセムからラップ曲、内省的バラードまで幅広いスペクトラムをカバーする。',
    role: '5曲を提供し、NNBS.の"パーティー路線"とは異なる感情の深度をカタログに注入する役割を担う。レーダーチャートではNNBS.と好対照をなし、「エモ」「クール」「複雑度」が相対的に高い。Hey!Mommy!の楽曲世界に"泣き"と"アティテュード"の次元を加えた功労者。',
    signature: 'I7（V7/IV）恒常ドミナント化（ご機嫌マミー）、E7(#9)ヘンドリクスコード（OK）、FM7(9,#11)リディアン和声（Next Story）——各楽曲で全く異なるシグネチャーコードを打ち立てるのがAILIスタイル。♭VII系和音を多面的に変容させる手法も特徴的。',
    evolution: '初期のVoyage!ではIV-vi-V-I王道進行に♭VII借用と半音上転調を組み合わせた"冒険もの"を提示。ご機嫌マミーではI7恒常化や♭VII多面体（B/B7/Badd9/BM7）で和声の語彙力を見せつけ、OKではヘンドリクスコード×ラップという新境地を開拓。そして最新作Next Storyでは一転、非ダイアトニック和音をたった1種に絞り込み、IM7↔vi7のトニック揺動だけでカタログ最高のエモーション密度を達成——「感情が深いほど和声は純粋に」という逆説的進化を遂げている。',
    bpmNote: 'BPM125〜182と中速〜高速の間に分布。125のOKと182のご機嫌マミーでは57BPMもの差があり、テンポ設定にも柔軟性が光る。',
    lyricsTheme: '自己肯定がAILI歌詞の通奏低音。ご機嫌マミーの「己を称えよ」からOKの「ぶっ飛んでて何が悪い」まで、スタイルを変えながら同じメッセージを貫く。Next Storyでは「ワタシがこの世にいてもいなくても」と実存的な問いに踏み込み、歌詞の射程を大きく広げた。',
  },
  'しえりーほ': {
    summary: 'キュート＆ロマンティック路線のスペシャリスト。♭VI→♭VIIクロマティック上行という独自の"署名進行"を持ち、甘い楽曲の中に攻めた和声処理を仕込む二面性が魅力。',
    background: '甘くポップなメロディラインを得意とする作家で、Hey!Mommy!のキュート方面を担当。全3曲すべてで作詞・作曲を手がけ、お菓子や季節をモチーフにした世界観を一貫して構築する。打ち込みとバンドサウンドの両方を扱い、テンポやアレンジに応じてサウンドの質感を柔軟に変える器用さも持ち合わせる。',
    role: '3曲の提供ながら、キュートスコアはカタログ屈指の高水準を維持。NNBS.の"全力パーティー"やAILIの"クール×エモ"とは異なる、「甘くてかわいい」という第三極を確立した。Map Aでは明確に「かわいい」側に位置し、カタログの幅を左方向に広げる重要な存在。',
    signature: 'A→B→C→D（♭VII→I→♭II→♭III）のクロマティック上行は「しえりーほ署名」と呼べる定番手法。CANDY POP・Summer landでフルに使用し、ICE PARTYでは♭VI→♭VIIに凝縮した短縮形で登場。♭VII系の借用和音を積極活用する点はAILIとの共通点だが、クロマティック全音上行に特化したアプローチはしえりーほ独自。',
    evolution: 'CANDY POP（BPM170）は甘キュートど真ん中のダンスチューン、Summer land（BPM155）はギター主体の夏ポップ、ICE PARTY（BPM137）は最も遅いミドルテンポ——作品を重ねるごとにテンポを落とし、B→BM7→B7の内声クロマティックや♭VII変容（AM7→A6→Aadd9）など微細な和声の色彩変化を"味わわせる"方向に進化。速度とエネルギーからテクスチャーと味覚へ——しえりーほの作曲アプローチは着実に深みを増している。',
    bpmNote: 'BPM137〜170。作品ごとにテンポを下げる傾向があり、最新作ほどじっくり聴かせる設計に。',
    lyricsTheme: 'キャンディ、アイスクリーム、夏といった甘い/眩しいモチーフをベースに、「仲間への感謝」「チームの絆」を描く。コールポイントが豊富で、ライブの一体感を重視した歌詞設計。',
  },
  '山崎あおい': {
    summary: 'シンガーソングライターとしてのキャリアを持つ実力派。テンションコードを多用した都会的サウンドで、Hey!Mommy!カタログにクール×大人っぽさの新次元をもたらした。',
    background: 'ソロアーティスト/シンガーソングライターとして活動する山崎あおいは、自身のアーティスト経験に裏打ちされた成熟したソングライティングが武器。作詞・作曲を自ら手がけ、Aメジャー/Fマイナーといったキー選択からテンション・ヴォイシングまで、確かな音楽理論の素養がうかがえる。',
    role: '2曲（LOOK、SUMI-HAJI）を提供し、グループのサウンドパレットにそれまでなかった「都会的クール」「ヒリヒリした青春の痛み」を追加。LOOKのシンセポップ×自己肯定、SUMI-HAJIのマイナー基調×焦燥というコントラストは、1人の作家による振れ幅として秀逸。Map Aでは2曲とも「かっこいい×聴かせる」象限に位置し、カタログの右下エリアを開拓した。',
    signature: 'AM7、DM7、Eadd9、F#m11、Fm9、C7(b9)といったテンションコードの積極運用が最大の特徴。Amadd9やEb(11)など浮遊感のあるヴォイシング、モーダルインターチェンジ（Dm、Am/C等）も効果的に使い分け、他の作家とは一線を画す"大人の響き"を生む。',
    bpmNote: 'BPM125〜128のミドルテンポに限定。Hey!Mommy!カタログでは最も遅い帯域に位置し、聴かせる楽曲としての個性が際立つ。',
    lyricsTheme: 'LOOKでは「根拠のない確信は天性」「I\'m a STAR!!」という圧倒的自己肯定、SUMI-HAJIでは「端から端、隅から隅、青春のすべて使い切っていこ！」という焦燥と覚悟——対極的なテーマを描きながらも、「全力で自分を生きる」という芯は共通する。',
  },
  '阿久津健太郎': {
    summary: 'J-POPの職業作曲家としての手腕をHey!Mommy!に注入。全楽曲最多の21コードを駆使した"和声のフルコース"で、カタログに圧倒的な音楽的密度をもたらした。',
    background: '外部作家として参加した阿久津健太郎は、J-POP/アニソン界で活動する職業作曲家としての百戦錬磨のスキルを持つ。サスペンション系（sus2/sus4/Bbsus4/Ebsus4/G）、拡張テンション（AbM9）、パッシングコード（Am7-5）といった高度な和声技法を惜しみなく投入し、DIAMOND JET 1曲でHey!Mommy!の和声的天井を押し上げた。',
    role: '提供曲はDIAMOND JETの1曲のみだが、コード種数21はカタログ全体の最多記録。レーダーチャートでは「クール」「複雑度」「バンド」が突出し、本格的なギターソロを含むリッチなバンドサウンドが異彩を放つ。Hey!Mommy!のレギュラー作家陣とは明確に異なる"外部の風"としてカタログに独自の立ち位置を築いている。',
    signature: 'iv（Abm）同主調借用の全セクション横断使用が最大の特徴。「風を起こす」「絶対行ける」「笑顔が守れないから」——前進する瞬間に必ずivの影が射し、"逆風の中を飛ぶ"という曲のテーゼを和声レベルで体現。AbM9→Eb/G→Ebsus4/Gの浮遊コーラスは「奇跡のジェットに乗って」の歌詞と完全同期する名設計。',
    bpmNote: 'BPM149。他の高速楽曲群と比較するとミドル寄りだが、リードギターとシンセの厚い編成が疾走感を補完。',
    lyricsTheme: '「飛び立てCarry on」「可能性は誰にも決められはしない」——夢と飛翔のメタファーを軸に、弱さを認めてなお前に進む意志を描く。「約束のステージが呼んでいるから」はHey!Mommy!メンバーへの直接的なエールとして響く。',
  },
  '古橋勇紀': {
    summary: '3つの調性圏を横断する大胆な転調設計で、Hey!Mommy!カタログに知的な疾走感を刻んだアレンジャー気質の作曲家。',
    background: 'START RUSH!! 1曲の提供のみながら、Ab major→C major→E major(Dbm)→Ab majorという3調性圏横断の転調設計はカタログ随一のスケール感。E7#9（ジミヘンコード）やAbaugM7（増長7）といったジャンルを超えたテンションコードの使用も特徴的で、バンドアレンジに精通した作家像がうかがえる。',
    role: 'BPM196の超疾走枠として、カタログの「全力はしゃぎ！」象限にクールかつスケールの大きいサウンドを追加。iii-IV-V-vi上行進行をメインエンジンとし、常に「上へ上へ」駆け上がる構造が楽曲のメッセージ「もっともっと強くなりたい！」と完全にリンクする。',
    signature: 'iii-IV-V-vi上行進行の執拗な反復と、長3度転調（Ab→C）＋エンハーモニック転調（E→Abm=G#m→Eb→Cm）の組み合わせ。間奏にE7#9（ジミヘンコード）のJazzフレーバーを差し込む知的なアクセントも印象的。',
    bpmNote: 'BPM196。NNBS.のPLAYFUL ROMANTIC/POJI POJI GOと同速のハイスピード枠。',
    lyricsTheme: '「もっともっと強くなりたい！」「できない理由探して逃げてばかりいた」——弱さの自覚と克服のストーリーが縦軸。「ありがとう 生まれた気持ちに」「Don\'t be afraid! 走れ」で感謝と決意を結晶させる。',
  },
  '早川博隆/柿迫ヒカル': {
    summary: 'ストリングス×シンセ×ギターの三位一体サウンドで、Hey!Mommy!カタログ最多の35コードと3/4拍子という前例なき音楽的挑戦を実現した共作コンビ。',
    background: '早川博隆（作詞・作曲）と柿迫ヒカル（共作曲）による共作。Hey!Yummy!はストリングスを本格導入したカタログ唯一の楽曲であり、ii-V-I完全終止やV7(♭9)上部構造分離といったジャズ和声の技法をアイドルソングに昇華させた意欲作。全35コード（カタログ全時代最多）は、DIAMOND JETの21コードを大きく上回る。',
    role: '食べ物×愛情をテーマにした温かい楽曲で、「HoneyかわいいHoney!」「Yummy!Yummy!」のキャッチーなフックとジャジーな和声の共存が独特。BPM150のミドルテンポで、♭VIM9（BM9）からVsus4への半音下行や、ii→iii→IV→#IV→Vの5段クロマティック上行バスラインなど、カタログ最高難度のハーモニー処理が随所に散りばめられている。',
    signature: 'Bridge Aでの3/4拍子導入（AbM7-Gm7）はカタログ唯一の拍子変化。Bbm7(13)同主調v7借用、Bb7(♭9)→Bdim上部構造分離、G7(#9)ヘンドリクスコード（カタログ2曲目）など、1曲に詰め込まれた技法の密度が驚異的。',
    bpmNote: 'BPM150。ミドルテンポの中に緩急と拍子変化を織り込む設計。',
    lyricsTheme: '「Honey」「Yummy」「おいしい」——食とスイーツのメタファーで愛情を表現。「私が食べてあげる！」「あーんして！」のコール＆レスポンスはライブでの参加性を最大化。',
  },
  '徳田光希': {
    summary: 'ファンタジー/おとぎ話の世界観をFmの幻想的な響きに乗せ、Hey!Mommy!カタログに魔法とシアトリカルな非日常をもたらした作曲家。',
    background: '徳田光希（作詞・作曲）と大竹智之（共作曲）によるTickey Luppy Dooは、シンデレラモチーフのファンタジー楽曲。DbM7→C7→Fm→Fm7というシンプルなコーラス循環の上に、FmM7（メジャー7thのマイナーコード）やDm7b5(b13)といった陰影と煌めきが共存する特殊コードを配し、魔法のような世界観を構築する。',
    role: 'BPM118はカタログ最遅で、疾走感スコア0.1という極端な数値がその独自性を物語る。「パジャマからドレスへ変えるわ」「かぼちゃの馬車だって出せるわ」というシンデレラ・モチーフは、他のどの作曲家も手がけていないオリジナルの領域。キュート値7.1と高めながら、マイナー基調の幻想感が通常のキュート楽曲とは一線を画す個性的なポジションを確立。',
    signature: 'Db→C→Fm（♭VI→V→i）のドミナント解決3コードループがVerse全編を支配。Build部のDm7b5(b13)→C7/E（iiø7→V7/3rd）はクラシカルなドミナント・プレパレーションで、「3, 2, 1」カウントダウンの緊張感を演出。',
    bpmNote: 'BPM118。カタログ最遅の楽曲で、「疾走」ではなく「魅せる」ことに全振りした独自のテンポ設計。',
    lyricsTheme: '「Tickey Luppy Doo」「ズンチャッチャ」「ドンタッタ」——意味を持たない呪文フレーズが魔法の効果を生む。「主人公の座は誰にも渡さない」「パパとママに話すとすぐに解けてしまうの」は少女漫画的な秘密の冒険を描き、「美しい世界がここにある」で夢の中の幸福を肯定する。',
  },
};

/* Composer name alias for handling varied keys like "徳田光希、大竹智之" */
const COMPOSER_NAME_MAP = {
  '徳田光希、大竹智之': '徳田光希',
};

let composerData = [];  // [{ name, songs, avg, bpms, palette }]
let visible = {};       // name → bool

/* ====== Build data ====== */
function buildComposerData(songs) {
  const map = {};
  songs.forEach(s => {
    if (!s.scores || !s.composer) return;
    if (!map[s.composer]) map[s.composer] = [];
    map[s.composer].push(s);
  });

  // Sort by song count desc then name
  const sorted = Object.entries(map).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'ja'));

  composerData = sorted.map(([name, songs], i) => {
    const avg = {};
    AXES.forEach(ax => {
      const vals = songs.map(s => s.scores[ax.key]).filter(v => v != null);
      avg[ax.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const bpms = songs.map(s => s.bpm).filter(Boolean);
    return {
      name,
      songs,
      avg,
      bpmMin: Math.min(...bpms),
      bpmMax: Math.max(...bpms),
      bpmAvg: bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0,
      palette: COMPOSER_PALETTE[i % COMPOSER_PALETTE.length],
    };
  });

  composerData.forEach(c => { visible[c.name] = true; });
}

/* ====== Radar drawing helper ====== */
function drawRadar(ctx, W, H, datasets, options = {}) {
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - (options.labelMargin || 70);
  const n = AXES.length;

  ctx.clearRect(0, 0, W, H);

  // Grid
  const levels = [2, 4, 6, 8, 10];
  levels.forEach(lv => {
    const r = R * lv / MAX_VAL;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = lv === 10 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showGridLabels) {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.font = `${options.gridFontSize || 18}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(lv, cx + 6, cy - r + 14);
    }
  });

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const ex = cx + R * Math.cos(angle);
    const ey = cy + R * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (options.showAxisLabels !== false) {
      const lx = cx + (R + (options.labelOffset || 28)) * Math.cos(angle);
      const ly = cy + (R + (options.labelOffset || 28)) * Math.sin(angle);
      ctx.fillStyle = AXES[i].color;
      ctx.font = `bold ${options.labelFontSize || 20}px "Segoe UI","Noto Sans JP",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(AXES[i].label, lx, ly);
    }
  }

  // Data polygons
  datasets.forEach(ds => {
    if (!ds.visible) return;
    ctx.beginPath();
    AXES.forEach((ax, i) => {
      const val = ds.values[ax.key] ?? 0;
      const r = R * val / MAX_VAL;
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = ds.fill;
    ctx.fill();
    ctx.strokeStyle = ds.stroke;
    ctx.lineWidth = ds.lineWidth || 2.5;
    ctx.stroke();

    // Dots
    if (ds.showDots !== false) {
      AXES.forEach((ax, i) => {
        const val = ds.values[ax.key] ?? 0;
        const r = R * val / MAX_VAL;
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, ds.dotRadius || 4, 0, Math.PI * 2);
        ctx.fillStyle = ds.stroke;
        ctx.fill();
      });
    }
  });
}

/* ====== Overview Chart ====== */
function drawOverview() {
  const canvas = document.getElementById('overviewCanvas');
  const ctx = canvas.getContext('2d');
  const datasets = composerData.map(c => ({
    values: c.avg,
    stroke: c.palette.stroke,
    fill: c.palette.fill,
    visible: visible[c.name],
    lineWidth: c.songs.length >= 3 ? 3 : 2,
    dotRadius: c.songs.length >= 3 ? 5 : 3,
    showDots: true,
  }));
  drawRadar(ctx, canvas.width, canvas.height, datasets, {
    showGridLabels: true,
    labelMargin: 80,
    labelOffset: 34,
    labelFontSize: 22,
    gridFontSize: 18,
  });
}

/* ====== Overview Legend ====== */
function buildOverviewLegend() {
  const el = document.getElementById('overviewLegend');
  el.innerHTML = composerData.map(c => `
    <div class="legend-row${visible[c.name] ? '' : ' dimmed'}" data-composer="${c.name}">
      <span class="legend-swatch" style="background:${c.palette.stroke}"></span>
      <span class="legend-name">${c.name}</span>
      <span class="legend-count">${c.songs.length}曲</span>
    </div>
  `).join('');

  el.querySelectorAll('.legend-row').forEach(row => {
    row.addEventListener('click', () => {
      const name = row.dataset.composer;
      visible[name] = !visible[name];
      row.classList.toggle('dimmed', !visible[name]);
      drawOverview();
    });

    // Double-click switches to that composer's tab
    row.addEventListener('dblclick', () => {
      const name = row.dataset.composer;
      const idx = composerData.findIndex(c => c.name === name);
      if (idx < 0) return;
      switchTab(idx);
      const section = document.getElementById('ctabsSection');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ====== Composer Detail Tabs ====== */
let activeTab = 0;

function buildComposerTabs() {
  const bar = document.getElementById('ctabsBar');
  const content = document.getElementById('ctabsContent');
  if (!bar || !content) return;

  // --- Tab bar ---
  bar.innerHTML = composerData.map((c, i) => `
    <button class="ctab-btn${i === 0 ? ' active' : ''}" data-idx="${i}" style="--tab-color:${c.palette.stroke}">
      <span class="ctab-swatch" style="background:${c.palette.stroke}"></span>
      <span class="ctab-label">${c.name}</span>
      <span class="ctab-count">${c.songs.length}</span>
    </button>
  `).join('');

  bar.querySelectorAll('.ctab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(+btn.dataset.idx));
  });

  // --- Tab content panels ---
  content.innerHTML = '';
  composerData.forEach((c, ci) => {
    const panel = document.createElement('div');
    panel.className = 'ctab-panel' + (ci === 0 ? ' active' : '');
    panel.dataset.idx = ci;

    const key = COMPOSER_NAME_MAP[c.name] || c.name;
    const p = COMPOSER_PROFILES[key];

    // Stats
    let maxAx = AXES[0], minAx = AXES[0];
    AXES.forEach(ax => {
      if (c.avg[ax.key] > c.avg[maxAx.key]) maxAx = ax;
      if (c.avg[ax.key] < c.avg[minAx.key]) minAx = ax;
    });
    const stats = [
      { label: '最高軸', val: `${maxAx.label} ${c.avg[maxAx.key].toFixed(1)}`, cls: 'high' },
      { label: '最低軸', val: `${minAx.label} ${c.avg[minAx.key].toFixed(1)}`, cls: 'low' },
      { label: 'BPM帯', val: c.songs.length > 1 ? `${c.bpmMin}–${c.bpmMax}` : `${c.bpmAvg}` },
      { label: 'BPM平均', val: `${c.bpmAvg}` },
    ];
    const statsHTML = stats.map(s =>
      `<div class="stat-row"><span class="stat-label">${s.label}</span><span class="stat-val${s.cls ? ' ' + s.cls : ''}">${s.val}</span></div>`
    ).join('');

    // Songs
    const songsHTML = c.songs
      .slice().sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
      .map(s => `<span class="c-song-tag">${s.title}</span>`)
      .join('');

    // Profile sections
    let profileHTML = '';
    if (p) {
      const sections = [
        { title: 'バックグラウンド',   body: p.background },
        { title: 'Hey!Mommy!での役割', body: p.role },
        { title: '和声シグネチャー',    body: p.signature },
        p.evolution ? { title: '楽曲進化', body: p.evolution } : null,
        { title: 'BPM傾向',            body: p.bpmNote },
        { title: '歌詞テーマ',          body: p.lyricsTheme },
      ].filter(Boolean);

      profileHTML = `
        <div class="ctab-summary">${p.summary}</div>
        <div class="ctab-details">
          ${sections.map(s => `
            <div class="profile-detail-section">
              <div class="profile-detail-title">${s.title}</div>
              <div class="profile-detail-body">${s.body}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="ctab-top">
        <div class="ctab-radar"><canvas id="tabCanvas${ci}" width="520" height="520"></canvas></div>
        <div class="ctab-info">
          <div class="ctab-stats">${statsHTML}</div>
          <div class="ctab-songs">
            <div class="ctab-songs-title">担当楽曲</div>
            <div class="ctab-songs-list">${songsHTML}</div>
          </div>
        </div>
      </div>
      ${profileHTML}
    `;

    content.appendChild(panel);
  });

  // Draw first tab's radar
  drawTabRadar(0);
}

function drawTabRadar(idx) {
  const c = composerData[idx];
  if (!c) return;
  requestAnimationFrame(() => {
    const cv = document.getElementById(`tabCanvas${idx}`);
    if (!cv) return;
    const ctx = cv.getContext('2d');
    drawRadar(ctx, cv.width, cv.height, [{
      values: c.avg,
      stroke: c.palette.stroke,
      fill: c.palette.fill.replace('.2)', '.35)'),
      visible: true,
      lineWidth: 3,
      dotRadius: 6,
      showDots: true,
    }], {
      showGridLabels: true,
      showAxisLabels: true,
      labelMargin: 66,
      labelOffset: 26,
      labelFontSize: 19,
      gridFontSize: 15,
    });
  });
}

function switchTab(idx) {
  if (idx === activeTab) return;
  activeTab = idx;

  // Update tab bar
  document.querySelectorAll('.ctab-btn').forEach(b => {
    b.classList.toggle('active', +b.dataset.idx === idx);
  });

  // Update panels
  document.querySelectorAll('.ctab-panel').forEach(p => {
    p.classList.toggle('active', +p.dataset.idx === idx);
  });

  // Draw radar for newly active tab (lazy)
  drawTabRadar(idx);
}

/* ====== Comparison Table ====== */
function buildTable() {
  const wrap = document.getElementById('cmpTableSection');
  let html = '<div class="cmp-table-title">全作曲家 平均スコア比較</div>';
  html += '<div class="cmp-scroll"><table class="cmp-table"><thead><tr><th>作曲家</th><th>曲数</th>';
  AXES.forEach(ax => { html += `<th>${ax.label}</th>`; });
  html += '<th>BPM平均</th></tr></thead><tbody>';

  // Find max/min per axis across composers
  const maxPer = {}, minPer = {};
  AXES.forEach(ax => {
    let maxV = -1, minV = 999, maxI = 0, minI = 0;
    composerData.forEach((c, i) => {
      const v = c.avg[ax.key];
      if (v > maxV) { maxV = v; maxI = i; }
      if (v < minV) { minV = v; minI = i; }
    });
    maxPer[ax.key] = maxI;
    minPer[ax.key] = minI;
  });

  composerData.forEach((c, ci) => {
    html += `<tr><td style="color:${c.palette.stroke};font-weight:700">${c.name}</td>`;
    html += `<td>${c.songs.length}</td>`;
    AXES.forEach(ax => {
      const v = c.avg[ax.key];
      const isMax = ci === maxPer[ax.key] && composerData.length > 1;
      const isMin = ci === minPer[ax.key] && composerData.length > 1;
      html += `<td class="${isMax ? 'max-cell' : isMin ? 'min-cell' : ''}">${v.toFixed(1)}</td>`;
    });
    html += `<td>${c.bpmAvg}</td></tr>`;
  });

  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

/* ====== Init ====== */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    buildComposerData(data.songs);
    drawOverview();
    buildOverviewLegend();
    buildComposerTabs();
    buildTable();
  });

window.addEventListener('resize', () => drawOverview());
