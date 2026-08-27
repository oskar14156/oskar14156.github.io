const SLUG = (n) => String(n).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
const money = (c) => '€' + (c / 100).toFixed(2);
const num = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const d = await (await fetch('/canvas/api/leaderboard')).json();
const out = document.querySelector('#out');

if (!d.board.length) {
  out.innerHTML = `<h1>Territories</h1>
    <p class="lede">Nobody has claimed a territory yet. Pick a team when you claim pixels and
      your community appears here.</p>
    <div class="box"><p>When you buy or rent pixels you can tag them with a team — a country, a
      subreddit, a Discord, a university, a creator's community. Every pixel your team holds counts
      toward its standing, and every team gets a share card it can post.</p>
    <p><a href="/canvas/">Claim pixels →</a></p></div>`;
} else {
  const top = d.board[0].pixels;
  out.innerHTML = `
    <h1>Territories</h1>
    <p class="lede">${d.totalTeams} ${d.totalTeams === 1 ? 'community is' : 'communities are'}
      holding ground on Canvas #1. Movement is measured against the last snapshot.</p>
    <div class="box" style="padding:8px 16px">
      <table class="board">${d.board.map((t) => `
        <tr data-team="${esc(t.team)}">
          <td class="rank ${t.rank <= 3 ? 'top' : ''}">#${t.rank}</td>
          <td>
            <div class="teamname">${esc(t.team)}</div>
            <div class="bar2" style="width:${Math.max(2, t.pixels / top * 100)}%"></div>
          </td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">
            <b>${num(t.pixels)}</b><br>
            <small style="color:var(--faint)">${t.artworks} artwork${t.artworks === 1 ? '' : 's'}</small>
          </td>
          <td style="text-align:right;color:var(--good);font-variant-numeric:tabular-nums">
            ${money(t.charity_cents)}<br><small style="color:var(--faint)">to charity</small>
          </td>
          <td style="text-align:right;width:70px">${movement(t)}</td>
        </tr>`).join('')}
      </table>
    </div>
    <div id="detail" style="margin-top:22px"></div>

    <h2>How territories work</h2>
    <div class="box">
      <p>Tag your pixels with a team when you claim them. Anything goes: a country, a subreddit,
        a Discord, a school, a creator's community. Pixels count toward the team for as long as
        they are held — so a rented artwork drops out of the standings when it expires, and
        somebody else's claim can take the lead overnight.</p>
      <p>Every team has a share card that updates itself. Post it, and it shows your current
        standing, how far ahead or behind you are, and how much your community has raised.</p>
    </div>`;

  document.querySelectorAll('[data-team]').forEach((tr) =>
    tr.onclick = () => showTeam(tr.dataset.team));
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash) showTeam(hash);
}

function movement(t) {
  if (t.change === null || t.prevRank === null)
    return '<span class="mv up">NEW</span>';
  if (t.change > 0) return `<span class="mv up">▲ ${t.change}</span>`;
  if (t.change < 0) return `<span class="mv down">▼ ${-t.change}</span>`;
  return '<span class="mv same">—</span>';
}

async function showTeam(name) {
  const el = document.querySelector('#detail');
  el.innerHTML = '<p class="note">Loading…</p>';
  const r = await fetch('/canvas/api/team?name=' + encodeURIComponent(name));
  if (!r.ok) { el.innerHTML = ''; return; }
  const t = await r.json();
  location.hash = encodeURIComponent(t.team.team);
  el.innerHTML = `
    <h2>${esc(t.team.team)}</h2>
    <img class="cardimg" src="/canvas/api/card-${SLUG(t.team.team)}.png" alt="">
    <div class="box" style="margin-top:12px">
      <div class="kv"><span>Rank</span><b>#${t.rank} of ${d.totalTeams}</b></div>
      <div class="kv"><span>Pixels held</span><b>${num(t.team.pixels)}</b></div>
      <div class="kv charity"><span>Raised for charity</span><b>${money(t.team.charity_cents)}</b></div>
      ${t.ahead ? `<div class="kv"><span>Behind ${esc(t.ahead.team)} by</span>
        <b>${num(t.ahead.pixels - t.team.pixels)} px</b></div>` : ''}
      ${t.behind ? `<div class="kv"><span>Ahead of ${esc(t.behind.team)} by</span>
        <b>${num(t.team.pixels - t.behind.pixels)} px</b></div>` : ''}
      <p class="note" style="margin-top:10px">
        Share this standing: <a href="${location.origin}/canvas/leaderboard.html#${encodeURIComponent(t.team.team)}">${location.host}/leaderboard.html#${esc(t.team.team)}</a></p>
    </div>
    <div class="box" style="margin-top:10px">
      <h3 style="margin-top:0">Artworks</h3>
      <table>
        <tr><th>Title</th><th>Type</th><th>Pixels</th><th>At</th></tr>
        ${t.artworks.map((a) => `<tr>
          <td><a href="/canvas/a/${a.id}">${esc(a.title) || 'Untitled'}</a></td>
          <td><span class="pill ${a.kind}">${a.kind}</span></td>
          <td>${num(a.claimed_count)}</td>
          <td><a href="/canvas/?x=${a.bbox_x}&y=${a.bbox_y}&z=6">${a.bbox_x}, ${a.bbox_y}</a></td>
        </tr>`).join('')}
      </table>
    </div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
