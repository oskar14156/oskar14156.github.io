/* Stub: a receipt is scanned line by line, each line becomes a category chip, the chips
 * stack into the receipt total and a Sankey grows out of it, then the phone with a year of
 * receipts slides in. Scroll-scrubbed GSAP timeline over one SVG. */
(function () {
  const host = document.getElementById('stub-flow');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAT = { Dairy: '#7ad3a8', Produce: '#b8e05a', Bakery: '#f2b45a', Coffee: '#c98b5a', Pantry: '#f07a5a' };
  const ITEMS = [['Oat milk 1 l', 2.49, 'Dairy'], ['Greek yogurt', 3.79, 'Dairy'], ['Bananas', 1.89, 'Produce'], ['Tomatoes', 3.15, 'Produce'],
    ['Sourdough bread', 4.20, 'Bakery'], ['Coffee beans', 12.99, 'Coffee'], ['Pasta', 1.99, 'Pantry'], ['Olive oil', 9.49, 'Pantry']];
  const TOTAL = 39.99, SCALE = 9.2;                  // px per euro in the flow
  const RX = 150, RY = 150, ROW = 44;               // receipt
  const X0 = 760, Y0 = 450 - TOTAL * SCALE / 2;     // stacked total bar
  const X1 = 1180;
  // order items by category so the stacked bar groups them
  const order = Object.keys(CAT);
  const sorted = ITEMS.map((it, i) => ({ name: it[0], eur: it[1], cat: it[2], i })).sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat));
  let acc = 0; sorted.forEach((it) => { it.y = Y0 + acc * SCALE; it.h = it.eur * SCALE; acc += it.eur; });
  // category nodes on the right
  const cats = order.map((c) => ({ c, eur: ITEMS.filter((i) => i[2] === c).reduce((s, i) => s + i[1], 0) }));
  const GAP = 22, totalH = TOTAL * SCALE + GAP * (cats.length - 1);
  let cy = 450 - totalH / 2, lacc = 0;
  cats.forEach((k) => { k.y = cy; k.h = k.eur * SCALE; k.ly = Y0 + lacc * SCALE; cy += k.h + GAP; lacc += k.eur; });
  const ribbon = (k) => { const xm = (X0 + 22 + X1) / 2, a0 = k.ly, a1 = k.ly + k.h, b0 = k.y, b1 = k.y + k.h;
    return `M${X0 + 22} ${a0} C${xm} ${a0} ${xm} ${b0} ${X1} ${b0} L${X1} ${b1} C${xm} ${b1} ${xm} ${a1} ${X0 + 22} ${a1}Z`; };

  host.innerHTML = `
  <div class="sf-stage">
    <svg class="sf-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id="sfShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#3a1d0e" flood-opacity=".28"/></filter>
        <clipPath id="sfGrow"><rect class="sf-grow" x="${X0}" y="0" width="0" height="900"/></clipPath>
        <linearGradient id="sfBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a3d" stop-opacity="0"/><stop offset=".7" stop-color="#ff7a3d" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a3d"/></linearGradient>
      </defs>
      <g class="sf-receipt" filter="url(#sfShadow)">
        <path d="M${RX} ${RY} h360 v${ITEMS.length * ROW + 190} l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 z" fill="#fffdf7"/>
        <text x="${RX + 180}" y="${RY + 54}" text-anchor="middle" class="sf-mono sf-store">BILLA</text>
        <text x="${RX + 180}" y="${RY + 82}" text-anchor="middle" class="sf-mono sf-small">Wien · 14.03.2026 · 18:42</text>
        <path d="M${RX + 24} ${RY + 104} h312" stroke="#d9d2c4" stroke-dasharray="4 5"/>
        ${ITEMS.map((it, i) => `<g class="sf-row" data-i="${i}"><rect class="sf-hl" x="${RX + 14}" y="${RY + 118 + i * ROW}" width="332" height="${ROW - 6}" rx="8" fill="${CAT[it[2]]}" opacity="0"/>
          <text x="${RX + 28}" y="${RY + 145 + i * ROW}" class="sf-mono">${it[0]}</text><text x="${RX + 332}" y="${RY + 145 + i * ROW}" text-anchor="end" class="sf-mono">${it[1].toFixed(2)}</text></g>`).join('')}
        <path d="M${RX + 24} ${RY + 128 + ITEMS.length * ROW} h312" stroke="#d9d2c4" stroke-dasharray="4 5"/>
        <text x="${RX + 28}" y="${RY + 166 + ITEMS.length * ROW}" class="sf-mono sf-bold">TOTAL EUR</text><text x="${RX + 332}" y="${RY + 166 + ITEMS.length * ROW}" text-anchor="end" class="sf-mono sf-bold">${TOTAL.toFixed(2)}</text>
        <rect class="sf-beam" x="${RX - 10}" y="${RY}" width="380" height="60" fill="url(#sfBeam)" opacity="0"/>
      </g>
      <g class="sf-ribbons" clip-path="url(#sfGrow)">${cats.map((k) => `<path d="${ribbon(k)}" fill="${CAT[k.c]}" opacity=".55"/>`).join('')}</g>
      <g class="sf-nodes">${cats.map((k) => `<g class="sf-node" opacity="0"><rect x="${X1}" y="${k.y}" width="20" height="${k.h}" rx="5" fill="${CAT[k.c]}"/>
        <text x="${X1 + 36}" y="${k.y + k.h / 2 - 2}" class="sf-label">${k.c}</text><text x="${X1 + 36}" y="${k.y + k.h / 2 + 22}" class="sf-mono sf-amt">€${k.eur.toFixed(2)}</text></g>`).join('')}</g>
      <g class="sf-total" opacity="0"><text x="${X0 + 11}" y="${Y0 - 22}" text-anchor="middle" class="sf-mono sf-amt">€${TOTAL.toFixed(2)}</text></g>
      ${sorted.map((it) => `<rect class="sf-chip" data-i="${it.i}" x="0" y="0" width="22" height="${it.h}" rx="5" fill="${CAT[it.cat]}" opacity="0"/>`).join('')}
    </svg>
    <div class="sf-phone"><div class="device"><div class="device-screen"><img src="/developer/shots/stub-3.jpg?v=4" alt="" loading="lazy"></div><img class="device-frame" src="/developer/shots/frame-black.png" alt=""></div></div>
    <div class="sf-cap sf-cap-1"><p class="sf-meta">Stub · a real receipt</p><p class="sf-big">Every line is read on the phone and sorted into a category.</p></div>
    <div class="sf-cap sf-cap-2"><p class="sf-meta">Where the money went</p><p class="sf-big">One receipt becomes a flow. A year of them becomes this.</p></div>
  </div>`;

  const q = (s) => host.querySelector(s), qa = (s) => [...host.querySelectorAll(s)];
  const rows = qa('.sf-row'), chips = qa('.sf-chip');
  const rowY = (i) => RY + 118 + i * ROW;
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.fromTo('.sf-cap-1', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .04 }, .02).to('.sf-cap-1', { opacity: 0, y: -24, duration: .04 }, .4)
    .fromTo(q('.sf-receipt'), { x: -120, y: 60, rotation: -6, transformOrigin: '50% 50%' }, { x: 0, y: 0, rotation: -2, duration: .08, ease: 'power2.out' }, 0)
    .to(q('.sf-beam'), { opacity: 1, duration: .01 }, .08)
    .fromTo(q('.sf-beam'), { attr: { y: RY + 60 } }, { attr: { y: RY + 118 + ITEMS.length * ROW - 40 }, duration: .22 }, .08)
    .to(q('.sf-beam'), { opacity: 0, duration: .02 }, .3);
  rows.forEach((r, i) => tl.to(r.querySelector('.sf-hl'), { opacity: .35, duration: .015 }, .1 + i * .026));
  // chips leave the rows and stack into the total bar
  chips.forEach((c) => {
    const i = +c.dataset.i, it = sorted.find((s) => s.i === i), k = sorted.indexOf(it);
    tl.set(c, { opacity: 1, attr: { x: RX + 320, y: rowY(i) + 4, width: 14, height: 30 } }, .34 + k * .012)
      .to(c, { attr: { x: X0, y: it.y, width: 22, height: it.h }, duration: .09, ease: 'power3.inOut' }, .34 + k * .012);
  });
  tl.to(q('.sf-receipt'), { opacity: .35, x: -40, duration: .08 }, .42)
    .to(q('.sf-total'), { opacity: 1, duration: .03 }, .5)
    .to(q('.sf-grow'), { attr: { width: X1 - X0 + 20 }, duration: .16, ease: 'power2.inOut' }, .5)
    .to(qa('.sf-node'), { opacity: 1, duration: .03, stagger: .015 }, .6)
    .fromTo('.sf-cap-2', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .04 }, .66)
    .fromTo(q('.sf-phone'), { xPercent: 120, rotation: 8, opacity: 0 }, { xPercent: 0, rotation: -3, opacity: 1, duration: .14, ease: 'power3.out' }, .74);
  // narrow screens: the drawing is twice the screen wide, so the camera pans from the receipt to the flow as the chips leave,
  // and the flow steps back behind the phone instead of sliding under it
  const narrow = matchMedia('(max-width: 900px)').matches;
  const pan = () => { const W = host.clientWidth, H = q('.sf-stage').clientHeight, s = Math.min(2 * W / 1600, H / 900);
    const right = -.1 * W + (2 * W - 1600 * s) / 2 + 1350 * s; return Math.min(0, W - 14 - right); };
  if (narrow) tl.to(q('.sf-svg'), { x: pan, duration: .2, ease: 'power2.inOut' }, .38).to(q('.sf-svg'), { opacity: .28, duration: .1 }, .74);
  else tl.to(q('.sf-svg'), { x: '-14%', scale: .9, transformOrigin: '50% 50%', duration: .14, ease: 'power2.inOut' }, .74);
  tl.to({}, { duration: .1 }, .9);

  if (reduce) { tl.progress(1); return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl, invalidateOnRefresh: true });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'sf-active' } });
})();
