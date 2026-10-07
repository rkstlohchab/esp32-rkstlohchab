/* Enclosure Studio - detailed part models, built in each part's local frame
   (PCB bottom z=0, component side z=t, x along the long axis). All numbers
   come from DATA.specs, the same dict the clearance check used. */
(function () {
'use strict';
var APP = window.APP; if (!APP || APP.dead) return;
var T = APP.T, M = APP.M, box = APP.box, cyl = APP.cyl, mat = APP.mat;
var P = 2.54, HOUSING = 14, PLASTIC = 2.54, PIN_OUT = 6;

var WC = { red: '#d93025', black: '#202226', blue: '#2f6fdb', green: '#2fa84f', yellow: '#f2c200', white: '#eeeeee',
  purple: '#8e44ad', orange: '#f28c28', grey: '#8a8f98' };
APP.WC = WC;
/* ESP32 pin -> what it drives (docs/CIRCUIT.md + the 2026-09-23 display rewire) */
var ESP_USE = {
  '3V3': ['3V3 rail', 'red'], '5Vin': ['5V in (switch)', 'red'], 'GND': ['Ground', 'black'],
  '4': ['Joystick VRx', 'blue'], '5': ['Joystick VRy', 'green'], '6': ['Joystick SW', 'white'],
  '7': ['NRF24 CSN', 'purple'], '16': ['NRF24 CE', 'orange'], '17': ['NRF24 SCK', 'yellow'],
  '18': ['NRF24 MOSI', 'green'], '21': ['NRF24 MISO', 'white'], '40': ['CC1101 CSN', 'purple'],
  '10': ['SD CS', 'purple'], '11': ['SD/CC1101/PN532 MOSI', 'green'], '12': ['SD/CC1101/PN532 SCK', 'yellow'], '13': ['SD/CC1101 MISO', 'white'],
  '42': ['PN532 MISO', 'white'], '2': ['PN532 SS', 'purple'], '1': ['CC1101 GDO0', 'blue'],
  '15': ['TFT MOSI', 'green'], '47': ['TFT SCK', 'yellow'], '48': ['TFT MISO', 'white'], '39': ['TFT CS', 'purple'],
  '9': ['TFT DC', 'blue'], '8': ['TFT RESET', 'orange'], '45': ['Touch CS', 'purple'], '46': ['Touch IRQ', 'grey'],
  '41': ['ESP RX from GPS TX', 'blue'], '38': ['IR LED', 'green']
};
APP.ESP_USE = ESP_USE;
var DISP_WIRE = ['red', 'black', 'purple', 'orange', 'blue', 'green', 'yellow', 'red', 'white', 'yellow', 'purple', 'green', 'white', 'grey'];

/* ---------------- shared bits ---------------- */
function wire(g, axis, a, b, u, v, color) { return cyl(g, axis, a, b, u, v, 0.7, mat(WC[color] || color, 0.55, 0), 10); }
/* straight male header. pins [{x,y,color?}] ; side -1: spacer+pins under the PCB */
function header(g, pins, t, side, mode, pitchPad) {
  var base = side < 0 ? 0 : t, plast = [], pinPts = [], tip = base + side * (PLASTIC + PIN_OUT), tail = side < 0 ? t + 1.3 : -1.3;
  pins.forEach(function (p) { plast.push([p.x, p.y, base + side * PLASTIC / 2]); pinPts.push([p.x, p.y, (tail + tip) / 2]); });
  APP.inst(g, plast, P - 0.06, P - 0.06, PLASTIC, M.blackPlastic);
  APP.inst(g, pinPts, 0.64, 0.64, Math.abs(tip - tail), M.gold);
  var solderZ = side < 0 ? t + 0.35 : -0.35;
  APP.inst(g, pins.map(function (p) { return [p.x, p.y, solderZ]; }), 1.5, 1.5, 0.7, M.solder);
  pins.forEach(function (p) {
    if (!p.color || mode === 'none') return;
    var z0 = base + side * PLASTIC;
    if (mode === 'dupont') {
      box(g, p.x - 1.25, p.y - 1.25, z0, p.x + 1.25, p.y + 1.25, z0 + side * HOUSING, M.blackPlastic);
      box(g, p.x - 0.5, p.y - 1.26, z0 + side * 2, p.x + 0.5, p.y + 1.26, z0 + side * 9, mat('#2a2d31', 0.5, 0)); // latch window
      wire(g, 'z', z0 + side * HOUSING, z0 + side * (HOUSING + 4), p.x, p.y, p.color);
    } else if (mode === 'solder') {
      cyl(g, 'z', tip - side * 4.5, tip + side * 0.6, p.x, p.y, 0.95, mat('#141414', 0.8, 0), 12); // heat-shrink
      wire(g, 'z', tip + side * 0.6, tip + side * 4, p.x, p.y, p.color);
    }
  });
}
/* right-angle male header on the component side; pins leave at x=xe going dir (+1/-1) */
function rheader(g, ys, xe, dir, t, colors, mode) {
  var zc = t + 1.27;
  ys.forEach(function (y, i) {
    box(g, xe - dir * 2.6, y - 1.25, t, xe, y + 1.25, t + PLASTIC, M.blackPlastic);
    box(g, xe - dir * 1.3 - 0.32, y - 0.32, -1.3, xe - dir * 1.3 + 0.32, y + 0.32, zc + 0.32, M.gold);
    box(g, xe - dir * 1.3, y - 0.32, zc - 0.32, xe + dir * PIN_OUT, y + 0.32, zc + 0.32, M.gold);
    var c = colors && colors[i]; if (!c) return;
    if (mode === 'dupont') {
      box(g, xe + dir * 0.2, y - 1.25, zc - 1.25, xe + dir * (0.2 + HOUSING), y + 1.25, zc + 1.25, M.blackPlastic);
      wire(g, 'x', xe + dir * (0.2 + HOUSING), xe + dir * (4 + HOUSING), y, zc, c);
    } else if (mode === 'solder') {
      cyl(g, 'x', xe + dir * 1.5, xe + dir * (PIN_OUT + 0.6), y, zc, 0.95, mat('#141414', 0.8, 0), 12);
      wire(g, 'x', xe + dir * (PIN_OUT + 0.6), xe + dir * (PIN_OUT + 4), y, zc, c);
    }
  });
}
function chip(g, x, y, lx, ly, h, t, legs, color) {
  box(g, x - lx / 2, y - ly / 2, t, x + lx / 2, y + ly / 2, t + h, color || M.darkChip);
  if (legs) { box(g, x - lx / 2 - 0.5, y - ly / 2 + 0.3, t, x + lx / 2 + 0.5, y + ly / 2 - 0.3, t + 0.3, M.tin); }
}
function smd(g, pts, t, lx, ly, h, color) {
  pts.forEach(function (p) { box(g, p[0] - lx / 2, p[1] - ly / 2, t, p[0] + lx / 2, p[1] + ly / 2, t + h, color || mat('#6b5a3a', 0.5, 0.2)); });
}
function usbC(g, x0, x1, yc, w, h, z0) {
  // rounded receptacle shell running along +x; width along y, height along z
  var shape = new T.Shape(), r = h / 2 - 0.01, hw = w / 2;
  shape.moveTo(-hw + r, -h / 2); shape.lineTo(hw - r, -h / 2); shape.absarc(hw - r, 0, r, -Math.PI / 2, Math.PI / 2);
  shape.lineTo(-hw + r, h / 2); shape.absarc(-hw + r, 0, r, Math.PI / 2, 3 * Math.PI / 2);
  var geo = new T.ExtrudeGeometry(shape, { depth: Math.abs(x1 - x0), bevelEnabled: false, curveSegments: 10 });
  geo.applyMatrix4(new T.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));   // (X,Y,Z) -> (Z,X,Y)
  var m = new T.Mesh(geo, M.silver); m.position.set(Math.min(x0, x1), yc, z0 + h / 2); g.add(m);
  var hole = new T.Mesh(new T.BoxGeometry(0.25, w - 1.3, h - 1.1), mat('#08090a', 0.9, 0));
  hole.position.set(Math.min(x0, x1) - 0.1, yc, z0 + h / 2); g.add(hole);
  box(g, Math.min(x0, x1) + 0.3, yc - 2.9, z0 + h / 2 - 0.35, Math.min(x0, x1) + 4.2, yc + 2.9, z0 + h / 2 + 0.35, mat('#26282c', 0.6, 0));
}
function holesArt(ctx, s, holes, d, pad) { holes.forEach(function (h) { APP.padHole(ctx, s, h[0], h[1], pad || d + 1.4, d); }); }
function antenna(g, axis, from, dir, len, dia, u, v, color) {
  var grp = new T.Group(); grp.userData.antenna = true; g.add(grp);
  var a = from, b = from + dir * len;
  cyl(grp, axis, a, a + dir * 9, u, v, 4.2, mat('#1b1d20', 0.45, 0.2), 20);
  cyl(grp, axis, a + dir * 9, a + dir * 12, u, v, 3.6, mat('#2b2e33', 0.5, 0.1), 20);
  cyl(grp, axis, a + dir * 12, b - dir * 4, u, v, dia / 2, mat(color || '#16181a', 0.75, 0), 20, dia / 2 - 0.5);
  var cap = new T.Mesh(new T.SphereGeometry(dia / 2 - 0.5, 16, 10), mat(color || '#16181a', 0.75, 0));
  if (axis === 'x') cap.position.set(b - dir * 4, u, v); else if (axis === 'y') cap.position.set(u, b - dir * 4, v); else cap.position.set(u, v, b - dir * 4);
  grp.add(cap);
  return grp;
}

var B = APP.builders = {};
B._generic = function (g, s) { box(g, 0, 0, 0, s.L, s.W, s.t, mat(s.color || '#777', 0.6, 0)); };

/* ================= YD-ESP32-S3 ================= */
B.esp32 = function (g, s) {
  var L = s.L, W = s.W, t = s.t;
  var top = APP.tex(L, W, s.color, function (c, k) {
    s.rows.forEach(function (y, r) {
      var labels = r === 0 ? s.row_y1 : s.row_y26;
      for (var i = 0; i < s.npins; i++) {
        var x = s.pin0 + i * P;
        APP.padHole(c, k, x, y, 1.75, 1.0, i === s.npins - 1 && r === 1);
        APP.text(c, k, labels[i], x, r === 0 ? y + 2.6 : y - 2.6, 0.95, '#e9ecef', 'center', Math.PI / 2, '600');
      }
    });
    APP.text(c, k, 'RST', 33.75, 12.2, 0.9, '#e9ecef'); APP.text(c, k, 'BOOT', 28.65, 12.2, 0.9, '#e9ecef');
    APP.text(c, k, 'RGB', 18.25, 15.2, 0.8, '#e9ecef'); APP.text(c, k, 'IN-OUT', 11.4, 22.9, 0.7, '#e9ecef');
    APP.text(c, k, 'USB', 9.3, 19.84, 0.8, '#e9ecef', 'center', Math.PI / 2); APP.text(c, k, 'COM', 9.3, 8.1, 0.8, '#e9ecef', 'center', Math.PI / 2);
  });
  var bottom = APP.tex(L, W, s.color, function (c, k) {
    s.rows.forEach(function (y, r) {
      var labels = r === 0 ? s.row_y1 : s.row_y26;
      for (var i = 0; i < s.npins; i++) {
        var x = L - (s.pin0 + i * P);
        APP.padHole(c, k, x, y, 1.75, 1.0, false);
        APP.text(c, k, labels[i], x, r === 0 ? y + 2.6 : y - 2.6, 0.95, '#e9ecef', 'center', Math.PI / 2);
      }
    });
    APP.text(c, k, 'YD-ESP32-S3', L / 2 + 6, W / 2 + 2.5, 2.1, '#e9ecef'); APP.text(c, k, 'VCC-GND Studio · N16R8', L / 2 + 6, W / 2 - 1.2, 1.2, '#aeb4ba');
  });
  APP.pcb(g, L, W, t, s.color, top, bottom);
  // module: PCB, shield can with markings, antenna meander
  var m = s.module;
  box(g, m.x0, m.y0, t, m.x1, m.y1, t + m.pcb, mat('#1d2a24', 0.55, 0.05));
  var canTex = APP.tex(m.can_x1 - m.can_x0, m.y1 - m.y0 - 1, '#c3c7cb', function (c, k) {
    APP.text(c, k, 'ESP32-S3-WROOM-1', 8.8, 11.5, 1.35, '#3a3f44', 'center', Math.PI / 2);
    APP.text(c, k, 'N16R8  ESPRESSIF', 12.2, 8.5, 1.05, '#4a4f55', 'center', Math.PI / 2);
    c.fillStyle = '#9aa0a6'; c.fillRect(2 * k, 2 * k, 3.5 * k, 3.5 * k);
  }, 14);
  var cm = new T.MeshStandardMaterial({ map: canTex, roughness: 0.32, metalness: 0.75 });
  var canMesh = new T.Mesh(new T.BoxGeometry(m.can_x1 - m.can_x0, m.y1 - m.y0 - 1, m.can_h),
    [M.silver, M.silver, M.silver, M.silver, cm, M.silver]);
  canMesh.position.set((m.can_x0 + m.can_x1) / 2, (m.y0 + m.y1) / 2, t + m.pcb + m.can_h / 2); g.add(canMesh);
  for (var i = 0; i < 6; i++) box(g, m.can_x1 + 0.6 + i * 1.05, m.y0 + 1.5, t + m.pcb, m.can_x1 + 0.95 + i * 1.05, m.y1 - 1.5, t + m.pcb + 0.04, M.gold);
  s.usb.forEach(function (u) { usbC(g, -s.usb_over, s.usb_l - s.usb_over, u.y, s.usb_w, s.usb_h, t); });
  s.buttons.forEach(function (b) {
    box(g, b.x - 1.5, b.y - 2, t, b.x + 1.5, b.y + 2, t + 1.2, M.silver);
    cyl(g, 'z', t + 1.2, t + 2.4, b.x, b.y, 0.8, mat('#111', 0.6, 0), 16);
  });
  box(g, s.rgb.x - 2.5, s.rgb.y - 2.5, t, s.rgb.x + 2.5, s.rgb.y + 2.5, t + 1.6, M.white);
  cyl(g, 'z', t + 1.5, t + 1.62, s.rgb.x, s.rgb.y, 1.9, mat('#d9dde2', 0.2, 0.1), 20);
  chip(g, s.ldo.x, s.ldo.y, s.ldo.lx, s.ldo.ly, s.ldo.h, t, true);
  s.caps.forEach(function (c) { chip(g, c.x, c.y, 2.8, 3.5, 1.9, t, false, mat('#1a1a1a', 0.5, 0)); box(g, c.x - 1.4, c.y + 1.2, t + 1.9, c.x + 1.4, c.y + 1.6, t + 1.92, mat('#c9a13a', 0.5, 0)); });
  chip(g, s.ch343.x, s.ch343.y, s.ch343.lx, s.ch343.ly, s.ch343.h, t, true);
  s.leds.forEach(function (l) { box(g, l.x - 0.8, l.y - 0.4, t, l.x + 0.8, l.y + 0.4, t + 0.6, mat(l.c, 0.3, 0, { emissive: l.c, emissiveIntensity: 0.35 })); });
  smd(g, s.diodes.map(function (d) { return [d.x, d.y]; }), t, 1.6, 2.7, 1.1, mat('#1b1b1b', 0.5, 0));
  smd(g, [[26, 12.5], [26, 14.2], [22, 5], [16.5, 12], [16.5, 14], [35.5, 12.8], [9.5, 12.5], [9.5, 14]], t, 1.0, 0.5, 0.45);
  // headers + Dupont plugs on the pins that are wired
  s.rows.forEach(function (y, r) {
    var labels = r === 0 ? s.row_y1 : s.row_y26, pins = [];
    for (var i = 0; i < s.npins; i++) {
      var lab = labels[i], use = ESP_USE[lab];
      var color = use ? WC[use[1]] : null;
      if (lab === 'GND' && !(i === 0 && r === 1) && !(i === s.npins - 1 && r === 0)) color = null;
      pins.push({ x: s.pin0 + i * P, y: y, color: color });
    }
    header(g, pins, t, -1, 'dupont');
  });
};

/* ================= 2.8" TPM408 display ================= */
B.display = function (g, s) {
  var L = s.L, W = s.W, t = s.t, gl = s.glass;
  var front = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.pad_d);
    for (var i = 0; i < s.hdr.n; i++) APP.padHole(c, k, s.hdr.x0 + i * P, s.hdr.y, 1.7, 1.0, i === 0);
    for (var j = 0; j < s.j4.n; j++) APP.padHole(c, k, s.j4.x0 + j * P, s.j4.y, 1.7, 1.0, j === 0);
    APP.text(c, k, 'J1', 5.2, 2.0, 1.1, '#fff'); APP.text(c, k, 'J4', 18.6, 84.1, 1.1, '#fff');
  });
  var back = APP.tex(L, W, s.color, function (c, k) {
    var X = function (x) { return L - x; };
    s.holes.forEach(function (h) { APP.padHole(c, k, X(h[0]), h[1], s.pad_d, s.hole_d); });
    for (var i = 0; i < s.hdr.n; i++) {
      APP.padHole(c, k, X(s.hdr.x0 + i * P), s.hdr.y, 1.7, 1.0, i === 0);
      APP.text(c, k, s.hdr_labels[i], X(s.hdr.x0 + i * P), s.hdr.y + 5.2, 0.95, '#fff', 'center', Math.PI / 2);
    }
    APP.text(c, k, '2.8" TFT SPI 240x320 V1.2', X(22), 60, 1.6, '#fff', 'center', Math.PI / 2);
    APP.text(c, k, 'SD_SCK SD_MISO SD_MOSI SD_CS', X(25), 80.5, 0.9, '#fff');
    ['T_IRQ', 'T_DO', 'T_DIN', 'T_CS', 'T_CLK'].forEach(function (n, i) { APP.text(c, k, n, X(44), 20 + i * 1.8, 0.8, '#fff', 'left'); });
    c.strokeStyle = '#e8b4b8'; c.lineWidth = 0.15 * k;
    for (var r = 0; r < 9; r++) { c.beginPath(); c.moveTo(X(10 + r * 3) * k, 8 * k); c.lineTo(X(12 + r * 3) * k, 30 * k); c.stroke(); }
  });
  APP.pcb(g, L, W, t, s.color, front, back);
  var z = t;
  box(g, gl.x0, gl.y0, z, gl.x1, gl.y1, z + s.tape, mat('#101010', 0.9, 0)); z += s.tape;
  box(g, gl.x0 + 0.1, gl.y0, z, gl.x1 - 0.1, gl.y1, z + s.lcd, mat('#3b4148', 0.2, 0.3)); z += s.lcd;
  var va = s.va, aa = s.aa;
  var screen = APP.tex(gl.x1 - gl.x0, gl.y1 - gl.y0, '#0d0f12', function (c, k) {
    var ox = aa.x0 - gl.x0, oy = aa.y0 - gl.y0, w = aa.x1 - aa.x0, h = aa.y1 - aa.y0;
    c.fillStyle = '#05070a'; c.fillRect(ox * k, oy * k, w * k, h * k);
    c.fillStyle = '#0f3d38'; c.fillRect(ox * k, (oy + h - 6) * k, w * k, 6 * k);
    APP.text(c, k, 'ESP32-DIV', ox + w / 2, oy + h - 3, 2.6, '#3CC8B4', 'center', 0, '600');
    var items = ['WiFi', 'Bluetooth', '2.4 GHz', 'Sub-GHz', 'IR Remote', 'NFC', 'GPS', 'Settings'];
    items.forEach(function (n, i) {
      var col = i % 2, row = Math.floor(i / 2), bx = ox + 2 + col * (w - 4) / 2, by = oy + h - 17 - row * 11.5;
      c.fillStyle = i === 0 ? '#1d6d64' : '#161b21'; c.fillRect(bx * k, by * k, ((w - 4) / 2 - 1.5) * k, 9.5 * k);
      APP.text(c, k, n, bx + ((w - 4) / 2 - 1.5) / 2, by + 4.8, 1.75, i === 0 ? '#eafffb' : '#9fb0b8');
    });
    c.fillStyle = '#1a2026'; c.fillRect(ox * k, oy * k, w * k, 3 * k);
    APP.text(c, k, 'joystick: move · click: select', ox + w / 2, oy + 1.5, 1.2, '#5f6b74');
  }, 10);
  var tp = new T.MeshStandardMaterial({ map: screen, roughness: 0.12, metalness: 0.1, emissive: '#ffffff', emissiveMap: screen, emissiveIntensity: 0.35 });
  var tpMesh = new T.Mesh(new T.BoxGeometry(gl.x1 - gl.x0, gl.y1 - gl.y0, s.tp), [M.blackPlastic, M.blackPlastic, M.blackPlastic, M.blackPlastic, tp, M.blackPlastic]);
  tpMesh.position.set((gl.x0 + gl.x1) / 2, (gl.y0 + gl.y1) / 2, z + s.tp / 2); g.add(tpMesh);
  box(g, gl.x1 - 7.5, gl.y1 - 3.0, z + s.tp, gl.x1 - 1.5, gl.y1 + 2.5, z + s.tp + 0.08, mat('#2e9c78', 0.6, 0));   // pull tab
  box(g, 12, gl.y0 - 1.2, t, 38, gl.y0, z, mat('#b0762a', 0.5, 0.2));   // FPC fold
  // back: SD socket, ICs, pin header with Dupont plugs
  var sd = s.sd;
  box(g, sd.x0 + 0.3, sd.y0, -sd.h, sd.x1, sd.y1, 0, M.silver);
  box(g, sd.x0, sd.y0 + 2, -sd.h + 0.3, sd.x0 + 0.4, sd.y1 - 2, -0.4, mat('#0b0b0b', 0.9, 0));
  // full-size SD card pushed into the socket; the outer end sticks past the board edge
  var cd = s.sd_card, cx0 = cd.x_in - cd.l, cz0 = -0.05 - cd.t;
  var cardTex = APP.tex(cd.l, cd.w, '#1d2a4a', function (c, k) {
    c.fillStyle = '#e8edf5'; c.fillRect(2 * k, 3 * k, 17 * k, (cd.w - 6) * k);
    APP.text(c, k, 'SD', 10.5, cd.w / 2 + 3, 5, '#1d2a4a', 'center', 0, '700');
    APP.text(c, k, '32 GB · FAT32', 10.5, cd.w / 2 - 3.5, 1.8, '#1d2a4a');
    c.fillStyle = '#c9a13a'; for (var i = 0; i < 8; i++) c.fillRect((cd.l - 3.2) * k, (2.5 + i * 2.5) * k, 2.2 * k, 1.6 * k);
  }, 10);
  var cmat = new T.MeshStandardMaterial({ map: cardTex, roughness: 0.5 }), cside = mat('#1d2a4a', 0.5, 0);
  var cardMesh = new T.Mesh(new T.BoxGeometry(cd.l, cd.w, cd.t), [cside, cside, cside, cside, cside, cmat]);
  cardMesh.position.set(cx0 + cd.l / 2, cd.y, cz0 + cd.t / 2); g.add(cardMesh);
  box(g, cx0 + 3, cd.y + cd.w / 2 - 0.01, cz0 + 0.5, cx0 + 6, cd.y + cd.w / 2 + 0.3, cz0 + 1.6, mat('#e8edf5', 0.5, 0));   // lock slider
  s.backparts.forEach(function (p) { box(g, p.x - p.lx / 2, p.y - p.ly / 2, -p.h, p.x + p.lx / 2, p.y + p.ly / 2, 0, M.darkChip); });
  smd(g, [[30, 10], [26, 12], [22, 26], [33, 29], [37, 29], [41, 29], [16, 14]], 0, 1.6, 0.8, -0.5);
  var pins = [];
  for (var i = 0; i < s.hdr.n; i++) pins.push({ x: s.hdr.x0 + i * P, y: s.hdr.y, color: WC[DISP_WIRE[i]] });
  header(g, pins, t, -1, 'dupont');
};

/* ================= KY-023 joystick ================= */
B.joystick = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, sx = s.stick[0], sy = s.stick[1];
  var top = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 1.6);
    s.pins_y.forEach(function (y, i) { APP.padHole(c, k, s.pins_x, y, 1.7, 1.0, i === 0); APP.text(c, k, s.pin_labels[i], 4.6, y, 0.95, '#fff', 'left'); });
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  var f = s.frame / 2;
  box(g, sx - f - 1.5, sy - f - 1.5, t, sx + f + 1.5, sy + f + 1.5, t + 2.4, M.white);                       // base
  box(g, sx - f, sy - f, t + 2.4, sx + f, sy + f, t + s.frame_h, mat('#b9bec3', 0.35, 0.8));              // metal cage
  box(g, sx - f + 1.2, sy - f + 1.2, t + s.frame_h - 0.1, sx + f - 1.2, sy + f - 1.2, t + s.frame_h + 0.02, mat('#8d9398', 0.4, 0.7));
  box(g, sx - f - 3.6, sy - 5, t, sx - f, sy + 5, t + 9.2, mat('#e9e6dc', 0.6, 0));                      // X pot
  box(g, sx - 5, sy + f, t, sx + 5, sy + f + 3.6, t + 9.2, mat('#e9e6dc', 0.6, 0));                      // Y pot
  cyl(g, 'x', sx - f - 3.7, sx - f - 3.5, sy, t + 5.2, 2.2, mat('#3d6fb6', 0.5, 0), 16);
  cyl(g, 'y', sy + f + 3.5, sy + f + 3.7, sx, t + 5.2, 2.2, mat('#3d6fb6', 0.5, 0), 16);
  box(g, sx + f, sy - 3.2, t, sx + f + 3.4, sy + 3.2, t + 3.6, mat('#e9e6dc', 0.6, 0));                   // push switch
  box(g, sx + f + 0.6, sy - 1.2, t + 3.6, sx + f + 2.2, sy + 1.2, t + 4.4, mat('#1f1f1f', 0.5, 0));
  var dome = new T.Mesh(new T.SphereGeometry(s.dome_d / 2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.white);
  dome.rotation.x = Math.PI / 2; dome.position.set(sx, sy, t + s.frame_h - (s.dome_d / 2 - (s.dome_top - s.frame_h))); g.add(dome);
  cyl(g, 'z', t + s.frame_h, t + 21, sx, sy, s.stem_d / 2, mat('#e7e3d8', 0.5, 0), 20);
  // thumb cap as a lathe: skirt dome -> neck -> dished top
  var r0 = s.skirt_d / 2, rt = s.top_d / 2, z0 = s.skirt_rim, z1 = s.cap_top, pts = [];
  pts.push(new T.Vector2(0.01, z0 + 2.2), new T.Vector2(r0 - 1.6, z0), new T.Vector2(r0, z0 + 0.2), new T.Vector2(r0 - 0.4, z0 + 1.6));
  for (var a = 0; a <= 8; a++) { var q = a / 8; pts.push(new T.Vector2(r0 - 0.4 - q * (r0 - 5.5), z0 + 1.6 + Math.sin(q * Math.PI / 2) * 6)); }
  pts.push(new T.Vector2(4.6, z1 - 5.2), new T.Vector2(rt - 0.8, z1 - 4.3), new T.Vector2(rt, z1 - 3.2), new T.Vector2(rt, z1 - 0.9),
    new T.Vector2(rt - 0.9, z1), new T.Vector2(rt - 3, z1 - 0.35), new T.Vector2(0.01, z1 - 0.8));
  var capMesh = new T.Mesh(new T.LatheGeometry(pts, 48), mat('#1e2024', 0.82, 0, { side: T.DoubleSide }));
  capMesh.rotation.x = Math.PI / 2; capMesh.position.set(sx, sy, t); g.add(capMesh);
  var colors = ['black', 'red', 'blue', 'green', 'white'].map(function (c) { return WC[c]; });
  var mode = p.wiring === 'solder' ? 'solder' : 'dupont';
  rheader(g, s.pins_y, 0.0, -1, t, colors, mode);
};

/* ================= NRF24L01+ PA/LNA ================= */
B.nrf24 = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, m = s.sma;
  var top = APP.tex(L, W, s.color, function (c, k) {
    s.hdr_x.forEach(function (x, ci) { s.hdr_y.forEach(function (y, ri) { APP.padHole(c, k, x, y, 1.7, 1.0, ci === 0 && ri === 0); }); });
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 1.2);
    APP.text(c, k, 'NRF24L01+PA+LNA', 20, 1.6, 0.9, '#cfd3d6');
    c.strokeStyle = '#3a3f45'; c.lineWidth = 0.35 * k; c.beginPath(); c.moveTo(30 * k, W / 2 * k); c.lineTo(35 * k, W / 2 * k); c.stroke();
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  chip(g, 14, 8, 4, 4, 0.85, t); chip(g, 25, 8, 3, 3, 0.8, t);
  box(g, 18.5, 11.2, t, 21.7, 13.7, t + 0.8, M.silver);                            // 16 MHz crystal
  smd(g, [[10, 3], [10, 12.5], [17, 3.5], [21, 4], [23, 12.5], [28, 3.5], [28, 12.5], [31, 8], [12, 5.5]], t, 1.0, 0.5, 0.45);
  box(g, m.bx0, W / 2 - 3.2, t, m.bx1, W / 2 + 3.2, t + m.bh, M.gold);            // right-angle SMA body
  cyl(g, 'x', m.bx1, m.bar_x1, W / 2, m.axis_z, m.d / 2, M.gold, 24);
  for (var i = 0; i < 8; i++) cyl(g, 'x', m.bx1 + 1 + i * 0.95, m.bx1 + 1.35 + i * 0.95, W / 2, m.axis_z, m.d / 2 + 0.12, M.gold, 24);
  cyl(g, 'x', m.bar_x1 - 0.01, m.bar_x1 + 0.02, W / 2, m.axis_z, 2.1, M.white, 20);
  antenna(g, 'x', m.bar_x1, 1, 108, 9.6, W / 2, m.axis_z);
  var cols = [['black', 'orange', 'yellow', 'white'], ['red', 'purple', 'green', null]], pins = [];
  s.hdr_x.forEach(function (x, ci) { s.hdr_y.forEach(function (y, ri) { var c = cols[ci][ri]; pins.push({ x: x, y: y, color: c && WC[c] }); }); });
  header(g, pins, t, -1, p.wiring === 'solder' ? 'solder' : 'dupont');
};

/* ================= CC1101 E07-M1101D-SMA ================= */
B.cc1101 = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, m = s.sma, c0 = s.can;
  var top = APP.tex(L, W, s.color, function (c, k) {
    s.hdr_x.forEach(function (x, ci) { s.hdr_y.forEach(function (y, ri) { APP.padHole(c, k, x, y, 1.5, 0.9, ci === 0 && ri === 0);
      APP.text(c, k, String(ri * 2 + 1 + ci), x + 1.9 * (ci ? 1 : -1) + 0.6, y, 0.7, '#e6f0ea'); }); });
    holesArt(c, k, s.holes, s.hole_d, s.pad_d);
    APP.text(c, k, 'E07-M1101D', 24, W / 2 + 2.6, 1.05, '#e6f0ea', 'center', Math.PI / 2);
    APP.text(c, k, '433MHz  EBYTE', 26.5, W / 2, 0.8, '#bcd0c4', 'center', Math.PI / 2);
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  box(g, c0.x0, c0.y0, t, c0.x1, c0.y1, t + c0.h, M.silver);
  box(g, c0.x0 + 0.8, c0.y0 + 0.8, t + c0.h, c0.x1 - 0.8, c0.y1 - 0.8, t + c0.h + 0.02, mat('#a7adb3', 0.35, 0.7));
  smd(g, [[6.5, 3], [6.5, 12], [18, 3.5], [18, 11.5], [21.5, 7.5], [24, 5], [24, 10]], t, 1.0, 0.5, 0.45);
  box(g, 17, 5.8, t, 19.5, 9.2, t + 0.8, M.silver);
  var zc = t / 2;
  box(g, L - 3, W / 2 - 3.1, t, m.body_x1 - 4, W / 2 + 3.1, t + 0.8, M.gold);         // edge-mount legs
  box(g, L - 3, W / 2 - 3.1, -0.8, m.body_x1 - 4, W / 2 + 3.1, 0, M.gold);
  box(g, L, W / 2 - m.body_w / 2, zc - m.body_w / 2, m.body_x1, W / 2 + m.body_w / 2, zc + m.body_w / 2, M.gold);
  cyl(g, 'x', m.body_x1, m.bar_x1, W / 2, zc, m.d / 2, M.gold, 24);
  for (var i = 0; i < 5; i++) cyl(g, 'x', m.body_x1 + 0.6 + i * 0.95, m.body_x1 + 0.95 + i * 0.95, W / 2, zc, m.d / 2 + 0.12, M.gold, 24);
  antenna(g, 'x', m.bar_x1, 1, 50, 8.5, W / 2, zc, '#232326');
  var cols = [['black', 'grey', 'yellow', 'white'], ['red', 'purple', 'green', 'grey']], pins = [];
  s.hdr_x.forEach(function (x, ci) { s.hdr_y.forEach(function (y, ri) { pins.push({ x: x, y: y, color: WC[cols[ci][ri]] }); }); });
  header(g, pins, t, -1, p.wiring === 'solder' ? 'solder' : 'dupont');
};

/* ================= PN532 V3 ================= */
B.pn532 = function (g, s) {
  var L = s.L, W = s.W, t = s.t;
  var top = APP.tex(L, W, s.color, function (c, k) {
    var i = s.band_in, w = s.band_w;
    c.fillStyle = '#f7f5ef'; c.beginPath(); rr(c, i * k, i * k, (L - 2 * i) * k, (W - 2 * i) * k, 3.5 * k); c.fill();
    c.fillStyle = s.color; c.beginPath(); rr(c, (i + w) * k, (i + w) * k, (L - 2 * i - 2 * w) * k, (W - 2 * i - 2 * w) * k, 2.5 * k); c.fill();
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 2.4);
    s.i2c_y.forEach(function (y, n) { APP.padHole(c, k, s.i2c_x, y, 1.7, 1.0, n === 0); APP.text(c, k, s.i2c_labels[n], s.i2c_x + 1.6, y, 1.05, '#fff', 'left'); });
    s.spi_labels.forEach(function (n, q) { var x = s.spi_x0 + q * P; APP.padHole(c, k, x, s.spi_y, 1.7, 1.0, q === 0); APP.text(c, k, n, x, s.spi_y - 3.3, 0.85, '#fff', 'center', Math.PI / 2); });
    for (var q = 0; q < 10; q++) APP.padHole(c, k, 15 + q * 1.27, 6.2, 0.9, 0.5);
    APP.text(c, k, 'HSU 0 0', 9.5, 4.2, 0.8, '#fff', 'left'); APP.text(c, k, 'I2C 1 0', 9.5, 3.2, 0.8, '#fff', 'left'); APP.text(c, k, 'SPI 0 1', 9.5, 2.2, 0.8, '#fff', 'left');
    APP.text(c, k, 'PWR', 18, 14, 0.9, '#fff');
  });
  var bot = APP.tex(L, W, s.color, function (c, k) {
    APP.text(c, k, 'NFC MODULE V3', L / 2, W - 6, 2.2, '#fff'); APP.text(c, k, 'ELECHOUSE', L - 5, W / 2, 1.4, '#fff', 'center', Math.PI / 2);
    s.holes.forEach(function (h) { APP.padHole(c, k, L - h[0], h[1], s.hole_d + 2.4, s.hole_d); });
  });
  APP.pcb(g, L, W, t, s.color, top, bot);
  chip(g, s.chip.x, s.chip.y, s.chip.s, s.chip.s, s.chip.h, t, true);
  box(g, s.xtal.x - 2.5, s.xtal.y - 1.6, t, s.xtal.x + 2.5, s.xtal.y + 1.6, t + 1.1, M.silver);
  box(g, s.dip.x - s.dip.lx / 2, s.dip.y - s.dip.ly / 2, t, s.dip.x + s.dip.lx / 2, s.dip.y + s.dip.ly / 2, t + s.dip.h, mat('#1c1c1c', 0.6, 0));
  box(g, s.dip.x - 1.8, s.dip.y - 1.4, t + s.dip.h, s.dip.x - 0.6, s.dip.y - 0.2, t + s.dip.h + 0.4, mat('#f0c93a', 0.5, 0));  // switch 1 OFF
  box(g, s.dip.x + 0.6, s.dip.y + 0.2, t + s.dip.h, s.dip.x + 1.8, s.dip.y + 1.4, t + s.dip.h + 0.4, mat('#f0c93a', 0.5, 0));  // switch 2 ON (SPI)
  smd(g, [[30, 25], [31.5, 21], [31.5, 18], [33, 24], [20, 29], [28, 30], [12, 19], [14, 16.5], [22, 14]], t, 1.6, 0.8, 0.5);
  header(g, s.i2c_y.map(function (y, n) { return { x: s.i2c_x, y: y, color: WC[['black', 'red', 'blue', 'yellow'][n]] }; }), t, 1, 'dupont');
  header(g, s.spi_labels.map(function (_, i) { return {x:s.spi_x0+i*2.54,y:s.spi_y,color:WC[['yellow','white','green','purple','red','black','grey','orange'][i]]}; }), t, 1, 'dupont');
};
function rr(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

/* ================= microSD reader ================= */
B.sdcard = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, so = s.socket;
  var top = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 1.4);
    s.hdr_y.forEach(function (y, i) { APP.padHole(c, k, s.hdr_x, y, 1.7, 1.0, i === 0); APP.text(c, k, s.pin_labels[i], s.hdr_x - 2.2, y, 1.0, '#fff', 'right'); });
    ['C1', 'C2', 'R1', 'R2', 'U1'].forEach(function (n, i) { APP.text(c, k, n, 20 + i * 3.4, 22.3, 0.8, '#d7e2f5'); });
  });
  var bot = APP.tex(L, W, s.color, function (c, k) { APP.text(c, k, 'MicroSD Card', L / 2, W / 2 + 2, 2.0, '#fff'); APP.text(c, k, 'MH', L / 2, W / 2 - 2, 1.6, '#fff'); });
  APP.pcb(g, L, W, t, s.color, top, bot);
  box(g, so.x0, so.y0, t, so.x1, so.y1, t + so.h, M.silver);
  box(g, so.x0 + 1, so.y0 + 1, t + so.h, so.x1 - 1, so.y1 - 1, t + so.h + 0.02, mat('#aeb3b8', 0.4, 0.7));
  box(g, -2.2, so.y0 + 2.2, t + 0.35, so.x1 - 1.5, so.y1 - 2.2, t + 1.3, mat('#111317', 0.5, 0));    // card, pushed in
  chip(g, s.lvc.x, s.lvc.y, s.lvc.lx, s.lvc.ly, s.lvc.h, t, true);
  chip(g, s.ldo.x, s.ldo.y, s.ldo.lx, s.ldo.ly, s.ldo.h, t, true);
  smd(g, [[21, 19.5], [21, 16], [33, 20], [33, 4], [23, 3], [34, 11]], t, 1.6, 0.8, 0.6);
  rheader(g, s.hdr_y, s.hdr_x + 2.6, 1, t, ['purple', 'yellow', 'green', 'white', 'red', 'black'].map(function (c) { return WC[c]; }),
    p.wiring === 'solder' ? 'solder' : 'dupont');
};

/* ================= IR modules ================= */
B.ir_tx = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, led = s.led;
  var top = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 1.4);
    s.pins_y.forEach(function (y, i) { APP.padHole(c, k, s.pins_x, y, 1.6, 1.0, i === 0); APP.text(c, k, s.pin_labels[i], s.pins_x - 2.4, y, 1.1, '#fff'); });
    APP.padHole(c, k, led.lead_x, W / 2 - 1.27, 1.6, 1.0, true); APP.padHole(c, k, led.lead_x, W / 2 + 1.27, 1.6, 1.0);
    APP.text(c, k, 'KY-005', 9.5, 2.2, 1.0, '#fff');
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  var clear = mat('#dfe9f2', 0.08, 0, { transparent: true, opacity: 0.55 });
  cyl(g, 'x', led.x1 - 1.0, led.x1, W / 2, led.axis_z, led.flange / 2, clear, 24);
  cyl(g, 'x', led.x0 + 2.5, led.x1 - 1.0, W / 2, led.axis_z, led.d / 2, clear, 24);
  var tip = new T.Mesh(new T.SphereGeometry(led.d / 2, 20, 12), clear); tip.position.set(led.x0 + 2.5, W / 2, led.axis_z); g.add(tip);
  [-1.27, 1.27].forEach(function (dy) {
    box(g, led.x1, W / 2 + dy - 0.25, led.axis_z - 0.25, led.lead_x, W / 2 + dy + 0.25, led.axis_z + 0.25, M.tin);
    box(g, led.lead_x - 0.25, W / 2 + dy - 0.25, 0, led.lead_x + 0.25, W / 2 + dy + 0.25, led.axis_z + 0.25, M.tin);
  });
  rheader(g, s.pins_y, L - 0.2, 1, t, ['black', 'red', 'green'].map(function (c) { return WC[c]; }), p.wiring === 'solder' ? 'solder' : 'dupont');
};
B.ir_rx = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t, r = s.rx;
  var top = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 1.4);
    s.pins_y.forEach(function (y, i) { APP.padHole(c, k, s.pins_x, y, 1.6, 1.0, i === 0); APP.text(c, k, s.pin_labels[i], s.pins_x + 2.6, y, 1.1, '#fff'); });
    APP.text(c, k, 'KY-022', 9.5, 1.8, 1.0, '#fff');
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  var z0 = t + r.legs;
  [-1.27, 0, 1.27].forEach(function (dy) { box(g, r.x - 0.2, r.y + dy - 0.2, t, r.x + 0.2, r.y + dy + 0.2, z0, M.tin); });
  box(g, r.x - r.d / 2, r.y - r.w / 2, z0, r.x + r.d / 2 - 1.2, r.y + r.w / 2, z0 + r.h, mat('#101114', 0.35, 0));
  var lens = new T.Mesh(new T.SphereGeometry(2.4, 20, 12, 0, Math.PI), mat('#0b0c0f', 0.15, 0));
  lens.rotation.z = -Math.PI / 2; lens.position.set(r.x + r.d / 2 - 1.2, r.y, z0 + r.h / 2 + 0.3); g.add(lens);
  box(g, r.x - r.d / 2 - 0.35, r.y - r.w / 2 - 0.3, z0 + 0.6, r.x - r.d / 2, r.y + r.w / 2 + 0.3, z0 + r.h + 0.3, M.silver);   // bracket
  box(g, r.x - r.d / 2 - 0.35, r.y - r.w / 2 - 0.3, z0 + r.h, r.x + r.d / 2 - 1.0, r.y + r.w / 2 + 0.3, z0 + r.h + 0.35, M.silver);
  box(g, 15.2, 10.8, t, 16.8, 11.6, t + 0.6, mat('#39c46b', 0.3, 0, { emissive: '#39c46b', emissiveIntensity: 0.3 }));
  rheader(g, s.pins_y, 0.2, -1, t, ['blue', 'red', 'black'].map(function (c) { return WC[c]; }), p.wiring === 'solder' ? 'solder' : 'dupont');
};

/* ================= GPS + patch ================= */
B.gps = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t;
  var top = APP.tex(L, W, s.color, function (c, k) {
    holesArt(c, k, s.holes, s.hole_d, s.hole_d + 2.2);
    s.hdr_x.forEach(function (x, i) { APP.padHole(c, k, x, s.hdr_y, 1.7, 1.0, i === 0); APP.text(c, k, s.pin_labels[i], x, s.hdr_y - 2.4, 0.95, '#fff'); });
    APP.text(c, k, 'GY-GPS6MV2', L - 1.4, W / 2, 1.3, '#fff', 'center', -Math.PI / 2);
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  var n = s.neo;
  var neoTex = APP.tex(n.lx, n.ly, '#c6cacd', function (c, k) {
    APP.text(c, k, 'u-blox', 3.4, n.ly - 2.2, 1.3, '#b0282c', 'left'); APP.text(c, k, 'NEO-6M-0-001', 1.2, n.ly - 4.8, 1.05, '#333', 'left');
    c.fillStyle = '#222'; c.fillRect((n.lx - 4.6) * k, 2 * k, 3.4 * k, 3.4 * k);
  }, 16);
  var nm = new T.Mesh(new T.BoxGeometry(n.lx, n.ly, n.h), [M.silver, M.silver, M.silver, M.silver,
    new T.MeshStandardMaterial({ map: neoTex, roughness: 0.35, metalness: 0.6 }), M.silver]);
  nm.position.set(n.x, n.y, t + n.h / 2); g.add(nm);
  cyl(g, 'z', t, t + s.batt.h, s.batt.x, s.batt.y, s.batt.d / 2, M.silver, 28);
  box(g, s.ufl.x - 1.3, s.ufl.y - 1.3, t, s.ufl.x + 1.3, s.ufl.y + 1.3, t + 1.25, M.gold);
  box(g, 20.5, 26, t, 22.5, 27.5, t + 0.6, mat('#39c46b', 0.3, 0, { emissive: '#39c46b', emissiveIntensity: 0.3 }));
  smd(g, [[6, 17.5], [6, 13], [20, 30], [10, 30], [16, 30]], t, 1.8, 2.2, 1.0, M.darkChip);
  header(g, s.hdr_x.map(function (x, i) { return { x: x, y: s.hdr_y, color: WC[['red', 'blue', 'green', 'black'][i]] }; }), t, -1,
    p.wiring === 'solder' ? 'solder' : 'dupont');
};
B.gps_ant = function (g, s) {
  var L = s.L, W = s.W, t = s.t;
  box(g, 0, 0, 0, L, W, t, mat(s.color, 0.6, 0.05));
  box(g, 0.3, 0.3, t, L - 0.3, W - 0.3, t + s.ceramic, mat('#d9b58f', 0.7, 0));
  box(g, 3.5, 3.5, t + s.ceramic, L - 3.5, W - 3.5, t + s.ceramic + 0.05, mat('#e9e7e1', 0.35, 0.5));
  cyl(g, 'z', t + s.ceramic, t + s.ceramic + 0.4, s.feed[0], s.feed[1], 0.9, M.solder, 16);
  cyl(g, 'z', -1.2, 0, L / 2, W / 2, 1.4, mat('#1a1a1a', 0.6, 0), 12);
};

/* ================= 18650 + holder ================= */
B.battery = function (g, s) {
  var L = s.L, W = s.W, h = s.t, pl = mat('#141517', 0.75, 0);
  box(g, 0, 0, 0, L, W, 1.2, pl);
  box(g, 3.2, 0, 1.2, L - 3.2, 1.3, 12.5, pl); box(g, 3.2, W - 1.3, 1.2, L - 3.2, W, 12.5, pl);
  box(g, 0, 0, 0, 3.2, W, h, pl); box(g, L - 3.2, 0, 0, L, W, h, pl);
  box(g, 22, 0, 12.5, 52, 1.3, 14.5, pl); box(g, 22, W - 1.3, 12.5, 52, W - 0, 14.5, pl);
  var zc = s.floor + s.cell_d / 2, cx0 = (L - s.cell_l) / 2;
  var C = Math.PI * s.cell_d;   // canvas: x = around the cell, y = along it
  var wrap = APP.tex(C, s.cell_l, '#e0722c', function (c, k) {
    c.fillStyle = '#f4f1ea'; c.fillRect(0, 0, C * k, 11 * k);
    APP.text(c, k, 'ORION', C * 0.25, s.cell_l * 0.56, 6, '#fff', 'center', Math.PI / 2, '700');
    APP.text(c, k, '18650  2200mAh  3.7V', C * 0.25 + 6.5, s.cell_l * 0.56, 2.6, '#fff', 'center', Math.PI / 2);
    APP.text(c, k, 'Li-ion', C * 0.25, 5.5, 3, '#e0722c');
  }, 8);
  var cell = new T.Mesh(new T.CylinderGeometry(s.cell_d / 2, s.cell_d / 2, s.cell_l - 1, 40, 1, true),
    new T.MeshStandardMaterial({ map: wrap, roughness: 0.45, metalness: 0.05 }));
  cell.rotation.z = -Math.PI / 2; cell.position.set(cx0 + s.cell_l / 2, W / 2, zc); g.add(cell);
  cyl(g, 'x', cx0, cx0 + 0.5, W / 2, zc, s.cell_d / 2 - 0.2, M.silver, 40);
  cyl(g, 'x', cx0 + s.cell_l - 0.5, cx0 + s.cell_l, W / 2, zc, s.cell_d / 2 - 0.2, M.silver, 40);
  cyl(g, 'x', cx0 + s.cell_l, cx0 + s.cell_l + 1.0, W / 2, zc, 3.5, M.silver, 24);
  // spring at the negative end, flat tab at the positive end
  var pts = [], turns = 4.5, len = cx0 - 3.2;
  for (var i = 0; i <= 160; i++) { var a = i / 160; pts.push(new T.Vector3(3.2 + a * len, W / 2 + Math.cos(a * turns * 2 * Math.PI) * (5.5 - a * 2),
    zc + Math.sin(a * turns * 2 * Math.PI) * (5.5 - a * 2))); }
  g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 200, 0.45, 8), M.silver));
  box(g, L - 3.6, W / 2 - 3.5, zc - 3.5, L - 3.2, W / 2 + 3.5, zc + 3.5, M.silver);
  wire(g, 'x', -6, 0, W / 2, 3.5, 'black'); wire(g, 'x', L, L + 6, W / 2, 3.5, 'red');
};

/* ================= TP4056 ================= */
B.tp4056 = function (g, s, p) {
  var L = s.L, W = s.W, t = s.t;
  var top = APP.tex(L, W, s.color, function (c, k) {
    s.pads.forEach(function (q) { c.fillStyle = '#d6b25a'; c.fillRect((L - 3.4) * k, (q.y - 1.3) * k, 3.0 * k, 2.6 * k);
      c.fillStyle = '#0b0c0d'; c.beginPath(); c.arc((L - 1.9) * k, q.y * k, 0.55 * k, 0, 7); c.fill();
      APP.text(c, k, q.n, L - 5.4, q.y, 1.0, '#fff', 'right'); });
    [[2.2, 'IN-'], [W - 2.2, 'IN+']].forEach(function (q) { c.fillStyle = '#d6b25a'; c.fillRect(8.6 * k, (q[0] - 1.1) * k, 2.4 * k, 2.2 * k);
      APP.text(c, k, q[1], 12.9, q[0], 0.9, '#fff'); });
    APP.text(c, k, 'TYPE-C  TP4056', 17, 1.2, 0.9, '#d7e2f5');
  });
  APP.pcb(g, L, W, t, s.color, top, null);
  usbC(g, -s.usb_over, s.usb_l - s.usb_over, W / 2, s.usb_w, s.usb_h, t);
  s.ics.forEach(function (q) { chip(g, q.x, q.y, q.lx, q.ly, q.h, t, true); });
  box(g, 9.2, 13.2, t, 10.8, 14.0, t + 0.6, mat('#ff4d4d', 0.3, 0, { emissive: '#ff4d4d', emissiveIntensity: 0.4 }));
  box(g, 9.2, 3.3, t, 10.8, 4.1, t + 0.6, mat('#4d8dff', 0.3, 0, { emissive: '#4d8dff', emissiveIntensity: 0.4 }));
  smd(g, [[17, 14.6], [17, 2.7], [24.5, 9.5], [9.8, 8.6]], t, 1.6, 0.8, 0.55);
  s.pads.forEach(function (q) { var c = q.n.indexOf('+') >= 0 ? 'red' : 'black';
    box(g, L - 2.6, q.y - 0.6, t, L - 1.2, q.y + 0.6, t + 0.5, M.solder); wire(g, 'x', L - 1.9, L + 4, q.y, t + 0.9, c); });
};

/* ================= 400-point breadboard ================= */
B.breadboard = function (g, s) {
  var L = s.L, W = s.W, t = s.t;
  var art = APP.tex(L, W, '#f6f5ef', function (c, k) {
    c.fillStyle = '#e9e7df'; c.fillRect(0, (W / 2 - 1.8) * k, L * k, 3.6 * k);           // centre channel
    [[s.rail_y[0] - 1.6, '#2b62c9'], [s.rail_y[1] + 1.6, '#d33a2c'], [s.rail_y[2] - 1.6, '#2b62c9'], [s.rail_y[3] + 1.6, '#d33a2c']]
      .forEach(function (r) { c.fillStyle = r[1]; c.fillRect(3 * k, (r[0] - 0.18) * k, (L - 6) * k, 0.36 * k); });
    c.fillStyle = '#2d2f33';
    for (var i = 0; i < s.cols; i++) {
      var x = s.col_x0 + i * P;
      s.row_y.forEach(function (y) { c.fillRect((x - 0.55) * k, (y - 0.55) * k, 1.1 * k, 1.1 * k); });
      if (i % 6 !== 5) s.rail_y.forEach(function (y) { c.fillRect((x - 0.55) * k, (y - 0.55) * k, 1.1 * k, 1.1 * k); });
      if (i % 5 === 0 || i === s.cols - 1) { APP.text(c, k, String(i + 1), x, s.row_y[0] - 2.2, 1.1, '#8c8e92'); APP.text(c, k, String(i + 1), x, s.row_y[9] + 2.2, 1.1, '#8c8e92'); }
    }
    'abcdefghij'.split('').forEach(function (ch, j) { APP.text(c, k, ch, 2.2, s.row_y[j], 1.1, '#8c8e92'); APP.text(c, k, ch, L - 2.2, s.row_y[j], 1.1, '#8c8e92'); });
    APP.text(c, k, '+', 1.6, s.rail_y[1], 1.6, '#d33a2c'); APP.text(c, k, '−', 1.6, s.rail_y[0], 1.6, '#2b62c9');
    APP.text(c, k, '+', 1.6, s.rail_y[3], 1.6, '#d33a2c'); APP.text(c, k, '−', 1.6, s.rail_y[2], 1.6, '#2b62c9');
  }, 10);
  var side = mat('#ecebe4', 0.75, 0);
  var m = new T.Mesh(new T.BoxGeometry(L, W, t), [side, side, side, side, new T.MeshStandardMaterial({ map: art, roughness: 0.75 }), side]);
  m.position.set(L / 2, W / 2, t / 2); g.add(m);
  // dovetail tabs on the ends, the "interlocking parts"
  [W * 0.3, W * 0.7].forEach(function (y) { box(g, -1.6, y - 2, 1, 0, y + 2, t - 1, side); box(g, L, y - 2.4, 1, L + 0.1, y + 2.4, t - 1, mat('#dcdad2', 0.8, 0)); });
};

/* ================= slide switch ================= */
B['switch'] = function (g, s) {
  box(g, 0, 0, 0, s.L, s.W, s.t - 0.6, mat('#1b1c1f', 0.6, 0));
  box(g, -0.2, -0.2, s.t - 0.6, s.L + 0.2, s.W + 0.2, s.t, M.silver);
  box(g, s.L / 2 - 0.75 - 1, s.W / 2 - 0.75, s.t, s.L / 2 + 0.75 - 1, s.W / 2 + 0.75, s.t + s.knob[2], mat('#0e0e10', 0.5, 0));
  [1.5, s.L / 2, s.L - 1.5].forEach(function (x) { box(g, x - 0.25, s.W / 2 - 0.4, -3.5, x + 0.25, s.W / 2 + 0.4, 0, M.tin); });
};
})();
