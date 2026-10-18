/* ====== Site nav ======
 * Every page has an empty <nav class="nav"></nav> followed by this script, which fills it
 * from NAV_GROUPS. To add or rename a page, edit NAV_GROUPS only.
 * A group with one item is a plain button; a group with several is a dropdown.
 * `also`: other pages that mark the item as current (e.g. a song's page under the list).
 */
const NAV_GROUPS = [
  { label: '楽曲一覧',
    icon: '<rect x="1.5" y="1.5" width="6" height="6" rx="1"/><rect x="10.5" y="1.5" width="6" height="6" rx="1"/><rect x="1.5" y="10.5" width="6" height="6" rx="1"/><rect x="10.5" y="10.5" width="6" height="6" rx="1"/>',
    items: [{ href: 'songs.html', label: '楽曲一覧', also: ['song.html'] }] },
  { label: '分析',
    icon: '<circle cx="9" cy="9" r="7"/><line x1="9" y1="2" x2="9" y2="16"/><line x1="2" y1="9" x2="16" y2="9"/>',
    items: [
      { href: 'map.html', label: 'ポジションマップ' },
      { href: 'heatmap.html', label: 'ヒートマップ' },
      { href: 'timeline.html', label: '年表' },
      { href: 'composer.html', label: '作曲家 DNA' },
    ] },
  { label: '探す',
    icon: '<circle cx="8" cy="8" r="5"/><line x1="11.6" y1="11.6" x2="16" y2="16"/>',
    items: [
      { href: 'recommend.html', label: '似た曲レコメンド' },
      { href: 'compare.html', label: 'レーダー比較' },
    ] },
  { label: 'つくる',
    icon: '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/><circle cx="12" cy="6" r="4" stroke-dasharray="2,1.5"/>',
    items: [
      { href: 'setlist.html', label: 'セトリメーカー' },
      { href: 'batting.html', label: '打線メーカー' },
    ] },
];

(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const page = location.pathname.split('/').pop() || 'index.html';
  const isCurrent = item => item.href === page || (item.also || []).includes(page);
  const icon = g => `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.3">${g.icon}</svg>`;

  nav.innerHTML = `
    <a href="index.html" class="nav-title"><span class="nav-title-hm">Hey!Mommy!</span> Song Analysis</a>
    <a href="https://github.com/harapeko-wanchi/hm-song-analysis" class="nav-github" target="_blank" rel="noopener" title="GitHub" aria-label="GitHub リポジトリ">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.130-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.870.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    ${NAV_GROUPS.map(g => {
      const active = g.items.some(isCurrent) ? ' active' : '';
      if (g.items.length === 1) {
        return `<a href="${g.items[0].href}" class="nav-btn${active}" title="${g.label}">${icon(g)}<span>${g.label}</span></a>`;
      }
      return `<div class="nav-dropdown">
        <button class="nav-btn${active}" title="${g.label}">${icon(g)}<span>${g.label}</span></button>
        <div class="nav-dropdown-menu">
          ${g.items.map(it => `<a href="${it.href}"${isCurrent(it) ? ' class="active"' : ''}>${it.label}</a>`).join('')}
        </div>
      </div>`;
    }).join('')}`;

  /* ---- Mobile: collapse the nav items behind a menu button ----
   * Below 600px (styles/common.css) the items are hidden until the menu is opened,
   * and dropdown sub-menus are shown expanded.
   */
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'メニューを開く');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
    '<line class="nav-toggle-l1" x1="3" y1="6" x2="17" y2="6"/><line class="nav-toggle-l2" x1="3" y1="10" x2="17" y2="10"/><line class="nav-toggle-l3" x1="3" y1="14" x2="17" y2="14"/></svg>';
  const github = nav.querySelector('.nav-github');
  (github || nav.firstElementChild).after(btn);

  const setOpen = open => {
    nav.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('nav-open')));
  // Close after choosing a page, on Escape, or on a tap outside the nav
  nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('nav-open')) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) setOpen(false); });
  // Leaving the mobile layout resets the state
  window.matchMedia('(min-width: 601px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
})();
