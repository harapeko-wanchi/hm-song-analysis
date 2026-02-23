/* ====== Hey!Mommy! Position Map — shared logic ====== */

/* ------ Coordinate helpers ------ */
const RANGE_A = 10.5;
const RANGE_B = 10.5;
const RANGE_C = 10.5;
const PAD = 4;   // % padding so edge icons don't clip

function coordToPercent(val, range) {
  const raw = ((val + range) / (range * 2)) * 100;   // 0–100
  return PAD + raw * (100 - PAD * 2) / 100;           // PAD–(100-PAD)
}

function addGridLines(container, range, maxVal) {
  for (let v = -maxVal; v <= maxVal; v++) {
    if (v === 0) continue;
    const h = document.createElement('div');
    h.className = 'map-grid-line h';
    h.style.top = (100 - coordToPercent(v, range)) + '%';
    container.appendChild(h);
    const vl = document.createElement('div');
    vl.className = 'map-grid-line v';
    vl.style.left = coordToPercent(v, range) + '%';
    container.appendChild(vl);
  }
}

/* ------ Build point ------ */
function buildPoint(song, mapKey, range) {
  const coord = song[mapKey];
  if (!coord) return null;
  const x = coord.x ?? 0;
  const y = coord.y ?? 0;

  const el = document.createElement('div');
  el.className = 'map-point';
  el.style.left = coordToPercent(x, range) + '%';
  el.style.top  = (100 - coordToPercent(y, range)) + '%';

  let thumbInner;
  if (song.thumbnail_url) {
    thumbInner = `
      <div class="map-point-thumb">
        <img src="${song.thumbnail_url}" alt="${song.title}" loading="lazy">
        ${song.youtube_url ? '<div class="map-point-play">▶</div>' : ''}
      </div>`;
  } else {
    thumbInner = `<div class="map-point-placeholder">${song.title}</div>`;
  }

  // Tooltip rows differ per map
  let ttRows;
  if (mapKey === 'mapA') {
    ttRows = [
      ['キュート', song.scores?.cute],
      ['クール',   song.scores?.cool],
      ['お祭り感', song.scores?.party],
      ['BPM',      song.bpm],
    ];
  } else if (mapKey === 'mapB') {
    ttRows = [
      ['バンド',   song.scores?.band],
      ['疾走感',   song.scores?.speed],
      ['BPM',      song.bpm],
    ];
  } else {
    ttRows = [
      ['子供心',   song.scores?.childlike],
      ['ハッピー', song.scores?.bright],
      ['エモ',     song.scores?.emo],
      ['BPM',      song.bpm],
    ];
  }
  const ttHTML = ttRows.map(([l, v]) =>
    `<div class="tt-row"><span>${l}</span><span>${v ?? '–'}</span></div>`
  ).join('');

  el.innerHTML = `
    ${song.youtube_url ? `<a href="${song.youtube_url}" target="_blank" rel="noopener">` : ''}
    ${thumbInner}
    ${song.youtube_url ? '</a>' : ''}
    <div class="map-point-title">${song.title}</div>`;

  /* Store tooltip data on the element */
  const youtubeLink = song.youtube_url
    ? `<a class="tt-youtube" href="${song.youtube_url}" target="_blank" rel="noopener">▶ YouTubeで見る</a>`
    : '';
  el._tooltipHTML = `
    <div class="tt-title">${song.title}</div>
    ${ttHTML}
    <div style="margin-top:.3rem;font-size:.68rem;color:var(--muted);">(${x}, ${y})</div>
    ${youtubeLink}`;

  return el;
}

/* ====== Zoom / Pan engine ====== */
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;          // per wheel tick
const BTN_ZOOM_STEP = 0.4;       // per button click

const mapStates = {};  // keyed by container id

function getState(id) {
  if (!mapStates[id]) mapStates[id] = { zoom: 1, panX: 0, panY: 0 };
  return mapStates[id];
}

function applyTransform(container) {
  const s = getState(container.id);
  container.style.transform = `scale(${s.zoom}) translate(${s.panX}px, ${s.panY}px)`;
  container.style.setProperty('--inv-zoom', 1 / s.zoom);
}

function clampPan(container) {
  const s = getState(container.id);
  const vp = container.parentElement;
  const vpW = vp.clientWidth;
  const vpH = vp.clientHeight;
  const overX = (vpW * s.zoom - vpW) / (2 * s.zoom);
  const overY = (vpH * s.zoom - vpH) / (2 * s.zoom);
  s.panX = Math.max(-overX, Math.min(overX, s.panX));
  s.panY = Math.max(-overY, Math.min(overY, s.panY));
}

function zoomAt(container, delta, cx, cy) {
  const s = getState(container.id);
  const oldZoom = s.zoom;
  s.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom + delta));
  if (s.zoom === oldZoom) return;
  const ratio = 1 - s.zoom / oldZoom;
  const vp = container.parentElement;
  const rect = vp.getBoundingClientRect();
  const relX = cx - rect.left - rect.width / 2;
  const relY = cy - rect.top - rect.height / 2;
  s.panX += (relX / oldZoom) * ratio;
  s.panY += (relY / oldZoom) * ratio;
  clampPan(container);
  applyTransform(container);
}

function resetZoom(container) {
  const s = getState(container.id);
  s.zoom = 1; s.panX = 0; s.panY = 0;
  applyTransform(container);
}

function initZoomPan(container) {
  const vp = container.parentElement;
  const s = getState(container.id);

  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomAt(container, delta, e.clientX, e.clientY);
  }, { passive: false });

  let dragging = false, lastX, lastY;
  let activeTouches = 0;           // track finger count to suppress drag during pinch

  vp.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    /* Don't capture pointer if clicking a link inside a map-point (desktop YouTube nav) */
    if (!isTouchDevice() && e.target.closest('.map-point a')) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    vp.setPointerCapture(e.pointerId);
    vp.style.cursor = 'grabbing';
    hideTooltip();
  });
  vp.addEventListener('pointermove', e => {
    if (!dragging || activeTouches >= 2) return;   // suppress pan while pinching
    const dx = (e.clientX - lastX) / s.zoom;
    const dy = (e.clientY - lastY) / s.zoom;
    s.panX += dx; s.panY += dy;
    clampPan(container);
    applyTransform(container);
    lastX = e.clientX; lastY = e.clientY;
  });
  const stopDrag = () => { dragging = false; vp.style.cursor = ''; };
  vp.addEventListener('pointerup', stopDrag);
  vp.addEventListener('pointercancel', stopDrag);

  let pinchDist = 0;
  vp.addEventListener('touchstart', e => {
    activeTouches = e.touches.length;
    if (activeTouches >= 2) {
      e.preventDefault();                          // block browser zoom/scroll immediately
      pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }, { passive: false });
  vp.addEventListener('touchmove', e => {
    if (e.touches.length >= 2) {
      e.preventDefault();
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (newDist - pinchDist) * 0.005;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomAt(container, delta, cx, cy);
      pinchDist = newDist;
    }
  }, { passive: false });
  vp.addEventListener('touchend', e => {
    activeTouches = e.touches.length;
  }, { passive: true });

}

/* --- Control buttons --- */
document.querySelectorAll('.map-ctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const container = document.getElementById(btn.dataset.target);
    const action = btn.dataset.action;
    if (action === 'reset') {
      resetZoom(container);
    } else {
      const vp = container.parentElement;
      const rect = vp.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const delta = action === 'zoom-in' ? BTN_ZOOM_STEP : -BTN_ZOOM_STEP;
      zoomAt(container, delta, cx, cy);
    }
  });
});

/* ------ Shared floating tooltip ------ */
const tooltip = document.createElement('div');
tooltip.className = 'map-tooltip';
document.body.appendChild(tooltip);

function showTooltip(el) {
  if (!el._tooltipHTML) return;
  tooltip.innerHTML = el._tooltipHTML;
  tooltip.classList.add('visible');
  positionTooltip(el);
}
function hideTooltip() {
  tooltip.classList.remove('visible');
}
function positionTooltip(el) {
  const ptRect = el.getBoundingClientRect();
  const gap = 10;
  const ttW = tooltip.offsetWidth;
  const ttH = tooltip.offsetHeight;
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  let top;
  if (ptRect.top - gap - ttH > 0) {
    top = ptRect.top - gap - ttH;
  } else {
    top = ptRect.bottom + gap;
  }

  let left = ptRect.left + ptRect.width / 2 - ttW / 2;
  left = Math.max(6, Math.min(winW - ttW - 6, left));
  top = Math.max(6, Math.min(winH - ttH - 6, top));

  tooltip.style.top  = top + 'px';
  tooltip.style.left = left + 'px';
}

/* ------ Touch detection ------ */
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* Add .touch class to <html> for CSS hooks */
if (isTouchDevice()) document.documentElement.classList.add('touch');

function showTooltipWithClose(el) {
  if (!el._tooltipHTML) return;
  const raw = el._tooltipHTML;
  const closeBtn = '<button class="tt-close" aria-label="閉じる">✕</button>';
  // Extract title and wrap with header + close button
  const titleMatch = raw.match(/<div class="tt-title">.*?<\/div>/);
  const title = titleMatch ? titleMatch[0] : '';
  const rest = raw.replace(title, '');
  tooltip.innerHTML = `<div class="tt-header">${title}${closeBtn}</div>${rest}`;

  tooltip.querySelector('.tt-close')?.addEventListener('click', e => {
    e.stopPropagation();
    hideTooltip();
  });

  tooltip.classList.add('visible');
  positionTooltip(el);
}

function attachTooltipListeners(container) {
  /* --- Drag detection: track pointer movement to distinguish tap from drag --- */
  let dragStartX = 0, dragStartY = 0, dragMoved = false;
  const DRAG_THRESHOLD = 6; // px – movement beyond this = drag, not tap
  container.parentElement.addEventListener('pointerdown', e => {
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }, true);
  container.parentElement.addEventListener('pointermove', e => {
    if (!dragMoved && e.pressure > 0) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) dragMoved = true;
    }
  }, true);

  /* --- Desktop: hover --- */
  container.addEventListener('pointerenter', e => {
    if (isTouchDevice()) return;
    const pt = e.target.closest('.map-point');
    if (pt) showTooltip(pt);
  }, true);
  container.addEventListener('pointerleave', e => {
    if (isTouchDevice()) return;
    const pt = e.target.closest('.map-point');
    if (pt) hideTooltip();
  }, true);
  container.addEventListener('pointermove', e => {
    if (isTouchDevice()) return;
    const pt = e.target.closest('.map-point');
    if (pt && tooltip.classList.contains('visible')) positionTooltip(pt);
    else if (!pt) hideTooltip();
  }, true);

  /* --- Mobile: tap to show tooltip, block link navigation --- */
  container.addEventListener('click', e => {
    if (!isTouchDevice()) return;
    if (dragMoved) return;                       // Ignore drag release
    const pt = e.target.closest('.map-point');
    if (!pt) return;
    /* Prevent <a> from navigating */
    const anchor = e.target.closest('a');
    if (anchor && pt.contains(anchor)) {
      e.preventDefault();
    }
    /* Toggle tooltip */
    if (tooltip.classList.contains('visible') && tooltip._currentPoint === pt) {
      hideTooltip();
    } else {
      showTooltipWithClose(pt);
      tooltip._currentPoint = pt;
    }
  }, true);

  /* Dismiss tooltip when tapping outside */
  document.addEventListener('click', e => {
    if (!isTouchDevice()) return;
    if (e.target.closest('.map-point') || e.target.closest('.map-tooltip')) return;
    hideTooltip();
  });
}

/* ------ Init: load songs and populate maps ------ */
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    const mapAEl = document.getElementById('mapA');
    const mapBEl = document.getElementById('mapB');
    const mapCEl = document.getElementById('mapC');

    if (mapAEl) addGridLines(mapAEl, RANGE_A, 10);
    if (mapBEl) addGridLines(mapBEl, RANGE_B, 10);
    if (mapCEl) addGridLines(mapCEl, RANGE_C, 10);

    data.songs.forEach(song => {
      if (mapAEl) {
        const ptA = buildPoint(song, 'mapA', RANGE_A);
        if (ptA) mapAEl.appendChild(ptA);
      }
      if (mapBEl) {
        const ptB = buildPoint(song, 'mapB', RANGE_B);
        if (ptB) mapBEl.appendChild(ptB);
      }
      if (mapCEl) {
        const ptC = buildPoint(song, 'mapC', RANGE_C);
        if (ptC) mapCEl.appendChild(ptC);
      }
    });

    if (mapAEl) { initZoomPan(mapAEl); attachTooltipListeners(mapAEl); }
    if (mapBEl) { initZoomPan(mapBEl); attachTooltipListeners(mapBEl); }
    if (mapCEl) { initZoomPan(mapCEl); attachTooltipListeners(mapCEl); }
  })
  .catch(err => console.error('Failed to load songs.json', err));
