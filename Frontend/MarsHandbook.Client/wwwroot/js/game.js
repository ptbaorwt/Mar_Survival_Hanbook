// Sol Survival: a pixel-art EVA game for the Mars Survival Handbook.
// Pure canvas + DOM, no image assets: terrain is shaded per pixel, sprites come from the pixel maps below.
const T = 16, MW = 56, MH = 40, CAP = 4, SOL = 60;
const DIFF = {
  cadet: { name: 'Cadet', goal: 5, drain: 0.7, devils: 2, suit: 110, note: 'Fewer hazards, 5 samples' },
  engineer: { name: 'Engineer', goal: 8, drain: 1, devils: 4, suit: 85, note: 'The standard mission, 8 samples' },
  commander: { name: 'Commander', goal: 10, drain: 1.3, devils: 6, suit: 65, note: 'Thin margins, 10 samples' }
};
const PAL = {
  W: '#f2f3f5', w: '#c4c8ce', g: '#8d939a', k: '#2a2f36', v: '#16233a', V: '#6fa8dc', o: '#ff5a1f', b: '#a7adb5',
  C: '#bfeaff', c: '#4fa3dc', y: '#8f6b2e', Y: '#e0b85c', l: '#fff1c4', O: '#ff9a66'
};
const GROUND = ['#6e2f15', '#82381a', '#96421f', '#a84c24', '#b8572a', '#c66532', '#d4773f', '#e08c52'];
const ROCK = ['#22100a', '#40200f', '#5a2c17', '#723a20', '#8c4c2e', '#a6623f'];
const LEGS_DOWN_A = ['...WW..WW...', '...WW..WW...', '...ww..ww...', '..kkk..kkk..'];
const LEGS_DOWN_B = ['..WW....WW..', '..WW....WW..', '..ww....ww..', '.kkk....kkk.'];
const DOWN = ['....WWWW....', '...WWWWWW...', '..WWvvvvWW..', '..WvVvvvvW..', '..WvvVvvvW..', '..wWvvvvWw..',
  '...wWWWWw...', '.bbWWWWWWbb.', '.gWWWWoWWWg.', '.gWWWWWWWWg.', '.gwWWkkWWwg.', '..wWWWWWWw..'];
const UP = ['....WWWW....', '...WWWWWW...', '..WWWWWWWW..', '..WWWWWWWW..', '..WWWWWWWW..', '..wWWWWWWw..',
  '...wWWWWw...', '.gbbbbbbbbg.', '.gbggggggbg.', '.gbbbbbbbbg.', '.gbbobbobbg.', '..wWWWWWWw..'];
const SIDE = ['....WWWW....', '...WWWWWW...', '..WWWWWvvv..', '..WWWWvVvv..', '..WWWWvvvv..', '..wWWWWvvw..',
  '...wWWWWw...', '.bbbWWWWW...', '.bgbWWoWWW..', '.bbbWWWWWW..', '.bgbWWWWWw..', '..wWWWWWw...'];
const LEGS_SIDE_A = ['....WWW.....', '....WWW.....', '....www.....', '....kkkk....'];
const LEGS_SIDE_B = ['...WW.WW....', '..WW...WW...', '..ww...ww...', '.kkk...kkk..'];
const ICE = ['...C.....', '..CWC..C.', '..CWCcCWC', '.CWCCcCWc', '.CWCcccCc', 'CWCCcccc.', 'CWCcccc..', '.cccc....'];
const SAMPLE = ['...yyy...', '..yYYYy..', '.yYlYYYy.', 'yYlYYYYYy', 'yYYYYyYYy', 'yYYyYYYyy', '.yYYYYyy.', '..yyyyy..'];
const PART = ['ooooooooo', 'oOOOOOOOo', 'oOkOOOkOo', 'ooooooooo', 'obbbbbbbo', 'obkbbbkbo', 'obbbbbbbo', 'ooooooooo'];
const KIND = {
  ice: { color: '#a9e2ff', label: 'ICE · +WATER +O2' },
  sample: { color: '#f0c45c', label: 'ROCK SAMPLE' },
  part: { color: '#ff7a3d', label: 'PARTS · +POWER' }
};
const FACTS = {
  ice: ['Water ice. NASA\'s Phoenix lander (2008) uncovered ice just below the surface near the north pole. Ice gives drinking water and, split by electrolysis, oxygen.', 'handbook/living-on-mars?c=water-and-oxygen'],
  sample: ['Rock sample. Perseverance seals rock cores in tubes so they can one day be studied on Earth.', 'handbook/discover-mars?c=structure-and-terrain'],
  part: ['Spare parts. There is no resupply: a radio message takes 3 to 22 minutes each way and cargo takes months.', 'handbook/science-technology'],
  storm: ['Dust storm! In 2018 a planet-wide storm blocked so much sunlight that Opportunity lost power. Solar panels are covered.', 'handbook/survival-knowledge/dust-storms-and-solar-power'],
  spe: ['Solar particle event incoming! Shelter in the airlock before the radiation arrives.', 'handbook/survival-knowledge/radiation-at-curiosity'],
  night: ['Night falls. Temperatures drop far below freezing, so the heaters drain more power. Your helmet lamp is on.', 'handbook/survival-knowledge/temperatures-at-viking-1'],
  dusk: ['Martian sunsets glow blue: fine dust lets blue light pass near the Sun more easily than other colours.', 'handbook/discover-mars?c=atmosphere-temperature-gravity'],
  suit: ['Suit oxygen low! Mars air is about 95% CO2 at under 1% of Earth\'s pressure. Follow the orange arrow home.', 'handbook/survival-knowledge/oxygen-and-surface-pressure'],
  devil: ['Dust devil! These whirlwinds are real: rovers have filmed them crossing Martian plains. Keep your distance.', 'handbook/survival-knowledge/dust-storms-and-solar-power']
};

let game = null;
export function init(root) {
  destroy();
  const el = typeof root === 'string' ? document.querySelector(root) : root;
  if (el) game = new Game(el);
}
export function peek() { return game; }
export function destroy() { if (game) { game.stop(); game = null; } }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function sprite(rows, map, outline) {
  const w = rows[0].length, h = rows.length, o = outline ? 1 : 0;
  const cv = document.createElement('canvas'); cv.width = w + o * 2; cv.height = h + o * 2;
  const c = cv.getContext('2d');
  const each = fn => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') fn(x, y, (map && map[ch]) || ch); }));
  if (outline) { c.fillStyle = '#140804'; each((x, y) => { c.fillRect(x, y + 1, 3, 1); c.fillRect(x + 1, y, 1, 3); }); }
  each((x, y, ch) => { c.fillStyle = PAL[ch]; c.fillRect(x + o, y + o, 1, 1); });
  return cv;
}
function noise2(seed) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const p = new Float32Array(65536); for (let i = 0; i < p.length; i++) p[i] = rnd();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = p[(xi & 255) + ((yi & 255) << 8)], b = p[((xi + 1) & 255) + ((yi & 255) << 8)];
    const c = p[(xi & 255) + (((yi + 1) & 255) << 8)], d = p[((xi + 1) & 255) + (((yi + 1) & 255) << 8)];
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const GROUND_RGB = GROUND.map(hex);

class Game {
  constructor(root) {
    this.root = root; this.alive = true; this.keys = new Set(); this.muted = false; this.diffKey = 'engineer';
    const legs = (body, l) => body.concat(l);
    this.spr = {
      downA: sprite(legs(DOWN, LEGS_DOWN_A), null, true), downB: sprite(legs(DOWN, LEGS_DOWN_B), null, true),
      upA: sprite(legs(UP, LEGS_DOWN_A), null, true), upB: sprite(legs(UP, LEGS_DOWN_B), null, true),
      sideA: sprite(legs(SIDE, LEGS_SIDE_A), null, true), sideB: sprite(legs(SIDE, LEGS_SIDE_B), null, true),
      ice: sprite(ICE, null, true), sample: sprite(SAMPLE, null, true), part: sprite(PART, null, true)
    };
    this.dom();
    this.onKey = e => this.key(e);
    this.onBlur = () => this.keys.clear();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    window.addEventListener('blur', this.onBlur);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.stage);
    this.resize(); this.reset(); this.state = 'intro'; this.overlay('intro');
    this.loop = ts => {
      if (!this.alive) return;
      const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000); this.last = ts;
      this.anim += dt;
      if (this.state === 'play' && !this.paused) this.update(dt);
      else if (this.state === 'intro') this.time += dt * 0.6; // let the world breathe behind the brief
      this.render(dt); this.hud();
      this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.alive = false; cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('blur', this.onBlur);
    this.ro.disconnect(); clearTimeout(this.toastT);
    try { if (this.ac) this.ac.close(); } catch (e) { }
    this.root.innerHTML = '';
  }

  // ---------------------------------------------------------------- DOM
  dom() {
    const r = this.root; r.innerHTML = ''; r.classList.add('sg');
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    const top = el('div', 'sg-top mono');
    this.solEl = el('span'); this.goalEl = el('span'); this.bagEl = el('span');
    this.muteBtn = el('button', 'sg-mute mono', 'SOUND ON');
    this.muteBtn.addEventListener('click', () => { this.muted = !this.muted; this.muteBtn.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON'; });
    top.append(this.solEl, this.goalEl, this.bagEl, this.muteBtn);
    const bars = el('div', 'gbars'); this.bars = {};
    [['SUIT O2', 'suit', 'Your air. Refills in the airlock'], ['HEALTH', 'hp', 'Dust devils and radiation hurt'], ['HAB O2', 'ho2', 'Ice and MOXIE add oxygen'],
      ['WATER', 'water', 'Bring ice'], ['POWER', 'power', 'Sunlight and spare parts']].forEach(([lab, key, tip]) => {
      const b = el('div', 'gb'); b.title = tip;
      const i = el('i'); const u = el('u'); i.append(u); const em = el('em', 'mono');
      b.append(el('span', 'mono', lab), i, em); bars.append(b); this.bars[key] = { u, em };
    });
    const main = el('div', 'sg-main');
    this.stage = el('div', 'sg-stage');
    this.cv = el('canvas'); this.ctx = this.cv.getContext('2d');
    this.lc = document.createElement('canvas'); this.lctx = this.lc.getContext('2d');
    this.toastEl = el('div', 'sg-toast');
    this.overEl = el('div', 'sg-over');
    this.overEl.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      if (btn.dataset.diff) { this.diffKey = btn.dataset.diff; this.start(); }
      if (btn.dataset.act === 'start') this.start();
      if (btn.dataset.act === 'resume') this.pause(false);
    });
    const pad = el('div', 'sg-pad');
    [['arrowup', '▲'], ['arrowleft', '◀'], ['arrowdown', '▼'], ['arrowright', '▶'], ['e', 'SCAN']].forEach(([k, t]) => {
      const b = el('button', null, t); b.dataset.k = k;
      const on = e => { e.preventDefault(); if (this.state === 'play') { if (k === 'e') this.scan(); else this.keys.add(k); } };
      const off = e => { e.preventDefault(); this.keys.delete(k); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      pad.append(b);
    });
    this.stage.append(this.cv, this.toastEl, this.overEl, pad);

    const side = el('aside', 'sg-side');
    side.append(el('h4', 'mono', 'OBJECTIVES'));
    this.objEl = el('ol', 'sg-obj'); side.append(this.objEl);
    this.tipEl = el('div', 'sg-tip'); side.append(this.tipEl);
    side.append(el('h4', 'mono', 'FIELD GUIDE'));
    const leg = el('ul', 'sg-leg');
    const icon = cv => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; };
    [[this.spr.ice, 'Water ice', '+18 water, +6 habitat O2'], [this.spr.part, 'Spare parts', '+22 power'], [this.spr.sample, 'Rock sample', 'The mission goal'],
      [null, 'Airlock', 'Unload, refill your suit, shelter from radiation'], [null, 'Dust devil', '−12 health on contact'],
      [null, 'Storm / night', 'Solar panels weaken, power drains faster']].forEach(([cv, name, txt], i) => {
      const li = el('li');
      if (cv) li.append(icon(cv)); else { const d = el('i', 'sg-dot sg-dot' + i); li.append(d); }
      const t = el('div'); t.append(el('b', null, name), el('small', null, txt)); li.append(t); leg.append(li);
    });
    side.append(leg);
    side.append(el('div', 'sg-keys mono', 'WASD / ARROWS move · E or SPACE scan · P pause · R restart · M sound'));
    main.append(this.stage, side);
    r.append(top, bars, main);
  }

  resize() {
    const w = Math.max(280, this.stage.clientWidth | 0);
    const h = clamp(Math.round(window.innerHeight * 0.6), 320, 620);
    this.cv.width = w; this.cv.height = h; this.cv.style.height = h + 'px';
    this.lc.width = w; this.lc.height = h;
    this.S = w >= 760 ? 3 : 2;
    const vg = this.vig = document.createElement('canvas'); vg.width = w; vg.height = h;
    const v = vg.getContext('2d'), gr = v.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)'); v.fillStyle = gr; v.fillRect(0, 0, w, h);
  }

  key(e) {
    const k = (e.key || '').toLowerCase();
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const gameKey = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'e'].includes(k);
    if (gameKey && this.state === 'play') e.preventDefault();
    if (e.type === 'keyup') { this.keys.delete(k); return; }
    if (this.state === 'play' && (k === 'e' || k === ' ')) { if (!e.repeat) this.scan(); return; }
    if (gameKey) this.keys.add(k);
    if (k === 'enter' && this.state === 'intro') { e.preventDefault(); this.start(); }
    if (k === 'r' && this.state !== 'intro') this.start();
    if (k === 'p' && this.state === 'play') this.pause(!this.paused);
    if (k === 'm') { this.muted = !this.muted; this.muteBtn.textContent = this.muted ? 'SOUND OFF' : 'SOUND ON'; }
  }

  overlay(kind) {
    const o = this.overEl;
    if (!kind) { o.style.display = 'none'; o.innerHTML = ''; return; }
    o.style.display = 'flex';
    if (kind === 'intro') {
      const btns = Object.entries(DIFF).map(([k, d]) =>
        `<button class="sg-diff${k === this.diffKey ? ' on' : ''}" data-diff="${k}"><b>${d.name}</b><small>${d.note}</small></button>`).join('');
      o.innerHTML = `<div class="sg-card"><span class="ev ev-observed">MISSION BRIEF · SOL SURVIVAL</span>
        <h3>Walk the Martian surface. Bring the science home.</h3>
        <ol class="sg-steps">
          <li><b>Explore</b> with WASD or the arrow keys. Press <b>E</b> to scan for resources.</li>
          <li><b>Collect</b> by walking over them: <span style="color:#a9e2ff">ice</span> for water and oxygen, <span style="color:#ff7a3d">spare parts</span> for power, <span style="color:#f0c45c">rock samples</span> for science. Your bag holds 4.</li>
          <li><b>Return</b> to the airlock (orange arrow) to unload and refill your suit before its air runs out.</li>
        </ol>
        <p class="sg-small">Mars fights back: dust devils, dust storms, radiation alerts and freezing nights. Each hazard links to the real NASA data.</p>
        <div class="sg-diffs">${btns}</div></div>`;
    } else if (kind === 'pause') {
      o.innerHTML = `<div class="sg-card"><h3>Paused</h3><button class="btn primary" data-act="resume">Resume (P)</button></div>`;
    } else {
      const won = kind === 'won', d = DIFF[this.diffKey];
      const mins = Math.floor(this.played / 60), secs = Math.floor(this.played % 60).toString().padStart(2, '0');
      o.innerHTML = `<div class="sg-card"><span class="ev ${won ? 'ev-observed' : 'ev-proposed'}">${won ? 'MISSION COMPLETE' : 'MISSION LOST'} · ${d.name.toUpperCase()}</span>
        <h3>${won ? 'All samples are home' : this.reason}</h3>
        <div class="sg-stats mono">
          <div><b>${this.samples}/${d.goal}</b><small>SAMPLES</small></div><div><b>${this.got.ice}</b><small>ICE</small></div>
          <div><b>${this.got.part}</b><small>PARTS</small></div><div><b>${Math.round(this.walked / T * 2)} m</b><small>WALKED</small></div>
          <div><b>${mins}:${secs}</b><small>TIME</small></div><div><b>${this.sol()}</b><small>SOLS</small></div>
        </div>
        <p>${won ? 'The crew can study your samples. ' : ''}The real science behind this run:</p>
        <p class="learn">
          <a href="handbook/survival-knowledge/oxygen-and-surface-pressure">Oxygen and surface pressure</a>
          <a href="handbook/survival-knowledge/dust-storms-and-solar-power">Dust storms and solar power</a>
          <a href="handbook/survival-knowledge/radiation-at-curiosity">Radiation at Curiosity</a>
          <a href="handbook/survival-knowledge/temperatures-at-viking-1">Temperatures at Viking 1</a>
        </p>
        <button class="btn primary" data-act="start">Play again (R)</button></div>`;
    }
  }

  toast(key, force) {
    if (!force && this.seen.has(key)) return;
    this.seen.add(key);
    const [text, href] = FACTS[key];
    const el = this.toastEl; el.innerHTML = '';
    const p = document.createElement('p'); p.textContent = text; el.append(p);
    if (href) { const a = document.createElement('a'); a.href = href; a.className = 'mono'; a.textContent = 'READ THE NASA DATA →'; el.append(a); }
    el.classList.add('on'); clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('on'), 8000);
  }

  // ---------------------------------------------------------------- sound
  beep(f, d, type = 'square', vol = 0.04, slide = 0, delay = 0) {
    if (!this.ac || this.muted) return;
    try {
      const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) { }
  }

  // ---------------------------------------------------------------- world
  reset() {
    const d = this.diff = DIFF[this.diffKey];
    this.build();
    const { hx, hy } = this;
    this.px = (hx + 2) * T; this.py = (hy + 3) * T + 10; this.face = 'down'; this.flip = false; this.moving = false;
    this.suit = 100; this.hp = 100; this.ho2 = 75; this.water = 75; this.power = 75;
    this.bag = []; this.samples = 0; this.got = { ice: 0, part: 0, sample: 0 }; this.unloads = 0; this.scans = 0;
    this.time = SOL * 0.08; this.played = 0; this.anim = 0; this.inv = 0; this.nextEv = 40; this.storm = 0; this.speWarn = 0; this.spe = 0;
    this.seen = new Set(); this.paused = false; this.reason = ''; this.fullT = 0; this.inHab = false;
    this.walked = 0; this.stepAcc = 0; this.stepSide = 1; this.prints = []; this.parts = []; this.floats = [];
    this.shake = 0; this.hurtFlash = 0; this.scanT = -1; this.scanCd = 0; this.alarmT = 0; this.puffT = 0;
    this.dust = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() }));
  }

  start() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    this.reset(); this.state = 'play'; this.overlay(null);
    this.toastEl.classList.remove('on');
    this.beep(523, 0.08); this.beep(784, 0.12, 'square', 0.04, 0, 0.09);
  }
  pause(p) { this.paused = p; this.overlay(p ? 'pause' : null); }
  end(kind, reason) {
    this.state = kind; this.reason = reason || ''; this.keys.clear(); this.overlay(kind);
    if (kind === 'won') [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.18, 'square', 0.045, 0, i * 0.12));
    else this.beep(220, 0.6, 'sawtooth', 0.05, 0.4);
  }
  sol() { return Math.floor(this.time / SOL) + 1; }

  build() {
    const R = Math.random, g = this.grid = new Uint8Array(MW * MH); // 0 sand 1 rock 2 crater 3 habitat 4 panel 5 airlock 6 rover/MOXIE
    const hx = this.hx = 26, hy = this.hy = 17;
    const far = (x, y, d) => Math.hypot(x - (hx + 2), y - (hy + 1.5)) > d;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!x || !y || x === MW - 1 || y === MH - 1) g[y * MW + x] = 1;
    this.craters = [];
    for (let n = 0; n < 8; n++) {
      let cx, cy, t = 0;
      do { cx = 5 + R() * (MW - 10); cy = 5 + R() * (MH - 10); } while (!far(cx, cy, 11) && ++t < 80);
      const r = 2 + R() * 2.2; this.craters.push({ cx, cy, r });
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1 && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r * 0.82) g[y * MW + x] = 2;
    }
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (!g[y * MW + x] && far(x, y, 6) && R() < 0.06) g[y * MW + x] = 1;
    // rock fields: a few dense clusters make the map read as terrain, not noise
    for (let n = 0; n < 5; n++) {
      const cx = 4 + R() * (MW - 8), cy = 4 + R() * (MH - 8); if (!far(cx, cy, 9)) continue;
      for (let k = 0; k < 9; k++) { const x = Math.round(cx + (R() - 0.5) * 6), y = Math.round(cy + (R() - 0.5) * 5); if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1 && !g[y * MW + x]) g[y * MW + x] = 1; }
    }
    for (let y = hy - 3; y < hy + 7; y++) for (let x = hx - 6; x < hx + 9; x++) g[y * MW + x] = 0;
    for (let y = hy; y < hy + 3; y++) for (let x = hx; x < hx + 4; x++) g[y * MW + x] = (y > hy && (x === hx + 1 || x === hx + 2)) ? 5 : 3;
    for (let y = hy - 1; y < hy + 2; y++) for (let x = hx - 4; x < hx - 1; x++) g[y * MW + x] = 4;
    g[(hy + 1) * MW + hx + 5] = 6; g[(hy + 1) * MW + hx + 6] = 6; // rover
    g[(hy - 1) * MW + hx + 4] = 6; // MOXIE unit

    const reach = new Uint8Array(MW * MH), q = [(hy + 3) * MW + hx + 1]; reach[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % MW, y = (i / MW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * MW + x + dx;
        if (!reach[j] && (g[j] === 0 || g[j] === 5)) { reach[j] = 1; q.push(j); }
      }
    }
    const spots = []; for (let i = 0; i < MW * MH; i++) if (reach[i] && !g[i] && far(i % MW, (i / MW) | 0, 5)) spots.push(i);
    for (let i = spots.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const dist = i => Math.hypot(i % MW - (hx + 2), ((i / MW) | 0) - (hy + 1.5));
    const farSpots = spots.filter(i => dist(i) > 11), nearSpots = spots.filter(i => dist(i) <= 11);
    // ice likes crater rims
    const rim = spots.filter(i => this.craters.some(c => { const d = Math.hypot(i % MW + 0.5 - c.cx, ((i / MW) | 0) + 0.5 - c.cy); return d > c.r * 0.85 && d < c.r + 1.6; }));
    const used = new Set(), items = [];
    const put = (list, kind, n) => { for (const i of list) { if (!n) break; if (used.has(i)) continue; used.add(i); n--; items.push({ x: (i % MW) * T + 8, y: ((i / MW) | 0) * T + 8, kind, ph: R() * 6, seenT: 0 }); } };
    put(nearSpots.slice(0, 3), 'ice', 3); // a first easy target for the tutorial
    put(farSpots, 'sample', this.diff.goal + 5);
    put(rim.concat(nearSpots, farSpots), 'ice', 15); put(spots, 'part', 12);
    this.items = items;
    this.devils = [];
    for (const i of farSpots) { if (this.devils.length >= this.diff.devils) break; if (used.has(i) || dist(i) < 14) continue; this.devils.push({ x: (i % MW) * T + 8, y: ((i / MW) | 0) * T + 8, vx: 0, vy: 0, t: 0 }); }
    this.paint();
  }

  // Per-pixel terrain: layered value noise, dithering, dune ripples, crater bowls lit from the north-west.
  paint() {
    const g = this.grid, R = Math.random, { hx, hy } = this, Wp = MW * T, Hp = MH * T;
    const n1 = noise2((R() * 1e9) | 0), n2 = noise2((R() * 1e9) | 0);
    const off = new Float32Array(Wp * Hp);
    const Lx = -0.7071, Ly = -0.7071;
    for (const c of this.craters) {
      const cx = c.cx * T, cy = c.cy * T, r = c.r * T;
      for (let y = Math.max(0, Math.floor(cy - r * 1.6)); y < Math.min(Hp, cy + r * 1.6); y++)
        for (let x = Math.max(0, Math.floor(cx - r * 1.6)); x < Math.min(Wp, cx + r * 1.6); x++) {
          const dx = x - cx, dy = y - cy, dd = Math.hypot(dx, dy), d = dd / r; if (d > 1.6) continue;
          const nx = dd ? dx / dd : 0, ny = dd ? dy / dd : 0, ndl = nx * Lx + ny * Ly;
          let o;
          if (d < 0.62) o = -2.4 + n2(x / 6, y / 6) * 0.8;
          else if (d < 1) o = -1.6 - ndl * 2.4 * ((d - 0.62) / 0.38);
          else if (d < 1.2) o = 0.9 + ndl * 1.4;
          else o = (R() < 0.12 ? 0.9 : 0) * (1.6 - d) * 2.5;
          off[y * Wp + x] += o;
        }
    }
    const img = new ImageData(Wp, Hp), px = img.data;
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      const f = n1(x / 60, y / 60) * 0.55 + n1(x / 18 + 50, y / 18) * 0.3 + n2(x / 5, y / 5) * 0.15;
      const rip = Math.sin(x * 0.45 + y * 0.16 + n2(x / 30, y / 30) * 9);
      let v = 1.2 + f * 5.2 + BAYER[(y & 3) * 4 + (x & 3)] * 0.9 + off[y * Wp + x];
      if (f > 0.42 && f < 0.7) v += rip > 0.9 ? 0.9 : rip < -0.95 ? -0.8 : 0;
      const col = GROUND_RGB[clamp(Math.round(v), 0, 7)], i = (y * Wp + x) * 4;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
    }
    const cv = this.mapCv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp;
    const m = cv.getContext('2d'); m.putImageData(img, 0, 0);
    // pebbles
    for (let k = 0; k < 900; k++) {
      const x = (R() * Wp) | 0, y = (R() * Hp) | 0; if (g[((y / T) | 0) * MW + ((x / T) | 0)]) continue;
      m.fillStyle = 'rgba(40,14,6,.55)'; m.fillRect(x + 1, y + 1, 2, 1);
      m.fillStyle = ROCK[3 + ((R() * 2) | 0)]; m.fillRect(x, y, 2, 1); m.fillStyle = ROCK[5]; m.fillRect(x, y, 1, 1);
    }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (g[y * MW + x] === 1) this.rock(m, x * T, y * T, R);
    this.drawPanels(m, (hx - 4) * T, (hy - 1) * T);
    this.drawHab(m, hx * T, hy * T);
    this.drawRover(m, (hx + 5) * T, (hy + 1) * T);
    this.drawMoxie(m, (hx + 4) * T, (hy - 1) * T);
    // minimap
    const mini = this.miniCv = document.createElement('canvas'); mini.width = MW * 2; mini.height = MH * 2;
    const mm = mini.getContext('2d'); mm.imageSmoothingEnabled = true; mm.drawImage(cv, 0, 0, MW * 2, MH * 2);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const t = g[y * MW + x]; if (!t) continue;
      mm.fillStyle = t === 1 ? '#3a1a0c' : t === 2 ? '#22100a' : t === 4 ? '#3a6aa3' : '#e6e1d8'; mm.fillRect(x * 2, y * 2, 2, 2);
    }
  }

  rock(m, X, Y, R) {
    const cx = X + 8 + (R() - 0.5) * 2, cy = Y + 9 + (R() - 0.5) * 2, rx = 5.5 + R() * 2, ry = 4.6 + R() * 1.6;
    m.fillStyle = 'rgba(35,12,4,.45)';
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) m.fillRect(Math.round(cx + x + 2), Math.round(cy + y + 2), 1, 1);
    for (let y = Math.floor(-ry); y <= ry; y++) for (let x = Math.floor(-rx); x <= rx; x++) {
      const nx = x / rx, ny = y / ry, dd = nx * nx + ny * ny; if (dd > 1) continue;
      const z = Math.sqrt(1 - dd), light = -nx * 0.55 - ny * 0.65 + z * 0.55;
      let idx = dd > 0.8 ? 0 : clamp(Math.round(1.6 + light * 3 + (R() - 0.5) * 0.7), 1, 5);
      m.fillStyle = ROCK[idx]; m.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
    if (R() < 0.6) { m.fillStyle = ROCK[0]; m.fillRect(Math.round(cx - 1), Math.round(cy), 3, 1); m.fillRect(Math.round(cx + 1), Math.round(cy + 1), 1, 2); }
  }

  drawPanels(m, X, Y) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = X + c * 16, y = Y + r * 16;
      m.fillStyle = 'rgba(35,12,4,.45)'; m.fillRect(x + 3, y + 4, 14, 12);
      m.fillStyle = '#5a6067'; m.fillRect(x + 7, y + 12, 2, 4);
      m.fillStyle = '#1b2430'; m.fillRect(x + 1, y + 2, 14, 11);
      m.fillStyle = '#2d5288'; m.fillRect(x + 2, y + 3, 12, 9);
      m.fillStyle = '#3d6eb0'; m.fillRect(x + 2, y + 3, 12, 3);
      m.fillStyle = '#1f3d68'; for (let k = 1; k < 4; k++) m.fillRect(x + 2 + k * 3, y + 3, 1, 9); m.fillRect(x + 2, y + 7, 12, 1);
      m.fillStyle = '#9cc3f0'; m.fillRect(x + 3, y + 4, 2, 1);
    }
  }

  drawHab(m, X, Y) {
    m.fillStyle = 'rgba(35,12,4,.45)'; m.fillRect(X + 5, Y + 10, 64, 42);
    // body with soft shading
    const body = ['#efebe3', '#e2ddd3', '#d6d0c5', '#c6bfb3', '#b3ab9e'];
    for (let x = 0; x < 62; x++) { const i = x < 6 ? 0 : x < 40 ? 1 : x < 52 ? 2 : x < 58 ? 3 : 4; m.fillStyle = body[i]; m.fillRect(X + 1 + x, Y + 9, 1, 39); }
    m.fillStyle = '#a39b8e'; m.fillRect(X + 1, Y + 42, 62, 6);
    m.fillStyle = '#2a2f36'; m.fillRect(X, Y + 8, 1, 40); m.fillRect(X + 63, Y + 8, 1, 40); m.fillRect(X, Y + 47, 64, 1);
    // dome roof
    for (let r = 0; r < 10; r++) {
      const w = Math.round(30 * Math.sqrt(1 - ((9 - r) / 10) ** 2)) + 2, x0 = X + 32 - w;
      m.fillStyle = '#2a2f36'; m.fillRect(x0 - 1, Y + r, 1, 1); m.fillRect(x0 + w * 2, Y + r, 1, 1);
      for (let x = 0; x < w * 2; x++) { const t = x / (w * 2); m.fillStyle = t < 0.25 ? '#f7f5f0' : t < 0.75 ? '#e6e1d8' : '#cdc6ba'; m.fillRect(x0 + x, Y + r, 1, 1); }
    }
    m.fillStyle = '#2a2f36'; m.fillRect(X + 4, Y - 1, 56, 1);
    m.fillStyle = '#bdb6aa'; m.fillRect(X + 1, Y + 9, 62, 1);
    // ribs
    m.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 6; k++) m.fillRect(X + 6 + k * 10, Y + 10, 1, 32);
    // windows
    for (const wx of [X + 4, X + 51]) {
      m.fillStyle = '#2a2f36'; m.fillRect(wx, Y + 14, 10, 8);
      m.fillStyle = '#ffcf6b'; m.fillRect(wx + 1, Y + 15, 8, 6);
      m.fillStyle = '#ffe9b0'; m.fillRect(wx + 1, Y + 15, 3, 2);
      m.fillStyle = '#e0a940'; m.fillRect(wx + 1, Y + 20, 8, 1);
    }
    // airlock
    m.fillStyle = '#2a2f36'; m.fillRect(X + 15, Y + 14, 34, 34);
    for (let y = 0; y < 30; y++) { m.fillStyle = y < 4 ? '#3e444b' : y < 20 ? '#4d535a' : '#5a6067'; m.fillRect(X + 17, Y + 18 + y, 30, 1); }
    m.fillStyle = '#656b72'; for (let k = 0; k < 7; k++) m.fillRect(X + 17, Y + 21 + k * 4, 30, 1);
    for (let k = 0; k < 34; k += 4) { m.fillStyle = PAL.o; m.fillRect(X + 15 + k, Y + 14, 2, 3); m.fillStyle = '#1b1d20'; m.fillRect(X + 17 + k, Y + 14, 2, 3); }
    m.fillStyle = '#3ddc97'; m.fillRect(X + 45, Y + 20, 2, 2);
    // sign + roof vent
    m.fillStyle = '#2a2f36'; m.fillRect(X + 23, Y + 3, 18, 5);
    m.fillStyle = PAL.o; m.fillRect(X + 25, Y + 4, 3, 3); m.fillRect(X + 30, Y + 4, 3, 3); m.fillRect(X + 35, Y + 4, 3, 3);
    // antenna dish
    m.fillStyle = '#8d939a'; m.fillRect(X + 56, Y - 10, 1, 12);
    m.fillStyle = '#d6d0c5'; m.fillRect(X + 52, Y - 13, 9, 2); m.fillRect(X + 53, Y - 11, 7, 1);
    m.fillStyle = '#ff5a1f'; m.fillRect(X + 56, Y - 15, 1, 2);
  }

  drawRover(m, X, Y) {
    m.fillStyle = 'rgba(35,12,4,.45)'; m.fillRect(X + 3, Y + 9, 30, 8);
    m.fillStyle = '#1b1d20'; for (const wx of [X + 2, X + 10, X + 20, X + 28]) m.fillRect(wx, Y + 9, 5, 6);
    m.fillStyle = '#5a6067'; for (const wx of [X + 3, X + 11, X + 21, X + 29]) m.fillRect(wx, Y + 10, 3, 3);
    m.fillStyle = '#2a2f36'; m.fillRect(X + 3, Y + 3, 28, 8);
    m.fillStyle = '#e6e1d8'; m.fillRect(X + 4, Y + 4, 26, 6);
    m.fillStyle = '#c6bfb3'; m.fillRect(X + 4, Y + 8, 26, 2);
    m.fillStyle = PAL.o; m.fillRect(X + 4, Y + 6, 26, 1);
    m.fillStyle = '#16233a'; m.fillRect(X + 22, Y + 4, 7, 3); m.fillStyle = '#6fa8dc'; m.fillRect(X + 23, Y + 4, 2, 1);
    m.fillStyle = '#8d939a'; m.fillRect(X + 8, Y - 4, 1, 8); m.fillRect(X + 6, Y - 5, 5, 2);
  }

  drawMoxie(m, X, Y) {
    m.fillStyle = 'rgba(35,12,4,.45)'; m.fillRect(X + 4, Y + 6, 12, 10);
    m.fillStyle = '#2a2f36'; m.fillRect(X + 2, Y + 3, 12, 11);
    m.fillStyle = '#c9a54a'; m.fillRect(X + 3, Y + 4, 10, 9);
    m.fillStyle = '#e3c46a'; m.fillRect(X + 3, Y + 4, 10, 2);
    m.fillStyle = '#2a2f36'; m.fillRect(X + 5, Y + 8, 6, 1); m.fillRect(X + 5, Y + 10, 6, 1);
    m.fillStyle = '#5a6067'; m.fillRect(X + 10, Y, 2, 4);
  }

  solid(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    const t = this.grid[ty * MW + tx]; return t !== 0 && t !== 5;
  }
  tile(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 1;
    return this.grid[ty * MW + tx];
  }
  blocked(x, y, noAirlock) {
    for (const [ox, oy] of [[-5, -4], [5, -4], [-5, 3], [5, 3]]) {
      if (this.solid(x + ox, y + oy)) return true;
      if (noAirlock && this.tile(x + ox, y + oy) === 5) return true;
    }
    return false;
  }

  scan() {
    if (this.scanCd > 0) { this.float(this.px, this.py - 22, 'SCANNER ' + Math.ceil(this.scanCd) + 's', '#838891'); return; }
    this.scanT = 0; this.scanCd = 5; this.scans++;
    let n = 0;
    for (const it of this.items) if (!it.taken && Math.hypot(it.x - this.px, it.y - this.py) < 170) { it.seenT = 5; n++; }
    this.float(this.px, this.py - 22, n ? n + ' FOUND' : 'NOTHING NEARBY', '#bfeaff');
    this.beep(300, 0.45, 'sine', 0.05, 3);
  }
  float(x, y, text, col) { this.floats.push({ x, y, text, col, t: 0 }); }
  burst(x, y, col, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50; this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, t: 0, life: 0.5 + Math.random() * 0.4, col, size: 1 + (Math.random() < 0.3) }); }
  }

  // ---------------------------------------------------------------- simulation
  update(dt) {
    const k = this.keys, d = this.diff;
    this.played += dt;
    let dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    let dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
    this.moving = !!(dx || dy);
    if (this.moving) {
      const len = Math.hypot(dx, dy), sp = 76, ox = this.px, oy = this.py;
      const mx = dx / len * sp * dt, my = dy / len * sp * dt;
      if (!this.blocked(this.px + mx, this.py)) this.px += mx;
      if (!this.blocked(this.px, this.py + my)) this.py += my;
      if (dx) { this.face = 'side'; this.flip = dx < 0; } else this.face = dy < 0 ? 'up' : 'down';
      const moved = Math.hypot(this.px - ox, this.py - oy); this.walked += moved; this.stepAcc += moved;
      if (this.stepAcc > 7) {
        this.stepAcc = 0; this.stepSide *= -1;
        const nx = -my / (Math.hypot(mx, my) || 1), ny = mx / (Math.hypot(mx, my) || 1);
        if (this.tile(this.px, this.py) === 0) this.prints.push({ x: this.px + nx * 2 * this.stepSide, y: this.py + 2 + ny * 2 * this.stepSide, t: 0 });
        if (this.prints.length > 260) this.prints.shift();
        if (Math.random() < 0.7) this.parts.push({ x: this.px, y: this.py + 2, vx: -mx / dt * 0.2 + (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 8, t: 0, life: 0.6, col: '#d9a06b', size: 1 });
      }
    }
    const inHab = this.inHab = this.tile(this.px, this.py) === 5;

    // pick up
    this.fullT -= dt;
    for (const it of this.items) {
      if (it.taken || Math.hypot(it.x - this.px, it.y - (this.py - 4)) > 12) continue;
      if (this.bag.length >= CAP) { if (this.fullT <= 0) { this.float(this.px, this.py - 24, 'BAG FULL', '#f5c542'); this.fullT = 3; } break; }
      it.taken = true; this.bag.push(it.kind); this.toast(it.kind); this.got[it.kind] = (this.got[it.kind] || 0);
      this.burst(it.x, it.y, KIND[it.kind].color, 14);
      this.float(it.x, it.y - 10, it.kind === 'sample' ? '+SAMPLE' : it.kind === 'ice' ? '+ICE' : '+PARTS', KIND[it.kind].color);
      this.beep(660, 0.07); this.beep(990, 0.1, 'square', 0.04, 0, 0.07);
    }

    if (inHab) {
      if (this.bag.length) {
        let w = 0, o = 0, p = 0, s = 0;
        for (const b of this.bag) {
          if (b === 'ice') { this.water += 18; this.ho2 += 6; this.got.ice++; w += 18; o += 6; }
          else if (b === 'part') { this.power += 22; this.got.part++; p += 22; }
          else { this.samples++; s++; }
        }
        this.bag = []; this.unloads++;
        let yy = this.py - 26;
        if (s) { this.float(this.px, yy, `SAMPLES ${this.samples}/${d.goal}`, KIND.sample.color); yy -= 10; }
        if (w) { this.float(this.px, yy, `+${w} WATER +${o} O2`, KIND.ice.color); yy -= 10; }
        if (p) { this.float(this.px, yy, `+${p} POWER`, KIND.part.color); }
        [523, 659, 784].forEach((f, i) => this.beep(f, 0.1, 'square', 0.04, 0, i * 0.08));
      }
      this.suit = Math.min(100, this.suit + 40 * dt); this.hp = Math.min(100, this.hp + 2.5 * dt);
      this.seen.delete('suit');
    } else {
      this.suit -= 100 / d.suit * dt;
      if (this.suit < 28) this.toast('suit');
    }

    // habitat life support
    const phase = (this.time % SOL) / SOL, night = phase > 0.7 || phase < 0.04;
    if (phase > 0.6 && phase < 0.7) this.toast('dusk');
    if (night) this.toast('night');
    if (phase > 0.1 && phase < 0.2) { this.seen.delete('night'); }
    this.time += dt;
    const dr = d.drain;
    this.water -= 0.24 * dr * dt; this.ho2 -= 0.27 * dr * dt;
    this.power -= (0.2 + (night ? 0.18 : 0) + (this.storm > 0 ? 0.22 : 0)) * dr * dt;
    if (this.power > 5) { this.ho2 += 0.19 * dt; this.power -= 0.07 * dt; } // MOXIE turns CO2 into O2
    if (!night && this.storm <= 0) this.power += 0.24 * dt; // solar panels
    this.water = Math.min(100, this.water); this.ho2 = Math.min(100, this.ho2); this.power = Math.min(100, this.power);

    // events
    this.nextEv -= dt;
    if (this.nextEv <= 0) {
      this.nextEv = 34 + Math.random() * 18;
      if (Math.random() < 0.5) { this.storm = 24; this.toast('storm', true); this.beep(110, 0.8, 'sawtooth', 0.03, 0.7); }
      else { this.speWarn = 12; this.toast('spe', true); }
    }
    if (this.storm > 0) this.storm -= dt;
    if (this.speWarn > 0) {
      this.speWarn -= dt; this.alarmT -= dt;
      if (this.alarmT <= 0) { this.alarmT = 1; this.beep(880, 0.12, 'square', 0.035); this.beep(660, 0.12, 'square', 0.035, 0, 0.14); }
      if (this.speWarn <= 0) this.spe = 14;
    }
    if (this.spe > 0) { this.spe -= dt; if (!inHab) { this.hp -= 4.5 * dt; if (Math.random() < 0.3) this.parts.push({ x: this.px + (Math.random() - 0.5) * 30, y: this.py - 30, vx: 0, vy: 60, t: 0, life: 0.4, col: '#ff4d4d', size: 1 }); } }

    // dust devils
    this.inv -= dt;
    for (const dv of this.devils) {
      dv.t -= dt;
      if (dv.t <= 0) {
        const toward = Math.random() < 0.35 && Math.hypot(this.px - dv.x, this.py - dv.y) < 160;
        const a = toward ? Math.atan2(this.py - dv.y, this.px - dv.x) : Math.random() * Math.PI * 2;
        const sp = 26 + (this.storm > 0 ? 14 : 0); dv.vx = Math.cos(a) * sp; dv.vy = Math.sin(a) * sp; dv.t = 1.4 + Math.random() * 2.4;
      }
      const nx = dv.x + dv.vx * dt, ny = dv.y + dv.vy * dt;
      if (!this.blocked(nx, ny, true)) { dv.x = nx; dv.y = ny; } else dv.t = 0;
      if (Math.random() < 0.25) this.parts.push({ x: dv.x + (Math.random() - 0.5) * 8, y: dv.y, vx: (Math.random() - 0.5) * 20, vy: -10, t: 0, life: 0.7, col: '#c98a5a', size: 1 });
      const dd = Math.hypot(dv.x - this.px, dv.y - this.py);
      if (dd < 60) this.toast('devil');
      if (this.inv <= 0 && !inHab && dd < 11) {
        this.hp -= 12; this.inv = 1.3; this.shake = 0.35; this.hurtFlash = 0.4;
        this.float(this.px, this.py - 24, '−12 HEALTH', '#ff4d4d'); this.beep(160, 0.25, 'sawtooth', 0.06, 0.5);
        const a = Math.atan2(this.py - dv.y, this.px - dv.x);
        for (let s = 0; s < 8; s++) { const bx = this.px + Math.cos(a) * 3, by = this.py + Math.sin(a) * 3; if (!this.blocked(bx, by)) { this.px = bx; this.py = by; } }
      }
    }

    // effects
    for (const p of this.prints) p.t += dt * (this.storm > 0 ? 5 : 1);
    while (this.prints.length && this.prints[0].t > 40) this.prints.shift();
    this.scanCd -= dt; if (this.scanT >= 0) { this.scanT += dt; if (this.scanT > 1.2) this.scanT = -1; }
    for (const it of this.items) if (it.seenT > 0) it.seenT -= dt;
    this.shake = Math.max(0, this.shake - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.puffT -= dt;
    if (this.puffT <= 0 && this.power > 5) { this.puffT = 0.5; this.parts.push({ x: (this.hx + 4) * T + 11, y: (this.hy - 1) * T, vx: 4 + Math.random() * 4, vy: -14, t: 0, life: 1.6, col: '#e8e4dc', size: 2, fade: true }); }

    if (this.samples >= d.goal) return this.end('won');
    if (this.suit <= 0) return this.end('lost', 'Suit oxygen ran out');
    if (this.hp <= 0) return this.end('lost', 'The astronaut was injured');
    if (this.ho2 <= 0) return this.end('lost', 'Habitat oxygen ran out');
    if (this.water <= 0) return this.end('lost', 'Habitat water ran out');
    if (this.power <= 0) return this.end('lost', 'Habitat power failed');
  }

  target() {
    if (this.spe > 0 || this.speWarn > 0 || this.bag.length >= CAP || this.suit < 35) return null;
    let best = null, bd = 1e9;
    for (const it of this.items) {
      if (it.taken || it.kind !== 'sample') continue;
      const dd = Math.hypot(it.x - this.px, it.y - this.py); if (dd < bd) { bd = dd; best = it; }
    }
    return best;
  }

  // ---------------------------------------------------------------- drawing
  render(dt) {
    const c = this.ctx, cw = this.cv.width, ch = this.cv.height, S = this.S;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = '#050607'; c.fillRect(0, 0, cw, ch);
    const vw = cw / S, vh = ch / S, mwp = MW * T, mhp = MH * T;
    const camX = vw >= mwp ? (mwp - vw) / 2 : clamp(this.px - vw / 2, 0, mwp - vw);
    const camY = vh >= mhp ? (mhp - vh) / 2 : clamp(this.py - vh / 2, 0, mhp - vh);
    const sh = this.shake > 0 ? 4 * this.shake / 0.35 : 0;
    const ox = -Math.round(camX * S) + Math.round((Math.random() - 0.5) * sh * 2), oy = -Math.round(camY * S) + Math.round((Math.random() - 0.5) * sh * 2);
    const toScreen = (x, y) => [x * S + ox, y * S + oy];
    c.setTransform(S, 0, 0, S, ox, oy); c.imageSmoothingEnabled = false;
    c.drawImage(this.mapCv, 0, 0);

    // footprints
    for (const p of this.prints) { c.fillStyle = `rgba(70,24,8,${0.4 * (1 - p.t / 40)})`; c.fillRect(Math.round(p.x) - 1, Math.round(p.y), 2, 1); }
    // solar panel sheen
    const sheen = (this.anim * 30) % 120 - 20;
    c.fillStyle = 'rgba(200,225,255,.18)';
    for (let r = 0; r < 3; r++) { const x = (this.hx - 4) * T + sheen, y = (this.hy - 1) * T + r * 16 + 3; if (sheen > 0 && sheen < 46) c.fillRect(x, y, 2, 9); }
    // items
    for (const it of this.items) {
      if (it.taken) continue;
      const sp = this.spr[it.kind], bob = Math.round(Math.sin(this.anim * 3 + it.ph) * 1.5), pulse = 0.5 + 0.5 * Math.sin(this.anim * 4 + it.ph);
      c.globalAlpha = 0.18 + 0.14 * pulse + (it.seenT > 0 ? 0.25 : 0); c.fillStyle = KIND[it.kind].color;
      c.beginPath(); c.ellipse(it.x, it.y + 4, 8 + pulse * 2, 3.5 + pulse, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.drawImage(sp, Math.round(it.x - sp.width / 2), Math.round(it.y - sp.height / 2 - 3 + bob));
      if (Math.floor(this.anim * 3 + it.ph) % 5 === 0) { c.fillStyle = '#fff'; c.fillRect(Math.round(it.x - 2 + (it.ph % 3)), Math.round(it.y - 7 + bob), 1, 1); }
    }
    // dust devils
    for (const dv of this.devils) {
      c.fillStyle = 'rgba(40,14,6,.3)'; c.beginPath(); c.ellipse(dv.x, dv.y + 2, 7, 2.5, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 14; i++) {
        const a = this.anim * 10 + i * 0.85, r = 1.5 + i * 0.75;
        c.fillStyle = i % 3 === 0 ? '#e8b98a' : i % 3 === 1 ? '#c98a5a' : '#a86a40';
        c.fillRect(Math.round(dv.x + Math.cos(a) * r), Math.round(dv.y - i * 1.8 + Math.sin(a) * r * 0.35), 2, 2);
      }
    }
    // player
    if (!(this.inv > 0 && Math.floor(this.anim * 14) % 2)) {
      const step = this.moving && Math.floor(this.anim * 8) % 2;
      const sp = this.spr[this.face + (step ? 'B' : 'A')];
      const bob = this.moving ? 0 : Math.round(Math.sin(this.anim * 2.5) * 0.5);
      const x = Math.round(this.px - sp.width / 2), y = Math.round(this.py - sp.height + 4) + bob;
      c.fillStyle = 'rgba(30,10,4,.4)'; c.beginPath(); c.ellipse(this.px + 1, this.py + 4, 6, 2.2, 0, 0, Math.PI * 2); c.fill();
      if (this.flip) { c.save(); c.translate(x + sp.width, y); c.scale(-1, 1); c.drawImage(sp, 0, 0); c.restore(); }
      else c.drawImage(sp, x, y);
      for (let i = 0; i < this.bag.length; i++) { c.fillStyle = '#140804'; c.fillRect(x + 1 + i * 3, y - 5, 4, 4); c.fillStyle = KIND[this.bag[i]].color; c.fillRect(x + 2 + i * 3, y - 4, 2, 2); }
    }
    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.t += dt; if (p.t > p.life) { this.parts.splice(i, 1); continue; }
      if (this.state === 'play' && !this.paused) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.fade ? -2 : 40) * dt; }
      c.globalAlpha = 1 - p.t / p.life; c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    c.globalAlpha = 1;
    // scan ring
    if (this.scanT >= 0) {
      c.strokeStyle = `rgba(191,234,255,${1 - this.scanT / 1.2})`; c.lineWidth = 1;
      c.beginPath(); c.arc(this.px, this.py, this.scanT / 1.2 * 170, 0, Math.PI * 2); c.stroke();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);

    // ---- light: dusk tint, night darkness with helmet lamp and habitat glow
    const phase = (this.time % SOL) / SOL;
    const dusk = phase > 0.58 && phase < 0.72 ? Math.sin((phase - 0.58) / 0.14 * Math.PI) : 0;
    const dark = phase < 0.04 ? 1 - phase / 0.04 : phase < 0.66 ? 0 : phase < 0.74 ? (phase - 0.66) / 0.08 : phase < 0.97 ? 1 : 1 - (phase - 0.97) / 0.03;
    if (dusk > 0) { c.fillStyle = `rgba(70,110,190,${0.22 * dusk})`; c.fillRect(0, 0, cw, ch); }
    const darkness = Math.max(dark * 0.78, this.storm > 0 ? 0.25 : 0);
    if (darkness > 0.01) {
      const l = this.lctx; l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, cw, ch);
      l.fillStyle = `rgba(4,6,22,${darkness})`; l.fillRect(0, 0, cw, ch);
      l.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => { const gr = l.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = gr; l.fillRect(x - r, y - r, r * 2, r * 2); };
      const [sx, sy] = toScreen(this.px, this.py - 6);
      const fx = this.face === 'side' ? (this.flip ? -1 : 1) : 0, fy = this.face === 'up' ? -1 : this.face === 'down' ? 1 : 0;
      hole(sx, sy, 22 * S, 0.95); hole(sx + fx * 30 * S, sy + fy * 30 * S, 42 * S, 0.85);
      const [hx, hy] = toScreen((this.hx + 2) * T, (this.hy + 2) * T); hole(hx, hy, 46 * S, 0.9);
      for (const wx of [this.hx * T + 9, this.hx * T + 56]) { const [a, b] = toScreen(wx, this.hy * T + 18); hole(a, b, 14 * S, 0.8); }
      for (const it of this.items) if (!it.taken && it.kind === 'ice') { const [a, b] = toScreen(it.x, it.y); if (a > -40 && b > -40 && a < cw + 40 && b < ch + 40) hole(a, b, 9 * S, 0.6); }
      c.drawImage(this.lc, 0, 0);
      if (dark > 0.3) { c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(sx + fx * 26 * S, sy + fy * 26 * S, 0, sx + fx * 26 * S, sy + fy * 26 * S, 40 * S); gr.addColorStop(0, `rgba(255,200,140,${0.1 * dark})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); c.globalCompositeOperation = 'source-over'; }
    }
    // storm
    if (this.storm > 0) {
      const a = Math.min(1, this.storm / 3, (24 - this.storm) / 3 + 0.2);
      const [sx, sy] = toScreen(this.px, this.py);
      const gr = c.createRadialGradient(sx, sy, 40 * S, sx, sy, Math.max(cw, ch) * 0.7);
      gr.addColorStop(0, `rgba(170,95,50,${0.25 * a})`); gr.addColorStop(1, `rgba(150,80,40,${0.8 * a})`);
      c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
      c.fillStyle = `rgba(235,180,130,${0.6 * a})`;
      for (const p of this.dust) {
        if (this.state === 'play' && !this.paused) { p.x = (p.x + 0.006 * p.s) % 1; p.y = (p.y + 0.0016 * p.s + Math.sin(this.anim + p.s * 9) * 0.0006 + 1) % 1; }
        c.fillRect(Math.round(p.x * cw), Math.round(p.y * ch), Math.max(2, Math.round(6 * p.s)), 1);
      }
    }
    c.drawImage(this.vig, 0, 0);
    if (this.hurtFlash > 0) { c.fillStyle = `rgba(255,40,40,${this.hurtFlash * 0.45})`; c.fillRect(0, 0, cw, ch); }
    if (this.spe > 0 || this.speWarn > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.anim * 8);
      const col = this.spe > 0 ? (this.inHab ? 'rgba(61,220,151,.8)' : `rgba(255,77,77,${0.5 + 0.4 * pulse})`) : `rgba(245,197,66,${0.35 + 0.45 * pulse})`;
      c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(3, 3, cw - 6, ch - 6);
    }

    // ---- labels in screen space (stay crisp and readable)
    c.font = '600 11px "JetBrains Mono", ui-monospace, monospace'; c.textAlign = 'center';
    const label = (x, y, text, col) => {
      const w = c.measureText(text).width + 10;
      c.fillStyle = 'rgba(5,6,7,.78)'; c.fillRect(Math.round(x - w / 2), Math.round(y - 11), Math.round(w), 15);
      c.fillStyle = col; c.fillText(text, Math.round(x), Math.round(y));
    };
    if (this.state === 'play') {
      for (const it of this.items) {
        if (it.taken) continue;
        const dd = Math.hypot(it.x - this.px, it.y - this.py);
        if (dd < 46) { const [a, b] = toScreen(it.x, it.y - 12); label(a, b, KIND[it.kind].label, KIND[it.kind].color); }
        else if (it.seenT > 0) { const [a, b] = toScreen(it.x, it.y - 14); c.fillStyle = KIND[it.kind].color; c.beginPath(); c.moveTo(a, b + 5); c.lineTo(a - 4, b); c.lineTo(a + 4, b); c.closePath(); c.fill(); }
      }
      const [ax, ay] = toScreen((this.hx + 2) * T, this.hy * T - 6);
      if (Math.hypot((this.hx + 2) * T - this.px, (this.hy + 2) * T - this.py) < 90) label(ax, ay, this.inHab ? 'AIRLOCK · UNLOADING & REFILLING' : 'AIRLOCK ▼', this.inHab ? '#3ddc97' : '#ff8a52');
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]; f.t += dt; if (f.t > 1.6) { this.floats.splice(i, 1); continue; }
      const [a, b] = toScreen(f.x, f.y - f.t * 14); c.globalAlpha = Math.min(1, 2 - f.t * 1.25);
      c.font = '700 12px "JetBrains Mono", ui-monospace, monospace'; c.fillStyle = '#050607'; c.fillText(f.text, a + 1, b + 1); c.fillStyle = f.col; c.fillText(f.text, a, b);
      c.globalAlpha = 1;
    }

    // ---- guidance arrows around the astronaut
    if (this.state === 'play') {
      const [px, py] = toScreen(this.px, this.py - 8);
      const arrow = (tx, ty, col, text) => {
        const [sx, sy] = toScreen(tx, ty), a = Math.atan2(sy - py, sx - px), dist = Math.hypot(tx - this.px, ty - this.py);
        if (dist < 40) return;
        const r = 26 * S / 1.5;
        c.save(); c.translate(px + Math.cos(a) * r, py + Math.sin(a) * r); c.rotate(a);
        c.fillStyle = '#050607'; c.beginPath(); c.moveTo(11, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(9, 0); c.lineTo(-4, -6); c.lineTo(-4, 6); c.closePath(); c.fill(); c.restore();
        c.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        const lx = px + Math.cos(a) * (r + 22), ly = py + Math.sin(a) * (r + 22) + 4;
        c.fillStyle = '#050607'; c.fillText(text + ' ' + Math.round(dist / T * 2) + 'm', lx + 1, ly + 1); c.fillStyle = col; c.fillText(text + ' ' + Math.round(dist / T * 2) + 'm', lx, ly);
      };
      const tg = this.target();
      const needHome = this.bag.length > 0 || this.suit < 50 || this.spe > 0 || this.speWarn > 0;
      if (!this.inHab && needHome) arrow((this.hx + 2) * T, (this.hy + 2) * T, '#ff5a1f', 'HAB');
      if (tg) arrow(tg.x, tg.y, '#f0c45c', 'SAMPLE');
    }

    // ---- minimap
    const mw = MW * 2, mh = MH * 2, mx = cw - mw - 10, my = 10;
    c.fillStyle = 'rgba(5,6,7,.7)'; c.fillRect(mx - 4, my - 4, mw + 8, mh + 18);
    c.globalAlpha = 0.9; c.drawImage(this.miniCv, mx, my); c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.strokeRect(Math.round(mx + camX / T * 2) + 0.5, Math.round(my + camY / T * 2) + 0.5, Math.round(vw / T * 2), Math.round(vh / T * 2));
    for (const it of this.items) if (!it.taken) { c.fillStyle = KIND[it.kind].color; c.fillRect(mx + Math.floor(it.x / T) * 2, my + Math.floor(it.y / T) * 2, 2, 2); }
    c.fillStyle = '#ff4d4d'; for (const dv of this.devils) c.fillRect(Math.round(mx + dv.x / T * 2 - 1), Math.round(my + dv.y / T * 2 - 1), 2, 2);
    c.fillStyle = '#ff5a1f'; c.fillRect(mx + (this.hx + 1) * 2, my + (this.hy + 1) * 2, 4, 3);
    if (Math.floor(this.anim * 4) % 2) { c.fillStyle = '#fff'; c.fillRect(Math.round(mx + this.px / T * 2 - 1), Math.round(my + this.py / T * 2 - 1), 3, 3); }
    c.font = '600 9px "JetBrains Mono", ui-monospace, monospace'; c.textAlign = 'left'; c.fillStyle = '#838891';
    c.fillText('MAP', mx, my + mh + 11);

    // ---- centre warnings
    if (this.state === 'play') {
      let warn = null, col = '#ff4d4d';
      if (this.spe > 0 && !this.inHab) warn = 'RADIATION · GET INTO THE AIRLOCK';
      else if (this.spe > 0) { warn = 'SHELTERED FROM RADIATION · ' + Math.ceil(this.spe) + 's'; col = '#3ddc97'; }
      else if (this.speWarn > 0) { warn = 'RADIATION ARRIVES IN ' + Math.ceil(this.speWarn) + 's · HEAD TO THE AIRLOCK'; col = '#f5c542'; }
      else if (this.suit < 25 && !this.inHab) warn = 'SUIT O2 LOW · FOLLOW THE ORANGE ARROW';
      if (warn && (Math.floor(this.anim * 3) % 3 !== 0 || col === '#3ddc97')) {
        c.font = '700 13px "JetBrains Mono", ui-monospace, monospace'; c.textAlign = 'center';
        const w = c.measureText(warn).width + 24;
        c.fillStyle = 'rgba(5,6,7,.85)'; c.fillRect(cw / 2 - w / 2, 14, w, 26); c.strokeStyle = col; c.strokeRect(cw / 2 - w / 2 + 0.5, 14.5, w - 1, 25);
        c.fillStyle = col; c.fillText(warn, cw / 2, 32);
      }
    }
  }

  hud() {
    const d = this.diff, phase = (this.time % SOL) / SOL, night = phase > 0.7 || phase < 0.04;
    const hrs = Math.floor(phase * 24.6), mins = Math.floor((phase * 24.6 - hrs) * 60);
    this.solEl.textContent = `SOL ${this.sol()} · ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${night ? 'NIGHT' : phase > 0.58 ? 'DUSK' : 'DAY'}${this.storm > 0 ? ' · DUST STORM' : ''}`;
    this.goalEl.textContent = `SAMPLES ${this.samples}/${d.goal}`;
    this.bagEl.textContent = 'BAG ' + Array.from({ length: CAP }, (_, i) => this.bag[i] ? '■' : '□').join('') + ` ${this.bag.length}/${CAP}`;
    for (const key in this.bars) {
      const v = Math.max(0, Math.round(this[key])), b = this.bars[key];
      b.u.style.width = v + '%'; b.u.className = v < 25 ? 'bad' : v < 50 ? 'mid' : 'ok'; b.em.textContent = v;
    }
    // objectives
    const steps = [
      ['Move with WASD or the arrow keys', this.walked > 40],
      ['Pick up a blue ice crystal', this.got.ice > 0 || this.bag.includes('ice')],
      ['Unload at the airlock (orange arrow)', this.unloads > 0],
      ['Press E to scan for resources', this.scans > 0],
      [`Bring home ${d.goal} rock samples (${this.samples}/${d.goal})`, this.samples >= d.goal]
    ];
    const cur = steps.findIndex(s => !s[1]);
    const html = steps.map((s, i) => `<li class="${s[1] ? 'done' : i === cur ? 'cur' : ''}">${s[0]}</li>`).join('');
    if (html !== this._obj) { this.objEl.innerHTML = html; this._obj = html; }
    // context tip
    let tip;
    if (this.state !== 'play') tip = 'Pick a difficulty to begin. Cadet is a good first run.';
    else if (this.spe > 0 && !this.inHab) tip = 'Radiation! The airlock shields you. Get inside now.';
    else if (this.speWarn > 0) tip = 'A solar particle event is coming. Walk back to the airlock and wait it out.';
    else if (this.suit < 30 && !this.inHab) tip = 'Your suit is almost out of air. Follow the orange arrow to the airlock.';
    else if (this.bag.length >= CAP) tip = 'Bag full. Unload at the airlock to use what you carry.';
    else if (this.water < 30 || this.ho2 < 30) tip = 'Habitat water or oxygen is low. Bring blue ice crystals.';
    else if (this.power < 30) tip = 'Habitat power is low. Bring orange spare-part crates.';
    else if (this.storm > 0) tip = 'Dust storm: solar panels are covered and dust devils speed up.';
    else if (night) tip = 'Night: power drains faster. Your helmet lamp lights the way.';
    else if (this.inHab) tip = 'In the airlock: suit refilling and health recovering. Head out when ready.';
    else tip = 'Gold samples are the goal. Ice and parts keep the habitat alive.';
    if (tip !== this._tip) { this.tipEl.textContent = tip; this._tip = tip; }
  }
}
