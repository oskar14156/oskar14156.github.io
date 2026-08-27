// ===========================================================================
// The Charity Canvas — editor client
// Draw first on free pixels, then decide whether to buy them or rent them.
// ===========================================================================
const $ = (s) => document.querySelector(s);
const view = $('#view');
const ctx = view.getContext('2d');

const api = async (p, opts = {}) => {
  const r = await fetch(p, { ...opts, headers: opts.body ? { 'content-type': 'application/json' } : {} });
  const d = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (!r.ok) throw Object.assign(new Error(d?.error || `request failed (${r.status})`), { data: d });
  return d;
};
const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body) });
const money = (c) => '€' + (c / 100).toFixed(2);
const num = (n) => Number(n).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------------
let W = 1000, H = 1000;
const S = {
  cfg: null, version: -1,
  mask: null,                 // packed 1-bit: which pixels are already owned
  mode: 'explore',            // explore | draw
  kind: 'permanent',
  color: '#ff4500', recent: [],
  tool: 'pen', size: 1,
  protect: false,
  painted: 0, protectedPx: 0,
  box: null,                  // {x0,y0,x1,y1} of the draft
  scale: 1, offX: 0, offY: 0, needsFit: true,
  hover: null, hoverArt: null, userMoved: false,
  template: null, moveTemplate: false, templateOpacity: 0.55,
  message: null, error: null, conflicts: null,
  seenIntro: localStorage.getItem('seenIntro') === '1',
};

const base = document.createElement('canvas');       // last published canvas
const baseCtx = base.getContext('2d');
const draft = document.createElement('canvas');      // your unsaved drawing
const draftCtx = draft.getContext('2d', { willReadFrequently: true });
let draftA = null;      // 0 none · 1 protected · 255 painted
let draftRGB = null;    // parallel colour state; reading it beats getImageData
let checker = null;

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------
async function boot() {
  S.cfg = await api('/canvas/api/state');
  ({ width: W, height: H } = S.cfg.canvas);
  base.width = draft.width = W;
  base.height = draft.height = H;
  draftA = new Uint8Array(W * H);
  draftRGB = new Uint8Array(W * H * 3);
  buildChecker();
  $('#canvasName').textContent = S.cfg.canvas.name;
  await Promise.all([loadImage(), loadMask()]);
  fit();
  applyDeepLink();
  renderHeader(); renderPanel(); tickCountdown();
  if (!S.seenIntro) setTimeout(introModal, 400);
  requestAnimationFrame(draw);
  setInterval(poll, 5000);
  setInterval(tickCountdown, 1000);
  setInterval(syncUrl, 1200);
  drawMini();
  checkExpiring();
  setInterval(checkExpiring, 60_000);
}

/** ?x=&y=&z= makes any spot on the canvas a shareable link. */
function applyDeepLink() {
  const q = new URLSearchParams(location.search);
  const x = Number(q.get('x')), y = Number(q.get('y')), z = Number(q.get('z'));
  if (!Number.isFinite(x) || !Number.isFinite(y) || !q.has('x')) return;
  const r = view.getBoundingClientRect();
  S.scale = Math.min(48, Math.max(0.15, Number.isFinite(z) && z > 0 ? z : 8));
  S.offX = r.width / 2 - x * S.scale;
  S.offY = r.height / 2 - y * S.scale;
  S.needsFit = false;
}

let lastUrl = '';
function syncUrl() {
  const r = view.getBoundingClientRect();
  if (r.width < 2) return;
  const cx = Math.round((r.width / 2 - S.offX) / S.scale);
  const cy = Math.round((r.height / 2 - S.offY) / S.scale);
  if (cx < 0 || cy < 0 || cx >= W || cy >= H) return;
  const u = `?x=${cx}&y=${cy}&z=${S.scale.toFixed(1)}`;
  if (u === lastUrl) return;
  lastUrl = u;
  history.replaceState(null, '', u);
}

function buildChecker() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const cs = getComputedStyle(document.documentElement);
  g.fillStyle = cs.getPropertyValue('--check-a').trim() || '#111';
  g.fillRect(0, 0, 16, 16);
  g.fillStyle = cs.getPropertyValue('--check-b').trim() || '#171717';
  g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
  checker = ctx.createPattern(c, 'repeat');
}

async function loadImage() {
  const r = await fetch('/canvas/api/canvas.png', { cache: 'no-store' });
  const bmp = await createImageBitmap(await r.blob());
  baseCtx.clearRect(0, 0, W, H);
  baseCtx.drawImage(bmp, 0, 0);
  bmp.close?.();
  drawMini();
}
async function loadMask() {
  const r = await fetch('/canvas/api/mask', { cache: 'no-store' });
  S.mask = new Uint8Array(await r.arrayBuffer());
}
async function poll() {
  try {
    const v = await api('/canvas/api/version');
    if (v.version !== S.version) {
      S.version = v.version;
      await Promise.all([loadImage(), loadMask()]);
      if (S.painted) checkDraftConflicts();
      if (S.template) { estimateTemplate(); renderPanel(); }
    }
    S.cfg.stats = (await api('/canvas/api/state')).stats;
    renderHeader();
    markOffline(false);
  } catch {
    // A hiccup must never destroy an unsaved drawing, so we only warn.
    markOffline(true);
  }
}

const idx = (x, y) => y * W + x;
const isOwned = (x, y) => {
  const i = idx(x, y);
  return (S.mask[i >> 3] & (128 >> (i & 7))) !== 0;
};
const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

/** Someone bought pixels under your draft while you were drawing. */
function checkDraftConflicts() {
  if (!S.box) return;
  let hit = 0;
  for (let y = S.box.y0; y <= S.box.y1; y++)
    for (let x = S.box.x0; x <= S.box.x1; x++) {
      const i = idx(x, y);
      if (draftA[i] && isOwned(x, y)) { clearPixel(x, y); hit++; }
    }
  if (hit) {
    S.error = `${num(hit)} pixel${hit > 1 ? 's were' : ' was'} claimed by someone else while you were drawing, so they were removed from your selection.`;
    recount(); renderPanel();
  }
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
function fit() {
  const r = view.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) { S.needsFit = true; return; }
  S.needsFit = false; S.userMoved = false;
  S.scale = Math.min(r.width / W, r.height / H) * 0.93;
  S.offX = (r.width - W * S.scale) / 2;
  S.offY = (r.height - H * S.scale) / 2;
}
function zoomTo(box, pad = 2.2) {
  S.userMoved = true;
  const r = view.getBoundingClientRect();
  if (r.width < 2) return;
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  S.scale = Math.max(1, Math.min(48, Math.min(r.width / (w * pad), r.height / (h * pad))));
  S.offX = r.width / 2 - (box.x0 + w / 2) * S.scale;
  S.offY = r.height / 2 - (box.y0 + h / 2) * S.scale;
}
function zoomBy(f, cx, cy) {
  S.userMoved = true;
  const r = view.getBoundingClientRect();
  const mx = cx ?? r.width / 2, my = cy ?? r.height / 2;
  const ns = Math.min(48, Math.max(0.15, S.scale * f));
  S.offX = mx - (mx - S.offX) * (ns / S.scale);
  S.offY = my - (my - S.offY) * (ns / S.scale);
  S.scale = ns;
}

let preview = null;   // pixels a line/rect tool would commit

function draw() {
  const dpr = devicePixelRatio || 1;
  const r = view.getBoundingClientRect();
  if (view.width !== Math.round(r.width * dpr)) {
    view.width = Math.round(r.width * dpr);
    view.height = Math.round(r.height * dpr);
  }
  if (S.needsFit && r.width > 2) fit();
  if (!panning && !pinch) clampView();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);

  const sw = W * S.scale, sh = H * S.scale;
  ctx.save();
  ctx.translate(S.offX, S.offY);
  ctx.fillStyle = checker;
  ctx.fillRect(0, 0, sw, sh);
  ctx.restore();

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, S.offX, S.offY, sw, sh);

  // Reference image sits between the published canvas and your own strokes,
  // so you always draw on top of what you are tracing.
  if (S.template) {
    const t = S.template;
    ctx.globalAlpha = S.templateOpacity;
    ctx.drawImage(t.img, S.offX + t.x * S.scale, S.offY + t.y * S.scale,
      t.w * S.scale, t.h * S.scale);
    ctx.globalAlpha = 1;
  }

  ctx.drawImage(draft, S.offX, S.offY, sw, sh);

  if (S.template) {
    const t = S.template;
    ctx.strokeStyle = S.moveTemplate ? 'rgba(255,168,0,.95)' : 'rgba(255,168,0,.5)';
    ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(S.offX + t.x * S.scale, S.offY + t.y * S.scale,
      t.w * S.scale, t.h * S.scale);
    ctx.setLineDash([]);
  }

  // protected-but-empty pixels: visible to you, invisible to everyone else
  if (S.protect && S.protectedPx && S.box && S.scale > 0.6) {
    ctx.fillStyle = 'rgba(54,144,234,.30)';
    for (let y = S.box.y0; y <= S.box.y1; y++)
      for (let x = S.box.x0; x <= S.box.x1; x++)
        if (draftA[idx(x, y)] === 1)
          ctx.fillRect(S.offX + x * S.scale, S.offY + y * S.scale,
            Math.max(1, S.scale), Math.max(1, S.scale));
  }

  if (preview) {
    ctx.fillStyle = S.tool === 'eraser' ? 'rgba(255,90,90,.6)' : S.color;
    for (const [x, y] of preview)
      ctx.fillRect(S.offX + x * S.scale, S.offY + y * S.scale,
        Math.max(1, S.scale), Math.max(1, S.scale));
  }

  if (S.conflicts) {
    ctx.fillStyle = 'rgba(255,60,60,.85)';
    for (const [x, y] of S.conflicts)
      ctx.fillRect(S.offX + x * S.scale - 1, S.offY + y * S.scale - 1,
        Math.max(3, S.scale + 2), Math.max(3, S.scale + 2));
  }

  // your draft outline
  if (S.box && S.painted) {
    ctx.strokeStyle = 'rgba(54,144,234,.75)';
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.strokeRect(S.offX + S.box.x0 * S.scale - 2, S.offY + S.box.y0 * S.scale - 2,
      (S.box.x1 - S.box.x0 + 1) * S.scale + 4, (S.box.y1 - S.box.y0 + 1) * S.scale + 4);
    ctx.setLineDash([]);
  }

  if (S.hover && S.mode === 'draw' && S.scale > 3) {
    const [hx, hy] = S.hover, s = S.size;
    ctx.strokeStyle = 'rgba(128,128,128,.9)'; ctx.lineWidth = 1;
    ctx.strokeRect(S.offX + (hx - (s >> 1)) * S.scale + .5, S.offY + (hy - (s >> 1)) * S.scale + .5,
      s * S.scale, s * S.scale);
  }

  ctx.strokeStyle = 'rgba(128,128,128,.35)'; ctx.lineWidth = 1;
  ctx.strokeRect(S.offX - .5, S.offY - .5, sw + 1, sh + 1);

  $('#zoomLbl').textContent = (S.scale >= 1 ? S.scale.toFixed(1) : S.scale.toFixed(2)) + 'x';
  updateMiniViewport();
  requestAnimationFrame(draw);
}

// ---------------------------------------------------------------------------
// reference images
// The file never leaves the browser — it is decoded locally and only the
// pixels you actually claim are ever sent anywhere.
// ---------------------------------------------------------------------------
const MAX_TEMPLATE_PX = 400;

async function loadTemplate(file) {
  if (!file || !/^image\//.test(file.type)) {
    S.error = 'That file is not an image.'; renderPanel(); return;
  }
  if (file.size > 25_000_000) {
    S.error = 'That image is larger than 25 MB.'; renderPanel(); return;
  }
  let img;
  try { img = await createImageBitmap(file); }
  catch { S.error = 'That image could not be decoded.'; renderPanel(); return; }

  // Default to something that fits comfortably and is affordable to trace.
  const long = Math.max(img.width, img.height);
  const scaleDown = Math.min(1, 120 / long);
  const w = Math.max(1, Math.round(img.width * scaleDown));
  const h = Math.max(1, Math.round(img.height * scaleDown));
  const r = view.getBoundingClientRect();
  const cx = Math.round((r.width / 2 - S.offX) / S.scale);
  const cy = Math.round((r.height / 2 - S.offY) / S.scale);

  S.template = {
    img, name: file.name, srcW: img.width, srcH: img.height,
    x: Math.max(0, Math.min(W - w, cx - (w >> 1))),
    y: Math.max(0, Math.min(H - h, cy - (h >> 1))),
    w, h, sharp: true, matchPalette: false, threshold: 128,
  };
  S.moveTemplate = true;
  S.mode = 'draw';
  view.classList.add('paint');
  S.message = null; S.error = null;
  estimateTemplate();
  renderPanel();
}

function resizeTemplate(newW) {
  const t = S.template;
  if (!t) return;
  const w = Math.max(1, Math.min(MAX_TEMPLATE_PX, Math.round(newW)));
  t.h = Math.max(1, Math.round(w * t.srcH / t.srcW));
  t.w = w;
  t.x = Math.max(0, Math.min(W - t.w, t.x));
  t.y = Math.max(0, Math.min(H - t.h, t.y));
  estimateTemplate();
}

/** Rasterise the template at its current size. Shared by preview and commit. */
function rasteriseTemplate() {
  const t = S.template;
  const tw = Math.round(t.w), th = Math.round(t.h);
  const c = document.createElement('canvas');
  c.width = tw; c.height = th;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = !t.sharp;
  g.imageSmoothingQuality = 'high';
  g.drawImage(t.img, 0, 0, tw, th);
  return { data: g.getImageData(0, 0, tw, th).data, tw, th };
}

const SWATCH_RGB = [];
function nearestSwatch(r, g, b) {
  if (!SWATCH_RGB.length)
    for (const hx of S.cfg.swatches) SWATCH_RGB.push(hexToRgb(hx));
  let best = SWATCH_RGB[0], bd = Infinity;
  for (const c of SWATCH_RGB) {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

/** How many pixels this template would actually claim, and what that costs. */
function estimateTemplate() {
  const t = S.template;
  if (!t) return;
  const { data, tw, th } = rasteriseTemplate();
  const ox = Math.round(t.x), oy = Math.round(t.y);
  let n = 0, blocked = 0;
  for (let py = 0; py < th; py++) for (let px = 0; px < tw; px++) {
    if (data[(py * tw + px) * 4 + 3] < t.threshold) continue;
    const gx = ox + px, gy = oy + py;
    if (!inBounds(gx, gy)) continue;
    if (isOwned(gx, gy)) { blocked++; continue; }
    n++;
  }
  t.estimate = n; t.blocked = blocked;
}

function commitTemplate() {
  const t = S.template;
  if (!t) return;
  const { data, tw, th } = rasteriseTemplate();
  const ox = Math.round(t.x), oy = Math.round(t.y);
  beginStroke();
  let placed = 0;
  for (let py = 0; py < th; py++) for (let px = 0; px < tw; px++) {
    const o = (py * tw + px) * 4;
    if (data[o + 3] < t.threshold) continue;
    let rgb = [data[o], data[o + 1], data[o + 2]];
    if (t.matchPalette) rgb = nearestSwatch(rgb[0], rgb[1], rgb[2]);
    if (setPixel(ox + px, oy + py, rgb)) placed++;
  }
  endStroke();
  S.template = null; S.moveTemplate = false;
  S.message = `${num(placed)} pixels placed from your image. Edit them like anything else — ⌘Z undoes the whole import.`;
  afterStroke();
}

function removeTemplate() {
  S.template?.img?.close?.();
  S.template = null; S.moveTemplate = false;
  renderPanel();
}

// Drag an image straight onto the canvas.
for (const ev of ['dragenter', 'dragover']) addEventListener(ev, (e) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault(); document.body.classList.add('dropping');
});
addEventListener('dragleave', (e) => {
  if (e.relatedTarget) return;
  document.body.classList.remove('dropping');
});
addEventListener('drop', (e) => {
  if (!e.dataTransfer?.files?.length) return;
  e.preventDefault();
  document.body.classList.remove('dropping');
  loadTemplate(e.dataTransfer.files[0]);
});

// ---------------------------------------------------------------------------
// minimap
// ---------------------------------------------------------------------------
const mini = document.querySelector('#mini');
const miniCtx = mini.getContext('2d');
const MINI = 130;

function drawMini() {
  miniCtx.imageSmoothingEnabled = false;
  const cs = getComputedStyle(document.documentElement);
  miniCtx.fillStyle = cs.getPropertyValue('--check-a').trim() || '#111';
  miniCtx.fillRect(0, 0, MINI, MINI);
  miniCtx.drawImage(base, 0, 0, MINI, MINI);
  miniCtx.drawImage(draft, 0, 0, MINI, MINI);
}

function updateMiniViewport() {
  const r = view.getBoundingClientRect();
  if (r.width < 2) return;
  const box = document.querySelector('#miniview');
  const k = MINI / W;
  const vx = Math.max(0, (-S.offX / S.scale) * k);
  const vy = Math.max(0, (-S.offY / S.scale) * k);
  const vw = Math.min(MINI - vx, (r.width / S.scale) * k);
  const vh = Math.min(MINI - vy, (r.height / S.scale) * k);
  box.style.left = (5 + vx) + 'px';
  box.style.top = (5 + vy) + 'px';
  box.style.width = Math.max(3, vw) + 'px';
  box.style.height = Math.max(3, vh) + 'px';
}

document.querySelector('#minimap').addEventListener('mousedown', (e) => {
  e.stopPropagation();
  const r = mini.getBoundingClientRect();
  const gx = (e.clientX - r.left) / MINI * W, gy = (e.clientY - r.top) / MINI * H;
  const v = view.getBoundingClientRect();
  S.offX = v.width / 2 - gx * S.scale;
  S.offY = v.height / 2 - gy * S.scale;
});

// ---------------------------------------------------------------------------
// pixel operations
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// undo / redo
// Each stroke records only the pixels it actually changed, so a one-pixel dab
// costs one entry and a flood fill costs exactly what it touched.
// ---------------------------------------------------------------------------
const HISTORY_LIMIT = 40;
let undoStack = [], redoStack = [], stroke = null;

function beginStroke() { stroke = new Map(); }
function recordPixel(i) {
  if (!stroke || stroke.has(i)) return;
  stroke.set(i, [draftA[i], draftRGB[i * 3], draftRGB[i * 3 + 1], draftRGB[i * 3 + 2]]);
}
function endStroke() {
  if (!stroke || !stroke.size) { stroke = null; return; }
  undoStack.push(stroke);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  stroke = null;
}
function applyEntry(entry) {
  const inverse = new Map();
  for (const [i, [a, r, g, b]] of entry) {
    inverse.set(i, [draftA[i], draftRGB[i * 3], draftRGB[i * 3 + 1], draftRGB[i * 3 + 2]]);
    writeRaw(i % W, (i / W) | 0, a, r, g, b);
  }
  return inverse;
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(applyEntry(undoStack.pop()));
  recount(); recomputeProtected(); drawMini(); renderPanel();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(applyEntry(redoStack.pop()));
  recount(); recomputeProtected(); drawMini(); renderPanel();
}
function resetHistory() { undoStack = []; redoStack = []; stroke = null; }

/** Write a pixel's raw state without touching history. */
function writeRaw(x, y, a, r, g, b) {
  const i = idx(x, y);
  draftA[i] = a;
  draftRGB[i * 3] = r; draftRGB[i * 3 + 1] = g; draftRGB[i * 3 + 2] = b;
  if (a === 255) {
    draftCtx.fillStyle = `rgb(${r},${g},${b})`;
    draftCtx.fillRect(x, y, 1, 1);
  } else {
    draftCtx.clearRect(x, y, 1, 1);
  }
}

function grow(x, y) {
  if (!S.box) S.box = { x0: x, y0: y, x1: x, y1: y };
  else {
    if (x < S.box.x0) S.box.x0 = x; if (x > S.box.x1) S.box.x1 = x;
    if (y < S.box.y0) S.box.y0 = y; if (y > S.box.y1) S.box.y1 = y;
  }
}
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16),
                         parseInt(h.slice(5, 7), 16)];

function setPixel(x, y, rgb) {
  if (!inBounds(x, y) || isOwned(x, y)) return false;
  const i = idx(x, y);
  recordPixel(i);
  if (draftA[i] !== 255) S.painted++;
  writeRaw(x, y, 255, rgb[0], rgb[1], rgb[2]);
  grow(x, y);
  return true;
}
function clearPixel(x, y) {
  if (!inBounds(x, y)) return;
  const i = idx(x, y);
  if (!draftA[i]) return;
  recordPixel(i);
  if (draftA[i] === 255) S.painted--;
  writeRaw(x, y, 0, 0, 0, 0);
}
function brush(x, y, fn) {
  const o = S.size >> 1;
  for (let dy = 0; dy < S.size; dy++) for (let dx = 0; dx < S.size; dx++) fn(x - o + dx, y - o + dy);
}
function linePixels(x0, y0, x1, y1) {
  const out = [];
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return out;
}
function rectPixels(x0, y0, x1, y1) {
  const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)];
  const [c, d] = [Math.min(y0, y1), Math.max(y0, y1)];
  const out = [];
  for (let x = a; x <= b; x++) { out.push([x, c]); if (d !== c) out.push([x, d]); }
  for (let y = c + 1; y < d; y++) { out.push([a, y]); if (b !== a) out.push([b, y]); }
  return out;
}

/** Fill an area enclosed by your own drawing. Refuses to leak into open canvas. */
function bucket(sx, sy) {
  if (!inBounds(sx, sy) || isOwned(sx, sy) || draftA[idx(sx, sy)] === 255) return;
  const LIMIT = 300_000;
  const seen = new Set([idx(sx, sy)]);
  const stack = [[sx, sy]];
  const out = [];
  let leaked = false;
  while (stack.length) {
    const [x, y] = stack.pop();
    out.push([x, y]);
    if (out.length > LIMIT) { leaked = true; break; }
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!inBounds(nx, ny)) { leaked = true; continue; }
      const i = idx(nx, ny);
      if (seen.has(i)) continue;
      if (isOwned(nx, ny) || draftA[i] === 255) continue;   // wall
      seen.add(i); stack.push([nx, ny]);
    }
    if (leaked) break;
  }
  if (leaked) {
    S.error = 'That area is not fully enclosed by your drawing, so a fill would spill across the canvas. Close the outline first.';
    renderPanel(); return;
  }
  beginStroke();
  for (const [x, y] of out) setPixel(x, y, hexToRgb(S.color));
  endStroke();
  afterStroke();
}

/**
 * Claim the empty pixels sealed inside your own shape, so nobody can draw in
 * the middle of your letter O. They cost the same as painted pixels.
 */
function recomputeProtected() {
  for (let i = 0; i < draftA.length; i++) if (draftA[i] === 1) draftA[i] = 0;
  S.protectedPx = 0;
  if (!S.protect || !S.box) return;
  const { x0, y0, x1, y1 } = S.box;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw * bh > 4_000_000) return;
  const outside = new Uint8Array(bw * bh);
  const stack = [];
  const push = (x, y) => {
    const li = y * bw + x;
    if (outside[li]) return;
    if (draftA[idx(x0 + x, y0 + y)] === 255) return;
    outside[li] = 1; stack.push([x, y]);
  };
  for (let x = 0; x < bw; x++) { push(x, 0); push(x, bh - 1); }
  for (let y = 0; y < bh; y++) { push(0, y); push(bw - 1, y); }
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x > 0) push(x - 1, y);
    if (x < bw - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < bh - 1) push(x, y + 1);
  }
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    if (outside[y * bw + x]) continue;
    const gx = x0 + x, gy = y0 + y;
    const i = idx(gx, gy);
    if (draftA[i] === 255 || isOwned(gx, gy)) continue;
    draftA[i] = 1; S.protectedPx++;   // colourless: never rendered into draft
  }
}

function recount() {
  let n = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (draftA[idx(x, y)] !== 255) continue;
    n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  S.painted = n;
  S.box = x1 < 0 ? null : { x0, y0, x1, y1 };
}
function afterStroke() { recomputeProtected(); drawMini(); renderPanel(); }
function clearDraft() {
  draftA.fill(0); draftRGB.fill(0);
  draftCtx.clearRect(0, 0, W, H);
  resetHistory();
  S.painted = S.protectedPx = 0; S.box = null; S.conflicts = null; S.error = null;
  renderPanel();
}
const claimedTotal = () => S.painted + S.protectedPx;

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------
const toWorld = (e) => {
  const r = view.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left - S.offX) / S.scale),
          Math.floor((e.clientY - r.top - S.offY) / S.scale)];
};

// Pointer events cover mouse, pen and touch in one path, so the editor works
// on a phone without a second implementation.
const pointers = new Map();
let panning = false, painting = false, last = null, strokeStart = null, lastPx = null;
let pinch = null;

function pointerMode(e) {
  if (S.template && S.moveTemplate) return 'template';
  if (e.button === 1 || e.button === 2 || e.shiftKey) return 'pan';
  return S.mode === 'draw' ? 'paint' : 'pan';
}

view.addEventListener('pointerdown', (e) => {
  view.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  hideHover();

  if (pointers.size === 2) {           // second finger: pinch to zoom
    painting = panning = false;
    endStroke();
    const [a, b] = [...pointers.values()];
    pinch = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]),
              mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], scale: S.scale };
    return;
  }
  if (pointers.size > 2) return;

  const mode = pointerMode(e);
  if (mode === 'pan') {
    panning = true; S.userMoved = true;
    last = [e.clientX, e.clientY]; view.classList.add('dragging'); return;
  }
  if (mode === 'template') { last = [e.clientX, e.clientY]; return; }

  const [x, y] = toWorld(e);
  strokeStart = [x, y]; lastPx = null; painting = true; S.conflicts = null;
  if (S.tool === 'bucket') { bucket(x, y); painting = false; return; }
  beginStroke();
  if (S.tool === 'line' || S.tool === 'rect') { preview = [[x, y]]; return; }
  applyTool(x, y);
});

view.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);

  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const r = view.getBoundingClientRect();
    const ns = Math.min(48, Math.max(0.15, pinch.scale * (dist / pinch.dist)));
    const mx = mid[0] - r.left, my = mid[1] - r.top;
    S.offX += mid[0] - pinch.mid[0];
    S.offY += mid[1] - pinch.mid[1];
    S.offX = mx - (mx - S.offX) * (ns / S.scale);
    S.offY = my - (my - S.offY) * (ns / S.scale);
    S.scale = ns;
    pinch.mid = mid;
    S.userMoved = true;
    return;
  }

  if (panning) {
    S.offX += e.clientX - last[0]; S.offY += e.clientY - last[1];
    last = [e.clientX, e.clientY]; return;
  }
  if (S.template && S.moveTemplate && last) {
    S.template.x += (e.clientX - last[0]) / S.scale;
    S.template.y += (e.clientY - last[1]) / S.scale;
    last = [e.clientX, e.clientY];
    return;
  }

  const [x, y] = toWorld(e);
  S.hover = inBounds(x, y) ? [x, y] : null;
  $('#coords').textContent = S.hover ? `${x}, ${y}` : '—';

  if (painting && (S.tool === 'line' || S.tool === 'rect')) {
    preview = S.tool === 'line'
      ? linePixels(strokeStart[0], strokeStart[1], x, y)
      : rectPixels(strokeStart[0], strokeStart[1], x, y);
    return;
  }
  if (painting) { applyTool(x, y); return; }
  if (S.mode === 'explore' && e.pointerType === 'mouse') queueHover(e, x, y);
});

function releasePointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size) return;

  if (painting && preview) {
    const rgb = hexToRgb(S.color);
    for (const [x, y] of preview) brush(x, y, (px, py) =>
      S.tool === 'eraser' ? clearPixel(px, py) : setPixel(px, py, rgb));
    preview = null;
    endStroke(); afterStroke();
  } else if (painting) { endStroke(); afterStroke(); }
  else if (S.template && S.moveTemplate && last) { renderPanel(); }

  panning = painting = false; lastPx = null; strokeStart = null; last = null;
  view.classList.remove('dragging');
}
view.addEventListener('pointerup', releasePointer);
view.addEventListener('pointercancel', releasePointer);

function applyTool(x, y) {
  const rgb = hexToRgb(S.color);
  const act = (px, py) => S.tool === 'eraser' ? clearPixel(px, py) : setPixel(px, py, rgb);
  if (lastPx) for (const [lx, ly] of linePixels(lastPx[0], lastPx[1], x, y)) brush(lx, ly, act);
  else brush(x, y, act);
  lastPx = [x, y];
}

view.addEventListener('contextmenu', (e) => e.preventDefault());
view.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = view.getBoundingClientRect();
  zoomBy(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return;
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }
  if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (meta) return;
  const map = { b: 'pen', e: 'eraser', l: 'line', r: 'rect', g: 'bucket' };
  if (map[e.key] && S.mode === 'draw') { S.tool = map[e.key]; renderPanel(); }
  if (e.key === 'Escape') { preview = null; hideHover(); closeModal(); }
  if (e.key === '0') fit();
  if (e.key === '?') helpModal();
  if (e.key === '[' || e.key === ']') {
    const sizes = [1, 2, 3, 5, 8];
    const i = sizes.indexOf(S.size);
    S.size = sizes[Math.max(0, Math.min(sizes.length - 1, i + (e.key === ']' ? 1 : -1)))];
    renderPanel();
  }
});

$('#zoomIn').onclick = () => zoomBy(1.45);
$('#zoomOut').onclick = () => zoomBy(1 / 1.45);
$('#zoomFit').onclick = fit;

/** Keep at least a corner of the canvas reachable, whatever the viewport does. */
function clampView() {
  const r = view.getBoundingClientRect();
  if (r.width < 2) return;
  const sw = W * S.scale, sh = H * S.scale;
  const margin = Math.min(80, r.width * 0.35);
  S.offX = Math.min(r.width - margin, Math.max(margin - sw, S.offX));
  S.offY = Math.min(r.height - margin, Math.max(margin - sh, S.offY));
}

let lastSize = [0, 0];
new ResizeObserver(() => {
  const r = view.getBoundingClientRect();
  if (r.width < 2) return;
  if (!lastSize[0] || S.needsFit) { lastSize = [r.width, r.height]; fit(); return; }
  // Before the visitor has panned or zoomed, a layout change should simply
  // re-fit. Afterwards it keeps their centre instead of yanking the view.
  if (!S.userMoved) { lastSize = [r.width, r.height]; fit(); return; }
  S.offX += (r.width - lastSize[0]) / 2;
  S.offY += (r.height - lastSize[1]) / 2;
  lastSize = [r.width, r.height];
  clampView();
}).observe(view);

// ---------------------------------------------------------------------------
// hover card
// ---------------------------------------------------------------------------
let hoverTimer = null, hoverKey = null;
function hideHover() {
  clearTimeout(hoverTimer); hoverKey = null;
  $('#hovercard').classList.remove('show');
}
function queueHover(e, x, y) {
  if (!inBounds(x, y) || !isOwned(x, y)) { hideHover(); return; }
  const card = $('#hovercard');
  card.style.left = Math.min(e.clientX + 16, innerWidth - 270) + 'px';
  card.style.top = (e.clientY + 16) + 'px';
  const key = `${x},${y}`;
  if (key === hoverKey) return;
  hoverKey = key;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(async () => {
    try {
      const a = await api(`/canvas/api/artwork?x=${x}&y=${y}`);
      if (hoverKey !== key) return;
      const left = a.expiresAt ? Math.max(0, a.expiresAt - Date.now()) : 0;
      card.innerHTML = `
        <h4>${esc(a.title) || 'Untitled'}</h4>
        <div><span class="pill ${a.kind}">${a.kind}</span></div>
        ${a.team ? `<div class="meta" style="color:var(--accent)">${esc(a.team)}</div>` : ''}
        <div class="meta">by ${esc(a.by)} · ${num(a.pixels)} pixels${
          a.expiresAt ? ` · expires in ${Math.ceil(left / 3600000)}h` : ''}</div>
        ${a.link ? `<div class="cta">${esc(a.link.replace(/^https:\/\//, ''))} — sponsored</div>` : ''}
        ${a.contact ? '<div class="cta">Creator accepts messages</div>' : ''}
        <div class="cta">Click for details</div>`;
      card.classList.add('show');
    } catch { hideHover(); }
  }, 140);
}
view.addEventListener('click', async (e) => {
  if (S.mode !== 'explore') return;
  const [x, y] = toWorld(e);
  if (!inBounds(x, y) || !isOwned(x, y)) return;
  try { artworkModal(await api(`/canvas/api/artwork?x=${x}&y=${y}`), [x, y]); } catch {}
});
view.addEventListener('mouseleave', hideHover);

// ---------------------------------------------------------------------------
// theme
// ---------------------------------------------------------------------------
$('#themeBtn').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  buildChecker(); drawMini();
};

// ---------------------------------------------------------------------------
// expiring rentals — the moment a rental becomes revenue a second time
// ---------------------------------------------------------------------------
async function checkExpiring() {
  let d;
  try { d = await api('/canvas/api/expiring'); } catch { return; }
  const el = $('#expiry');
  const soon = d.expiring.filter((a) => a.expires_at - Date.now() < 48 * 3600_000);
  if (!soon.length) { el.style.display = 'none'; return; }
  const a = soon[0];
  const hours = Math.max(0, Math.ceil((a.expires_at - Date.now()) / 3600_000));
  el.style.display = 'block';
  el.innerHTML = `
    <b>${esc(a.title) || 'Your artwork'} expires in ${hours}h</b>
    <span class="note">${num(a.claimed_count)} pixels return to the pool unless you renew.</span>
    <div class="row2">
      <button data-rn="${a.id}" data-mode="rental">Renew 7 days</button>
      <button class="p" data-rn="${a.id}" data-mode="permanent">Keep forever</button>
    </div>
    ${soon.length > 1 ? `<p class="note" style="margin-top:6px">+${soon.length - 1} more expiring soon</p>` : ''}`;
  el.querySelectorAll('[data-rn]').forEach((b) => b.onclick = () => renewModal(a, b.dataset.mode));
}

function renewModal(a, mode) {
  const permanent = mode === 'permanent';
  const per = permanent
    ? S.cfg.pricing.permanentCentsPerPixel : S.cfg.pricing.rentalCentsPerPixel;
  const gross = a.claimed_count * per;
  const charity = Math.round(gross * S.cfg.charity.shareOfGross);
  modal(`
    <h2>${permanent ? 'Make it permanent' : 'Renew for 7 more days'}</h2>
    <p class="sub">${esc(a.title) || 'Untitled'} · ${num(a.claimed_count)} pixels</p>
    <div class="breakdown">
      <div class="kv"><span>${num(a.claimed_count)} pixels</span><b>${money(gross)}</b></div>
      <div class="kv total"><span>Total</span><b>${money(gross)}</b></div>
      <div class="kv charity"><span>→ ${esc(S.cfg.charity.partnerName)}</span><b>${money(charity)}</b></div>
    </div>
    ${permanent
      ? `<div class="info">Your artwork stops expiring and appears on the printed canvas when
          Canvas #1 seals. This is the full permanent price — the rent you already paid is not
          credited, and we would rather say so here than bury it.</div>`
      : `<div class="info">The new week is added to your current expiry, not to today — renewing
          early never costs you time you already paid for.</div>`}
    <button class="btn primary" id="rgo">Pay ${money(gross)}</button>
    <button class="btn ghost" id="rno" style="margin-top:8px">Not now</button>`);
  $('#rno').onclick = closeModal;
  $('#rgo').onclick = async () => {
    const b = $('#rgo'); b.disabled = true; b.textContent = 'Processing…';
    try {
      const d = await post('/canvas/api/renew', { artworkId: a.id, mode });
      closeModal();
      S.message = permanent
        ? `Now permanent. ${money(d.quote.charityCents)} allocated to ${S.cfg.charity.partnerName}.`
        : `Renewed until ${new Date(d.expiresAt).toLocaleDateString()}. ${money(d.quote.charityCents)} allocated.`;
      await poll(); checkExpiring(); renderPanel();
    } catch (e) { b.disabled = false; modalError(e.message); }
  };
}

// ---------------------------------------------------------------------------
// panel
// ---------------------------------------------------------------------------
function renderHeader() {
  const s = S.cfg.stats;
  $('#statClaimed').textContent = num(s.paidPixels) + ' / ' + num(s.totalPixels);
  $('#statCharity').textContent = money(s.charityAllocatedCents);
  $('#statCharityLabel').textContent = `to ${S.cfg.charity.partnerName}`;
}
function tickCountdown() {
  if (!S.cfg) return;
  const ms = S.cfg.canvas.closesAt - Date.now();
  const el = $('#countdown');
  if (ms <= 0) { el.innerHTML = '<b>Canvas sealed</b> — this image is final'; return; }
  const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
  el.innerHTML = `Seals in <b>${d}d ${h}h ${m}m</b>, then it is printed and final`;
}

function priceFor(kind) {
  const n = claimedTotal();
  const per = kind === 'permanent'
    ? S.cfg.pricing.permanentCentsPerPixel : S.cfg.pricing.rentalCentsPerPixel;
  const gross = n * per;
  return { n, gross, charity: Math.round(gross * S.cfg.charity.shareOfGross), per };
}

function renderPanel() {
  const p = $('#panel');
  const alert = S.error ? `<div class="err">${esc(S.error)}</div>`
    : S.message ? `<div class="ok">${esc(S.message)}</div>` : '';

  if (S.mode === 'explore') {
    const s = S.cfg.stats;
    p.innerHTML = `
      <div class="sec">${alert}
        ${S.seenIntro ? '' : `<div class="info">
          <b>One million pixels.</b> Draw anything you like on the empty space, then choose
          whether to keep it forever or rent it for a week. ${Math.round(S.cfg.charity.shareOfGross * 100)}%
          of every euro goes to ${esc(S.cfg.charity.partnerName)} — and
          <a href="/canvas/transparency.html">every cent of the rest is published</a>.
        </div>`}
        <div class="seg">
          <button data-m="explore" class="on">Explore</button>
          <button data-m="draw">Draw &amp; claim</button>
        </div>
        <p class="note" style="margin-top:10px">Drag to pan, scroll to zoom.
          Hover any artwork to see who made it; click it for details.</p>
      </div>
      <div class="sec">
        <h3>What it costs</h3>
        <div class="kv"><span>Keep forever</span><b>${money(S.cfg.pricing.permanentCentsPerPixel)} / pixel</b></div>
        <div class="kv"><span>Rent 7 days</span><b>${money(S.cfg.pricing.rentalCentsPerPixel)} / pixel</b></div>
        <div class="kv"><span>Minimum payment</span><b>${money(S.cfg.pricing.minSpendCents)}</b></div>
        <p class="note" style="margin-top:8px">You pay for exactly the pixels you claim —
          not for a rectangle around them.</p>
      </div>
      <div class="sec">
        <h3>Canvas #${S.cfg.canvas.id}</h3>
        <div class="kv"><span>Claimed</span><b>${(s.occupancy * 100).toFixed(2)}%</b></div>
        <div class="kv"><span>Permanent</span><b>${num(s.pixels.permanent)} px</b></div>
        <div class="kv"><span>Rented</span><b>${num(s.pixels.rental)} px</b></div>
        <div class="kv"><span>Seed art (free, not sold)</span><b>${num(s.pixels.seed)} px</b></div>
        <div class="kv charity"><span>Allocated to charity</span><b>${money(s.charityAllocatedCents)}</b></div>
        <div class="kv"><span>Actually transferred</span><b>${money(s.charitySettledCents)}</b></div>
        <p class="note" style="margin-top:8px"><a href="/canvas/transparency.html">Full accounts →</a></p>
      </div>
      <div class="sec panelfoot">
        <a href="/canvas/about.html">How it works</a><a href="#" id="replayIntro">Quick guide</a>
        <a href="/canvas/terms.html">Terms</a><a href="/canvas/privacy.html">Privacy</a><a href="/canvas/imprint.html">Imprint</a>
      </div>`;
    bindModes();
    $('#replayIntro').onclick = (e) => { e.preventDefault(); introModal(); };
    return;
  }

  // ---- draw mode ----
  const perm = priceFor('permanent'), rent = priceFor('rental');
  const n = claimedTotal();
  const min = S.cfg.pricing.minSpendCents;
  const sw = S.cfg.swatches;
  const t = S.template;

  p.innerHTML = `
    <div class="sec">${alert}
      <div class="seg">
        <button data-m="explore">Explore</button>
        <button data-m="draw" class="on">Draw &amp; claim</button>
      </div>
    </div>

    <div class="sec">
      <h3>Reference image <span class="hint" title="Nothing is uploaded — the image is decoded in your browser">local only</span></h3>
      ${t ? `
        <div class="tpl">
          <div class="tplname">${esc(t.name)}<button id="tRemove" title="Remove">✕</button></div>
          <div class="kv"><span>Size on canvas</span><b>${Math.round(t.w)} × ${Math.round(t.h)} px</b></div>
          <label class="slab">Width
            <input type="range" id="tW" min="8" max="${MAX_TEMPLATE_PX}" value="${Math.round(t.w)}">
          </label>
          <label class="slab">Opacity
            <input type="range" id="tO" min="10" max="100" value="${Math.round(S.templateOpacity * 100)}">
          </label>
          <button class="btn ${S.moveTemplate ? 'primary' : ''}" id="tMove">
            ${S.moveTemplate ? 'Done positioning' : 'Reposition on canvas'}</button>
          <p class="note" style="margin:8px 0">${S.moveTemplate
            ? 'Drag anywhere on the canvas to move the image.'
            : 'Draw over it by hand, or convert it into pixels below.'}</p>
        </div>
        <div class="kv"><span>Would claim</span><b>${num(t.estimate ?? 0)} px</b></div>
        ${t.blocked ? `<p class="note" style="color:var(--warn)">${num(t.blocked)} pixels overlap
          artwork that is already owned and will be skipped.</p>` : ''}
        <div class="kv"><span>Cost if kept forever</span><b>${money((t.estimate ?? 0) * S.cfg.pricing.permanentCentsPerPixel)}</b></div>
        <label class="opt"><input type="checkbox" id="tSharp" ${t.sharp ? 'checked' : ''}>
          <span>Sharp edges<br><small style="color:var(--faint)">Off blends colours — better for photos, worse for pixel art.</small></span></label>
        <label class="opt"><input type="checkbox" id="tPal" ${t.matchPalette ? 'checked' : ''}>
          <span>Snap to canvas palette<br><small style="color:var(--faint)">Fewer, flatter colours.</small></span></label>
        <button class="btn primary" id="tGo" ${t.estimate ? '' : 'disabled'} style="margin-top:8px">
          Convert to pixels<small>${num(t.estimate ?? 0)} px · undoable</small></button>
      ` : `
        <button class="btn" id="tPick">Import an image</button>
        <input type="file" id="tFile" accept="image/*" hidden>
        <p class="note" style="margin-top:8px">Drop a file anywhere, or pick one. Trace over it by
          hand, or turn it into pixels in one click. It stays in your browser — nothing is uploaded.</p>
      `}
    </div>

    <div class="sec">
      <h3>Colour</h3>
      <div class="colorhead">
        <input type="color" id="cPick" value="${S.color}">
        <div class="hexbox"><input type="text" id="cHex" value="${S.color.toUpperCase()}" maxlength="7" spellcheck="false"></div>
      </div>
      <div id="swatches">${sw.map((c) =>
        `<button data-c="${c}" class="${c.toLowerCase() === S.color.toLowerCase() ? 'on' : ''}" style="background:${c}" title="${c}"></button>`).join('')}</div>
      ${S.recent.length ? `<h3 style="margin:12px 0 6px">Recent</h3>
        <div id="recent">${S.recent.map((c) =>
          `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>` : ''}
    </div>

    <div class="sec">
      <h3>Tool</h3>
      <div class="tools">
        <button data-t="pen"    class="${S.tool === 'pen' ? 'on' : ''}" title="Pen (B)"><i>✎</i>Pen</button>
        <button data-t="line"   class="${S.tool === 'line' ? 'on' : ''}" title="Line (L)"><i>╱</i>Line</button>
        <button data-t="rect"   class="${S.tool === 'rect' ? 'on' : ''}" title="Box (R)"><i>▭</i>Box</button>
        <button data-t="bucket" class="${S.tool === 'bucket' ? 'on' : ''}" title="Fill (G)"><i>▣</i>Fill</button>
        <button data-t="eraser" class="${S.tool === 'eraser' ? 'on' : ''}" title="Erase (E)"><i>⌫</i>Erase</button>
      </div>
      <div class="sizes">${[1, 2, 3, 5, 8].map((sz) =>
        `<button data-s="${sz}" class="${S.size === sz ? 'on' : ''}">${sz}px</button>`).join('')}</div>
      <div class="row" style="margin-top:8px">
        <button class="btn" id="doUndo" ${undoStack.length ? '' : 'disabled'}>↩ Undo</button>
        <button class="btn" id="doRedo" ${redoStack.length ? '' : 'disabled'}>↪ Redo</button>
      </div>
      <p class="note" style="margin-top:9px"><a href="#" id="showHelp">All shortcuts →</a></p>
    </div>

    <div class="sec">
      <h3>Your claim</h3>
      <div class="kv"><span>Pixels drawn</span><b id="drawnCount">${num(S.painted)}</b></div>
      <label class="opt"><input type="checkbox" id="cProtect" ${S.protect ? 'checked' : ''}>
        <span><b>Protect the empty space inside</b><br>
        <small style="color:var(--faint)">Claims the gaps sealed inside your shape, so nobody can
        draw inside your letter O. Costs the same per pixel.</small></span></label>
      ${S.protect ? `<div class="kv"><span>Protected empty</span><b>${num(S.protectedPx)}</b></div>` : ''}
      <div class="kv total"><span>You claim</span><b>${num(n)} px</b></div>
      ${n ? `<button class="btn ghost" id="doClear" style="margin-top:6px">Clear drawing</button>` : ''}
    </div>

    <div class="sec">
      <h3>Claim these pixels</h3>
      <div class="row">
        <button class="btn primary" id="buyPerm" ${perm.gross >= min ? '' : 'disabled'}>
          Keep forever<small>${money(perm.gross)}</small></button>
        <button class="btn" id="buyRent" ${rent.gross >= min ? '' : 'disabled'}>
          Rent 7 days<small>${money(rent.gross)}</small></button>
      </div>
      ${n === 0 ? '<p class="note" style="margin-top:10px">Draw something on the empty canvas to see the price.</p>'
        : perm.gross < min ? `<p class="note" style="margin-top:10px">Minimum payment is ${money(min)}.
            You need ${num(Math.ceil(min / S.cfg.pricing.permanentCentsPerPixel))} pixels to buy,
            or ${num(Math.ceil(min / S.cfg.pricing.rentalCentsPerPixel))} to rent.</p>`
        : rent.gross < min ? `<div class="kv charity" style="margin-top:10px"><span>To ${esc(S.cfg.charity.partnerName)}</span><b>${money(perm.charity)}</b></div>
            <p class="note">Renting this area is below the ${money(min)} minimum.</p>`
        : `<div class="kv charity" style="margin-top:10px"><span>To ${esc(S.cfg.charity.partnerName)}</span><b>${money(perm.charity)} / ${money(rent.charity)}</b></div>`}
    </div>`;
  bindModes(); bindDraw();
}

function bindModes() {
  document.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    S.mode = b.dataset.m; S.message = S.error = null; hideHover();
    if (S.mode === 'draw' && !S.seenIntro) { S.seenIntro = true; localStorage.setItem('seenIntro', '1'); }
    view.classList.toggle('paint', S.mode === 'draw');
    renderPanel();
  });
}
function setColor(c) {
  S.color = c;
  S.recent = [c, ...S.recent.filter((r) => r !== c)].slice(0, 10);
  renderPanel();
}
function bindDraw() {
  $('#cPick').oninput = (e) => setColor(e.target.value);
  $('#cHex').onchange = (e) => {
    const v = e.target.value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(v)) setColor(v.startsWith('#') ? v : '#' + v);
    else { S.error = 'That is not a valid hex colour.'; renderPanel(); }
  };
  document.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => setColor(b.dataset.c));
  document.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { S.tool = b.dataset.t; renderPanel(); });
  document.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { S.size = +b.dataset.s; renderPanel(); });
  $('#cProtect').onchange = (e) => { S.protect = e.target.checked; recomputeProtected(); renderPanel(); };
  const c = $('#doClear'); if (c) c.onclick = clearDraft;
  const un = $('#doUndo'); if (un) un.onclick = undo;
  const re = $('#doRedo'); if (re) re.onclick = redo;
  const hp = $('#showHelp'); if (hp) hp.onclick = (e) => { e.preventDefault(); helpModal(); };

  // reference image controls
  const pick = $('#tPick');
  if (pick) {
    pick.onclick = () => $('#tFile').click();
    $('#tFile').onchange = (e) => e.target.files[0] && loadTemplate(e.target.files[0]);
  }
  const tw = $('#tW');
  if (tw) {
    tw.oninput = (e) => { resizeTemplate(+e.target.value); renderPanel(); $('#tW')?.focus(); };
    $('#tO').oninput = (e) => { S.templateOpacity = +e.target.value / 100; };
    $('#tMove').onclick = () => { S.moveTemplate = !S.moveTemplate; renderPanel(); };
    $('#tRemove').onclick = removeTemplate;
    $('#tSharp').onchange = (e) => { S.template.sharp = e.target.checked; estimateTemplate(); renderPanel(); };
    $('#tPal').onchange = (e) => { S.template.matchPalette = e.target.checked; renderPanel(); };
    $('#tGo').onclick = convertModal;
  }
  const bp = $('#buyPerm'); if (bp) bp.onclick = () => checkoutModal('permanent');
  const br = $('#buyRent'); if (br) br.onclick = () => checkoutModal('rental');
}

// ---------------------------------------------------------------------------
// modals
// ---------------------------------------------------------------------------
const closeModal = () => document.querySelector('.modal')?.remove();
function modal(html) {
  closeModal();
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="card">${html}</div>`;
  el.onclick = (e) => { if (e.target === el) closeModal(); };
  document.body.appendChild(el);
  return el;
}
function modalError(m) {
  const card = document.querySelector('.modal .card');
  if (!card) { S.error = m; renderPanel(); return; }
  card.querySelector('.err')?.remove();
  card.insertAdjacentHTML('afterbegin', `<div class="err">${esc(m)}</div>`);
  card.scrollTop = 0;
}

/** Build the exact payload the server will price and store. */
function buildPayload() {
  const { x0, y0, x1, y1 } = S.box;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const img = draftCtx.getImageData(x0, y0, w, h).data;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const li = (y * w + x) * 4;
    const a = draftA[idx(x0 + x, y0 + y)];
    if (a === 255) {
      out[li] = img[li]; out[li + 1] = img[li + 1]; out[li + 2] = img[li + 2]; out[li + 3] = 255;
    } else if (a === 1) out[li + 3] = 1;
  }
  let bin = '';
  for (let i = 0; i < out.length; i += 8192)
    bin += String.fromCharCode.apply(null, out.subarray(i, i + 8192));
  return { x: x0, y: y0, w, h, pixels: btoa(bin) };
}

function checkoutModal(kind) {
  const q = priceFor(kind);
  const linkFee = S.cfg.pricing.linkSurchargeCents;
  const partner = esc(S.cfg.charity.partnerName);
  modal(`
    <h2>${kind === 'permanent' ? 'Keep these pixels forever' : 'Rent these pixels for 7 days'}</h2>
    <p class="sub">${num(q.n)} pixels${S.protectedPx ? ` (${num(S.painted)} drawn + ${num(S.protectedPx)} protected)` : ''}
      · ${money(q.per)} each${kind === 'rental' ? ' per week' : ''}</p>

    <label class="note">Title — shown when someone hovers your artwork</label>
    <input type="text" id="fTitle" maxlength="80" placeholder="e.g. r/Austria">

    <label class="note">Team (optional) — your pixels count toward this community's standing</label>
    <input type="text" id="fTeam" maxlength="32" placeholder="e.g. r/Austria, Team Jack, ETH Zurich"
      list="teamList"><datalist id="teamList"></datalist>

    <label class="note">Contact link (optional) — lets people reach you about this artwork</label>
    <input type="text" id="fContact" placeholder="https://… or mailto:you@example.com">

    <label class="opt"><input type="checkbox" id="fLink">
      <span><b>Make my artwork clickable (+${money(linkFee)})</b><br>
      <small style="color:var(--faint)">For businesses. Shown as paid advertising, reviewed before
      it goes live, and the link carries rel="nofollow".</small></span></label>
    <input type="url" id="fLinkUrl" placeholder="https://example.com" style="display:none">

    <div class="breakdown">
      <div class="kv"><span>${num(q.n)} pixels</span><b>${money(q.gross)}</b></div>
      <div class="kv" id="rowLink" style="display:none"><span>Clickable link</span><b>${money(linkFee)}</b></div>
      <div class="kv total"><span>Total</span><b id="fTotal">${money(q.gross)}</b></div>
      <div class="kv charity"><span>→ ${partner}</span><b id="fCharity">${money(q.charity)}</b></div>
    </div>

    ${kind === 'rental' ? `<div class="info">This expires in 7 days and the pixels return to the
      pool. You can renew or make it permanent before then.</div>` : ''}
    ${S.cfg.moderation.preModeration ? `<div class="info">Every artwork is reviewed by a person
      before it appears. That is what lets a charity put their name next to this canvas.</div>` : ''}

    <label class="opt"><input type="checkbox" id="fWaiver">
      <span>I want my artwork placed as soon as it is approved, and I understand that I lose my
      14-day right of withdrawal once it goes live.</span></label>

    <p class="note" style="margin-bottom:14px">This buys a pixel placement — it is not a
      tax-deductible donation. ${Math.round(S.cfg.charity.shareOfGross * 100)}% of what you pay is
      passed on to ${partner}. <a href="/canvas/transparency.html" target="_blank">See the full breakdown</a>.
      By paying you accept the <a href="/canvas/terms.html" target="_blank">terms</a> and confirm you have
      the right to use this artwork.</p>

    <button class="btn primary" id="fPay" disabled>Pay ${money(q.gross)}</button>
    <button class="btn ghost" id="fCancel" style="margin-top:8px">Back to the canvas</button>
    <p class="note" style="text-align:center;margin-top:10px">Local test build — no real payment is taken.</p>`);

  const recalc = () => {
    const withLink = $('#fLink').checked;
    const gross = q.gross + (withLink ? linkFee : 0);
    $('#rowLink').style.display = withLink ? '' : 'none';
    $('#fLinkUrl').style.display = withLink ? '' : 'none';
    $('#fTotal').textContent = money(gross);
    $('#fCharity').textContent = money(Math.round(gross * S.cfg.charity.shareOfGross));
    $('#fPay').textContent = 'Pay ' + money(gross);
  };
  // Suggest teams that already exist, so communities converge instead of
  // fragmenting into six spellings of the same name.
  fetch('/canvas/api/leaderboard').then((r) => r.json()).then((d) => {
    const dl = $('#teamList');
    if (dl) dl.innerHTML = d.board.map((t) => `<option value="${esc(t.team)}">`).join('');
  }).catch(() => {});
  $('#fLink').onchange = recalc;
  $('#fWaiver').onchange = (e) => { $('#fPay').disabled = !e.target.checked; };
  $('#fCancel').onclick = closeModal;
  $('#fPay').onclick = async () => {
    const btn = $('#fPay');
    btn.disabled = true; btn.textContent = 'Processing…';
    try {
      const d = await post('/canvas/api/claim', {
        ...buildPayload(), kind,
        title: $('#fTitle').value,
        team: $('#fTeam').value,
        contactUrl: $('#fContact').value,
        linkUrl: $('#fLink').checked ? $('#fLinkUrl').value : '',
        withdrawalWaiver: true,
      });
      closeModal();
      S.message = d.pending
        ? `Paid ${money(d.quote.grossCents)}. Your artwork is in review and appears once approved. ${money(d.quote.charityCents)} allocated to ${S.cfg.charity.partnerName}.`
        : `Live! ${money(d.quote.charityCents)} allocated to ${S.cfg.charity.partnerName}.`;
      clearDraft(); removeTemplate();
      S.mode = 'explore'; view.classList.remove('paint');
      await poll(); checkExpiring(); renderPanel();
    } catch (e) {
      if (e.data?.conflicts) { S.conflicts = e.data.conflicts; zoomTo(S.box); }
      btn.disabled = false; recalc();
      modalError(e.message);
    }
  };
}

/** Converting someone else's artwork is the obvious misuse, so we ask first. */
function convertModal() {
  const t = S.template;
  const perm = t.estimate * S.cfg.pricing.permanentCentsPerPixel;
  const rent = t.estimate * S.cfg.pricing.rentalCentsPerPixel;
  modal(`
    <h2>Convert image to pixels</h2>
    <p class="sub">${esc(t.name)} · ${Math.round(t.w)} × ${Math.round(t.h)} on the canvas</p>
    <div class="breakdown">
      <div class="kv"><span>Pixels it would claim</span><b>${num(t.estimate)}</b></div>
      ${t.blocked ? `<div class="kv"><span>Skipped (already owned)</span><b>${num(t.blocked)}</b></div>` : ''}
      <div class="kv"><span>Keep forever</span><b>${money(perm)}</b></div>
      <div class="kv"><span>Rent 7 days</span><b>${money(rent)}</b></div>
    </div>
    <div class="info">Nothing is charged yet. The image becomes an editable drawing — you can
      erase parts, recolour it, or undo the whole import with ⌘Z before you pay.</div>
    <label class="opt"><input type="checkbox" id="vRights">
      <span>I made this image or I have the right to use it. I understand that artwork infringing
      someone else's copyright or trademark is removed without a refund.</span></label>
    <button class="btn primary" id="vGo" disabled>Place ${num(t.estimate)} pixels</button>
    <button class="btn ghost" id="vNo" style="margin-top:8px">Cancel</button>`);
  $('#vRights').onchange = (e) => { $('#vGo').disabled = !e.target.checked; };
  $('#vNo').onclick = closeModal;
  $('#vGo').onclick = () => { closeModal(); commitTemplate(); };
}

/** Three sentences, once, then never again. */
function introModal() {
  const share = Math.round(S.cfg.charity.shareOfGross * 100);
  modal(`
    <h2>One million pixels</h2>
    <p class="sub">Canvas #${S.cfg.canvas.id} · ${W} × ${H} · sealed and printed when the timer ends</p>
    <ol style="margin:0 0 18px;padding-left:18px">
      <li style="margin-bottom:10px"><b>Draw on the empty space.</b> Anywhere nobody owns. Import
        an image to trace, or draw from scratch.</li>
      <li style="margin-bottom:10px"><b>Then decide.</b> You see the price for exactly the pixels
        you drew — keep them forever, or rent them for a week.</li>
      <li><b>${share}% of every euro goes to ${esc(S.cfg.charity.partnerName)}</b>, and every cent
        of the rest is published, including the developer's own tax bill.</li>
    </ol>
    <button class="btn primary" id="iGo">Start drawing</button>
    <button class="btn ghost" id="iLook" style="margin-top:8px">Just look around first</button>
    <p class="note" style="text-align:center;margin-top:10px">
      <a href="/canvas/about.html">How it works in detail →</a></p>`);
  const done = () => {
    S.seenIntro = true; localStorage.setItem('seenIntro', '1'); closeModal();
  };
  $('#iGo').onclick = () => {
    done(); S.mode = 'draw'; view.classList.add('paint'); renderPanel();
  };
  $('#iLook').onclick = () => { done(); renderPanel(); };
}

function helpModal() {
  const keys = [
    ['B', 'Pen'], ['L', 'Line'], ['R', 'Box'], ['G', 'Fill enclosed area'], ['E', 'Eraser'],
    ['[ / ]', 'Smaller / larger brush'],
    ['⌘Z / Ctrl+Z', 'Undo'], ['⇧⌘Z / Ctrl+Y', 'Redo'],
    ['0', 'Fit the whole canvas'], ['Esc', 'Close this / cancel'],
    ['Scroll', 'Zoom'], ['Shift + drag', 'Pan while drawing'],
    ['Two fingers', 'Pinch to zoom, drag to pan'],
  ];
  modal(`
    <h2>Shortcuts &amp; tips</h2>
    <p class="sub">Everything the editor can do</p>
    <table style="margin-bottom:16px">
      ${keys.map(([k, v]) => `<tr><td style="width:40%"><code>${k}</code></td><td style="text-align:left">${v}</td></tr>`).join('')}
    </table>
    <h3 style="font-size:14px;margin-bottom:6px">Tracing an image</h3>
    <p class="note" style="margin-bottom:12px">Drop any image onto the canvas. Resize and position
      it, then either draw over it by hand at whatever opacity suits you, or convert it into pixels
      in one click and edit the result. The file is decoded in your browser and never uploaded.</p>
    <h3 style="font-size:14px;margin-bottom:6px">Why some pixels refuse to paint</h3>
    <p class="note" style="margin-bottom:12px">Pixels somebody already owns cannot be drawn on. The
      editor simply skips them rather than letting you build something you cannot buy.</p>
    <button class="btn ghost" id="hClose">Close</button>`);
  $('#hClose').onclick = closeModal;
}

function artworkModal(a, at) {
  const left = a.expiresAt ? Math.max(0, a.expiresAt - Date.now()) : 0;
  modal(`
    <h2>${esc(a.title) || 'Untitled'}</h2>
    <p class="sub"><span class="pill ${a.kind}">${a.kind}</span></p>
    <div class="kv"><span>Created by</span><b>${esc(a.by)}</b></div>
    ${a.team ? `<div class="kv"><span>Team</span>
      <b><a href="/canvas/leaderboard.html#${encodeURIComponent(a.team)}">${esc(a.team)}</a></b></div>` : ''}
    <div class="kv"><span>Pixels</span><b>${num(a.pixels)}</b></div>
    <div class="kv"><span>Placed</span><b>${new Date(a.createdAt).toLocaleDateString()}</b></div>
    ${a.expiresAt ? `<div class="kv"><span>Expires</span><b>in ${Math.ceil(left / 3600000)} hours</b></div>` : ''}
    ${a.link ? `<div class="breakdown"><b>Sponsored placement</b>
        <p class="note" style="margin-top:5px">This artwork paid for a clickable link. It is
        advertising and is labelled as such.</p>
        <a href="${esc(a.link)}" target="_blank" rel="nofollow noopener ugc">${esc(a.link)}</a></div>` : ''}
    ${a.contact ? `<div class="breakdown"><b>Contact the creator</b>
        <p class="note" style="margin-top:5px">This creator published a way to reach them — for
        example if you want to trade space or collaborate on neighbouring pixels.</p>
        <a href="${esc(a.contact)}" target="_blank" rel="nofollow noopener ugc">${esc(a.contact)}</a></div>` : ''}
    <a class="btn" href="/canvas/a/${esc(a.id)}" style="margin-top:14px">Open shareable page</a>
    <button class="btn" id="aReport" style="margin-top:8px">Report this artwork</button>
    <button class="btn ghost" id="aClose" style="margin-top:8px">Close</button>`);
  $('#aClose').onclick = closeModal;
  $('#aReport').onclick = () => reportModal(at);
}

function reportModal(at) {
  modal(`
    <h2>Report artwork</h2>
    <p class="sub">Pixel ${at.join(', ')} · reviewed by a person, usually within hours</p>
    <select id="rReason">
      <option value="illegal">Illegal content</option>
      <option value="hate">Hate symbols or extremist propaganda</option>
      <option value="sexual">Sexual content</option>
      <option value="violence">Violence or threats</option>
      <option value="scam">Scam or fraud</option>
      <option value="copyright">Copyright or trademark abuse</option>
      <option value="other">Something else</option>
    </select>
    <textarea id="rDetail" rows="3" placeholder="Anything else we should know? (optional)"></textarea>
    <button class="btn primary" id="rSend">Submit report</button>
    <button class="btn ghost" id="rCancel" style="margin-top:8px">Cancel</button>`);
  $('#rCancel').onclick = closeModal;
  $('#rSend').onclick = async () => {
    try {
      await post('/canvas/api/report', {
        x: at[0], y: at[1], reason: $('#rReason').value, detail: $('#rDetail').value });
      closeModal(); S.message = 'Report received. Thank you — a person will look at it.'; renderPanel();
    } catch (e) { modalError(e.message); }
  };
}

$('#navMine').onclick = async (e) => {
  e.preventDefault();
  const d = await api('/canvas/api/mine');
  modal(`
    <h2>My artworks</h2>
    <p class="sub">Signed in as ${esc(d.user.name)}</p>
    <label class="note">Display name</label>
    <input type="text" id="mName" value="${esc(d.user.name)}" maxlength="32">
    <button class="btn" id="mSave" style="margin-bottom:16px">Save name</button>
    ${d.artworks.length ? d.artworks.map((a) => `
      <div class="breakdown">
        <b>${esc(a.title) || 'Untitled'}</b>
        <div style="margin:6px 0"><span class="pill ${a.kind}">${a.kind}</span>
          <span class="pill ${a.status}">${a.status}</span></div>
        <div class="kv"><span>Pixels claimed</span><b>${num(a.claimed_count)}</b></div>
        <div class="kv"><span>Position</span><b>${a.bbox_x}, ${a.bbox_y}</b></div>
        ${a.team ? `<div class="kv"><span>Team</span><b>${esc(a.team)}</b></div>` : ''}
        ${a.expires_at ? `<div class="kv"><span>Expires</span><b>${new Date(a.expires_at).toLocaleString()}</b></div>` : ''}
        ${a.moderation_note ? `<p class="note" style="color:var(--bad)">Moderation: ${esc(a.moderation_note)}</p>` : ''}
        ${a.status === 'live' ? `<div class="row" style="margin-top:8px">
          <a class="btn ghost" href="/canvas/a/${a.id}">Share</a>
          <a class="btn ghost" href="/canvas/?x=${a.bbox_x}&y=${a.bbox_y}&z=8">Locate</a>
          ${a.kind === 'rental' ? `<button class="btn" data-renew="${a.id}">Renew</button>` : ''}
        </div>` : ''}
      </div>`).join('')
      : '<p class="note">Nothing yet. Switch to “Draw &amp; claim” and put something on the canvas.</p>'}
    <button class="btn ghost" id="mClose" style="margin-top:8px">Close</button>`);
  document.querySelectorAll('[data-renew]').forEach((b) => b.onclick = () => {
    const art = d.artworks.find((x) => x.id === b.dataset.renew);
    renewModal({ id: art.id, title: art.title, claimed_count: art.claimed_count }, 'rental');
  });
  $('#mClose').onclick = closeModal;
  $('#mSave').onclick = async () => {
    try { await post('/canvas/api/name', { name: $('#mName').value }); closeModal(); }
    catch (err) { modalError(err.message); }
  };
};

let offlineSince = null;
function markOffline(on) {
  if (on && !offlineSince) offlineSince = Date.now();
  if (!on) offlineSince = null;
  document.body.classList.toggle('offline', !!offlineSince);
}

boot().catch((e) => {
  document.body.classList.remove('app');
  document.body.innerHTML = `
    <div class="wrap">
      <h1>The canvas could not load</h1>
      <p class="lede">${esc(e.message)}</p>
      <div class="box">
        <p>Your drawing is not lost if you had one — it lives in this tab until you reload.</p>
        <button class="btn primary" onclick="location.reload()">Try again</button>
      </div>
    </div>`;
});

// dev inspection hook
window.__S = S;
