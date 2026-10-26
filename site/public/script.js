// RORUBARU · Live Hand-Roll Counter
// A real-time miniature of the Wan Chai bar, built from the premises floor plan
// (26 seats around a U-shaped counter, DJ booth at the glass shopfront, entrance
// and reception front-left, open kitchen at the back, washrooms on the right).
//
// LIVE DATA: the scene runs a simulation by default. Real numbers plug in three ways
// (see LIVE below): ?feed=<url-to-json> polled every 20 s, a postMessage from the page
// that embeds this iframe, or window.RORUBARU_LIVE.set({...}) from code on this page.
// Shape: { rolls_today, queue, seats_filled, dj } — any subset. (wait_min is accepted but not shown:
// no wait time is displayed until a real queue count exists.) Until real data arrives the on-screen
// stats are labelled DEMO.

import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { buildCity, Path } from './city.js?v=w47';
import { hkStatus } from './hours.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const COMPACT = params.has('compact');

// ---------- seeded random (deterministic loop, same scene every load) ----------
let _seed = 20260321;
function rand() { _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- brand ----------
const ORANGE = 0xF64501, CREAM = 0xF6F3E7;

// ---------- layout (metres; x = along Queen's Road East frontage → east, z = toward the back wall is −z) ----------
// v47 (Oct 15 2026): every number below is measured off Dominic's Wan Chai floor plan (1 px = 4.59 mm on the
// 4099 px drawing), with the glass line at x = −7.4 and the long lit wall at z = 4.1 as before.
// PLAN(fx, fy) turns a plan pixel into scene metres.
const PLAN = (fx, fy) => [-7.4 + (fx - 315) * 0.00459, 4.1 + (fy - 2085) * 0.00459];
const L = {
  glassX: -7.4,          // glass shopfront on Queen's Road East
  eastX: 6.07,           // the end wall: a black curtain, the two toilets behind it
  southZ: 4.1,           // the long hallway wall behind the long counter run (the one lit wall)
  backZ: -1.95,          // fridge fronts along the kitchen's rear wall
  northZ: -2.51,         // rear wall of the open kitchen
  frontZ: -2.09,         // the dining room's back wall by the entrance (events wall)
  doorZ: -0.84,          // entrance, front-left (plan: 1750 mm opening)
  doorW: 1.75,
  F: 2.12,               // long counter run, centre line (plan: 9565 mm run)
  XL: -4.09, XR: 3.94,   // counter legs, centre lines
  ZB: -1.06,             // where the left leg ends (toward the kitchen)
  ZBR: 0.68,             // the right leg is shorter (bar flap above it)
  CH: 1.0,               // counter height
  walkX: -5.6,           // aisle between the shopfront (reception, DJ booth) and the left leg
  corrZ: 3.5,            // the hallway behind the long-run seats
  laneZ: 1.12,           // chefs' lane inside the U
  aisleR: 5.42,          // aisle between the right-leg seats and the curtain
  wcX0: 6.76, wcX1: 8.0, // the two WC cubicles (plan: doors open into the lobby behind the curtain)
};

// ---------- LIVE data adapter ----------
const LIVE = {
  source: 'sim',          // 'sim' | 'feed' | 'push'
  stats: null,            // last real stats received
  rollsOffset: 0,
  set(s) {
    if (!s || typeof s !== 'object') return;
    this.stats = Object.assign({}, this.stats || {}, s);
    if (this.source === 'sim') this.source = 'push';
    if (typeof s.rolls_today === 'number') { sim.rollsToday = s.rolls_today; }
    if (typeof s.queue === 'number') sim.queueTarget = Math.max(0, Math.min(14, Math.round(s.queue)));
    if (typeof s.seats_filled === 'number') sim.seatTarget = Math.max(0, Math.min(26, Math.round(s.seats_filled)));
    updateSourceTag();
  },
};
window.RORUBARU_LIVE = LIVE;
window.addEventListener('message', (e) => {
  const d = e.data;
  if (d && d.type === 'rorubaru-live') LIVE.set(d);
});
const feed = params.get('feed');
if (feed) {
  LIVE.source = 'feed';
  const poll = () => fetch(feed, { cache: 'no-store' }).then(r => r.json()).then(j => { LIVE.set(j); LIVE.source = 'feed'; updateSourceTag(); }).catch(() => {});
  poll(); setInterval(poll, 20000);
}
function updateSourceTag() {
  const t = document.getElementById('srcTag');
  if (t) t.textContent = LIVE.source === 'sim' ? 'demo data' : 'live';
}

// ---------- renderer / scene ----------
const canvas = document.getElementById('scene');
const isSmall = Math.min(innerWidth, innerHeight) < 600;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
// quality tiers: low (small/older phones), mid (phones), high (laptops/desktops). ?q=low|mid|high forces one.
const QUALITY = (() => { const q = new URLSearchParams(location.search).get('q'); if (['low', 'mid', 'high'].includes(q)) return q;
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (isSmall && (cores <= 4 || mem <= 3)) return 'low'; return isSmall ? 'mid' : 'high'; })();
document.documentElement.dataset.q = QUALITY;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY === 'low' ? 1.25 : QUALITY === 'mid' ? 1.6 : 2));
if (QUALITY === 'high') { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 38, 75);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 7;
controls.maxDistance = 48;
controls.minPolarAngle = 0.28;
controls.maxPolarAngle = 1.32;
controls.minAzimuthAngle = -Infinity;   // v50: free orbit; the default now looks from the kitchen side so the guests' faces show
controls.maxAzimuthAngle = Infinity;
controls.screenSpacePanning = false;
canvas.tabIndex = 0;

// lights: night street + warm counter + teal wall
scene.add(new THREE.HemisphereLight(0xa9b8d8, 0x2a2018, 1.25));
scene.add(new THREE.AmbientLight(0xffe2c8, 0.35));
const moon = new THREE.DirectionalLight(0xc9d6ff, 0.55); moon.position.set(-10, 18, 8); scene.add(moon);
function pLight(color, intensity, dist, x, y, z) { const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); scene.add(l); return l; }
pLight(0xffc48a, 26, 9, -2.2, 2.6, 1.0);
pLight(0xffc48a, 26, 9, 2.6, 2.6, 1.0);
pLight(0x2fe0d0, 18, 8, 0.5, 1.4, 3.7);
pLight(0xffc896, 5, 4, 3.2, 2.6, 2.9);   // v47: the end wall is NOT neon (Dominic Oct 15): a soft warm light by the curtain instead
const djLight = pLight(ORANGE, 14, 6, -6.0, 1.9, 2.3);
pLight(0xffd0a8, 10, 6, -6.2, 2.7, -1.0);
pLight(0xff6a9a, 8, 7, -6.4, 2.4, -2.2);
// the room's own lights (not the street lamps outside the glass) dim after hours
const roomLights = scene.children.filter((o) => o.isPointLight && o !== djLight && o.position.x > L.glassX).map((l) => ({ l, base: l.intensity }));
pLight(0xffd9a0, 16, 10, -9.2, 4.5, -6.5);
pLight(0xffd9a0, 12, 10, -9.2, 4.5, 4.0);

// ---------- materials / helpers ----------
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = opts.basic ? new THREE.MeshBasicMaterial(Object.assign({ color }, opts.o || {}))
    : new THREE.MeshLambertMaterial(Object.assign({ color, flatShading: false }, opts.o || {}));
  matCache.set(key, m); return m;
}
const glow = (color, o = {}) => mat(color, { basic: true, o });
function box(w, h, d, m, x, y, z, parent = scene) { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.position.set(x, y, z); parent.add(g); return g; }
function cyl(rt, rb, h, seg, m, x, y, z, parent = scene) { const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); g.position.set(x, y, z); parent.add(g); return g; }

function textTexture(lines, { w = 1024, h = 256, font = '900 150px Geist, sans-serif', color = '#F6F3E7', bg = null, glowColor = null, align = 'center', mirror = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  g.font = font; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color;
  if (glowColor) { g.shadowColor = glowColor; g.shadowBlur = 28; }
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((t, i) => g.fillText(t, align === 'center' ? w / 2 : 20, h * (i + 0.5) / arr.length));
  if (glowColor) g.fillText(arr[0], w / 2, h / 2 / arr.length);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
// canvas signs whose words follow the language toggle (Dominic, Oct 13: one language at a time)
const LANG_SIGNS = [];
const langNow = () => (['zh', 'ja'].includes(document.documentElement.dataset.lang) ? document.documentElement.dataset.lang : 'en');
function langSign(material, byLang, opt) { material.map = textTexture(byLang[langNow()] || byLang.en, opt); LANG_SIGNS.push({ material, byLang, opt, l: langNow() }); return material; }
// (v49) the brand display face, Megazoid, for the room's signs
function fitText(text, { w = 1024, h = 256, family = 'Megazoid', color = '#F64501', glowColor = null, bg = null, maxPx = 170 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  let px = maxPx; g.font = `${px}px ${family}`; const mw = g.measureText(text).width; if (mw > w * 0.9) { px = Math.floor(px * w * 0.9 / mw); g.font = `${px}px ${family}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color;
  if (glowColor) { g.shadowColor = glowColor; g.shadowBlur = 24; g.fillText(text, w / 2, h / 2); }
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const MEGA_SIGNS = [];
const megaReady = (typeof FontFace !== 'undefined' ? new FontFace('Megazoid', 'url(fonts/megazoid.otf)').load().then((f) => { document.fonts.add(f); return true; }) : Promise.reject()).catch(() => false);
megaReady.then((ok) => { if (!ok) return; for (const [m, fn] of MEGA_SIGNS) { const old = m.map; m.map = fn(); m.needsUpdate = true; old && old.dispose(); } });
new MutationObserver(() => {
  const l = langNow();
  for (const s of LANG_SIGNS) { if (s.l === l) continue; s.l = l; const old = s.material.map; s.material.map = textTexture(s.byLang[l] || s.byLang.en, s.opt); s.material.needsUpdate = true; if (old) old.dispose(); }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
function plane(w, h, material, x, y, z, ry = 0, parent = scene) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); p.position.set(x, y, z); p.rotation.y = ry; parent.add(p); return p; }

// ---------- the world ----------
const world = new THREE.Group(); scene.add(world);

// The street outside is the real block (OpenStreetMap), built by city.js after the room is batched.

// ---------- the room shell ----------
const floorMat = mat(0x68635d);   // light grey polished concrete floor (his photos: DSC07596, DSC07643)
box(L.wcX1 + 0.1 - L.glassX, 0.06, L.southZ - L.northZ, floorMat, (L.wcX1 + 0.1 + L.glassX) / 2, 0.03, (L.southZ + L.northZ) / 2);
const stoneTex = new THREE.TextureLoader().load('tex/meshstone.jpg'); stoneTex.colorSpace = THREE.SRGBColorSpace; stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
const wallMat = new THREE.MeshLambertMaterial({ color: 0x5f5a54, map: stoneTex }); wallMat.userData.wuv = 1.8;   // split-face stone behind perforated metal mesh (his hero photo)
const H = 3.2;
// walls straight off the plan (v47): the back wall by the entrance, the kitchen's rear wall a step further back,
// the store room beside the kitchen, then the end of the room: curtain, toilet lobby, two WC cubicles
const BOH_UP = [];
const SOLID = [];   // footprints you cannot walk through (walk mode): [x0, z0, x1, z1]
function wallXZ(x0, z0, x1, z1, m = wallMat, h = H, solid = true) { const w = Math.abs(x1 - x0) || 0.16, d = Math.abs(z1 - z0) || 0.16; box(w, h, d, m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2); if (solid) SOLID.push([Math.min(x0, x1) - (x0 === x1 ? 0.08 : 0), Math.min(z0, z1) - (z0 === z1 ? 0.08 : 0), Math.max(x0, x1) + (x0 === x1 ? 0.08 : 0), Math.max(z0, z1) + (z0 === z1 ? 0.08 : 0)]); }
wallXZ(L.glassX, L.frontZ, -4.26, L.frontZ);            // back wall by the entrance (events wall)
// v50: the kitchen walls are cut low in the overview (like the hallway wall) because the camera now looks in from the kitchen side; full height in walk mode
const KITCHEN_WALLS = [[-4.26, L.frontZ, -4.26, L.northZ], [-4.26, L.northZ, 2.51, L.northZ], [2.51, L.northZ, 2.51, -0.4]];
for (const [a, b, c, d] of KITCHEN_WALLS) wallXZ(a, b, c, d, wallMat, 1.05);
wallXZ(2.51, -0.4, 7.67, -0.4);                         // back wall of the bar flap + toilet lobby
box(L.wcX1 + 0.1 - L.glassX, 1.05, 0.16, wallMat, (L.wcX1 + 0.1 + L.glassX) / 2, 0.525, L.southZ);       // side wall (cut low for the view)
SOLID.push([L.glassX, L.southZ - 0.08, L.wcX1 + 0.1, L.southZ + 0.3]);
// backlit walls: rough stone behind perforated metal mesh in black steel frames, lit teal (and red after dark), as in his photos
const WALL_TEAL = new THREE.Color(0x6ff0e4), WALL_RED = new THREE.Color(0xff3a2c);
const teal = new THREE.MeshBasicMaterial({ color: 0x23d6c4 });
const meshTex = new THREE.TextureLoader().load('tex/meshstone.jpg'); meshTex.colorSpace = THREE.SRGBColorSpace; meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
const tealPanel = new THREE.MeshBasicMaterial({ color: 0x6ff0e4, map: meshTex }); tealPanel.userData.wuv = 1.3;
const frameBlk = mat(0x0b0b0d);
box(L.eastX - L.glassX - 0.5, 0.82, 0.03, tealPanel, (L.eastX + L.glassX) / 2 + 0.05, 0.6, L.southZ - 0.1);
for (let x = -6.85; x <= L.eastX - 0.2; x += 1.2) box(0.05, 0.84, 0.05, frameBlk, x, 0.6, L.southZ - 0.12);
box(L.eastX - L.glassX - 0.4, 0.05, 0.05, frameBlk, (L.eastX + L.glassX) / 2, 1.03, L.southZ - 0.12);
box(L.eastX - L.glassX - 0.4, 0.05, 0.05, frameBlk, (L.eastX + L.glassX) / 2, 0.18, L.southZ - 0.12);
// (v47) the old backlit panel on the end wall is gone: Dominic, Oct 15: only the long hallway wall lights up; the end wall is the curtain + 2 toilets
// the light spills onto the floor in front of the backlit walls
const wallWash = new THREE.MeshBasicMaterial({ color: 0x6ff0e4, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, map: (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 64); return new THREE.CanvasTexture(c); })() });
{ const w1 = plane(L.eastX - L.glassX - 0.4, 0.9, wallWash, (L.eastX + L.glassX) / 2, 0.075, L.southZ - 0.55); w1.rotation.set(-Math.PI / 2, 0, Math.PI); w1.userData.keep = true; }

// glass shopfront on Queen's Road East, with the door at the front-left
const glassMat = new THREE.MeshPhongMaterial({ color: 0xa9c6d6, transparent: true, opacity: 0.12, shininess: 90, depthWrite: false, side: THREE.DoubleSide });
const gz0 = L.doorZ + L.doorW / 2, gz1 = L.southZ;
plane(gz1 - gz0, H, glassMat, L.glassX, H / 2, (gz0 + gz1) / 2, Math.PI / 2);
box(0.1, H, 0.1, mat(0x111216), L.glassX, H / 2, gz0);
box(0.1, H, 0.1, mat(0x111216), L.glassX, H / 2, gz1);
box(0.12, 0.12, L.southZ - L.northZ, mat(0x111216), L.glassX, H, (L.southZ + L.northZ) / 2);
box(0.16, H, L.doorZ - L.doorW / 2 + 4.5, wallMat, L.glassX, H / 2, (L.doorZ - L.doorW / 2 - 4.5) / 2); // solid front of the building lobby, north of the door
SOLID.push([L.glassX - 0.1, -4.5, L.glassX + 0.1, L.doorZ - L.doorW / 2], [L.glassX - 0.1, gz0, L.glassX + 0.1, gz1]);
// door frame + open door leaf
box(0.12, 0.12, L.doorW, mat(0x111216), L.glassX, 2.3, L.doorZ);
box(0.12, H - 2.3, L.doorW, mat(0x111216), L.glassX, 2.3 + (H - 2.3) / 2, L.doorZ);
const door = new THREE.Group(); door.position.set(L.glassX, 0, L.doorZ - L.doorW / 2); scene.add(door);
box(0.05, 2.25, 1.15, new THREE.MeshPhongMaterial({ color: 0xa9c6d6, transparent: true, opacity: 0.2, depthWrite: false }), 0, 1.15, 0.58, door);
// fixed glass side panel beside the door leaf (the opening is 1750 mm on the plan)
plane(L.doorW - 1.2, 2.3, glassMat, L.glassX, 1.15, L.doorZ + L.doorW / 2 - (L.doorW - 1.2) / 2, Math.PI / 2);
door.rotation.y = -0.9;
// frosted RORUBARU letters on the glass (read from the street; mirrored from inside, as in the footage)
// real shopfront, from Dominic's own storefront photo: frosted teal glass with the RORUBARU letters, black fascia with the ロールバール neon
const texL = new THREE.TextureLoader();
function photoTex(src, rep) { const t = texL.load(src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
const GLASS_H = 2.35;
const glassLetters = plane(gz1 - gz0, GLASS_H, new THREE.MeshBasicMaterial({ map: photoTex('tex/glass.jpg'), transparent: true, opacity: 0.94, depthWrite: false }), L.glassX - 0.03, GLASS_H / 2, (gz0 + gz1) / 2, -Math.PI / 2);
const fz0 = L.doorZ - L.doorW / 2;   // v47: the fascia runs over the door too, so the neon photo keeps its proportions
box(0.08, H - GLASS_H, gz1 - fz0 + 0.1, mat(0x07080b), L.glassX - 0.02, GLASS_H + (H - GLASS_H) / 2, (fz0 + gz1) / 2); // black fascia band
// the fascia photo itself carries the real neon (icy blue-white ロールバール, as on the street); it dims by day
const neon = plane(gz1 - fz0, H - GLASS_H - 0.04, new THREE.MeshBasicMaterial({ map: photoTex('tex/fascia.jpg') }), L.glassX - 0.075, GLASS_H + (H - GLASS_H) / 2, (fz0 + gz1) / 2, -Math.PI / 2);
// the projecting GF RORUBARU light box at the right-hand end of the front
{ const lbm = new THREE.MeshBasicMaterial({ map: photoTex('tex/lightbox.jpg'), side: THREE.DoubleSide });
  box(0.42, 0.86, 0.06, mat(0x0c0d10), L.glassX - 0.42, 2.72, gz1 + 0.12);
  const lbp = plane(0.38, 0.8, lbm, L.glassX - 0.42, 2.72, gz1 + 0.155, 0); lbp.userData.keep = true;
  const lbp2 = plane(0.38, 0.8, lbm, L.glassX - 0.42, 2.72, gz1 + 0.085, Math.PI); lbp2.userData.keep = true; }
// pavement tiles in front of the shop: the photo's herringbone, toned to a muted grey HK footpath (Dominic Oct 11: the red read like a rug); long soft blend into the street pavement, no hard ends
{ const pt = photoTex('tex/paving_grey.jpg', true); pt.repeat.set(18, 2.6);
  const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.1, 'rgba(255,255,255,0.35)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8);
  const am = new THREE.CanvasTexture(c);
  const pv = plane(26, 3.4, new THREE.MeshLambertMaterial({ color: 0x8a8682, map: pt, alphaMap: am, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), L.glassX - 1.75, 0.02, 0.6, -Math.PI / 2);
  pv.rotation.set(-Math.PI / 2, 0, Math.PI / 2); pv.userData.keep = true; }
// awning light strip + street-side logo plate by the door
box(0.06, 0.05, L.southZ - gz0, glow(ORANGE), L.glassX - 0.12, 3.2, (gz0 + L.southZ) / 2);
const logoTex = new THREE.TextureLoader().load('logo.png'); logoTex.colorSpace = THREE.SRGBColorSpace;
box(0.06, 0.62, 1.15, mat(0x111216), L.glassX - 0.12, 2.75, L.doorZ - 1.35);
plane(1.0, 0.54, new THREE.MeshBasicMaterial({ map: logoTex, transparent: true }), L.glassX - 0.16, 2.75, L.doorZ - 1.35, -Math.PI / 2);


// ---------- past events photo wall (rear wall by the entrance) — real photos from rorubaru.com ----------
const EVW = { x: -5.85, y: 1.95, z: L.frontZ + 0.1, w: 2.5, h: 1.62 };
{
  const c = document.createElement('canvas'); c.width = 1200; c.height = 780;
  const g = c.getContext('2d'); g.fillStyle = '#14151b'; g.fillRect(0, 0, c.width, c.height);
  const evTex = new THREE.CanvasTexture(c); evTex.colorSpace = THREE.SRGBColorSpace;
  const srcs = ['events/grand-opening/01-t.jpg', 'events/delia-x-rorubaru/02-t.jpg', 'events/invite-only-opening/01-t.jpg', 'events/delia-x-rorubaru/05-t.jpg', 'events/grand-opening/04-t.jpg', 'events/invite-only-opening/04-t.jpg'];
  const cw = 376, chh = 366, gap = 18;
  srcs.forEach((s, i) => { const im = new Image(); im.onload = () => {
    const cx = gap + (i % 3) * (cw + gap), cy = gap + Math.floor(i / 3) * (chh + gap);
    const r = Math.max(cw / im.width, chh / im.height), sw = cw / r, sh = chh / r;
    g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, cx, cy, cw, chh); evTex.needsUpdate = true; }; im.src = s; });
  plane(EVW.w, EVW.h, new THREE.MeshBasicMaterial({ map: evTex, color: 0xe8e2d4 }), EVW.x, EVW.y, EVW.z);
  const fr = glow(ORANGE);
  box(EVW.w + 0.1, 0.035, 0.03, fr, EVW.x, EVW.y + EVW.h / 2 + 0.03, EVW.z);
  box(EVW.w + 0.1, 0.035, 0.03, fr, EVW.x, EVW.y - EVW.h / 2 - 0.03, EVW.z);
  box(0.035, EVW.h + 0.1, 0.03, fr, EVW.x - EVW.w / 2 - 0.03, EVW.y, EVW.z);
  box(0.035, EVW.h + 0.1, 0.03, fr, EVW.x + EVW.w / 2 + 0.03, EVW.y, EVW.z);
  const evHead = langSign(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), { en: ['PAST EVENTS'], zh: ['過往活動'], ja: ['過去のイベント'] }, { w: 1024, h: 160, font: '900 112px Geist, sans-serif', color: '#FFE3D2', glowColor: '#F64501' });
  plane(1.7, 0.27, evHead, EVW.x, EVW.y + EVW.h / 2 + 0.27, EVW.z + 0.01);
  // soft wash of light on the floor in front of it
  const wash = plane(2.6, 1.4, new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }), EVW.x, 0.07, EVW.z + 0.75);
  wash.rotation.x = -Math.PI / 2;
}

// reception (front-left, by the door): dark ribbed metal desk
// (v47) where the plan puts it: on the right as you step in, beside the pier at the door's edge
{ const [rx0, rz0] = PLAN(425, 1200), [rx1, rz1] = PLAN(575, 1290), rcx = (rx0 + rx1) / 2, rcz = (rz0 + rz1) / 2;
  box(0.5, H, rz1 - rz0 + 0.05, wallMat, L.glassX + 0.25, H / 2, rcz);   // the pier (solid on the plan)
  box(rx1 - rx0, 1.05, rz1 - rz0 + 0.1, mat(0x1b1c21), rcx, 0.525, rcz);
  for (let x = rx0 + 0.04; x < rx1; x += 0.09) box(0.03, 0.95, 0.02, mat(0x2f3138), x, 0.5, rz0 - 0.04);
  box(rx1 - rx0 + 0.05, 0.04, rz1 - rz0 + 0.15, mat(0x3a332d), rcx, 1.07, rcz);
  SOLID.push([L.glassX, rz0 - 0.07, rx1 + 0.03, rz1 + 0.08]); }

// ---------- the U-shaped hand-roll counter ----------
const _tl = new THREE.TextureLoader();
const _rt = (s) => { const t = _tl.load(s); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const counterTop = new THREE.MeshLambertMaterial({ color: 0xffcabb, map: _rt('tex/wood.jpg') }); counterTop.userData.wuv = 1.6;   // deep oxblood-brown wood top (DSC07596)
const counterBody = new THREE.MeshLambertMaterial({ color: 0x8c8782, map: _rt('tex/cbase.jpg') }); counterBody.userData.wuv = 1.1; // dark split-face stone front (photo)
const steel = new THREE.MeshLambertMaterial({ color: 0x7f8c9a, map: _rt('tex/steel.jpg') }); steel.userData.wuv = 0.9;   // brushed stainless (DSC07596, L1052984)
const inlay = mat(0xd9dde2), underGlow = new THREE.MeshBasicMaterial({ color: 0xffb070 });
function counterRun(x0, z0, x1, z1, guestDir) {
  // guestDir: unit vector from counter centre toward the guests
  const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const w = alongX ? len : 0.78, d = alongX ? 0.78 : len;
  box(w, 0.06, d, counterTop, cx, L.CH, cz);
  // body sits on the chef side so guests' knees fit under the overhang
  const bw = alongX ? len : 0.42, bd = alongX ? 0.42 : len;
  box(bw, L.CH - 0.03, bd, counterBody, cx - guestDir[0] * 0.18, (L.CH - 0.03) / 2, cz - guestDir[1] * 0.18);
  // warm under-glow on the guest side
  box(alongX ? len : 0.02, 0.02, alongX ? 0.02 : len, underGlow, cx + guestDir[0] * 0.36, L.CH - 0.05, cz + guestDir[1] * 0.36);
  // thin metal inlay along the bevelled guest edge
  box(alongX ? len : 0.014, 0.014, alongX ? 0.014 : len, inlay, cx + guestDir[0] * 0.392, L.CH - 0.012, cz + guestDir[1] * 0.392);
  // raised wooden back ledge on the chef side (the step behind the guest counter in the photos)
  box(alongX ? len : 0.26, 0.11, alongX ? 0.26 : len, counterTop, cx - guestDir[0] * 0.27, L.CH + 0.085, cz - guestDir[1] * 0.27);
  box(alongX ? len : 0.012, 0.012, alongX ? 0.012 : len, inlay, cx - guestDir[0] * 0.135, L.CH + 0.135, cz - guestDir[1] * 0.135);
}
counterRun(L.XL - 0.39, L.F, L.XR + 0.39, L.F, [0, 1]);
counterRun(L.XL, L.ZB, L.XL, L.F - 0.39, [-1, 0]);
counterRun(L.XR, L.ZBR, L.XR, L.F - 0.39, [1, 0]);
SOLID.push([L.XL - 0.4, L.ZB, L.XR + 0.4, L.F + 0.4]);   // the whole U (counter + chefs' side): guests walk round it
// nori boxes, sauce bottles, hinoki boxes along the counter
for (let x = L.XL + 0.6; x < L.XR - 0.4; x += 1.3) {
  box(0.24, 0.06, 0.14, mat(0xc9a77a), x, L.CH + 0.17, L.F - 0.28);
  cyl(0.025, 0.025, 0.12, 6, mat(0x2b1a12), x + 0.3, L.CH + 0.2, L.F - 0.3);
}

// central bar + preparation station inside the U (stainless)
// (v47) on the plan it is one bench across the back of the U, 5.3 m × 0.75 m, the kitchen right behind it
{ const [px0, pz0] = PLAN(1310, 1131), [px1, pz1] = PLAN(2473, 1294), pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pw = px1 - px0, pd = pz1 - pz0;
  box(pw, 0.92, pd, steel, pcx, 0.46, pcz);
  box(pw + 0.1, 0.04, pd + 0.08, mat(0x737980), pcx, 0.93, pcz);
  for (let x = pcx - 2.2; x <= pcx + 2.2; x += 1.1) { cyl(0.17, 0.17, 0.2, 12, mat(0xa47c4e), x, 1.04, pcz); cyl(0.172, 0.172, 0.025, 12, mat(0x6b6f75), x, 1.0, pcz); }   // hinoki rice ohitsu, metal band
  for (let x = pcx - 1.65; x <= pcx + 1.7; x += 1.1) box(0.42, 0.05, 0.3, mat(0x1d2a1e), x, 0.98, pcz);   // nori stacks
  cyl(0.22, 0.22, 0.34, 10, mat(0xd8dde4), 2.05, 0.17 + 0.92, -1.25); } // rice cooker

// open kitchen line: glass-door fridges lit cool white, bottles on glass shelves, stainless frames (his drive photos 184035, trip.com counter shot)
const fridgeTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 256, 0); bg.addColorStop(0, '#9fb3c2'); bg.addColorStop(0.5, '#e9f3fb'); bg.addColorStop(1, '#9fb3c2');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
  const cols = ['#1f3b2a', '#2a4a30', '#5a3418', '#3a2414', '#14161a', '#dfe6e8', '#cfc6b0', '#7a8f6a', '#2b2f45'];
  let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let s = 0; s < 4; s++) {
    const base = 120 + s * 122;
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, base, 256, 4);   // glass shelf edge
    let x = 8;
    while (x < 240) {
      const w = 18 + rnd() * 10, h = 70 + rnd() * 30, col = cols[Math.floor(rnd() * cols.length)];
      g.fillStyle = col; g.fillRect(x, base - h * 0.62, w, h * 0.62);
      g.fillRect(x + w * 0.3, base - h, w * 0.4, h * 0.4);
      if (rnd() > 0.35) { g.fillStyle = rnd() > 0.5 ? '#f3efe4' : '#e8c46a'; g.fillRect(x + 2, base - h * 0.45, w - 4, h * 0.2); }   // labels
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, base - h * 0.6, 3, h * 0.55);   // glass highlight
      x += w + 4;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const fridgeFace = new THREE.MeshBasicMaterial({ map: fridgeTex, color: 0xdfe9f2 });
for (let i = 0; i < 4; i++) {
  const x = -2.2 + i * 1.25;
  if (i === 2) { box(1.2, 2.3, 0.1, mat(0x101114), x, 1.15, L.backZ - 0.2); continue; } // pass to the kitchen
  box(1.2, 2.0, 0.6, steel, x, 1.0, L.backZ - 0.35);
  plane(1.05, 1.75, fridgeFace, x, 1.05, L.backZ - 0.04);
  box(0.04, 1.8, 0.03, mat(0x2a2d32), x, 1.05, L.backZ - 0.03);   // door split
}
box(5.0, 0.07, 0.02, glow(0xff8a5c), -0.3, 2.45, L.backZ - 0.02);
// (v49) menu board hung over the kitchen pass: Megazoid header, simple categories (no prices)
const menuBoardMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
function drawMenuBoard(mega) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
  g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#c9a77a'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 310);
  g.fillStyle = '#F64501'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = mega ? '64px Megazoid' : '900 58px Geist, sans-serif'; g.fillText('HAND ROLLS', 256, 62);
  g.fillStyle = '#F6F3E7'; g.font = '500 30px Geist, sans-serif';
  ['temaki · made to order', 'warm rice · crisp nori', 'sake · highballs'].forEach((t, i) => g.fillText(t, 256, 140 + i * 56));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
menuBoardMat.map = drawMenuBoard(false);
plane(1.15, 0.72, menuBoardMat, 0.3, 1.95, L.backZ - 0.13);
MEGA_SIGNS.push([menuBoardMat, () => drawMenuBoard(true)]);

// back kitchen (behind the line)
box(0.7, 0.92, 1.3, steel, 2.1, 0.46, -1.15);    // side benches in the kitchen (v47: the rear wall now carries the fridges)
box(0.7, 0.92, 1.3, steel, -3.4, 0.46, -1.75);
cyl(0.25, 0.25, 0.3, 10, mat(0x9aa1ab), -3.4, 1.07, -1.95);
box(1.0, 0.5, 0.8, mat(0x5b616a), -3.4, 2.3, -1.75);

// rear wall behind the kitchen: full-height brushed stainless panels (L1052984, L1053624), a red light slit beside the events wall (L1053430)
{ const sw = plane(6.7, 2.9, steel, -0.87, 1.47, L.northZ + 0.09);
  for (let x = -4.0; x <= 2.4; x += 1.2) box(0.012, 2.9, 0.01, mat(0x5c6168), x, 1.47, L.northZ + 0.1);
  box(0.07, 2.3, 0.03, glow(0xff2a1c), -4.45, 1.45, L.frontZ + 0.11);
  const rw = plane(0.9, 1.6, new THREE.MeshBasicMaterial({ color: 0xff2a1c, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }), -4.45, 1.45, L.frontZ + 0.12); rw.userData.keep = true; }
// exposed silver ducts under the black ceiling, over the back kitchen
const HOOD = [cyl(0.16, 0.16, 6.6, 12, mat(0xaab0b8), -0.87, 2.98, L.northZ + 0.55)]; HOOD[0].rotation.z = Math.PI / 2;   // v50: only shown in walk mode (it cut across the new overview)
for (let x = -4; x <= 2; x += 3) { const f = cyl(0.17, 0.17, 0.05, 12, mat(0x6d737b), x, 2.98, L.northZ + 0.55); f.rotation.z = Math.PI / 2; HOOD.push(f); }

// washrooms (right)
// (v47) built in full further down: curtain, lobby, double basin, two washlet cubicles

// ceiling LED outline above the counter (the white light loop in the photos)
const ledMat = glow(0xdfe6f5);
const ledPts = [[-5.35, -1.0], [-5.35, 2.6], [-4.75, 3.25], [4.5, 3.25], [5.15, 2.6], [5.15, 0.1]];
for (let i = 0; i < ledPts.length - 1; i++) {
  const [ax, az] = ledPts[i], [bx, bz] = ledPts[i + 1];
  const len = Math.hypot(bx - ax, bz - az);
  const m = box(len, 0.035, 0.035, ledMat, (ax + bx) / 2, 2.85, (az + bz) / 2);
  m.rotation.y = -Math.atan2(bz - az, bx - ax);
}
// exposed ducts (painted black ceiling services)


// ---------- (v47) the end of the room, off the plan: header + black curtain, toilet lobby, double basin, two washlet cubicles ----------
// Dominic, Oct 15: "only 1 light up wall which is the long hallway … the back wall … is where the curtain and 2 toilets are";
// the toilets are Japanese washlets (lid opens as you walk up, closes as you leave); the cubicle light comes on as you step in.
const WC = { lids: [], cubes: [], curtain: [], taps: [] };
{
  const cx = L.eastX, [, czA] = PLAN(0, 1430);            // curtain line, from the plan's dashed line (fy 1430) to the long wall
  const [, zTop] = PLAN(0, 1295), [, zD1a] = PLAN(0, 1395), [, zPart] = PLAN(0, 1517), [, zD2b] = PLAN(0, 1655), [, zBot] = PLAN(0, 1900);
  const x0 = L.wcX0, x1 = L.wcX1;
  const [vx0, vz0] = PLAN(3525, 1135), [vx1, vz1] = PLAN(3580, 1295);   // double basin vanity
  const basinWallX = PLAN(3595, 0)[0];
  const tile = new THREE.MeshLambertMaterial({ color: 0x222120, emissive: 0x1c1a16 }); WC.tile = tile;   // toilet walls: neutral dark tile (no photo of the toilets yet: placeholder finish)
  const doorMat = mat(0x1a1a1e), chromeM = mat(0xc8ccd2), white = new THREE.MeshLambertMaterial({ color: 0xf4f2ee, emissive: 0x2a2a2a });
  // toilet block walls
  wallXZ(basinWallX, -0.4, basinWallX, zTop, tile);              // wall behind the basins
  wallXZ(x0, zTop, basinWallX, zTop, tile);                      // top of the cubicle block
  wallXZ(x0, zTop, x0, zD1a, tile);                              // lobby side, up to door 1
  wallXZ(x0, zPart - 0.03, x0, zPart + 0.03, tile);              // between the two doors
  wallXZ(x0, zD2b, x0, zBot, tile);                              // below door 2
  wallXZ(x0, zPart, x1, zPart, tile);                            // partition between the cubicles
  wallXZ(x1, zTop, x1, zBot, tile);                              // back wall (cisterns)
  wallXZ(x0, zBot, x1 + 0.09, zBot, tile);                       // stair behind, below the cubicles
  const [sx] = PLAN(3430, 0);
  wallXZ(sx, zBot, sx, L.southZ, tile);                          // lobby ends at the stair wall
  box(0.04, 2.1, 0.8, doorMat, sx - 0.03, 1.05, (zBot + L.southZ) / 2);   // stair door (closed, staff)
  // floor tiles + ceiling light panel per cubicle; the light comes on when you step in
  for (const [za, zb] of [[zTop, zPart], [zPart, zBot]]) {
    const fm = new THREE.MeshLambertMaterial({ color: 0x8d8780, emissive: 0x000000 });
    const f = plane(x1 - x0, zb - za, fm, (x0 + x1) / 2, 0.065, (za + zb) / 2); f.rotation.x = -Math.PI / 2;
    const lm = new THREE.MeshBasicMaterial({ color: 0x3a3833 });
    const lp = plane(0.5, 0.5, lm, (x0 + x1) / 2, H - 0.02, (za + zb) / 2); lp.rotation.x = Math.PI / 2;
    WC.cubes.push({ x0, x1, z0: za, z1: zb, fm, lm, k: 0 });
  }
  // doors: both hinge at the partition and open out into the lobby (as drawn), shown standing open
  for (const [hz, len, a] of [[zPart - 0.05, zPart - 0.05 - zD1a, 1.4], [zPart + 0.05, zD2b - zPart - 0.05, -1.4]]) {
    const g = new THREE.Group(); g.position.set(x0, 0, hz); scene.add(g);
    const leaf = box(0.04, 2.05, len, doorMat, 0, 1.03, a > 0 ? -len / 2 : len / 2, g);
    box(0.06, 0.03, 0.12, chromeM, -0.04, 1.0, a > 0 ? -len + 0.08 : len - 0.08, g);
    g.rotation.y = a;
  }
  // double basin vanity + mirror
  const vcx = (basinWallX + vx0) / 2 - 0.05, vd = basinWallX - vx0 + 0.15;
  box(vd, 0.08, vz1 - vz0 + 0.1, mat(0x2b2724), vcx, 0.85, (vz0 + vz1) / 2);
  box(vd - 0.06, 0.7, vz1 - vz0, mat(0x1e1c1b), vcx + 0.02, 0.45, (vz0 + vz1) / 2);
  SOLID.push([vcx - vd / 2, vz0 - 0.05, basinWallX, vz1 + 0.05]);
  for (const bz of [PLAN(0, 1155)[1], PLAN(0, 1245)[1]]) {
    const b = cyl(0.15, 0.1, 0.12, 16, white, vcx - 0.02, 0.93, bz); b.scale.set(0.8, 1, 1);
    cyl(0.012, 0.012, 0.2, 6, chromeM, basinWallX - 0.09, 1.0, bz);
    box(0.14, 0.012, 0.012, chromeM, basinWallX - 0.15, 1.09, bz);
  }
  const mir = new THREE.MeshPhongMaterial({ color: 0x9aa4ad, shininess: 120, specular: 0xffffff, emissive: 0x111418 });
  plane(0.82, 0.9, mir, basinWallX - 0.07, 1.55, (vz0 + vz1) / 2, -Math.PI / 2);
  box(0.02, 0.04, 0.9, glow(0xffe6c4), basinWallX - 0.08, 2.05, (vz0 + vz1) / 2);   // warm strip over the mirror
  // the two washlets: INAX SATIS S (S618), Dominic Oct 15 ("inax s618 is the toilet exact model"): one-piece all-ceramic, tankless,
  // a skirted bowl that tapers toward the floor, a low rear unit with a side grille, one big flat rounded lid, no side arm (wall remote)
  const s618Ped = new THREE.CylinderGeometry(0.2, 0.145, 0.4, 20, 1);
  { const p = s618Ped.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0) p.setX(i, p.getX(i) + 0.05); } s618Ped.computeVertexNormals(); }   // foot sits back under the bowl
  const toiletGeo = { ped: s618Ped, rim: new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), lid: new THREE.CylinderGeometry(0.205, 0.2, 0.04, 20) };
  const ventM = mat(0x9aa0a6);
  for (const tz of [PLAN(0, 1460)[1], PLAN(0, 1608)[1]]) {
    const tx = x1 - 0.42;   // bowl centre; faces −x (toward the door)
    const g = new THREE.Group(); g.position.set(tx, 0, tz); scene.add(g);
    const ped = new THREE.Mesh(toiletGeo.ped, white); ped.position.set(0, 0.2, 0); ped.scale.set(1.35, 1, 1); g.add(ped);   // skirted, tapering bowl
    const rim = new THREE.Mesh(toiletGeo.rim, mat(0xeeece7)); rim.position.set(0, 0.415, 0); rim.scale.set(1.35, 1, 1); g.add(rim);   // seat
    box(0.26, 0.41, 0.33, white, 0.3, 0.205, 0, g);                 // skirt continues to the back
    box(0.22, 0.13, 0.4, white, 0.33, 0.48, 0, g);                  // low rear unit (no cistern: tankless)
    box(0.23, 0.012, 0.41, mat(0xe2e0da), 0.33, 0.548, 0, g);      // top lip of the unit
    for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) box(0.012, 0.006, 0.006, ventM, 0.36 + k * 0.02, 0.48, sz * 0.201, g);   // side grille
    box(0.02, 0.08, 0.12, mat(0xb8bcc2), 0.5, 1.15, -0.35, g);     // paper holder
    cyl(0.055, 0.055, 0.11, 10, white, 0.47, 1.1, -0.35, g).rotation.x = Math.PI / 2;
    box(0.02, 0.13, 0.075, white, 0.5, 0.85, -0.35, g);            // slim wall remote below the holder
    for (let k = 0; k < 3; k++) box(0.006, 0.018, 0.018, k ? ventM : glow(0x5fb8ff), 0.488, 0.89 - k * 0.03, -0.35, g);
    // lid on a hinge at the back of the seat; lies flat when closed, swings up ~100° when it opens
    const hinge = new THREE.Group(); hinge.position.set(0.17, 0.45, 0); g.add(hinge);
    const lid = new THREE.Mesh(toiletGeo.lid, white); lid.position.set(-0.19, 0, 0); lid.scale.set(1.35, 1, 1); hinge.add(lid);
    WC.lids.push({ hinge, x: tx, z: tz, k: 0, want: 0, tap: 0 });
    SOLID.push([tx - 0.3, tz - 0.24, x1, tz + 0.24]);
    WC.taps.push({ g, l: WC.lids[WC.lids.length - 1] });
  }
  // black velvet curtain, floor to ceiling, one run across the whole end wall (Kurate RORU-32/33), parting where you walk through
  const curtMat = new THREE.MeshLambertMaterial({ color: 0x141418, side: THREE.DoubleSide });
  const split = (czA + L.southZ) / 2 - 0.15;
  WC.split = split;
  for (const [za, zb] of [[-0.35, split], [L.southZ, split]]) {
    const w = Math.abs(zb - za), geo = new THREE.PlaneGeometry(w, H - 0.08, Math.max(12, Math.round(w * 22)), 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + w / 2; p.setZ(i, Math.sin(u * Math.PI * 2 / 0.2) * 0.035); p.setX(i, u); }
    geo.computeVertexNormals();
    const g = new THREE.Group(); g.position.set(cx + 0.02, 0, za); scene.add(g);
    const m = new THREE.Mesh(geo, curtMat); m.position.y = (H - 0.08) / 2; m.rotation.y = zb > za ? -Math.PI / 2 : Math.PI / 2; g.add(m);
    box(0.03, 0.03, w, chromeM, 0, H - 0.05, (zb - za) / 2, g);         // ceiling track
    WC.curtain.push({ g, w, dir: Math.sign(zb - za), k: 0 });
  }
  SOLID.push([cx - 0.05, -0.4, cx + 0.05, split - 0.55], [cx - 0.05, split + 0.55, cx + 0.05, L.southZ]);
  // the sign at the hallway: Toilets / 洗手間
  const sm = new THREE.MeshBasicMaterial({ map: textTexture(['TOILETS  洗手間'], { w: 1024, h: 200, font: '800 104px Geist, "PingFang HK", "Noto Sans CJK TC", "Noto Sans TC", sans-serif', color: '#F6F3E7', bg: '#111216' }) });
  const sg = plane(1.1, 0.215, sm, cx - 0.12, 2.82, split, -Math.PI / 2);
  box(0.012, 0.36, 0.012, chromeM, cx - 0.12, 3.03, split - 0.45); box(0.012, 0.36, 0.012, chromeM, cx - 0.12, 3.03, split + 0.45);   // hangs from the ceiling
  box(0.012, 0.012, 1.1, glow(ORANGE), cx - 0.125, 2.7, split);
  // back of house around the room (stairs, store rooms, building lobby): plain blocks up to the first floor
  const boh = mat(0x2a2b31);
  for (const [a, b, c, d] of [[-7.32, -4.5, -4.34, -2.17], [-4.34, -4.5, 10.1, -2.59], [2.59, -2.59, 10.1, -0.48], [x1 + 0.13, -0.48, 10.1, 4.45], [basinWallX + 0.08, -0.48, x1 + 0.13, zTop - 0.04], [sx + 0.08, zBot + 0.08, x1 + 0.13, 4.45]])
    { box(c - a, 1.05, d - b, boh, (a + c) / 2, 0.525, (b + d) / 2); BOH_UP.push([a, b, c, d]); }   // v50: cut low in the overview (the camera looks in over them), full height in walk mode
}
function stepWC(dt, cam, walking, t) {
  // lids: open when you are within ~1.25 m in walk mode (or after a tap), close as you leave
  for (const l of WC.lids) {
    const near = walking && Math.hypot(cam.x - l.x, cam.z - l.z) < 1.25 && Math.abs(cam.z - l.z) < 0.6;
    if (l.tap > 0) l.tap -= dt;
    l.want = near || l.tap > 0 ? 1 : 0;
    l.k += (l.want - l.k) * Math.min(1, dt * (l.want ? 2.2 : 1.6));
    const e = l.k * l.k * (3 - 2 * l.k);
    l.hinge.rotation.z = -1.78 * e;
  }
  // cubicle lights
  let anyIn = 0;
  for (const c of WC.cubes) {
    const inside = walking && cam.x > c.x0 - 0.05 && cam.x < c.x1 && cam.z > c.z0 && cam.z < c.z1;
    c.k += ((inside ? 1 : 0) - c.k) * Math.min(1, dt * 4);
    anyIn = Math.max(anyIn, c.k);
    c.lm.color.setRGB(0.23 + 0.77 * c.k, 0.22 + 0.76 * c.k, 0.2 + 0.7 * c.k);
    c.fm.emissive.setRGB(0.16 * c.k, 0.15 * c.k, 0.13 * c.k);
  }
  WC.tile.emissive.setRGB(0.05 + 0.1 * anyIn, 0.043 + 0.08 * anyIn, 0.032 + 0.05 * anyIn);   // warm light comes up
  // curtain: the two panels gather to the sides as you come close, with a little sway
  const dc = walking ? Math.hypot(cam.x - L.eastX, cam.z - WC.split) : 9;
  for (const c of WC.curtain) {
    const want = dc < 1.7 ? 1 : 0;
    c.k += (want - c.k) * Math.min(1, dt * 2.4);
    c.g.scale.z = 1 - Math.min(0.62, 0.95 / c.w) * c.k;
    c.g.rotation.z = Math.sin(t * 1.9 + c.dir) * 0.012 * (0.3 + c.k);
  }
}
// tap a toilet (walk mode) and its lid opens for a few seconds
{ const rc = new THREE.Raycaster(), nd = new THREE.Vector2(); let d0 = null;
  canvas.addEventListener('pointerdown', (e) => { d0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!d0 || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 10) { d0 = null; return; } d0 = null;
    nd.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); rc.setFromCamera(nd, camera);
    for (const t of WC.taps) if (rc.intersectObject(t.g, true).length) { t.l.tap = 6; break; }
  }); }

// stools: 26 seats (6 on each leg, 14 on the long run) — straight from the floor plan
// stools as in his photos (DSC07596, DSC07643): taupe leather seat, curved padded back rail, dark wood legs, chrome foot ring
const stoolSeat = mat(0xd8cbb2),   // v47: cream upholstery (Kurate photos)
     _sOld = 0, stoolFrame = mat(0x3a2418), chrome = mat(0x9ea4ab);
const plateRim = mat(0x6f9a94), plateIn = mat(0xe6e0d4), chopMat = mat(0x2a1a12), porcelain = mat(0xf1eee6);
const seats = [];
// (v47) counted and placed off the plan: 6 on the left leg + the corner seat, 14 on the long run (5, a column, 9),
// 5 on the shorter right leg = 26. Positions are the plan's stool centres, pulled ~0.1 m in toward the counter.
for (const fy of [1100, 1211, 1322, 1433, 1544, 1655]) seats.push({ x: L.XL - 0.8, z: PLAN(0, fy)[1], side: 'L' });
seats.push({ x: L.XL - 0.66, z: L.F + 0.55, side: 'C' });
for (const fx of [1033, 1165, 1297, 1426, 1558, 1823, 1943, 2059, 2173, 2288, 2404, 2520, 2635, 2746]) seats.push({ x: PLAN(fx, 0)[0], z: L.F + 0.75, side: 'F' });
for (const fy of [1290, 1392, 1493, 1596, 1698]) seats.push({ x: L.XR + 0.8, z: PLAN(0, fy)[1], side: 'R' });
const COL_TOPS = [];
// columns where the plan draws them (one in the left leg, two in the long-run stool line); stainless-clad in his photos
const colMat = new THREE.MeshPhongMaterial({ color: 0x7d858d, specular: 0xffffff, shininess: 140 });   // mirror-polished stainless cladding (Kurate RORU-32/33/35)
for (const [fx0, fy0, fx1, fy1] of [[935, 1205, 1065, 1285], [1620, 1755, 1720, 1867], [2805, 1755, 2947, 1867]]) {
  const [x0, z0] = PLAN(fx0, fy0), [x1, z1] = PLAN(fx1, fy1);
  const cr = Math.min(x1 - x0, z1 - z0) * 0.42, ccx = (x0 + x1) / 2, ccz = (z0 + z1) / 2;   // v50: round, slimmer, cut low like the walls so it never hides the counter
  cyl(cr, cr, 1.05, 16, colMat, ccx, 0.525, ccz); cyl(cr + 0.02, cr + 0.02, 0.04, 16, mat(0x2a2b30), ccx, 1.07, ccz);
  COL_TOPS.push([cr, ccx, ccz]); SOLID.push([x0, z0, x1, z1]);
}
SOLID.push([-4.26, L.northZ, 2.51, -0.28], [3.5, -0.4, 4.4, 0.72]);   // the kitchen and the bar flap are staff only
const _arcGeo = new THREE.TorusGeometry(0.21, 0.034, 6, 16, Math.PI);
const _ringGeo = new THREE.TorusGeometry(0.165, 0.009, 4, 18);
seats.forEach((s, si) => {
  s.occupied = null; s.reserved = false;
  if (s.side === 'F') { s.face = Math.PI; s.chef = { x: s.x, z: L.F - 0.6 }; s.chefFace = 0; s.plate = { x: s.x, z: L.F + 0.2 }; }
  if (s.side === 'L') { s.face = Math.PI / 2; s.chef = { x: L.XL + 0.6, z: s.z }; s.chefFace = -Math.PI / 2; s.plate = { x: L.XL - 0.2, z: s.z }; }
  if (s.side === 'R') { s.face = -Math.PI / 2; s.chef = { x: L.XR - 0.6, z: s.z }; s.chefFace = Math.PI / 2; s.plate = { x: L.XR + 0.2, z: s.z }; }
  if (s.side === 'C') { s.face = 3 * Math.PI / 4; s.chef = { x: L.XL + 0.55, z: L.F - 0.55 }; s.chefFace = -Math.PI / 4; s.plate = { x: L.XL - 0.18, z: L.F + 0.18 }; }
  const bx = -Math.sin(s.face), bz = -Math.cos(s.face);   // toward the stool's back (away from the counter)
  const px = -bz, pz = bx;
  cyl(0.2, 0.19, 0.08, 14, stoolSeat, s.x, 0.72, s.z);
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) box(0.035, 0.68, 0.035, stoolFrame, s.x + 0.13 * (a * bx + b * px), 0.34, s.z + 0.13 * (a * bz + b * pz));
  const rg = new THREE.Mesh(_ringGeo, chrome); rg.position.set(s.x, 0.27, s.z); rg.rotation.x = Math.PI / 2; scene.add(rg);
  for (const b of [1, -1]) box(0.035, 0.22, 0.035, stoolFrame, s.x + 0.15 * bx + 0.15 * b * px, 0.86, s.z + 0.15 * bz + 0.15 * b * pz);
  const arc = new THREE.Mesh(_arcGeo, stoolSeat); arc.rotation.order = 'YXZ'; arc.rotation.set(-Math.PI / 2, s.face, 0); arc.scale.z = 2.3; arc.position.set(s.x, 0.98, s.z); scene.add(arc);
  // place setting: stoneware plate with a sea-green glaze rim, chopsticks, soy dish; a white tokkuri carafe every few seats
  const ux = -bx, uz = -bz;   // toward the counter
  const _n0 = scene.children.length;
  cyl(0.125, 0.115, 0.012, 16, plateRim, s.plate.x, L.CH + 0.036, s.plate.z);
  cyl(0.1, 0.1, 0.014, 16, plateIn, s.plate.x, L.CH + 0.038, s.plate.z);
  const ch = box(0.22, 0.008, 0.012, chopMat, s.plate.x + 0.15 * bx, L.CH + 0.035, s.plate.z + 0.15 * bz); ch.rotation.y = s.side === 'F' ? 0 : s.side === 'C' ? Math.PI / 4 : Math.PI / 2;
  cyl(0.04, 0.035, 0.015, 10, porcelain, s.plate.x - 0.16 * px + 0.06 * ux, L.CH + 0.038, s.plate.z - 0.16 * pz + 0.06 * uz);
  if (si % 3 === 1) { const tx = s.plate.x - 0.17 * px - 0.06 * ux, tz = s.plate.z - 0.17 * pz - 0.06 * uz; cyl(0.022, 0.045, 0.1, 10, porcelain, tx, L.CH + 0.08, tz); cyl(0.012, 0.022, 0.05, 10, porcelain, tx, L.CH + 0.155, tz); }
  for (let k = _n0; k < scene.children.length; k++) scene.children[k].userData.setting = true;   // cleared when the shop is closed
});
// dried flowers in a glass bottle at each front corner of the counter (DSC07596)
{ const vase = new THREE.MeshPhongMaterial({ color: 0xc8dde0, transparent: true, opacity: 0.45, shininess: 80, depthWrite: false });
  const stem = mat(0x7f8a6a), bloom = mat(0x8e86a8);
  for (const [vx, vz] of [[L.XL - 0.12, L.F + 0.14], [L.XR + 0.12, L.F + 0.14]]) {
    cyl(0.05, 0.065, 0.26, 10, vase, vx, L.CH + 0.16, vz);
    for (let k = 0; k < 9; k++) { const a = k * 2.4, tl = 0.1 + (k % 3) * 0.06; const h = 0.42 + (k % 4) * 0.07;
      const sm = cyl(0.004, 0.004, h, 4, stem, vx + Math.cos(a) * tl * 0.5, L.CH + 0.06 + h / 2, vz + Math.sin(a) * tl * 0.5); sm.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
      cyl(0.016, 0.006, 0.07, 5, bloom, vx + Math.cos(a) * tl * 1.1, L.CH + 0.06 + h, vz + Math.sin(a) * tl * 1.1); } } }

// ---------- (v49 preview) detail pass: every surface gets small props, baked into a couple of merged meshes (one draw call each) ----------
const PROP = { lit: [], glow: [] };
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _ps = new THREE.Vector3(), _pp = new THREE.Vector3();
function prop(geo, color, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1, list = PROP.lit) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone());
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  vColor(g, color);
  _pm.compose(_pp.set(x, y, z), _pq.setFromEuler(_pe.set(rx, ry, rz)), _ps.set(sx, sy, sz)); g.applyMatrix4(_pm); list.push(g);
}
const PG = {
  bottle: new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.04, 0.02], [0.04, 0.15], [0.03, 0.19], [0.014, 0.23], [0.014, 0.27], [0, 0.27]].map(([r, y]) => new THREE.Vector2(r, y)), 10),
  isshobin: new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.055, 0.02], [0.055, 0.22], [0.04, 0.28], [0.017, 0.33], [0.017, 0.38], [0, 0.38]].map(([r, y]) => new THREE.Vector2(r, y)), 10),
  label: new THREE.CylinderGeometry(0.0415, 0.0415, 0.07, 10, 1, true),
  pot: new THREE.CylinderGeometry(0.06, 0.045, 0.08, 10),
  leaf: new THREE.IcosahedronGeometry(0.06, 0),
  bigPot: new THREE.CylinderGeometry(0.2, 0.15, 0.36, 14),
  bigLeaf: new THREE.IcosahedronGeometry(0.22, 1),
  card: new THREE.BoxGeometry(0.12, 0.16, 0.012),
  pan: new THREE.BoxGeometry(0.15, 0.04, 0.12),
  fill: new THREE.BoxGeometry(0.135, 0.02, 0.105),
  dot: new THREE.SphereGeometry(0.012, 6, 4),
  cup: new THREE.CylinderGeometry(0.032, 0.026, 0.06, 10),
  glass: new THREE.CylinderGeometry(0.03, 0.026, 0.11, 10),
  cord: new THREE.CylinderGeometry(0.006, 0.006, 1, 4),
  shade: new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  bulb: new THREE.SphereGeometry(0.065, 10, 8),
  canister: new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10),
  paddle: new THREE.BoxGeometry(0.06, 0.24, 0.012),
  tower: new THREE.CylinderGeometry(0.025, 0.03, 0.34, 10),
  handle: new THREE.CapsuleGeometry(0.014, 0.08, 2, 6),
  tray: new THREE.BoxGeometry(0.3, 0.02, 0.12),
  jar: new THREE.CylinderGeometry(0.035, 0.035, 0.07, 10),
  lid: new THREE.SphereGeometry(0.036, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5),
};
const LEDGE_Y = L.CH + 0.14;
function smallPlant(x, z, y = LEDGE_Y) {
  prop(PG.pot, pick([0xf2ece0, 0xe7b48f, 0x9fc8c2]), x, y + 0.04, z);
  for (let k = 0; k < 5; k++) prop(PG.leaf, pick([0x6fae6a, 0x83c27a, 0x5c9a5c]), x + rr(-0.035, 0.035), y + 0.11 + rr(0, 0.05), z + rr(-0.035, 0.035), rr(0, 3), rr(0, 3), 0, 1, 1.2, 1);
}
function sake(x, z, y = LEDGE_Y, big = false) {
  const col = pick([0x2f6b45, 0x6b3b1f, 0x1e3f5c, 0xf2efe6, 0x3f5a2a]);
  prop(big ? PG.isshobin : PG.bottle, col, x, y, z, rr(0, 3));
  prop(PG.label, pick([0xf6f1e3, 0xe8c46a, 0xffffff]), x, y + (big ? 0.13 : 0.09), z, 0, 0, 0, big ? 1.33 : 1, 1, big ? 1.33 : 1);
}
function menuCard(x, z, ry, y = LEDGE_Y) { prop(PG.card, 0xf6f3e7, x, y + 0.08, z, ry, -0.2); prop(PG.card, 0xF64501, x, y + 0.08, z, ry, -0.2, 0, 1.02, 0.25, 1.05); }
function canister(x, z, y = LEDGE_Y) { prop(PG.canister, pick([0x2a2a2e, 0xc9a77a, 0x9fc8c2]), x, y + 0.05, z); prop(PG.lid, 0x2a2a2e, x, y + 0.1, z, 0, 0, 0, 1.15, 0.5, 1.15); }
function jar(x, z, y = LEDGE_Y) { prop(PG.jar, pick([0xf2ece0, 0xc96a3a]), x, y + 0.035, z); prop(PG.lid, 0x7b5636, x, y + 0.07, z); }
// chef-side back ledge of the long run: a little still life between the nori boxes
{ let i = 0;
  for (let x = L.XL + 0.95; x < L.XR - 0.3; x += 0.65, i++) {
    const z = L.F - 0.27, k = i % 5;
    if (k === 0) { smallPlant(x, z); jar(x + 0.13, z + 0.02); }
    else if (k === 1) { sake(x - 0.05, z); sake(x + 0.06, z + 0.02, LEDGE_Y, true); }
    else if (k === 2) { menuCard(x, z + 0.03, 0); canister(x + 0.14, z); }
    else if (k === 3) { jar(x - 0.06, z); jar(x + 0.05, z + 0.02); prop(PG.cup, 0xf1eee6, x + 0.15, LEDGE_Y + 0.03, z); }
    else { sake(x, z, LEDGE_Y, true); smallPlant(x + 0.15, z); }
  } }
// the two legs' ledges
for (const [lx, z0, z1] of [[L.XL + 0.27, L.ZB + 0.25, L.F - 0.6], [L.XR - 0.27, L.ZBR + 0.7, L.F - 0.6]]) {
  let i = 0; for (let z = z0; z < z1; z += 0.55, i++) { const k = i % 3; if (k === 0) smallPlant(lx, z); else if (k === 1) { sake(lx, z - 0.05); sake(lx + 0.02, z + 0.07, LEDGE_Y, true); } else { menuCard(lx, z, lx < 0 ? -Math.PI / 2 : Math.PI / 2); jar(lx, z + 0.14); } }
}
// highball tap tower + glasses on the right leg, by the bar flap
{ const tx = L.XR - 0.27, tz = L.ZBR + 0.28;
  prop(PG.tray, 0x8d949c, tx, LEDGE_Y + 0.01, tz, Math.PI / 2);
  prop(PG.tower, 0xd6dce2, tx, LEDGE_Y + 0.17, tz);
  prop(PG.tower, 0xd6dce2, tx, LEDGE_Y + 0.33, tz, 0, 0, Math.PI / 2, 1, 0.6, 1);
  prop(PG.handle, 0x111114, tx - 0.02, LEDGE_Y + 0.4, tz - 0.08, 0, 0, 0.2); prop(PG.handle, 0xF64501, tx - 0.02, LEDGE_Y + 0.4, tz + 0.08, 0, 0, 0.2);
  for (let k = 0; k < 4; k++) prop(PG.glass, 0xcfe6ee, tx + 0.04, LEDGE_Y + 0.055, tz - 0.4 - k * 0.08); }
// prep bench inside the U: rows of colourful topping pans, a paddle in every rice tub
{ const [px0, pz0] = PLAN(1310, 1131), [px1, pz1] = PLAN(2473, 1294), pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pd = pz1 - pz0;
  const fills = [0xff7a52, 0xd8332e, 0xf6cf5f, 0x9fd27a, 0xf6f1e8, 0xff9a3c, 0x6fb06a, 0xffb38a];
  for (let x = pcx - 2.2; x <= pcx + 2.2; x += 1.1) prop(PG.paddle, 0xe0c08a, x + 0.06, 1.2, pcz, 0, 0.35, 0.3);
  for (let gi = 0; gi < 4; gi++) for (let j = 0; j < 3; j++) {
    const x = pcx - 1.65 + gi * 1.1 - 0.17 + j * 0.17, z = pcz + pd / 2 - 0.1, c = fills[(gi * 3 + j) % fills.length];
    prop(PG.pan, 0xb9c0c8, x, 0.97, z); prop(PG.fill, c, x, 0.99, z);
    for (let d = 0; d < 3; d++) prop(PG.dot, c, x + rr(-0.04, 0.04), 1.005, z + rr(-0.03, 0.03), 0, 0, 0, 1.3, 0.8, 1.3);
  } }
// pendant lamps over the counter: warm domes on long cords
const PENDANTS = [];
for (let x = L.XL + 0.4; x < L.XR - 0.2; x += 1.15) PENDANTS.push([x, L.F + 0.05]);
for (const z of [-0.2, 0.9]) PENDANTS.push([L.XL - 0.05, z]);
PENDANTS.push([L.XR + 0.05, 1.2]);
for (const [x, z] of PENDANTS) {
  prop(PG.cord, 0x1a1a1c, x, 2.68, z, 0, 0, 0, 1, 0.36, 1);
  prop(PG.shade, 0xf0b56a, x, 2.5, z, 0, 0, 0, 0.72, 0.6, 0.72);
  prop(PG.bulb, 0xfff1c9, x, 2.49, z, 0, 0, 0, 0.75, 0.75, 0.75, PROP.glow);
}
// big potted plants in the corners of the room
for (const [x, z] of [[-6.95, 3.65], [5.75, 3.75], [-7.0, -1.75]]) {
  prop(PG.bigPot, 0xefe7d6, x, 0.24, z);
  for (let k = 0; k < 7; k++) prop(PG.bigLeaf, pick([0x5f9e5c, 0x76b56d, 0x4d8a52, 0x8cc47e]), x + rr(-0.16, 0.16), 0.6 + k * 0.1 + rr(0, 0.08), z + rr(-0.16, 0.16), rr(0, 3), rr(0, 3), 0, 1, 1.15, 1);
  SOLID.push([x - 0.25, z - 0.25, x + 0.25, z + 0.25]);
}

// ---------- v50 density pass: many more small props in the same rounded style (all merged into the two prop meshes = 2 draw calls) ----------
{
  const DG = {
    ochoko: new THREE.CylinderGeometry(0.026, 0.02, 0.035, 8),
    dish: new THREE.CylinderGeometry(0.045, 0.04, 0.012, 10),
    napkin: new THREE.BoxGeometry(0.09, 0.07, 0.05),
    napkinIn: new THREE.BoxGeometry(0.08, 0.04, 0.035),
    stand: new THREE.BoxGeometry(0.09, 0.12, 0.01),
    standBase: new THREE.BoxGeometry(0.1, 0.012, 0.05),
    plank: new THREE.BoxGeometry(1, 0.04, 0.26),
    shelf: new THREE.BoxGeometry(1, 0.03, 0.22),
    post: new THREE.BoxGeometry(0.03, 1, 0.03),
    lampBase: new THREE.CylinderGeometry(0.03, 0.045, 0.14, 8),
    lampShade: new THREE.CylinderGeometry(0.05, 0.085, 0.09, 10),
    lantern: new THREE.SphereGeometry(0.16, 12, 9).scale(1, 1.15, 1),
    lanternRim: new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10),
    book: new THREE.BoxGeometry(0.035, 0.15, 0.11),
    boat: new THREE.CylinderGeometry(0.05, 0.05, 0.19, 10, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2),
    boatRice: new THREE.BoxGeometry(0.17, 0.03, 0.07),
    tray: new THREE.BoxGeometry(0.52, 0.02, 0.2),
    plateS: new THREE.CylinderGeometry(0.1, 0.09, 0.014, 14),
    tub: new THREE.CylinderGeometry(0.15, 0.14, 0.13, 14),
    tubBand: new THREE.CylinderGeometry(0.153, 0.153, 0.02, 14),
    squeeze: new THREE.CylinderGeometry(0.022, 0.022, 0.11, 8),
    bowl: new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    stackPl: new THREE.CylinderGeometry(0.1, 0.095, 0.08, 14),
  };
  const P = (geo, c, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, list = PROP.lit) => prop(geo, c, x, y, z, ry, 0, 0, sx, sy, sz, list);
  const boat = (x, y, z, ry) => {   // a hand roll as Roru serves it: a low, wide open nori boat (never a cone)
    const cs = Math.cos(ry), sn = Math.sin(ry);
    P(DG.boat, 0x1f2a1c, x, y + 0.05, z, ry);
    P(DG.boatRice, 0xf7f4ec, x, y + 0.035, z, ry);
    const tc = pick([0xff6f4f, 0xf58a5d, 0xd8332e, 0xf6cf5f, 0xee7a72]);
    for (let k = -2; k <= 2; k++) prop(PG.dot, tc, x + cs * k * 0.032, y + 0.058, z - sn * k * 0.032, 0, 0, 0, 1.9, 1.1, 1.6);
    prop(PG.dot, 0x9fd27a, x + cs * 0.05, y + 0.064, z - sn * 0.05, 0, 0, 0, 1.2, 0.8, 1.2);
  };
  // every seat: soy dish, sake cup, and between seats napkin holders and little menu stands
  seats.forEach((st, i) => {
    if (st.side === 'C') return;
    const u = st.side === 'F' ? [0, -1] : st.side === 'L' ? [1, 0] : [-1, 0], pp = [-u[1], u[0]];
    const at = (a, b) => [st.plate.x + pp[0] * a + u[0] * b, st.plate.z + pp[1] * a + u[1] * b];
    const ry = Math.atan2(u[0], u[1]);
    let [x, z] = at(-0.19, 0.02); P(DG.dish, 0xf3efe6, x, L.CH + 0.036, z); P(DG.dish, 0x2a1a12, x, L.CH + 0.042, z, 0, 0.7, 0.3, 0.7);
    [x, z] = at(-0.17, 0.13); P(DG.ochoko, pick([0xf6f3e7, 0x9fc8c2, 0x2f3b4a]), x, L.CH + 0.048, z);
    if (i % 2 === 0) { [x, z] = at(-0.3, 0.16); P(DG.napkin, 0xb8bfc6, x, L.CH + 0.065, z, ry); P(DG.napkinIn, 0xffffff, x, L.CH + 0.11, z, ry); }
    else { [x, z] = at(-0.3, 0.16); P(DG.standBase, 0x3a2418, x, L.CH + 0.036, z, ry); P(DG.stand, 0xf6f3e7, x, L.CH + 0.1, z, ry); P(DG.stand, ORANGE, x, L.CH + 0.14, z + 0.0005, ry, 1.02, 0.25, 1.1); }
    if (i % 3 === 1) { [x, z] = at(0.0, 0.22); P(DG.plateS, 0xf2ece0, x, L.CH + 0.038, z); boat(x - 0.02 * u[1], L.CH + 0.045, z, ry + Math.PI / 2); }
  });
  // low wall behind the long run: a wooden cap shelf carrying plants, sake, little lamps, books and jars
  const capY = 1.05, capZ = L.southZ - 0.12, x0 = L.glassX + 0.5, x1 = L.eastX - 0.3;
  P(DG.plank, 0x8a5a3c, (x0 + x1) / 2, capY + 0.02, capZ, 0, x1 - x0, 1, 1);
  { let i = 0; for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.42, i++) {
    if (x > -2.75 && x < 0.75) { if (i % 2) smallPlant(x, capZ, capY + 0.04); continue; }   // the neon sign stands here
    const k = i % 6, y = capY + 0.04;
    if (k === 0) { smallPlant(x, capZ, y); jar(x + 0.12, capZ + 0.04, y); }
    else if (k === 1) { sake(x - 0.06, capZ, y, true); sake(x + 0.06, capZ + 0.03, y); }
    else if (k === 2) { P(DG.lampBase, 0x2a2a2e, x, y + 0.07, capZ); P(DG.lampShade, 0xffe2b0, x, y + 0.18, capZ, 0, 1, 1, 1, PROP.glow); }
    else if (k === 3) { for (let b = 0; b < 4; b++) P(DG.book, pick([0xF64501, 0x2f6b45, 0xf2ece0, 0x1e3f5c, 0xe8c46a]), x - 0.06 + b * 0.04, y + 0.075, capZ, 0, 1, rr(0.8, 1.1), 1); }
    else if (k === 4) { canister(x, capZ, y); prop(PG.cup, 0xf1eee6, x + 0.12, y + 0.03, capZ); }
    else { smallPlant(x, capZ, y); sake(x + 0.13, capZ, y); }
  } }
  // bottle shelf unit at the west end of the wall (three tiers of sake + shochu)
  { const sx0 = -6.85, sx1 = -5.75, sz = L.southZ - 0.2;
    for (const xx of [sx0, sx1]) P(DG.post, 0x3a2418, xx, 1.05 + 0.55, sz, 0, 1, 1.1, 1);
    for (const ty of [1.1, 1.45, 1.8]) { P(DG.shelf, 0x8a5a3c, (sx0 + sx1) / 2, ty, sz, 0, sx1 - sx0 + 0.06, 1, 1); for (let xx = sx0 + 0.08; xx < sx1 - 0.04; xx += 0.11) sake(xx, sz + rr(-0.03, 0.03), ty + 0.015, rand() > 0.6); } }
  // paper lanterns over the hallway behind the guests
  for (let x = -5.2; x <= 4.9; x += 1.45) {
    prop(PG.cord, 0x1a1a1c, x, 2.75, 3.72, 0, 0, 0, 1, 0.9, 1);
    P(DG.lantern, 0xfff0d6, x, 2.2, 3.72, 0, 1, 1, 1, PROP.glow);
    P(DG.lanternRim, 0x1a1a1c, x, 2.38, 3.72); P(DG.lanternRim, 0x1a1a1c, x, 2.02, 3.72);
  }
  // prep bench: trays of ready hand-roll boats, a rice tub, stacked plates, bowls, sauce bottles
  { const [px0, pz0] = PLAN(1310, 1131), [px1, pz1] = PLAN(2473, 1294), pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pd = pz1 - pz0;
    const zb = pcz - pd / 2 + 0.14;
    for (let t = 0; t < 4; t++) { const tx = pcx - 2.0 + t * 1.3; P(DG.tray, 0x2a2a2e, tx, 0.96, zb); for (let b = -1; b <= 1; b++) boat(tx + b * 0.15, 0.97, zb, Math.PI / 2); }
    for (const tx of [pcx - 2.55, pcx + 2.5]) { P(DG.stackPl, 0xf2ece0, tx, 0.99, zb); for (let b = 0; b < 3; b++) P(DG.bowl, 0xe9e2d4, tx + 0.18, 1.01 + b * 0.025, zb, 0, 1, 1, 1); }
    for (let k = 0; k < 6; k++) P(DG.squeeze, k % 2 ? 0xd8332e : 0xf6cf5f, pcx - 0.7 + k * 0.28, 1.0, zb + 0.02);
  }
  // rice tubs + hinoki boxes at both ends of the long-run ledge
  for (const tx of [L.XL + 0.45, L.XR - 0.45]) { P(DG.tub, 0xc9955e, tx, LEDGE_Y + 0.065, L.F - 0.27); P(DG.tubBand, 0x6b6f75, tx, LEDGE_Y + 0.05, L.F - 0.27); P(DG.tubBand, 0x6b6f75, tx, LEDGE_Y + 0.11, L.F - 0.27); }
}
const propLit = new THREE.Mesh(mergeGeometries(PROP.lit), new THREE.MeshLambertMaterial({ vertexColors: true }));
propLit.castShadow = false; propLit.receiveShadow = false; scene.add(propLit);
const propGlow = new THREE.Mesh(mergeGeometries(PROP.glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
propGlow.userData.noShadow = true; scene.add(propGlow);
// a soft warm pool of light under each pendant (additive discs on the counter, no extra lights)
{ const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,140,0.55)'); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const pool = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const disc = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(disc, pool, PENDANTS.length);
  PENDANTS.forEach(([x, z], i) => { _pm.makeTranslation(x, L.CH + 0.042, z); im.setMatrixAt(i, _pm); });
  im.userData.noShadow = true; im.renderOrder = 2; scene.add(im); }


// ---------- v50: RORUBARU neon sign in Megazoid on the wall behind the long run, facing the counter ----------
const SAKE_FRIDGE = (() => { const fx = -4.9, fz = L.southZ - 0.3;
  box(0.72, 1.25, 0.36, steel, fx, 0.625, fz); plane(0.62, 1.05, fridgeFace, fx, 0.66, fz - 0.185, Math.PI);
  box(0.62, 0.05, 0.02, glow(0xff8a5c), fx, 1.2, fz - 0.19); SOLID.push([fx - 0.36, fz - 0.18, fx + 0.36, fz + 0.18]); return fx; })();
{ const nx = -1.0, nz = L.southZ - 0.16, ny = 1.6;
  box(2.95, 0.82, 0.05, mat(0x111114), nx, ny, nz + 0.03);
  box(0.04, 0.5, 0.04, mat(0x111114), nx - 1.2, 1.2, nz + 0.03); box(0.04, 0.5, 0.04, mat(0x111114), nx + 1.2, 1.2, nz + 0.03);
  const halo = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 32, 4, 128, 32, 128); gr.addColorStop(0, 'rgba(255,110,40,0.55)'); gr.addColorStop(1, 'rgba(255,110,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 64); return new THREE.CanvasTexture(c); })();
  const hp = plane(3.6, 1.2, new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), nx, ny, nz - 0.01, Math.PI); hp.userData.noShadow = true;
  const neonMat = new THREE.MeshBasicMaterial({ map: fitText('RORUBARU', { color: '#FFB27A', glowColor: 'rgba(246,69,1,0.95)' }), transparent: true, depthWrite: false });
  const np = plane(2.8, 0.7, neonMat, nx, ny, nz - 0.02, Math.PI); np.userData.noShadow = true; np.renderOrder = 3;
  MEGA_SIGNS.push([neonMat, () => fitText('RORUBARU', { color: '#FFC79E', glowColor: 'rgba(246,69,1,1)' })]);
}
// ---------- DJ booth (on the plan against the glass, DJ faces into the room) ----------
const dj = { x: -6.53, z: 2.27 };   // v47: plan PLAN(420..590, 1515..1860)
box(0.7, 1.0, 1.5, mat(0x121216), dj.x, 0.5, dj.z);
box(0.02, 0.06, 1.5, glow(ORANGE), dj.x + 0.36, 0.12, dj.z);
const boothFront = plane(1.5, 0.55, new THREE.MeshBasicMaterial({ map: textTexture('RORUBARU', { font: '900 150px Geist, sans-serif', color: '#F64501' }), transparent: true }), dj.x + 0.356, 0.62, dj.z, Math.PI / 2);
box(0.72, 0.04, 1.55, mat(0x2a2b30), dj.x, 1.02, dj.z);
MEGA_SIGNS.push([boothFront.material, () => fitText('RORUBARU', { color: '#F64501', glowColor: 'rgba(246,69,1,0.6)' })]);

const jogs = [];
for (const dz of [-0.45, 0.45]) {
  box(0.4, 0.05, 0.38, mat(0x1a1b1f), dj.x, 1.06, dj.z + dz);
  const jog = cyl(0.12, 0.12, 0.02, 16, mat(0x8a8f99), dj.x, 1.095, dj.z + dz); jogs.push(jog);
  box(0.06, 0.008, 0.2, glow(0xffd23a), dj.x - 0.15, 1.09, dj.z + dz);
}
box(0.36, 0.05, 0.3, mat(0x1a1b1f), dj.x, 1.06, dj.z);
for (let i = 0; i < 4; i++) box(0.04, 0.012, 0.04, glow(i % 2 ? 0x37e3ff : 0xff3dbb), dj.x + 0.1, 1.09, dj.z - 0.1 + i * 0.065);
SOLID.push([dj.x - 0.4, dj.z - 1.3, dj.x + 0.4, dj.z + 1.3]);
// speakers
for (const dz of [-1.05, 1.05]) { box(0.38, 0.62, 0.38, mat(0x101013), dj.x, 1.35, dj.z + dz); cyl(0.1, 0.1, 0.02, 12, mat(0x2b2c31), dj.x + 0.2, 1.4, dj.z + dz).rotation.z = Math.PI / 2; }

// Traffic lives in city.js: buses, minibuses, taxis and vans on the real roads, driving on the left;
// trams only on the Johnston Road / Hennessy Road tracks. (No tram on Queen's Road East.)

// ---------- people (v49 preview: chunky chibi figures with real faces: eyes that blink, little smiles, hair) ----------
// One unit = 1 m. Big round head, short chunky body; the hip sits at 0.56 m standing and is lifted onto the stool when seated.
const HIP = 0.56, SEAT_LIFT = 0.24;
function vColor(geo, hex) {   // bake one colour into a geometry so many parts merge into one draw call
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
function merged(parts) { return mergeGeometries(parts.map((g) => { const x = g.index ? g.toNonIndexed() : g; if (!x.attributes.color) vColor(x, 0xffffff); for (const k of Object.keys(x.attributes)) if (!['position', 'normal', 'color'].includes(k)) x.deleteAttribute(k); return x; })); }
const HEAD_R = 0.27;
// eyes: white sclera, big dark iris, two sparkle highlights — one mesh per pair, squashed on the y axis to blink
const EYES = (() => {
  const parts = [];
  for (const sx of [-1, 1]) {
    const w = vColor(new THREE.SphereGeometry(0.058, 12, 10).scale(0.95, 1.18, 0.4).translate(sx * 0.098, 0, 0), 0xffffff);
    const ir = vColor(new THREE.SphereGeometry(0.045, 12, 10).scale(0.95, 1.2, 0.4).translate(sx * 0.098, -0.006, 0.012), 0x1c1414);
    const h1 = vColor(new THREE.SphereGeometry(0.016, 8, 6).scale(1, 1, 0.4).translate(sx * 0.098 + 0.016, 0.022, 0.03), 0xffffff);
    const h2 = vColor(new THREE.SphereGeometry(0.008, 6, 5).scale(1, 1, 0.4).translate(sx * 0.098 - 0.014, -0.024, 0.028), 0xffffff);
    parts.push(w, ir, h1, h2);
  }
  return merged(parts);
})();
// mouth (a small smile) + rosy cheeks + tiny brows
const FACE = (() => {
  const smile = vColor(new THREE.TorusGeometry(0.03, 0.009, 5, 10, Math.PI).rotateZ(Math.PI).translate(0, -0.085, 0.004), 0x5a2a24);
  const cheeks = [-1, 1].map((sx) => vColor(new THREE.CircleGeometry(0.036, 12).translate(sx * 0.155, -0.058, 0.0).rotateY(sx * 0.55), 0xff9f9a));
  const brows = [-1, 1].map((sx) => vColor(new THREE.CapsuleGeometry(0.008, 0.04, 2, 4).rotateZ(Math.PI / 2 + sx * 0.12).translate(sx * 0.1, 0.085, 0), 0x3a2a22));
  return merged([smile, ...cheeks, ...brows]);
})();
const eyeMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const faceMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
// hair styles: the face window (around +z) is left open
const OPEN = Math.PI / 2;   // three.js sphere: phi = π/2 points at +z
const hcap = (r, t0, t1, gap = 0) => new THREE.SphereGeometry(r, 16, 10, OPEN + gap, Math.PI * 2 - gap * 2, t0, t1);
const HAIRS = [
  merged([hcap(0.285, 0, Math.PI * 0.42), hcap(0.283, 0, Math.PI * 0.62, 0.95), new THREE.SphereGeometry(0.12, 10, 8).scale(1.6, 0.55, 0.8).translate(0.04, 0.2, 0.17)]),                      // short with side-swept bangs
  merged([hcap(0.29, 0, Math.PI * 0.45), hcap(0.292, 0, Math.PI * 0.78, 0.82), new THREE.SphereGeometry(0.15, 10, 8).scale(1.7, 0.45, 0.8).translate(0, 0.19, 0.16)]),                        // bob with full bangs
  merged([hcap(0.285, 0, Math.PI * 0.42), hcap(0.283, 0, Math.PI * 0.6, 0.95), new THREE.SphereGeometry(0.11, 10, 8).translate(0, 0.3, -0.08), new THREE.SphereGeometry(0.11, 10, 8).scale(1.5, 0.5, 0.8).translate(-0.05, 0.2, 0.17)]),   // bun
  merged([hcap(0.29, 0, Math.PI * 0.45), hcap(0.29, 0, Math.PI * 0.7, 0.85), new THREE.CapsuleGeometry(0.08, 0.12, 3, 8).rotateX(0.5).translate(0, -0.02, -0.3), new THREE.SphereGeometry(0.05, 8, 6).translate(0, 0.1, -0.27), new THREE.SphereGeometry(0.14, 10, 8).scale(1.6, 0.45, 0.8).translate(0.03, 0.19, 0.16)]),   // ponytail
  merged([hcap(0.28, 0, Math.PI * 0.4), ...[0, 1, 2, 3, 4].map((i) => new THREE.ConeGeometry(0.06, 0.13, 6).rotateX(-0.5 + i * 0.05).rotateZ((i - 2) * 0.45).translate((i - 2) * 0.08, 0.27, 0.02 - Math.abs(i - 2) * 0.02))]),   // spiky
];
const G = {
  leg: new THREE.CapsuleGeometry(0.085, 0.34, 3, 10).translate(0, -0.25, 0),
  torso: new THREE.LatheGeometry([[0.0, -0.03], [0.17, -0.03], [0.205, 0.06], [0.215, 0.22], [0.205, 0.35], [0.15, 0.44], [0.06, 0.47], [0.0, 0.475]].map(([r, y]) => new THREE.Vector2(r, y)), 16),
  shoe: new THREE.SphereGeometry(0.095, 10, 8).scale(0.95, 0.6, 1.35).translate(0, -0.5, 0.045),
  hand: new THREE.SphereGeometry(0.066, 10, 8),
  head: merged([new THREE.SphereGeometry(HEAD_R, 20, 16).scale(1.04, 0.96, 1.0), ...[-1, 1].map((sx) => new THREE.SphereGeometry(0.05, 8, 6).scale(0.6, 1, 0.8).translate(sx * 0.27, -0.02, 0))]),   // skull + ears in one mesh
  arm: new THREE.CapsuleGeometry(0.06, 0.26, 3, 8).translate(0, -0.19, 0),
  cap: new THREE.SphereGeometry(0.295, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
  brim: new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14, 1, false, -Math.PI / 2, Math.PI).translate(0, 0, 0.2),
  band: new THREE.TorusGeometry(0.272, 0.028, 6, 24).rotateX(Math.PI / 2 - 0.25),
  apron: new THREE.CapsuleGeometry(0.17, 0.2, 3, 10).scale(1.15, 1, 0.16),
  logo: new THREE.PlaneGeometry(0.11, 0.035),
  phones: new THREE.TorusGeometry(0.29, 0.03, 6, 16, Math.PI),
  cup: new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10),
  shadow: new THREE.CircleGeometry(0.34, 18).rotateX(-Math.PI / 2),
};
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
const logoMat = new THREE.MeshBasicMaterial({ map: textTexture('RORUBARU', { w: 512, h: 128, font: '900 92px Geist, sans-serif', color: '#ffffff' }), transparent: true, depthWrite: false });
const SKIN = [0xffd9bf, 0xf3c4a2, 0xe2a77f, 0xc98c64, 0x9b6544, 0xffe2cf];
const HAIR = [0x2a1d18, 0x3b2a20, 0x5a3a26, 0x8a5c38, 0x161214, 0xc9a06a, 0x6b4a8a, 0xd9774f];
const SHIRTS = [0xf7a6a0, 0x9ccbe8, 0xb7e0b0, 0xffd27a, 0xc5b3f0, 0xf6f3e7, 0xff8f6b, 0x7fc8c0, 0xf2b8d4, 0x8fa8e0, 0xe8e0c8, 0x5e7fb8];
const PANTS = [0x3a4660, 0x4f5f86, 0x6b5844, 0x2a2a30, 0x9a8f7c, 0x56708a];

class Person {
  constructor(o = {}) {
    const g = this.group = new THREE.Group();
    this.body = new THREE.Group(); g.add(this.body);
    const skin = mat(o.skin ?? pick(SKIN)), shirt = mat(o.shirt ?? pick(SHIRTS)), pants = mat(o.pants ?? pick(PANTS));
    const shoeM = mat(o.shoe ?? pick([0x2a2a2e, 0xf4f1ea, 0x8a5a3c, 0x2a2a2e]));
    this.legs = [-0.095, 0.095].map(x => { const l = new THREE.Mesh(G.leg, pants); l.position.set(x, HIP, 0); l.add(new THREE.Mesh(G.shoe, shoeM)); this.body.add(l); return l; });
    const t = new THREE.Mesh(G.torso, shirt); t.position.y = HIP - 0.01; this.body.add(t);
    this.arms = [-0.245, 0.245].map((x, i) => { const a = new THREE.Mesh(G.arm, shirt); a.position.set(x, HIP + 0.38, 0); a.rotation.z = i ? 0.12 : -0.12; this.body.add(a); return a; });
    for (const a of this.arms) { const hand = new THREE.Mesh(G.hand, skin); hand.position.y = -0.37; a.add(hand); }
    const head = this.head = new THREE.Group(); head.position.y = HIP + 0.47 + HEAD_R * 0.86; this.body.add(head);
    head.add(new THREE.Mesh(G.head, skin));
    const eyes = this.eyes = new THREE.Mesh(EYES, eyeMat); eyes.position.set(0, -0.01, HEAD_R - 0.03); head.add(eyes);
    const face = new THREE.Mesh(FACE, faceMat); face.position.set(0, 0, HEAD_R - 0.005); head.add(face);
    const hairM = mat(o.hair ?? pick(HAIR));
    if (o.cap) {
      const c = new THREE.Mesh(G.cap, mat(o.cap)); c.position.y = 0.02; head.add(c);
      const b = new THREE.Mesh(G.brim, mat(o.cap)); b.position.set(0, 0.09, 0.0); b.rotation.x = 0.12; head.add(b);
      const fringe = new THREE.Mesh(HAIRS[0], hairM); fringe.scale.setScalar(0.99); head.add(fringe);
    } else if (!o.bald) { head.add(new THREE.Mesh(o.hairStyle !== undefined ? HAIRS[o.hairStyle] : pick(HAIRS), hairM)); }
    if (o.band) { const b = new THREE.Mesh(G.band, mat(o.band)); b.position.y = 0.1; head.add(b); }
    if (o.apron) {
      const a = new THREE.Mesh(G.apron, mat(o.apron)); a.position.set(0, HIP + 0.16, 0.19); this.body.add(a);
      const lg = new THREE.Mesh(G.logo, logoMat); lg.position.set(0, HIP + 0.29, 0.222); lg.userData.noShadow = true; this.body.add(lg);
    } else if (o.logo) { const lg = new THREE.Mesh(G.logo, logoMat); lg.position.set(0, HIP + 0.33, 0.212); lg.userData.noShadow = true; this.body.add(lg); }
    if (o.phones) { const p = new THREE.Mesh(G.phones, mat(0x222226)); p.position.y = 0.03; p.rotation.y = Math.PI / 2; head.add(p); }
    const sh = new THREE.Mesh(G.shadow, shadowMat); sh.position.y = 0.075; sh.userData.noShadow = true; g.add(sh); this.shadow = sh; g.children[0].userData.person = true; this.body.userData.person = true;
    const s = o.scale ?? rr(0.7, 0.74); this.body.scale.setScalar(s);   // v50: guests smaller so neighbours never touch (seat pitch 0.5–0.6 m)
    if (QUALITY === 'high') this.body.traverse((c) => { if (c.isMesh && !c.userData.noShadow && c.material !== eyeMat && c.material !== faceMat) c.castShadow = true; });
    this.path = []; this.speed = o.speed ?? rr(1.15, 1.45); this.phase = rand() * 6.28; this.seated = false;
    this.blinkIn = rr(0.5, 4); this.blinkT = -1;
    this.moving = false; this.heading = 0; this.targetHeading = null; this.anim = null; this.animT = 0;
    scene.add(g);
  }
  get x() { return this.group.position.x; } get z() { return this.group.position.z; }
  place(x, z) { this.group.position.set(x, 0, z); }
  go(points, done) { this.path = points.map(p => ({ x: p.x + (p.j ? 0 : 0), z: p.z })); this.done = done; }
  sit(face) {
    this.seated = true; this.targetHeading = face;
    this.legs.forEach(l => l.rotation.x = -Math.PI / 2);
    this.body.position.y = 0.79 - HIP * this.body.scale.y; this.shadow.visible = false;
  }
  stand() { this.seated = false; this.legs.forEach(l => l.rotation.x = 0); this.body.position.y = 0; this.shadow.visible = true; }
  update(dt, t) {
    const p = this.group.position;
    if (this.path.length) {
      const tgt = this.path[0];
      const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) { p.x = tgt.x; p.z = tgt.z; this.path.shift(); if (!this.path.length) { this.moving = false; const cb = this.done; this.done = null; cb && cb(); } }
      else { p.x += dx / d * step; p.z += dz / d * step; this.moving = true; this.targetHeading = Math.atan2(dx, dz); }
    } else this.moving = false;
    if (this.targetHeading !== null) {
      let diff = this.targetHeading - this.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.heading += diff * Math.min(1, dt * 10); this.group.rotation.y = this.heading;
    }
    // blink every few seconds (sometimes a double blink)
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blinkT = 0; this.blinkIn = rand() < 0.2 ? 0.28 : rr(2.2, 5.5); }
    if (this.blinkT >= 0) { this.blinkT += dt; const k = this.blinkT / 0.14; this.eyes.scale.y = k >= 1 ? 1 : Math.max(0.08, Math.abs(1 - 2 * k)); if (k >= 1) this.blinkT = -1; }
    // limbs: a bouncy little waddle
    if (this.moving) {
      this.phase += dt * this.speed * 7.5;
      const s = Math.sin(this.phase) * 0.6;
      this.legs[0].rotation.x = s; this.legs[1].rotation.x = -s;
      if (!this.anim) { this.arms[0].rotation.x = -s * 0.9; this.arms[1].rotation.x = s * 0.9; }
      this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.05;
      this.body.rotation.z = Math.sin(this.phase) * 0.05;
    } else if (!this.seated) {
      this.legs[0].rotation.x *= 0.8; this.legs[1].rotation.x *= 0.8; this.body.position.y *= 0.8; this.body.rotation.z *= 0.8;
      if (!this.anim) { this.arms[0].rotation.x *= 0.85; this.arms[1].rotation.x *= 0.85; }
    }
    if (this.anim) { this.animT += dt; this.anim(this, this.animT, dt, t); }
    else if (!this.moving) { this.arms[0].rotation.z = -0.12; this.arms[1].rotation.z = 0.12; }
  }
  setAnim(fn) { this.anim = fn; this.animT = 0; if (!fn) { this.arms[0].rotation.z = -0.12; this.arms[1].rotation.z = 0.12; } }
  remove() { scene.remove(this.group); }
}

// ---------- hand rolls: low, wide open nori boats — warm rice, the day's topping piled on top (never cones) ----------
const noriMat = mat(0x1e2a1f, { o: { side: THREE.DoubleSide } }), riceMat = mat(0xfbf7ee);
const TOPPINGS = [0xff6f4f, 0xf58a5d, 0xffb38a, 0xd8332e, 0xf6cf5f, 0xee7a72, 0x9fd27a];
// built along the local y axis with the open side toward local -z, so the sim's rotation.x = π/2 lays it flat, open side up
const ROLL_G = {
  nori: new THREE.CylinderGeometry(0.062, 0.062, 0.2, 14, 1, true, -Math.PI / 2, Math.PI),
  ends: new THREE.CircleGeometry(0.062, 12, 0, Math.PI),
  rice: new THREE.CylinderGeometry(0.056, 0.056, 0.19, 12).scale(1, 1, 0.62),
  top: new THREE.SphereGeometry(0.03, 8, 6).scale(1.3, 1.1, 0.7),
};
function makeRoll() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(ROLL_G.nori, noriMat));
  for (const y of [-0.1, 0.1]) { const e = new THREE.Mesh(ROLL_G.ends, noriMat); e.position.y = y; e.rotation.x = Math.PI / 2; g.add(e); }
  const rice = new THREE.Mesh(ROLL_G.rice, riceMat); rice.position.z = 0.004; g.add(rice);
  const top = mat(pick(TOPPINGS));
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(ROLL_G.top, top); f.position.set(rr(-0.018, 0.018), -0.07 + i * 0.047, -0.04 - rr(0, 0.012)); f.rotation.set(rr(0, 3), rr(0, 3), 0); g.add(f); }
  return g;
}

// ---------- hotspots: the room is the site — tap a thing, a panel opens and the camera moves in ----------
const labelLayer = document.getElementById('labels');
const labels = [];
function addLabel(text, x, y, z, key) {
  const el = document.createElement('div'); el.className = 'lbl'; el.innerHTML = text; labelLayer.appendChild(el);
  const l = { el, pos: new THREE.Vector3(x, y, z), key }; labels.push(l); return l;
}
const pops = document.getElementById('pops');
const _v = new THREE.Vector3();
function project(v) { _v.copy(v).project(camera); return { x: (_v.x * 0.5 + 0.5) * innerWidth, y: (-_v.y * 0.5 + 0.5) * innerHeight, vis: _v.z < 1 }; }
function popAt(world) {
  if (popList.length > 8) return;
  const el = document.createElement('div'); el.className = 'pop'; el.textContent = '+1'; pops.appendChild(el);
  popList.push({ el, w: world.clone().setY(world.y + 0.25), t: 0 });
}

// ---------- simulation ----------
const sim = {
  t: 0, rollsToday: 0, queueTarget: 9, seatTarget: 26,
  queue: [], inside: [], leaving: [], orders: [], chefs: [], served: 0, spawnCooldown: 0,
};
// opening hours drive the room: the same Hong Kong state as the header clock (hours.js)
// preview link only (or ?open): the demo room is always open so the characters can be seen at any hour
const FORCE_OPEN = params.has('open') || /room-preview/.test(location.hostname);
const shopState = () => (FORCE_OPEN ? 'open' : hkStatus(new Date()).state);
const SHOP = { state: shopState(), k: 0, closedAt: 0 };
// seed today's count from the HK clock (demo: about 1.15 rolls a minute since noon)
function hkNow() { const d = new Date(Date.now() + 8 * 3600e3); return { h: d.getUTCHours(), m: d.getUTCMinutes() }; }
{ const { h, m } = hkNow(); const mins = (h - 12) * 60 + m; sim.rollsToday = Math.max(0, Math.round(Math.min(mins, 630) * 1.15)); }

const QX = -8.25, QZ0 = L.doorZ - 0.85, QGAP = 0.62;
const slot = (i) => ({ x: QX + (i % 2 ? 0.05 : -0.05), z: QZ0 - i * QGAP });
function reflowQueue() {
  sim.queue.forEach((g, i) => {
    const s = slot(i);
    if (Math.abs(g.x - s.x) > 0.02 || Math.abs(g.z - s.z) > 0.02) {
      g.atSlot = false;
      const pts = (g.state === 'arriving' && g.z < s.z - 1.2) ? [{ x: -9.45, z: s.z - 0.6 }, s] : [s];
      g.go(pts, () => { g.atSlot = true; g.state = 'queued'; g.targetHeading = 0; });
    }
  });
}
function spawnArrival(direct = false) {
  const g = new Person();
  g.state = 'arriving'; g.atSlot = false;
  const i = sim.queue.length; sim.queue.push(g);
  if (direct) { const s = slot(i); g.place(s.x, s.z); g.atSlot = true; g.state = 'queued'; g.heading = g.targetHeading = 0; g.group.rotation.y = 0; }
  else { g.place(-9.45, -34); reflowQueue(); }
  // idle fidget: phone glance
  g.idleFn = rand() < 0.4 ? 'phone' : null;
}
const freeSeats = () => seats.filter(s => !s.occupied && !s.reserved);
function seatPath(s) {
  const p = [{ x: -8.0, z: L.doorZ }, { x: L.glassX + 0.6, z: L.doorZ }, { x: L.walkX, z: L.doorZ - 0.1 }];
  if (s.side === 'L' || s.side === 'C') p.push({ x: L.walkX, z: s.z }, { x: s.x, z: s.z });
  else if (s.side === 'F') p.push({ x: L.walkX, z: L.corrZ }, { x: s.x, z: L.corrZ }, { x: s.x, z: s.z });
  else p.push({ x: L.walkX, z: L.corrZ }, { x: L.aisleR, z: L.corrZ }, { x: L.aisleR, z: s.z }, { x: s.x, z: s.z });
  return p;
}
function seatGuest(g, s, direct = false) {
  s.reserved = true; g.seat = s; g.want = 3 + Math.floor(rand() * 2); g.eaten = 0; g.plate = []; g.holding = null; g.ordered = 0;
  g.state = 'entering';
  const arrive = () => {
    s.reserved = false; s.occupied = g; g.state = 'seated';
    g.place(s.x, s.z); g.sit(s.face);
    g.cup = new THREE.Mesh(G.cup, mat(CREAM)); scene.add(g.cup);
    const off = s.side === 'F' ? [0.22, 0] : s.side === 'C' ? [0.2, -0.06] : [0, s.side === 'L' ? -0.22 : 0.22];
    g.cup.position.set(s.plate.x + off[0], L.CH + 0.06, s.plate.z + off[1]);
    order(g);
    g.setAnim(guestIdle);
  };
  sim.inside.push(g);
  if (direct) { g.eaten = Math.floor(rand() * (g.want - 1)); g.ordered = g.eaten; arrive(); return; }
  g.go(seatPath(s), arrive);
}
function order(g) { if (SHOP.state === 'closed') return; if (g.ordered < g.want) { g.ordered++; sim.orders.push({ g, t: sim.t }); } }
function leave(g) {
  const s = g.seat; s.occupied = null; g.state = 'leaving'; g.stand(); g.setAnim(null);
  if (g.cup) { scene.remove(g.cup); g.cup = null; }
  sim.inside.splice(sim.inside.indexOf(g), 1); sim.leaving.push(g);
  const p = seatPath(s).reverse().slice(1);
  p.push({ x: -9.6, z: L.doorZ + 0.6 }, { x: -9.9, z: 34 });
  g.speed = rr(1.2, 1.5);
  g.go(p, () => drop(g));
}
// a figure that has left the scene for good
function drop(g) {
  if (g._gone) return; g._gone = true; cancelFade(g); g.remove(); g.path = []; g.done = null;
  for (const a of [sim.queue, sim.inside, sim.leaving]) { const i = a.indexOf(g); if (i >= 0) a.splice(i, 1); }
  if (g.seat) { if (g.seat.occupied === g) g.seat.occupied = null; g.seat.reserved = false; }
  if (g.cup) { scene.remove(g.cup); g.cup = null; }
  for (const r of g.plate || []) scene.remove(r); g.plate = [];
}

// guest animations
function guestIdle(p, t, dt) {
  // reach for the next roll on the plate
  if (!p.holding && p.plate.length && t > 0.3) {
    const r = p.plate.shift(); p.holding = r; r.userData.left = 1;
    p.arms[1].add(r); r.position.set(0, -0.42, 0.05); r.rotation.set(Math.PI / 2, 0, 0); p.eatT = 0;
  }
  if (p.holding) {
    p.eatT += dt;
    const k = Math.min(1, p.eatT / p.eatDur);
    const bite = (Math.sin(p.eatT * 2.4) + 1) / 2;
    p.arms[1].rotation.x = -0.8 - Math.pow(bite, 4) * 0.75;
    p.arms[1].rotation.z = 0.35;
    p.holding.scale.y = Math.max(0.12, 1 - k * 0.9);
    p.head.rotation.x = 0.12 - Math.pow(bite, 3) * 0.12;
    if (k > 0.55 && p.ordered < p.want && p.ordered === p.eaten + 1 + p.plate.length) order(p);
    if (k >= 1) {
      p.arms[1].remove(p.holding); p.holding = null; p.eaten++;
      p.arms[1].rotation.x = -0.4; p.head.rotation.x = 0;
      if (p.eaten >= p.want) { p.leaveIn = SHOP.state === 'closing' ? rr(40, 240) : 1.6; }
      else if (p.ordered <= p.eaten + p.plate.length) order(p);
    }
  } else {
    p.arms[1].rotation.x += (-0.7 - p.arms[1].rotation.x) * Math.min(1, dt * 4);
    p.arms[0].rotation.x += (-0.7 - p.arms[0].rotation.x) * Math.min(1, dt * 4);
    p.head.rotation.y = Math.sin(t * 0.7 + p.phase) * 0.35; // chatting / watching the chefs
  }
  if (p.leaveIn !== undefined) { p.leaveIn -= dt; if (p.leaveIn <= 0) { p.leaveIn = undefined; p.head.rotation.set(0, 0, 0); leave(p); } }
}

// chefs (black tees, grey aprons, caps — as on opening night)
const CHEF_HOMES = [-3.3, -1.9, -0.5, 0.9, 2.3, 3.2].map(x => ({ x, z: 1.05 }));
CHEF_HOMES.forEach((h, i) => {
  const c = new Person({ shirt: 0x17171a, pants: 0x1c1c20, apron: 0x2e2e33, shoe: 0x111114, cap: i === 2 ? ORANGE : (i % 2 ? 0x111111 : null), band: i % 2 || i === 2 ? null : CREAM, hairStyle: [0, 2, 0, 4, 1, 3][i], speed: 1.7, scale: 0.8 });
  c.place(h.x, h.z); c.home = h; c.state = 'idle'; c.heading = c.targetHeading = Math.PI; c.group.rotation.y = Math.PI;
  sim.chefs.push(c);
});
function chefRoute(c, to) {
  const pts = [];
  if (Math.abs(c.z - L.laneZ) > 0.05) pts.push({ x: c.x, z: L.laneZ });
  if (Math.abs(c.x - to.x) > 0.05) pts.push({ x: to.x, z: L.laneZ });
  pts.push(to); return pts;
}
function chefRolling(c, t) {
  const w = Math.sin(t * 9) * 0.18;
  c.arms[0].rotation.x = -1.15 + w; c.arms[1].rotation.x = -1.15 - w;
  c.arms[0].rotation.z = -0.35; c.arms[1].rotation.z = 0.35;
  c.head.rotation.x = 0.35;
}
function assignChef(c) {
  if (!sim.orders.length) {
    if (Math.hypot(c.x - c.home.x, c.z - c.home.z) > 0.05) { c.state = 'walk'; c.go(chefRoute(c, c.home), () => { c.state = 'idle'; c.targetHeading = Math.PI; }); }
    else c.state = 'idle';
    return;
  }
  let best = 0, bestCost = 1e9;
  for (let i = 0; i < Math.min(sim.orders.length, 8); i++) {
    const o = sim.orders[i], s = o.g.seat;
    const cost = Math.hypot(c.x - s.chef.x, c.z - s.chef.z) - (sim.t - o.t) * 0.9;
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  const o = sim.orders.splice(best, 1)[0];
  c.order = o; c.state = 'walk';
  c.go(chefRoute(c, o.g.seat.chef), () => {
    c.state = 'roll'; c.targetHeading = o.g.seat.chefFace; c.rollDur = rr(1.5, 2.1);
    c.setAnim((p, t) => {
      chefRolling(p, t);
      if (t > 0.5 && !p.roll) { p.roll = makeRoll(); p.arms[1].add(p.roll); p.roll.position.set(-0.04, -0.42, 0.08); p.roll.rotation.set(1.2, 0, 0); }
      if (t > p.rollDur) handOver(p);
    });
  });
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const flying = [];
function handOver(c) {
  const o = c.order, g = o.g, s = g.seat, r = c.roll;
  c.roll = null; c.order = null;
  r.getWorldPosition(_a); scene.attach(r);
  flying.push({ r, from: _a.clone(), to: new THREE.Vector3(s.plate.x, L.CH + 0.09, s.plate.z), t: 0, dur: 0.55, g, s });
  c.state = 'hand';
  c.setAnim((p, t) => {
    p.arms[1].rotation.x = -1.5; p.arms[0].rotation.x = -0.4; p.arms[0].rotation.z = 0; p.arms[1].rotation.z = 0; p.head.rotation.x = 0.1;
    if (t > 0.45) { p.setAnim(null); p.head.rotation.x = 0; assignChef(p); }
  });
}
function updateFlying(dt) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]; f.t += dt; const k = Math.min(1, f.t / f.dur);
    f.r.position.lerpVectors(f.from, f.to, k); f.r.position.y += Math.sin(k * Math.PI) * 0.18;
    f.r.rotation.x = 1.2 + k * 0.37;
    if (k >= 1) {
      flying.splice(i, 1);
      f.r.rotation.set(Math.PI / 2, 0, 0);
      if (f.s.side !== 'F') f.r.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      if (f.g.state === 'seated') { f.g.plate.push(f.r); f.g.eatDur = rr(10, 14); }
      else scene.remove(f.r);
      sim.served++; if (LIVE.source !== 'feed') sim.rollsToday++;
      popAt(f.to);
    }
  }
}

// DJ, host and back-kitchen cook
const djP = new Person({ shirt: 0x111114, pants: 0x1a1a1d, phones: true, hair: 0x111111, hairStyle: 4, logo: true, speed: 1, scale: 0.82 });
djP.place(dj.x - 0.55, dj.z); djP.heading = djP.targetHeading = Math.PI / 2; djP.group.rotation.y = Math.PI / 2;
djP.setAnim((p, t) => {
  const beat = t * (124 / 60) * Math.PI * 2;
  p.body.position.y = Math.abs(Math.sin(beat / 2)) * 0.05;
  p.head.rotation.x = Math.sin(beat) * 0.12;
  p.arms[0].rotation.x = -0.9 + Math.sin(beat / 4) * 0.15; p.arms[0].rotation.z = -0.25;
  p.arms[1].rotation.x = -0.75 + (Math.sin(beat / 8) > 0.6 ? Math.sin(beat * 2) * 0.35 : 0); p.arms[1].rotation.z = 0.2;
  if (t % 16 > 13) p.arms[0].rotation.x = -2.6 + Math.sin(beat) * 0.2; // hands up for the drop
});
const host = new Person({ shirt: 0x17171a, pants: 0x1c1c20, logo: true, hairStyle: 3, speed: 1, scale: 0.8 });
host.place(-6.55, 0.85); host.heading = host.targetHeading = Math.PI; host.group.rotation.y = Math.PI;
const cook = new Person({ shirt: 0x17171a, pants: 0x1c1c20, apron: 0x2e2e33, shoe: 0x111114, cap: 0x111111, speed: 1.1, scale: 0.8 });
cook.place(-1.9, -1.2);
function cookLoop() { cook.go([{ x: 1.4, z: -1.2 }], () => { cook.targetHeading = Math.PI; cook.setAnim(chefRolling); setTimeoutSim(() => { cook.setAnim(null); cook.head.rotation.x = 0; cook.go([{ x: -1.9, z: -1.2 }], () => { cook.targetHeading = Math.PI; cook.setAnim(chefRolling); setTimeoutSim(() => { cook.setAnim(null); cook.head.rotation.x = 0; cookLoop(); }, 5); }); }, 4); }); }
const simTimers = [];
function setTimeoutSim(fn, s) { simTimers.push({ fn, at: sim.t + s }); }
cookLoop();

// ---------- tick ----------
function stepSim(dt) {
  sim.t += dt;
  for (let i = simTimers.length - 1; i >= 0; i--) if (simTimers[i].at <= sim.t) { const f = simTimers[i].fn; simTimers.splice(i, 1); f(); }
  // queue target drifts so the line breathes (unless a real number is set)
  if (!LIVE.stats || typeof LIVE.stats.queue !== 'number') sim.queueTarget = Math.round(8 + 3 * Math.sin(sim.t / 70) + 1.5 * Math.sin(sim.t / 23));
  sim.spawnCooldown -= dt;
  if (SHOP.state === 'open' && sim.queue.length < Math.min(14, sim.queueTarget) && sim.spawnCooldown <= 0) { spawnArrival(); sim.spawnCooldown = sim.queue.length < sim.queueTarget - 3 ? rr(0.45, 0.9) : rr(1.1, 2.4); }
  // seat the head of the line
  const filled = seats.filter(s => s.occupied || s.reserved).length;
  const head = sim.queue[0];
  if (SHOP.state === 'open' && head && head.atSlot && filled < sim.seatTarget) {
    const fs = freeSeats();
    if (fs.length) {
      const s = pick(fs);
      sim.queue.shift(); seatGuest(head, s); reflowQueue();
      door.rotation.y = -1.3; doorOpenT = 1.6;
    }
  }
  if (doorOpenT > 0) { doorOpenT -= dt; if (doorOpenT <= 0) door.rotation.y = -0.9; }
  for (const c of sim.chefs) if (c.state === 'idle' && sim.orders.length) assignChef(c);
  for (const c of sim.chefs) c.update(dt, sim.t);
  for (const g of sim.queue) {
    g.update(dt, sim.t);
    if (g.state === 'queued' && g.idleFn === 'phone') { g.arms[1].rotation.x = -1.3; g.head.rotation.x = 0.35; }
  }
  for (const g of sim.inside.slice()) g.update(dt, sim.t);
  for (const g of sim.leaving.slice()) g.update(dt, sim.t);
  djP.update(dt, sim.t); host.update(dt, sim.t); cook.update(dt, sim.t);
  host.head.rotation.y = Math.sin(sim.t * 0.5) * 0.5;
  updateFlying(dt);
  // DJ booth details
  jogs.forEach((j, i) => j.rotation.y += dt * (i ? 3.4 : 2.9));
  djLight.intensity = (7 + 5 * Math.max(0, Math.sin(sim.t * (124 / 60) * Math.PI * 2))) * (1 - SHOP.k);
  stepShop(dt);
}
let doorOpenT = 0;


// Central teaser pin (not a model of the shop — just a marker down the road)
const CENTRAL = { x: -10.9, z: -44 }; // up Queen's Road East toward Admiralty / Central (west)
{
  const pinMat = glow(ORANGE);
  cyl(0.06, 0.06, 3.4, 6, pinMat, CENTRAL.x, 1.7, CENTRAL.z);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), pinMat); head.position.set(CENTRAL.x, 3.6, CENTRAL.z); scene.add(head);
  const sign = new THREE.Sprite(langSign(new THREE.SpriteMaterial({ transparent: true, fog: false }), { en: ['CENTRAL', 'COMING SOON'], zh: ['中環', '即將開業'], ja: ['セントラル', '近日オープン'] }, { w: 1024, h: 420, font: '900 112px Geist, sans-serif', color: '#F6F3E7', bg: 'rgba(246,69,1,0.94)' }));
  sign.scale.set(4.6, 1.9, 1); sign.position.set(CENTRAL.x, 5.4, CENTRAL.z); scene.add(sign);
}

const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
const proxies = [];
function proxy(key, w, h, d, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), proxyMat); m.position.set(x, y, z); m.userData.hot = key; parent.add(m); proxies.push(m); return m;
}
// floor glow rings that pulse under each tappable thing
const ringGeo = new THREE.RingGeometry(0.62, 0.8, 28); ringGeo.rotateX(-Math.PI / 2);
const rings = [];
function ring(x, y, z, s = 1, parent = scene) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(s); m.userData.s = s; m.userData.ph = rings.length * 0.9; parent.add(m); rings.push(m); return m;
}
const keyChef = sim.chefs[2];
const HOT = {
  menu:    { label: 'Menu',            anchor: new THREE.Vector3(0.9, 1.75, L.F + 0.1), view: { t: [0.2, 0.9, 2.0], az: -0.25, pol: 0.95, d: 10.5 } },
  build:   { label: 'How it’s rolled', anchor: () => _hotA.copy(keyChef.group.position).setY(2.15), view: { t: () => [keyChef.group.position.x, 1.2, 1.0], az: -0.12, pol: 1.0, d: 7.6 } },
  dj:      { label: 'DJ night',        anchor: new THREE.Vector3(dj.x, 2.1, dj.z), view: { t: [-6.6, 1.1, dj.z], az: 1.12, pol: 1.04, d: 6.6 } },
  drinks:  { label: 'Drinks',          anchor: new THREE.Vector3(-2.2, 2.65, L.backZ - 0.3), view: { t: [-1.4, 1.2, -2.0], az: -0.1, pol: 1.05, d: 9.5 } },
  walkin:  { label: 'Walk-ins',        anchor: new THREE.Vector3(QX, 2.2, QZ0 - 1.3), view: { t: [-8.3, 0.8, -6.2], az: -0.9, pol: 0.95, d: 11 } },
  visit:   { label: 'Visit',           anchor: new THREE.Vector3(L.glassX - 0.3, 2.6, L.doorZ - 1.35), view: { t: [-7.6, 1.2, L.doorZ], az: -1.2, pol: 1.05, d: 9.5 } },
  central: { label: 'Central · coming soon', anchor: new THREE.Vector3(CENTRAL.x, 6.7, CENTRAL.z), view: { t: [CENTRAL.x, 2.0, CENTRAL.z + 4], az: -0.75, pol: 0.86, d: 30 } },
  events:  { label: 'Events',     anchor: new THREE.Vector3(EVW.x + 1.5, EVW.y + EVW.h / 2 + 1.75, EVW.z + 0.2), view: { t: [EVW.x + 0.3, 1.95, EVW.z + 0.4], az: -0.22, pol: 1.36, d: 4.4 } },
  delivery: { label: 'Delivery', anchor: new THREE.Vector3(L.glassX, 0.3, 2.5), view: { t: [-7.6, 1.2, L.doorZ], az: -1.2, pol: 1.05, d: 9.5 } },
  lunch:   { view: { t: [2.6, 0.9, 2.0], az: 0.12, pol: 0.92, d: 10.5 } },
  social:  { label: 'IG · FB',         anchor: new THREE.Vector3(3.35, 1.55, L.F + 0.13), view: { t: [3.2, 1.0, 2.2], az: 0.3, pol: 0.82, d: 5.2 } },
};
const _hotA = new THREE.Vector3();
// proxies (what a tap on the 3D room hits)
proxy('menu', L.XR - L.XL + 1.6, 1.3, 1.3, (L.XL + L.XR) / 2, 0.65, L.F);
proxy('menu', 1.3, 1.3, L.F - L.ZB + 0.6, L.XL, 0.65, (L.F + L.ZB) / 2);
proxy('menu', 1.3, 1.3, L.F - L.ZBR + 0.6, L.XR, 0.65, (L.F + L.ZBR) / 2);
for (const c of sim.chefs) { proxy('build', 0.75, 1.9, 0.75, 0, 0.95, 0, c.group); }
proxy('dj', 1.3, 2.2, 3.8, dj.x, 1.1, dj.z);
proxy('drinks', 5.2, 2.5, 0.9, -0.3, 1.25, L.backZ - 0.3);
proxy('walkin', 1.8, 2.2, 10, QX, 1.1, QZ0 - 4.6);
proxy('visit', 1.2, 3.2, 2.6, L.glassX - 0.2, 1.6, L.doorZ - 0.4);
proxy('central', 2.2, 7, 2.2, CENTRAL.x, 3.5, CENTRAL.z);
proxy('events', EVW.w + 0.2, EVW.h + 0.6, 0.4, EVW.x, EVW.y + 0.2, EVW.z + 0.1);
// small lit DELIVERY plate on the street wall beside the door (opens foodpanda / Keeta); its word follows the language toggle
{ const dm = langSign(new THREE.MeshBasicMaterial({ transparent: true }), { en: ['DELIVERY'], zh: ['外賣'], ja: ['デリバリー'] }, { w: 512, h: 300, font: '900 92px Geist, sans-serif', color: '#F6F3E7', bg: 'rgba(246,69,1,0.94)' });
  box(0.05, 0.46, 0.76, mat(0x111216), L.glassX - 0.12, 2.0, L.doorZ - 1.35);
  const dp = plane(0.7, 0.4, dm, L.glassX - 0.15, 2.0, L.doorZ - 1.35, -Math.PI / 2); dp.userData.keep = true;
  proxy('delivery', 0.4, 0.6, 0.9, L.glassX - 0.2, 2.0, L.doorZ - 1.35); }
// ---------- Instagram + Facebook: a phone on the bar (Dominic, Oct 13: phone only, no neon / polaroids) ----------
// the panel ('social', index.html tpl-social) carries the real links, as on rorubaru.com's own footer
const softGlowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// a phone lying on the bar counter; now and then it buzzes and a notification lights the screen
const PHONE = { x: 3.35, z: L.F + 0.13, y: L.CH + 0.032, buzzAt: 3, buzzT: -1, lit: 0 };
{
  const grp = new THREE.Group(); grp.position.set(PHONE.x, PHONE.y, PHONE.z); grp.rotation.y = 0.42; scene.add(grp);
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const thumbs = [];
  ['social/p1.jpg', 'social/p3.jpg'].forEach((s) => { const im = new Image(); im.onload = () => { thumbs.push(im); draw(PHONE.lit); }; im.src = s; });
  function draw(on) {
    g.clearRect(0, 0, 256, 512);
    const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, on ? '#2a1830' : '#07080b'); bg.addColorStop(1, on ? '#0d1830' : '#050608'); g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
    g.fillStyle = on ? '#F6F3E7' : 'rgba(246,243,231,0.28)'; g.textAlign = 'center'; g.font = '700 64px Geist, sans-serif'; g.fillText('9:41', 128, 120);
    if (!on) return void (tex.needsUpdate = true);
    // notification card
    g.fillStyle = 'rgba(246,243,231,0.92)'; rrect(g, 14, 168, 228, 132, 22); g.fill();
    const ig = g.createLinearGradient(26, 220, 70, 180); ig.addColorStop(0, '#FEDA75'); ig.addColorStop(0.4, '#FA7E1E'); ig.addColorStop(0.7, '#D62976'); ig.addColorStop(1, '#4F5BD5');
    g.fillStyle = ig; rrect(g, 26, 182, 40, 40, 11); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3.5; rrect(g, 34, 190, 24, 24, 7); g.stroke(); g.beginPath(); g.arc(46, 202, 6, 0, 7); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#14151b'; g.font = '700 21px Geist, sans-serif'; g.fillText('rorubaru', 76, 200);
    g.font = '500 18px Geist, sans-serif'; g.fillStyle = '#3a3b44'; g.fillText('new post', 76, 222);
    if (thumbs[0]) g.drawImage(thumbs[0], 26, 236, 52, 52); if (thumbs[1]) g.drawImage(thumbs[1], 84, 236, 52, 52);
    g.fillStyle = '#F64501'; g.font = '800 18px Geist, sans-serif'; g.fillText('tap', 150, 268);
    // two big buttons, as in the panel
    g.fillStyle = ig; rrect(g, 22, 330, 212, 56, 16); g.fill();
    g.fillStyle = '#1877F2'; rrect(g, 22, 400, 212, 56, 16); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 24px Geist, sans-serif'; g.fillText('Instagram', 128, 366); g.fillText('Facebook', 128, 436);
    tex.needsUpdate = true;
  }
  draw(false);
  const W = 0.15, D = 0.3;   // a touch bigger than life so it reads from the home view
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 0.016, D), mat(0x15161a)); body.position.y = 0.008; grp.add(body);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.008, 0.012, D + 0.008), mat(0x8a8f98)); rim.position.y = 0.006; grp.add(rim);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.014, D - 0.018), new THREE.MeshBasicMaterial({ map: tex })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.0165; grp.add(scr);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshBasicMaterial({ map: softGlowTex, color: 0xffb08a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.003; grp.add(halo);
  PHONE.grp = grp; PHONE.draw = draw; PHONE.halo = halo;
  proxy('social', 0.6, 0.45, 0.62, PHONE.x, PHONE.y + 0.2, PHONE.z);
}
function stepPhone(dt) {
  if (!PHONE.grp) return;
  PHONE.buzzAt -= dt;
  if (PHONE.buzzAt <= 0) { PHONE.buzzAt = 7 + Math.random() * 5; PHONE.buzzT = 0; if (!PHONE.lit) { PHONE.lit = 1; PHONE.draw(true); } }
  let jig = 0;
  if (PHONE.buzzT >= 0) {
    PHONE.buzzT += dt;
    const b = PHONE.buzzT;
    if ((b < 0.45) || (b > 0.6 && b < 1.05)) jig = Math.sin(b * 95) * 0.006;
    if (b > 4.2) { PHONE.buzzT = -1; PHONE.lit = 0; PHONE.draw(false); }
  }
  PHONE.grp.position.x = PHONE.x + jig; PHONE.grp.rotation.y = 0.42 + jig * 3;
  const want = PHONE.lit ? 0.6 : 0; PHONE.halo.material.opacity += (want - PHONE.halo.material.opacity) * Math.min(1, dt * 6);
}
ring(PHONE.x, L.CH + 0.035, PHONE.z, 0.55);
ring(0.9, 1.02, L.F, 1.2);
ring(0, 0.03, 0, 0.75, keyChef.group);
ring(dj.x + 0.9, 0.03, dj.z, 1.3);
ring(-2.2, 0.03, L.backZ + 0.5, 1.2);
ring(QX, 0.03, QZ0 - 0.6, 1.1);
ring(L.glassX - 0.8, 0.03, L.doorZ, 1.1);
ring(CENTRAL.x, 0.04, CENTRAL.z, 2.2);
ring(EVW.x, 0.03, EVW.z + 0.75, 1.0);

const hotLayer = document.getElementById('hotspots');
const hotEls = [];
// pins over the room: only what the bottom bar doesn't already carry (v20 declutter), plus Delivery
// (Dominic, Oct 13 2026: wants it clickable in the room too). Menu, drinks,
// walk-ins and Central still open from a tap on the room itself, the bottom bar or More.
const NO_PIN = new Set(['menu', 'drinks', 'walkin', 'central']);
for (const [key, h] of Object.entries(HOT)) {
  if (!h.label || NO_PIN.has(key)) continue;
  // a pin with an href is a plain link (Instagram): a real <a>, so it opens in a new tab everywhere
  const b = document.createElement(h.href ? 'a' : 'button'); b.className = 'hs' + (key === 'central' ? ' hs-central' : '') + (h.href ? ' hs-link' : '');
  if (h.href) { b.href = h.href; b.target = '_blank'; b.rel = 'noopener'; } else { b.type = 'button'; b.dataset.open = key; }
  b.innerHTML = '<span class="hs-dot" aria-hidden="true"></span><span class="hs-t" data-t="hs.' + key + '">' + h.label + '</span>';
  b.setAttribute('aria-label', h.href ? 'RORUBARU on Instagram (opens in a new tab)' : key === 'social' ? 'Open Instagram and Facebook' : 'Open ' + h.label.replace('·', ''));
  hotLayer.appendChild(b); hotEls.push({ el: b, key, h });
}
if (window.RORU_I18N) window.RORU_I18N.apply(hotLayer);

// ---------- camera moves (smooth fly to a hotspot, and home again) ----------
const fly = { on: false, t: 0, dur: 1.1, from: null, to: null, offFrom: [0, 0], offTo: [0, 0] };
let viewOff = [0, 0];
let activeKey = null;
function camState() {
  const sp = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  return { t: controls.target.clone(), az: sp.theta, pol: sp.phi, d: sp.radius };
}
function viewFor(key) {
  if (!key) return { t: homeView.target.clone(), az: homeView.az, pol: homeView.polar, d: homeView.dist };
  const v = HOT[key].view; const tt = typeof v.t === 'function' ? v.t() : v.t;
  const portrait = innerWidth / innerHeight < 0.9;
  return { t: new THREE.Vector3(...tt), az: v.az, pol: v.pol, d: key === 'central' ? v.d * (portrait ? 1.05 : 1) : v.d * (portrait ? 1.45 : 1.22) };
}
function offsetFor(key) {
  if (!key) return [0, 0];
  const portrait = innerWidth < 760;
  // keep the object clear of the panel: sheet from the bottom on phones, side panel on desktop
  if (portrait) {
    const pEl = document.getElementById('panel');
    const ph = pEl && !pEl.hidden ? pEl.offsetHeight : innerHeight * 0.5;
    const topH = 110, tabsH = 62;
    const panelTop = innerHeight - tabsH - ph;
    const centre = (topH + panelTop) / 2;
    return [0, Math.max(0, Math.min(innerHeight * 0.34, innerHeight / 2 - centre))];
  }
  return [Math.min(220, innerWidth * 0.16), 0];
}
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function flyTo(key, dur) {
  activeKey = key;
  fly.from = camState(); fly.to = viewFor(key);
  // shortest way round
  fly.offFrom = viewOff.slice(); fly.offTo = offsetFor(key);
  fly.t = 0; fly.start = performance.now(); fly.dur = dur || (key === 'central' || fly.from.d > 30 && key ? 1.5 : 1.15); fly.on = true;
  controls.autoRotate = false; lastInteract = performance.now();
}
function applyOffset() {
  if (viewOff[0] === 0 && viewOff[1] === 0) camera.clearViewOffset();
  else camera.setViewOffset(innerWidth, innerHeight, viewOff[0], viewOff[1], innerWidth, innerHeight);
}
function stepFly(dt) {
  if (!fly.on) return;
  // wall-clock timing so a slow frame rate never stretches the move (capture mode steps by dt)
  fly.t = CAPTURE ? fly.t + dt / fly.dur : (performance.now() - fly.start) / 1000 / fly.dur;
  const k = ease(Math.min(1, fly.t));
  if (activeKey === 'build') { const tt = HOT.build.view.t(); fly.to.t.set(tt[0], tt[1], tt[2]); }
  controls.target.lerpVectors(fly.from.t, fly.to.t, k);
  // central: lift up and out, then glide
  const lift = (activeKey === 'central' || (fly.from.d > 30 && !activeKey)) ? 0 : Math.sin(k * Math.PI) * 0.12;
  const sp = new THREE.Spherical(fly.from.d + (fly.to.d - fly.from.d) * k, Math.max(0.3, fly.from.pol + (fly.to.pol - fly.from.pol) * k - lift), fly.from.az + (fly.to.az - fly.from.az) * k);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp));
  camera.lookAt(controls.target);
  viewOff = [fly.offFrom[0] + (fly.offTo[0] - fly.offFrom[0]) * k, fly.offFrom[1] + (fly.offTo[1] - fly.offFrom[1]) * k];
  applyOffset();
  if (fly.t >= 1) fly.on = false;
}
// the UI layer (ui.js) owns the panels; the room asks it to open one, and it tells the room where to look
window.addEventListener('roru:panel', (e) => {
  const key = e.detail && e.detail.key;
  if (!key && mode !== 'room') { document.body.classList.remove('panel-open'); return; }
  if (key && mode !== 'room') { mode = 'room'; document.body.dataset.mode = 'room'; const wasWalk = document.body.dataset.walking === '1'; document.querySelectorAll('.dock [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === 'room'))); if (!walkHud.hidden) exitWalk(); Object.assign(controls, ROOM_LIMITS); controls.enabled = true; city.setGhost(true); frame(false); }
  flyTo(key && HOT[key] ? key : null);
  document.body.classList.toggle('panel-open', !!key);
});

// tap detection on the canvas (a tap, not a drag, picks the thing under the finger)
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!down || e.pointerId !== down.id) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dtp = performance.now() - down.t; down = null;
  if (moved > 10 || dtp > 600) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(proxies, false)[0];
  if (hit) window.RORU_UI && window.RORU_UI.open(hit.object.userData.hot, 'room');
  else if (activeKey && innerWidth >= 760) window.RORU_UI && window.RORU_UI.close();
}, { passive: true });
let hoverRaf = 0;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    canvas.style.cursor = ray.intersectObjects(proxies, false).length ? 'pointer' : '';
  });
}, { passive: true });


const settingMeshes = [];   // place settings (plates, chopsticks, soy dishes, carafes), hidden after hours
// ---------- batch the static set: one draw call per material instead of one per box (keeps phones smooth) ----------
{
  scene.updateMatrixWorld(true);
  const skip = new Set([...jogs, ...rings, ...proxies]);
  const groups = new Map();
  for (const o of [...scene.children, ...world.children]) {
    if (!o.isMesh || skip.has(o) || !o.geometry.index) continue;
    const k = o.material.uuid + (o.userData.setting ? ':set' : '');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(o);
  }
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => { const g = m.geometry.clone().applyMatrix4(m.matrixWorld); for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n); return g; });
    const g = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!g) continue;
    const mesh = new THREE.Mesh(g, list[0].material);
    mesh.renderOrder = list[0].renderOrder;
    if (list[0].userData.setting) mesh.userData.setting = true;
    scene.add(mesh);
    for (const m of list) { m.parent.remove(m); m.geometry.dispose(); }
    merged += list.length;
  }
  window.__merged = merged;
  for (const o of scene.children) if (o.userData.setting) settingMeshes.push(o);
  // photo textures tile in metres (world space), so long counters and walls don't stretch them
  scene.updateMatrixWorld(true);
  for (const o of [...scene.children]) worldUV(o);
  // soft shadows on the high tier: one warm key light over the counter
  if (QUALITY === 'high') {
    const key = new THREE.DirectionalLight(0xffe0bf, 0.55); key.position.set(-3, 9, 5); key.target.position.set(0, 0, 0.5);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 20 }); scene.add(key, key.target);
    for (const o of scene.children) if (o.isMesh) { if (o.material === counterTop || o.material === counterBody || o.material === steel) o.castShadow = true; if (o.material === floorMat || o.material === counterTop) o.receiveShadow = true; }
    for (const o of scene.children) if (o.isGroup && o.children.some((c) => c.userData.person)) o.traverse((c) => { if (c.isMesh && !c.userData.noShadow) c.castShadow = true; });
  }
}
function worldUV(o) {
  const s = o.isMesh && o.material && o.material.userData && o.material.userData.wuv; if (!s) return;
  const g = o.geometry, P0 = g.attributes.position, N0 = g.attributes.normal, U = g.attributes.uv; if (!U || !N0) return;
  o.updateMatrixWorld(true);
  const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
  for (let i = 0; i < P0.count; i++) {
    _p.fromBufferAttribute(P0, i).applyMatrix4(o.matrixWorld); _n.fromBufferAttribute(N0, i).applyMatrix3(_nm);
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    if (ay >= ax && ay >= az) U.setXY(i, _p.x / s, _p.z / s); else if (ax >= az) U.setXY(i, _p.z / s, _p.y / s); else U.setXY(i, _p.x / s, _p.y / s);
  }
  U.needsUpdate = true;
}


// ---------- the real street around the shop (OpenStreetMap), day/night, and the three ways to look ----------
const city = buildCity(scene);
if (params.has('nocity')) city.group.visible = false;

camera.far = 3200; camera.updateProjectionMatrix();
scene.fog = new THREE.Fog(0x0b0d12, 150, 640);
// pieces that only exist while you walk inside: a ceiling and the full-height side wall
const walkShell = new THREE.Group(); walkShell.visible = false; scene.add(walkShell);
box(L.wcX1 + 0.1 - L.glassX, 0.08, L.southZ - L.northZ, mat(0x1b1b20), (L.wcX1 + 0.1 + L.glassX) / 2, H + 0.06, (L.southZ + L.northZ) / 2, walkShell);
for (const m of HOOD) walkShell.attach(m);
for (const [a, b, c, d] of BOH_UP) box(c - a, 3.33 - 1.05, d - b, mat(0x2a2b31), (a + c) / 2, 1.05 + (3.33 - 1.05) / 2, (b + d) / 2, walkShell);
for (const [a, b, c, d] of KITCHEN_WALLS) { const w = Math.abs(c - a) || 0.16, dd = Math.abs(d - b) || 0.16; box(w, H - 1.05, dd, wallMat, (a + c) / 2, 1.05 + (H - 1.05) / 2, (b + d) / 2, walkShell); }
for (const [cr, cx, cz] of COL_TOPS) cyl(cr, cr, H - 1.09, 16, colMat, cx, 1.09 + (H - 1.09) / 2, cz, walkShell);
box(L.wcX1 + 0.1 - L.glassX, H - 1.05, 0.16, wallMat, (L.wcX1 + 0.1 + L.glassX) / 2, 1.05 + (H - 1.05) / 2, L.southZ, walkShell);
// (v47) at eye level the long hallway wall is the one lit wall, floor to ~2.7 m: backlit stone behind mesh in black steel frames (Kurate RORU-30/32)
box(L.eastX - L.glassX - 0.5, 1.62, 0.03, tealPanel, (L.eastX + L.glassX) / 2 + 0.05, 1.04 + 0.81, L.southZ - 0.1, walkShell);
for (let x = -6.85; x <= L.eastX - 0.2; x += 1.2) box(0.05, 1.66, 0.05, frameBlk, x, 1.85, L.southZ - 0.12, walkShell);
box(L.eastX - L.glassX - 0.4, 0.05, 0.12, frameBlk, (L.eastX + L.glassX) / 2, 2.67, L.southZ - 0.14, walkShell);
cyl(0.13, 0.13, 12.4, 10, mat(0xaab0b8), -0.4, 2.92, 3.55, walkShell).rotation.z = Math.PI / 2;   // chrome duct along the hallway ceiling
walkShell.children.forEach(worldUV);
// a halo behind the ロールバール neon, on at night
const haloTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 64, 4, 128, 64, 120); gr.addColorStop(0, 'rgba(120,200,255,0.75)'); gr.addColorStop(1, 'rgba(60,140,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const neonHalo = plane(7.4, 1.9, new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), L.glassX - 0.12, 2.8, 1.6, -Math.PI / 2);
neonHalo.renderOrder = -1;

// backlit walls: teal; after dark they drift slowly to red and back, as the real panels do (L1053405, Desktop Home Hero)
const _wc = new THREE.Color(), _gw = new THREE.Color(0xffb070), _gr = new THREE.Color(0xff5a3c);
function wallGlow(t) {
  const cyc = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 48);
  const r = DN.k * Math.min(1, Math.max(0, (cyc - 0.45) / 0.35));
  _wc.copy(WALL_TEAL).lerp(WALL_RED, r);
  _wc.multiplyScalar(1 - 0.5 * SHOP.k);   // after hours the backlit walls run at half
  tealPanel.color.copy(_wc); wallWash.color.copy(_wc); teal.color.copy(_wc);
  underGlow.color.copy(_gw).lerp(_gr, r * 0.8).multiplyScalar(1 - 0.6 * SHOP.k);
}
// day / night: automatic by Hong Kong time, or the toggle
const hemiL = scene.children.find((o) => o.isHemisphereLight), ambL = scene.children.find((o) => o.isAmbientLight);
const DN = { k: 1, target: 1, manual: false };
const hkHour = () => { const d = new Date(Date.now() + 8 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; };
const autoNight = () => { const h = hkHour(); return (h >= 18.5 || h < 6.5) ? 1 : 0; };
DN.target = DN.k = params.has('day') ? 0 : params.has('night') ? 1 : autoNight();
const C = { bgN: new THREE.Color(0x0b0d12), bgD: new THREE.Color(0xa7c2da), hN: new THREE.Color(0xa9b8d8), hD: new THREE.Color(0xeef3f8), gN: new THREE.Color(0x2a2018), gD: new THREE.Color(0x8d8371), sN: new THREE.Color(0xc9d6ff), sD: new THREE.Color(0xfff0d8) };
const SOUTH = new THREE.Vector3(-city.north[0], 0, -city.north[1]);
function applyDN(k) {
  scene.background.lerpColors(C.bgD, C.bgN, k); scene.fog.color.copy(scene.background);
  scene.fog.near = 170 - 20 * k; scene.fog.far = 820 - 180 * k;
  hemiL.color.lerpColors(C.hD, C.hN, k); hemiL.groundColor.lerpColors(C.gD, C.gN, k); hemiL.intensity = 1.9 - 1.25 * k;
  if (ambL) ambL.intensity = 0.55 - 0.33 * k;
  moon.color.lerpColors(C.sD, C.sN, k); moon.intensity = 2.0 - 1.72 * k;
  moon.position.set(SOUTH.x * 60 - 20 * k, 90 - 72 * k, SOUTH.z * 60 + 8);
  renderer.toneMappingExposure = 1.02 + 0.28 * k;
  city.setNight(k);
  neon.material.color.setScalar(0.6 + 0.4 * k); neonHalo.material.opacity = 0.55 * k; glassLetters.material.color.setScalar(0.8 + 0.2 * k);
  const b = document.getElementById('dayNight');
  if (b) { const night = DN.target > 0.5; b.setAttribute('aria-pressed', String(!night)); b.setAttribute('aria-label', night ? 'Night view. Switch to day' : 'Day view. Switch to night'); b.querySelector('span').textContent = night ? '☾' : '☀'; b.title = night ? 'Night (tap for day)' : 'Day (tap for night)'; }
}
applyDN(DN.k);
document.getElementById('dayNight')?.addEventListener('click', () => { DN.target = DN.target > 0.5 ? 0 : 1; DN.manual = true; applyDN(DN.k); });
setInterval(() => { if (!DN.manual) DN.target = autoNight(); }, 60000);

// labels on the street: bilingual road names, landmarks, MTR exit, the bus stop by the door
const cityLabels = [];
// one language at a time (Dominic, Oct 13): EN shows English, 繁中 the Chinese name, 日本語 the kanji name (as Japanese guides print HK streets)
const tri = (en, zh, ja) => zh ? `<span class="l-en">${en}</span><span class="l-zh" lang="zh-Hant">${zh}</span><span class="l-ja" lang="ja">${ja || zh}</span>` : en;
function cLabel(html, x, y, z, kind, modes, maxD) {
  const el = document.createElement(kind === 'shop' ? 'button' : 'div'); el.className = 'clbl ' + kind; el.innerHTML = html; labelLayer.appendChild(el);
  const l = { el, pos: new THREE.Vector3(x, y, z), kind, modes, maxD }; cityLabels.push(l); return l;
}
cLabel(tri("Queen's Road East", '皇后大道東'), -17.2, 0.3, 7.5, 'road', ['room'], 80);
for (const r of city.labels) cLabel(tri(r.en, r.zh), r.x, 0.5, r.z, 'road' + (r.major ? ' major' : ''), ['street'], r.major ? 650 : 260);
for (const m of city.landmarks) cLabel(tri(m.en, m.zh), m.x, Math.min(m.y, 60), m.z, 'lm', ['street'], 900);
for (const s of city.stops) {
  if (s.t === 'mtr' && s.ref === 'D') cLabel(tri('MTR Wan Chai · Exit D', '港鐵灣仔站 D 出口', 'MTR ワンチャイ駅 D出口'), s.x, 4.2, s.z, 'mtr', ['street', 'walk'], 700);
}
{ const s = city.stops.filter((q) => q.t === 'bus').sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  if (s) cLabel(tri('Bus stop · Lun Fat Street', '巴士站 · 聯發街', 'バス停 · 聯發街'), s.x, 3.4, s.z, 'bus', ['street'], 160); }
const shopPin = cLabel('<b>RORUBARU</b><span>G/F 100–102 · step inside</span>', -4, 30, 0, 'shop', ['street'], 2000);
shopPin.el.type = 'button'; shopPin.el.addEventListener('click', () => setMode('room'));
function updateCityLabels() {
  const cp = camera.position; let shown = 0;
  for (const l of cityLabels) {
    let on = l.modes.includes(mode) && !document.body.classList.contains('panel-open') && cp.distanceTo(l.pos) < l.maxD && !(mode === 'walk' && WALK.indoors);
    let s;
    if (on) { s = project(l.pos); on = s.vis && s.x > -40 && s.x < innerWidth + 40 && s.y > 60 && s.y < innerHeight - 70; }
    if (on && l.kind.startsWith('road') && mode === 'street' && !l.kind.includes('major') && shown > 22) on = false;
    if (l.on !== on) { l.el.style.display = on ? '' : 'none'; l.on = on; }
    if (!on) continue; shown++;
    l.el.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%)`;
  }
}

// compass: the needle shows true north as OSM has it
const needle = document.getElementById('needle');
function updateCompass() {
  if (!needle) return;
  const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) return; f.normalize();
  const n = city.north; const up = n[0] * f.x + n[1] * f.z, right = n[0] * -f.z + n[1] * f.x;
  needle.style.transform = `rotate(${Math.atan2(right, up).toFixed(3)}rad)`;
}

// modes: room (the bar), street (the block from above), walk (ground level from the MTR)
let mode = 'room';
const ROOM_LIMITS = { minDistance: 7, maxDistance: 48, minPolarAngle: 0.28, maxPolarAngle: 1.32, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity };
const STREET_LIMITS = { minDistance: 10, maxDistance: 560, minPolarAngle: 0.05, maxPolarAngle: 1.45, minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity };
const NORTH_AZ = Math.atan2(-city.north[0], -city.north[1]);
function streetView() { const portrait = innerWidth / innerHeight < 0.9; return { t: new THREE.Vector3(-4, 0, 30), az: NORTH_AZ + 0.32, pol: portrait ? 0.5 : 0.6, d: portrait ? 400 : 300 }; }
function flyToView(v, dur) {
  activeKey = null; fly.from = camState(); fly.to = v; fly.offFrom = viewOff.slice(); fly.offTo = [0, 0];
  let daz = v.az - fly.from.az; daz = Math.atan2(Math.sin(daz), Math.cos(daz)); fly.to = { ...v, az: fly.from.az + daz };
  fly.t = 0; fly.start = performance.now(); fly.dur = dur || 1.8; fly.on = true; controls.autoRotate = false; lastInteract = performance.now();
}
function setMode(m, opt = {}) {
  if (m === mode && !opt.force) { if (m === 'street') flyToView(streetView()); return; }
  const prev = mode; mode = m; document.body.dataset.mode = m;
  document.querySelectorAll('[data-mode]').forEach((b) => b.closest('.dock') && b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  if (prev === 'walk') exitWalk();
  if (m !== 'room' && window.RORU_UI && window.RORU_UI.current) window.RORU_UI.close();
  if (m === 'room') { Object.assign(controls, ROOM_LIMITS); controls.enabled = true; city.setGhost(true); frame(false); flyToView(viewFor(null), prev === 'walk' ? 2.0 : 1.6); }
  if (m === 'street') { Object.assign(controls, STREET_LIMITS); controls.enabled = true; city.setGhost(true); flyToView(streetView(), 1.9); }
  if (m === 'walk') enterWalk(opt.s);
  if (history.replaceState && !opt.quiet) history.replaceState(null, '', m === 'room' ? location.pathname + location.search : '#' + m);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]'); if (b) { e.preventDefault(); setMode(b.dataset.mode); return; }
  if (e.target.closest('[data-home]') && mode !== 'room') setMode('room');
  if (e.target.closest('#compass')) { if (mode === 'walk') { WALK.userYaw = 0; WALK.yaw = NORTH_AZ + Math.PI; WALK.auto = false; syncWalkUI(); } else { const st = camState(); flyToView({ t: st.t, az: NORTH_AZ, pol: st.pol, d: st.d }, 1.0); } }
});

// ---------- walk mode ----------
const hint = document.getElementById('hint');

const WALK = { s: 0, yaw: 0, pitch: -0.03, auto: true, speed: params.has('walkspeed') ? +params.get('walkspeed') : 4.4, userYaw: 0, userPitch: 0, lastLook: 0, pos: new THREE.Vector3(), keys: {}, joy: { x: 0, y: 0 }, arrived: false, bob: 0 };
const walkHud = document.getElementById('walkHud'), walkWhere = document.getElementById('walkWhere'), walkAuto = document.getElementById('walkAuto'), arriveEl = document.getElementById('arrive');
// (v47) the walk no longer stops at the door: it goes in, past reception and the DJ booth, along the counter
// and the lit hallway, through the curtain and into the second toilet. The street part is city.js's route.
const WP = (() => {
  const st = city.walk.p, k = st.findIndex((q) => q[1] < 30 && q[0] < -9);   // the old door approach starts here
  const pts = st.slice(0, k > 0 ? k : st.length).map((q) => [q[0], q[1]]);
  const inside = [[-9.7, 0.2], [-8.9, L.doorZ], [L.glassX, L.doorZ], [-6.35, L.doorZ - 0.05], [L.walkX, -0.45], [L.walkX, 3.05], [-5.0, L.corrZ], [5.05, L.corrZ],
    [5.55, 3.05], [L.eastX, WC.split], [6.42, WC.split - 0.2], [6.42, 1.86], [6.7, 1.87], [6.74, 1.88]];
  return new Path(pts.concat(inside).flat());
})();
const DOOR_S = WP.nearest(L.glassX, L.doorZ).s, TURN_S = city.walkTurn;
const IN_S = { reception: WP.nearest(L.walkX, -0.45).s, hall: WP.nearest(-5.0, L.corrZ).s, curtain: WP.nearest(5.05, L.corrZ).s, lobby: WP.nearest(6.42, WC.split - 0.2).s };
// free walk inside the shop: circles slide along the SOLID footprints (walls, counter, columns, booth, toilets)
function collide(p, r = 0.24) {
  if (p.x < L.glassX - 0.3 || p.x > 10.2 || p.z < -4.6 || p.z > 4.5) return;   // only inside the building
  for (const [x0, z0, x1, z1] of SOLID) {
    const qx = Math.max(x0, Math.min(p.x, x1)), qz = Math.max(z0, Math.min(p.z, z1));
    const dx = p.x - qx, dz = p.z - qz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
    else { const o = [[p.x - x0 + r, -1, 0], [x1 - p.x + r, 1, 0], [p.z - z0 + r, 0, -1], [z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0])[0]; p.x += o[1] * o[0]; p.z += o[2] * o[0]; }
  }
}
const _pa = { x: 0, z: 0 }, _pb = { x: 0, z: 0 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function syncWalkUI() {
  if (walkAuto) { walkAuto.textContent = WALK.auto ? 'Pause' : (WALK.arrived ? 'Walk it again' : 'Resume the walk'); walkAuto.setAttribute('aria-pressed', String(WALK.auto)); }
}
function enterWalk(s0) {
  WALK.s = Math.max(0, Math.min(WP.L, s0 ?? 0)); WALK.auto = true; WALK.arrived = false; WALK.userYaw = 0; WALK.userPitch = 0;
  fly.on = false; controls.enabled = false; controls.autoRotate = false; viewOff = [0, 0]; camera.clearViewOffset();
  city.setGhost(false); walkShell.visible = true;
  camera.fov = innerWidth / innerHeight < 0.9 ? 72 : 62; camera.near = 0.08; camera.updateProjectionMatrix();
  WP.at(WALK.s, _pa); WP.at(WALK.s + 6, _pb); WALK.pos.set(_pa.x, 1.62, _pa.z); WALK.yaw = Math.atan2(_pb.x - _pa.x, _pb.z - _pa.z);
  walkHud.hidden = false; arriveEl.hidden = true; hint.classList.add('gone');
  syncWalkUI(); stepWalk(0);
}
function exitWalk() {
  walkHud.hidden = true; arriveEl.hidden = true; walkShell.visible = false; camera.near = 0.1;
  const f = new THREE.Vector3(Math.sin(WALK.yaw), 0, Math.cos(WALK.yaw));
  controls.target.copy(camera.position).addScaledVector(f, 10).setY(0.4);
  camera.fov = (innerWidth / innerHeight < 0.9 ? VIEW.tall : VIEW.wide).fov; camera.updateProjectionMatrix();
}
const END_YAW = Math.PI / 2; // (v47) last steps: inside the second cubicle, facing the washlet
function stepWalk(dt) {
  const P = WP;
  const kx = (WALK.keys.d || WALK.keys.arrowright ? 1 : 0) - (WALK.keys.a || WALK.keys.arrowleft ? 1 : 0);
  const ky = (WALK.keys.s || WALK.keys.arrowdown ? 1 : 0) - (WALK.keys.w || WALK.keys.arrowup ? 1 : 0);
  const mx = Math.max(-1, Math.min(1, WALK.joy.x + kx)), my = Math.max(-1, Math.min(1, WALK.joy.y + ky));
  let moving = false;
  if (Math.abs(mx) + Math.abs(my) > 0.08) {
    if (WALK.auto) { WALK.auto = false; WALK.yaw += WALK.userYaw; WALK.userYaw = 0; syncWalkUI(); }
    arriveEl.hidden = true;
    const indoors = WALK.pos.x > L.glassX - 0.2 && WALK.pos.x < 10.2 && WALK.pos.z > -4.6 && WALK.pos.z < 4.5;
    const sp = (indoors ? 1.6 : 3.8) * dt; const fx = Math.sin(WALK.yaw), fz = Math.cos(WALK.yaw);
    // stick: up = forward, sideways = turn (feels right on a phone), keys A/D strafe-turn the same way
    WALK.yaw -= mx * dt * 1.6;
    WALK.pos.x += fx * -my * sp; WALK.pos.z += fz * -my * sp;
    const r = Math.hypot(WALK.pos.x, WALK.pos.z); if (r > city.R - 25) { WALK.pos.x *= (city.R - 25) / r; WALK.pos.z *= (city.R - 25) / r; }
    collide(WALK.pos);
    moving = Math.abs(my) > 0.1;
  } else if (WALK.auto) {
    WALK.s = Math.min(P.L, WALK.s + WALK.speed * dt * (WALK.s > DOOR_S + 0.6 ? 0.3 : WALK.s > DOOR_S - 2 ? 0.6 : 1));   // indoors at a stroll (~1.3 m/s)
    P.at(WALK.s, _pa); WALK.pos.x = _pa.x; WALK.pos.z = _pa.z;
    let ty;
    const left = P.L - WALK.s;
    if (left < 0.05) { ty = END_YAW; if (!WALK.arrived) { WALK.arrived = true; WALK.auto = false; arriveEl.hidden = false; syncWalkUI(); } }
    else { const ins = WALK.s > DOOR_S - 1, la = ins ? 2.2 : 7, eb = ins ? 1.2 : 5; P.at(Math.min(P.L, WALK.s + la), _pb); ty = Math.atan2(_pb.x - _pa.x, _pb.z - _pa.z); if (left < eb) ty = ty + angDiff(END_YAW, ty) * (1 - left / eb); }
    WALK.yaw += angDiff(ty, WALK.yaw) * Math.min(1, dt * 2.6);
    moving = left > 0.05;
  }
  { const lf = WP.L - WALK.s; WALK.pitch += ((lf < 2.0 && WALK.auto || WALK.arrived ? -0.62 : -0.03) - WALK.pitch) * Math.min(1, dt * 2); }
  WALK.indoors = WALK.pos.x > L.glassX - 0.05 && WALK.pos.x < 10.2 && WALK.pos.z > -4.6 && WALK.pos.z < 4.5;
  if (performance.now() - WALK.lastLook > 2600 && WALK.auto) { WALK.userYaw *= 1 - Math.min(1, dt * 1.4); WALK.userPitch *= 1 - Math.min(1, dt * 1.4); }
  if (moving) WALK.bob += dt * 8.5;
  const yaw = WALK.yaw + WALK.userYaw, pitch = Math.max(-0.7, Math.min(0.7, WALK.pitch + WALK.userPitch));
  camera.position.set(WALK.pos.x, 1.62 + (moving ? Math.sin(WALK.bob) * 0.025 : 0), WALK.pos.z);
  _v.set(WALK.pos.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), WALK.pos.z + Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(_v); controls.target.copy(_v);
  // where am I
  if (walkWhere) {
    let t;
    const m10 = Math.round((DOOR_S - WALK.s) / 10) * 10, m5 = Math.max(5, Math.round((DOOR_S - WALK.s) / 5) * 5);
    if (!WALK.auto && !WALK.arrived && Math.hypot(WALK.pos.x - _pa.x, WALK.pos.z - _pa.z) > 4) t = tri('Free walk · tap “Resume the walk” to follow the route', '自由行走 · 按「繼續路線」跟住路線行', '自由歩行 · 「ルートに戻る」をタップしてルートへ');
    else if (WALK.s < 12) t = tri('MTR Wan Chai · Exit D', '港鐵灣仔站 D 出口', 'MTR ワンチャイ駅 D出口');
    else if (WALK.s < TURN_S) t = tri(`Lee Tung Avenue · ${m10} m to go`, `利東街 · 仲有 ${m10} 米`, `利東街 · あと ${m10} m`);
    else if (WALK.s < DOOR_S - 4) t = tri(`Queen’s Road East · ${m5} m to go`, `皇后大道東 · 仲有 ${m5} 米`, `皇后大道東 · あと ${m5} m`);
    else if (WALK.s < DOOR_S + 0.8) t = tri('RORUBARU · G/F, 100–102 Queen’s Road East', 'RORUBARU · 皇后大道東 100–102 號地下', 'RORUBARU · 皇后大道東 100–102 1階');
    else if (WALK.s < IN_S.reception + 1.2) t = tri('Reception · on your right', '接待處 · 喺你右手邊', '受付 · 右手');
    else if (WALK.s < IN_S.hall - 0.5) t = tri('DJ booth on the glass · the counter on your left', '玻璃窗前係 DJ 台 · 左手邊係吧枱', '窓際に DJ ブース · 左手にカウンター');
    else if (WALK.s < IN_S.curtain - 1) t = tri('The long counter · 26 seats round the U', '長吧枱 · U 形吧枱共 26 個座位', 'ロングカウンター · U字に 26 席');
    else if (WALK.s < IN_S.lobby) t = tri('Toilets · through the curtain', '洗手間 · 穿過布簾', 'トイレ · カーテンの奥');
    else t = tri('Toilets · 洗手間', '洗手間 · Toilets', 'トイレ · 洗手間');
    if (walkWhere._t !== t) { walkWhere.innerHTML = t; walkWhere._t = t; }
  }
}
walkAuto?.addEventListener('click', () => {
  if (WALK.auto) { WALK.auto = false; }
  else {
    if (WALK.arrived) { WALK.s = 0; WALK.arrived = false; arriveEl.hidden = true; }
    else { const n = WP.nearest(WALK.pos.x, WALK.pos.z); WALK.s = n.s; }
    WALK.yaw += WALK.userYaw; WALK.userYaw = 0; WALK.auto = true;
  }
  syncWalkUI();
});
document.getElementById('walkSkip')?.addEventListener('click', () => { WALK.s = Math.max(WALK.s, DOOR_S - 16); WALK.auto = true; WALK.arrived = false; arriveEl.hidden = true; WALK.userYaw = 0; syncWalkUI(); });
document.getElementById('walkExit')?.addEventListener('click', () => setMode('room'));
// look around: drag anywhere on the scene
{
  let last = null;
  canvas.addEventListener('pointerdown', (e) => { if (mode !== 'walk') return; last = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (mode !== 'walk' || !last || e.pointerId !== last.id) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last.x = e.clientX; last.y = e.clientY;
    const k = 0.0052;
    if (WALK.auto) { WALK.userYaw += dx * k; WALK.userPitch += dy * k * 0.8; } else { WALK.yaw += dx * k; WALK.pitch = Math.max(-0.7, Math.min(0.7, WALK.pitch + dy * k * 0.8)); }
    WALK.lastLook = performance.now();
  });
  const end = (e) => { if (last && e.pointerId === last.id) last = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
// joystick
{
  const joy = document.getElementById('joy'), knob = joy && joy.querySelector('i');
  let id = null, cx = 0, cy = 0;
  const setK = (x, y) => { WALK.joy.x = x; WALK.joy.y = y; if (knob) knob.style.transform = `translate(${x * 30}px,${y * 30}px)`; };
  joy?.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.setPointerCapture(id); e.preventDefault(); });
  joy?.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; let x = (e.clientX - cx) / 40, y = (e.clientY - cy) / 40; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } setK(x, y); });
  const up = (e) => { if (e.pointerId !== id) return; id = null; setK(0, 0); };
  joy?.addEventListener('pointerup', up); joy?.addEventListener('pointercancel', up);
}
addEventListener('keydown', (e) => {
  if (mode !== 'walk') return; const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { WALK.keys[k] = true; e.preventDefault(); }
  if (k === 'escape' && !(window.RORU_UI && window.RORU_UI.current)) setMode('room');
});
addEventListener('keyup', (e) => { WALK.keys[e.key.toLowerCase()] = false; });

// ---------- camera framing ----------
const VIEW = {
  // v50: looks in from the kitchen side (north-east) so the guests at the long run face the camera; closer, so faces read on a phone
  wide: { target: new THREE.Vector3(-0.6, 0.4, 1.7), az: 2.62, polar: 0.9, dist: 15.5, fov: 38 },
  tall: { target: new THREE.Vector3(-1.2, 0.4, 2.2), az: 2.62, polar: 0.86, dist: 17.5, fov: 40 },
};
let homeView;
function frame(initial) {
  const a = innerWidth / innerHeight;
  const v = a < 0.9 ? VIEW.tall : VIEW.wide;
  const dist = a < 0.9 ? v.dist * Math.min(1.3, Math.max(0.85, 0.46 / a)) : v.dist * Math.max(0.85, Math.min(1.35, 1.6 / a));
  camera.fov = params.has('fov') ? +params.get('fov') : v.fov; camera.updateProjectionMatrix();
  if (params.has('az')) { v.az = +params.get('az'); v.polar = +params.get('pol'); v.target.set(+params.get('tx'), 0.4, +params.get('tz')); }
  homeView = { target: v.target.clone(), az: v.az, polar: v.polar, dist: params.has('dist') ? +params.get('dist') : dist };
  if (initial) {
    controls.target.copy(v.target);
    camera.position.copy(v.target).add(new THREE.Vector3().setFromSphericalCoords(homeView.dist, v.polar, v.az));
  }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  frame(false);
  if (typeof applyOffset === 'function') { viewOff = offsetFor(activeKey); applyOffset(); }
}
frame(true); resize();
addEventListener('resize', resize);

// idle drift: after a pause the camera sways gently around the home angle
let lastInteract = -1e9;
controls.addEventListener('start', () => { lastInteract = performance.now(); controls.autoRotate = false; });
controls.addEventListener('end', () => { lastInteract = performance.now(); });

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const PROFILE = [0.55, 0.9, 0.7, 0.35, 0.3, 0.45, 0.7, 1.0, 0.95, 0.75, 0.5]; // 12:00 → 22:00
let shownRolls = sim.rollsToday;
function updateHUD() {
  const { h, m } = hkNow();
  const clk = $('clock'); if (clk) clk.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  const target = (LIVE.stats && typeof LIVE.stats.rolls_today === 'number' && LIVE.source !== 'sim') ? LIVE.stats.rolls_today : sim.rollsToday;
  shownRolls += Math.sign(target - shownRolls) * Math.max(1, Math.round(Math.abs(target - shownRolls) / 8));
  if (Math.abs(target - shownRolls) < 1) shownRolls = target;
  const rl = $('rolls'); if (rl) rl.textContent = shownRolls.toLocaleString('en-HK');
  const st = LIVE.stats || {};
  const filled = typeof st.seats_filled === 'number' ? st.seats_filled : seats.filter(s => s.occupied).length;
  const se = $('seats'); if (se) se.textContent = filled;
}

// pops ride the sim clock so screen captures look the same as live
const popList = [];
function updatePops(dt) {
  for (let i = popList.length - 1; i >= 0; i--) {
    const p = popList[i]; p.t += dt;
    const s = project(p.w);
    const k = p.t / 1.2;
    p.el.style.transform = `translate(${s.x.toFixed(1)}px,${(s.y - 40 * k).toFixed(1)}px) translate(-50%,-100%)`;
    p.el.style.opacity = String(Math.max(0, 1 - k));
    if (k >= 1 || !s.vis) { p.el.remove(); popList.splice(i, 1); }
  }
}
function updateLabels() {
  for (const l of labels) {
    const s = project(l.pos);
    const on = s.vis && s.x > -30 && s.x < innerWidth + 30 && s.y > 40 && s.y < innerHeight;
    l.el.style.display = on ? '' : 'none';
    if (!on) continue;
    if (!l.w || l.wAt !== innerWidth) { l.w = l.el.offsetWidth; l.wAt = innerWidth; }
    const x = Math.max(l.w / 2 + 6, Math.min(innerWidth - l.w / 2 - 6, s.x));
    l.el.style.transform = `translate(${x.toFixed(1)}px,${(s.y - 14).toFixed(1)}px) translate(-50%,-100%)`;
  }
}


// ---------- opening hours: the room follows the real Hong Kong clock ----------
// open (12:00–21:30): the usual service. closing soon (21:30–22:00): no new walk-ins, the line outside
// disperses, last orders are served and seated guests finish and drift out. closed (22:00–12:00): nobody
// in the room, no chefs, counter cleared, room lights down; the neon stays on. Re-checked every 15 s.
const staff = () => [...sim.chefs, cook, host, djP];
const fades = [];
function fade(p, to, dur, delay = 0, done = null) {
  cancelFade(p);
  if (to > 0) p.group.visible = true;
  const swaps = [];   // per-figure copies of the shared materials, so only this figure fades
  p.group.traverse((o) => { if (o.isMesh && !rings.includes(o)) { const m = o.material.clone(); m.transparent = true; m.opacity = to > 0 ? 0 : o.material.opacity; swaps.push([o, o.material, m]); o.material = m; } });
  fades.push({ p, to, dur, t: -delay, swaps, done });
}
function endFade(f) { for (const [o, orig, m] of f.swaps) { o.material = orig; m.dispose(); } }
function cancelFade(p) { const i = fades.findIndex((f) => f.p === p); if (i >= 0) { endFade(fades[i]); fades.splice(i, 1); } }
function stepFades(dt) {
  for (let i = fades.length - 1; i >= 0; i--) {
    const f = fades[i]; f.t += dt;
    const k = Math.max(0, Math.min(1, f.t / f.dur)), a = f.to > 0 ? k : 1 - k;
    for (const [, orig, m] of f.swaps) m.opacity = orig.opacity * a;
    if (k >= 1) { fades.splice(i, 1); endFade(f); if (f.to <= 0) f.p.group.visible = false; if (f.done) f.done(); }
  }
}
function sendQueueAway(live) {
  for (const g of sim.queue.splice(0)) {
    g.state = 'leaving'; g.atSlot = false; g.setAnim(null);
    if (!live) { g._gone = true; g.remove(); continue; }
    sim.leaving.push(g); g.speed = rr(1.2, 1.5); g.arms[1].rotation.x = 0; g.head.rotation.x = 0;
    g.go([{ x: -9.45, z: g.z }, { x: -9.45, z: g.z - 9 }], () => fade(g, 0, 1.2, 0, () => drop(g)));
  }
}
function lastOrders() {   // after last order: whatever is already ordered is the last roll
  for (const g of sim.inside) {
    g.want = Math.max(g.ordered, 1);
    if (g.state === 'seated' && !g.holding && !g.plate.length && g.eaten >= g.want && g.leaveIn === undefined) g.leaveIn = rr(40, 240);
  }
}
function guestsOut(live) {
  sim.orders.length = 0;
  for (const f of flying.splice(0)) scene.remove(f.r);
  for (const g of sim.inside.slice()) {
    if (live && g.state === 'seated') {   // finish up, stand, walk out of the door
      for (const r of g.plate) scene.remove(r); g.plate = []; g.leaveIn = undefined; g.head.rotation.set(0, 0, 0);
      setTimeoutSim(() => { if (g.state === 'seated') leave(g); }, rr(0.2, 3.5));
    } else if (live) { g.path = []; g.done = null; sim.inside.splice(sim.inside.indexOf(g), 1); sim.leaving.push(g); if (g.seat) g.seat.reserved = false; fade(g, 0, 1.2, 0, () => drop(g)); }
    else drop(g);
  }
  if (!live) for (const g of sim.leaving.slice()) drop(g);
}
function staffOut(live) {
  for (const c of staff()) {
    if (sim.chefs.includes(c)) { c.path = []; c.done = null; c.setAnim(null); c.head.rotation.x = 0; }   // the DJ and the back cook keep their loops, unseen
    if (c.roll) { c.roll.parent && c.roll.parent.remove(c.roll); c.roll = null; }
    c.order = null; if (sim.chefs.includes(c)) c.state = 'off';
    const home = () => { if (c.home) { c.place(c.home.x, c.home.z); c.heading = c.targetHeading = Math.PI; c.group.rotation.y = Math.PI; } };
    if (live) fade(c, 0, 2.5, 4, home); else { cancelFade(c); c.group.visible = false; home(); }
  }
}
function staffIn(live) {
  for (const c of staff()) {
    if (sim.chefs.includes(c)) { c.state = 'idle'; c.path = []; c.done = null; c.setAnim(null); }
    if (live) fade(c, 1, 1.5); else { cancelFade(c); c.group.visible = true; }
  }
}
function applyShop(st, live) {
  SHOP.state = st; document.body.dataset.shop = st;
  if (st !== 'open') sendQueueAway(live);
  if (st === 'closing') lastOrders();
  if (st === 'closed') { guestsOut(live); staffOut(live); SHOP.closedAt = sim.t; }
  else { if (!sim.chefs[0].group.visible || sim.chefs[0].state === 'off') staffIn(live); for (const m of settingMeshes) m.visible = true; }
}
function stepShop(dt) {
  const tk = SHOP.state === 'closed' ? 1 : 0;
  if (SHOP.k !== tk) {
    SHOP.k += Math.sign(tk - SHOP.k) * Math.min(Math.abs(tk - SHOP.k), dt / 5);
    for (const r of roomLights) r.l.intensity = r.base * (1 - 0.72 * SHOP.k);
  }
  stepFades(dt);
  if (SHOP.state !== 'closed') return;
  // guests heading home fade once they are out on the pavement
  for (const g of sim.leaving) if (!g._fading && g.x < -9.0) { g._fading = true; fade(g, 0, 1.4, 0, () => drop(g)); }
  if (!sim.inside.length) for (const m of settingMeshes) if (m.visible) m.visible = false;
  // nobody lingers after hours
  if (sim.t - SHOP.closedAt > 40) for (const g of [...sim.queue, ...sim.inside, ...sim.leaving]) drop(g);
}
function checkShop() { const st = shopState(); if (st !== SHOP.state) applyShop(st, true); }
setInterval(checkShop, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkShop(); });
const shopFigures = () => {
  const vis = (p) => !!p.group.parent && p.group.visible;
  return { guests: [...sim.queue, ...sim.inside, ...sim.leaving].filter(vis).length, staff: staff().filter(vis).length };
};

// ---------- start: warm the scene so it opens mid-service ----------
applyShop(SHOP.state, false);
if (SHOP.state === 'open') {
  for (let i = 0; i < 8; i++) spawnArrival(true);
  const order26 = seats.map((s, i) => i).sort(() => rand() - 0.5).slice(0, 21);
  for (const i of order26) { const g = new Person(); seatGuest(g, seats[i], true); }
} else if (SHOP.state === 'closing') {   // a thinning counter, nobody waiting outside
  const { h, m } = hkNow(), left = Math.max(0, 22 * 60 - (h * 60 + m));
  const n = Math.round(5 + 10 * Math.min(1, left / 30));
  const some = seats.map((s, i) => i).sort(() => rand() - 0.5).slice(0, n);
  for (const i of some) { const g = new Person(); seatGuest(g, seats[i], true); }
  lastOrders();
}
for (let i = 0; i < 25 * 30; i++) stepSim(1 / 30);
updateHUD();
shownRolls = sim.rollsToday;

let last = performance.now(), hudT = 0, clockT = 0;
controls.addEventListener('start', () => { fly.on = false; });
function updateHotspots() {
  const hide = document.body.classList.contains('panel-open') || mode !== 'room';
  const placed = [];
  for (const h of hotEls) {
    const a = typeof h.h.anchor === 'function' ? h.h.anchor() : h.h.anchor;
    const s = project(a);
    let on = !hide && s.vis && s.x > 20 && s.x < innerWidth - 20 && s.y > 70 && s.y < innerHeight - 70;
    if (on) {
      if (!h.w || h.wAt !== innerWidth) { h.w = h.el.offsetWidth || 120; h.wAt = innerWidth; }
      // pin's box: the dot sits on the anchor, the label runs to the right
      let x = Math.min(s.x, innerWidth - h.w + 16), y = s.y;
      // nudge apart from pins already placed so two never overlap (thumbs need clear targets)
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (const q of placed) {
          const ox = Math.min(x - 22 + h.w, q.x - 22 + q.w) - Math.max(x - 22, q.x - 22);
          const oy = 48 - Math.abs(y - q.y);
          if (ox > 0 && oy > 0) { y += (y >= q.y ? oy : -oy); moved = true; }
        }
        if (!moved) break;
      }
      placed.push({ x, y, w: h.w });
      h.x = x; h.y = y;
    }
    if (h.on !== on) { h.el.classList.toggle('off', !on); h.el.tabIndex = on ? 0 : -1; h.on = on; }
    if (on) h.el.style.transform = `translate(${h.x.toFixed(1)}px,${h.y.toFixed(1)}px)`;
  }
}
function render(dt) {
  stepSim(dt);
  clockT += dt;
  wallGlow(window.__glowT != null ? window.__glowT : clockT);
  stepPhone(dt);
  for (const r of rings) { r.visible = mode !== 'walk'; const k = (Math.sin(clockT * 2.4 + r.userData.ph) + 1) / 2; r.material.opacity = 0.25 + 0.55 * k; r.scale.setScalar(r.userData.s * (0.9 + 0.2 * k)); }
  // idle sway (only on the home view)
  if (!CAPTURE && mode === 'room' && !activeKey && !fly.on && performance.now() - lastInteract > 9000) {
    const az = controls.getAzimuthalAngle();
    if (!controls.autoRotate) { controls.autoRotate = true; controls.autoRotateSpeed = 0.35; }
    if (az > homeView.az + 0.35) controls.autoRotateSpeed = 0.35;
    if (az < homeView.az - 0.35) controls.autoRotateSpeed = -0.35;
  } else if (activeKey && controls.autoRotate) controls.autoRotate = false;
  if (mode === 'walk') stepWalk(dt); else if (fly.on) stepFly(dt); else controls.update(dt);
  stepWC(dt, camera.position, mode === 'walk', clockT);
  if (mode === 'street' && !fly.on) { const t = controls.target; const r = Math.hypot(t.x, t.z); if (r > 300) { t.x *= 300 / r; t.z *= 300 / r; } t.y = Math.max(0, Math.min(30, t.y)); }
  if (Math.abs(DN.k - DN.target) > 0.002) { DN.k += Math.sign(DN.target - DN.k) * Math.min(Math.abs(DN.target - DN.k), dt / 1.1); applyDN(DN.k); }
  const camD = camera.position.distanceTo(controls.target);
  if (mode === 'walk') city.setCut(0, false, 0); else if (mode === 'room') city.setCut(10, true, camD > 60 ? 0 : 28);   // v50: always cut a sight-line hole now that the default looks in over the neighbouring block else city.setCut(Math.min(40, 12 + camD * 0.06), true, 0, camD > 90 ? camD * 0.42 : 0);
  city.update(dt, camera, controls.target, mode);
  renderer.render(scene, camera);
  updateLabels(); updatePops(dt); updateHotspots(); updateCityLabels(); updateCompass();
  hudT += dt; if (hudT > 0.25) { hudT = 0; updateHUD(); }
}
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  render(dt);
  requestAnimationFrame(loop);
}
window.__roru = { WC, WP, SOLID, DOOR_S, L, seats, walkS: () => WALK.s, walk: WALK, ready: true, hots: () => proxies.map((o) => o.userData.hot), buzz: () => { PHONE.buzzAt = 0; }, shop: { get state() { return SHOP.state; }, get k() { return SHOP.k; }, figures: shopFigures, check: checkShop }, step: (sec) => { for (let i = 0; i < sec * 30; i++) stepSim(1 / 30); }, wallGlow, sim, LIVE, camera, controls, renderer, homeView: () => homeView, flyTo, setMode, city, WALK, DN, applyDN, get mode() { return mode; }, get activeKey() { return activeKey; } };
// deep links: …/#street and …/#walk
{ const h = location.hash.slice(1); if (h === 'street' || h === 'walk') setTimeout(() => setMode(h, { quiet: true }), 80);
  if (h === 'inside') setTimeout(() => setMode('walk', { quiet: true, s: DOOR_S - 6 }), 80); }   // v47: …/#inside starts the walk at the door
addEventListener('hashchange', () => { const h = location.hash.slice(1); if ((h === 'street' || h === 'walk') && h !== mode) setMode(h, { quiet: true }); });
window.__tick = (ms) => { const n = Math.max(1, Math.round(ms / (1000 / 60))); for (let i = 0; i < n - 1; i++) { stepSim(1 / 60); if (mode === 'walk') stepWalk(1 / 60); stepWC(1 / 60, camera.position, mode === 'walk', clockT); city.update(1 / 60, camera, controls.target, mode); if (Math.abs(DN.k - DN.target) > 0.002) { DN.k += Math.sign(DN.target - DN.k) * Math.min(Math.abs(DN.target - DN.k), (1 / 60) / 1.1); applyDN(DN.k); } } if (fly.on) fly.t += (n - 1) / 60 / fly.dur; render(1 / 60); updateHUD(); };
window.__cam = (az, pol, dist, tx, ty, tz) => { controls.target.set(tx, ty, tz); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(dist, pol, az)); camera.lookAt(controls.target); };
window.__orbit = (daz, dpol, ddist) => { const sp = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); sp.theta += daz || 0; sp.phi += dpol || 0; sp.radius *= (ddist || 1); camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sp)); controls.update(); };
if (!CAPTURE) requestAnimationFrame((n) => { last = n; loop(n); });
else render(1 / 60);
updateSourceTag();
