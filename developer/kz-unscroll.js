/* Unscroll scene: a scroll-driven short in five beats, drawn in layered vector with real
 * light: 2:47 a.m., the phone is the only light in the room and lights his face like a
 * spotlight -> he snaps out of it -> throws the phone -> sunrise pours through the window ->
 * the camera pushes through the window into the morning (parallax layers), where he is
 * outside. The character is rigged: every body part is rebuilt from interpolated poses. */
(function () {
  const host = document.getElementById('kz-unscroll');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    skin: '#ffb196', skinShade: '#ec8b77', cheek: '#ff6b8f', hair: '#22124f', hairHi: '#3b2484',
    shirt: '#2ad4c0', shirtShade: '#1a9f92', pants: '#232070', pantsShade: '#18145a', shoe: '#ffd23f', phone: '#120a36', glow: '#9ff6ff',
    tree: '#16a37f', treeHi: '#3fd6a4', treeLo: '#0d7c62',
  };
  // seeded random so the drawing is identical on every load
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = (a, b) => a + (b - a) * rnd();

  /* ---------- outside: layered landscape (parallax) ---------- */
  const cloud = (x, y, s, o = 1) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">
      <ellipse cx="0" cy="14" rx="120" ry="26" fill="url(#kzCloudB)"/>
      <circle cx="-56" cy="0" r="40" fill="url(#kzCloud)"/><circle cx="-6" cy="-22" r="56" fill="url(#kzCloud)"/><circle cx="52" cy="-4" r="44" fill="url(#kzCloud)"/><circle cx="92" cy="10" r="28" fill="url(#kzCloud)"/>
    </g>`;
  const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="6" cy="2" rx="46" ry="9" fill="#0b6d55" opacity=".35"/>
      <path d="M-6 0 C -4 -30 -8 -50 -2 -70 L 6 -70 C 10 -50 6 -30 8 0Z" fill="#7a4532"/>
      <circle cx="-26" cy="-78" r="34" fill="${C.treeLo}"/><circle cx="24" cy="-82" r="36" fill="${C.treeLo}"/>
      <circle cx="0" cy="-104" r="42" fill="${C.tree}"/><circle cx="-30" cy="-88" r="28" fill="${C.tree}"/><circle cx="30" cy="-92" r="30" fill="${C.tree}"/>
      <circle cx="-10" cy="-118" r="24" fill="${C.treeHi}" opacity=".9"/><circle cx="16" cy="-104" r="14" fill="${C.treeHi}" opacity=".6"/>
    </g>`;
  const pine = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -60 L 16 -20 L 8 -22 L 22 6 L -22 6 L -8 -22 L -16 -20Z" fill="${c}"/>`;
  const ridgeTrees = (y0, n, x0, x1, s, c) => Array.from({ length: n }, () => { const x = R(x0, x1); return pine(x.toFixed(0), (y0 + R(-6, 8)).toFixed(0), R(.5, 1) * s, c); }).join('');
  const grass = Array.from({ length: 170 }, () => { const x = R(0, 1600), y = R(735, 900), h = R(10, 22), c = ['#2cc58f', '#21ad7d', '#45dba3'][Math.floor(rnd() * 3)];
    return `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q -3 ${-h * .6} -7 ${-h} M${x.toFixed(0)} ${y.toFixed(0)} q 1 ${-h * .7} 2 ${-h * 1.1} M${x.toFixed(0)} ${y.toFixed(0)} q 4 ${-h * .5} 8 ${-h * .9}" stroke="${c}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`; }).join('');
  const flowers = Array.from({ length: 60 }, () => { const x = R(0, 1600), y = R(745, 895), c = ['#ffd23f', '#ff7ad9', '#ffffff', '#ff8a5b'][Math.floor(rnd() * 4)];
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${R(2.5, 4.5).toFixed(1)}" fill="${c}"/>`; }).join('');

  /* ---------- room details ---------- */
  const books = Array.from({ length: 11 }, (_, i) => { const w = R(14, 24), h = R(54, 78), c = ['#ff6b8f', '#ffd23f', '#36e0c8', '#7c5cff', '#ff8a5b', '#f3ecff'][i % 6];
    return { w, h, c }; });
  let bx = 0; const shelfBooks = books.map((b) => { const x = bx; bx += b.w + 3; return `<rect x="${x.toFixed(1)}" y="${(-b.h).toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="3" fill="${b.c}"/><rect x="${(x + 3).toFixed(1)}" y="${(-b.h + 8).toFixed(1)}" width="${(b.w - 6).toFixed(1)}" height="4" rx="2" fill="#fff" opacity=".35"/>`; }).join('');
  const cityWin = Array.from({ length: 46 }, () => `<rect x="${R(1066, 1344).toFixed(0)}" y="${R(410, 478).toFixed(0)}" width="4" height="5" fill="#ffd77a" opacity="${R(.4, 1).toFixed(2)}"/>`).join('');
  const stars = Array.from({ length: 26 }, () => `<circle cx="${R(1066, 1344).toFixed(0)}" cy="${R(200, 400).toFixed(0)}" r="${R(.8, 2.4).toFixed(1)}" fill="#fff" opacity="${R(.4, 1).toFixed(2)}"/>`).join('');
  const motes = Array.from({ length: 34 }, () => `<circle class="kz-mote" cx="${R(560, 1300).toFixed(0)}" cy="${R(230, 860).toFixed(0)}" r="${R(1.2, 3).toFixed(1)}" fill="#fff6d4"/>`).join('');

  host.innerHTML = `
  <div class="kz-stage">
    <svg class="kz-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="kzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cbcff"/><stop offset=".42" stop-color="#cfe4ff"/><stop offset=".66" stop-color="#ffd8a8"/><stop offset=".8" stop-color="#ffb46b"/></linearGradient>
        <radialGradient id="kzSunGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#fff0b8" stop-opacity=".9"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient>
        <radialGradient id="kzCloud" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#fff3e6"/><stop offset="1" stop-color="#ffd9c2"/></radialGradient>
        <linearGradient id="kzCloudB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7d6"/><stop offset="1" stop-color="#f6bfa3"/></linearGradient>
        <linearGradient id="kzMtnFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b6a3f0"/><stop offset="1" stop-color="#e9c7d8"/></linearGradient>
        <linearGradient id="kzMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a72de"/><stop offset="1" stop-color="#c79ac9"/></linearGradient>
        <linearGradient id="kzLake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0a8"/><stop offset=".4" stop-color="#9fd2ff"/><stop offset="1" stop-color="#6fa8ec"/></linearGradient>
        <linearGradient id="kzHillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#52d6a4"/><stop offset="1" stop-color="#2aa883"/></linearGradient>
        <linearGradient id="kzHillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe3a6"/><stop offset=".5" stop-color="#36c98d"/><stop offset="1" stop-color="#22a676"/></linearGradient>
        <linearGradient id="kzMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4e6" stop-opacity="0"/><stop offset=".5" stop-color="#fff4e6" stop-opacity=".55"/><stop offset="1" stop-color="#fff4e6" stop-opacity="0"/></linearGradient>
        <linearGradient id="kzWall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b1a86"/><stop offset=".7" stop-color="#3b23a8"/><stop offset="1" stop-color="#3420a0"/></linearGradient>
        <linearGradient id="kzFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a167a"/><stop offset="1" stop-color="#1d0f5c"/></linearGradient>
        <linearGradient id="kzWinNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0838"/><stop offset=".75" stop-color="#2a1a7e"/><stop offset="1" stop-color="#4a2f9e"/></linearGradient>
        <radialGradient id="kzMoonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e9e2ff" stop-opacity=".6"/><stop offset="1" stop-color="#e9e2ff" stop-opacity="0"/></radialGradient>
        <linearGradient id="kzDuvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5fd8"/><stop offset="1" stop-color="#b8329f"/></linearGradient>
        <linearGradient id="kzMattress" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5cf6"/><stop offset="1" stop-color="#5233cc"/></linearGradient>
        <linearGradient id="kzWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a47e2"/><stop offset="1" stop-color="#4a2ec2"/></linearGradient>
        <linearGradient id="kzCurtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a9fc4"/><stop offset=".35" stop-color="#3cc4e2"/><stop offset=".6" stop-color="#2a9fc4"/><stop offset="1" stop-color="#45d0ea"/></linearGradient>
        <linearGradient id="kzSkinG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc0a6"/><stop offset="1" stop-color="${C.skin}"/></linearGradient>
        <linearGradient id="kzShirtG" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee6d1"/><stop offset="1" stop-color="#22c2ae"/></linearGradient>
        <radialGradient id="kzFaceLit" cx=".85" cy=".85" r=".9"><stop offset="0" stop-color="#d8fdff" stop-opacity=".95"/><stop offset=".45" stop-color="#9ff6ff" stop-opacity=".45"/><stop offset="1" stop-color="#9ff6ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="kzBeamG" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="170"><stop offset="0" stop-color="#e6feff" stop-opacity=".85"/><stop offset=".35" stop-color="#9ff6ff" stop-opacity=".35"/><stop offset="1" stop-color="#9ff6ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="kzHole" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000"/><stop offset=".45" stop-color="#333"/><stop offset="1" stop-color="#fff"/></radialGradient>
        <mask id="kzDarkMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900"><rect width="1600" height="900" fill="#fff"/><circle class="kz-hole" cx="980" cy="420" r="330" fill="url(#kzHole)"/></mask>
        <linearGradient id="kzShaft" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient>
        <linearGradient id="kzPatch" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset="1" stop-color="#ffc760"/></linearGradient>
        <radialGradient id="kzWarm" cx=".72" cy=".38" r=".85"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a5b" stop-opacity=".18"/></radialGradient>
        <pattern id="kzPlaid" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#ff5d73"/><rect width="14" height="28" fill="#fff" opacity=".28"/><rect width="28" height="14" fill="#fff" opacity=".28"/></pattern>
        <filter id="kzBlur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="kzBlur18" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
        <filter id="kzBlur3"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="kzPush" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur class="kz-push-blur" stdDeviation="0"/></filter>
        <clipPath id="kzWinClip"><rect x="1062" y="196" width="286" height="286" rx="4"/></clipPath>
      </defs>

      <!-- ===== OUTSIDE: sunrise landscape in parallax layers ===== -->
      <g class="kz-out">
        <g class="kz-o-sky">
          <rect x="-400" y="-300" width="2400" height="1500" fill="url(#kzSky)"/>
          <g class="kz-rays" opacity=".22">${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 2 * Math.PI, b = (i + .4) / 16 * 2 * Math.PI; return `<path d="M1205 400 L ${1205 + Math.cos(a) * 1500} ${400 + Math.sin(a) * 1500} L ${1205 + Math.cos(b) * 1500} ${400 + Math.sin(b) * 1500}Z" fill="#fff6d0"/>`; }).join('')}</g>
          <circle class="kz-sun-glow" cx="1205" cy="560" r="380" fill="url(#kzSunGlow)"/>
          <circle class="kz-sun" cx="1205" cy="560" r="78" fill="#fffbea"/>
          ${cloud(260, 210, 1.1, .95)}${cloud(620, 140, .7, .8)}<g class="kz-cloud-a">${cloud(1460, 240, .9, .9)}</g><g class="kz-cloud-b">${cloud(940, 300, .55, .75)}</g>
          <g class="kz-birds" fill="none" stroke="#5a3fa6" stroke-width="4" stroke-linecap="round">
            <path d="M300 300 q14 -12 28 0 q14 -12 28 0"/><path d="M380 262 q10 -9 20 0 q10 -9 20 0"/><path d="M1080 230 q12 -10 24 0 q12 -10 24 0"/>
          </g>
        </g>
        <g class="kz-o-far">
          <path d="M-300 610 L 60 470 L 210 540 L 420 430 L 640 560 L 820 470 L 1010 560 L 1240 440 L 1460 545 L 1650 470 L 1900 600 V 760 H -300Z" fill="url(#kzMtnFar)"/>
          <path d="M420 430 L 470 452 L 448 470 L 410 462 L 395 446Z M1240 440 L 1290 462 L 1262 478 L 1226 470 L 1214 452Z M60 470 L 100 486 L 70 496 L 46 488Z" fill="#fff" opacity=".7"/>
          <path d="M-300 650 L 120 560 L 330 620 L 560 545 L 760 630 L 980 560 L 1180 640 L 1420 575 L 1900 650 V 780 H -300Z" fill="url(#kzMtn)"/>
          <rect x="-300" y="600" width="2200" height="90" fill="url(#kzMist)"/>
          <path d="M760 668 C 900 650 1140 652 1320 670 C 1200 690 900 692 760 668Z" fill="url(#kzLake)"/>
          <path d="M1170 662 h70 M1188 672 h44 M1200 680 h26" stroke="#fff8dd" stroke-width="3" stroke-linecap="round" opacity=".9"/>
        </g>
        <g class="kz-o-mid">
          <path d="M-300 700 C 0 640 260 650 520 690 C 760 728 980 640 1240 660 C 1460 676 1640 640 1900 660 V 840 H -300Z" fill="url(#kzHillMid)"/>
          ${ridgeTrees(668, 18, -200, 480, 1, '#1f9b74')}${ridgeTrees(662, 14, 1180, 1800, 1, '#1f9b74')}
          ${tree(210, 700, .7)}${tree(1460, 690, .62)}
          <rect x="-300" y="680" width="2200" height="70" fill="url(#kzMist)" opacity=".6"/>
        </g>
        <g class="kz-o-near">
          <path d="M-300 760 C 100 700 420 690 700 712 C 980 734 1180 760 1500 728 C 1700 708 1800 720 1900 730 V 1100 H -300Z" fill="url(#kzHillNear)"/>
          <path d="M760 1100 C 780 960 700 860 640 800 C 610 772 640 744 700 740" stroke="#f2d6a2" stroke-width="40" fill="none" stroke-linecap="round" opacity=".85"/>
          ${grass}${flowers}
          ${tree(80, 830, 1.15)}${tree(1530, 840, 1.25)}
          <g class="kz-kite" transform="translate(1000 300) rotate(12)">
            <path d="M0 -46 L 34 0 L 0 52 L -34 0Z" fill="#e94bd6"/><path d="M0 -46 L 34 0 L 0 0Z" fill="#ff7ad9"/><path d="M0 -46 L -34 0 L 0 0Z" fill="#36e0c8"/>
            <path d="M0 52 C 20 90 -20 120 10 160 C 30 190 -10 220 20 260" stroke="#7a3fd1" stroke-width="3" fill="none"/>
          </g>
          <g class="kz-picnic" transform="translate(1190 806) scale(.9)">
            <ellipse cx="6" cy="40" rx="176" ry="26" fill="#0e7d5c" opacity=".3"/>
            <ellipse cx="0" cy="32" rx="166" ry="27" fill="url(#kzPlaid)"/>
            <path d="M-166 32 C -150 50 150 52 166 32" stroke="#c2304a" stroke-width="4" fill="none"/>
            <!-- her: sitting with her legs to the side, reaching into the basket -->
            <g transform="translate(-66 16)">
              <path d="M-14 12 C 10 2 44 2 58 14 C 62 22 54 26 40 24 C 20 22 2 24 -12 22Z" fill="#3949ab"/><path d="M40 22 C 50 22 60 22 64 18" stroke="#2b388f" stroke-width="3" fill="none"/>
              <ellipse cx="63" cy="19" rx="10" ry="6" fill="#fff"/>
              <path d="M-26 14 C -32 -18 -24 -48 -4 -58 C 14 -58 22 -36 20 14Z" fill="#ffd23f"/><path d="M-26 14 C -30 -10 -28 -30 -20 -44 C -14 -20 -12 0 -10 14Z" fill="#f2b82b"/>
              <path d="M8 -46 C 22 -34 34 -18 50 -8" stroke="#ffd23f" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M44 -10 L 54 -4" stroke="#ffb196" stroke-width="12" stroke-linecap="round"/>
              <path d="M-8 -60 h12 v10 h-12z" fill="#ec8b77"/>
              <ellipse cx="0" cy="-84" rx="25" ry="26" fill="#ffb196"/>
              <path d="M-28 -80 C -34 -112 -6 -124 14 -116 C 26 -112 30 -100 26 -90 C 18 -98 6 -100 -6 -96 C -12 -90 -18 -82 -22 -74 C -25 -74 -27 -77 -28 -80Z" fill="#e94bd6"/>
              <path d="M-24 -96 C -48 -96 -54 -70 -40 -54 C -36 -70 -32 -80 -22 -86Z" fill="#e94bd6"/><circle cx="-26" cy="-96" r="5" fill="#ffd23f"/>
              <circle cx="12" cy="-84" r="3" fill="#26145f"/><path d="M8 -93 q5 -3 10 0" stroke="#26145f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
              <path d="M10 -72 q6 5 12 -1" stroke="#6b2a45" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="16" cy="-76" r="6" fill="#ff6b8f" opacity=".45"/>
            </g>
            <!-- him: cross-legged, waving up at the hill -->
            <g transform="translate(70 18)">
              <path d="M-40 16 C -30 0 30 0 44 16 C 40 26 -36 26 -40 16Z" fill="#232070"/><ellipse cx="-36" cy="18" rx="10" ry="6" fill="#fff"/><ellipse cx="42" cy="18" rx="10" ry="6" fill="#fff"/>
              <path d="M-24 10 C -30 -20 -22 -50 0 -60 C 22 -50 28 -20 22 10Z" fill="#ff7a59"/><path d="M14 -52 C 24 -30 26 -10 22 10 C 16 -10 12 -30 6 -50Z" fill="#e8603f"/>
              <path d="M-14 -36 C -20 -18 -12 -4 0 0" stroke="#ff7a59" stroke-width="14" stroke-linecap="round" fill="none"/>
              <path d="M-8 -60 h14 v10 h-14z" fill="#b8705a"/>
              <ellipse cx="0" cy="-84" rx="24" ry="25" fill="#d98a6c"/>
              <path d="M-26 -84 C -28 -112 22 -116 26 -88 C 16 -100 -2 -102 -14 -92 C -18 -86 -22 -82 -26 -84Z" fill="#1f1a66"/>
              <circle cx="-10" cy="-84" r="3" fill="#26145f"/><circle cx="8" cy="-84" r="3" fill="#26145f"/>
              <path d="M-8 -72 q8 7 16 0" stroke="#5b2340" stroke-width="2.8" fill="none" stroke-linecap="round"/><circle cx="-16" cy="-76" r="5" fill="#ff6b8f" opacity=".4"/><circle cx="16" cy="-76" r="5" fill="#ff6b8f" opacity=".4"/>
              <g class="kz-wave"><path d="M18 -46 C 30 -60 40 -80 46 -100" stroke="#ff7a59" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M40 -100 C 37 -110 39 -122 46 -124 C 53 -125 57 -116 55 -106 C 54 -100 50 -97 46 -97 C 43 -97 41 -98 40 -100Z" fill="#d98a6c"/><path d="M41 -104 C 36 -106 34 -110 36 -113 C 38 -115 41 -113 43 -110" fill="#d98a6c" stroke="#c07455" stroke-width="1.2"/></g>
            </g>
            <!-- basket, apples, a flask -->
            <g transform="translate(-4 28)">
              <path d="M-26 -22 h52 l-6 26 h-40z" fill="#c97a2b"/><path d="M-26 -22 h52 v6 h-52z" fill="#a8611c"/><path d="M-20 -14 l40 0 M-22 -6 l44 0" stroke="#8a4d14" stroke-width="2"/>
              <path d="M-18 -22 C -14 -46 14 -46 18 -22" stroke="#8a4d14" stroke-width="4" fill="none"/>
              <circle cx="-8" cy="-26" r="7" fill="#ff4f6d"/><circle cx="6" cy="-27" r="6" fill="#7bd36a"/>
              <rect x="34" y="-28" width="12" height="30" rx="4" fill="#36e0c8"/><rect x="34" y="-32" width="12" height="6" rx="2" fill="#1f9b8a"/>
            </g>
          </g>
        </g>
      </g>

      <!-- ===== ROOM (beats 1-4) ===== -->
      <g class="kz-indoor">
      <g class="kz-room">
        <path d="M0 0H1600V900H0Z M1062 196V482H1348V196Z" fill="url(#kzWall)" fill-rule="evenodd"/>
        <g opacity=".06" stroke="#fff" stroke-width="2">${Array.from({ length: 40 }, (_, i) => `<path d="M${i * 40 + 20} 70 V660"/>`).join('')}</g>
        <rect x="0" y="0" width="1600" height="70" fill="#2a1789"/>
        <rect x="0" y="640" width="1600" height="22" fill="#2c1888"/>
        <rect x="0" y="660" width="1600" height="240" fill="url(#kzFloor)"/>
        <g stroke="#160b4f" stroke-width="2" opacity=".55">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${690 + i * 26 + i * i * 1.4} H1600"/>`).join('')}</g>
        <!-- window: night sky and the city -->
        <g class="kz-window">
          <path d="M1040 174h330v330h-330Z M1062 196V482H1348V196Z" fill="#5b42d8" fill-rule="evenodd"/>
          <path d="M1040 174h330v8h-330Z M1040 174h8v330h-8Z" fill="#7a63ee"/>
          <g clip-path="url(#kzWinClip)">
            <g class="kz-night-sky">
              <rect x="1062" y="196" width="286" height="286" fill="url(#kzWinNight)"/>
              ${stars}
              <g class="kz-moon"><circle cx="1270" cy="262" r="70" fill="url(#kzMoonGlow)"/>
              <circle cx="1270" cy="262" r="30" fill="#f3ecff"/><circle cx="1284" cy="252" r="26" fill="#1a0e52"/></g>
              <path d="M1062 482 V430 h18 v-18 h22 v26 h14 v-40 h26 v34 h12 v-22 h20 v42 h16 v-56 h24 v36 h18 v-24 h22 v40 h16 v-30 h20 v20 h18 v-14 h20 v52Z" fill="#170d4c"/>
              ${cityWin}
            </g>
          </g>
          <g class="kz-bars"><rect x="1198" y="196" width="14" height="286" fill="#5b42d8"/>
          <rect x="1062" y="332" width="286" height="14" fill="#5b42d8"/></g>
          <rect x="1030" y="496" width="350" height="18" rx="5" fill="#6a52e6"/><rect x="1030" y="510" width="350" height="8" rx="4" fill="#3c25a8"/>
          <rect x="1010" y="146" width="390" height="14" rx="7" fill="#ff9d3c"/>
          <path class="kz-curtain-l" d="M1016 160 h80 v380 q-40 16 -80 0z" fill="url(#kzCurtain)"/>
          <path class="kz-curtain-r" d="M1314 160 h80 v380 q-40 16 -80 0z" fill="url(#kzCurtain)"/>
          <path d="M1036 170 v360 M1060 170 v362 M1334 170 v360 M1358 170 v362" stroke="#1f84a6" stroke-width="3" opacity=".6"/>
        </g>
        <!-- shelf with books -->
        <g transform="translate(330 300)">
          <rect x="-14" y="0" width="300" height="12" rx="4" fill="#ff9d3c"/><rect x="-14" y="12" width="300" height="6" fill="#c46f1f" opacity=".7"/>
          ${shelfBooks}
          <g transform="translate(232 0)"><path d="M-16 0 h32 l-5 -30 h-22z" fill="#ff7a59"/><path d="M0 -30 C -16 -60 -20 -76 -8 -90 C -2 -70 2 -56 0 -30Z M0 -30 C 14 -56 22 -70 14 -86 C 6 -70 2 -56 0 -30Z" fill="#2ad49a"/></g>
        </g>
        <!-- poster -->
        <g transform="translate(560 150)"><rect width="150" height="104" rx="6" fill="#ff9d3c"/><rect x="10" y="10" width="130" height="84" rx="3" fill="#ffd23f"/><path d="M22 84 l34 -38 l24 24 l18 -16 l32 30z" fill="#ff7a59"/><circle cx="112" cy="34" r="11" fill="#fff2b0"/></g>
        <!-- rug -->
        <ellipse cx="760" cy="790" rx="380" ry="62" fill="#3d1fa8"/><ellipse cx="760" cy="790" rx="330" ry="48" fill="none" stroke="#e94bd6" stroke-width="6" opacity=".55" stroke-dasharray="18 12"/>
        <!-- plant -->
        <g transform="translate(150 662)">
          <ellipse cx="4" cy="4" rx="54" ry="10" fill="#120a3e" opacity=".5"/>
          <path d="M-38 0 h76 l-10 -74 h-56z" fill="#ff7a59"/><path d="M-30 -74 h60 v10 h-60z" fill="#ff9469"/>
          <path d="M0 -74 C -60 -150 -78 -214 -24 -258 C -12 -196 -2 -140 0 -74Z" fill="#22c49a"/><path d="M0 -74 C 54 -146 86 -196 52 -250 C 22 -196 10 -140 0 -74Z" fill="#1aa985"/>
          <path d="M0 -74 C -30 -120 -96 -150 -110 -120 C -76 -110 -40 -100 0 -74Z" fill="#2ad8a8"/><path d="M0 -74 C 30 -110 92 -128 106 -96 C 70 -94 36 -90 0 -74Z" fill="#169b78"/>
          <path d="M0 -74 C -8 -140 18 -190 8 -224" stroke="#127e62" stroke-width="5" fill="none"/>
        </g>
        <!-- bed -->
        <g class="kz-bed">
          <ellipse cx="590" cy="702" rx="360" ry="16" fill="#100838" opacity=".55" filter="url(#kzBlur6)"/>
          <rect x="246" y="390" width="52" height="312" rx="20" fill="url(#kzWood)"/><rect x="254" y="398" width="10" height="290" rx="5" fill="#8a6cff" opacity=".4"/>
          <rect x="270" y="556" width="650" height="134" rx="22" fill="url(#kzWood)"/>
          <rect x="270" y="516" width="650" height="70" rx="28" fill="url(#kzMattress)"/>
          <path d="M296 520 C 300 480 330 470 380 472 L 440 474 C 480 476 488 506 470 536 C 420 546 340 546 296 540Z" fill="#cdbfff"/>
          <path d="M318 500 C 360 492 410 494 452 504" stroke="#a594f0" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M462 530 C 520 498 610 508 660 528 L 720 534 C 726 600 708 652 676 692 L 452 692 C 438 640 440 570 462 530Z" fill="url(#kzDuvet)"/>
          <path d="M500 560 C 540 580 560 620 556 690 M600 540 C 640 570 660 620 650 690" stroke="#a52a8e" stroke-width="5" fill="none" opacity=".55" stroke-linecap="round"/>
          <path d="M462 530 C 520 498 610 508 660 528 C 610 540 540 540 462 530Z" fill="#ff8be6" opacity=".7"/>
          <rect x="288" y="690" width="24" height="30" rx="6" fill="#2c1888"/><rect x="878" y="690" width="24" height="30" rx="6" fill="#2c1888"/>
        </g>
        <!-- nightstand, lamp, clock, glass -->
        <g transform="translate(1180 560)">
          <ellipse cx="66" cy="112" rx="80" ry="10" fill="#100838" opacity=".5" filter="url(#kzBlur6)"/>
          <rect width="132" height="112" rx="12" fill="url(#kzWood)"/><rect x="10" y="40" width="112" height="10" rx="5" fill="#3e24a8"/><circle cx="66" cy="76" r="5" fill="#ff9d3c"/>
          <rect x="16" y="-46" width="76" height="44" rx="10" fill="#140a3e"/>
          <text class="kz-clock" x="54" y="-15" text-anchor="middle" font-family="'Geist Mono', ui-monospace, monospace" font-size="22" font-weight="500" fill="#ff5d73">02:47</text>
          <path d="M104 -2 l4 -34 h18 l4 34z" fill="#bfe9ff" opacity=".55"/><path d="M106 -16 h22" stroke="#7fd0ff" stroke-width="2" opacity=".7"/>
        </g>
      </g>

      <!-- notifications around the head (beat 1) -->
      <g class="kz-notes">
        ${[[900, 205, '#ff4f6d', -8], [1060, 200, '#ffd23f', 6], [700, 330, '#e94bd6', 4], [1110, 310, '#36e0c8', -5], [930, 100, '#ff8a3d', 10], [1050, 92, '#7c5cff', -10], [660, 245, '#36e0c8', 8], [1170, 165, '#ff4f6d', -4]]
          .map(([x, y, col, r], i) => `<g class="kz-note" transform="translate(${x} ${y}) rotate(${r})"><g class="kz-note-in"><rect x="-30" y="-30" width="60" height="60" rx="16" fill="${col}"/><rect x="-14" y="-6" width="28" height="5" rx="2.5" fill="#fff" opacity=".9"/><rect x="-14" y="4" width="18" height="5" rx="2.5" fill="#fff" opacity=".7"/><circle cx="26" cy="-26" r="13" fill="#ff2e4d"/><text x="26" y="-21" text-anchor="middle" font-family="Geist, sans-serif" font-size="14" font-weight="700" fill="#fff">${[3, 9, 12, 1, 27, 4, 99, 6][i]}</text></g></g>`).join('')}
      </g>

      <!-- ===== CHARACTER ===== -->
      <g class="kz-kid" transform="translate(872 540)">
        <ellipse class="kz-shadow" cx="60" cy="172" rx="110" ry="13" fill="#170b4f" opacity=".55"/>
        <path class="kz-arm-b-up" stroke="${C.shirtShade}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-arm-b-lo" stroke="${C.skinShade}" stroke-width="19" stroke-linecap="round" fill="none"/>
        <g class="kz-hand-b"><path d="M-4 -9 C 6 -11 16 -8 18 -1 C 19 6 13 10 4 10 C -4 10 -8 4 -7 -2Z" fill="${C.skinShade}"/></g>
        <path class="kz-leg-b" stroke="${C.pantsShade}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-shoe-b" d="M-14 -6 h42 a17 17 0 0 1 17 17 v3 h-59z" fill="#e8b92c"/>
        <path class="kz-leg-f" stroke="${C.pants}" stroke-width="45" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-leg-f-hi" stroke="#3a35a0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".6"/>
        <path class="kz-shoe-f" d="M-14 -6 h44 a18 18 0 0 1 18 18 v3 h-62z" fill="${C.shoe}"/>
        <clipPath id="kzTorsoClip"><path class="kz-torso-clip"/></clipPath>
        <path class="kz-torso" fill="url(#kzShirtG)"/>
        <path class="kz-torso-back" clip-path="url(#kzTorsoClip)" stroke="${C.shirtShade}" stroke-width="34" fill="none"/>
        <path class="kz-torso-lit" clip-path="url(#kzTorsoClip)" stroke="${C.glow}" stroke-width="22" fill="none" opacity="0"/>
        <path class="kz-pocket" fill="none" stroke="${C.shirtShade}" stroke-width="4" stroke-linecap="round"/>
        <g class="kz-head">
          <path d="M-14 24 h28 v44 h-28z" fill="${C.skinShade}"/>
          <path d="M-46 22 C -66 58 -28 86 16 78 C 2 64 -16 52 -24 30Z" fill="${C.shirtShade}"/>
          <path class="kz-face" d="M-50 -6 C -54 -50 -14 -66 18 -62 C 44 -58 56 -36 52 -16 C 51 -10 53 -6 56 0 L 61 9 C 60 13 56 14 52 14 C 52 18 51 21 49 24 C 50 28 49 31 47 33 C 46 39 42 43 35 45 C 26 47 14 47 4 42 C -20 40 -46 26 -50 -6Z" fill="url(#kzSkinG)"/>
          <path class="kz-face-lit" d="M-50 -6 C -54 -50 -14 -66 18 -62 C 44 -58 56 -36 52 -16 C 51 -10 53 -6 56 0 L 61 9 C 60 13 56 14 52 14 C 52 18 51 21 49 24 C 50 28 49 31 47 33 C 46 39 42 43 35 45 C 26 47 14 47 4 42 C -20 40 -46 26 -50 -6Z" fill="url(#kzFaceLit)"/>
          <ellipse cx="-6" cy="6" rx="10" ry="13" fill="${C.skinShade}"/><path d="M-9 0 q6 2 4 10" stroke="#d2725f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M53 9 q-2 4 -6 3" stroke="#d2725f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="28" cy="22" r="9" fill="${C.cheek}" opacity=".45"/>
          <path d="M-52 4 C -62 -52 -10 -80 30 -68 C 52 -62 62 -44 56 -26 C 46 -36 32 -38 20 -34 C 24 -24 16 -18 8 -20 C 4 -12 -6 -4 -10 -8 C -16 -14 -20 -2 -24 12 C -36 14 -48 14 -52 4Z" fill="${C.hair}"/>
          <path d="M-30 -52 C -10 -66 18 -66 36 -58 M-36 -36 C -20 -50 0 -54 14 -50" stroke="${C.hairHi}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <g class="kz-eyes-tired"><path d="M24 -6 q8 -4 15 0 q-7 5 -15 0Z" fill="#fff"/><circle cx="33" cy="-3" r="3.4" fill="#26145f"/><circle class="kz-glint" cx="34.5" cy="-3.5" r="1.3" fill="#9ff6ff"/><path d="M22 -8 q9 -4 19 1" stroke="#26145f" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M22 -17 q9 -2 18 0" stroke="#26145f" stroke-width="3.2" stroke-linecap="round" fill="none"/></g>
          <g class="kz-eyes-wide" opacity="0"><ellipse cx="32" cy="-5" rx="7.5" ry="9" fill="#fff"/><ellipse class="kz-pupil" cx="35" cy="-5" rx="4.6" ry="5.8" fill="#26145f"/><circle cx="36.5" cy="-7.5" r="1.8" fill="#fff"/><path d="M22 -24 q10 -6 20 -2" stroke="#26145f" stroke-width="3.6" stroke-linecap="round" fill="none"/></g>
          <g class="kz-eyes-happy" opacity="0"><path d="M24 -2 q8 -10 17 0" stroke="#26145f" stroke-width="4.5" stroke-linecap="round" fill="none"/><path d="M22 -20 q10 -6 20 -1" stroke="#26145f" stroke-width="3.4" stroke-linecap="round" fill="none"/></g>
          <path class="kz-mouth-flat" d="M34 29 q5 1.5 10 -.5" stroke="#6b2a45" stroke-width="3" stroke-linecap="round" fill="none"/>
          <ellipse class="kz-mouth-o" cx="41" cy="30" rx="4" ry="5" fill="#6b2a45" opacity="0"/>
          <path class="kz-mouth-smile" d="M31 25 q8 10 16 0 q-8 3 -16 0Z" fill="#6b2a45" opacity="0"/>
        </g>
        <path class="kz-arm-f-up" stroke="url(#kzShirtG)" stroke-width="29" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-cuff" stroke="${C.shirtShade}" stroke-width="22" stroke-linecap="butt" fill="none"/>
        <path class="kz-arm-f-lo" stroke="${C.skin}" stroke-width="20" stroke-linecap="round" fill="none"/>
        <path class="kz-arm-f-lit" stroke="${C.glow}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0"/>
        <g class="kz-hand-f"><path d="M-4 -9 C 6 -11 16 -8 18 -1 C 19 6 13 10 4 10 C -4 10 -8 4 -7 -2Z" fill="${C.skin}"/><path d="M6 -8 C 14 -6 17 0 15 6" stroke="#e8907a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M8 1 C 13 2 16 5 15 8 M8 5 C 12 6 14 9 13 10" stroke="#e8907a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/></g>
        <!-- the phone in his hand: palm under it, fingers round the back, thumb on the screen edge -->
        <g class="kz-phone-hand">
          <path d="M-5 -10 C 8 -15 22 -11 24 -2 C 25 7 16 13 4 12 C -5 11 -9 4 -8 -3Z" fill="${C.skin}"/>
          <g class="kz-phone" transform="translate(16 -22)">
            <g class="kz-thumb"><path d="M-16 24 C -25 16 -26 0 -23 -10 C -21 -17 -14 -17 -13 -10 L -11 20Z" fill="${C.skin}"/><path d="M-22 -9 q3 -4 6 -2" stroke="#e8907a" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>
            <rect x="-14" y="-30" width="26" height="60" rx="8" fill="#3a2f7a"/>
            <rect x="-12" y="-28" width="22" height="56" rx="7" fill="#251c58"/>
            <rect x="-7" y="-24" width="13" height="15" rx="4" fill="#130c38"/><circle cx="-3" cy="-20" r="2.6" fill="#4a3f8f"/><circle cx="2.5" cy="-14" r="2.6" fill="#4a3f8f"/>
            <path d="M-15 -26 V26" stroke="#c9fbff" stroke-width="3.2" stroke-linecap="round"/>
            <path class="kz-feed" d="M-16 -18 V18" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>
            <g fill="${C.skin}"><rect x="6" y="-4" width="12" height="8" rx="4"/><rect x="7" y="5" width="11" height="8" rx="4"/><rect x="6" y="14" width="10" height="7" rx="3.5"/></g>
            <path d="M12 -2 h4 M12 7 h4 M11 16 h3" stroke="#e8907a" stroke-width="1.4" stroke-linecap="round"/>
          </g>
        </g>
        <path class="kz-beam" fill="url(#kzBeamG)" style="mix-blend-mode: screen" filter="url(#kzBlur3)"/>
        <g class="kz-startle" opacity="0" stroke="#ffd23f" stroke-width="7" stroke-linecap="round">
          <path d="M84 -300 l22 -30"/><path d="M114 -270 l34 -14"/><path d="M52 -310 l2 -36"/>
        </g>
      </g>

      <!-- the dark: everything outside the phone's light falls off into the night -->
      <rect class="kz-dark" width="1600" height="900" fill="#05031c" opacity=".62" mask="url(#kzDarkMask)"/>

      <g class="kz-wallclock" transform="translate(800 178) scale(.9)">
        <circle r="66" fill="#000" opacity=".25" filter="url(#kzBlur6)" transform="translate(4 8)"/>
        <circle r="62" fill="#ff9d3c"/><circle r="54" fill="#f6f1ff"/><circle r="54" fill="none" stroke="#d9d0ff" stroke-width="2"/>
        ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, r1 = i % 3 ? 45 : 41; return `<path d="M${(Math.sin(a) * r1).toFixed(1)} ${(-Math.cos(a) * r1).toFixed(1)} L${(Math.sin(a) * 49).toFixed(1)} ${(-Math.cos(a) * 49).toFixed(1)}" stroke="#2a1580" stroke-width="${i % 3 ? 2.5 : 4.5}" stroke-linecap="round"/>`; }).join('')}
        <path class="kz-hh" d="M0 6 V-28" stroke="#2a1580" stroke-width="6" stroke-linecap="round"/>
        <path class="kz-mh" d="M0 8 V-42" stroke="#2a1580" stroke-width="4" stroke-linecap="round"/>
        <path class="kz-sh" d="M0 10 V-46" stroke="#ff4f6d" stroke-width="2" stroke-linecap="round"/>
        <circle r="5" fill="#ff4f6d"/>
        <circle r="60" fill="#05031c" class="kz-clockdim" opacity=".35"/>
      </g>

      <!-- flying phone (beat 3) -->
      <g class="kz-phone-fly" opacity="0">
        <circle r="70" fill="url(#kzBeamG)" opacity=".5"/>
        <rect x="-18" y="-32" width="36" height="62" rx="8" fill="${C.phone}"/>
        <rect x="-14" y="-27" width="28" height="52" rx="5" fill="${C.glow}"/>
        <g class="kz-lock" opacity="0"><rect x="-14" y="-27" width="28" height="52" rx="5" fill="#7c5cff"/><rect x="-8" y="-2" width="16" height="14" rx="3" fill="#fff"/><path d="M-5 -2 v-6 a5 5 0 0 1 10 0 v6" stroke="#fff" stroke-width="3" fill="none"/></g>
      </g>

      <!-- morning: warm light, shafts through the window, the light patch on the floor, dust -->
      <g class="kz-morning" opacity="0">
        <rect width="1600" height="900" fill="url(#kzWarm)" style="mix-blend-mode: soft-light"/>
        <g filter="url(#kzBlur18)" style="mix-blend-mode: screen" opacity=".9">
          <path d="M1062 196 L1200 196 L 900 900 L 560 900Z" fill="url(#kzShaft)" opacity=".55"/>
          <path d="M1212 196 L1348 196 L 1240 900 L 920 900Z" fill="url(#kzShaft)" opacity=".45"/>
          <path d="M1062 346 L1348 346 L 1200 900 L 700 900Z" fill="url(#kzShaft)" opacity=".35"/>
        </g>
        <g filter="url(#kzBlur6)" style="mix-blend-mode: screen">
          <path d="M1010 682 L1340 682 L1220 900 L 660 900Z" fill="url(#kzPatch)" opacity=".75"/>
          <path d="M1170 682 h20 L 1010 900 h-28Z M 1000 760 L 1290 760 l-10 16 L 990 776Z" fill="#2a1580" opacity=".55"/>
        </g>
        <g class="kz-motes">${motes}</g>
      </g>
      </g>
    </svg>
    <div class="kz-cap kz-cap-1"><p class="kz-meta">Unscroll · 2:47 a.m.</p><p class="kz-big">Four hours of scrolling, and nothing to show for it.</p></div>
    <div class="kz-cap kz-cap-2"><p class="kz-meta">The lock</p><p class="kz-big">Unscroll blocks the apps you choose with Apple's Screen Time APIs. They stay locked even when Unscroll is closed.</p></div>
    <div class="kz-cap kz-cap-3"><p class="kz-meta">The math</p><p class="kz-big">Four hours a day is 1,460 hours a year. Unscroll shows you that number, then gives it back.</p></div>
  </div>`;

  const q = (s) => host.querySelector(s), qa = (s) => host.querySelectorAll(s);
  const svgEl = q('.kz-svg');
  let inView = false; new IntersectionObserver((es) => { inView = es[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(host);
  const narrow = host.clientWidth / window.innerHeight < 0.8;
  if (narrow) svgEl.setAttribute('viewBox', '520 0 860 900');
  // phones: the big blurs are the expensive part, drop them
  const lite = narrow || matchMedia('(max-width: 800px)').matches;
  if (lite) host.querySelectorAll('.kz-morning [filter], .kz-beam').forEach((n) => n.removeAttribute('filter'));
  gsap.set(qa('.kz-note-in'), { scale: 0, transformOrigin: '50% 50%' });

  /* ---------- pose system ---------- */
  const TORSO = {
    A: [[-30, 10], [-44, -40], [-38, -100], [-6, -140], [10, -162], [40, -172], [62, -160], [74, -150], [74, -132], [66, -118], [56, -80], [52, -30], [50, 10]],
    B: [[-30, 10], [-40, -50], [-34, -120], [-20, -158], [-8, -178], [30, -180], [46, -164], [56, -154], [58, -136], [56, -120], [56, -80], [54, -30], [50, 10]],
  };
  const LEGS = {
    sit: { f: [[0, 0], [104, 4], [112, 134]], b: [[-6, -4], [96, -2], [100, 128]] },
    push: { f: [[0, 0], [98, 10], [100, 136]], b: [[-6, -4], [92, 6], [92, 132]] },
    stand: { f: [[16, 0], [22, 76], [18, 152]], b: [[-2, 0], [-8, 76], [-10, 150]] },
  };
  // the phone is held low, at the chest, both hands; the head bows down to it
  const P = {
    scroll:  { t: 'A', head: [74, -204, 24], f: [[46, -148], [62, -86], [118, -74]], b: [[30, -150], [44, -86], [102, -76]], legs: 'sit', phone: 26, eyes: 'tired', mouth: 'flat' },
    startle: { t: 'B', head: [28, -232, -6], f: [[30, -160], [56, -96], [110, -110]], b: [[14, -162], [26, -96], [86, -108]], legs: 'sit', phone: 36, eyes: 'wide', mouth: 'o' },
    windup:  { t: 'B', head: [24, -232, -10], f: [[24, -162], [-34, -196], [-72, -248]], b: [[14, -162], [54, -110], [98, -116]], legs: 'sit', phone: 80, eyes: 'wide', mouth: 'flat' },
    release: { t: 'B', head: [32, -230, 2], f: [[34, -162], [92, -196], [150, -206]], b: [[14, -162], [20, -92], [40, -40]], legs: 'sit', phone: 40, eyes: 'wide', mouth: 'flat' },
    follow:  { t: 'A', head: [74, -206, 6], f: [[46, -148], [98, -100], [150, -70]], b: [[30, -150], [42, -82], [60, -28]], legs: 'sit', phone: 60, eyes: 'wide', mouth: 'flat' },
    look:    { t: 'B', head: [28, -232, -4], f: [[30, -160], [48, -88], [72, -22]], b: [[14, -162], [18, -90], [32, -24]], legs: 'sit', phone: 60, eyes: 'wide', mouth: 'flat' },
    push:    { t: 'A', head: [72, -208, 2], f: [[46, -148], [78, -74], [100, -8]], b: [[30, -150], [58, -80], [86, -10]], legs: 'push', phone: 60, eyes: 'happy', mouth: 'smile' },
    stand:   { t: 'B', head: [28, -232, -4], f: [[30, -160], [38, -82], [46, -8]], b: [[14, -162], [10, -84], [6, -10]], legs: 'stand', phone: 60, eyes: 'happy', mouth: 'smile' },
    raise:   { t: 'B', head: [26, -234, -20], f: [[30, -162], [96, -222], [136, -286]], b: [[14, -162], [-30, -228], [-56, -296]], legs: 'stand', phone: 60, eyes: 'happy', mouth: 'smile' },
  };
  const KEYS = [[0, 'scroll'], [.232, 'scroll'], [.272, 'startle', 'out'], [.335, 'startle'], [.375, 'windup', 'io'], [.399, 'release', 'out'], [.43, 'follow', 'out'],
    [.5, 'look', 'io'], [.565, 'look'], [.6, 'push', 'io'], [.64, 'stand', 'io'], [.685, 'raise', 'back'], [1, 'raise']];
  const EASE = { io: (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out: (t) => 1 - Math.pow(1 - t, 3),
    back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, lin: (t) => t };
  const L = (a, b, t) => a + (b - a) * t;
  const LP = (a, b, t) => [L(a[0], b[0], t), L(a[1], b[1], t)];
  const span = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const KEYS_EL = ['phone', 'torso', 'torso-clip', 'torso-back', 'torso-lit', 'pocket', 'leg-f', 'leg-f-hi', 'leg-b', 'shoe-f', 'shoe-b', 'arm-f-up', 'cuff', 'arm-f-lo', 'arm-f-lit', 'arm-b-up', 'arm-b-lo', 'hand-f', 'hand-b', 'thumb', 'phone-hand', 'head', 'face-lit', 'eyes-tired', 'eyes-wide', 'eyes-happy', 'mouth-flat', 'mouth-o', 'mouth-smile', 'feed', 'pupil', 'beam'];
  const elsOf = (root) => { const o = {}; KEYS_EL.forEach((k) => { o[k] = root.querySelector('.kz-' + k); }); return o; };
  const el = elsOf(host);
  // the same boy, outside on the hill
  const twin = q('.kz-kid').cloneNode(true);
  twin.setAttribute('class', 'kz-kid-out'); twin.setAttribute('transform', 'translate(560 646) scale(.5)');
  twin.querySelectorAll('[id]').forEach((n) => { const old = n.id; n.id = old + 'Out'; twin.querySelectorAll(`[clip-path="url(#${old})"]`).forEach((m) => m.setAttribute('clip-path', `url(#${old}Out)`)); });
  twin.querySelector('.kz-startle')?.remove(); twin.querySelector('.kz-beam')?.remove();
  twin.querySelector('.kz-shadow').setAttribute('fill', '#0e7d5c');
  q('.kz-o-near').appendChild(twin);
  const elOut = elsOf(twin);
  elOut['phone-hand'].style.display = 'none'; elOut.thumb.style.display = 'none';
  const torsoD = (pts) => `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]}Z`;
  const backD = (pts) => `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]}`;
  const frontD = (pts) => `M${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]}`;
  const kidEl = q('.kz-kid'), hole = q('.kz-hole'), beamG = q('#kzBeamG');
  const rot = (v, a) => { const r = a * Math.PI / 180; return [v[0] * Math.cos(r) - v[1] * Math.sin(r), v[0] * Math.sin(r) + v[1] * Math.cos(r)]; };

  function drawKid(p, time, el, main) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, n0] = KEYS[i], [p1, n1, e] = KEYS[i + 1];
    const t = EASE[e || 'io'](Math.min(1, Math.max(0, (p - p0) / (p1 - p0 || 1))));
    const A = P[n0], B = P[n1];
    const torso = TORSO[A.t].map((v, k) => LP(v, TORSO[B.t][k], t));
    const br = Math.sin(time * 1.6) * 2.2;
    for (const v of torso) if (v[1] < -100) v[1] += br * .6;
    const tD = torsoD(torso);
    el.torso.setAttribute('d', tD); el['torso-clip'].setAttribute('d', tD); el['torso-back'].setAttribute('d', backD(torso)); el['torso-lit'].setAttribute('d', frontD(torso));
    const pk = LP(torso[10], torso[11], .55);
    el.pocket.setAttribute('d', `M${pk[0] - 50} ${pk[1] - 6} C ${pk[0] - 30} ${pk[1] - 14} ${pk[0] - 12} ${pk[1] - 12} ${pk[0] - 2} ${pk[1] - 4}`);
    const legsA = LEGS[A.legs], legsB = LEGS[B.legs];
    for (const side of ['f', 'b']) {
      const pts = legsA[side].map((v, k) => LP(v, legsB[side][k], t));
      el['leg-' + side].setAttribute('d', `M${pts[0]} L${pts[1]} L${pts[2]}`);
      if (side === 'f') el['leg-f-hi'].setAttribute('d', `M${pts[0][0] + 6} ${pts[0][1] - 16} L${pts[1][0]} ${pts[1][1] - 16}`);
      el['shoe-' + side].setAttribute('transform', `translate(${pts[2][0]} ${pts[2][1] + 14})`);
      const S = LP(A[side][0], B[side][0], t), E = LP(A[side][1], B[side][1], t), W = LP(A[side][2], B[side][2], t);
      S[1] += br * .6; E[1] += br * .4;
      if (side === 'f' && n0 === 'scroll' && n1 === 'scroll') W[1] += Math.sin(time * 5) * 1.2;
      el['arm-' + side + '-up'].setAttribute('d', `M${S} L${E}`);
      el['arm-' + side + '-lo'].setAttribute('d', `M${E} L${W}`);
      const fa = Math.atan2(W[1] - E[1], W[0] - E[0]) * 180 / Math.PI;
      el['hand-' + side].setAttribute('transform', `translate(${W[0]} ${W[1]}) rotate(${fa})`);
      if (side === 'f') {
        const cf = LP(E, W, .08), cf2 = LP(E, W, .2);
        el.cuff.setAttribute('d', `M${cf} L${cf2}`);
        el['arm-f-lit'].setAttribute('d', `M${L(E[0], W[0], .25)} ${L(E[1], W[1], .25) - 8} L${W[0]} ${W[1] - 8}`);
        const phi = L(A.phone, B.phone, t), grip = p < .402 && main !== undefined;
        el['phone-hand'].setAttribute('transform', `translate(${W[0]} ${W[1]}) rotate(${fa})`);
        el.phone.setAttribute('transform', `translate(16 -22) rotate(${phi})`);
        const scrolling = n0 === 'scroll' && n1 === 'scroll';
        // the thumb flicks up the screen and back, pivoting at its base
        const sw = scrolling ? Math.max(0, Math.sin(time * 4.2)) ** 1.6 : 0;
        el.thumb.setAttribute('transform', `rotate(${(-9 * sw).toFixed(2)} -15 22)`);
        el['hand-f'].style.opacity = p < .4 ? 0 : 1;
        // the screen edge, in body coordinates
        const toBody = (v) => { const a1 = rot(v, phi), a2 = [a1[0] + 16, a1[1] - 22], a3 = rot(a2, fa); return [W[0] + a3[0], W[1] + a3[1]]; };
        el._edge = [toBody([-15, -24]), toBody([-15, 24])];
        const px = W[0], py = W[1];
        el._phone = [px, py];
      }
    }
    const hd = [L(A.head[0], B.head[0], t), L(A.head[1], B.head[1], t) + br * .8, L(A.head[2], B.head[2], t)];
    el.head.setAttribute('transform', `translate(${hd[0]} ${hd[1]}) rotate(${hd[2]})`);
    const pick = t < .5 ? A : B;
    el._pr = el._pr || 0;
    el['eyes-tired'].style.opacity = pick.eyes === 'tired' ? 1 : 0;
    el['eyes-wide'].style.opacity = pick.eyes === 'wide' ? 1 : 0;
    el['eyes-happy'].style.opacity = pick.eyes === 'happy' ? 1 : 0;
    el['mouth-flat'].style.opacity = pick.mouth === 'flat' ? 1 : 0;
    el['mouth-o'].style.opacity = pick.mouth === 'o' ? 1 : 0;
    el['mouth-smile'].style.opacity = pick.mouth === 'smile' ? 1 : 0;
    const blink = (time % 4.2) < .12 ? .15 : 1;
    el['eyes-tired'].setAttribute('transform', `translate(32 -3) scale(1 ${blink}) translate(-32 3)`);
    el.pupil.setAttribute('cx', p > .44 ? 36 : 34);
    const light = main ? (1 - span(p, .345, .39)) * (.88 + .12 * Math.sin(time * 7) * Math.sin(time * 2.3)) : 0;
    el['face-lit'].style.opacity = light * .82; el['torso-lit'].style.opacity = .4 * light; el['arm-f-lit'].style.opacity = .55 * light;
    if (el.feed) el.feed.style.opacity = .55 + .45 * Math.sin(time * 9) * Math.sin(time * 3.1);
    if (main) {
      // the phone is a lamp: a soft cone from the screen up onto the face, and the room's dark opens around it
      const [ea, eb] = el._edge, mx = (ea[0] + eb[0]) / 2, my = (ea[1] + eb[1]) / 2, face = rot([28, 6], hd[2]); const fx = hd[0] + face[0], fy = hd[1] + face[1];
      const dx = fx - mx, dy = fy - my, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      let nx = eb[0] - ea[0], ny = eb[1] - ea[1]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const fxe = mx + dx * 1.35, fye = my + dy * 1.35, w1 = 70;
      el.beam.setAttribute('d', `M${ea[0]} ${ea[1]} L${fxe - nx * w1} ${fye - ny * w1} Q${fxe + ux * 34} ${fye + uy * 34} ${fxe + nx * w1} ${fye + ny * w1} L${eb[0]} ${eb[1]}Z`);
      beamG.setAttribute('cx', mx); beamG.setAttribute('cy', my); beamG.setAttribute('r', len * 1.5);
      const px = mx, py = my;
      el.beam.style.opacity = light;
      const kx = kidX(p);
      hole.setAttribute('cx', kx + (px + fx) / 2); hole.setAttribute('cy', 540 + (py + fy) / 2);
      hole.setAttribute('r', 300 + 30 * Math.sin(time * 1.3));
    }
  }
  const kidX = (p) => 872 + 34 * EASE.io(span(p, .6, .66));

  const motesEl = [...qa('.kz-mote')].map((m) => ({ m, x: +m.getAttribute('cx'), y: +m.getAttribute('cy'), s: Math.random() * 6.28 }));
  // three hours pass while he scrolls: 11:47 p.m. -> 2:47 a.m., the moon climbs across the window
  const hh = q('.kz-hh'), mh = q('.kz-mh'), shd = q('.kz-sh'), moon = q('.kz-moon'), clockTxt = q('.kz-clock'), capMeta = q('.kz-cap-1 .kz-meta');
  const pad = (n) => String(n).padStart(2, '0');
  let lastMin = -1;
  function clockAt(p, time) {
    const k = span(p, .0, .24), m = (23 * 60 + 47 + 180 * k) % 1440;
    hh.setAttribute('transform', `rotate(${((m / 60) % 12) * 30})`); mh.setAttribute('transform', `rotate(${(m % 60) * 6})`);
    shd.setAttribute('transform', `rotate(${(k * 180 * 360 + time * 6) % 360})`);
    moon.setAttribute('transform', `translate(${L(-190, 0, k)} ${L(150, 0, Math.sqrt(k))})`);
    const mi = Math.floor(m);
    if (mi !== lastMin) { lastMin = mi; const H = Math.floor(mi / 60), M = mi % 60;
      clockTxt.textContent = `${pad(H)}:${pad(M)}`;
      capMeta.textContent = `Unscroll · ${((H + 11) % 12) + 1}:${pad(M)} ${H >= 12 ? 'p.m.' : 'a.m.'}`; }
  }
  // the throw: the phone leaves his hand where the hand is, arcs over and lands on the rug, skids, locks
  const fly = q('.kz-phone-fly');
  const REL = (() => { const E = P.release.f[1], W = P.release.f[2], fa = Math.atan2(W[1] - E[1], W[0] - E[0]) * 180 / Math.PI; const c = rot([16, -22], fa); return [872 + W[0] + c[0], 540 + W[1] + c[1], fa + P.release.phone]; })();
  const LAND = [1150, 772];
  function throwAt(p) {
    if (p < .4) { fly.style.opacity = 0; return; }
    const t = Math.min(1, (p - .4) / .055), skid = span(p, .455, .49), sk = 1 - Math.pow(1 - skid, 2);
    let x = L(REL[0], LAND[0], t) + 46 * sk, y = L(REL[1], LAND[1], t) - 190 * 4 * t * (1 - t) * (1 - t * .25);
    const r = REL[2] + 760 * t + 70 * sk;
    fly.style.opacity = 1 - span(p, .6, .63);
    fly.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t < 1 ? r : 810 + REL[2] + 70 * sk).toFixed(1)}) scale(${(1 + .25 * Math.sin(Math.PI * t)).toFixed(3)})`);
  }
  gsap.ticker.add((time) => {
    if (!inView) return;
    const p = tl.progress();
    throwAt(p);
    clockAt(p, time);
    kidEl.setAttribute('transform', `translate(${kidX(p)} 540)`);
    drawKid(p, time, el, true); drawKid(.97, time, elOut, false);
    if (p > .5 && p < .82) motesEl.forEach((o) => { o.m.setAttribute('cx', (o.x + Math.sin(time * .3 + o.s) * 18).toFixed(1)); o.m.setAttribute('cy', (o.y + Math.cos(time * .23 + o.s) * 14 - (time * 6 % 40)).toFixed(1)); });
  });

  if (!reduce) {
    gsap.to(qa('.kz-note'), { y: '-=10', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: .2, from: 'random' } });
    gsap.to(q('.kz-rays'), { rotation: 360, svgOrigin: '1205 400', duration: 120, ease: 'none', repeat: -1 });
    gsap.to(q('.kz-kite'), { rotation: 22, y: '+=14', duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-wave'), { rotation: -14, transformOrigin: '0% 100%', duration: .5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-cloud-a'), { x: '-=70', duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-cloud-b'), { x: '+=50', duration: 13, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // parallax: through the window the landscape is small; layers grow at different rates as we push through
  const WC = '1280 264';   // push through the upper-right pane, away from the boy, past the glazing bars
  const layers = [['.kz-o-sky', .82], ['.kz-o-far', .6], ['.kz-o-mid', .48], ['.kz-o-near', .4]];
  layers.forEach(([s, k]) => gsap.set(q(s), { scale: k, svgOrigin: WC }));
  const pushBlur = q('.kz-push-blur');

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  // Beat 1 (0-0.24): notifications pile up in the dark
  tl.to(qa('.kz-note-in'), { scale: 1, duration: .03, stagger: .022, ease: 'back.out(2)' }, 0.02)
    .fromTo('.kz-cap-1', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .05 }, 0.02)
    .to('.kz-cap-1', { opacity: 0, y: -30, duration: .04 }, 0.22)
  // Beat 2 (0.24-0.34): snap out of it
    .to(q('.kz-startle'), { opacity: 1, duration: .01 }, 0.255).to(q('.kz-startle'), { opacity: 0, duration: .02 }, 0.31)
    .to(qa('.kz-note'), { scale: .2, opacity: 0, duration: .04, stagger: .004, transformOrigin: '50% 50%' }, 0.27)
  // Beat 3 (0.34-0.52): wind up and throw; with the phone gone the room is lit only by the night
    .set(el['phone-hand'], { opacity: 0 }, 0.4)
    .to(q('.kz-lock'), { opacity: 1, duration: .01 }, 0.47)
    .to(q('.kz-hole'), { attr: { r: 0 }, duration: .02 }, 0.4)
    .fromTo('.kz-cap-2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .04 }, 0.44)
    .to('.kz-cap-2', { opacity: 0, y: -30, duration: .04 }, 0.6)
  // Beat 4 (0.52-0.68): night leaves the glass, the sun comes up, light pours in
    .to(q('.kz-night-sky'), { opacity: 0, duration: .07 }, 0.52)
    .to([q('.kz-sun'), q('.kz-sun-glow')], { attr: { cy: 360 }, duration: .13, ease: 'power1.out' }, 0.52)
    .to(q('.kz-dark'), { opacity: 0, duration: .09 }, 0.54)
    .to(q('.kz-morning'), { opacity: 1, duration: .09 }, 0.55)
    .to(q('.kz-clock'), { opacity: 0, duration: .02 }, 0.54)
    .to(q('.kz-clockdim'), { opacity: 0, duration: .06 }, 0.54)
  // Beat 5 (0.68-1): push through the window; the room blurs past, the landscape opens in depth
    .to(q('.kz-indoor'), { scale: 8, svgOrigin: WC, duration: .13, ease: 'power3.in' }, 0.68)
    .to(pushBlur, { attr: { stdDeviation: 16 }, duration: .1, ease: 'power2.in' }, 0.69)
    .to(q('.kz-indoor'), { opacity: 0, duration: .025 }, 0.79)
    .to(qa('.kz-bars'), { opacity: 0, duration: .03 }, 0.7)
    .to(kidEl, { opacity: 0, duration: .035 }, 0.705)
    .to(q('.kz-o-sky'), { scale: 1, svgOrigin: WC, duration: .15, ease: 'power2.inOut' }, 0.69)
    .to(q('.kz-o-far'), { scale: 1, svgOrigin: WC, duration: .15, ease: 'power2.inOut' }, 0.69)
    .to(q('.kz-o-mid'), { scale: 1, svgOrigin: WC, duration: .15, ease: 'power2.inOut' }, 0.69)
    .to(q('.kz-o-near'), { scale: 1, svgOrigin: WC, duration: .15, ease: 'power2.inOut' }, 0.69)
    .fromTo(q('.kz-birds'), { x: -160 }, { x: 240, duration: .26 }, 0.74)
    .fromTo('.kz-cap-3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .05 }, 0.83)
    .to(svgEl, { attr: { viewBox: narrow ? '140 0 900 900' : '0 0 1600 900' }, duration: .1 }, 0.74)
    .to({}, { duration: .02 }, 0.98);
  tl.eventCallback('onUpdate', () => { const p = tl.progress(); q('.kz-indoor').setAttribute('filter', !lite && p > .69 && p < .8 ? 'url(#kzPush)' : ''); });

  if (reduce) { tl.progress(0.9); return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'kz-active' } });
  window.kzSeek = (p) => tl.progress(p);
})();
