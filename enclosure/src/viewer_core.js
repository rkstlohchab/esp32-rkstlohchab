/* Enclosure Studio - core: scene, shell, camera, dimensions, picking.
   World frame = layout.py frame (mm): x right, y up, z towards the viewer. */
(function () {
'use strict';
var T = window.THREE, DATA = window.ENCLOSURE;
var APP = window.APP = { T: T, DATA: DATA };
if (!T || !DATA) {
  document.querySelector('.stage').insertAdjacentHTML('beforeend',
    '<p class="readout" style="top:48%;left:50%;transform:translateX(-50%)">The 3D library did not load. Reload the page.</p>');
  APP.dead = true; return;
}

function tok(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888'; }
APP.tok = tok;

var cav = DATA.cavity, walls = DATA.walls;
var OUT = { x0: -walls.side, x1: cav.W + walls.side, y0: -walls.side, y1: cav.H + walls.side,
            z0: -walls.back, z1: cav.D + walls.front };
APP.OUT = OUT;
var CENTER = new T.Vector3((OUT.x0 + OUT.x1) / 2, (OUT.y0 + OUT.y1) / 2, (OUT.z0 + OUT.z1) / 2);
APP.CENTER = CENTER;
APP.fmt = function (v, d) { return (Math.round(v * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)).toFixed(d == null ? 1 : d); };

/* ---------- renderer ---------- */
var canvas = document.getElementById('c');
var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.localClippingEnabled = true;
renderer.outputEncoding = T.sRGBEncoding;
var scene = new T.Scene();
var camera = new T.PerspectiveCamera(35, 1, 1, 5000);
/* true-scale (orthographic) camera: no perspective, so parts at different
   depths compare at their real sizes. Standard views use it, 3/4 does not. */
var ortho = new T.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
APP.useOrtho = false;
function cur() { return APP.useOrtho ? ortho : camera; }
APP.setOrtho = function (v) { APP.useOrtho = !!v; if (APP.onOrtho) APP.onOrtho(APP.useOrtho); };
var root = new T.Group(); root.position.copy(CENTER).multiplyScalar(-1); scene.add(root);
APP.scene = scene; APP.root = root; APP.camera = camera; APP.renderer = renderer;

scene.add(new T.HemisphereLight(0xf4f8ff, 0x3a3f3c, 0.85));
var key = new T.DirectionalLight(0xffffff, 0.95); key.position.set(160, 260, 320); scene.add(key);
var fill = new T.DirectionalLight(0xcfe0ff, 0.45); fill.position.set(-260, 60, -120); scene.add(fill);
var rim = new T.DirectionalLight(0xfff0d8, 0.35); rim.position.set(80, -200, 160); scene.add(rim);

/* ---------- material + geometry helpers (used by parts) ---------- */
var matCache = {};
APP.mat = function (color, rough, metal, extra) {
  var k = color + '|' + rough + '|' + metal + (extra ? JSON.stringify(extra) : '');
  if (!matCache[k]) {
    matCache[k] = new T.MeshStandardMaterial(Object.assign({ color: color, roughness: rough == null ? 0.6 : rough,
      metalness: metal == null ? 0.05 : metal }, extra || {}));
  }
  return matCache[k];
};
APP.M = {
  gold: APP.mat('#d4a94f', 0.28, 0.9), silver: APP.mat('#c9cdd1', 0.3, 0.85), tin: APP.mat('#b8bcc0', 0.35, 0.8),
  blackPlastic: APP.mat('#16181b', 0.7, 0.02), darkChip: APP.mat('#1c1e22', 0.45, 0.1), white: APP.mat('#f1f0ea', 0.7, 0),
  brass: APP.mat('#c79a3e', 0.3, 0.85), copper: APP.mat('#c07a45', 0.35, 0.8), solder: APP.mat('#cfd3d6', 0.25, 0.9)
};
APP.box = function (parent, x0, y0, z0, x1, y1, z1, material) {
  var m = new T.Mesh(new T.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); parent.add(m); return m;
};
/* cylinder along an axis ('x'|'y'|'z') from a to b at (u, v) in the other two coords */
APP.cyl = function (parent, axis, a, b, u, v, r, material, seg, r2) {
  var g = new T.CylinderGeometry(r2 == null ? r : r2, r, Math.abs(b - a), seg || 24);
  var m = new T.Mesh(g, material), c = (a + b) / 2, flip = b < a;
  if (axis === 'y') { m.position.set(u, c, v); if (flip) m.rotation.z = Math.PI; }
  else if (axis === 'x') { m.rotation.z = flip ? Math.PI / 2 : -Math.PI / 2; m.position.set(c, u, v); }
  else { m.rotation.x = flip ? -Math.PI / 2 : Math.PI / 2; m.position.set(u, v, c); }
  parent.add(m); return m;
};
/* many identical boxes: pts = [[x,y,z],...] centres */
APP.inst = function (parent, pts, sx, sy, sz, material) {
  if (!pts.length) return null;
  var im = new T.InstancedMesh(new T.BoxGeometry(sx, sy, sz), material, pts.length), o = new T.Object3D();
  pts.forEach(function (p, i) { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  parent.add(im); return im;
};
/* canvas texture drawn in mm: draw(ctx, s) with s px per mm, origin bottom-left (y up) */
APP.tex = function (Lmm, Wmm, bg, draw, pxPerMm) {
  var s = pxPerMm || 12, cv = document.createElement('canvas');
  cv.width = Math.max(16, Math.round(Lmm * s)); cv.height = Math.max(16, Math.round(Wmm * s));
  var ctx = cv.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.translate(0, cv.height); ctx.scale(1, -1);
  draw(ctx, s, cv);
  ctx.restore();
  var t = new T.CanvasTexture(cv); t.anisotropy = 8; t.encoding = T.sRGBEncoding; return t;
};
/* upright text inside a y-up canvas context */
APP.text = function (ctx, s, str, x, y, sizeMm, color, align, rot, weight) {
  ctx.save(); ctx.translate(x * s, y * s); ctx.scale(1, -1); if (rot) ctx.rotate(-rot);
  ctx.fillStyle = color || '#f2f2f2'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.font = (weight || '600') + ' ' + (sizeMm * s) + 'px "IBM Plex Mono", monospace'; ctx.fillText(str, 0, 0); ctx.restore();
};
/* PCB slab with its own top / bottom artwork */
APP.pcb = function (parent, L, W, t, color, top, bottom) {
  var side = APP.mat(color, 0.55, 0.05);
  var mats = [side, side, side, side,
    top ? new T.MeshStandardMaterial({ map: top, roughness: 0.55, metalness: 0.05 }) : side,
    bottom ? new T.MeshStandardMaterial({ map: bottom, roughness: 0.6, metalness: 0.05 }) : side];
  var m = new T.Mesh(new T.BoxGeometry(L, W, t), mats); m.position.set(L / 2, W / 2, t / 2); parent.add(m); return m;
};
/* pads + holes painted onto an artwork context */
APP.padHole = function (ctx, s, x, y, pad, hole, square) {
  ctx.fillStyle = '#d6b25a';
  if (square) ctx.fillRect((x - pad / 2) * s, (y - pad / 2) * s, pad * s, pad * s);
  else { ctx.beginPath(); ctx.arc(x * s, y * s, pad / 2 * s, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#0b0c0d'; ctx.beginPath(); ctx.arc(x * s, y * s, hole / 2 * s, 0, 7); ctx.fill();
};

/* ---------- shell meshes from the build ---------- */
function b64(s, Ctor) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); }
APP.raw = {};
var cutPlane = new T.Plane(new T.Vector3(-1, 0, 0), 1e6);
APP.cutPlane = cutPlane;
var shellGroup = new T.Group(); root.add(shellGroup);
APP.shell = {};
['tub', 'front'].forEach(function (k) {
  var m = DATA.meshes[k]; if (!m) return;
  var pos = b64(m.pos, Float32Array), idx = b64(m.idx, Uint32Array);
  APP.raw[k] = { pos: pos, idx: idx, file: m.file, xf: m.print_xf };
  var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(new T.BufferAttribute(idx, 1));
  var flat = g.toNonIndexed(); flat.computeVertexNormals();
  var mat = new T.MeshStandardMaterial({ color: tok('--shell'), roughness: 0.62, metalness: 0.02, side: T.DoubleSide,
    transparent: true, opacity: 0.2, depthWrite: false, clippingPlanes: [cutPlane], clipShadows: true,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  var mesh = new T.Mesh(flat, mat);
  var edges = new T.LineSegments(new T.EdgesGeometry(flat, 28), new T.LineBasicMaterial({ color: tok('--shell-edge'),
    transparent: true, opacity: 0.55, clippingPlanes: [cutPlane] }));
  var grp = new T.Group(); grp.add(mesh); grp.add(edges); shellGroup.add(grp);
  grp.userData.home = new T.Vector3();
  APP.shell[k] = { group: grp, mesh: mesh, edges: edges };
});

/* ---------- parts (built by viewer_parts.js) ---------- */
APP.partObjs = [];
var partsGroup = new T.Group(); root.add(partsGroup);
var keepGroup = new T.Group(); keepGroup.visible = false;
var labelGroup = new T.Group(); labelGroup.visible = false; root.add(labelGroup);
var DECK = { esp32: 'back', battery: 'back', tp4056: 'back', pn532: 'back', nrf24: 'back', cc1101: 'back', gps: 'back',
  gps_ant: 'back', ir_tx: 'back', ir_rx: 'back', sdcard: 'back', 'switch': 'back', breadboard: 'mid', display: 'front', joystick: 'front' };
var EXPLODE = { back: 0, mid: 46, front: 104 };
APP.buildScene = function () {
  APP.wireBays = new T.Group();
  (DATA.wire_bays || []).forEach(function (bay) {
    var q = bay.b;
    var mesh = new T.Mesh(new T.BoxGeometry(q[3]-q[0], q[4]-q[1], q[5]-q[2]),
      new T.MeshBasicMaterial({color: 0x39c7b7, transparent: true, opacity: 0.18, depthWrite: false}));
    mesh.position.set((q[0]+q[3])/2, (q[1]+q[4])/2, (q[2]+q[5])/2);
    APP.wireBays.add(mesh);
  });
  APP.wireBays.visible = false;
  partsGroup.add(APP.wireBays);
  DATA.parts.forEach(function (p) {
    var holder = new T.Group(), inner = new T.Group(), R = p.R;
    inner.matrixAutoUpdate = false;
    inner.matrix.set(R[0][0], R[0][1], R[0][2], p.at[0], R[1][0], R[1][1], R[1][2], p.at[1], R[2][0], R[2][1], R[2][2], p.at[2], 0, 0, 0, 1);
    var spec = DATA.specs[p.spec];
    try { (APP.builders[p.spec] || APP.builders._generic)(inner, spec, p); }
    catch (e) { console.error('builder', p.id, e); APP.builders._generic(inner, spec, p); }
    holder.add(inner);
    var b = p.bbox;
    var hit = new T.Mesh(new T.BoxGeometry(b[3] - b[0], b[4] - b[1], b[5] - b[2]), new T.MeshBasicMaterial({ visible: false }));
    hit.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); hit.userData.part = p; holder.add(hit);
    var sel = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(b[3] - b[0] + 0.8, b[4] - b[1] + 0.8, b[5] - b[2] + 0.8)),
      new T.LineBasicMaterial({ color: tok('--sel') }));
    sel.position.copy(hit.position); sel.visible = false; holder.add(sel);
    var kg = new T.Group();
    (p.keepouts || []).forEach(function (k) {
      var q = k.b, isD = k.k === 'dupont';
      var km = new T.Mesh(new T.BoxGeometry(q[3] - q[0], q[4] - q[1], q[5] - q[2]),
        new T.MeshBasicMaterial({ color: isD ? tok('--dim') : tok('--accent'), transparent: true, opacity: isD ? 0.2 : 0.1, depthWrite: false }));
      km.position.set((q[0] + q[3]) / 2, (q[1] + q[4]) / 2, (q[2] + q[5]) / 2); kg.add(km);
    });
    kg.visible = false; holder.add(kg);
    holder.userData = { part: p, deck: DECK[p.id] || 'back', hit: hit, sel: sel, keep: kg, inner: inner };
    partsGroup.add(holder); APP.partObjs.push(holder);
    var lab = APP.label(p.name, 0.9); lab.userData.anchor = new T.Vector3((b[0] + b[3]) / 2, b[4] + 3, (b[2] + b[5]) / 2);
    lab.userData.holder = holder; labelGroup.add(lab);
  });
};

/* ---------- sprites for labels and dimensions ---------- */
APP.label = function (text, scale, color, bg) {
  var fs = 44, pad = 12, cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  ctx.font = '600 ' + fs + 'px "IBM Plex Mono", monospace';
  var w = Math.ceil(ctx.measureText(text).width) + pad * 2; cv.width = w; cv.height = fs + pad * 2;
  ctx.font = '600 ' + fs + 'px "IBM Plex Mono", monospace';
  ctx.fillStyle = bg || 'rgba(12,17,18,.86)';
  var r = 10; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, cv.height, r); ctx.arcTo(w, cv.height, 0, cv.height, r);
  ctx.arcTo(0, cv.height, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
  ctx.fillStyle = color || '#EAF1EE'; ctx.textBaseline = 'middle'; ctx.fillText(text, pad, cv.height / 2 + 2);
  var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  var sp = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  var k = (scale || 1) * 0.085; sp.scale.set(cv.width * k, cv.height * k, 1); sp.renderOrder = 20; return sp;
};

var dimGroup = new T.Group(); root.add(dimGroup);
function dimLine(a, b, off, text) {
  var col = tok('--dim'), g = new T.Group(), m = new T.LineBasicMaterial({ color: col, depthTest: false, transparent: true });
  var A = a.clone().add(off), Bp = b.clone().add(off);
  var pts = [a, A, b, Bp, A, Bp];
  var geo = new T.BufferGeometry().setFromPoints(pts);
  var ln = new T.LineSegments(geo, m); ln.renderOrder = 15; g.add(ln);
  var dir = Bp.clone().sub(A).normalize(), cone = new T.ConeGeometry(0.9, 3.2, 12), cm = new T.MeshBasicMaterial({ color: col, depthTest: false });
  [[A, dir.clone().negate()], [Bp, dir]].forEach(function (e) {
    var c = new T.Mesh(cone, cm); c.position.copy(e[0]).addScaledVector(e[1], -1.6);
    c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), e[1]); c.renderOrder = 16; g.add(c);
  });
  var lab = APP.label(text, 1.05, '#1b1204', col); lab.position.copy(A).add(Bp).multiplyScalar(0.5); g.add(lab);
  return g;
}
APP.buildDims = function () {
  while (dimGroup.children.length) dimGroup.remove(dimGroup.children[0]);
  var V = function (x, y, z) { return new T.Vector3(x, y, z); }, f = DATA.features, O = OUT, F = APP.fmt;
  dimGroup.add(dimLine(V(O.x0, O.y0, O.z1), V(O.x1, O.y0, O.z1), V(0, -12, 0), F(O.x1 - O.x0) + ' mm'));
  dimGroup.add(dimLine(V(O.x0, O.y0, O.z1), V(O.x0, O.y1, O.z1), V(-12, 0, 0), F(O.y1 - O.y0) + ' mm'));
  dimGroup.add(dimLine(V(O.x1, O.y0, O.z0), V(O.x1, O.y0, O.z1), V(12, -12, 0), F(O.z1 - O.z0) + ' mm'));
  var w = f.window;
  dimGroup.add(dimLine(V(w.x0, w.y1, O.z1), V(w.x1, w.y1, O.z1), V(0, 8, 0), 'window ' + F(w.x1 - w.x0) + ' × ' + F(w.y1 - w.y0)));
  var j = f.joy_hole;
  dimGroup.add(dimLine(V(j.x - j.d / 2, j.y, O.z1), V(j.x + j.d / 2, j.y, O.z1), V(0, 0, 6), 'Ø' + F(j.d)));
};

/* ---------- camera ---------- */
var cam = { theta: 0.62, phi: 1.12, r: 330, tar: new T.Vector3(), goal: null };
APP.cam = cam;
var VIEWS = { iso: [0.62, 1.12], front: [0, Math.PI / 2], back: [Math.PI, Math.PI / 2], top: [0, 0.02],
  bottom: [0, Math.PI - 0.02], right: [Math.PI / 2, Math.PI / 2], left: [-Math.PI / 2, Math.PI / 2] };
var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
APP.view = function (name, r, tar) {
  var v = VIEWS[name] || VIEWS.iso, th = v[0];
  while (th - cam.theta > Math.PI) th -= 2 * Math.PI; while (cam.theta - th > Math.PI) th += 2 * Math.PI;
  APP.setOrtho(name !== 'iso');
  cam.goal = { theta: th, phi: v[1], r: r || fitR(), tar: tar ? tar.clone() : new T.Vector3() };
  if (reduced) { Object.assign(cam, { theta: cam.goal.theta, phi: cam.goal.phi, r: cam.goal.r }); cam.tar.copy(cam.goal.tar); cam.goal = null; }
};
function fitR() {
  var span = Math.max(OUT.x1 - OUT.x0, OUT.y1 - OUT.y0) * (APP.mode === 'exp' ? 1.9 : 1.25);
  var asp = Math.max(0.5, Math.min(2, canvas.clientWidth / Math.max(1, canvas.clientHeight)));
  return span / Math.tan(camera.fov * Math.PI / 360) / Math.min(1.25, 0.55 + asp * 0.6);
}
APP.fitR = fitR;
function applyCam() {
  var sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
  camera.position.set(cam.tar.x + cam.r * sp * Math.sin(cam.theta), cam.tar.y + cam.r * cp, cam.tar.z + cam.r * sp * Math.cos(cam.theta));
  camera.lookAt(cam.tar);
  var halfH = cam.r * Math.tan(camera.fov * Math.PI / 360), asp = camera.aspect || 1;
  ortho.left = -halfH * asp; ortho.right = halfH * asp; ortho.top = halfH; ortho.bottom = -halfH;
  ortho.position.copy(camera.position); ortho.up.copy(camera.up); ortho.lookAt(cam.tar); ortho.updateProjectionMatrix();
}
var drag = null, lx = 0, ly = 0, down = null, pinch = null, pointers = {};
canvas.addEventListener('pointerdown', function (e) {
  pointers[e.pointerId] = [e.clientX, e.clientY];
  var ids = Object.keys(pointers);
  if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; }
  else { drag = (e.button === 2 || e.shiftKey) ? 'pan' : 'rot'; }
  lx = e.clientX; ly = e.clientY; down = [e.clientX, e.clientY]; cam.goal = null;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
canvas.addEventListener('pointermove', function (e) {
  if (pointers[e.pointerId]) pointers[e.pointerId] = [e.clientX, e.clientY];
  var ids = Object.keys(pointers);
  if (pinch && ids.length === 2) {
    var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    cam.r = Math.max(40, Math.min(1400, cam.r * pinch / Math.max(1, d))); pinch = d; return;
  }
  if (!drag) return;
  var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
  if (drag === 'rot') { cam.theta -= dx * 0.008; cam.phi = Math.max(0.02, Math.min(Math.PI - 0.02, cam.phi - dy * 0.008)); }
  else {
    var k = cam.r * 0.0017, right = new T.Vector3().subVectors(camera.position, cam.tar);
    var rv = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), right).normalize(), uv = new T.Vector3().crossVectors(right, rv).normalize();
    cam.tar.addScaledVector(rv, -dx * k); cam.tar.addScaledVector(uv, dy * k);
  }
});
function up(e) {
  delete pointers[e.pointerId]; if (Object.keys(pointers).length < 2) pinch = null;
  if (down && Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) < 6 && e.type === 'pointerup') pick(e);
  drag = null; down = null;
}
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.goal = null;
  cam.r = Math.max(40, Math.min(1400, cam.r * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });

var ray = new T.Raycaster(), ndc = new T.Vector2();
function pick(e) {
  var r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cur());
  var hits = ray.intersectObjects(APP.partObjs.filter(function (h) { return h.visible; }).map(function (h) { return h.userData.hit; }));
  hits.sort(function (a, b) { return vol(a.object) - vol(b.object) || a.distance - b.distance; });
  if (hits.length) APP.select(hits[0].object.userData.part.id, false);
  else APP.select(null);
}
function vol(o) { var p = o.geometry.parameters; return p.width * p.height * p.depth > 20000 ? 1 : 0; }

/* ---------- modes ---------- */
APP.mode = 'asm';
APP.opts = { ghost: true, dims: true, keep: false, ant: true, labels: false };
APP.setMode = function (m) {
  APP.mode = m;
  var showParts = m !== 'shell', showShell = m !== 'parts';
  partsGroup.visible = showParts; shellGroup.visible = showShell;
  APP.partObjs.forEach(function (h) { h.userData.goal = new T.Vector3(0, 0, m === 'exp' ? EXPLODE[h.userData.deck] : 0); });
  if (APP.shell.front) APP.shell.front.group.userData.goal = new T.Vector3(0, 0, m === 'exp' ? 150 : 0);
  if (APP.shell.tub) APP.shell.tub.group.userData.goal = new T.Vector3(0, 0, 0);
  APP.applyGhost();
  dimGroup.visible = APP.opts.dims && m !== 'exp';
  APP.view(m === 'exp' ? 'right' : (m === 'shell' ? 'iso' : APP.lastView || 'iso'));
  if (m === 'exp') { cam.goal.theta = 1.05; cam.goal.phi = 1.25; APP.setOrtho(false); }
};
APP.applyGhost = function () {
  // "See-through case" applies in every mode; with the parts hidden the shell
  // gets a bit more body and crisper edges so its internal mounts stay readable.
  var ghost = APP.opts.ghost, alone = APP.mode === 'shell';
  ['tub', 'front'].forEach(function (k) {
    var s = APP.shell[k]; if (!s) return;
    s.mesh.material.transparent = ghost; s.mesh.material.opacity = ghost ? (alone ? 0.3 : 0.2) : 1;
    s.mesh.material.depthWrite = !ghost; s.mesh.material.needsUpdate = true;
    s.edges.material.opacity = ghost ? (alone ? 0.95 : 0.55) : 0.35;
  });
};
APP.setOpt = function (k, v) {
  APP.opts[k] = v;
  if (k === 'ghost') APP.applyGhost();
  if (k === 'dims') dimGroup.visible = v && APP.mode !== 'exp';
  if (k === 'keep') APP.partObjs.forEach(function (h) { h.userData.keep.visible = v; });
  if (k === 'keep' && APP.wireBays) APP.wireBays.visible = v;
  if (k === 'labels') labelGroup.visible = v;
  if (k === 'ant') APP.partObjs.forEach(function (h) { h.traverse(function (o) { if (o.userData.antenna) o.visible = v; }); });
};
APP.setCut = function (pct) {
  if (pct >= 100) { cutPlane.constant = 1e6; return null; }
  var x = OUT.x0 + (OUT.x1 - OUT.x0) * pct / 100; cutPlane.constant = x - CENTER.x; return x - OUT.x0;
};

/* ---------- selection ---------- */
APP.selected = null;
APP.select = function (id, focus) {
  APP.selected = id;
  APP.partObjs.forEach(function (h) { h.userData.sel.visible = h.userData.part.id === id; });
  if (APP.onSelect) APP.onSelect(id);
  if (focus && id) {
    var h = APP.partObjs.find(function (x) { return x.userData.part.id === id; }), b = h.userData.part.bbox;
    var c = new T.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2).sub(CENTER).add(h.position);
    cam.goal = { theta: cam.theta, phi: cam.phi, r: Math.max(90, Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]) * 3.4), tar: c };
  }
};

/* ---------- theme ---------- */
APP.retheme = function () {
  ['tub', 'front'].forEach(function (k) { var s = APP.shell[k]; if (!s) return;
    s.mesh.material.color.set(tok('--shell')); s.edges.material.color.set(tok('--shell-edge')); });
  APP.partObjs.forEach(function (h) { h.userData.sel.material.color.set(tok('--sel')); });
  APP.buildDims(); dimGroup.visible = APP.opts.dims && APP.mode !== 'exp';
  if (APP.onTheme) APP.onTheme();
};
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { APP.retheme(); });
new MutationObserver(function () { APP.retheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- loop ---------- */
function resize() {
  var w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
var clock = new T.Clock();
APP.start = function () {
  resize(); cam.r = fitR(); applyCam();
  (function tick() {
    var dt = Math.min(clock.getDelta(), 0.05), k = reduced ? 1 : 1 - Math.pow(0.0015, dt);
    if (cam.goal) {
      cam.theta += (cam.goal.theta - cam.theta) * k; cam.phi += (cam.goal.phi - cam.phi) * k; cam.r += (cam.goal.r - cam.r) * k;
      cam.tar.lerp(cam.goal.tar, k);
      if (Math.abs(cam.goal.theta - cam.theta) + Math.abs(cam.goal.phi - cam.phi) < 1e-3 && Math.abs(cam.goal.r - cam.r) < 0.2) cam.goal = null;
    }
    APP.partObjs.forEach(function (h) { if (h.userData.goal) h.position.lerp(h.userData.goal, k); });
    ['tub', 'front'].forEach(function (s) { var g = APP.shell[s] && APP.shell[s].group; if (g && g.userData.goal) g.position.lerp(g.userData.goal, k); });
    labelGroup.children.forEach(function (l) { l.position.copy(l.userData.anchor).add(l.userData.holder.position); });
    applyCam(); renderer.render(scene, cur());
    requestAnimationFrame(tick);
  })();
};
})();
