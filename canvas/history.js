const SLUG = (n) => String(n).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
const money = (c) => '€' + (c / 100).toFixed(2);
const num = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const { snapshots } = await (await fetch('/canvas/api/snapshots')).json();
const out = document.querySelector('#out');

if (snapshots.length < 2) {
  out.innerHTML = `<h1>History</h1>
    <p class="lede">The canvas is snapshotted regularly and those snapshots are never edited.
      Once there are a few, this page plays them back.</p>
    <div class="box"><p>${snapshots.length} snapshot so far. Rented artwork disappears from the
      canvas when it expires — the snapshots are the only place it keeps existing.</p></div>`;
} else {
  out.innerHTML = `
    <h1>History</h1>
    <p class="lede">Every snapshot the canvas has ever had, in order. Snapshots are never edited,
      which is why a rented artwork that expired weeks ago is still in here.</p>
    <div class="layout">
      <div class="player">
        <div class="frame">
          <img id="frame" src="/canvas/api/snapshot.png?id=${snapshots[0].id}" alt="">
          <div class="stamp" id="stamp"></div>
        </div>
        <div class="ctrls">
          <button class="play" id="play">▶</button>
          <input type="range" id="scrub" min="0" max="${snapshots.length - 1}" value="0">
          <div class="speed">
            ${[1, 2, 4].map((s) => `<button data-sp="${s}" class="${s === 2 ? 'on' : ''}">${s}×</button>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="box">
          <h3 style="margin-top:0" id="label"></h3>
          <div class="kv"><span>Pixels claimed</span><b id="sPx"></b></div>
          <div class="kv"><span>Payments</span><b id="sOrders"></b></div>
          <div class="kv charity"><span>Charity allocated</span><b id="sCharity"></b></div>
          <div class="kv"><span>Snapshot</span><b id="sIdx"></b></div>
          <p class="note" style="margin-top:10px"><a id="dl" download>Download this frame →</a></p>
        </div>
        <div class="box" style="margin-top:10px">
          <h3 style="margin-top:0">Why this exists</h3>
          <p class="note">Rentals expire and their pixels go back into the pool. Without a
            permanent record, a week of somebody's work would simply vanish. It doesn't.</p>
          <p class="note">When Canvas #1 seals, these frames become the timelapse — and the
            printed 2m × 2m canvas is the final frame.</p>
        </div>
      </div>
    </div>`;

  const img = document.querySelector('#frame');
  const scrub = document.querySelector('#scrub');
  const playBtn = document.querySelector('#play');
  let i = 0, timer = null, speed = 2;

  // Preload so scrubbing doesn't flash white between frames.
  for (const s of snapshots) { const p = new Image(); p.src = `/canvas/api/snap/${s.id}.png`; }

  function show(n) {
    i = Math.max(0, Math.min(snapshots.length - 1, n));
    const s = snapshots[i];
    img.src = `/canvas/api/snap/${s.id}.png`;
    scrub.value = i;
    const when = new Date(s.taken_at);
    document.querySelector('#stamp').textContent =
      `${esc(s.label)} · ${num(s.claimed_pixels)} px`;
    document.querySelector('#label').textContent = `${s.label} — week ${s.week}`;
    document.querySelector('#sPx').textContent = num(s.claimed_pixels);
    document.querySelector('#sOrders').textContent = num(s.orders);
    document.querySelector('#sCharity').textContent = money(s.charity_cents);
    document.querySelector('#sIdx').textContent =
      `${i + 1} / ${snapshots.length} · ${when.toLocaleDateString()}`;
    const dl = document.querySelector('#dl');
    dl.href = `/canvas/api/snap/${s.id}.png`;
    dl.download = `canvas-${s.label.replace(/\W+/g, '-')}.png`;
  }

  function stop() { clearInterval(timer); timer = null; playBtn.textContent = '▶'; }
  function play() {
    stop();
    if (i >= snapshots.length - 1) show(0);
    playBtn.textContent = '❚❚';
    timer = setInterval(() => {
      if (i >= snapshots.length - 1) { stop(); return; }
      show(i + 1);
    }, 900 / speed);
  }

  playBtn.onclick = () => (timer ? stop() : play());
  scrub.oninput = () => { stop(); show(+scrub.value); };
  document.querySelectorAll('[data-sp]').forEach((b) => b.onclick = () => {
    speed = +b.dataset.sp;
    document.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b));
    if (timer) play();
  });
  addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); timer ? stop() : play(); }
    if (e.key === 'ArrowRight') { stop(); show(i + 1); }
    if (e.key === 'ArrowLeft') { stop(); show(i - 1); }
  });
  show(0);
}
