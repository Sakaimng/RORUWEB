// RORUBARU · the real block around 100–102 Queen's Road East, Wan Chai.
// Everything here is built from OpenStreetMap data (© OpenStreetMap contributors, ODbL), pre-processed into
// city-data.js in scene metres: the room's glass shopfront sits on Kui Chi Mansion's real frontage.
// Low-poly on purpose: buildings, roads and markings are merged into a handful of meshes; vehicles,
// lamps and walkers are instanced, so the whole street is ~40 draw calls.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import CITY from './city-data.js';

const pairs = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const CJK = '"PingFang HK","PingFang TC","Noto Sans CJK TC","Noto Sans TC","Source Han Sans TC","Microsoft JhengHei","Heiti TC",sans-serif';
const LATIN = '"Helvetica Neue",Helvetica,Arial,"Liberation Sans",sans-serif';

// ---------- small geometry helpers ----------
function shapeGeo(rings, y) {
  // rings: [outer, hole, hole…] flat [x,z,x,z…]; returns geometry lying at height y facing up
  const toV = (r) => pairs(r).map(([x, z]) => new THREE.Vector2(x, -z));
  const shape = new THREE.Shape(toV(rings[0]));
  for (let i = 1; i < rings.length; i++) shape.holes.push(new THREE.Path(toV(rings[i])));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return g;
}
function colorize(g, c) {
  const col = new THREE.Color(c); const n = g.attributes.position.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
function boxG(w, h, d, x, y, z, c, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z);
  if (g.index) { const ng = g.toNonIndexed(); g.dispose(); return c === undefined ? ng : colorize(ng, c); }
  return c === undefined ? g : colorize(g, c);
}
function cylG(rt, rb, h, seg, x, y, z, c) { let g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y, z); g = g.toNonIndexed(); return colorize(g, c); }
function strip(out, pts, w, y, col, dash) {
  // flat ribbon along a polyline, optionally dashed [on, off]
  const c = new THREE.Color(col);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz); if (L < 0.05) continue;
    const ux = dx / L, uz = dz / L, nx = -uz * w / 2, nz = ux * w / 2;
    const segs = [];
    if (dash) { for (let s = 0; s < L; s += dash[0] + dash[1]) segs.push([s, Math.min(L, s + dash[0])]); } else segs.push([0, L]);
    for (const [a, b] of segs) {
      const ax = x0 + ux * a, az = z0 + uz * a, bx = x0 + ux * b, bz = z0 + uz * b;
      out.pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
      for (let k = 0; k < 6; k++) out.col.push(c.r, c.g, c.b);
    }
  }
}
function offsetLine(pts, d) {
  // offset a polyline sideways (positive = scene-left of travel, i.e. (dz,-dx))
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    out.push([pts[i][0] + dz * d, pts[i][1] - dx * d]);
  }
  return out;
}
function flatGeo(acc) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3));
  g.computeVertexNormals(); return g;
}

// polyline with arc-length lookup (vehicles, walkers, walk route)
export class Path {
  constructor(flat) {
    this.p = pairs(flat); this.c = [0];
    for (let i = 1; i < this.p.length; i++) this.c.push(this.c[i - 1] + Math.hypot(this.p[i][0] - this.p[i - 1][0], this.p[i][1] - this.p[i - 1][1]));
    this.L = this.c[this.c.length - 1]; this._i = 1;
  }
  at(s, out) {
    s = Math.max(0, Math.min(this.L, s));
    let i = this._i; const c = this.c;
    if (c[i - 1] > s || c[i] < s) { i = 1; while (i < c.length - 1 && c[i] < s) i++; }
    this._i = i;
    const a = this.p[i - 1], b = this.p[i], t = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
    out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t; return out;
  }
  nearest(x, z) {
    let best = 1e9, bs = 0;
    for (let i = 1; i < this.p.length; i++) {
      const a = this.p[i - 1], b = this.p[i]; const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz || 1;
      let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
      const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(px - x, pz - z);
      if (d < best) { best = d; bs = this.c[i - 1] + Math.sqrt(L2) * t; }
    }
    return { s: bs, d: best };
  }
}

// ---------- canvas textures ----------
function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = opts.aniso || 4;
  if (opts.mip === false) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}
function fitText(g, text, font, maxW, size) {
  let s = size; g.font = font.replace('{s}', s);
  while (g.measureText(text).width > maxW && s > 8) { s -= 2; g.font = font.replace('{s}', s); }
  return s;
}

export function buildCity(scene, opts = {}) {
  const group = new THREE.Group(); group.name = 'city'; scene.add(group);
  const R = CITY.R;
  const uni = {
    uNight: { value: 1 }, uCam: { value: new THREE.Vector3() }, uFocus: { value: new THREE.Vector3() },
    uCutR: { value: 0 }, uCutOn: { value: 1 }, uClampR: { value: 0 }, uClampH: { value: 3.6 }, uNear: { value: 0 },
  };


  const CUT_FRAG = `
  if (uCutOn > 0.5 && uCutR > 0.0) {
    vec3 ab = uCam - uFocus; float L = length(ab); vec3 d = ab / L;
    float t = dot(vCWPos - uFocus, d);
    if (t > 0.0 && t < L) {
      float r = mix(uCutR, uCutR * 0.45, t / L);
      float q = length((vCWPos - uFocus) - d * t);
      if (q < r && vCWPos.y > 0.2) discard;
    }
  }`;
  function cutify(m, extra, clamp = true) {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCWPos;' + (extra ? '\nattribute float aSeed;\nvarying float vSeed;\nvarying vec3 vWN;' : ''))
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCWPos = (modelMatrix * ' + (m.isInstancedMesh ? '' : '') + 'vec4(transformed, 1.0)).xyz;' + (extra ? '\nvSeed = aSeed;\nvWN = normalize(mat3(modelMatrix) * objectNormal);' : ''));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCWPos;\nuniform float uNight; uniform vec3 uCam; uniform vec3 uFocus; uniform float uCutR; uniform float uCutOn; uniform float uClampR; uniform float uClampH; uniform float uNear;' + (extra ? '\nvarying float vSeed; varying vec3 vWN;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }' : ''))
        .replace('void main() {', 'void main() {' + CUT_FRAG + (clamp ? '\n  if (uClampR > 0.0 && length(vCWPos.xz) < uClampR && vCWPos.y > uClampH) discard;\n  if (uNear > 0.0 && distance(vCWPos, uCam) < uNear) discard;' : ''));
      if (extra) sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + extra);
    };
    return m;
  }

  // ---------- ground, roads, pedestrian streets, greens ----------
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x8f8d88 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(R + 260, 48).rotateX(-Math.PI / 2), groundMat);
  ground.position.y = -0.03; group.add(ground);
  const layer = (list, color, y) => {
    if (!list.length) return null;
    const g = mergeGeometries(list.map((r) => shapeGeo(r, y)));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    group.add(m); return m;
  };
  layer(CITY.green, 0x5b7f49, 0.0);
  layer(CITY.pitch, 0x3d7a58, 0.004);
  layer(CITY.ped, 0xa3927c, 0.006);
  layer(CITY.veh, 0x2c2e34, 0.01);
  // kerb edges: light outline round every carriageway
  {
    const pos = [];
    for (const poly of CITY.veh) for (const ring of poly) {
      const p = pairs(ring);
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; pos.push(a[0], 0.06, a[1], b[0], 0.06, b[1]); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc9c7c0 })));
  }
  // road markings (HK style): double white centre line on two-way main roads, dashed lane lines,
  // double yellow no-stopping lines along the kerbs of the main roads, crossings
  {
    const acc = { pos: [], col: [] }; const W = 0xf2f2ee, Y = 0xf2c230;
    for (const m of CITY.marks) {
      const p = pairs(m.p);
      if (m.two) {
        if (m.major) { strip(acc, offsetLine(p, 0.12), 0.1, 0.03, W); strip(acc, offsetLine(p, -0.12), 0.1, 0.03, W); }
        else if (m.w >= 5) strip(acc, p, 0.1, 0.03, W, [2.5, 3.5]);
      } else if (m.lanes > 1) {
        for (let k = 1; k < m.lanes; k++) strip(acc, offsetLine(p, -m.w / 2 + k * m.w / m.lanes), 0.1, 0.03, W, [3, 5]);
      }
      if (m.major) for (const sgn of [1, -1]) { strip(acc, offsetLine(p, sgn * (m.w / 2 - 0.3)), 0.08, 0.03, Y); strip(acc, offsetLine(p, sgn * (m.w / 2 - 0.48)), 0.08, 0.03, Y); }
    }
    for (const c of CITY.cross) {
      const p = pairs(c.p); if (p.length < 2) continue;
      const a = p[0], b = p[p.length - 1];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 2 || L > 40) continue;
      const ux = dx / L, uz = dz / L;
      if (c.c === 'uncontrolled' || c.c === 'zebra') {
        // zebra: bars parallel to the traffic, stepped across the road
        for (let s = 0.4; s < L - 0.3; s += 1.0) {
          const cx = a[0] + ux * s, cz = a[1] + uz * s;
          strip(acc, [[cx - uz * 1.4, cz + ux * 1.4], [cx + uz * 1.4, cz - ux * 1.4]], 0.5, 0.032, W);
        }
      } else if (c.c === 'traffic_signals' || c.c === 'pedestrian_signals') {
        for (const o of [-1.5, 1.5]) strip(acc, [[a[0] - uz * o, a[1] + ux * o], [b[0] - uz * o, b[1] + ux * o]], 0.14, 0.032, W, [0.5, 0.35]);
      }
    }
    const g = flatGeo(acc);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    group.add(m);
  }
  // tram tracks (Johnston Road / Hennessy Road only — that is where OSM has them)
  {
    const acc = { pos: [], col: [] };
    for (const t of CITY.tracks) { const p = pairs(t); for (const o of [-0.72, 0.72]) strip(acc, offsetLine(p, o), 0.09, 0.035, 0x9aa0a8); }
    if (acc.pos.length) group.add(new THREE.Mesh(flatGeo(acc), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }

  // ---------- buildings ----------
  const PAL = [0xe3dccd, 0xcfc4ae, 0xc2b8a6, 0xaab3b8, 0xd9c7b0, 0xb9c4c2, 0xcdb9ad, 0xa3adb6, 0xded3c2, 0xc4ad98, 0xb2bfae, 0xd6cfbe, 0xc9a99a, 0x9fb0a8];
  const bGeos = [], shopParts = [];
  let bi = 0;
  function extrude(p, y0, y1, col, seed) {
    const pts = pairs(p);
    const pos = [], nor = [], colr = [], sd = [];
    const c = new THREE.Color(col);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 0.01) continue;
      const nx = -dz / L, nz = dx / L; // rings are made clockwise (negative signed area) by cw(), so this points outward
      pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y0, a[1], b[0], y1, b[1], a[0], y1, a[1]);
      for (let k = 0; k < 6; k++) { nor.push(nx, 0, nz); colr.push(c.r, c.g, c.b); sd.push(seed); }
    }
    // roof
    const v2 = pts.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(v2, []);
    const cr = c.clone().multiplyScalar(0.82);
    for (const t of tris) {
      const [a, b, d] = t.map((k) => pts[k]);
      const ny = (b[1] - a[1]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[1] - a[1]);
      for (const k of (ny >= 0 ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]])) { pos.push(pts[k][0], y1, pts[k][1]); nor.push(0, 1, 0); colr.push(cr.r, cr.g, cr.b); sd.push(seed); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
    return g;
  }
  // fix wall orientation: make rings clockwise in (x,z) so (dz,-dx) points outward
  function cw(p) {
    const q = pairs(p); let a = 0; for (let i = 0; i < q.length; i++) { const [x0, z0] = q[i], [x1, z1] = q[(i + 1) % q.length]; a += x0 * z1 - x1 * z0; }
    if (a < 0) return p; const r = []; for (let i = q.length - 1; i >= 0; i--) r.push(q[i][0], q[i][1]); return r;
  }
  const landmarks = [];
  for (const [h, shop, real, lm, p0] of CITY.b) {
    const p = cw(p0); bi++;
    if (shop) { shopParts.push(p); continue; }
    let col = PAL[Math.floor(hash(bi) * PAL.length)];
    if (lm === 1) col = 0x8f9aa6;      // Hopewell Centre: grey-glass cylinder
    if (lm === 3) col = 0xc9ccd0;      // The Avenue towers
    if (h > 90 && !lm) col = 0x9fa9b3; // modern glass towers
    if (lm === 2) { // Hung Shing Temple: low granite hall with a green-tiled roof
      bGeos.push(extrude(p, 0, 4.6, 0xb9b3a6, -1));
      const q = pairs(p); let cx = 0, cz = 0; q.forEach(([x, z]) => { cx += x; cz += z; }); cx /= q.length; cz /= q.length;
      const roof = new THREE.ConeGeometry(Math.max(3, Math.sqrt(q.reduce((m, [x, z]) => Math.max(m, (x - cx) ** 2 + (z - cz) ** 2), 0))) * 0.95, 2.6, 4, 1).toNonIndexed();
      roof.rotateY(Math.PI / 4); roof.translate(cx, 4.6 + 1.3, cz); colorize(roof, 0x3f7d55); roof.deleteAttribute('uv');
      roof.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Float32Array(roof.attributes.position.count).fill(-1), 1));
      bGeos.push(roof); continue;
    }
    bGeos.push(extrude(p, 0, h, col, h < 6 ? -1 : 1 + (bi % 89)));
  }
  const bGeo = mergeGeometries(bGeos);
  const bMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const WIN = `
  vec3 vWPos = vCWPos;
  if (vSeed > -2.0) diffuseColor.rgb *= mix(1.0, 0.36, uNight);
  if (vSeed > 0.0 && abs(vWN.y) < 0.5 && vWPos.y > 4.6) {
    vec2 tg = normalize(vec2(-vWN.z, vWN.x));
    float u = dot(vWPos.xz, tg) / 2.4;
    float v = (vWPos.y - 4.6) / 3.0;
    vec2 cell = vec2(fract(u), fract(v));
    float win = step(0.16, cell.x) * step(cell.x, 0.84) * step(0.28, cell.y) * step(cell.y, 0.82);
    float aa = clamp(1.25 - 4.0 * max(fwidth(u), fwidth(v)), 0.0, 1.0);
    float sd = floor(vSeed + 0.5);
    float r = h21(vec2(floor(u) + sd * 1.37, floor(v) + sd * 0.71));
    vec3 glass = mix(diffuseColor.rgb * 0.42, vec3(0.30, 0.38, 0.48), 0.45);
    float w = mix(0.37, win, aa);
    diffuseColor.rgb = mix(diffuseColor.rgb, glass, w * (1.0 - uNight * 0.3));
    float lit = mix(0.5 * 0.37, step(0.5, r) * win, aa) * uNight;
    vec3 lc = mix(vec3(1.0, 0.78, 0.5), vec3(0.85, 0.93, 1.0), mix(0.3, step(0.78, r), aa));
    totalEmissiveRadiance += lc * lit * (0.55 + 0.45 * mix(0.5, fract(r * 7.0), aa));
  } else if (vSeed > 0.0 && abs(vWN.y) < 0.5 && vWPos.y < 4.4) {
    float uu = dot(vWPos.xz, normalize(vec2(-vWN.z, vWN.x))) / 4.0;
    float r = h21(vec2(floor(uu), floor(vSeed + 0.5)));
    float bay = step(0.06, fract(uu)) * step(fract(uu), 0.94);
    float glassBand = step(0.35, vWPos.y) * step(vWPos.y, 2.7) * bay;
    // ground-floor shopfronts: dark glass with mullions, a lit interior glow that fades upward, a sign band above, shutters on the closed ones
    float fu = fract(uu);
    float mull = 1.0 - step(0.03, abs(fract(fu * 3.0) - 0.5) * 2.0 - 0.94);
    float open = step(0.4, r);
    float shutter = (1.0 - open) * glassBand * (0.75 + 0.25 * step(0.5, fract(vWPos.y * 9.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.07, 0.08), glassBand * open * (1.0 - mull * 0.6));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.43, 0.45) * shutter, (1.0 - open) * glassBand);
    float band = step(2.8, vWPos.y) * step(vWPos.y, 3.45) * bay;
    vec3 signC = mix(vec3(0.95, 0.3, 0.2), mix(vec3(0.2, 0.75, 0.95), vec3(1.0, 0.85, 0.35), step(0.7, fract(r * 13.0))), step(0.4, fract(r * 5.0)));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.1, 0.12), band);
    float grad = clamp(1.15 - vWPos.y / 2.7, 0.25, 1.0);
    totalEmissiveRadiance += vec3(1.0, 0.86, 0.68) * open * glassBand * (1.0 - mull * 0.8) * grad * (0.10 + 0.16 * uNight);
    totalEmissiveRadiance += signC * band * step(0.35, fract(r * 3.0)) * (0.05 + 0.35 * uNight);
  }`;
  cutify(bMat, WIN);
  const buildings = new THREE.Mesh(bGeo, bMat); group.add(buildings);

  // Kui Chi Mansion (the shop's own building): upper floors are glass-ghosted in the overview so the room stays visible
  const SHOP_H = (CITY.b.find((b) => b[1]) || [36])[0];
  const shopGeo = mergeGeometries(shopParts.map((p) => extrude(p, 3.35, SHOP_H, 0xd8d2c4, 777)));
  const ghostMat = new THREE.MeshLambertMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.13, depthWrite: false });
  const shopUpper = new THREE.Mesh(shopGeo, ghostMat); group.add(shopUpper);
  const shopEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shopGeo, 20), new THREE.LineBasicMaterial({ color: 0xF64501, transparent: true, opacity: 0.55 }));
  group.add(shopEdges);
  // floor lines on the ghost so it still reads as a building
  {
    const pos = []; const p = pairs(shopParts[0] || []);
    for (let y = 3.35 + 3; y < SHOP_H; y += 3) for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; pos.push(a[0], y, a[1], b[0], y, b[1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const fl = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })); group.add(fl); shopEdges.userData.floors = fl;
  }

  // ---------- street furniture ----------
  const furn = []; const glowParts = [];
  // street-name plates: HK style — white arrow plate, black border, English over Chinese, house numbers
  const PW = 1.3, PH = 0.36, TIP = 0.16;
  const SLOT_W = 512, SLOT_H = 128, COLS = 4;
  const plateTex = canvasTex(2048, 2048, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 2048, 2048);
    CITY.plates.forEach((pl, i) => {
      const x0 = (i % COLS) * SLOT_W, y0 = Math.floor(i / COLS) * SLOT_H;
      g.save(); g.translate(x0, y0);
      const numW = pl.rng ? 96 : 0;
      g.fillStyle = '#111';
      fitText(g, pl.en, '600 {s}px ' + LATIN, SLOT_W - 36 - numW, 44); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(pl.en, (SLOT_W - numW) / 2 + 4, 36);
      fitText(g, pl.zh, '700 {s}px ' + CJK, SLOT_W - 36 - numW, 56);
      g.fillText(pl.zh, (SLOT_W - numW) / 2 + 4, 92);
      if (pl.rng) { fitText(g, pl.rng, '600 {s}px ' + LATIN, numW - 10, 30); g.fillText(pl.rng, SLOT_W - numW / 2 - 6, 66); g.fillRect(SLOT_W - numW - 6, 18, 3, 92); }
      g.restore();
    });
  }, { aniso: 8 });
  {
    const frame = [], text = [];
    const pentagon = (w, h, tip, z) => { // arrow plate outline in local x (along the street) / y
      const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2 - tip, -h / 2); s.lineTo(w / 2, 0); s.lineTo(w / 2 - tip, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
      const g = new THREE.ShapeGeometry(s); g.translate(0, 0, z); return g.toNonIndexed();
    };
    for (const post of CITY.posts) {
      furn.push(cylG(0.045, 0.05, 3.4, 6, post.x, 1.7, post.z, 0x6b6f75));
      post.pl.forEach((pl, k) => {
        const ang = Math.atan2(-pl.dz, pl.dx); // local +x -> along the street, away from the junction
        const y = 2.75 + k * 0.42;
        const place = (g) => { g.rotateY(ang); g.translate(post.x + pl.dx * 0.5, y, post.z + pl.dz * 0.5); return g; };
        const back = pentagon(PW + 0.05, PH + 0.05, TIP + 0.02, 0);
        frame.push(colorize(place(back), 0x101010));
        for (const side of [1, -1]) {
          const wp = pentagon(PW, PH, TIP, 0.008 * side); colorize(wp, 0xffffff); frame.push(place(wp));
          // text quad over the rectangular part (UV: slot in the atlas; mirrored on the back so it reads right)
          const tw = PW - TIP - 0.04, th = PH - 0.04;
          const q = new THREE.PlaneGeometry(tw, th); if (side < 0) q.rotateY(Math.PI);
          q.translate(-TIP / 2, 0, 0.014 * side);
          const u0 = (pl.i % COLS) * SLOT_W / 2048, v1 = 1 - Math.floor(pl.i / COLS) * SLOT_H / 2048, u1 = u0 + SLOT_W / 2048, v0 = v1 - SLOT_H / 2048;
          const uv = q.attributes.uv; for (let j = 0; j < uv.count; j++) { uv.setXY(j, uv.getX(j) ? u1 : u0, uv.getY(j) ? v1 : v0); }
          text.push(place(q.toNonIndexed()));
        }
      });
    }
    if (frame.length) {
      const fm = new THREE.Mesh(mergeGeometries(frame), cutify(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), null, false)); group.add(fm);
      const tm = new THREE.Mesh(mergeGeometries(text), cutify(new THREE.MeshLambertMaterial({ map: plateTex }), null, false)); group.add(tm);
    }
  }
  // lamp posts (HK grey columns with a swan-neck arm), ID plates on the ones along the walk
  const lampHeads = [];
  for (const [x, z, fx, fz] of CITY.lamps) {
    furn.push(cylG(0.08, 0.12, 9, 6, x, 4.5, z, 0x7d8288));
    const ang = Math.atan2(-fz, fx);
    const arm = boxG(1.6, 0.1, 0.1, 0.8, 9.0, 0, 0x7d8288); arm.rotateY(ang); arm.translate(x, 0, z); furn.push(arm);
    const hd = boxG(0.7, 0.16, 0.32, 1.45, 8.9, 0, 0x50555c); hd.rotateY(ang); hd.translate(x, 0, z); furn.push(hd);
    const gl = boxG(0.6, 0.04, 0.26, 1.45, 8.8, 0, 0xffffff); gl.rotateY(ang); gl.translate(x, 0, z); glowParts.push(gl);
    lampHeads.push(new THREE.Vector3(x + fx * 1.45, 8.75, z + fz * 1.45));
  }
  // lamp-post ID plates (illustrative codes; HK posts carry a white plate with a black code at eye level)
  {
    const near = CITY.lamps.map((l, i) => ({ l, i, d: Math.hypot(l[0], l[1]) })).filter((o) => o.d < 150).slice(0, 48);
    const tex = canvasTex(1024, 512, (g) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 40px ' + LATIN;
      near.forEach((o, k) => { const x = (k % 8) * 128, y = Math.floor(k / 8) * 64; const code = 'E' + String(1000 + Math.floor(hash(o.i + 3) * 8999)).padStart(4, '0'); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(x + 6, y + 6, 116, 52); g.fillText(code, x + 64, y + 34); });
    }, { aniso: 4 });
    const qs = [];
    near.forEach((o, k) => {
      const [x, z, fx, fz] = o.l; const q = new THREE.PlaneGeometry(0.34, 0.17);
      const u0 = (k % 8) * 128 / 1024, v1 = 1 - Math.floor(k / 8) * 64 / 512, u1 = u0 + 128 / 1024, v0 = v1 - 64 / 512;
      const uv = q.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) ? u1 : u0, uv.getY(j) ? v1 : v0);
      // facing the pavement (away from the road)
      q.rotateY(Math.atan2(-fx, -fz)); q.translate(x - fx * 0.13, 1.9, z - fz * 0.13); qs.push(q.toNonIndexed());
    });
    if (qs.length) group.add(new THREE.Mesh(mergeGeometries(qs), new THREE.MeshLambertMaterial({ map: tex })));
  }
  // red-and-white roadside railings
  for (const [x0, z0, x1, z1] of CITY.rails) {
    const L = Math.hypot(x1 - x0, z1 - z0); if (L < 1) continue; const ux = (x1 - x0) / L, uz = (z1 - z0) / L; const ang = Math.atan2(-uz, ux);
    for (let s = 0; s <= L + 0.01; s += 2) furn.push(cylG(0.03, 0.03, 1.1, 5, x0 + ux * s, 0.55, z0 + uz * s, 0xf2f2f2));
    for (let s = 0; s < L - 0.01; s += 1) {
      const len = Math.min(1, L - s), cx = x0 + ux * (s + len / 2), cz = z0 + uz * (s + len / 2);
      const c = Math.floor(s) % 2 ? 0xffffff : 0xc8202a;
      furn.push(boxG(len, 0.07, 0.04, cx, 1.06, cz, c, ang));
      furn.push(boxG(len, 0.05, 0.03, cx, 0.62, cz, c, ang));
    }
  }
  // traffic signals + pedestrian beeper boxes at signalised crossings
  const signalLights = [];
  for (const c of CITY.cross) {
    if (c.c !== 'traffic_signals' && c.c !== 'pedestrian_signals') continue;
    const p = pairs(c.p); if (p.length < 2) continue;
    const a = p[0], b = p[p.length - 1]; const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 2 || L > 40) continue;
    const ux = dx / L, uz = dz / L;
    for (const [e, dir] of [[a, -1], [b, 1]]) {
      const x = e[0] + ux * dir * 0.6 + uz * 1.9, z = e[1] + uz * dir * 0.6 - ux * 1.9;
      furn.push(cylG(0.06, 0.07, 3.2, 6, x, 1.6, z, 0x2d3036));
      const ang = Math.atan2(uz * dir, -ux * dir);
      const head = boxG(0.3, 0.62, 0.22, 0, 2.75, 0, 0x16181c); head.rotateY(ang); head.translate(x, 0, z); furn.push(head);
      const bx = boxG(0.2, 0.3, 0.12, 0, 1.15, 0, 0x2b2e33); bx.rotateY(ang); bx.translate(x, 0, z); furn.push(bx);           // beeper box
      const btn = boxG(0.12, 0.08, 0.02, 0, 1.18, 0.07, 0xf1c232); btn.rotateY(ang); btn.translate(x, 0, z); furn.push(btn);
      signalLights.push({ x, z, ang, dir });
    }
  }
  // bus stop poles + flags (names and route numbers straight from OSM), green-minibus stop signs, MTR exit
  const stopTex = [];
  const stops = CITY.stops.filter((s) => (s.t !== 'bus' || Math.hypot(s.x, s.z) < 140));
  const flagTex = canvasTex(1024, 1024, (g) => {
    stops.forEach((s, i) => {
      const x0 = (i % 4) * 256, y0 = Math.floor(i / 4) * 256; g.save(); g.translate(x0, y0);
      const zh = (s.name || '').split(' ')[0], en = (s.name || '').replace(/^[^A-Za-z(（]+/, '');
      if (s.t === 'gmb') { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#1f8a4c'; g.fillRect(0, 0, 256, 70); g.fillStyle = '#fff'; g.font = '700 34px ' + CJK; g.textAlign = 'center'; g.fillText('專線小巴', 128, 48); g.fillStyle = '#1f8a4c'; g.font = '800 80px ' + LATIN; g.fillText(s.routes || 'GMB', 128, 150); g.fillStyle = '#222'; fitText(g, zh, '700 {s}px ' + CJK, 236, 30); g.fillText(zh, 128, 200); fitText(g, en, '500 {s}px ' + LATIN, 236, 20); g.fillText(en, 128, 234); }
      else if (s.t === 'mtr') { g.fillStyle = '#b8262e'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 46px ' + LATIN; g.fillText('MTR 港鐵', 128, 60); g.font = '800 96px ' + LATIN; g.fillText(s.ref || '', 128, 160); fitText(g, zh, '700 {s}px ' + CJK, 236, 30); g.fillText(zh, 128, 204); fitText(g, en, '600 {s}px ' + LATIN, 236, 22); g.fillText(en, 128, 238); }
      else { g.fillStyle = (s.op || '').includes('KMB') ? '#d42a2a' : '#f5c400'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; g.fillRect(10, 10, 236, 70); g.fillStyle = '#111'; g.textAlign = 'center'; fitText(g, zh, '700 {s}px ' + CJK, 226, 34); g.fillText(zh, 128, 44); fitText(g, en, '600 {s}px ' + LATIN, 226, 20); g.fillText(en, 128, 72); g.fillStyle = (s.op || '').includes('KMB') ? '#fff' : '#111'; const r = (s.routes || '').split(';'); g.font = '800 30px ' + LATIN; for (let k = 0; k < Math.min(r.length, 12); k++) g.fillText(r[k], 46 + (k % 3) * 82, 120 + Math.floor(k / 3) * 36); }
      g.restore();
    });
  }, { aniso: 4 });
  {
    const qs = [];
    stops.forEach((s, i) => {
      const tall = s.t === 'mtr' ? 3.2 : 2.9;
      furn.push(cylG(0.05, 0.05, tall + 0.2, 6, s.x, (tall + 0.2) / 2, s.z, s.t === 'mtr' ? 0x9a1f26 : 0x8a8f96));
      for (const side of [0, Math.PI]) {
        const q = new THREE.PlaneGeometry(0.62, 0.62);
        const u0 = (i % 4) * 0.25, v1 = 1 - Math.floor(i / 4) * 0.25; const uv = q.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) ? u0 + 0.25 : u0, uv.getY(j) ? v1 : v1 - 0.25);
        q.rotateY(side + 0.6); q.translate(s.x + Math.sin(side + 0.6) * 0.012, tall - 0.2, s.z + Math.cos(side + 0.6) * 0.012); qs.push(q.toNonIndexed());
      }
      if (s.t === 'mtr') furn.push(boxG(2.6, 0.12, 3.4, s.x + 1.6, 3.1, s.z, 0x9a1f26)); // exit canopy edge
    });
    if (qs.length) group.add(new THREE.Mesh(mergeGeometries(qs), new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.FrontSide })));
  }
  // overhead shop signs — generic HK trade words (not real business names), glowing at night
  const SIGNS = [
    ['地產', '#c8102e', '#fff3c4'], ['藥房', '#0a5a9c', '#ffffff'], ['麵家', '#ffd400', '#b3001b'], ['茶餐廳', '#ffffff', '#c8102e'],
    ['按摩', '#6a1b9a', '#ffe9ff'], ['眼鏡', '#00796b', '#ffffff'], ['找換', '#111111', '#ffd400'], ['冰室', '#e65100', '#fff8e1'],
    ['PHARMACY 藥房', '#0a5a9c', '#ffffff'], ['地產 PROPERTY', '#c8102e', '#fff3c4'], ['雲吞麵 NOODLES', '#ffd400', '#b3001b'], ['冰室 CAFÉ', '#ffffff', '#d32f2f'],
    ['眼鏡 OPTICAL', '#00796b', '#ffffff'], ['找換 MONEY CHANGER', '#111111', '#ffd400'], ['五金 HARDWARE', '#1565c0', '#ffffff'], ['按摩 FOOT MASSAGE', '#6a1b9a', '#ffe9ff'],
  ];
  const signTex = canvasTex(1024, 1024, (g) => {
    SIGNS.forEach(([t, bg, fg], i) => {
      if (i < 8) { // vertical
        const x0 = i * 128; g.fillStyle = bg; g.fillRect(x0, 0, 128, 512); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(x0 + 8, 8, 112, 496);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const n = t.length; const s = Math.min(92, 440 / n);
        g.font = `800 ${s}px ${CJK}`; for (let k = 0; k < n; k++) g.fillText(t[k], x0 + 64, 256 + (k - (n - 1) / 2) * s * 1.08);
      } else {
        const j = i - 8, x0 = (j % 2) * 512, y0 = 512 + Math.floor(j / 2) * 128; g.fillStyle = bg; g.fillRect(x0, y0, 512, 128); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(x0 + 7, y0 + 7, 498, 114);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, t, `800 {s}px ${CJK}`, 470, 64); g.fillText(t, x0 + 256, y0 + 66);
      }
    });
  }, { aniso: 4 });
  {
    const qs = [];
    for (const [x, z, fx, fz, v, y] of CITY.signs) {
      const vert = v < 8; const w = vert ? 0.9 : 2.6, h = vert ? 3.4 : 0.85; const out = vert ? 1.0 : 1.9;
      let u0, u1, v0, v1;
      if (vert) { u0 = v * 128 / 1024; u1 = u0 + 128 / 1024; v1 = 1; v0 = 0.5; } else { const j = v - 8; u0 = (j % 2) * 0.5; u1 = u0 + 0.5; v1 = 0.5 - Math.floor(j / 2) * 0.125; v0 = v1 - 0.125; }
      const ang = Math.atan2(-fz, fx); // local x: out from the facade toward the road
      const yy = vert ? Math.max(y, 4.6) + 1.2 : y;
      for (const side of [1, -1]) {
        const q = new THREE.PlaneGeometry(w, h);
        const uv = q.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) ? u1 : u0, uv.getY(j) ? v1 : v0);
        if (side < 0) q.rotateY(Math.PI);
        q.translate(out, 0, 0.09 * side);
        q.rotateY(ang); q.translate(x, yy, z); qs.push(q.toNonIndexed());
      }
      const fr = boxG(w + 0.08, h + 0.08, 0.16, out, 0, 0, 0x222226); fr.rotateY(ang); fr.translate(x, yy, z); furn.push(fr);
      const br = boxG(out - w / 2 + 0.1, 0.06, 0.06, (out - w / 2) / 2, h / 2 - 0.1, 0, 0x3a3d42); br.rotateY(ang); br.translate(x, yy, z); furn.push(br);
    }
    var signMat = cutify(new THREE.MeshBasicMaterial({ map: signTex, color: 0xffffff }));
    if (qs.length) group.add(new THREE.Mesh(mergeGeometries(qs), signMat));
  }
  const furnMesh = new THREE.Mesh(mergeGeometries(furn), cutify(new THREE.MeshLambertMaterial({ vertexColors: true }))); group.add(furnMesh);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  cutify(glowMat); if (glowParts.length) group.add(new THREE.Mesh(mergeGeometries(glowParts), glowMat));
  // lamp light pools on the pavement at night (cheap additive discs, no real lights)
  const poolTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, { mip: false });
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const qs = lampHeads.map((v) => { const q = new THREE.PlaneGeometry(9, 9); q.rotateX(-Math.PI / 2); q.translate(v.x, 0.07, v.z); return q.toNonIndexed(); });
    if (qs.length) group.add(new THREE.Mesh(mergeGeometries(qs), poolMat));
  }

  // ---------- vehicles (instanced; left-hand traffic along OSM centrelines) ----------
  const VT = {};
  function vtype(name, parts, lights, len) {
    const body = mergeGeometries(parts); const li = mergeGeometries(lights);
    VT[name] = { body, li, len, list: [] };
  }
  const W_ = 0xd7e3ee; // window glass
  vtype('bus_cb', [boxG(2.5, 1.9, 12, 0, 1.25, 0, 0xf5c400), boxG(2.5, 1.7, 12, 0, 3.15, 0, 0xfafafa), boxG(2.52, 0.75, 11.4, 0, 1.75, 0.1, 0x2a3440), boxG(2.52, 0.8, 11.6, 0, 3.2, 0, 0x2a3440), boxG(2.52, 0.18, 12.02, 0, 0.55, 0, 0xc8202a), boxG(2.4, 0.1, 11.6, 0, 4.05, 0, 0xe8e8e8)],
    [boxG(2.0, 0.18, 0.04, 0, 0.7, 6.02, 0xfff3d0), boxG(2.0, 0.2, 0.04, 0, 0.75, -6.02, 0xff2a2a), boxG(1.6, 0.3, 0.04, 0, 3.75, 6.02, 0xffa21f)], 12);
  vtype('bus_kmb', [boxG(2.5, 1.9, 12, 0, 1.25, 0, 0xc8202a), boxG(2.5, 1.7, 12, 0, 3.15, 0, 0xf0ece0), boxG(2.52, 0.75, 11.4, 0, 1.75, 0.1, 0x2a3440), boxG(2.52, 0.8, 11.6, 0, 3.2, 0, 0x2a3440), boxG(2.4, 0.1, 11.6, 0, 4.05, 0, 0xd9d4c6)],
    [boxG(2.0, 0.18, 0.04, 0, 0.7, 6.02, 0xfff3d0), boxG(2.0, 0.2, 0.04, 0, 0.75, -6.02, 0xff2a2a), boxG(1.6, 0.3, 0.04, 0, 3.75, 6.02, 0xffa21f)], 12);
  vtype('taxi', [boxG(1.75, 0.7, 4.6, 0, 0.55, 0, 0xc8231d), boxG(1.6, 0.6, 2.4, 0, 1.2, -0.2, 0xd8d8d8), boxG(1.62, 0.45, 2.2, 0, 1.2, -0.2, 0x26303a), boxG(0.5, 0.18, 0.25, 0, 1.6, -0.1, 0xf4f4f4)],
    [boxG(1.4, 0.12, 0.04, 0, 0.62, 2.31, 0xfff3d0), boxG(1.4, 0.12, 0.04, 0, 0.62, -2.31, 0xff2a2a), boxG(0.46, 0.14, 0.2, 0, 1.6, -0.1, 0xfff0a0)], 4.6);
  vtype('rmb', [boxG(2.0, 1.6, 7.0, 0, 1.15, 0, 0xf0e9d8), boxG(2.02, 0.65, 6.2, 0, 1.55, -0.2, 0x26303a), boxG(2.02, 0.35, 7.02, 0, 2.1, 0, 0xc8202a)],
    [boxG(1.6, 0.14, 0.04, 0, 0.75, 3.51, 0xfff3d0), boxG(1.6, 0.14, 0.04, 0, 0.75, -3.51, 0xff2a2a)], 7);
  vtype('gmb', [boxG(2.0, 1.6, 7.0, 0, 1.15, 0, 0xf0e9d8), boxG(2.02, 0.65, 6.2, 0, 1.55, -0.2, 0x26303a), boxG(2.02, 0.35, 7.02, 0, 2.1, 0, 0x1f8a4c)],
    [boxG(1.6, 0.14, 0.04, 0, 0.75, 3.51, 0xfff3d0), boxG(1.6, 0.14, 0.04, 0, 0.75, -3.51, 0xff2a2a)], 7);
  vtype('van', [boxG(1.9, 1.9, 5.0, 0, 1.2, 0, 0xf2f2f2), boxG(1.92, 0.6, 1.0, 0, 1.6, 1.9, 0x26303a)],
    [boxG(1.5, 0.12, 0.04, 0, 0.7, 2.51, 0xfff3d0), boxG(1.5, 0.12, 0.04, 0, 0.7, -2.51, 0xff2a2a)], 5);
  vtype('tram', [boxG(2.1, 1.9, 12, 0, 1.35, 0, 0x2f7d4f), boxG(2.12, 1.75, 12, 0, 3.2, 0, 0x2f7d4f), boxG(2.14, 0.8, 11.2, 0, 1.75, 0, 0xe9e2cf), boxG(2.14, 0.9, 11.2, 0, 3.3, 0, 0xe9e2cf), boxG(1.9, 0.12, 11.6, 0, 4.12, 0, 0x1d1f24), boxG(0.05, 0.9, 0.05, 0, 4.6, 1.5, 0x1d1f24)],
    [boxG(1.0, 0.25, 0.04, 0, 3.85, 6.02, 0xff9a2e), boxG(1.0, 0.25, 0.04, 0, 3.85, -6.02, 0xff9a2e), boxG(0.5, 0.18, 0.04, 0, 0.8, 6.02, 0xfff3d0)], 12);
  const routes = CITY.routes.map((r) => ({ ...r, path: new Path(r.p), veh: [] }));
  // bus stops along a route (dwell), from OSM stop positions
  for (const r of routes) {
    r.stopsAt = [];
    if (r.k !== 'road') continue;
    for (const s of CITY.stops) if (s.t === 'bus') { const n = r.path.nearest(s.x, s.z); if (n.d < 7) r.stopsAt.push(n.s); }
  }
  let vid = 0;
  for (const r of routes) {
    for (let i = 0; i < r.n; i++) {
      const type = r.t[(i + vid) % r.t.length]; vid++;
      const v = { type, s: (r.path.L / r.n) * (i + hash(vid) * 0.5), v: r.v * (0.85 + hash(vid * 3) * 0.3), cur: r.v, dwell: 0, lastStop: -1, idx: VT[type].list.length };
      VT[type].list.push({ r, v }); r.veh.push(v);
    }
  }
  const vehMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const vLightMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff });
  for (const k in VT) {
    const t = VT[k]; const n = Math.max(1, t.list.length);
    t.mesh = new THREE.InstancedMesh(t.body, vehMat, n); t.lim = new THREE.InstancedMesh(t.li, vLightMat, n);
    t.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); t.lim.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    t.mesh.count = t.list.length; t.lim.count = t.list.length; t.mesh.frustumCulled = false; t.lim.frustumCulled = false;
    group.add(t.mesh, t.lim);
  }
  // ---------- walkers on the pavements (instanced, simple) ----------
  const walkers = [];
  const wkPaths = [];
  for (const m of CITY.marks) if (m.major && m.p.length >= 4) {
    const p = pairs(m.p); const L = p.reduce((a, q, i) => i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
    if (L < 30) continue;
    for (const sgn of [1, -1]) { const off = offsetLine(p, sgn * (m.w / 2 + 1.5)); const flat = []; off.forEach(([x, z]) => flat.push(x, z)); wkPaths.push(new Path(flat)); }
  }
  const wkBody = cylG(0.17, 0.2, 0.75, 6, 0, 1.12, 0, 0xffffff);
  const wkRest = mergeGeometries([cylG(0.09, 0.09, 0.8, 5, 0, 0.4, 0, 0x30333a), cylG(0.12, 0.12, 0.24, 7, 0, 1.66, 0, 0xe0b08a), cylG(0.13, 0.12, 0.08, 7, 0, 1.8, 0, 0x1a1412)]);
  const WCOL = [0xf6f3e7, 0x2a3a5c, 0x6b2f2f, 0x2f5b4a, 0xd6a24a, 0x444a55, 0xc0d4e6, 0x8b5ca6, 0xe07a5f, 0x1f1f24, 0x9bb7a0];
  const nW = Math.min(90, wkPaths.length * 3);
  const wkMesh = new THREE.InstancedMesh(wkBody, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, nW));
  const wkMesh2 = new THREE.InstancedMesh(wkRest, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, nW));
  wkMesh.frustumCulled = false; wkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); wkMesh2.frustumCulled = false; wkMesh2.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < nW; i++) {
    const path = wkPaths[i % wkPaths.length];
    walkers.push({ path, s: hash(i * 7.3) * path.L, v: (hash(i * 1.7) < 0.5 ? -1 : 1) * (1.1 + hash(i * 5.1) * 0.5), side: (hash(i * 2.9) - 0.5) * 1.2 });
    wkMesh.setColorAt(i, new THREE.Color(WCOL[i % WCOL.length]));
  }
  group.add(wkMesh, wkMesh2);

  // ---------- night state ----------
  const night = { k: 1 };
  function setNight(k) {
    night.k = k; uni.uNight.value = k;
    signMat.color.setScalar(0.62 + 0.75 * k);
    glowMat.color.setRGB(0.55 + 0.45 * k, 0.55 + 0.33 * k, 0.5 + 0.2 * k);
    poolMat.opacity = k; vLightMat.color.setScalar(0.35 + 0.65 * k);
    groundMat.color.setHex(k > 0.5 ? 0x6f6d69 : 0x8a8781);
  }
  setNight(1);

  // ---------- per-frame ----------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
  const A = { x: 0, z: 0 }, B = { x: 0, z: 0 };
  function update(dt, camera, focus, mode) {
    uni.uCam.value.copy(camera.position); uni.uFocus.value.copy(focus);
    // vehicles: simple car-following per route, wrap at the ends (the ends sit in the fog)
    for (const r of routes) {
      const vs = r.veh; vs.sort((a, b) => a.s - b.s);
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i]; const lead = vs[(i + 1) % vs.length];
        let gap = (lead.s - v.s + r.path.L) % r.path.L; if (vs.length === 1) gap = 1e9;
        const need = (VT[v.type].len + VT[lead.type].len) / 2 + 3;
        let target = v.v;
        if (v.dwell > 0) { v.dwell -= dt; target = 0; }
        else if (v.type.startsWith('bus') || v.type === 'tram') for (const st of r.stopsAt) if (v.lastStop !== st && v.s > st - 0.5 && v.s < st + 1.5) { v.dwell = 5 + hash(v.s) * 3; v.lastStop = st; }
        if (gap < need + 8) target = Math.min(target, Math.max(0, (gap - need) * 0.9));
        v.cur += (target - v.cur) * Math.min(1, dt * 2.2);
        v.s += v.cur * dt; if (v.s > r.path.L) { v.s -= r.path.L; v.lastStop = -1; }
      }
    }
    for (const k in VT) {
      const t = VT[k];
      for (let i = 0; i < t.list.length; i++) {
        const { r, v } = t.list[i];
        r.path.at(v.s, A); r.path.at(Math.min(r.path.L, v.s + 2.5), B);
        let dx = B.x - A.x, dz = B.z - A.z; if (Math.abs(dx) + Math.abs(dz) < 1e-4) { r.path.at(Math.max(0, v.s - 2.5), B); dx = A.x - B.x; dz = A.z - B.z; }
        _e.set(0, Math.atan2(dx, dz), 0); _q.setFromEuler(_e); _p.set(A.x, 0, A.z);
        // fade in/out at the route ends by sinking into the road (they start and end inside the fog)
        const edge = Math.min(v.s, r.path.L - v.s); _p.y = edge < 6 ? -4.6 * (1 - edge / 6) : 0;
        _m.compose(_p, _q, _s); t.mesh.setMatrixAt(i, _m); t.lim.setMatrixAt(i, _m);
      }
      t.mesh.instanceMatrix.needsUpdate = true; t.lim.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i]; w.s += w.v * dt; if (w.s > w.path.L) w.s -= w.path.L; if (w.s < 0) w.s += w.path.L;
      w.path.at(w.s, A); w.path.at(Math.min(w.path.L, Math.max(0, w.s + Math.sign(w.v) * 1.5)), B);
      const dx = B.x - A.x, dz = B.z - A.z;
      _e.set(0, Math.atan2(dx, dz), 0); _q.setFromEuler(_e);
      const L = Math.hypot(dx, dz) || 1;
      _p.set(A.x + (dz / L) * w.side, Math.abs(Math.sin(w.s * 3.1)) * 0.05, A.z - (dx / L) * w.side);
      _m.compose(_p, _q, _s); wkMesh.setMatrixAt(i, _m); wkMesh2.setMatrixAt(i, _m);
    }
    wkMesh.instanceMatrix.needsUpdate = true; wkMesh2.instanceMatrix.needsUpdate = true;
  }
  function setCut(radius, on = true, clampR = 0, near = 0) { uni.uCutR.value = radius; uni.uCutOn.value = on ? 1 : 0; uni.uClampR.value = clampR; uni.uNear.value = near; }
  function setGhost(on) {
    shopUpper.material = on ? ghostMat : bMat; shopEdges.visible = on; shopEdges.userData.floors.visible = on;
  }
  return { group, update, setNight, setCut, setGhost, walk: new Path(CITY.walk), walkDoor: CITY.walkDoor, walkTurn: CITY.walkTurn, debug: { plateTex, signTex, flagTex }, north: CITY.north, labels: CITY.labels, landmarks: CITY.landmarks, stops: CITY.stops, R };
}
