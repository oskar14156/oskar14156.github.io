/* Site menu: a button at the top left of every page opens a panel with every app and section. */
(function () {
  const header = document.querySelector('.pf-header');
  if (!header || document.querySelector('.pf-menu-btn')) return;
  const apps = [['voyeva', 'Voyeva', 'Travel'], ['novus', 'Novus', 'Training'], ['stub', 'Stub', 'Receipts'],
    ['unscroll', 'Unscroll', 'Screen time'], ['riseproof', 'RiseProof', 'Alarm'], ['vbg', 'Video Background Remover', 'Video']];
  const here = location.pathname;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'pf-menu-btn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'pf-menu');
  btn.innerHTML = '<span class="pf-menu-icon" aria-hidden="true"><i></i><i></i></span><span class="pf-menu-label">Menu</span>';
  header.insertBefore(btn, header.firstChild);

  const menu = document.createElement('div');
  menu.className = 'pf-menu'; menu.id = 'pf-menu'; menu.hidden = true;
  menu.innerHTML = `<div class="pf-menu-backdrop" data-close></div>
  <nav class="pf-menu-panel" aria-label="Site menu" data-lenis-prevent>
    <button type="button" class="pf-menu-close" data-close aria-label="Close menu">Close</button>
    <p class="pf-menu-group">Apps</p>
    <ul class="pf-menu-apps">${apps.map(([s, n, k]) => `<li><a href="/developer/${s}/"${here.startsWith('/developer/' + s + '/') ? ' aria-current="page"' : ''}><img src="/developer/shots/icons/${s}.png" alt="" width="36" height="36"><span>${n}</span><small>${k}</small></a></li>`).join('')}</ul>
    <p class="pf-menu-group">Tooling</p>
    <ul class="pf-menu-links"><li><a href="/developer/appreleaser/"${here.startsWith('/developer/appreleaser') ? ' aria-current="page"' : ''}>AppReleaser</a></li></ul>
    <p class="pf-menu-group">Portfolio</p>
    <ul class="pf-menu-links">
      <li><a href="/developer/#work">All apps</a></li><li><a href="/developer/#path">How I got here</a></li>
      <li><a href="/developer/#practice">How I ship</a></li><li><a href="/developer/#tools">Side projects</a></li>
      <li><a href="/developer/#contact">Contact</a></li><li><a href="/">Home</a></li>
    </ul>
    <p class="pf-menu-foot"><a href="https://play.google.com/store/apps/developer?id=Oskar+Polster" rel="noopener">Google Play ↗</a></p>
  </nav>`;
  document.body.appendChild(menu);

  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement; menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    btn.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('pf-menu-open');
    menu.querySelector('.pf-menu-close').focus();
  };
  const close = () => {
    menu.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('pf-menu-open');
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
  };
  btn.addEventListener('click', () => (menu.classList.contains('is-open') ? close() : open()));
  menu.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(); });
})();
