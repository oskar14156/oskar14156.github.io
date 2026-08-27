
const BASE = "/canvas/";
const SLUG = (n) => String(n).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
// Static demo: there is no server, so the API is served from frozen files and
// anything that would take money or change state is disabled.
const artworksP = fetch(BASE + 'api/artworks.json').then((r) => r.json()).then((d) => d.artworks);
const ok = (body, type = 'application/json') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body),
    { status: 200, headers: { 'content-type': type } });
const fail = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status,
    headers: { 'content-type': 'application/json' } });

const DEMO = 'This is a static preview — there is no server behind it, so nothing can be bought. ' +
  'The editor itself is the real one.';

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const p = url.pathname;
  if (!p.includes('/api/')) return realFetch(input, init);
  if (p.endsWith('.json') || p.endsWith('.bin') || p.includes('/api/snap/'))
    return realFetch(input, init);
  const method = (init.method || 'GET').toUpperCase();

  if (method === 'POST') {
      if (p.endsWith('/api/report')) return ok({ ok: true });
    return fail(DEMO);
  }
  const file = (n) => realFetch(BASE + 'api/' + n);
  if (p.endsWith('/api/state')) return file('state.json');
  if (p.endsWith('/api/version')) return file('version.json');
  if (p.endsWith('/api/canvas.png')) return file('canvas.png');
  if (p.endsWith('/api/mask')) return file('mask.bin');
  if (p.endsWith('/api/snapshots')) return file('snapshots.json');
  if (p.endsWith('/api/snapshot.png')) return file('snap/' + url.searchParams.get('id') + '.png');
  if (p.endsWith('/api/transparency')) return file('transparency.json');
  if (p.endsWith('/api/leaderboard')) return file('leaderboard.json');
  if (p.endsWith('/api/team')) return file('team-' + SLUG(url.searchParams.get('name')) + '.json');
  if (p.endsWith('/api/card.png')) return file('card.png');
  if (p.endsWith('/api/expiring')) return ok({ expiring: [] });
  if (p.endsWith('/api/mine')) return ok({ artworks: [], orders: [], user: { id: 'demo', name: 'you' } });
  if (p.endsWith('/api/recent')) return ok({ recent: [] });
  if (p.endsWith('/api/artwork')) {
    const x = +url.searchParams.get('x'), y = +url.searchParams.get('y');
    const list = await artworksP;
    const a = list.find((v) => x >= v.bbox_x && y >= v.bbox_y &&
      x < v.bbox_x + v.bbox_w && y < v.bbox_y + v.bbox_h);
    if (!a) return fail('free', 404);
    return ok({ id: a.id, title: a.title, kind: a.kind, team: a.team, by: a.name,
      link: a.link_url, contact: a.contact_url, pixels: a.claimed_count,
      createdAt: a.created_at, expiresAt: a.expires_at,
      bbox: [a.bbox_x, a.bbox_y, a.bbox_w, a.bbox_h] });
  }
  return fail('not available in the static preview', 404);
};

addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.className = 'demobar';
  bar.innerHTML = '<b>Preview build</b> — draw and zoom all you like. ' +
    'Buying is switched off because there is no server behind this page.';
  document.body.appendChild(bar);
});
