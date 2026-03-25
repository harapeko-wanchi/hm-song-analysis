/* ===== 打線メーカー ===== */

const FIELDING_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const POSITION_LABEL = {
  P:  '投手',
  C:  '捕手',
  '1B': '一塁',
  '2B': '二塁',
  '3B': '三塁',
  SS: '遊撃',
  LF: '左翼',
  CF: '中堅',
  RF: '右翼',
  DH: '指名打者',
};
const PITCHER_COUNT = 1;
const DEFAULT_POSITION = '';
const COMMENT_MAX = 40;
const DEBOUNCE_MS = 400;

// URL compact encoding: position → 1 char
const POS_CHAR = { '':'_', P:'p', C:'c', '1B':'1', '2B':'2', '3B':'3', SS:'s', LF:'l', CF:'m', RF:'r', DH:'d' };
const CHAR_POS = Object.fromEntries(Object.entries(POS_CHAR).map(([k,v]) => [v,k]));


// ===== State =====
const state = {
  slots: Array.from({ length: 9 }, () => ({
    songId: null,
    position: DEFAULT_POSITION,
    comment: ''
  })),
  pitchers: Array.from({ length: PITCHER_COUNT }, () => ({ songId: null, comment: '' }))
};

let allSongs = [];
let songMap = {};
let poolFilter = { query: '' };
let pickerTarget = null; // { type: 'slot'|'pitcher', idx: number }
// DnD tracking: type = 'pool' | 'slot' | 'pitcher', idx = index or null
let dragging = { songId: null, type: null, idx: null };
let commentDebounceTimer = null;
let toastTimer = null;

// ===== DOM references =====
const poolListEl = document.getElementById('btPoolList');
const lineupEl = document.getElementById('btLineup');
const pitcherSlotsEl = document.getElementById('btPitcherSlots');
const searchEl = document.getElementById('btSearch');
const toastEl = document.getElementById('btToast');
const pickerModalEl = document.getElementById('btModal');
const pickerListEl = document.getElementById('btModalList');
let pickerAxis = 'release';
let pickerOrder = 'desc';

function updatePickerChips() {
  document.querySelectorAll('#btPickerChips .bt-picker-chip').forEach(c => {
    const active = c.dataset.axis === pickerAxis;
    c.classList.toggle('active', active);
    c.textContent = active
      ? `${c.dataset.label} ${pickerOrder === 'desc' ? '▼' : '▲'}`
      : c.dataset.label;
  });
}

// ===== Init =====
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    allSongs = data.songs;
    songMap = Object.fromEntries(allSongs.map(s => [s.id, s]));

    buildSlotDOM();
    buildPitcherDOM();
    renderPool();

    // Restore state from URL
    const decoded = decodeState(location.search);
    if (decoded) {
      decoded.slots.forEach((slot, i) => {
        if (slot.songId && songMap[slot.songId]) {
          state.slots[i] = { ...state.slots[i], ...slot };
        } else {
          state.slots[i].position = slot.position;
          state.slots[i].comment = slot.comment;
        }
      });
      decoded.pitchers.forEach((p, i) => {
        if (p.songId && songMap[p.songId]) state.pitchers[i].songId = p.songId;
        state.pitchers[i].comment = p.comment;
      });
    }

    renderLineup();
    renderPitchers();
    syncPoolUsedState();
    attachDragHandlers();
    attachActionHandlers();
  });

// ===== Build Batting Slot DOM =====
function buildSlotDOM() {
  lineupEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'bt-slot';
    slot.dataset.slot = i;
    slot.innerHTML = `
      <div class="bt-slot-header">
        <span class="bt-slot-num">${i + 1}番</span>
        <select class="bt-pos-select" aria-label="守備位置"><option value="">未選択</option></select>
        <button class="bt-slot-remove" aria-label="削除" hidden>✕</button>
      </div>
      <div class="bt-slot-body">
        <div class="bt-slot-empty-zone"><span class="bt-hint-pointer">ドラッグ or クリックで曲を追加</span><span class="bt-hint-touch">タップして曲を選択</span></div>
        <div class="bt-slot-song">
          <img class="bt-slot-thumb" alt="" loading="lazy">
          <div class="bt-slot-info">
            <div class="bt-slot-title"></div>
            <div class="bt-slot-meta"></div>
            <input class="bt-slot-comment" type="text" maxlength="${COMMENT_MAX}"
              placeholder="コメント（例：圧倒的な出塁率で不動のトップバッター）">
          </div>
        </div>
      </div>
    `;
    lineupEl.appendChild(slot);
  }
}

// ===== Build Pitcher Slot DOM =====
function buildPitcherDOM() {
  pitcherSlotsEl.innerHTML = '';
  for (let i = 0; i < PITCHER_COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'bt-slot bt-pitcher-slot';
    slot.dataset.pitcher = i;
    slot.innerHTML = `
      <div class="bt-slot-header">
        <span class="bt-pitcher-role">投手</span>
        <button class="bt-slot-remove" aria-label="削除" hidden>✕</button>
      </div>
      <div class="bt-slot-body">
        <div class="bt-slot-empty-zone"><span class="bt-hint-pointer">ドラッグ or クリックで曲を追加</span><span class="bt-hint-touch">タップして曲を選択</span></div>
        <div class="bt-slot-song">
          <img class="bt-slot-thumb" alt="" loading="lazy">
          <div class="bt-slot-info">
            <div class="bt-slot-title"></div>
            <div class="bt-slot-meta"></div>
            <input class="bt-slot-comment" type="text" maxlength="${COMMENT_MAX}"
              placeholder="コメント（例：圧倒的な球威で試合を支配する絶対的エース）">
          </div>
        </div>
      </div>
    `;
    pitcherSlotsEl.appendChild(slot);
  }
}

// ===== Render Pool =====
function renderPool() {
  const usedIds = getUsedSongIds();
  const q = poolFilter.query.toLowerCase();
  const filtered = allSongs.filter(song =>
    !q || song.title.toLowerCase().includes(q)
  );

  poolListEl.innerHTML = '';
  filtered.forEach(song => {
    const chip = document.createElement('div');
    chip.className = 'bt-song-chip' + (usedIds.has(song.id) ? ' bt-used' : '');
    chip.draggable = true;
    chip.dataset.songId = song.id;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', song.title);
    chip.innerHTML = `
      <img class="bt-chip-thumb" src="${song.thumbnail_url || ''}" alt="" loading="lazy"
        onerror="this.style.visibility='hidden'">
      <div class="bt-chip-info">
        <div class="bt-chip-title">${song.title}</div>
        <div class="bt-chip-meta">BPM ${song.bpm || '?'} · ${song.key || ''}</div>
      </div>
    `;
    poolListEl.appendChild(chip);
  });
}

// ===== Render Slot (shared helper) =====
function renderSlotEl(slotEl, data) {
  const emptyZone    = slotEl.querySelector('.bt-slot-empty-zone');
  const songDiv      = slotEl.querySelector('.bt-slot-song');
  const removeBtn    = slotEl.querySelector('.bt-slot-remove');
  const commentInput = slotEl.querySelector('.bt-slot-comment');

  if (data.songId && songMap[data.songId]) {
    const song = songMap[data.songId];
    emptyZone.style.display = 'none';
    songDiv.classList.add('visible');
    removeBtn.removeAttribute('hidden');
    slotEl.querySelector('.bt-slot-thumb').src = song.thumbnail_url || '';
    slotEl.querySelector('.bt-slot-title').textContent = song.title;
    slotEl.querySelector('.bt-slot-meta').textContent =
      `BPM ${song.bpm || '?'} · Key ${song.key || '?'} · ${song.composer || ''}`;
    commentInput.value = data.comment;
  } else {
    emptyZone.style.display = '';
    songDiv.classList.remove('visible');
    removeBtn.setAttribute('hidden', '');
    commentInput.value = '';
  }
}

// ===== Render Lineup =====
function renderLineup() {
  lineupEl.querySelectorAll('.bt-slot').forEach((slotEl, i) => renderSlotEl(slotEl, state.slots[i]));
  syncPositionSelects();
}

// ===== Render Pitchers =====
function renderPitchers() {
  pitcherSlotsEl.querySelectorAll('.bt-pitcher-slot').forEach((slotEl, i) => renderSlotEl(slotEl, state.pitchers[i]));
}

// ===== Sync Position Selects =====
function syncPositionSelects() {
  const usedBySlot = state.slots.map(s => s.position || '');
  lineupEl.querySelectorAll('.bt-slot').forEach((slotEl, i) => {
    const select = slotEl.querySelector('.bt-pos-select');
    const currentPos = usedBySlot[i];
    const usedByOthers = new Set(usedBySlot.filter((p, j) => j !== i && p !== ''));
    const options = ['<option value="">未選択</option>'];
    FIELDING_POSITIONS.forEach(p => {
      if (!usedByOthers.has(p) || p === currentPos) {
        const sel = p === currentPos ? ' selected' : '';
        options.push(`<option value="${p}"${sel}>${p}（${POSITION_LABEL[p]}）</option>`);
      }
    });
    select.innerHTML = options.join('');
  });
}

// ===== Helpers =====
function getUsedSongIds() {
  const ids = new Set();
  state.slots.forEach(s => { if (s.songId) ids.add(s.songId); });
  state.pitchers.forEach(p => { if (p.songId) ids.add(p.songId); });
  return ids;
}

function syncPoolUsedState() {
  const usedIds = getUsedSongIds();
  poolListEl.querySelectorAll('.bt-song-chip').forEach(chip => {
    chip.classList.toggle('bt-used', usedIds.has(chip.dataset.songId));
  });
}

// ===== Assign to slot =====
function assign(targetType, targetIdx, songId, fromType, fromIdx) {
  const getArr = t => t === 'slot' ? state.slots : state.pitchers;
  const displaced = getArr(targetType)[targetIdx].songId;
  if (fromIdx !== null) {
    if (fromType === targetType) {
      getArr(fromType)[fromIdx].songId = displaced; // swap
    } else if (fromType !== 'pool') {
      getArr(fromType)[fromIdx].songId = null;      // one-way move
    }
  }
  getArr(targetType)[targetIdx].songId = songId;
  renderLineup();
  renderPitchers();
  syncPoolUsedState();
  syncURL();
}

// ===== URL State (LZ-String compressed) =====
// Raw format: "{slotTokens}~{pitcherTokens}"
//   slot token  : "{idx36}{posChar}:{comment}" or "" if empty
//   pitcher token: "{idx36}:{comment}" or "" if empty
// → whole string compressed with LZString.compressToEncodedURIComponent → ?d=...

function buildRawState(st) {
  const slotsStr = st.slots.map(s => {
    if (!s.songId) return '';
    const idx = allSongs.findIndex(x => x.id === s.songId);
    if (idx < 0) return '';
    const posChar = POS_CHAR[s.position || ''] ?? '_';
    return idx.toString(36) + posChar + (s.comment ? ':' + s.comment : '');
  }).join('|');

  const pitchersStr = st.pitchers.map(p => {
    if (!p.songId) return '';
    const idx = allSongs.findIndex(x => x.id === p.songId);
    if (idx < 0) return '';
    return idx.toString(36) + (p.comment ? ':' + p.comment : '');
  }).join('|');

  return slotsStr + '~' + pitchersStr;
}

function parseRawState(raw) {
  // 旧フォーマットのタイトルプレフィックス(\u001E)を除去
  const rs   = raw.indexOf('\u001E');
  const body = rs >= 0 ? raw.slice(rs + 1) : raw;

  const tilde = body.indexOf('~');
  const slotsRaw    = tilde >= 0 ? body.slice(0, tilde) : body;
  const pitchersRaw = tilde >= 0 ? body.slice(tilde + 1) : '';

  const slots = slotsRaw.split('|').slice(0, 9).map(token => {
    if (!token) return { songId: null, position: '', comment: '' };
    const colon = token.indexOf(':');
    const fixed   = colon >= 0 ? token.slice(0, colon) : token;
    const comment = colon >= 0 ? token.slice(colon + 1) : '';
    const idx  = parseInt(fixed[0], 36);
    const song = Number.isFinite(idx) ? (allSongs[idx] ?? null) : null;
    return { songId: song?.id ?? null, position: CHAR_POS[fixed[1] ?? '_'] ?? '', comment };
  });

  const pitchers = pitchersRaw.split('|').slice(0, PITCHER_COUNT).map(token => {
    if (!token) return { songId: null, comment: '' };
    const colon   = token.indexOf(':');
    const idxStr  = colon >= 0 ? token.slice(0, colon) : token;
    const comment = colon >= 0 ? token.slice(colon + 1) : '';
    const idx  = parseInt(idxStr, 36);
    const song = Number.isFinite(idx) ? (allSongs[idx] ?? null) : null;
    return { songId: song?.id ?? null, comment };
  });

  while (slots.length    < 9)             slots.push({ songId: null, position: '', comment: '' });
  while (pitchers.length < PITCHER_COUNT) pitchers.push({ songId: null, comment: '' });
  return { slots, pitchers };
}

function encodeState(st) {
  const compressed = LZString.compressToEncodedURIComponent(buildRawState(st));
  return '?d=' + compressed;
}

function decodeState(search) {
  try {
    const params = new URLSearchParams(search);
    const d = params.get('d');
    if (d) {
      const raw = LZString.decompressFromEncodedURIComponent(d);
      return raw ? parseRawState(raw) : null;
    }
    return null;
  } catch {
    return null;
  }
}

function syncURL() {
  history.replaceState(null, '', encodeState(state));
}

// ===== Drag and Drop =====
function setDragging(songId, type, idx) {
  dragging = { songId, type, idx };
}

function makeDragStartHandler(type, getIdx) {
  return e => {
    const slotEl = e.target.closest('.bt-slot');
    if (!slotEl) return;
    const i = getIdx(slotEl);
    const src = type === 'slot' ? state.slots[i] : state.pitchers[i];
    if (!src.songId) { e.preventDefault(); return; }
    setDragging(src.songId, type, i);
    e.dataTransfer.setData('text/plain', JSON.stringify(dragging));
    e.dataTransfer.effectAllowed = 'move';
  };
}

function makeDropHandler(targetType, getIdx) {
  return e => {
    e.preventDefault();
    const slotEl = e.target.closest('.bt-slot');
    if (!slotEl) return;
    slotEl.classList.remove('bt-drag-over');

    let { songId, type: fromType, idx: fromIdx } = dragging;
    if (!songId) {
      try { ({ songId, type: fromType, idx: fromIdx } = JSON.parse(e.dataTransfer.getData('text/plain'))); }
      catch { return; }
    }

    const targetIdx = getIdx(slotEl);
    if (fromType === targetType && fromIdx === targetIdx) return;

    assign(targetType, targetIdx, songId, fromType, fromIdx);
    dragging = { songId: null, type: null, idx: null };
  };
}

function attachDragHandlers() {
  // Pool → anywhere
  poolListEl.addEventListener('dragstart', e => {
    const chip = e.target.closest('.bt-song-chip');
    if (!chip || chip.classList.contains('bt-used')) { e.preventDefault(); return; }
    setDragging(chip.dataset.songId, 'pool', null);
    e.dataTransfer.setData('text/plain', JSON.stringify(dragging));
    e.dataTransfer.effectAllowed = 'move';
    chip.classList.add('bt-dragging');
  });
  poolListEl.addEventListener('dragend', e => {
    const chip = e.target.closest('.bt-song-chip');
    if (chip) chip.classList.remove('bt-dragging');
    dragging = { songId: null, type: null, idx: null };
  });

  // Lineup slots: drag source
  lineupEl.addEventListener('dragstart', makeDragStartHandler('slot', el => parseInt(el.dataset.slot)));
  lineupEl.addEventListener('mousedown', e => {
    const songDiv = e.target.closest('.bt-slot-song');
    if (songDiv) { const sl = songDiv.closest('.bt-slot'); if (sl) sl.draggable = true; }
  });

  // Pitcher slots: drag source
  pitcherSlotsEl.addEventListener('dragstart', makeDragStartHandler('pitcher', el => parseInt(el.dataset.pitcher)));
  pitcherSlotsEl.addEventListener('mousedown', e => {
    const songDiv = e.target.closest('.bt-slot-song');
    if (songDiv) { const sl = songDiv.closest('.bt-slot'); if (sl) sl.draggable = true; }
  });

  // Common dragover / dragleave for any container
  [lineupEl, pitcherSlotsEl].forEach(container => {
    container.addEventListener('dragover', e => {
      const slotEl = e.target.closest('.bt-slot');
      if (!slotEl) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slotEl.classList.add('bt-drag-over');
    });
    container.addEventListener('dragleave', e => {
      const slotEl = e.target.closest('.bt-slot');
      if (slotEl && !slotEl.contains(e.relatedTarget)) slotEl.classList.remove('bt-drag-over');
    });
  });

  // Drop on lineup
  lineupEl.addEventListener('drop', makeDropHandler('slot', el => parseInt(el.dataset.slot)));

  // Drop on pitcher section
  pitcherSlotsEl.addEventListener('drop', makeDropHandler('pitcher', el => parseInt(el.dataset.pitcher)));
}

// ===== Song Picker Modal =====
function openPicker(type, idx) {
  pickerTarget = { type, idx };
  const label = type === 'slot' ? `${idx + 1}番` : '投手';
  document.getElementById('btModalTitle').textContent = `${label} — 曲を選択`;
  pickerAxis = 'release';
  pickerOrder = 'desc';
  updatePickerChips();
  renderPickerList();
  pickerModalEl.removeAttribute('hidden');
}

function closePicker() {
  pickerModalEl.setAttribute('hidden', '');
  pickerTarget = null;
}

function renderPickerList() {
  const usedIds = getUsedSongIds();
  const desc = pickerOrder === 'desc';
  let available = allSongs.filter(s => !usedIds.has(s.id));

  if (pickerAxis === 'release') {
    available.sort((a, b) => {
      if (!a.release_date && !b.release_date) return 0;
      if (!a.release_date) return desc ? -1 : 1;
      if (!b.release_date) return desc ? 1 : -1;
      return desc
        ? b.release_date.localeCompare(a.release_date)
        : a.release_date.localeCompare(b.release_date);
    });
  } else if (pickerAxis === 'bpm') {
    available.sort((a, b) => {
      if (!a.bpm && !b.bpm) return 0;
      if (!a.bpm) return 1;
      if (!b.bpm) return -1;
      return desc ? b.bpm - a.bpm : a.bpm - b.bpm;
    });
  } else {
    available.sort((a, b) => {
      const sa = a.scores ? (a.scores[pickerAxis] ?? -1) : -1;
      const sb = b.scores ? (b.scores[pickerAxis] ?? -1) : -1;
      if (sa < 0 && sb < 0) return 0;
      if (sa < 0) return 1;
      if (sb < 0) return -1;
      return desc ? sb - sa : sa - sb;
    });
  }

  if (available.length === 0) {
    pickerListEl.innerHTML = '<div class="bt-modal-empty">該当する曲がありません</div>';
    return;
  }

  pickerListEl.innerHTML = '';
  available.forEach(song => {
    const item = document.createElement('div');
    item.className = 'bt-modal-item';
    item.dataset.songId = song.id;
    item.innerHTML = `
      <img class="bt-chip-thumb" src="${song.thumbnail_url || ''}" alt="" loading="lazy"
        onerror="this.style.visibility='hidden'">
      <div class="bt-chip-info">
        <div class="bt-chip-title">${song.title}</div>
        <div class="bt-chip-meta">BPM ${song.bpm || '?'} · ${song.key || ''}</div>
      </div>
    `;
    pickerListEl.appendChild(item);
  });
}

// ===== Slot Handlers (shared: click to open picker / remove / comment input) =====
function attachSlotHandlers(containerEl, type, getIdx) {
  containerEl.addEventListener('click', e => {
    if (e.target.closest('.bt-slot-comment')) return;
    const body = e.target.closest('.bt-slot-body');
    if (body) { openPicker(type, getIdx(body.closest('.bt-slot'))); return; }
    const btn = e.target.closest('.bt-slot-remove');
    if (btn) {
      const i = getIdx(btn.closest('.bt-slot'));
      const arr = type === 'slot' ? state.slots : state.pitchers;
      arr[i].songId = null;
      arr[i].comment = '';
      renderLineup();
      renderPitchers();
      syncPoolUsedState();
      syncURL();
    }
  });
  containerEl.addEventListener('input', e => {
    if (!e.target.matches('.bt-slot-comment')) return;
    const i = getIdx(e.target.closest('.bt-slot'));
    (type === 'slot' ? state.slots : state.pitchers)[i].comment = e.target.value;
    clearTimeout(commentDebounceTimer);
    commentDebounceTimer = setTimeout(syncURL, DEBOUNCE_MS);
  });
}

// ===== Click / Action Handlers =====
function attachActionHandlers() {
  attachSlotHandlers(lineupEl,       'slot',    el => parseInt(el.dataset.slot));
  attachSlotHandlers(pitcherSlotsEl, 'pitcher', el => parseInt(el.dataset.pitcher));

  // Position change (batting slots only)
  lineupEl.addEventListener('change', e => {
    if (e.target.matches('.bt-pos-select')) {
      const i = parseInt(e.target.closest('.bt-slot').dataset.slot);
      state.slots[i].position = e.target.value;
      syncPositionSelects();
      syncURL();
    }
  });

  // Search
  searchEl.addEventListener('input', () => {
    poolFilter.query = searchEl.value;
    renderPool();
    syncPoolUsedState();
  });

  // Reset
  document.getElementById('btReset').addEventListener('click', () => {
    if (!confirm('打線をリセットしますか？')) return;
    state.slots.forEach(s => { s.songId = null; s.position = ''; s.comment = ''; });
    state.pitchers.forEach(p => { p.songId = null; p.comment = ''; });
    buildSlotDOM();
    buildPitcherDOM();
    attachDragHandlers();
    renderLineup();
    renderPitchers();
    syncPoolUsedState();
    history.replaceState(null, '', location.pathname);
  });

  // Twitter share
  document.getElementById('btShareTwitter').addEventListener('click', () => {
    const params = new URLSearchParams({ text: buildShareText(), url: location.href });
    window.open('https://twitter.com/intent/tweet?' + params, '_blank', 'noopener,width=600,height=450');
  });

  // Copy link
  document.getElementById('btCopyLink').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('リンクをコピーしました');
    } catch {
      window.prompt('URLをコピー:', location.href);
    }
  });

  // Download image
  document.getElementById('btDownloadImg').addEventListener('click', generateImage);

  // Picker: song selection
  pickerListEl.addEventListener('click', e => {
    const item = e.target.closest('.bt-modal-item');
    if (!item || !pickerTarget) return;
    const songId = item.dataset.songId;
    assign(pickerTarget.type, pickerTarget.idx, songId, 'pool', null);
    closePicker();
  });

  // Picker: axis chips
  document.getElementById('btPickerChips').addEventListener('click', e => {
    const chip = e.target.closest('.bt-picker-chip');
    if (!chip) return;
    if (chip.dataset.axis === pickerAxis) {
      pickerOrder = pickerOrder === 'desc' ? 'asc' : 'desc';
    } else {
      pickerAxis = chip.dataset.axis;
      pickerOrder = 'desc';
    }
    updatePickerChips();
    renderPickerList();
  });

  // Picker: close
  document.getElementById('btModalClose').addEventListener('click', closePicker);
  pickerModalEl.addEventListener('click', e => { if (e.target === pickerModalEl) closePicker(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePicker(); });
}

// ===== Share Text =====
function buildShareText() {
  // Twitter: 280字 - t.co URL 23字 - 区切りスペース 1字 = 257字
  const LIMIT = 257;
  const header   = 'ヘイマミーの曲で打線組んでみた';
  const hashtags = '#ヘイマミー #打線メーカー';

  const orderLines = [];
  state.slots.forEach((slot, i) => {
    if (!slot.songId) return;
    const song = songMap[slot.songId];
    const pos = slot.position ? `(${POSITION_LABEL[slot.position][0]})` : '';
    orderLines.push(`${i + 1}${pos} ${song.title}`);
  });
  state.pitchers.forEach(p => {
    if (!p.songId) return;
    orderLines.push(`投 ${songMap[p.songId].title}`);
  });

  const full = [header, ...orderLines, hashtags].join('\n');
  if (full.length <= LIMIT) return full;

  // オーダー末尾から削って … を追加
  while (orderLines.length > 0) {
    orderLines.pop();
    const trimmed = [header, ...orderLines, '…', hashtags].join('\n');
    if (trimmed.length <= LIMIT) return trimmed;
  }

  return [header, '…', hashtags].join('\n');
}

// ===== Toast =====
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 2200);
}

// ===== Canvas Image Generation =====
function generateImage() {
  const PITCH_ROWS = state.pitchers.filter(p => p.songId).length;
  const totalRows = 9 + (PITCH_ROWS > 0 ? PITCH_ROWS + 1 : 0); // +1 for pitcher header row
  const W = 1200;
  const rowH = 54;
  const headerH = 72;
  const footerH = 30;
  const H = headerH + totalRows * rowH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0f0f14';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = '#1a1a24';
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#7c6cf0';
  ctx.fillRect(0, headerH - 2, W, 2);
  ctx.font = 'bold 26px "Segoe UI", "Noto Sans JP", sans-serif';
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText('Hey!Mommy! 打線メーカー', 32, 46);
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8888a0';
  ctx.textAlign = 'right';
  ctx.fillText('harapeko-wanchi.github.io/hm-song-analysis/', W - 24, 46);
  ctx.textAlign = 'left';

  // Batting rows
  state.slots.forEach((slot, i) => {
    drawRow(ctx, i, headerH + i * rowH, rowH, {
      label: `${i + 1}番`,
      labelColor: '#7c6cf0',
      sublabel: slot.position ? `${slot.position}（${POSITION_LABEL[slot.position]}）` : '',
      songId: slot.songId,
      comment: slot.comment,
      even: i % 2 === 0,
    });
  });

  // Pitcher section
  if (PITCH_ROWS > 0) {
    const pitchStartY = headerH + 9 * rowH;

    // Pitcher section header
    ctx.fillStyle = '#22222e';
    ctx.fillRect(0, pitchStartY, W, rowH);
    ctx.fillStyle = '#7c6cf0';
    ctx.fillRect(0, pitchStartY + rowH - 1, W, 1);
    ctx.font = 'bold 14px "Segoe UI", "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#7c6cf0';
    ctx.fillText('投手陣', 32, pitchStartY + rowH / 2 + 5);

    let pitchRow = 0;
    state.pitchers.forEach(p => {
      if (!p.songId) return;
      drawRow(ctx, pitchRow, pitchStartY + (pitchRow + 1) * rowH, rowH, {
        label: '投手',
        labelColor: '#f06c9c',
        sublabel: 'P（投手）',
        songId: p.songId,
        comment: p.comment,
        even: pitchRow % 2 === 0,
      });
      pitchRow++;
    });
  }

  // Footer
  ctx.fillStyle = '#22222e';
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8888a0';
  ctx.fillText('#へいまみ打線メーカー', 20, H - 10);

  // Download
  try {
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hm-batting-order.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  } catch {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'hm-batting-order.png';
    a.click();
  }
}

function drawRow(ctx, _rowIdx, y, rowH, { label, labelColor, sublabel, songId, comment, even }) {
  ctx.fillStyle = even ? '#1a1a24' : '#141420';
  ctx.fillRect(0, y, 1200, rowH);
  ctx.fillStyle = '#2e2e3e';
  ctx.fillRect(0, y + rowH - 1, 1200, 1);

  // Label (番号 or 役割)
  ctx.font = 'bold 18px "Segoe UI", "Noto Sans JP", sans-serif';
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'left';
  ctx.fillText(label, 20, y + rowH / 2 + 6);

  // Sublabel (守備位置)
  if (sublabel) {
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8888a0';
    ctx.fillText(sublabel, 78, y + rowH / 2 + 6);
  }

  if (songId && songMap[songId]) {
    const song = songMap[songId];
    // Placeholder swatch
    ctx.fillStyle = '#22222e';
    fillRoundRect(ctx, 195, y + 7, 50, rowH - 14, 4);
    ctx.fillStyle = '#7c6cf040';
    fillRoundRect(ctx, 195, y + 7, 50, rowH - 14, 4);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#7c6cf0';
    ctx.textAlign = 'center';
    ctx.fillText('♪', 220, y + rowH / 2 + 6);
    ctx.textAlign = 'left';

    // Title
    ctx.font = 'bold 15px "Segoe UI", "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#e8e8f0';
    ctx.fillText(truncateText(ctx, song.title, 340), 258, y + rowH / 2 - 2);

    // Meta
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8888a0';
    ctx.fillText(`BPM ${song.bpm || '?'}  Key: ${song.key || '?'}  ${song.composer || ''}`, 258, y + rowH / 2 + 14);

    // Comment
    if (comment) {
      ctx.font = 'italic 12px "Segoe UI", "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#f06c9c';
      ctx.textAlign = 'right';
      ctx.fillText('「' + truncateText(ctx, comment, 380) + '」', 1176, y + rowH / 2 + 6);
      ctx.textAlign = 'left';
    }
  } else {
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#2e2e3e';
    ctx.fillText('(空き)', 195, y + rowH / 2 + 5);
  }
}

function fillRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

