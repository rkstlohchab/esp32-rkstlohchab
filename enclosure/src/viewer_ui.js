/* Enclosure Studio - panels, dimensioned drawings, downloads, boot. */
(function () {
'use strict';
var APP = window.APP; if (!APP || APP.dead) return;
var DATA = APP.DATA, O = APP.OUT, F = APP.fmt, f = DATA.features, cav = DATA.cavity, walls = DATA.walls;
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var OW = O.x1 - O.x0, OH = O.y1 - O.y0, OD = O.z1 - O.z0;
var X = function (x) { return x - O.x0; }, Y = function (y) { return y - O.y0; }, Z = function (z) { return z - O.z0; };
var CATC = { core: '#39C7B7', ui: '#F0A93B', radio: '#7C9CFF', sense: '#C69CF0', power: '#FF7C6B', wire: '#8AA0AE' };
var DECKS = [['back', 'Back deck', 'on the back cover'], ['mid', 'Middle deck', 'breadboard + jumper zone'], ['front', 'Front deck', 'on the front plate']];
var DECK_OF = { breadboard: 'mid', display: 'front', joystick: 'front' };
var SRC = {
  DRAWING: ['drawing', 'From a dimension drawing'], 'DRAWING+PHOTO': ['drawing', 'Drawing + photo'],
  LISTING: ['', 'Seller listing'], 'LISTING+EST': ['est', 'Listing; stick position estimated'], 'LISTING+DATASHEET': ['', 'Listing + datasheet'],
  PHOTO: ['', 'Scaled from a photo'], EST: ['est', 'Estimated, measure yours'], DIY: ['', 'DIY part']
};

$('outer').textContent = F(OW) + ' × ' + F(OH) + ' × ' + F(OD) + ' mm';
$('sub').textContent = 'ESP32-S3 handheld · portrait · ' + DATA.parts.length + ' parts · W ' + F(OW) + ' × H ' + F(OH) + ' × D ' + F(OD) + ' mm';

/* ---------------- tabs ---------------- */
var tabs = [['tabPart', 'pPart'], ['tabDraw', 'pDraw'], ['tabPrint', 'pPrint'], ['tabList', 'pList']];
function showTab(id) {
  tabs.forEach(function (t) { var on = t[0] === id; $(t[0]).setAttribute('aria-selected', on); $(t[1]).hidden = !on; });
  try { localStorage.setItem('encl-tab', id); } catch (e) {}
}
tabs.forEach(function (t) { $(t[0]).addEventListener('click', function () { showTab(t[0]); }); });

/* ---------------- header controls ---------------- */
[['mAsm', 'asm'], ['mExp', 'exp'], ['mParts', 'parts'], ['mShell', 'shell']].forEach(function (m) {
  $(m[0]).addEventListener('click', function () {
    ['mAsm', 'mExp', 'mParts', 'mShell'].forEach(function (b) { $(b).setAttribute('aria-pressed', b === m[0]); });
    APP.setMode(m[1]);
  });
});
[['tGhost', 'ghost'], ['tDims', 'dims'], ['tKeep', 'keep'], ['tAnt', 'ant'], ['tLabels', 'labels']].forEach(function (t) {
  var b = $(t[0]);
  b.addEventListener('click', function () { var v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); APP.setOpt(t[1], v); });
});
APP.onOrtho = function (v) { $('tOrtho').setAttribute('aria-pressed', v); };
$('tOrtho').addEventListener('click', function () { APP.setOrtho($('tOrtho').getAttribute('aria-pressed') !== 'true'); });
document.querySelectorAll('[data-view]').forEach(function (b) {
  b.addEventListener('click', function () { APP.lastView = b.dataset.view; APP.view(b.dataset.view); });
});
$('cutX').addEventListener('input', function (e) {
  var v = APP.setCut(+e.target.value);
  $('cutOut').textContent = v == null ? 'off' : F(v) + ' mm';
});

/* ---------------- part panel ---------------- */
function partDims(p) {
  var s = DATA.specs[p.spec], b = p.bbox;
  return { L: s.L, W: s.W, H: b ? Math.min(b[3] - b[0], b[4] - b[1], b[5] - b[2]) : s.t };
}
function pinTable(p) {
  var s = DATA.specs[p.spec], rows = [];
  var sw = function (c) { return '<span class="swatch" style="background:' + (APP.WC[c] || c) + '"></span>'; };
  if (p.id === 'esp32') {
    var all = s.row_y26.concat(s.row_y1), seen = {};
    all.forEach(function (lab) {
      var u = APP.ESP_USE[lab]; if (!u || seen[lab]) return; seen[lab] = 1;
      rows.push('<tr><td class="n">' + (/^\d+$/.test(lab) ? 'GPIO' + lab : lab) + '</td><td>' + sw(u[1]) + esc(u[0]) + '</td></tr>');
    });
    return '<h3>Wired pins (Dupont plugs shown)</h3><table><thead><tr><th>Pin</th><th>Goes to</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' +
      '<p class="note">PN532 SPI: SCK12, MOSI11, MISO42, SS2. Display on 15/47/48, CS39. Colors are suggested labels, not a record of installed wire colors.</p>';
  }
  var list = s.hdr_labels || s.pin_labels || s.spi_labels || s.i2c_labels;
  if (!list) return '';
  var flat = Array.isArray(list[0]) ? list[0].map(function (a, i) { return a + ' / ' + list[1][i]; }) : list;
  return '<h3>Pins</h3><p class="small">' + flat.map(esc).join(' · ') + '</p>';
}
APP.onSelect = function (id) {
  document.querySelectorAll('.prow').forEach(function (r) { r.setAttribute('aria-pressed', r.dataset.id === id); });
  var el = $('pPart');
  if (!id) { el.innerHTML = overview(); return; }
  var p = DATA.parts.find(function (q) { return q.id === id; }), s = DATA.specs[p.spec], src = SRC[s.src] || ['', s.src];
  var d = partDims(p), b = p.bbox;
  var wiring = p.id === 'esp32' ? 'Dupont plugs on the pins' : p.wiring === 'solder' ? 'Wires soldered to the pins'
    : (p.keepouts && p.keepouts.length ? 'Dupont plugs' : 'No header');
  el.innerHTML = '<h2>' + esc(p.name) + '</h2>' +
    '<div class="chips"><span class="chip ' + src[0] + '">' + esc(src[1]) + '</span><span class="chip wire">' + wiring + '</span>' +
    '<span class="chip">' + (DECKS.find(function (x) { return x[0] === (DECK_OF[p.id] || 'back'); })[1]) + '</span></div>' +
    '<div class="dims"><div><b>' + F(d.L) + '</b><span>length</span></div><div><b>' + F(d.W) + '</b><span>width</span></div><div><b>' + F(d.H) + '</b><span>height</span></div></div>' +
    '<p>' + esc(p.note) + '</p>' +
    '<h3>Position in the case</h3><dl class="kv">' +
    '<dt>From left outer edge</dt><dd>' + F(X(b[0])) + ' – ' + F(X(b[3])) + ' mm</dd>' +
    '<dt>From bottom outer edge</dt><dd>' + F(Y(b[1])) + ' – ' + F(Y(b[4])) + ' mm</dd>' +
    '<dt>From back outer face</dt><dd>' + F(Z(b[2])) + ' – ' + F(Z(b[5])) + ' mm</dd></dl>' +
    pinTable(p) + '<p class="foot">Box sizes include connectors and plugs; the model draws each part from its spec.</p>';
};
function overview() {
  return '<h2>Portrait case, three decks</h2><p class="muted small">Click any part in the 3D view or the Parts tab for its size, pins and position.</p>' +
    '<div class="dims"><div><b>' + F(OW) + '</b><span>width</span></div><div><b>' + F(OH) + '</b><span>height</span></div><div><b>' + F(OD) + '</b><span>depth</span></div></div>' +
    '<h3>Stack, back to front</h3><dl class="kv">' +
    '<dt>Back cover</dt><dd>' + F(walls.back) + ' mm</dd><dt>Back deck</dt><dd>' + F(DATA.parts.find(function (p) { return p.id === 'breadboard'; }).at[2]) + ' mm</dd>' +
    '<dt>Breadboard</dt><dd>8.5 mm</dd><dt>Plug + bend allowance</dt><dd>24 mm</dd><dt>Loose wire space</dt><dd>' + F(DATA.wire_budget.reserved_cm3) + ' cm³</dd><dt>Battery pocket</dt><dd>' + F(f.battery_pocket.clear_length) + ' mm long (+4 mm)</dd></dl>' +
    '<h3>What goes where</h3><ul class="small">' +
    '<li><b>Front:</b> 2.8" touch screen (header at the bottom), joystick below it.</li>' +
    '<li><b>Top wall:</b> NRF24 and CC1101 antennas, IR LED, IR receiver window. GPS patch sits under it.</li>' +
    '<li><b>Bottom wall:</b> ESP32 USB-C ×2, charge USB-C, microSD slot.</li>' +
    '<li><b>Right side:</b> power switch. The display SD socket is internal; use the bottom microSD reader.</li>' +
    '<li><b>Back:</b> NFC tap ring and BOOT / RST pinholes.</li></ul>' +
    '<h3>Wire space</h3><p class="small">All header modules allow 14 mm Dupont housings plus 10 mm bend space. Design budget: 60 single 20 cm wires plus five 40 cm wires, up to 2 mm insulation diameter. Enable Clearances to see teal service-loop bays. Keep loops loose and out of the screen and joystick mounts.</p>' +
    '<p class="note warn">Joystick stick height and hole positions are estimates from the listing. Measure yours before printing the front plate.</p>';
}

/* ---------------- parts list ---------------- */
function renderList() {
  var html = '';
  DECKS.forEach(function (d) {
    html += '<div class="grp">' + d[1] + ' · ' + d[2] + '</div><div class="plist">';
    DATA.parts.filter(function (p) { return (DECK_OF[p.id] || 'back') === d[0]; }).forEach(function (p) {
      var s = DATA.specs[p.spec];
      html += '<button class="prow" data-id="' + p.id + '" aria-pressed="false"><span class="swatch" style="background:' + CATC[p.cat] + '"></span>' +
        '<span class="nm">' + esc(p.name) + '<small>' + (p.wiring === 'solder' ? 'soldered wires' : p.id === 'esp32' ? 'Dupont hub' : (p.keepouts.length ? 'Dupont plugs' : '—')) + '</small></span>' +
        '<span class="mm">' + F(s.L) + ' × ' + F(s.W) + '</span></button>';
    });
    html += '</div>';
  });
  $('pList').innerHTML = html + '<p class="foot">Sizes are the PCB (length × width) in mm.</p>';
  document.querySelectorAll('.prow').forEach(function (r) {
    r.addEventListener('click', function () { APP.select(r.dataset.id, true); showTab('tabPart'); });
  });
}

/* ---------------- dimensioned drawings (SVG, mm) ---------------- */
function Svg(w, h, pad) {
  this.w = w; this.h = h; this.p = pad || 16; this.el = [];
}
Svg.prototype.Y = function (y) { return this.h - y; };
Svg.prototype.add = function (s) { this.el.push(s); return this; };
Svg.prototype.rect = function (x0, y0, x1, y1, r, cls) {
  return this.add('<rect x="' + x0 + '" y="' + this.Y(y1) + '" width="' + (x1 - x0) + '" height="' + (y1 - y0) + '" rx="' + (r || 0) + '" class="' + cls + '"/>');
};
Svg.prototype.circle = function (x, y, r, cls) { return this.add('<circle cx="' + x + '" cy="' + this.Y(y) + '" r="' + r + '" class="' + cls + '"/>'); };
Svg.prototype.line = function (x0, y0, x1, y1, cls) { return this.add('<line x1="' + x0 + '" y1="' + this.Y(y0) + '" x2="' + x1 + '" y2="' + this.Y(y1) + '" class="' + cls + '"/>'); };
Svg.prototype.text = function (x, y, s, cls, rot) {
  return this.add('<text x="' + x + '" y="' + this.Y(y) + '" class="' + (cls || 'dt') + '"' + (rot ? ' transform="rotate(-90 ' + x + ' ' + this.Y(y) + ')"' : '') + '>' + esc(s) + '</text>');
};
/* linear dimension between two points along x (dir 'h') or y (dir 'v'), drawn at offset `at` */
Svg.prototype.dim = function (a, b, at, dir, label, from) {
  var t = label || F(Math.abs(b - a)), e = 1.2;
  if (dir === 'h') {
    var fy = from == null ? at : from;
    this.line(a, fy, a, at + (at > fy ? e : -e), 'ex'); this.line(b, fy, b, at + (at > fy ? e : -e), 'ex');
    this.add('<line x1="' + a + '" y1="' + this.Y(at) + '" x2="' + b + '" y2="' + this.Y(at) + '" class="dl" marker-start="url(#ar)" marker-end="url(#ar)"/>');
    this.text((a + b) / 2, at + 1.1, t, 'dt mid');
  } else {
    var fx = from == null ? at : from;
    this.line(fx, a, at + (at > fx ? e : -e), a, 'ex'); this.line(fx, b, at + (at > fx ? e : -e), b, 'ex');
    this.add('<line x1="' + at + '" y1="' + this.Y(a) + '" x2="' + at + '" y2="' + this.Y(b) + '" class="dl" marker-start="url(#ar)" marker-end="url(#ar)"/>');
    this.text(at - 1.1, (a + b) / 2, t, 'dt mid', true);
  }
  return this;
};
Svg.prototype.toString = function () {
  var p = this.p;
  return '<svg viewBox="' + (-p) + ' ' + (-p) + ' ' + (this.w + 2 * p) + ' ' + (this.h + 2 * p) + '" xmlns="http://www.w3.org/2000/svg" role="img">' +
    '<defs><marker id="ar" viewBox="0 0 6 6" refX="5.4" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M0,0.6 L6,3 L0,5.4 z" class="am"/></marker></defs>' +
    '<style>.o{fill:var(--panel);stroke:var(--ink);stroke-width:.35}.o2{fill:none;stroke:var(--ink);stroke-width:.3}' +
    '.h{fill:var(--ground);stroke:var(--ink);stroke-width:.3}.hd{fill:none;stroke:var(--muted);stroke-width:.22;stroke-dasharray:1 .7}' +
    '.ex{stroke:var(--dim);stroke-width:.14}.dl{stroke:var(--dim);stroke-width:.2}.am{fill:var(--dim)}' +
    '.dt{fill:var(--dim);font:500 2.3px "IBM Plex Mono",monospace}.mid{text-anchor:middle}.lb{fill:var(--muted);font:500 2.2px "IBM Plex Sans",sans-serif}' +
    '.ct{stroke:var(--faint);stroke-width:.12;stroke-dasharray:2 .6 .4 .6}.band{fill:var(--panel-2);stroke:var(--rule-2);stroke-width:.2}' +
    '.bt{fill:var(--ink);font:500 2.3px "IBM Plex Sans",sans-serif}</style>' + this.el.join('') + '</svg>';
};
function centre(s, x, y, r) { s.line(x - r - 1.5, y, x + r + 1.5, y, 'ct'); s.line(x, y - r - 1.5, x, y + r + 1.5, 'ct'); }
function stadium(s, cx, cy, w, h, cls) { s.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, Math.min(w, h) / 2, cls); }

function drawFront() {
  var s = new Svg(OW, OH, 22), w = f.window, j = f.joy_hole;
  s.rect(0, 0, OW, OH, DATA.radii.outer, 'o');
  s.rect(X(w.x0) - 1, Y(w.y0) - 1, X(w.x1) + 1, Y(w.y1) + 1, 2, 'hd');
  s.rect(X(w.x0), Y(w.y0), X(w.x1), Y(w.y1), 1, 'h');
  s.circle(X(j.x), Y(j.y), j.d / 2, 'h'); s.circle(X(j.x), Y(j.y), j.d / 2 + 1.2, 'hd'); centre(s, X(j.x), Y(j.y), j.d / 2);
  DATA.lugs.forEach(function (l) { s.circle(X(l[0]), Y(l[1]), 1.45, 'h'); s.circle(X(l[0]), Y(l[1]), 2.85, 'hd'); });
  s.dim(0, OW, -8, 'h', F(OW), 0); s.dim(0, OH, -8, 'v', F(OH), 0);
  s.dim(0, X(w.x0), Y(w.y1) + 6, 'h', F(X(w.x0)), Y(w.y1)); s.dim(X(w.x0), X(w.x1), Y(w.y1) + 6, 'h', F(w.x1 - w.x0), Y(w.y1));
  s.dim(Y(w.y0), Y(w.y1), OW + 7, 'v', F(w.y1 - w.y0), X(w.x1)); s.dim(0, Y(w.y0), OW + 7, 'v', F(Y(w.y0)), X(w.x1));
  s.dim(0, X(j.x), Y(j.y) - j.d / 2 - 5, 'h', F(X(j.x)), Y(j.y)); s.dim(0, Y(j.y), OW + 14, 'v', F(Y(j.y)), X(j.x));
  s.text(X(j.x) + j.d / 2 + 1.5, Y(j.y) + j.d / 2 - 1, 'Ø' + F(j.d) + ' + 1.2 chamfer', 'dt');
  var l0 = DATA.lugs[0], l3 = DATA.lugs[3];
  s.dim(X(l0[0]), X(l3[0]), OH + 7, 'h', F(l3[0] - l0[0]) + ' screws', OH - 3); s.dim(Y(l0[1]), Y(l3[1]), -15, 'v', F(l3[1] - l0[1]), 3);
  s.text(X((w.x0 + w.x1) / 2), Y((w.y0 + w.y1) / 2), 'display window', 'lb mid');
  s.text(X((w.x0 + w.x1) / 2), Y((w.y0 + w.y1) / 2) - 3, '(visible area)', 'lb mid');
  return fig('Front plate, seen from the front', 'window, joystick, 4 × M2.5 countersunk', s);
}
function drawLeft() {
  var s = new Svg(OD, OH, 22), mz = function (z) { return OD - Z(z); };
  s.rect(0, 0, OD, OH, 1.5, 'o'); s.line(mz(cav.D), 0, mz(cav.D), OH, 'o2');
  s.dim(0, OD, -8, 'h', F(OD), 0); s.dim(0, OH, -8, 'v', F(OH), 0);
  s.text(1, OH - 4, 'front', 'lb'); s.text(OD - 7, OH - 4, 'back', 'lb');
  return fig('Left side', 'closed wall; microSD access is on the bottom', s);
}
function drawBack() {
  var s = new Svg(OW, OH, 22), n = f.nfc, mx = function (x) { return OW - X(x); };
  s.rect(0, 0, OW, OH, DATA.radii.outer, 'o');
  s.rect(mx(n.x1 - 2), Y(n.y0 + 2), mx(n.x0 + 2), Y(n.y1 - 2), 4, 'o2'); s.rect(mx(n.x1 - 3.2), Y(n.y0 + 3.2), mx(n.x0 + 3.2), Y(n.y1 - 3.2), 3, 'o2');
  s.text(mx((n.x0 + n.x1) / 2), Y((n.y0 + n.y1) / 2), 'NFC: tap cards here', 'lb mid');
  f.buttons.forEach(function (b) { s.circle(mx(b.x), Y(b.y), 1.1, 'h'); s.circle(mx(b.x), Y(b.y), 2.0, 'hd'); s.text(mx(b.x) - 3.4, Y(b.y) - 0.8, b.name, 'lb'); });
  var b0 = f.buttons[0], b1 = f.buttons[1];
  s.dim(0, mx(b0.x), Y(b1.y) - 6, 'h', F(mx(b0.x)), Y(b1.y));
  s.dim(0, Y(b1.y), -8, 'v', F(Y(b1.y)), mx(b1.x)); s.dim(0, Y(b0.y), -15, 'v', F(Y(b0.y)), mx(b0.x));
  s.dim(0, OW, -8, 'h', F(OW), 0);
  s.dim(Y(n.y0 + 2), Y(n.y1 - 2), OW + 7, 'v', F(n.y1 - n.y0 - 4), mx(n.x0 + 2));
  s.dim(mx(n.x1 - 2), mx(n.x0 + 2), OH + 6, 'h', F(n.x1 - n.x0 - 4), Y(n.y1 - 2));
  return fig('Back cover, seen from behind', 'BOOT / RST pinholes Ø2.2 (press with a SIM tool), NFC ring 0.4 deep', s);
}
function drawBottom() {
  var s = new Svg(OW, OD, 22), u = f.usb_esp, t = f.usb_tp, sd = f.sd, split = Z(cav.D);
  s.rect(0, 0, OW, OD, 1.5, 'o'); s.line(0, split, OW, split, 'o2');
  s.text(1.5, OD + 1.6, 'front plate ↑ (screen side)', 'lb');
  u.forEach(function (q) { stadium(s, X(q.x), Z(q.z), 9.6, 3.9, 'h'); });
  var ux = u.map(function (q) { return X(q.x); });
  stadium(s, (Math.min.apply(0, ux) + Math.max.apply(0, ux)) / 2, Z(u[0].z), Math.max.apply(0, ux) - Math.min.apply(0, ux) + 12.6, 7, 'hd');
  stadium(s, X(t.x), Z(t.z), 3.9, 9.6, 'h'); stadium(s, X(t.x), Z(t.z), 7, 12.6, 'hd');
  s.rect(X(sd.x) - sd.w / 2, Z(sd.z) - sd.h / 2, X(sd.x) + sd.w / 2, Z(sd.z) + sd.h / 2, 0.3, 'h');
  s.dim(0, OW, -8, 'h', F(OW), 0); s.dim(0, OD, -8, 'v', F(OD), 0);
  u.forEach(function (q, i) { s.dim(0, X(q.x), -14 - i * 6, 'h', F(X(q.x)), Z(q.z)); });
  s.dim(0, X(t.x), OD + 6, 'h', F(X(t.x)), Z(t.z) + 4.8); s.dim(0, X(sd.x), OD + 12, 'h', F(X(sd.x)), Z(sd.z));
  s.dim(0, Z(u[0].z), OW + 6, 'v', F(Z(u[0].z)), X(u[1].x) + 4.8); s.dim(0, Z(t.z), OW + 12, 'v', F(Z(t.z)), X(t.x) + 2);
  s.dim(0, Z(sd.z), OW + 18, 'v', F(Z(sd.z)), X(sd.x) + sd.w / 2);
  s.text(X(u[1].x), Z(u[1].z) - 5.5, 'COM', 'lb mid'); s.text(X(u[0].x), Z(u[0].z) - 5.5, 'USB', 'lb mid');
  s.text(X(t.x) + 4.5, Z(t.z), 'charge', 'lb'); s.text(X(sd.x), Z(sd.z) + 2.6, 'microSD', 'lb mid');
  return fig('Bottom wall, seen from below', 'USB-C 9.6 × 3.9 through, 1.4 deep plug pocket (dashed); SD slot ' + sd.w + ' × ' + sd.h, s);
}
function drawTop() {
  var s = new Svg(OW, OD, 22), split = Z(cav.D);
  s.rect(0, 0, OW, OD, 1.5, 'o'); s.line(0, split, OW, split, 'o2');
  s.text(1.5, OD + 1.6, 'front plate ↑ (screen side)', 'lb');
  var items = [[f.sma_nrf, 'NRF24 SMA'], [f.sma_cc, 'CC1101 SMA'], [f.ir_tx, 'IR LED'], [f.ir_rx, 'IR receiver']];
  items.forEach(function (it, i) {
    var q = it[0]; s.circle(X(q.x), Z(q.z), q.d / 2, 'h'); centre(s, X(q.x), Z(q.z), q.d / 2);
    s.text(X(q.x) + q.d / 2 + 1.2, Z(q.z) + 0.8, it[1] + ' Ø' + F(q.d), 'lb');
    s.dim(0, X(q.x), (i % 2 ? -14 : -8) - (i > 1 ? 12 : 0), 'h', F(X(q.x)), Z(q.z));
    s.dim(0, Z(q.z), OW + 6 + i * 6, 'v', F(Z(q.z)), X(q.x));
  });
  var c = f.sma_cc; s.rect(X(c.x) - 3.5, Z(c.z) - 3.5, X(c.x) + 3.5, Z(c.z) + 3.5, 0, 'hd');
  s.dim(0, OW, OD + 6, 'h', F(OW), OD);
  return fig('Top wall, seen from above', 'CC1101 has a 7 × 7 × 1.0 pocket inside (dashed) for its SMA body', s);
}
function drawSide() {
  var s = new Svg(OD, OH, 22), w = f.switch, split = Z(cav.D);
  s.rect(0, 0, OD, OH, 1.5, 'o'); s.line(split, 0, split, OH, 'o2');
  stadium(s, Z(w.z), Y(w.y), w.h, w.w, 'h');
  s.dim(0, Z(w.z), Y(w.y) + 8, 'h', F(Z(w.z)), Y(w.y)); s.dim(0, Y(w.y), -8, 'v', F(Y(w.y)), Z(w.z));
  s.dim(0, OD, -8, 'h', F(OD), 0); s.dim(0, OH, OD + 8, 'v', F(OH), OD);
  s.text(Z(w.z) + 3, Y(w.y), 'switch slot ' + F(w.h) + ' × ' + F(w.w), 'lb');
  s.text(split + 1, OH - 4, 'front', 'lb'); s.text(1, OH - 4, 'back', 'lb');
  return fig('Right side', 'slide switch knob slot', s);
}
function drawStack() {
  var bb = DATA.parts.find(function (p) { return p.id === 'breadboard'; }), bz = bb.at[2];
  var bands = [[-walls.back, 0, 'back cover'], [0, bz, 'back deck: ESP32, cell, NFC, radios, GPS, IR, SD'],
    [bz, bz + 8.5, '400-point breadboard'], [bz + 8.5, bz + 32.5, 'jumper zone (14 mm plugs + 10 mm bend)'],
    [bz + 32.5, cav.D, 'display clearance above breadboard'], [cav.D, cav.D + walls.front, 'front plate']];
  var s = new Svg(72, OD, 18);
  bands.forEach(function (b, i) {
    s.rect(0, Z(b[0]), 16, Z(b[1]), 0, 'band'); s.text(19, (Z(b[0]) + Z(b[1])) / 2 - 0.8, b[2], 'bt');
    s.dim(Z(b[0]), Z(b[1]), -4 - (i % 2) * 5, 'v', F(b[1] - b[0]), 0);
  });
  s.dim(0, OD, -16, 'v', F(OD), 0);
  return fig('Depth stack (side section)', 'why the case is ' + F(OD) + ' mm deep', s);
}
function fig(title, sub, svg) {
  return '<figure class="draw"><figcaption><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></figcaption>' + svg + '</figure>';
}
function openingsTable() {
  var r = function (n, wall, a, b, size) { return '<tr><td>' + n + '</td><td>' + wall + '</td><td class="n">' + a + '</td><td class="n">' + b + '</td><td class="n">' + size + '</td></tr>'; };
  var rows = [];
  f.usb_esp.forEach(function (q) { rows.push(r('ESP32 ' + esc(q.name), 'bottom', F(X(q.x)), F(Z(q.z)), '9.6 × 3.9')); });
  rows.push(r('Charge USB-C', 'bottom', F(X(f.usb_tp.x)), F(Z(f.usb_tp.z)), '3.9 × 9.6'));
  rows.push(r('microSD slot', 'bottom', F(X(f.sd.x)), F(Z(f.sd.z)), f.sd.w + ' × ' + f.sd.h));
  rows.push(r('NRF24 SMA', 'top', F(X(f.sma_nrf.x)), F(Z(f.sma_nrf.z)), 'Ø' + f.sma_nrf.d));
  rows.push(r('CC1101 SMA', 'top', F(X(f.sma_cc.x)), F(Z(f.sma_cc.z)), 'Ø' + f.sma_cc.d));
  rows.push(r('IR LED', 'top', F(X(f.ir_tx.x)), F(Z(f.ir_tx.z)), 'Ø' + f.ir_tx.d));
  rows.push(r('IR receiver', 'top', F(X(f.ir_rx.x)), F(Z(f.ir_rx.z)), 'Ø' + f.ir_rx.d));
  rows.push(r('Power switch', 'right', F(Y(f.switch.y)) + ' ↑', F(Z(f.switch.z)), F(f.switch.w) + ' × ' + F(f.switch.h)));
  return '<h3>All openings</h3><div style="overflow-x:auto"><table><thead><tr><th>Opening</th><th>Wall</th><th>From left</th><th>From back</th><th>Size</th></tr></thead><tbody>' +
    rows.join('') + '</tbody></table></div><p class="foot">Centre positions in mm, measured from the outer left edge and the outer back face (switch and SD card: from the outer bottom edge).</p>';
}
function renderDrawings() {
  $('pDraw').innerHTML = '<p class="muted small">Every number is generated from the same model the STL files come from.</p>' +
    drawFront() + drawBottom() + drawTop() + drawSide() + drawLeft() + drawBack() + drawStack() + openingsTable();
}

/* ---------------- print tab + downloads ---------------- */
function stlBytes(raw) {
  var src = raw.pos, xf = raw.xf || {}, pos = new Float32Array(src.length);
  for (var q = 0; q < src.length; q += 3) {        // same print orientation as build.py
    pos[q] = src[q];
    if (xf.flip) { pos[q + 1] = xf.ysum - src[q + 1]; pos[q + 2] = xf.ztop - src[q + 2]; }
    else { pos[q + 1] = src[q + 1]; pos[q + 2] = src[q + 2] + (xf.dz || 0); }
  }
  var idx = raw.idx, n = idx.length / 3, buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf);
  var hdr = 'ESP32-S3 handheld enclosure, mm'; for (var i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 32);
  dv.setUint32(80, n, true);
  var o = 84;
  for (var t = 0; t < n; t++) {
    var a = idx[3 * t] * 3, b = idx[3 * t + 1] * 3, c = idx[3 * t + 2] * 3;
    var ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
    [nx / l, ny / l, nz / l, pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2], pos[c], pos[c + 1], pos[c + 2]].forEach(function (v) { dv.setFloat32(o, v, true); o += 4; });
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Uint8Array(buf);
}
var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(files) {          // STORE-only zip writer
  var enc = new TextEncoder(), parts = [], central = [], offset = 0;
  files.forEach(function (fl) {
    var name = enc.encode(fl.name), data = typeof fl.data === 'string' ? enc.encode(fl.data) : fl.data, crc = crc32(data);
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, 0, true); h.setUint16(12, 0x5A21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x5A21, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  var csize = central.reduce(function (s, a) { return s + a.length; }, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}
function readme() {
  return ['ESP32-S3 handheld enclosure (portrait) - generated ' + DATA.generated, '',
    'Outer size: ' + F(OW) + ' x ' + F(OH) + ' x ' + F(OD) + ' mm (W x H x D)', '',
    'enclosure_back_tub.stl     print BACK DOWN; removable supports under SD shelf',
    'enclosure_front_plate.stl  print FACE DOWN on the bed, no supports', '',
    'Suggested: PETG or PLA, 0.4 nozzle, 0.2 mm layers, 4 perimeters, 25% gyroid infill.',
    'Print one front plate first and test-fit the display glass and the joystick.', '',
    'Hardware: 4x M2.5x8 countersunk (plate to case), 4x M3x6 (display), 2x M3x8 (joystick),',
    '1x SS12D00 slide switch, double-sided foam tape, two screw-on SMA antennas.', '',
    'All dimensions: see the drawings (*.svg) in this zip.'].join('\n');
}
function svgFile(html) {
  var m = html.match(/<svg[\s\S]*<\/svg>/); if (!m) return '';
  var cs = getComputedStyle(document.documentElement), s = m[0];
  ['--panel', '--ink', '--ground', '--muted', '--dim', '--faint', '--panel-2', '--rule-2'].forEach(function (v) {
    var light = { '--panel': '#ffffff', '--ink': '#16201d', '--ground': '#e9edeb', '--muted': '#55635e', '--dim': '#b25e0a', '--faint': '#7d8a86', '--panel-2': '#f3f6f5', '--rule-2': '#b9c4c0' }[v];
    s = s.split('var(' + v + ')').join(light || cs.getPropertyValue(v).trim());
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + s;
}
function renderPrint() {
  var m = DATA.meshes, g = function (k) { return Math.round(m[k].volume_cm3 * 1.27); };
  $('pPrint').innerHTML =
    '<h2>Print files</h2><p class="muted small">Two parts. Back tub needs removable supports beneath the SD shelf above the battery; inspect overhangs in the slicer.</p>' +
    '<table><thead><tr><th>Part</th><th>Bed side</th><th>Triangles</th><th>≈ PETG</th></tr></thead><tbody>' +
    '<tr><td>Back tub</td><td>back down</td><td class="n">' + m.tub.tris + '</td><td class="n">' + g('tub') + ' g</td></tr>' +
    '<tr><td>Front plate</td><td>face down</td><td class="n">' + m.front.tris + '</td><td class="n">' + g('front') + ' g</td></tr></tbody></table>' +
    '<p style="margin-top:12px"><button class="btn" id="dl">Download STL files (.zip)</button></p><p class="status" id="dlStatus" aria-live="polite"></p>' +
    '<p class="foot">The zip holds both STLs, the dimension drawings as SVG and a short README. On your Mac they are also in enclosure/stl/.</p>' +
    '<h3>Slicer settings</h3><dl class="kv"><dt>Material</dt><dd>PETG (PLA is fine indoors)</dd><dt>Layer</dt><dd>0.20 mm</dd>' +
    '<dt>Walls</dt><dd>4 perimeters</dd><dt>Infill</dt><dd>25 % gyroid</dd><dt>Supports</dt><dd>under SD shelf; inspect other overhangs</dd><dt>Brim</dt><dd>5 mm on the tub</dd></dl>' +
    '<h3>Hardware</h3><ul class="small"><li>4 × M2.5 × 8 countersunk: front plate to the case lugs</li><li>4 × M3 × 6 pan head: display to its standoffs</li>' +
    '<li>2 × M3 × 8 pan head: joystick header side (far side clicks into two hooks)</li><li>1 × SS12D00 slide switch; connect according to the fitted power circuit</li>' +
    '<li>Double-sided foam tape for the radios, IR boards and GPS patch</li><li>Screw-on antennas: 2.4 GHz (NRF24) and 433 MHz (CC1101)</li></ul>' +
    '<h3>Assembly order</h3><ol class="small"><li>Back tub: stick the ESP32 onto its pads (USB-C into the bottom slots), slide the TP4056 into its channel, drop the cell holder between its stops.</li>' +
    '<li>PN532 onto its two pegs (DIP: 1 OFF, 2 ON for SPI). GPS onto its posts, patch on its block under the top wall.</li>' +
    '<li>IR boards, then the NRF24 and CC1101: push each SMA through the top wall and screw the antennas on.</li>' +
    '<li>SD reader onto its gusset, card slot to the bottom wall. Switch into its ribs on the right side.</li>' +
    '<li>Plug the module jumpers before fitting the breadboard onto its wall ledges. Route loose loops through the lower bay and side corridors; keep the GPS patch clear.</li>' +
    '<li>Front plate: screw the display on, click the joystick into its hooks and screw its header side, plug both in.</li>' +
    '<li>Close with the four M2.5 screws.</li></ol>' +
    '<h3>Fit check before printing</h3><ul class="small"><li>Holes print about 0.2 mm small. Ream SMA holes to Ø6.8 if the thread binds.</li>' +
    '<li>Joystick stick height and hole spacing are estimated. Measure yours; the numbers live in enclosure/src/parts.py.</li>' +
    '<li>Change any part size or position in src/parts.py or src/layout.py and run <code>python3 build.py</code>: the case, drawings and this page regenerate.</li></ul>';
  $('dl').addEventListener('click', download);
}
function download() {
  var btn = $('dl'), st = $('dlStatus'); btn.disabled = true; st.textContent = 'Building the zip…';
  setTimeout(async function () {
    try {
      var files = [{ name: APP.raw.tub.file, data: stlBytes(APP.raw.tub) }, { name: APP.raw.front.file, data: stlBytes(APP.raw.front) },
        { name: 'README.txt', data: readme() }];
      [['drawing_front.svg', drawFront()], ['drawing_bottom.svg', drawBottom()], ['drawing_top.svg', drawTop()],
       ['drawing_right.svg', drawSide()], ['drawing_left.svg', drawLeft()], ['drawing_back.svg', drawBack()]].forEach(function (d) { files.push({ name: d[0], data: svgFile(d[1]) }); });
      var blob = zip(files), name = 'esp32-handheld-enclosure.zip';
      var dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
      if (dl) {
        try { await dl.save({ filename: name, data: blob }); st.textContent = 'Saved ' + name + ' (' + Math.round(blob.size / 1024) + ' KB).'; }
        catch (e) { st.textContent = e && e.code === 'declined' ? 'Download cancelled.' : 'This view cannot save files. Use enclosure/stl/ on your Mac.'; }
      } else if (!window.claude) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
        st.textContent = 'Downloaded ' + name + ' (' + Math.round(blob.size / 1024) + ' KB).';
      } else { st.textContent = 'This view cannot save files. The STLs are in enclosure/stl/ on your Mac.'; }
    } catch (e) { st.textContent = 'Could not build the zip: ' + e.message; }
    btn.disabled = false;
  }, 30);
}

/* ---------------- boot ---------------- */
function boot() {
  APP.buildScene(); APP.buildDims(); renderList(); renderDrawings(); renderPrint(); APP.onSelect(null);
  APP.onTheme = function () { renderDrawings(); };
  var tab = null; try { tab = localStorage.getItem('encl-tab'); } catch (e) {}
  if (tab && $(tab)) showTab(tab);
  APP.setMode('asm'); APP.start();
}
var booted = false;
function bootOnce() { if (!booted) { booted = true; boot(); } }
if (document.fonts && document.fonts.ready) { document.fonts.ready.then(bootOnce, bootOnce); setTimeout(bootOnce, 1500); } else bootOnce();
})();
