const money = (c) => '€' + (c / 100).toFixed(2);
const num = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = {
  charity: '#00c878', print: '#b44ac0', canvas2: '#51e9f4', vat: '#ffa800',
  processing: '#3690ea', hosting: '#7eed56', tax: '#ff4b4b', developer: '#8a8f9c',
};

const d = await (await fetch('/canvas/api/transparency')).json();
const s = d.stats;
const total = d.allocation.reduce((a, b) => a + b.cents, 0);
const promises = d.allocation.filter((a) => a.promise);
const promised = promises.reduce((a, b) => a + b.cents, 0);

document.querySelector('#out').innerHTML = `
  <h1>Where your money actually goes</h1>
  <p class="lede">Most projects say “a portion of proceeds is donated” and stop there.
    Here is every cent of a ${money(total)} payment — including my own tax bill and what is
    left over for me.</p>

  <div class="box">
    <div class="track">
      ${d.allocation.map((a) => `<div style="width:${(a.cents / total * 100).toFixed(2)}%;background:${COLORS[a.key]}"
        title="${esc(a.label)} — ${money(a.cents)}">${a.cents / total > 0.1 ? Math.round(a.cents / total * 100) + '%' : ''}</div>`).join('')}
    </div>
    ${d.allocation.map((a) => `
      <div class="legend"><i class="dot" style="background:${COLORS[a.key]}"></i>
        <div class="l">${esc(a.label)}${a.promise ? '<span class="promise">promised</span>' : ''}
          ${a.note ? `<small>${esc(a.note)}</small>` : ''}</div>
        <b>${money(a.cents)}</b></div>`).join('')}
    <p class="note" style="margin-top:15px">
      <strong>${Math.round(promised / total * 100)}% of every payment is committed before I see any of it.</strong>
      The lines marked <span class="promise">promised</span> are binding: we publish what was
      collected and what was actually paid out, with receipts. The tax, processing and hosting
      figures are estimates for an Austrian sole proprietorship and get corrected as real
      invoices arrive. One person builds and runs this — no investors, no salaries, no agency.</p>
  </div>

  <h2>The charity partner — ${esc(d.partner)}</h2>
  <div class="box split">
    <div class="big"><b style="color:var(--good)">${money(s.charityAllocatedCents)}</b><span>allocated</span>
      <p class="note" style="margin-top:6px">Owed to the partner from completed payments, net of refunds.</p></div>
    <div class="big"><b>${money(s.charitySettledCents)}</b><span>settled</span>
      <p class="note" style="margin-top:6px">Actually transferred and confirmed, with a public receipt.</p></div>
  </div>
  <p class="note" style="margin-top:10px">These two numbers are deliberately kept apart. Blending
    them into a single “raised so far” figure is how projects quietly overstate what they delivered.</p>

  <h2>The physical canvas</h2>
  <div class="box">
    <p>When Canvas #1 seals it gets printed at <strong>${d.canvas.printSizeM}m × ${d.canvas.printSizeM}m</strong>
      — ${(d.canvas.printSizeM * 1000 / d.canvas.width).toFixed(0)}mm per pixel — and hung somewhere
      the public can walk up to it. Every pixel bought is on it. That is the part that is promised.</p>
    <p><strong>A local artist also gets paid to hand-paint a companion piece.</strong> Not the print
      — a second, physical, hand-made version, filmed as a timelapse and published. So the money in
      this line supports a working artist as well as a printer.</p>
    <p>One honest constraint, because the arithmetic matters: at ${(d.canvas.printSizeM * 1000 / d.canvas.width).toFixed(0)}mm
      a pixel, painting every pixel by hand is not physically realistic — it would be tens of
      thousands of dots the size of a pinhead. So the hand-painted piece works at
      <strong>block resolution</strong>: the canvas is grouped into
      ${d.canvas.artistBlockSize}×${d.canvas.artistBlockSize} blocks, which gives
      ${(d.canvas.width / d.canvas.artistBlockSize)}×${(d.canvas.height / d.canvas.artistBlockSize)} =
      ${((d.canvas.width / d.canvas.artistBlockSize) ** 2).toLocaleString('en-US')} squares of
      ${(d.canvas.printSizeM * 1000 / (d.canvas.width / d.canvas.artistBlockSize)).toFixed(0)}mm each.
      That is a real commission a person can actually complete, and it is what we commit to — rather
      than promising a pixel-perfect hand copy that nobody could deliver.</p>
    <p>The exact size and scope are fixed once we know how full the canvas got, and both the artist
      and the invoice are published here. If this line does not raise enough to cover a print, the
      whole amount goes to the charity partner instead.</p>
  </div>

  <h2>Canvas #2</h2>
  <div class="box">
    <p>A second ring-fenced share funds building Canvas #2. The <strong>goal</strong> for Canvas #2
      is a substantially higher charity share — the aim is 70% — which only becomes possible once
      the platform is built, the payment structure is proven and the partner relationship is
      established. That is a stated goal, not a promise: what a future canvas can afford depends on
      what this one actually earns.</p>
    <p>What is promised is narrower and checkable: this share is spent on Canvas #2 and nothing
      else, and the spend is published the same way as everything on this page.</p>
  </div>

  <h2>Week by week</h2>
  <div class="box">
    ${d.weeks.length ? `<table>
      <tr><th>Week</th><th>Payments</th><th>Gross</th><th>Refunded</th><th>Charity share</th></tr>
      ${d.weeks.map((w) => `<tr><td>Week ${w.week + 1}</td><td>${w.n}</td><td>${money(w.gross)}</td>
        <td>${money(w.refunded || 0)}</td><td style="color:var(--good)">${money(w.charity)}</td></tr>`).join('')}
      </table>` : '<p class="note">No payments yet.</p>'}
  </div>

  <h2>Transfers to the partner</h2>
  <div class="box">
    ${d.settlements.length ? `<table>
      <tr><th>Period</th><th>Amount</th><th>Proof</th></tr>
      ${d.settlements.map((x) => `<tr><td>${esc(x.period)}</td><td>${money(x.amount_cents)}</td>
        <td>${x.proof_url ? `<a href="${esc(x.proof_url)}" target="_blank" rel="noopener">receipt</a>` : '—'}</td></tr>`).join('')}
      </table>` : '<p class="note">No transfers yet. Each one appears here with a public receipt.</p>'}
  </div>

  <h2>Canvas #1 right now</h2>
  <div class="box split">
    <div class="big"><b>${(s.occupancy * 100).toFixed(2)}%</b><span>claimed</span></div>
    <div class="big"><b>${s.orders}</b><span>payments</span></div>
    <div class="big"><b>${num(s.pixels.permanent)}</b><span>permanent pixels</span></div>
    <div class="big"><b>${num(s.pixels.seed)}</b><span>seed pixels (free)</span></div>
  </div>
  <p class="note" style="margin-top:10px">Seed art is placed by us for free so the canvas is not an
    empty void at launch. It is recorded at €0, expires after 7 days, and is excluded from every
    number on this page. Faking demand would be the easiest thing in the world, so we don't.</p>

  <h2>The Canvas Constitution</h2>
  <div class="box"><ol>
    <li>Every canvas has a fixed size, published before it opens. Canvas #1 is
      ${num(d.canvas.width)} × ${num(d.canvas.height)} = ${num(d.canvas.width * d.canvas.height)} pixels.</li>
    <li>A canvas is never resized or expanded after it opens.</li>
    <li>The permanent pixel price never changes while a canvas is open.</li>
    <li>Canvas #1 runs for a fixed window, then it is sealed, printed, and final.</li>
    <li>${Math.round(d.charityShare * 100)}% of every completed, non-refunded payment goes to the
      charity partner, calculated on gross before any of our costs.</li>
    <li>You pay for exactly the pixels you claim — never for a rectangle around them.</li>
    <li>Seed pixels never count as purchased pixels, revenue, or charity impact.</li>
    <li>Money allocated and money settled are always published as two separate numbers.</li>
    <li>Illegal or prohibited content is removed, whether it was paid for or not.</li>
    <li>Weekly snapshots are never altered except where legally required.</li>
    <li>New rules never retroactively reduce placement rights that were already bought.</li>
    <li>If the project ever shuts down, the final canvas is published in full resolution and
      archived publicly.</li>
  </ol></div>

  <p class="note" style="margin-top:26px">Buying pixels is a purchase, not a tax-deductible
    donation. You buy a placement from us, and we pass on ${Math.round(d.charityShare * 100)}%
    of what you pay to ${esc(d.partner)}.</p>`;
