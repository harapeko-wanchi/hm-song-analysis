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
const PITCHER_ROLES = ['先発', '中継ぎ', '抑え'];
const DEFAULT_POSITION = '';
const COMMENT_MAX = 40;
const DEBOUNCE_MS = 400;

// ===== State =====
const state = {
  slots: Array.from({ length: 9 }, () => ({
    songId: null,
    position: DEFAULT_POSITION,
    comment: ''
  })),
  pitchers: PITCHER_ROLES.map(role => ({
    role,
    songId: null,
    comment: ''
  }))
};

let allSongs = [];
let songMap = {};
let poolFilter = { query: '' };
let selectedSong = null;
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
    attachTouchHandlers();
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
        <div class="bt-slot-empty-zone">曲をドラッグ or タップで選択</div>
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
  PITCHER_ROLES.forEach((role, i) => {
    const slot = document.createElement('div');
    slot.className = 'bt-slot bt-pitcher-slot';
    slot.dataset.pitcher = i;
    slot.innerHTML = `
      <div class="bt-slot-header">
        <span class="bt-pitcher-role">${role}</span>
        <button class="bt-slot-remove" aria-label="削除" hidden>✕</button>
      </div>
      <div class="bt-slot-body">
        <div class="bt-slot-empty-zone">曲をドラッグ or タップで選択</div>
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
  });
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

// ===== Render Lineup =====
function renderLineup() {
  lineupEl.querySelectorAll('.bt-slot').forEach((slotEl, i) => {
    const slot = state.slots[i];
    const emptyZone = slotEl.querySelector('.bt-slot-empty-zone');
    const songDiv = slotEl.querySelector('.bt-slot-song');
    const removeBtn = slotEl.querySelector('.bt-slot-remove');
    const commentInput = slotEl.querySelector('.bt-slot-comment');

    if (slot.songId && songMap[slot.songId]) {
      const song = songMap[slot.songId];
      emptyZone.style.display = 'none';
      songDiv.classList.add('visible');
      removeBtn.removeAttribute('hidden');
      slotEl.querySelector('.bt-slot-thumb').src = song.thumbnail_url || '';
      slotEl.querySelector('.bt-slot-title').textContent = song.title;
      slotEl.querySelector('.bt-slot-meta').textContent =
        `BPM ${song.bpm || '?'} · Key ${song.key || '?'} · ${song.composer || ''}`;
      commentInput.value = slot.comment;
    } else {
      emptyZone.style.display = '';
      songDiv.classList.remove('visible');
      removeBtn.setAttribute('hidden', '');
      commentInput.value = '';
    }
  });
  syncPositionSelects();
}

// ===== Render Pitchers =====
function renderPitchers() {
  pitcherSlotsEl.querySelectorAll('.bt-pitcher-slot').forEach((slotEl, i) => {
    const pitcher = state.pitchers[i];
    const emptyZone = slotEl.querySelector('.bt-slot-empty-zone');
    const songDiv = slotEl.querySelector('.bt-slot-song');
    const removeBtn = slotEl.querySelector('.bt-slot-remove');
    const commentInput = slotEl.querySelector('.bt-slot-comment');

    if (pitcher.songId && songMap[pitcher.songId]) {
      const song = songMap[pitcher.songId];
      emptyZone.style.display = 'none';
      songDiv.classList.add('visible');
      removeBtn.removeAttribute('hidden');
      slotEl.querySelector('.bt-slot-thumb').src = song.thumbnail_url || '';
      slotEl.querySelector('.bt-slot-title').textContent = song.title;
      slotEl.querySelector('.bt-slot-meta').textContent =
        `BPM ${song.bpm || '?'} · Key ${song.key || '?'} · ${song.composer || ''}`;
      commentInput.value = pitcher.comment;
    } else {
      emptyZone.style.display = '';
      songDiv.classList.remove('visible');
      removeBtn.setAttribute('hidden', '');
      commentInput.value = '';
    }
  });
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

function clearSelectedSong() {
  selectedSong = null;
  poolListEl.querySelectorAll('.bt-song-chip').forEach(c => c.classList.remove('bt-selected'));
}

// ===== Assign to batting slot =====
function assignSlot(targetIdx, songId, fromType, fromIdx) {
  const displaced = state.slots[targetIdx].songId;

  // Clear source
  if (fromType === 'slot' && fromIdx !== null) {
    state.slots[fromIdx].songId = displaced; // swap
  } else if (fromType === 'pitcher' && fromIdx !== null) {
    state.pitchers[fromIdx].songId = null;   // one-way move, displaced is cleared
    if (displaced) { /* displaced batting song is just lost from slot */ }
    // Actually place displaced back into pitcher slot if empty? No — keep it simple: displace clears.
  }
  // fromType === 'pool': no source to clear

  state.slots[targetIdx].songId = songId;
  renderLineup();
  renderPitchers();
  syncPoolUsedState();
  syncURL();
  clearSelectedSong();
}

// ===== Assign to pitcher slot =====
function assignPitcher(targetIdx, songId, fromType, fromIdx) {
  const displaced = state.pitchers[targetIdx].songId;

  if (fromType === 'pitcher' && fromIdx !== null) {
    state.pitchers[fromIdx].songId = displaced; // swap
  } else if (fromType === 'slot' && fromIdx !== null) {
    state.slots[fromIdx].songId = null; // one-way move
  }

  state.pitchers[targetIdx].songId = songId;
  renderLineup();
  renderPitchers();
  syncPoolUsedState();
  syncURL();
  clearSelectedSong();
}

// ===== URL State =====
function encodeState(state) {
  const slots = state.slots.map(s => {
    return `${s.songId || ''}:${s.position || ''}:${encodeURIComponent(s.comment || '')}`;
  }).join('|');
  const pitchers = state.pitchers.map(p => {
    return `${p.songId || ''}:${encodeURIComponent(p.comment || '')}`;
  }).join('|');
  return `?v=2&s=${slots}&p=${pitchers}`;
}

function decodeState(search) {
  try {
    const params = new URLSearchParams(search);
    const rawS = params.get('s');
    const rawP = params.get('p');
    if (!rawS) return null;

    const slots = rawS.split('|').slice(0, 9).map(p => {
      const c1 = p.indexOf(':'), c2 = p.indexOf(':', c1 + 1);
      const id = p.slice(0, c1) || null;
      const pos = p.slice(c1 + 1, c2);
      const cmt = decodeURIComponent(p.slice(c2 + 1) || '');
      return { songId: id || null, position: FIELDING_POSITIONS.includes(pos) ? pos : '', comment: cmt };
    });

    const pitchers = rawP ? rawP.split('|').slice(0, 3).map(p => {
      const c1 = p.indexOf(':');
      const id = p.slice(0, c1) || null;
      const cmt = decodeURIComponent(p.slice(c1 + 1) || '');
      return { songId: id || null, comment: cmt };
    }) : [{ songId: null, comment: '' }, { songId: null, comment: '' }, { songId: null, comment: '' }];

    // Pad if needed
    while (pitchers.length < 3) pitchers.push({ songId: null, comment: '' });

    return { slots, pitchers };
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

function makeDropHandler(targetType, getIdx, assignFn) {
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
    // Prevent drop on same slot
    if (fromType === targetType && fromIdx === targetIdx) return;

    assignFn(targetIdx, songId, fromType, fromIdx);
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
  lineupEl.addEventListener('drop', makeDropHandler(
    'slot',
    el => parseInt(el.dataset.slot),
    assignSlot
  ));

  // Drop on pitcher section
  pitcherSlotsEl.addEventListener('drop', makeDropHandler(
    'pitcher',
    el => parseInt(el.dataset.pitcher),
    assignPitcher
  ));
}

// ===== Touch Drag and Drop =====
function attachTouchHandlers() {
  let ghost = null;
  let touchActive = false;
  let touchMoved = false;
  let touchStartPos = { x: 0, y: 0 };
  let highlighted = null;
  const THRESHOLD = 8;

  function createGhost(sourceEl, touch) {
    const rect = sourceEl.getBoundingClientRect();
    ghost = sourceEl.cloneNode(true);
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px; top: ${rect.top}px;
      width: ${rect.width}px; height: ${rect.height}px;
      opacity: .75; pointer-events: none;
      z-index: 9999; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,.5);
      transform: scale(1.04); transition: none;
    `;
    document.body.appendChild(ghost);
  }

  function moveGhost(touch) {
    if (!ghost) return;
    ghost.style.left = (touch.clientX - parseFloat(ghost.style.width) / 2) + 'px';
    ghost.style.top  = (touch.clientY - parseFloat(ghost.style.height) / 2) + 'px';
  }

  function cleanup() {
    if (ghost) { ghost.remove(); ghost = null; }
    if (highlighted) { highlighted.classList.remove('bt-drag-over'); highlighted = null; }
    touchActive = false;
    touchMoved = false;
  }

  function slotAtPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('.bt-slot') : null;
  }

  function onTouchStart(getInfo) {
    return e => {
      const info = getInfo(e);
      if (!info) return;
      touchActive = true;
      touchMoved = false;
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setDragging(info.songId, info.type, info.idx);
      // ghost is created lazily on first move past threshold
      info.sourceEl && (onTouchStart._pendingEl = info.sourceEl);
    };
  }
  onTouchStart._pendingEl = null;

  document.addEventListener('touchmove', e => {
    if (!touchActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;

    if (!touchMoved && Math.hypot(dx, dy) < THRESHOLD) return;
    touchMoved = true;
    e.preventDefault(); // prevent scroll while dragging

    if (!ghost && onTouchStart._pendingEl) createGhost(onTouchStart._pendingEl, touch);
    moveGhost(touch);

    if (highlighted) { highlighted.classList.remove('bt-drag-over'); highlighted = null; }
    const slotEl = slotAtPoint(touch.clientX, touch.clientY);
    if (slotEl) { slotEl.classList.add('bt-drag-over'); highlighted = slotEl; }
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (!touchActive) return;
    const touch = e.changedTouches[0];
    const wasDrag = touchMoved;
    const { songId, type: fromType, idx: fromIdx } = dragging;
    cleanup();
    dragging = { songId: null, type: null, idx: null };
    onTouchStart._pendingEl = null;

    if (!wasDrag || !songId) return; // short tap → let click handler work

    const slotEl = slotAtPoint(touch.clientX, touch.clientY);
    if (!slotEl) return;
    slotEl.classList.remove('bt-drag-over');

    if (slotEl.dataset.slot !== undefined && slotEl.dataset.slot !== '') {
      const idx = parseInt(slotEl.dataset.slot);
      if (!(fromType === 'slot' && fromIdx === idx)) assignSlot(idx, songId, fromType, fromIdx);
    } else if (slotEl.dataset.pitcher !== undefined && slotEl.dataset.pitcher !== '') {
      const idx = parseInt(slotEl.dataset.pitcher);
      if (!(fromType === 'pitcher' && fromIdx === idx)) assignPitcher(idx, songId, fromType, fromIdx);
    }
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    cleanup();
    dragging = { songId: null, type: null, idx: null };
    onTouchStart._pendingEl = null;
  }, { passive: true });

  // Pool chips
  poolListEl.addEventListener('touchstart', e => {
    const chip = e.target.closest('.bt-song-chip');
    if (!chip || chip.classList.contains('bt-used')) return;
    touchActive = true;
    touchMoved = false;
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragging(chip.dataset.songId, 'pool', null);
    onTouchStart._pendingEl = chip;
  }, { passive: true });

  // Filled batting slots
  lineupEl.addEventListener('touchstart', e => {
    const songDiv = e.target.closest('.bt-slot-song.visible');
    if (!songDiv) return;
    const slotEl = songDiv.closest('[data-slot]');
    if (!slotEl) return;
    const i = parseInt(slotEl.dataset.slot);
    if (!state.slots[i]?.songId) return;
    touchActive = true;
    touchMoved = false;
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragging(state.slots[i].songId, 'slot', i);
    onTouchStart._pendingEl = songDiv;
  }, { passive: true });

  // Filled pitcher slots
  pitcherSlotsEl.addEventListener('touchstart', e => {
    const songDiv = e.target.closest('.bt-slot-song.visible');
    if (!songDiv) return;
    const slotEl = songDiv.closest('[data-pitcher]');
    if (!slotEl) return;
    const i = parseInt(slotEl.dataset.pitcher);
    if (!state.pitchers[i]?.songId) return;
    touchActive = true;
    touchMoved = false;
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDragging(state.pitchers[i].songId, 'pitcher', i);
    onTouchStart._pendingEl = songDiv;
  }, { passive: true });
}

// ===== Click / Action Handlers =====
function attachActionHandlers() {
  // Pool chip click (select for click-to-assign)
  poolListEl.addEventListener('click', e => {
    const chip = e.target.closest('.bt-song-chip');
    if (!chip || chip.classList.contains('bt-used')) return;
    const songId = chip.dataset.songId;
    if (selectedSong === songId) {
      clearSelectedSong();
    } else {
      selectedSong = songId;
      poolListEl.querySelectorAll('.bt-song-chip').forEach(c => c.classList.remove('bt-selected'));
      chip.classList.add('bt-selected');
    }
  });

  // Empty zone click in lineup
  lineupEl.addEventListener('click', e => {
    const zone = e.target.closest('.bt-slot-empty-zone');
    if (zone && selectedSong) {
      const slotEl = zone.closest('.bt-slot');
      assignSlot(parseInt(slotEl.dataset.slot), selectedSong, 'pool', null);
    }
  });

  // Empty zone click in pitcher section
  pitcherSlotsEl.addEventListener('click', e => {
    const zone = e.target.closest('.bt-slot-empty-zone');
    if (zone && selectedSong) {
      const slotEl = zone.closest('.bt-slot');
      assignPitcher(parseInt(slotEl.dataset.pitcher), selectedSong, 'pool', null);
    }
  });

  // Remove from batting
  lineupEl.addEventListener('click', e => {
    const btn = e.target.closest('.bt-slot-remove');
    if (btn) {
      const i = parseInt(btn.closest('.bt-slot').dataset.slot);
      state.slots[i].songId = null;
      state.slots[i].comment = '';
      renderLineup();
      syncPoolUsedState();
      syncURL();
    }
  });

  // Remove from pitcher
  pitcherSlotsEl.addEventListener('click', e => {
    const btn = e.target.closest('.bt-slot-remove');
    if (btn) {
      const i = parseInt(btn.closest('.bt-slot').dataset.pitcher);
      state.pitchers[i].songId = null;
      state.pitchers[i].comment = '';
      renderPitchers();
      syncPoolUsedState();
      syncURL();
    }
  });

  // Position change
  lineupEl.addEventListener('change', e => {
    if (e.target.matches('.bt-pos-select')) {
      const i = parseInt(e.target.closest('.bt-slot').dataset.slot);
      state.slots[i].position = e.target.value;
      syncPositionSelects();
      syncURL();
    }
  });

  // Comment input (debounced) — batting
  lineupEl.addEventListener('input', e => {
    if (e.target.matches('.bt-slot-comment')) {
      const i = parseInt(e.target.closest('.bt-slot').dataset.slot);
      state.slots[i].comment = e.target.value;
      clearTimeout(commentDebounceTimer);
      commentDebounceTimer = setTimeout(syncURL, DEBOUNCE_MS);
    }
  });

  // Comment input (debounced) — pitcher
  pitcherSlotsEl.addEventListener('input', e => {
    if (e.target.matches('.bt-slot-comment')) {
      const i = parseInt(e.target.closest('.bt-slot').dataset.pitcher);
      state.pitchers[i].comment = e.target.value;
      clearTimeout(commentDebounceTimer);
      commentDebounceTimer = setTimeout(syncURL, DEBOUNCE_MS);
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
    clearSelectedSong();
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
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(buildShareText()), '_blank', 'noopener,width=600,height=450');
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
}

// ===== Share Text =====
function buildShareText() {
  const lines = ['【Hey!Mommy! 打線】'];

  const hasSlots = state.slots.some(s => s.songId);
  const hasPitchers = state.pitchers.some(p => p.songId);

  if (!hasSlots && !hasPitchers) {
    lines.push('（空です）');
  } else {
    state.slots.forEach((slot, i) => {
      if (!slot.songId) return;
      const song = songMap[slot.songId];
      const pos = slot.position ? `${POSITION_LABEL[slot.position] || slot.position} ` : '';
      let cmt = slot.comment ? slot.comment.slice(0, 15) : '';
      if (slot.comment && slot.comment.length > 15) cmt += '…';
      lines.push(`${i + 1}番 ${pos}${song.title}${cmt ? ` 「${cmt}」` : ''}`);
    });

    if (hasPitchers) {
      lines.push('【投手陣】');
      state.pitchers.forEach(p => {
        if (!p.songId) return;
        const song = songMap[p.songId];
        let cmt = p.comment ? p.comment.slice(0, 15) : '';
        if (p.comment && p.comment.length > 15) cmt += '…';
        lines.push(`${p.role} ${song.title}${cmt ? ` 「${cmt}」` : ''}`);
      });
    }
  }

  lines.push('#HeyMommy #打線メーカー');
  lines.push(location.href);
  return lines.join('\n');
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
        label: p.role,
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
  ctx.fillText('#HeyMommy #打線メーカー', 20, H - 10);

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
      ctx.fillText('「' + truncateTextWidth(ctx, comment, 380) + '」', 1176, y + rowH / 2 + 6);
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

function truncateTextWidth(ctx, text, maxWidth) {
  return truncateText(ctx, text, maxWidth);
}
