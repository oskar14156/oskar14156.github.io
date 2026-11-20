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
        <circle class="kz-sun-glow" cx="800" cy="470" r="420" fill="url(#kzSunGlow)"/>
        <circle class="kz-sun" cx="800" cy="470" r="120" fill="${C.sun}"/>
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
      <g class="kz-room">
        <rect width="1600" height="900" fill="url(#kzWall)"/>
        <rect x="0" y="0" width="1600" height="70" fill="${C.wallDark}"/>
        <polygon points="0,660 1600,660 1600,900 0,900" fill="${C.floor}"/>
        <!-- window -->
        <g class="kz-window">
          <rect x="1044" y="178" width="322" height="322" rx="14" fill="#5a3fd6"/>
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
        <circle class="kz-phoneglow" cx="990" cy="400" r="200" fill="url(#kzPhoneGlow)"/>
      </g>

      <!-- notifications around the head (beat 1) -->
      <g class="kz-notes">
        ${[[790, 250, '#ff4f6d', -8], [1050, 210, '#ffd23f', 6], [720, 370, '#e94bd6', 4], [1110, 320, '#36e0c8', -5], [850, 140, '#ff8a3d', 10], [1000, 110, '#7c5cff', -10], [660, 240, '#36e0c8', 8], [1150, 170, '#ff4f6d', -4]]
          .map(([x, y, col, r], i) => `<g class="kz-note" transform="translate(${x} ${y}) rotate(${r})"><g class="kz-note-in"><rect x="-30" y="-30" width="60" height="60" rx="16" fill="${col}"/><rect x="-14" y="-6" width="28" height="5" rx="2.5" fill="#fff" opacity=".9"/><rect x="-14" y="4" width="18" height="5" rx="2.5" fill="#fff" opacity=".7"/><circle cx="26" cy="-26" r="13" fill="#ff2e4d"/><text x="26" y="-21" text-anchor="middle" font-family="Geist, sans-serif" font-size="14" font-weight="700" fill="#fff">${[3, 9, 12, 1, 27, 4, 99, 6][i]}</text></g></g>`).join('')}
      </g>
      <g class="kz-swirl" fill="none" stroke="#9f86ff" stroke-width="5" stroke-linecap="round" opacity=".8">
        <path d="M930 210 c 20 -20 50 -10 50 14 c 0 24 -34 30 -46 12 c -10 -16 6 -34 22 -28"/>
      </g>

      <circle class="kz-halo" cx="850" cy="360" r="300" fill="url(#kzSunGlow)" opacity="0"/>
      <!-- ===== CHARACTER (rig) ===== -->
      <g class="kz-kid" transform="translate(872 540)">
        <ellipse class="kz-shadow" cx="70" cy="170" rx="110" ry="13" fill="#170b4f" opacity=".55"/>
        <!-- sitting legs: thigh over the foot of the bed, shin hanging -->
        <g class="kz-legs-sit" stroke-linecap="round" fill="none">
          <path d="M0 0 L 104 4" stroke="${C.pants}" stroke-width="50"/>
          <path d="M108 6 L 116 132" stroke="${C.pantsShade}" stroke-width="40"/>
          <path d="M98 160 h46 a18 18 0 0 1 18 18 v2 h-64z" fill="${C.shoe}" stroke="none"/>
        </g>
        <!-- standing legs (beats 4-5) -->
        <g class="kz-legs-stand" opacity="0" stroke-linecap="round" fill="none">
          <path d="M2 0 L 0 140" stroke="${C.pantsShade}" stroke-width="36"/>
          <path d="M30 0 L 34 140" stroke="${C.pants}" stroke-width="36"/>
          <path d="M-14 152 h40 a16 16 0 0 1 16 16 v2 h-56z" fill="${C.shoe}" stroke="none"/>
          <path d="M22 152 h40 a16 16 0 0 1 16 16 v2 h-56z" fill="${C.shoe}" stroke="none"/>
        </g>
        <!-- torso pivots at the hip -->
        <g class="kz-torso">
          <!-- back arm -->
          <g class="kz-arm-back" stroke-linecap="round" fill="none">
            <path d="M22 -148 L 46 -80" stroke="${C.shirtShade}" stroke-width="28"/>
            <g class="kz-fore-back"><path d="M46 -80 L 96 -112" stroke="${C.skinShade}" stroke-width="21"/><circle cx="100" cy="-116" r="13" fill="${C.skinShade}" stroke="none"/></g>
          </g>
          <path d="M-32 12 C -42 -56 -34 -124 -20 -156 Q -12 -174 8 -174 L 34 -174 Q 52 -174 56 -156 C 64 -112 62 -48 50 12 Z" fill="${C.shirt}"/>
          <path d="M-32 12 C -42 -56 -34 -124 -20 -156 Q -12 -174 8 -174 L 12 -174 C -4 -130 -8 -60 -2 12 Z" fill="${C.shirtShade}"/>
          <path d="M-6 -174 q 22 14 46 0" stroke="${C.shirtShade}" stroke-width="6" fill="none" stroke-linecap="round"/>
          <!-- arms raised (beats 4-5), drawn behind the head -->
          <g class="kz-arms-up" opacity="0" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M20 -150 L -22 -222 L -40 -296" stroke="${C.shirtShade}" stroke-width="27"/>
            <circle cx="-42" cy="-304" r="14" fill="${C.skinShade}" stroke="none"/>
            <path d="M30 -150 L 104 -188 L 132 -274" stroke="${C.shirt}" stroke-width="29"/>
            <circle cx="135" cy="-284" r="15" fill="${C.skin}" stroke="none"/>
          </g>
          <!-- head (neck pivot) -->
          <g class="kz-head">
            <rect x="8" y="-196" width="26" height="30" rx="10" fill="${C.skinShade}"/>
            <circle cx="26" cy="-234" r="54" fill="${C.skin}"/>
            <path class="kz-rim" d="M66 -272 A 54 54 0 0 1 66 -196" stroke="${C.glow}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".75"/>
            <path d="M-30 -232 C -38 -296 24 -318 64 -298 C 90 -286 96 -262 86 -246 C 74 -262 46 -268 26 -262 C 14 -248 8 -226 0 -206 C -16 -204 -28 -214 -30 -232Z" fill="${C.hair}"/>
            <path d="M34 -296 C 66 -304 94 -282 88 -252 C 76 -272 58 -280 36 -276Z" fill="#36207d"/>
            <circle cx="0" cy="-226" r="12" fill="${C.skinShade}"/>
            <circle cx="56" cy="-212" r="11" fill="${C.cheek}" opacity=".75"/>
            <g class="kz-eyes-tired"><path d="M52 -238 q11 -1 20 1" stroke="#26145f" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M54 -230 q8 4 16 1" stroke="#26145f" stroke-width="3" stroke-linecap="round" fill="none" opacity=".45"/></g>
            <g class="kz-eyes-wide" opacity="0"><circle cx="62" cy="-236" r="12" fill="#fff"/><circle cx="66" cy="-236" r="6.5" fill="#26145f"/><path d="M48 -260 l20 -6" stroke="#26145f" stroke-width="5" stroke-linecap="round"/></g>
            <g class="kz-eyes-happy" opacity="0"><path d="M52 -236 q10 -11 20 0" stroke="#26145f" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M58 -204 q12 11 24 -1" stroke="#26145f" stroke-width="5" stroke-linecap="round" fill="none"/></g>
            <path class="kz-mouth-flat" d="M66 -200 h10" stroke="#a8455a" stroke-width="4" stroke-linecap="round"/>
          </g>
          <!-- front arm holds the phone -->
          <g class="kz-arm-front" stroke-linecap="round" fill="none">
            <path d="M28 -150 L 58 -74" stroke="${C.shirt}" stroke-width="30"/>
            <g class="kz-fore-front">
              <polygon class="kz-cone" points="110,-150 134,-128 84,-206 60,-262" fill="${C.glow}" opacity=".28" stroke="none"/>
              <path d="M58 -74 L 112 -118" stroke="${C.skin}" stroke-width="22"/>
              <circle cx="116" cy="-122" r="14" fill="${C.skin}" stroke="none"/>
              <g class="kz-phone-hand" transform="translate(122 -138) rotate(-34)">
                <rect x="-17" y="-31" width="34" height="58" rx="8" fill="${C.phone}" stroke="none"/>
                <rect class="kz-phone-screen" x="-13" y="-26" width="26" height="48" rx="5" fill="${C.glow}" stroke="none"/>
              </g>
              <circle cx="110" cy="-126" r="9" fill="${C.skin}" stroke="none"/>
            </g>
          </g>
        </g>
        <g class="kz-startle" opacity="0" stroke="#ffd23f" stroke-width="7" stroke-linecap="round">
          <path d="M110 -306 l22 -30"/><path d="M140 -276 l34 -14"/><path d="M78 -316 l2 -36"/>
        </g>
      </g>

      <!-- flying phone (beat 3) -->
      <g class="kz-phone-fly" opacity="0">
        <rect x="-18" y="-32" width="36" height="62" rx="8" fill="${C.phone}"/>
        <rect x="-14" y="-27" width="28" height="52" rx="5" fill="${C.glow}"/>
        <g class="kz-lock" opacity="0"><rect x="-14" y="-27" width="28" height="52" rx="5" fill="#7c5cff"/><rect x="-8" y="-2" width="16" height="14" rx="3" fill="#fff"/><path d="M-5 -2 v-6 a5 5 0 0 1 10 0 v6" stroke="#fff" stroke-width="3" fill="none"/></g>
      </g>

      <rect class="kz-vignette" width="1600" height="900" fill="url(#kzVignette)" pointer-events="none"/>
      <!-- light flood from the window (beat 4) -->
      <circle class="kz-flood" cx="1205" cy="339" r="10" fill="#fff3c0" opacity="0"/>
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
  // Pivots in the kid's local space
  gsap.set(q('.kz-torso'), { svgOrigin: '10 0' });
  gsap.set(q('.kz-head'), { svgOrigin: '22 -176' });
  gsap.set(q('.kz-arm-front'), { svgOrigin: '28 -150' });
  gsap.set(q('.kz-arm-back'), { svgOrigin: '22 -148' });
  gsap.set(q('.kz-fore-front'), { svgOrigin: '58 -74' });
  gsap.set(q('.kz-fore-back'), { svgOrigin: '46 -80' });
  gsap.set(qa('.kz-note-in'), { scale: 0, transformOrigin: '50% 50%' });

  // Idle: hunched, head down, notifications bob
  gsap.set(q('.kz-torso'), { rotation: 14 });
  gsap.set(q('.kz-head'), { rotation: 16 });
  gsap.set(q('.kz-arm-front'), { rotation: -6 });
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
    .to(q('.kz-torso'), { rotation: -4, duration: .03, ease: 'back.out(3)' }, 0.25)
    .to(q('.kz-head'), { rotation: -8, duration: .03, ease: 'back.out(3)' }, 0.25)
    .to(q('.kz-kid'), { y: '-=26', duration: .015, yoyo: true, repeat: 1, ease: 'power2.out' }, 0.25)
    .set(q('.kz-eyes-tired'), { opacity: 0 }, 0.25).set(q('.kz-eyes-wide'), { opacity: 1 }, 0.25)
    .to(q('.kz-startle'), { opacity: 1, duration: .01 }, 0.255).to(q('.kz-startle'), { opacity: 0, duration: .02 }, 0.31)
    .to(qa('.kz-note'), { scale: .2, opacity: 0, duration: .04, stagger: .004, transformOrigin: '50% 50%' }, 0.27)
    .to(q('.kz-swirl'), { opacity: 0, duration: .02 }, 0.26)
  // Beat 3 (0.34-0.52): wind up and throw
    .to(q('.kz-arm-front'), { rotation: 157, duration: .05, ease: 'power2.inOut' }, 0.34)
    .to(q('.kz-fore-front'), { rotation: 35, duration: .05, ease: 'power2.inOut' }, 0.34)
    .to(q('.kz-torso'), { rotation: -12, duration: .05, ease: 'power2.inOut' }, 0.34)
    .to(q('.kz-arm-front'), { rotation: 262, duration: .022, ease: 'power3.out' }, 0.39)
    .to(q('.kz-fore-front'), { rotation: 0, duration: .022, ease: 'power3.out' }, 0.39)
    .to(q('.kz-torso'), { rotation: 6, duration: .022, ease: 'power3.out' }, 0.39)
    .set(q('.kz-phone-hand'), { opacity: 0 }, 0.402)
    .set(q('.kz-phone-fly'), { opacity: 1, x: 990, y: 310, rotation: -30 }, 0.402)
    .to(q('.kz-phone-fly'), { x: 1300, rotation: 1080, duration: .08, ease: 'none' }, 0.402)
    .to(q('.kz-phone-fly'), { y: 170, duration: .03, ease: 'power1.out' }, 0.402)
    .to(q('.kz-phone-fly'), { y: 790, duration: .05, ease: 'power2.in' }, 0.432)
    .to(q('.kz-arm-front'), { rotation: 352, duration: .04, ease: 'power1.out' }, 0.424)
    .to(q('.kz-fore-front'), { rotation: -20, duration: .04, ease: 'power1.out' }, 0.424)
    .to(q('.kz-lock'), { opacity: 1, duration: .01 }, 0.47)
    .to([q('.kz-phoneglow'), q('.kz-cone'), q('.kz-rim')], { autoAlpha: 0, duration: .02 }, 0.4)
    .fromTo('.kz-cap-2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .04 }, 0.44)
    .to('.kz-cap-2', { opacity: 0, y: -30, duration: .04 }, 0.6)
  // Beat 4 (0.52-0.72): morning floods in, stand up and rise
    .to(q('.kz-win-dawn'), { opacity: 1, duration: .08 }, 0.52)
    .to([q('.kz-moon'), q('.kz-moon-cut'), q('.kz-stars')], { opacity: 0, duration: .05 }, 0.52)
    .to(q('.kz-dawn-sun'), { opacity: 1, attr: { cy: 360 }, duration: .1 }, 0.53)
    .to(q('.kz-floorlight'), { opacity: .75, attr: { fill: '#ffd23f' }, duration: .08 }, 0.54)
    .to(q('.kz-vignette'), { opacity: 0, duration: .08 }, 0.54)
    .to(q('.kz-clock'), { opacity: 0, duration: .02 }, 0.54)
    .set(q('.kz-eyes-wide'), { opacity: 0 }, 0.6).set(q('.kz-eyes-happy'), { opacity: 1 }, 0.6).set(q('.kz-mouth-flat'), { opacity: 0 }, 0.6)
    .to(q('.kz-legs-sit'), { opacity: 0, duration: .02 }, 0.6).to(q('.kz-legs-stand'), { opacity: 1, duration: .02 }, 0.6)
    .to(q('.kz-kid'), { x: 820, y: 512, duration: .06, ease: 'power2.out' }, 0.6)
    .to(q('.kz-torso'), { rotation: 0, duration: .04 }, 0.6).to(q('.kz-head'), { rotation: -14, duration: .05 }, 0.62)
    .to([q('.kz-arm-front'), q('.kz-arm-back')], { opacity: 0, duration: .015 }, 0.62)
    .fromTo(q('.kz-arms-up'), { opacity: 0, scale: .6, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: .03, ease: 'back.out(2)' }, 0.62)
    
    .to(q('.kz-halo'), { opacity: 1, duration: .04 }, 0.62)
    .to(q('.kz-kid'), { y: 470, duration: .06, ease: 'sine.inOut' }, 0.66)
    .to(q('.kz-shadow'), { scale: .5, opacity: .25, transformOrigin: '50% 50%', duration: .06 }, 0.66)
    .to(q('.kz-flood'), { opacity: 1, attr: { r: 1900 }, duration: .1, ease: 'power2.in' }, 0.64)
  // Beat 5 (0.74-1): outside
    .set(q('.kz-room'), { opacity: 0 }, 0.74)
    .set([q('.kz-bed'), q('.kz-phone-fly')], { opacity: 0 }, 0.74)
    .to(q('.kz-flood'), { opacity: 0, duration: .08 }, 0.74)
    .to(q('.kz-kid'), { x: 760, y: 428, scale: .62, transformOrigin: '50% 100%', duration: .1, ease: 'power2.out' }, 0.74)
    .to(q('.kz-halo'), { opacity: 0, duration: .06 }, 0.76)
    .to(q('.kz-shadow'), { scale: 1, duration: .06 }, 0.76)
    .to(q('.kz-shadow'), { opacity: .25, attr: { fill: '#0d7a5e' }, duration: .02 }, 0.74)
    .fromTo(q('.kz-sun'), { attr: { cy: 620 } }, { attr: { cy: 420 }, duration: .2, ease: 'power1.out' }, 0.74)
    .fromTo(q('.kz-sun-glow'), { attr: { cy: 620 } }, { attr: { cy: 420 }, duration: .2, ease: 'power1.out' }, 0.74)
    .fromTo(q('.kz-birds'), { x: -200 }, { x: 260, duration: .26 }, 0.74)
    .fromTo('.kz-cap-3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .05 }, 0.8)
    .to(svgEl, { attr: { viewBox: narrow ? '400 0 900 900' : '0 0 1600 900' }, duration: .1 }, 0.74)
    .to({}, { duration: .02 }, 0.98);

  if (reduce) { tl.progress(0.9); return; }
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', scrub: 0.6, animation: tl });
  ScrollTrigger.create({ trigger: host, start: 'top 80px', end: 'bottom top', toggleClass: { targets: document.body, className: 'kz-active' } });
  window.kzSeek = (p) => tl.progress(p);
})();
