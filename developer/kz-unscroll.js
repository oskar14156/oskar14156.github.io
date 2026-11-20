/* Unscroll scene: flat-vector, scroll-driven short in five beats.
 * 2:47 a.m. in bed with the phone -> snaps out of it -> throws the phone -> the window
 * floods with morning light -> outside, real life. Character is rigged in SVG groups so
 * torso, head and arms rotate around their joints. */
(function () {
  const host = document.getElementById('kz-unscroll');
  if (!host || !window.gsap || !window.ScrollTrigger) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    night: '#2a1580', wall: '#3a1ea6', wallDark: '#2f1890', floor: '#24116e', floorLit: '#4d2fd0',
    bedBase: '#4b2dc4', bedTop: '#6c4cf0', blanket: '#e44bd0', blanketDark: '#b9339f', pillow: '#c4b5ff',
    skin: '#ffab8e', skinShade: '#f08a76', cheek: '#ff6b8f', hair: '#26145f', shirt: '#2ad4c0', shirtShade: '#1fae9f',
    pants: '#1f1a66', pantsShade: '#17124f', shoe: '#ffd23f', phone: '#1a0d4a', glow: '#8ff3ff',
    sky: '#ffd23f', sky2: '#ffb53a', sun: '#fff6c9', hillFar: '#ff8a5b', hill: '#36e0b4', hillDark: '#1fbf95', tree: '#13a37f',
  };

  host.innerHTML = `
  <div class="kz-stage">
    <svg class="kz-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="kzFaceLight" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#c9fbff" stop-opacity=".7"/><stop offset=".5" stop-color="#9ff5ff" stop-opacity=".18"/><stop offset="1" stop-color="#8ff3ff" stop-opacity="0"/></linearGradient>
        <radialGradient id="kzFlood" cx=".75" cy=".38" r=".9"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#fff0b8"/><stop offset="1" stop-color="#ffd86b"/></radialGradient>
        <radialGradient id="kzPhoneGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></radialGradient>
        <radialGradient id="kzSunGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff8d8" stop-opacity="1"/><stop offset=".45" stop-color="#ffe680" stop-opacity=".7"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient>
        <linearGradient id="kzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.sky2}"/><stop offset=".7" stop-color="${C.sky}"/></linearGradient>
        <linearGradient id="kzWindowNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160b4a"/><stop offset="1" stop-color="#2b1a86"/></linearGradient>
        <linearGradient id="kzWindowDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a52"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#fff2b0"/></linearGradient>
        <linearGradient id="kzWall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2c178c"/><stop offset=".72" stop-color="#3d21ad"/><stop offset="1" stop-color="#3a1fa6"/></linearGradient>
        <radialGradient id="kzVignette" cx=".55" cy=".45" r=".75"><stop offset=".55" stop-color="#12083d" stop-opacity="0"/><stop offset="1" stop-color="#12083d" stop-opacity=".55"/></radialGradient>
        <clipPath id="kzWinClip"><rect x="1062" y="196" width="286" height="286" rx="6"/></clipPath>
      </defs>

      <!-- ===== OUTSIDE (beat 5) ===== -->
      <g class="kz-out">
        <rect width="1600" height="900" fill="url(#kzSky)"/>
        <g class="kz-rays" opacity=".35">${Array.from({ length: 14 }, (_, i) => `<path d="M800 470 L ${800 + Math.cos(i / 14 * 2 * Math.PI) * 1200} ${470 + Math.sin(i / 14 * 2 * Math.PI) * 1200} L ${800 + Math.cos((i + .45) / 14 * 2 * Math.PI) * 1200} ${470 + Math.sin((i + .45) / 14 * 2 * Math.PI) * 1200}Z" fill="#fff4c2"/>`).join('')}</g>
        <circle class="kz-sun-glow" cx="1205" cy="600" r="420" fill="url(#kzSunGlow)"/>
        <circle class="kz-sun" cx="1205" cy="600" r="110" fill="${C.sun}"/>
        <g class="kz-clouds" fill="#fff1bf">
          <g class="kz-cloud-a" transform="translate(240 300)"><rect x="-90" y="-10" width="200" height="44" rx="22"/><circle cx="-20" cy="-8" r="38"/><circle cx="40" cy="-20" r="46"/></g>
          <g class="kz-cloud-b" transform="translate(1260 360)"><rect x="-70" y="-6" width="160" height="36" rx="18"/><circle cx="-10" cy="-6" r="30"/><circle cx="36" cy="-16" r="36"/></g>
        </g>
        <g class="kz-kite" transform="translate(1240 180) rotate(12)">
          <path d="M0 -46 L 34 0 L 0 52 L -34 0Z" fill="#e94bd6"/><path d="M0 -46 L 34 0 L 0 0Z" fill="#ff7ad9"/><path d="M0 -46 L -34 0 L 0 0Z" fill="#36e0c8"/>
          <path d="M0 52 C 20 90 -20 120 10 160 C 30 190 -10 220 20 260" stroke="#7a3fd1" stroke-width="3" fill="none"/>
          <path d="M8 104 l12 -6 l-2 12z M2 168 l12 -6 l-2 12z" fill="#ffd23f"/>
        </g>
        <g class="kz-birds" fill="none" stroke="#7a3fd1" stroke-width="6" stroke-linecap="round">
          <path d="M300 220 q18 -16 36 0 q18 -16 36 0"/><path d="M420 170 q14 -12 28 0 q14 -12 28 0"/><path d="M1180 240 q16 -14 32 0 q16 -14 32 0"/>
        </g>
        <path d="M0 600 C 220 520 380 540 560 590 C 760 640 900 540 1100 560 C 1300 580 1450 520 1600 560 V900 H0Z" fill="${C.hillFar}"/>
        <g fill="#e8744f" opacity=".9">
          <rect x="1040" y="470" width="34" height="100"/><rect x="1080" y="440" width="26" height="130"/><rect x="1112" y="488" width="40" height="80"/><rect x="1158" y="456" width="22" height="110"/><path d="M1169 456 v-30" stroke="#e8744f" stroke-width="4"/><rect x="1186" y="500" width="44" height="66"/>
        </g>
        <path d="M0 690 C 300 610 520 640 800 600 C 1060 565 1300 640 1600 610 V900 H0Z" fill="${C.hill}"/>
        <path d="M0 770 C 340 720 620 760 900 740 C 1180 720 1400 770 1600 750 V900 H0Z" fill="${C.hillDark}"/>
        <g class="kz-trees">
          <g transform="translate(250 640)"><rect x="-7" y="0" width="14" height="60" rx="7" fill="#7b3a2a"/><circle cx="0" cy="-20" r="48" fill="${C.tree}"/><circle cx="-18" cy="-34" r="20" fill="#1cc193"/></g>
          <g transform="translate(1330 625)"><rect x="-7" y="0" width="14" height="60" rx="7" fill="#7b3a2a"/><circle cx="0" cy="-26" r="58" fill="${C.tree}"/><circle cx="-22" cy="-44" r="24" fill="#1cc193"/></g>
          <g transform="translate(1460 650)"><rect x="-6" y="0" width="12" height="50" rx="6" fill="#7b3a2a"/><circle cx="0" cy="-16" r="38" fill="${C.tree}"/></g>
        </g>
        <g class="kz-picnic" transform="translate(1110 700)">
          <ellipse cx="0" cy="34" rx="150" ry="22" fill="#ff5d73"/><path d="M-120 26 h240" stroke="#fff" stroke-width="6" opacity=".6"/>
          <g transform="translate(-60 0)"><path d="M-22 30 C -26 -10 -20 -50 0 -64 L 20 -64 C 34 -40 34 0 26 30Z" fill="#ffd23f"/><circle cx="8" cy="-92" r="30" fill="#ffab8e"/><path d="M-22 -96 C -24 -130 30 -134 40 -104 C 20 -112 0 -108 -10 -92Z" fill="#e94bd6"/><path d="M-22 -96 C -34 -60 -30 -40 -16 -30 C -24 -60 -12 -80 -10 -92Z" fill="#e94bd6"/><circle cx="24" cy="-84" r="7" fill="#ff6b8f" opacity=".7"/><path d="M14 -98 q6 -6 12 0" stroke="#26145f" stroke-width="4" fill="none" stroke-linecap="round"/></g>
          <g transform="translate(56 4)"><path d="M-24 26 C -28 -12 -22 -50 -2 -62 L 18 -62 C 32 -40 32 -2 24 26Z" fill="#ff7a59"/><circle cx="4" cy="-90" r="29" fill="#d98a6c"/><path d="M-24 -96 C -20 -128 30 -128 32 -96 C 18 -106 -4 -106 -24 -96Z" fill="#1f1a66"/><circle cx="-12" cy="-82" r="7" fill="#ff6b8f" opacity=".6"/><path d="M-20 -96 q-6 -6 -12 0" stroke="#26145f" stroke-width="4" fill="none" stroke-linecap="round"/>
            <g class="kz-wave"><path d="M18 -40 L 50 -96" stroke="#ff7a59" stroke-width="20" stroke-linecap="round"/><circle cx="52" cy="-104" r="11" fill="#d98a6c"/></g></g>
          <g transform="translate(-4 22)"><rect x="-18" y="-20" width="36" height="26" rx="6" fill="#b5651d"/><path d="M-14 -20 q14 -22 28 0" stroke="#7a3f12" stroke-width="5" fill="none"/></g>
        </g>
      </g>

      <!-- ===== ROOM (beats 1-4) ===== -->
      <g class="kz-indoor">
      <g class="kz-room">
        <path d="M0 0H1600V900H0Z M1062 196V482H1348V196Z" fill="url(#kzWall)" fill-rule="evenodd"/>
        <rect x="0" y="0" width="1600" height="70" fill="${C.wallDark}"/>
        <polygon points="0,660 1600,660 1600,900 0,900" fill="${C.floor}"/>
        <!-- window -->
        <g class="kz-window">
          <path d="M1044 178h322v322h-322Z M1062 196V482H1348V196Z" fill="#5a3fd6" fill-rule="evenodd"/>
          <g clip-path="url(#kzWinClip)">
            <rect class="kz-win-night" x="1062" y="196" width="286" height="286" fill="url(#kzWindowNight)"/>
            <rect class="kz-win-dawn" x="1062" y="196" width="286" height="286" fill="url(#kzWindowDawn)" opacity="0"/>
            <circle class="kz-moon" cx="1270" cy="268" r="34" fill="#f3ecff"/>
            <circle class="kz-moon-cut" cx="1286" cy="256" r="30" fill="#1a0e52"/>
            <g class="kz-stars" fill="#ffffff"><circle cx="1110" cy="240" r="3"/><circle cx="1160" cy="300" r="2.5"/><circle cx="1210" cy="226" r="2"/><circle cx="1320" cy="350" r="2.5"/><circle cx="1120" cy="380" r="2"/><circle cx="1250" cy="420" r="3"/></g>
            <circle class="kz-dawn-sun" cx="1205" cy="470" r="70" fill="#fff6c9" opacity="0"/>
          </g>
          <rect x="1198" y="196" width="14" height="286" fill="#5a3fd6"/>
          <rect x="1062" y="332" width="286" height="14" fill="#5a3fd6"/>
          <rect x="1020" y="150" width="370" height="16" rx="8" fill="#ff9d3c"/>
          <path class="kz-curtain-l" d="M1032 166 h70 v360 q-36 14 -70 0z" fill="#33b6d6"/>
          <path d="M1060 166 v360" stroke="#2794b3" stroke-width="10"/>
          <path class="kz-curtain-r" d="M1308 166 h70 v360 q-36 14 -70 0z" fill="#33b6d6"/>
          <path d="M1350 166 v360" stroke="#2794b3" stroke-width="10"/>
        </g>
        <!-- moonlight / dawn light on the floor -->
        <polygon class="kz-floorlight" points="1062,482 1348,482 1180,900 560,900" fill="#6c55ff" opacity=".22"/>
        <!-- wall frame -->
        <g transform="translate(470 210)"><rect width="190" height="140" rx="8" fill="#ff9d3c"/><rect x="14" y="14" width="162" height="112" rx="4" fill="#ffd23f"/><path d="M30 110 l40 -46 l30 30 l22 -20 l38 36z" fill="#ff7a59"/><circle cx="140" cy="44" r="14" fill="#fff2b0"/></g>
        <!-- plant -->
        <g transform="translate(150 660)"><path d="M-36 0 h72 l-10 -70 h-52z" fill="#ff7a59"/><path d="M0 -70 C -60 -150 -70 -210 -20 -250 C -10 -190 0 -140 0 -70Z" fill="#22c49a"/><path d="M0 -70 C 50 -140 80 -190 50 -240 C 20 -190 10 -140 0 -70Z" fill="#1aa985"/><path d="M0 -70 C -10 -130 20 -170 10 -200" stroke="#1aa985" stroke-width="8" fill="none"/></g>
        <!-- bed -->
        <g class="kz-bed">
          <rect x="250" y="400" width="44" height="300" rx="18" fill="#5634d8"/>
          <rect x="270" y="560" width="640" height="130" rx="22" fill="${C.bedBase}"/>
          <rect x="270" y="520" width="640" height="64" rx="26" fill="${C.bedTop}"/>
          <rect x="296" y="476" width="170" height="64" rx="32" fill="${C.pillow}"/>
          <path d="M470 528 C 520 500 600 512 640 530 L 700 530 C 700 590 690 640 660 690 L 460 690 C 448 640 450 570 470 528Z" fill="${C.blanket}"/>
          <path d="M470 528 C 520 500 600 512 640 530 C 600 540 540 538 470 528Z" fill="${C.blanketDark}"/>
          <rect x="290" y="690" width="22" height="30" rx="6" fill="#3a1ea6"/><rect x="870" y="690" width="22" height="30" rx="6" fill="#3a1ea6"/>
        </g>
        <!-- nightstand + clock -->
        <g transform="translate(1196 560)">
          <rect width="120" height="110" rx="12" fill="#5634d8"/><rect x="10" y="44" width="100" height="10" rx="5" fill="#4627b8"/>
          <rect x="20" y="-46" width="84" height="46" rx="10" fill="#1a0d4a"/>
          <text class="kz-clock" x="62" y="-14" text-anchor="middle" font-family="'Geist Mono', ui-monospace, monospace" font-size="24" font-weight="500" fill="#ff5d73">02:47</text>
        </g>
        <!-- phone light on the face -->
        <circle class="kz-phoneglow" cx="1000" cy="410" r="230" fill="url(#kzPhoneGlow)"/>
      </g>

      <!-- notifications around the head (beat 1) -->
      <g class="kz-notes">
        ${[[790, 250, '#ff4f6d', -8], [1050, 210, '#ffd23f', 6], [720, 370, '#e94bd6', 4], [1110, 320, '#36e0c8', -5], [850, 140, '#ff8a3d', 10], [1000, 110, '#7c5cff', -10], [660, 240, '#36e0c8', 8], [1150, 170, '#ff4f6d', -4]]
          .map(([x, y, col, r], i) => `<g class="kz-note" transform="translate(${x} ${y}) rotate(${r})"><g class="kz-note-in"><rect x="-30" y="-30" width="60" height="60" rx="16" fill="${col}"/><rect x="-14" y="-6" width="28" height="5" rx="2.5" fill="#fff" opacity=".9"/><rect x="-14" y="4" width="18" height="5" rx="2.5" fill="#fff" opacity=".7"/><circle cx="26" cy="-26" r="13" fill="#ff2e4d"/><text x="26" y="-21" text-anchor="middle" font-family="Geist, sans-serif" font-size="14" font-weight="700" fill="#fff">${[3, 9, 12, 1, 27, 4, 99, 6][i]}</text></g></g>`).join('')}
      </g>
      <g class="kz-swirl" fill="none" stroke="#9f86ff" stroke-width="5" stroke-linecap="round" opacity=".8">
        <path d="M930 210 c 20 -20 50 -10 50 14 c 0 24 -34 30 -46 12 c -10 -16 6 -34 22 -28"/>
      </g>

      <circle class="kz-halo" cx="900" cy="360" r="300" fill="url(#kzSunGlow)" opacity="0"/>
      <!-- ===== CHARACTER: shapes are rebuilt every frame from pose keyframes ===== -->
      <g class="kz-kid" transform="translate(872 540)">
        <ellipse class="kz-shadow" cx="60" cy="172" rx="110" ry="13" fill="#170b4f" opacity=".55"/>
        <path class="kz-arm-b-up" stroke="${C.shirtShade}" stroke-width="27" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-arm-b-lo" stroke="${C.skinShade}" stroke-width="20" stroke-linecap="round" fill="none"/>
        <circle class="kz-hand-b" r="12.5" fill="${C.skinShade}"/>
        <path class="kz-leg-b" stroke="${C.pantsShade}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-shoe-b" d="M-14 -6 h42 a17 17 0 0 1 17 17 v3 h-59z" fill="#e8b92c"/>
        <path class="kz-leg-f" stroke="${C.pants}" stroke-width="45" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-shoe-f" d="M-14 -6 h44 a18 18 0 0 1 18 18 v3 h-62z" fill="${C.shoe}"/>
        <clipPath id="kzTorsoClip"><path class="kz-torso-clip"/></clipPath>
        <path class="kz-torso" fill="${C.shirt}"/>
        <path class="kz-torso-back" clip-path="url(#kzTorsoClip)" stroke="${C.shirtShade}" stroke-width="34" fill="none"/>
        <path class="kz-torso-lit" clip-path="url(#kzTorsoClip)" stroke="${C.glow}" stroke-width="18" fill="none" opacity=".0"/>
        <g class="kz-head">
          <path d="M-14 26 h26 v40 h-26z" fill="${C.skinShade}"/>
          <circle r="54" fill="${C.skin}"/>
          <circle class="kz-face-lit" r="54" fill="url(#kzFaceLight)"/>
          <circle cx="53" cy="9" r="7.5" fill="${C.skin}"/>
          <path d="M-56 2 C -64 -62 -2 -84 38 -64 C 64 -52 70 -28 60 -12 C 48 -28 20 -34 0 -28 C -12 -14 -18 8 -26 28 C -42 30 -54 20 -56 2Z" fill="${C.hair}"/>
          <path d="M8 -62 C 40 -70 68 -48 62 -18 C 50 -38 32 -46 10 -42Z" fill="#36207d"/>
          <circle cx="-26" cy="8" r="12" fill="${C.skinShade}"/>
          <circle cx="30" cy="22" r="11" fill="${C.cheek}" opacity=".7"/>
          <g class="kz-eyes-tired"><path d="M27 -3 q10 -7 19 0 q-9 5 -19 0Z" fill="#26145f"/><path d="M26 -6 q11 -3 21 1" stroke="#26145f" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>
          <g class="kz-eyes-wide" opacity="0"><ellipse class="kz-pupil" cx="38" cy="-2" rx="7" ry="9" fill="#26145f"/><circle cx="40" cy="-5" r="2.4" fill="#fff"/><path d="M26 -22 q10 -6 20 -2" stroke="#26145f" stroke-width="4" stroke-linecap="round" fill="none"/></g>
          <g class="kz-eyes-happy" opacity="0"><path d="M28 0 q9 -10 18 0" stroke="#26145f" stroke-width="5" stroke-linecap="round" fill="none"/></g>
          <path class="kz-mouth-flat" d="M41 33 q6 2 11 -1" stroke="#5b2340" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <ellipse class="kz-mouth-o" cx="47" cy="34" rx="4.5" ry="5.5" fill="#5b2340" opacity="0"/>
          <path class="kz-mouth-smile" d="M39 29 q8 9 16 0 q-8 3 -16 0Z" fill="#5b2340" opacity="0"/>
        </g>
        <path class="kz-arm-f-up" stroke="${C.shirt}" stroke-width="29" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path class="kz-arm-f-lo" stroke="${C.skin}" stroke-width="21" stroke-linecap="round" fill="none"/>
        <path class="kz-arm-f-lit" stroke="${C.glow}" stroke-width="7" stroke-linecap="round" fill="none" opacity="0"/>
        <g class="kz-phone-hand">
          <rect x="-17" y="-31" width="34" height="58" rx="8" fill="${C.phone}"/>
          <clipPath id="kzScreenClip"><rect x="-13" y="-26" width="26" height="48" rx="5"/></clipPath>
          <g clip-path="url(#kzScreenClip)">
            <rect x="-13" y="-26" width="26" height="48" fill="#d9fbff"/>
            <g class="kz-feed">${Array.from({ length: 8 }, (_, i) => `<rect x="-10" y="${-24 + i * 15}" width="20" height="11" rx="2" fill="${['#ff6b8f', '#7c5cff', '#36e0c8', '#ffd23f'][i % 4]}"/>`).join('')}</g>
          </g>
        </g>
        <circle class="kz-hand-f" r="13.5" fill="${C.skin}"/>
        <circle class="kz-thumb" r="7" fill="${C.skin}"/>
        <g class="kz-startle" opacity="0" stroke="#ffd23f" stroke-width="7" stroke-linecap="round">
          <path d="M84 -300 l22 -30"/><path d="M114 -270 l34 -14"/><path d="M52 -310 l2 -36"/>
        </g>
      </g>

      <!-- flying phone (beat 3) -->
      <g class="kz-phone-fly" opacity="0">
        <rect x="-18" y="-32" width="36" height="62" rx="8" fill="${C.phone}"/>
        <rect x="-14" y="-27" width="28" height="52" rx="5" fill="${C.glow}"/>
        <g class="kz-lock" opacity="0"><rect x="-14" y="-27" width="28" height="52" rx="5" fill="#7c5cff"/><rect x="-8" y="-2" width="16" height="14" rx="3" fill="#fff"/><path d="M-5 -2 v-6 a5 5 0 0 1 10 0 v6" stroke="#fff" stroke-width="3" fill="none"/></g>
      </g>

      <rect class="kz-vignette" width="1600" height="900" fill="url(#kzVignette)" pointer-events="none"/>
      </g>
      <!-- light flood from the window (beat 4) -->
      <rect class="kz-flood" width="1600" height="900" fill="url(#kzFlood)" opacity="0"/>
    </svg>
    <div class="kz-cap kz-cap-1"><p class="kz-meta">Unscroll · 2:47 a.m.</p><p class="kz-big">Four hours of scrolling, and nothing to show for it.</p></div>
    <div class="kz-cap kz-cap-2"><p class="kz-meta">The lock</p><p class="kz-big">Unscroll blocks the apps you choose with Apple's Screen Time APIs. They stay locked even when Unscroll is closed.</p></div>
    <div class="kz-cap kz-cap-3"><p class="kz-meta">The math</p><p class="kz-big">Four hours a day is 1,460 hours a year. Unscroll shows you that number, then gives it back.</p></div>
  </div>`;

  const q = (s) => host.querySelector(s);
  // Portrait screens: frame the character instead of the middle of the room
  const svgEl = host.querySelector('.kz-svg');
  const narrow = host.clientWidth / window.innerHeight < 0.8;
  if (narrow) svgEl.setAttribute('viewBox', '480 0 900 900');
  const qa = (s) => host.querySelectorAll(s);
  gsap.set(qa('.kz-note-in'), { scale: 0, transformOrigin: '50% 50%' });

  /* ---------- Pose system: every body part is rebuilt from interpolated keyframes ---------- */
  const TORSO = {
    A: [[-30, 10], [-44, -40], [-38, -100], [-6, -140], [10, -162], [40, -172], [62, -160], [74, -150], [74, -132], [66, -118], [56, -80], [52, -30], [50, 10]],
    B: [[-30, 10], [-40, -50], [-34, -120], [-20, -158], [-8, -178], [30, -180], [46, -164], [56, -154], [58, -136], [56, -120], [56, -80], [54, -30], [50, 10]],
  };
  const LEGS = {
    sit: { f: [[0, 0], [104, 4], [112, 134]], b: [[-6, -4], [96, -2], [100, 128]] },
    push: { f: [[0, 0], [98, 10], [100, 136]], b: [[-6, -4], [92, 6], [92, 132]] },
    stand: { f: [[16, 0], [22, 76], [18, 152]], b: [[-2, 0], [-8, 76], [-10, 150]] },
  };
  const P = {
    scroll:  { t: 'A', head: [76, -206, 22], f: [[46, -148], [70, -78], [122, -114]], b: [[30, -150], [50, -82], [106, -114]], legs: 'sit', phone: -40, eyes: 'tired', mouth: 'flat' },
    startle: { t: 'B', head: [28, -232, -6], f: [[30, -160], [60, -92], [108, -140]], b: [[14, -162], [26, -92], [78, -128]], legs: 'sit', phone: -18, eyes: 'wide', mouth: 'o' },
    windup:  { t: 'B', head: [24, -232, -10], f: [[24, -162], [-20, -182], [-48, -236]], b: [[14, -162], [54, -110], [98, -116]], legs: 'sit', phone: -150, eyes: 'wide', mouth: 'flat' },
    release: { t: 'B', head: [32, -230, 2], f: [[34, -162], [88, -204], [148, -224]], b: [[14, -162], [20, -92], [40, -40]], legs: 'sit', phone: 40, eyes: 'wide', mouth: 'flat' },
    follow:  { t: 'A', head: [74, -208, 6], f: [[46, -148], [98, -100], [150, -70]], b: [[30, -150], [42, -82], [60, -28]], legs: 'sit', phone: 60, eyes: 'wide', mouth: 'flat' },
    look:    { t: 'B', head: [28, -232, -4], f: [[30, -160], [48, -88], [72, -22]], b: [[14, -162], [18, -90], [32, -24]], legs: 'sit', phone: 60, eyes: 'wide', mouth: 'flat' },
    push:    { t: 'A', head: [72, -208, 2], f: [[46, -148], [78, -74], [100, -8]], b: [[30, -150], [58, -80], [86, -10]], legs: 'push', phone: 60, eyes: 'happy', mouth: 'smile' },
    stand:   { t: 'B', head: [28, -232, -4], f: [[30, -160], [38, -82], [46, -8]], b: [[14, -162], [10, -84], [6, -10]], legs: 'stand', phone: 60, eyes: 'happy', mouth: 'smile' },
    raise:   { t: 'B', head: [28, -234, -14], f: [[30, -162], [76, -230], [104, -304]], b: [[14, -162], [-26, -232], [-50, -302]], legs: 'stand', phone: 60, eyes: 'happy', mouth: 'smile' },
  };
  const KEYS = [[0, 'scroll'], [.232, 'scroll'], [.272, 'startle', 'out'], [.335, 'startle'], [.375, 'windup', 'io'], [.399, 'release', 'out'], [.43, 'follow', 'out'],
    [.5, 'look', 'io'], [.565, 'look'], [.6, 'push', 'io'], [.64, 'stand', 'io'], [.685, 'raise', 'back'], [1, 'raise']];
  const EASE = { io: (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out: (t) => 1 - Math.pow(1 - t, 3),
    back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, lin: (t) => t };
  const L = (a, b, t) => a + (b - a) * t;
  const LP = (a, b, t) => [L(a[0], b[0], t), L(a[1], b[1], t)];
  const KEYS_EL = ['torso', 'torso-clip', 'torso-back', 'torso-lit', 'leg-f', 'leg-b', 'shoe-f', 'shoe-b', 'arm-f-up', 'arm-f-lo', 'arm-f-lit', 'arm-b-up', 'arm-b-lo', 'hand-f', 'hand-b', 'thumb', 'phone-hand', 'head', 'face-lit', 'eyes-tired', 'eyes-wide', 'eyes-happy', 'mouth-flat', 'mouth-o', 'mouth-smile', 'feed', 'pupil'];
  const elsOf = (root) => { const o = {}; KEYS_EL.forEach((k) => { o[k] = root.querySelector('.kz-' + k); }); return o; };
  const el = elsOf(host);
  // A twin of the rigged figure stands on the hill outside (own clip ids)
  const twin = q('.kz-kid').cloneNode(true);
  twin.setAttribute('class', 'kz-kid-out'); twin.setAttribute('transform', 'translate(770 492) scale(.62)'); twin.style.opacity = 0;
  twin.querySelectorAll('[id]').forEach((n) => { const old = n.id; n.id = old + 'Out'; twin.querySelectorAll(`[clip-path="url(#${old})"]`).forEach((m) => m.setAttribute('clip-path', `url(#${old}Out)`)); });
  twin.querySelector('.kz-startle')?.remove();
  q('.kz-out').appendChild(twin);
  const elOut = elsOf(twin);
  elOut['phone-hand'].style.display = 'none'; elOut.thumb.style.display = 'none';
  const torsoD = (pts) => `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]}Z`;
  const backD = (pts) => `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]}`;
  const frontD = (pts) => `M${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]}`;
  let lastP = 0;
  function drawKid(p, time, el) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const [p0, n0] = KEYS[i], [p1, n1, e] = KEYS[i + 1];
    const t = EASE[e || 'io'](Math.min(1, Math.max(0, (p - p0) / (p1 - p0 || 1))));
    const A = P[n0], B = P[n1];
    const torso = TORSO[A.t].map((v, k) => LP(v, TORSO[B.t][k], t));
    // breathing + idle (only while sitting still)
    const still = n0 === n1 ? 1 : 0, br = Math.sin(time * 1.6) * 2.2;
    for (const v of torso) if (v[1] < -100) v[1] += br * .6;
    const tD = torsoD(torso);
    el.torso.setAttribute('d', tD); el['torso-clip'].setAttribute('d', tD); el['torso-back'].setAttribute('d', backD(torso)); el['torso-lit'].setAttribute('d', frontD(torso));
    const legsA = LEGS[A.legs], legsB = LEGS[B.legs];
    for (const side of ['f', 'b']) {
      const pts = legsA[side].map((v, k) => LP(v, legsB[side][k], t));
      el['leg-' + side].setAttribute('d', `M${pts[0]} L${pts[1]} L${pts[2]}`);
      el['shoe-' + side].setAttribute('transform', `translate(${pts[2][0]} ${pts[2][1] + 14})`);
      const S = LP(A[side][0], B[side][0], t), E = LP(A[side][1], B[side][1], t), W = LP(A[side][2], B[side][2], t);
      S[1] += br * .6; E[1] += br * .4;
      if (side === 'f' && n0 === 'scroll' && n1 === 'scroll') W[1] += Math.sin(time * 5) * 1.5;
      el['arm-' + side + '-up'].setAttribute('d', `M${S} L${E}`);
      el['arm-' + side + '-lo'].setAttribute('d', `M${E} L${W}`);
      el['hand-' + side].setAttribute('cx', W[0]); el['hand-' + side].setAttribute('cy', W[1]);
      if (side === 'f') {
        el['arm-f-lit'].setAttribute('d', `M${L(E[0], W[0], .2)} ${L(E[1], W[1], .2) - 8} L${W[0]} ${W[1] - 8}`);
        const rot = L(A.phone, B.phone, t);
        const Wb = LP(A.b[2], B.b[2], t), hold = n0 === 'scroll' || n1 === 'scroll' || n0 === 'startle' || n1 === 'startle' ? 1 : 0;
        const px = hold ? (W[0] + Wb[0]) / 2 + 4 : W[0] + 6, py = hold ? (W[1] + Wb[1]) / 2 - 18 : W[1] - 16;
        el['phone-hand'].setAttribute('transform', `translate(${px} ${py}) rotate(${hold ? rot * .45 : rot})`);
        const th = (n0 === 'scroll' && n1 === 'scroll') ? Math.sin(time * 5) * 5 : 0;
        el.thumb.setAttribute('cx', W[0] + 4 + th * .4); el.thumb.setAttribute('cy', W[1] - 14 + th);
      }
    }
    const hd = [L(A.head[0], B.head[0], t), L(A.head[1], B.head[1], t) + br * .8, L(A.head[2], B.head[2], t)];
    el.head.setAttribute('transform', `translate(${hd[0]} ${hd[1]}) rotate(${hd[2]})`);
    const pick = t < .5 ? A : B;
    el['eyes-tired'].style.opacity = pick.eyes === 'tired' ? 1 : 0;
    el['eyes-wide'].style.opacity = pick.eyes === 'wide' ? 1 : 0;
    el['eyes-happy'].style.opacity = pick.eyes === 'happy' ? 1 : 0;
    el['mouth-flat'].style.opacity = pick.mouth === 'flat' ? 1 : 0;
    el['mouth-o'].style.opacity = pick.mouth === 'o' ? 1 : 0;
    el['mouth-smile'].style.opacity = pick.mouth === 'smile' ? 1 : 0;
    // tired blink
    const blink = (time % 4.2) < .12 ? .15 : 1;
    el['eyes-tired'].setAttribute('transform', `translate(36 0) scale(1 ${blink}) translate(-36 0)`);
    // pupils follow the scene: down at the phone, then to the window
    el.pupil.setAttribute('cx', p > .44 ? 40 : 37);
    // phone light on face, shirt and arm; feed scrolls on the screen
    const light = (1 - Math.min(1, Math.max(0, (p - .398) / .02))) * (.85 + .15 * Math.sin(time * 7) * Math.sin(time * 2.3));
    el['face-lit'].style.opacity = light; el['torso-lit'].style.opacity = .35 * light; el['arm-f-lit'].style.opacity = .5 * light;
    el.feed.setAttribute('transform', `translate(0 ${-((time * 26) % 60)})`);
    lastP = p;
  }
  gsap.ticker.add((time) => { drawKid(tl.progress(), time, el); drawKid(.97, time, elOut); });

  if (!reduce) {
    gsap.to(qa('.kz-note'), { y: '-=10', duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: .2, from: 'random' } });
    gsap.to(q('.kz-swirl'), { rotation: 360, svgOrigin: '955 222', duration: 6, ease: 'none', repeat: -1 });
    gsap.to(q('.kz-phoneglow'), { opacity: .7, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-rays'), { rotation: 360, svgOrigin: '800 470', duration: 90, ease: 'none', repeat: -1 });
    gsap.to(q('.kz-kite'), { rotation: 22, y: '+=14', duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-wave'), { rotation: -18, svgOrigin: '18 -40', duration: .5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-cloud-a'), { x: '+=60', duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(q('.kz-cloud-b'), { x: '-=50', duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  // Beat 1 (0-0.24): notifications pile up
  tl.to(qa('.kz-note-in'), { scale: 1, duration: .03, stagger: .022, ease: 'back.out(2)' }, 0.02)
    .fromTo('.kz-cap-1', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .05 }, 0.02)
    .to('.kz-cap-1', { opacity: 0, y: -30, duration: .04 }, 0.22)
  // Beat 2 (0.24-0.34): snap out of it
    .to(q('.kz-startle'), { opacity: 1, duration: .01 }, 0.255).to(q('.kz-startle'), { opacity: 0, duration: .02 }, 0.31)
    .to(qa('.kz-note'), { scale: .2, opacity: 0, duration: .04, stagger: .004, transformOrigin: '50% 50%' }, 0.27)
    .to(q('.kz-swirl'), { opacity: 0, duration: .02 }, 0.26)
  // Beat 3 (0.34-0.52): wind up and throw
    .set(el['phone-hand'], { opacity: 0 }, 0.402).set([el['thumb']], { opacity: 0 }, 0.402)
    .set(q('.kz-phone-fly'), { opacity: 1, x: 1024, y: 300, rotation: 40 }, 0.402)
    .to(q('.kz-phone-fly'), { x: 1310, rotation: 1120, duration: .08, ease: 'none' }, 0.402)
    .to(q('.kz-phone-fly'), { y: 170, duration: .03, ease: 'power1.out' }, 0.402)
    .to(q('.kz-phone-fly'), { y: 790, duration: .05, ease: 'power2.in' }, 0.432)
    .to(q('.kz-lock'), { opacity: 1, duration: .01 }, 0.47)
    .to(q('.kz-phoneglow'), { autoAlpha: 0, duration: .02 }, 0.4)
    .fromTo('.kz-cap-2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .04 }, 0.44)
    .to('.kz-cap-2', { opacity: 0, y: -30, duration: .04 }, 0.6)
  // Beat 4 (0.52-0.68): the night glass fades, the real morning is outside the window
    .to([q('.kz-win-night'), q('.kz-moon'), q('.kz-moon-cut'), q('.kz-stars')], { opacity: 0, duration: .07 }, 0.52)
    .to([q('.kz-sun'), q('.kz-sun-glow')], { attr: { cy: 330 }, duration: .12, ease: 'power1.out' }, 0.52)
    .to(q('.kz-floorlight'), { opacity: .75, attr: { fill: '#ffd23f' }, duration: .08 }, 0.54)
    .to(q('.kz-vignette'), { opacity: 0, duration: .08 }, 0.54)
    .to(q('.kz-clock'), { opacity: 0, duration: .02 }, 0.54)
    .to(q('.kz-kid'), { x: 905, duration: .05, ease: 'power2.inOut' }, 0.6)
    .to(q('.kz-halo'), { opacity: .7, duration: .05 }, 0.63)
  // Beat 5 (0.68-1): through the window into the morning
    .to(q('.kz-indoor'), { scale: 7.5, svgOrigin: '1205 339', duration: .12, ease: 'power3.in' }, 0.68)
    .to(q('.kz-indoor'), { opacity: 0, duration: .02 }, 0.79)
    .to([q('.kz-sun'), q('.kz-sun-glow')], { attr: { cx: 800, cy: 420 }, duration: .16, ease: 'power2.inOut' }, 0.7)
    .fromTo(q('.kz-kid-out'), { opacity: 0 }, { opacity: 1, duration: .03 }, 0.785)
    .fromTo(q('.kz-birds'), { x: -200 }, { x: 260, duration: .26 }, 0.74)
    .fromTo('.kz-cap-3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .05 }, 0.8)
    .to(svgEl, { attr: { viewBox: narrow ? '400 0 900 900' : '0 0 1600 900' }, duration: .1 }, 0.74)
    .to({}, { duration: .02 }, 0.98);

  if (reduce) { tl.progress(0.9); return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'kz-active' } });
  window.kzSeek = (p) => tl.progress(p);
})();
