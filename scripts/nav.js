/* ====== Mobile nav: collapse the nav items behind a menu button ======
 * The nav markup is copied into every page; this adds the toggle button at runtime
 * so the pages don't need extra markup. Below 600px (styles/common.css) the items
 * are hidden until the menu is opened, and dropdown sub-menus are shown expanded.
 */
(function () {
  const nav = document.querySelector('.nav');
  if (!nav) return;

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
