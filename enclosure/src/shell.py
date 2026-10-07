"""Printable enclosure: a back tub (back cover + walls) and a front plate.

All positions come from layout.py, so moving a part moves its opening.
Units mm, same world frame as layout.py.
"""
import math
import numpy as np
from manifold3d import Manifold, CrossSection, JoinType

import layout as L
from parts import SPECS

W, H, D = L.W, L.H, L.D
WALL, BACK, FRONT = L.WALL, L.BACK, L.FRONT
RO = 6.0                       # outer corner radius (plan view)
RI = 2.3                       # inner corner radius (small: boards reach the corners)
FIT = 0.2                      # clearance for sliding fits
SEG = 64

LUG_R = 3.0
LUGS = [(3.0, 3.0), (W - 3.0, 3.0), (3.0, H - 3.0), (W - 3.0, H - 3.0)]
LUG_Z0 = 34.0                  # lugs start here (clear of the parts below)
PILOT_M25 = 2.2                # M2.5 self-tapping into PLA/PETG


def lug_z0(y):
    """Bottom lugs start above the joystick board, top lugs above the radios."""
    return D - 11.5 if y < H / 2 else LUG_Z0
PILOT_M3 = 2.6                 # M3 self-tapping


# ---------------------------------------------------------------- helpers
def cube(x0, y0, z0, x1, y1, z1):
    return Manifold.cube((x1 - x0, y1 - y0, z1 - z0)).translate((x0, y0, z0))


def rrect(x0, y0, x1, y1, r):
    r = max(0.01, min(r, (x1 - x0) / 2 - 0.01, (y1 - y0) / 2 - 0.01))
    cs = CrossSection.square((x1 - x0 - 2 * r, y1 - y0 - 2 * r)).offset(r, JoinType.Round, circular_segments=SEG)
    return cs.translate((x0 + r, y0 + r))


def slab(cs, z0, z1):
    return Manifold.extrude(cs, z1 - z0).translate((0, 0, z0))


def cyl_z(x, y, z0, z1, r, r2=None, seg=SEG):
    return Manifold.cylinder(z1 - z0, r, r if r2 is None else r2, seg).translate((x, y, z0))


def cyl_y(x, z, y0, y1, r, seg=SEG):
    # cylinder along +y from y0 to y1, centred on (x, z)
    return Manifold.cylinder(y1 - y0, r, r, seg).rotate((-90, 0, 0)).translate((x, y0, z))


def cyl_x(y, z, x0, x1, r, seg=SEG):
    return Manifold.cylinder(x1 - x0, r, r, seg).rotate((0, 90, 0)).translate((x0, y, z))


def stadium_y(x, z, w, h, y0, y1):
    """Rounded slot through a wall normal to y: w along x, h along z."""
    cs = rrect(-w / 2, -h / 2, w / 2, h / 2, min(w, h) / 2 - 0.01)
    return Manifold.extrude(cs, y1 - y0).rotate((90, 0, 0)).translate((x, y1, z))


def stadium_x(y, z, w, h, x0, x1):
    """Rounded slot through a wall normal to x: w along y, h along z."""
    cs = rrect(-h / 2, -w / 2, h / 2, w / 2, min(w, h) / 2 - 0.01)   # (z, y) before rotation
    return Manifold.extrude(cs, x1 - x0).rotate((0, 90, 0)).translate((x0, y, z))


def filleted_block(z0, z1, r, side):
    """Outer plan shape extruded z0..z1 with a rounded edge of radius r at the
    `side` end ('lo' or 'hi')."""
    parts = []
    steps = 6
    for i in range(steps + 1):
        a = (math.pi / 2) * i / steps
        inset = r * (1 - math.cos(a))
        dz = r * (1 - math.sin(a))
        z = z0 + dz if side == 'lo' else z1 - dz
        cs = rrect(-WALL + inset, -WALL + inset, W + WALL - inset, H + WALL - inset, RO - inset)
        parts.append(slab(cs, z - 0.01, z + 0.01))
    far = slab(rrect(-WALL, -WALL, W + WALL, H + WALL, RO),
               z0 + r if side == 'lo' else z0, z1 if side == 'lo' else z1 - r)
    return Manifold.batch_hull(parts + [far])


def wpt(pid, local):
    p = next(q for q in L.PLACEMENTS if q['id'] == pid)
    return L.rot(p['rot']) @ np.asarray(local, float) + np.asarray(p['at'], float)


# ------------------------------------------------------------ feature list
def features():
    """Every opening and mount, in world coordinates. Used for the geometry
    AND exported for the dimensioned drawings."""
    f = {}
    e = SPECS['esp32']
    f['usb_esp'] = [dict(name=u['name'], x=float(wpt('esp32', (3.0, u['y'], e['t'] + e['usb_h'] / 2))[0]),
                         z=float(wpt('esp32', (3.0, u['y'], e['t'] + e['usb_h'] / 2))[2])) for u in e['usb']]
    tp = SPECS['tp4056']
    c = wpt('tp4056', (3.0, tp['W'] / 2, tp['t'] + tp['usb_h'] / 2))
    f['usb_tp'] = dict(name='Charge (TP4056)', x=float(c[0]), z=float(c[2]))
    s = SPECS['sdcard']
    c = wpt('sdcard', (0.0, (s['socket']['y0'] + s['socket']['y1']) / 2, s['t'] + 0.8))
    f['sd'] = dict(x=float(c[0]), z=float(c[2]), w=12.6, h=2.4)
    c = wpt('nrf24', (45.0, SPECS['nrf24']['W'] / 2, SPECS['nrf24']['sma']['axis_z']))
    f['sma_nrf'] = dict(x=float(c[0]), z=float(c[2]), d=6.8)
    c = wpt('cc1101', (36.0, SPECS['cc1101']['W'] / 2, SPECS['cc1101']['t'] / 2))
    f['sma_cc'] = dict(x=float(c[0]), z=float(c[2]), d=6.8, pocket=7.0, pocket_d=1.0)
    t = SPECS['ir_tx']
    c = wpt('ir_tx', (-5.0, t['W'] / 2, t['led']['axis_z']))
    f['ir_tx'] = dict(x=float(c[0]), z=float(c[2]), d=5.3)
    r = SPECS['ir_rx']['rx']
    c = wpt('ir_rx', (14.0, r['y'], SPECS['ir_rx']['t'] + r['legs'] + r['h'] / 2))
    f['ir_rx'] = dict(x=float(c[0]), z=float(c[2]), d=7.0)
    sw = SPECS['switch']
    c = wpt('switch', (sw['L'] / 2, sw['W'] / 2, sw['t']))
    f['switch'] = dict(y=float(c[1]), z=float(c[2]), w=sw['knob'][0] + sw['travel'] + 0.9, h=2.1)
    f['buttons'] = [dict(name=b['name'], x=float(wpt('esp32', (b['x'], b['y'], 0))[0]),
                         y=float(wpt('esp32', (b['x'], b['y'], 0))[1])) for b in e['buttons']]
    dsp = SPECS['display']
    va = dsp['va']
    a, b = wpt('display', (va['x0'], va['y0'], 0)), wpt('display', (va['x1'], va['y1'], 0))
    f['window'] = dict(x0=float(a[0]), y0=float(a[1]), x1=float(b[0]), y1=float(b[1]))
    g = dsp['glass']
    a, b = wpt('display', (g['x0'], g['y0'], 0)), wpt('display', (g['x1'], g['y1'], 0))
    f['glass'] = dict(x0=float(a[0]) - FIT, y0=float(a[1]) - FIT, x1=float(b[0]) + FIT, y1=float(b[1]) + FIT, depth=0.6)
    pcb_front = float(wpt('display', (0, 0, dsp['t']))[2])
    f['disp_standoffs'] = [dict(x=float(wpt('display', (hx, hy, 0))[0]), y=float(wpt('display', (hx, hy, 0))[1]),
                                z0=pcb_front) for hx, hy in dsp['holes']]
    c = dsp['sd_card']
    mid = wpt('display', (0.0, c['y'], -0.05 - c['t'] / 2))
    tip = wpt('display', (c['x_in'] - c['l'], c['y'], 0))
    f['sd_big'] = dict(y=float(mid[1]), z=float(mid[2]), w=c['w'] + 6.0, h=c['t'] + 0.9, card_out=float(-WALL - tip[0]))
    j = SPECS['joystick']
    c = wpt('joystick', (j['stick'][0], j['stick'][1], 0))
    f['joy_hole'] = dict(x=float(c[0]), y=float(c[1]), d=29.0)
    jtop = float(wpt('joystick', (0, 0, j['t']))[2])
    jbot = float(wpt('joystick', (0, 0, 0))[2])
    f['joy_standoffs'] = [dict(x=float(wpt('joystick', (hx, hy, 0))[0]), y=float(wpt('joystick', (hx, hy, 0))[1]),
                               z0=jtop) for hx, hy in j['holes'] if hx < 10]
    f['joy_hooks'] = [dict(x=float(wpt('joystick', (j['L'], hy, 0))[0]), y=float(wpt('joystick', (j['L'], hy, 0))[1]),
                           zb=jbot) for hy in (4.5, j['W'] - 4.5)]
    pn = SPECS['pn532']
    f['pn_pegs'] = [dict(x=float(wpt('pn532', (hx, hy, 0))[0]), y=float(wpt('pn532', (hx, hy, 0))[1]),
                         z=float(wpt('pn532', (0, 0, 0))[2])) for hx, hy in pn['holes']]
    a, b = wpt('pn532', (0, 0, 0)), wpt('pn532', (pn['L'], pn['W'], 0))
    f['nfc'] = dict(x0=float(min(a[0], b[0])), y0=float(min(a[1], b[1])), x1=float(max(a[0], b[0])), y1=float(max(a[1], b[1])))
    gp = SPECS['gps']
    gz = float(min(wpt('gps', (0, 0, 0))[2], wpt('gps', (0, 0, gp['t']))[2]))   # face towards the back
    f['gps_posts'] = [dict(x=float(wpt('gps', (hx, hy, 0))[0]), y=float(wpt('gps', (hx, hy, 0))[1]), z=gz)
                      for hx, hy in gp['holes'] if hx == 3.0]
    f['battery_pocket'] = dict(nominal_length=SPECS['battery']['L'],
                               extra_length=L.BATTERY_EXTRA_LENGTH,
                               clear_length=SPECS['battery']['L'] + L.BATTERY_EXTRA_LENGTH + 2 * FIT,
                               width=SPECS['battery']['W'] + 2 * FIT)
    return f


# ------------------------------------------------------------------ tub
def build_tub(f):
    body = filleted_block(-BACK, D, 2.0, 'lo')
    cavity = slab(rrect(0, 0, W, H, RI), 0, D + 1)
    tub = body - cavity

    add = []
    # screw lugs for the front plate
    for (x, y) in LUGS:
        cx = 0 if x < W / 2 else W
        cy = 0 if y < H / 2 else H
        z0 = lug_z0(y)
        corner = cube(min(cx, x), min(cy, y), z0, max(cx, x), max(cy, y), D)
        lug = Manifold.batch_hull([cyl_z(x, y, z0 + 3.0, D, LUG_R),
                                   cube(cx - 0.5 if cx else 0, cy - 0.5 if cy else 0, z0,
                                        (cx + 0.5) if cx else 0.5, (cy + 0.5) if cy else 0.5, D),
                                   corner])
        add.append(lug)

    # ESP32 cradle: pad under the WROOM can, pad under the USB shells, end stops
    e = SPECS['esp32']
    m = e['module']
    a = wpt('esp32', (m['can_x0'] + 2, m['y0'] + 2, 0)); b = wpt('esp32', (m['can_x1'] - 2, m['y1'] - 2, 0))
    can_z = float(wpt('esp32', (0, 0, e['t'] + m['pcb'] + m['can_h']))[2])
    add.append(cube(min(a[0], b[0]), min(a[1], b[1]), 0, max(a[0], b[0]), max(a[1], b[1]), can_z - 0.15))
    usb_z = float(wpt('esp32', (0, 0, e['t'] + e['usb_h']))[2])
    ys = [u['y'] for u in e['usb']]
    a = wpt('esp32', (1.0, min(ys) - 4, 0)); b = wpt('esp32', (6.0, max(ys) + 4, 0))
    add.append(cube(min(a[0], b[0]), min(a[1], b[1]), 0, max(a[0], b[0]), max(a[1], b[1]), usb_z - 0.15))
    end_y = float(wpt('esp32', (e['L'] + 0.3, 0, 0))[1])
    x0 = float(wpt('esp32', (0, 0, 0))[0])
    for (u0, u1) in ((0.6, 4.2), (e['W'] - 4.2, e['W'] - 0.6)):
        add.append(cube(x0 + u0, end_y, 0, x0 + u1, end_y + 2.0, 7.4))

    # TP4056 channel (PCB stands on edge)
    p = next(q for q in L.PLACEMENTS if q['id'] == 'tp4056')
    px = p['at'][0]
    tp = SPECS['tp4056']
    y0, y1 = p['at'][1] + 8.5, p['at'][1] + 24.5
    add.append(cube(px - 1.9, y0, 0, px - FIT, y1, 3.2))                 # ESP32 side rail
    add.append(cube(px + tp['t'] + FIT, y0, 0, px + tp['t'] + 1.9, y1, 1.8))
    add.append(cube(px - 1.9, p['at'][1] + tp['L'] + 0.3, 0, px + tp['t'] - FIT, p['at'][1] + tp['L'] + 2.0, 1.2))

    # battery holder: side rail + two end stops that leave the lead exits free
    pb = next(q for q in L.PLACEMENTS if q['id'] == 'battery')
    bx0 = pb['at'][0] - SPECS['battery']['W']
    by0, by1 = pb['at'][1], pb['at'][1] + SPECS['battery']['L'] + L.BATTERY_EXTRA_LENGTH
    add.append(cube(bx0 - 1.6 - FIT, by0 + 8, 0, bx0 - FIT, by1 - 8, 6.0))
    add.append(cube(pb['at'][0] + FIT, by0 + 8, 0, pb['at'][0] + 1.6 + FIT, by1 - 8, 6.0))
    for (u0, u1) in ((bx0 + 1.0, bx0 + 5.5), (pb['at'][0] - 5.5, pb['at'][0] - 1.0)):
        add.append(cube(u0, by1 + FIT, 0, u1, by1 + 1.8, 5.0))
        add.append(cube(u0, by0 - 1.8, 0, u1, by0 - FIT, 5.0))

    # PN532: pads + locating pegs through its two holes
    for q in f['pn_pegs']:
        add.append(cyl_z(q['x'], q['y'], 0, q['z'], 2.8))
        add.append(cyl_z(q['x'], q['y'], q['z'], q['z'] + 1.6 + 1.2, 1.3, 1.1))

    # GPS: two posts with pegs through its right-hand holes
    for q in f['gps_posts']:
        add.append(cyl_z(q['x'], q['y'], 0, q['z'], 2.6))
        add.append(cyl_z(q['x'], q['y'], q['z'], q['z'] + 1.6 + 1.0, 1.3, 1.1))

    # GPS patch: block it rests on (patch lower edge), right of the PN532
    pa = next(q for q in L.PLACEMENTS if q['id'] == 'gps_ant')
    pz0 = pa['at'][2] - SPECS['gps_ant']['W']
    add.append(cube(f['nfc']['x1'] + 1.0, H - 6.5, 0, W, H, pz0))

    # SD reader: gusset shelf on the right wall + a post under the left edge
    sd = next(q for q in L.PLACEMENTS if q['id'] == 'sdcard')
    sdz = sd['at'][2]
    sy0, sy1 = sd['at'][1] + 7.5, sd['at'][1] + SPECS['sdcard']['L'] - 6.0   # clear of the holder end wall
    gus = Manifold.batch_hull([cube(W - 0.2, sy0, sdz - 5.5, W, sy1, sdz),
                               cube(sd['at'][0] - 1.2, sy0, sdz - 0.2, W, sy1, sdz)])
    add.append(gus)
    # Broad shelf above the cell, connected to the wall. This bridge needs
    # removable slicer supports; a floor post would run through the battery.
    add.append(cube(sd['at'][0] - SPECS['sdcard']['W'], sy0, sdz - 2,
                    W + 0.1, sy1, sdz))

    # breadboard: ledges with 45 deg gussets on both side walls + two posts
    bb = next(q for q in L.PLACEMENTS if q['id'] == 'breadboard')
    bs = SPECS['breadboard']
    bz = bb['at'][2]
    bx0, bx1 = bb['at'][0] - bs['W'], bb['at'][0]
    f['bb_supports'] = []
    for (xa, xb, ya, yb) in ((-0.15, bx0 + 2.0, bb['at'][1] + 2, 112.0),
                            (bx1 - 2.0, W, bb['at'][1] + 2, 112.0)):
        wall_x = 0.0 if xa < 0.0 else W
        deep = xb - xa
        add.append(Manifold.batch_hull([cube(xa, ya, bz - 1.6, xb, yb, bz),
                                        cube(wall_x - 0.1 if wall_x else 0, ya, bz - 1.6 - deep,
                                             wall_x if wall_x else 0.1, yb, bz)]))
        f['bb_supports'].append(dict(kind='ledge', x0=xa, x1=xb, y0=ya, y1=yb, z=bz))

    # power switch: two ribs either side of the body on the right wall
    swp = next(q for q in L.PLACEMENTS if q['id'] == 'switch')
    sw = SPECS['switch']
    zy0, zy1 = swp['at'][1], swp['at'][1] + sw['L']
    z0, z1 = swp['at'][2] - 1.2, swp['at'][2] + sw['W'] + 1.2
    for (a0, a1) in ((zy0 - 1.6, zy0 - FIT), (zy1 + FIT, zy1 + 1.6)):
        add.append(Manifold.batch_hull([cube(W - 4.0, a0, z0, W, a1, z1), cube(W - 0.2, a0, z0 - 4, W, a1, z1)]))

    tub = Manifold.batch_boolean([tub] + add, OpType_add())

    cut = []
    # lug pilot holes
    for (x, y) in LUGS:
        cut.append(cyl_z(x, y, D - 7.0, D + 1, PILOT_M25 / 2, seg=24))
    # bottom wall: ESP32 USB-C x2 (through + one shared pocket for plug overmolds)
    for u in f['usb_esp']:
        cut.append(stadium_y(u['x'], u['z'], 9.6, 3.9, -WALL - 1, 0.5))
    xs = [u['x'] for u in f['usb_esp']]
    zc = f['usb_esp'][0]['z']
    cut.append(stadium_y((min(xs) + max(xs)) / 2, zc, max(xs) - min(xs) + 12.6, 7.0, -WALL - 1, -WALL + 1.4))
    # bottom wall: TP4056 USB-C (on edge -> tall slot)
    t = f['usb_tp']
    cut.append(stadium_y(t['x'], t['z'], 3.9, 9.6, -WALL - 1, 0.5))
    cut.append(stadium_y(t['x'], t['z'], 7.0, 12.6, -WALL - 1, -WALL + 1.4))
    # bottom wall: microSD slot + thumb scoop
    s = f['sd']
    cut.append(cube(s['x'] - s['w'] / 2, -WALL - 1, s['z'] - s['h'] / 2, s['x'] + s['w'] / 2, 0.5, s['z'] + s['h'] / 2))
    cut.append(cyl_y(s['x'], s['z'] - 4.0, -WALL - 1, -WALL + 1.2, 7.0) ^ cube(s['x'] - 8, -WALL - 1, s['z'] - 12, s['x'] + 8, 0, s['z'] + s['h'] / 2))
    # Display is centred. Its optional full-size SD socket is internal only.
    # top wall: SMA x2, IR LED, IR receiver window
    n = f['sma_nrf']
    cut.append(cyl_y(n['x'], n['z'], H - 1, H + WALL + 1, n['d'] / 2))
    c = f['sma_cc']
    cut.append(cyl_y(c['x'], c['z'], H - 1, H + WALL + 1, c['d'] / 2))
    cut.append(cube(c['x'] - c['pocket'] / 2, H - 1, c['z'] - c['pocket'] / 2, c['x'] + c['pocket'] / 2, H + c['pocket_d'],
                    c['z'] + c['pocket'] / 2))
    cut.append(cyl_y(f['ir_tx']['x'], f['ir_tx']['z'], H - 1, H + WALL + 1, f['ir_tx']['d'] / 2))
    cut.append(cyl_y(f['ir_rx']['x'], f['ir_rx']['z'], H - 1, H + WALL + 1, f['ir_rx']['d'] / 2))
    # right wall: switch knob slot
    w = f['switch']
    cut.append(stadium_x(w['y'], w['z'], w['w'], w['h'], W - 1, W + WALL + 1))
    # back cover: BOOT / RST pinholes (press with a SIM tool) + countersink
    for b in f['buttons']:
        cut.append(cyl_z(b['x'], b['y'], -BACK - 1, 1, 1.1, seg=24))
        cut.append(cyl_z(b['x'], b['y'], -BACK - 0.01, -BACK + 0.8, 2.0, 1.2, seg=32))
    # back cover: NFC tap target (0.4 mm groove ring on the outside)
    n = f['nfc']
    ring = slab(rrect(n['x0'] + 2, n['y0'] + 2, n['x1'] - 2, n['y1'] - 2, 4), -BACK - 1, -BACK + 0.4) - \
        slab(rrect(n['x0'] + 3.2, n['y0'] + 3.2, n['x1'] - 3.2, n['y1'] - 3.2, 3), -BACK - 2, -BACK + 1)
    cut.append(ring)
    return Manifold.batch_boolean([tub] + cut, OpType_sub())


# ---------------------------------------------------------------- front plate
def build_front(f):
    plate = filleted_block(D, D + FRONT, 1.2, 'hi')
    # lip that drops inside the walls (interrupted at the lugs)
    lip = slab(rrect(FIT, FIT, W - FIT, H - FIT, RI - FIT), D - 2.0, D + 0.01) - \
        slab(rrect(1.4 + FIT, 1.4 + FIT, W - 1.4 - FIT, H - 1.4 - FIT, max(0.5, RI - 1.6)), D - 3, D + 1)
    for (x, y) in LUGS:
        lip = lip - cyl_z(x, y, D - 3, D + 1, LUG_R + 0.8)
    add = [plate, lip]
    # display standoffs
    for s in f['disp_standoffs']:
        add.append(cyl_z(s['x'], s['y'], s['z0'], D + 0.5, 2.5))
    # joystick standoffs (header side) and snap hooks (far corners)
    for s in f['joy_standoffs']:
        add.append(cyl_z(s['x'], s['y'], s['z0'], D + 0.5, 2.75))
    for hk in f['joy_hooks']:
        x, y, zb = hk['x'], hk['y'], hk['zb']
        # snap hook: flat top holds the PCB's back face, ramped underside lets it click in
        post = cube(x + 0.3, y - 2.0, zb - 1.7, min(x + 2.3, W - 0.15), y + 2.0, D + 0.5)
        lip2 = Manifold.batch_hull([cube(x - 0.4, y - 2.0, zb - 0.35, x + 0.3, y + 2.0, zb - 0.1),
                                    cube(x + 0.25, y - 2.0, zb - 1.7, x + 0.3, y + 2.0, zb - 0.1)])
        add.append(post + lip2)
    front = Manifold.batch_boolean(add, OpType_add())

    cut = []
    w = f['window']
    # display window with a 45 deg chamfer on the outside
    win = slab(rrect(w['x0'], w['y0'], w['x1'], w['y1'], 1.0), D - 1, D + FRONT + 1)
    cham = Manifold.batch_hull([slab(rrect(w['x0'], w['y0'], w['x1'], w['y1'], 1.0), D + FRONT - 1.0, D + FRONT - 0.99),
                                slab(rrect(w['x0'] - 1.0, w['y0'] - 1.0, w['x1'] + 1.0, w['y1'] + 1.0, 2.0),
                                     D + FRONT, D + FRONT + 0.5)])
    cut += [win, cham]
    g = f['glass']
    cut.append(slab(rrect(g['x0'], g['y0'], g['x1'], g['y1'], 0.6), D - 1, D + g['depth']))
    # joystick opening, chamfered
    j = f['joy_hole']
    cut.append(cyl_z(j['x'], j['y'], D - 1, D + FRONT + 1, j['d'] / 2, seg=128))
    cut.append(cyl_z(j['x'], j['y'], D + FRONT - 1.2, D + FRONT + 0.01, j['d'] / 2, j['d'] / 2 + 1.2, seg=128))
    # standoff pilot holes
    for s in f['disp_standoffs']:
        cut.append(cyl_z(s['x'], s['y'], s['z0'] - 1, s['z0'] + 5.0, PILOT_M3 / 2, seg=24))
    for s in f['joy_standoffs']:
        cut.append(cyl_z(s['x'], s['y'], s['z0'] - 1, s['z0'] + 8.0, PILOT_M3 / 2, seg=24))
    # countersunk M2.5 screw holes into the lugs
    for (x, y) in LUGS:
        cut.append(cyl_z(x, y, D - 3, D + FRONT + 1, 1.45, seg=24))
        cut.append(cyl_z(x, y, D + FRONT - 1.4, D + FRONT + 0.01, 1.45, 2.85, seg=32))
    return Manifold.batch_boolean([front] + cut, OpType_sub())


def OpType_add():
    from manifold3d import OpType
    return OpType.Add


def OpType_sub():
    from manifold3d import OpType
    return OpType.Subtract


def build():
    f = features()
    return dict(tub=build_tub(f), front=build_front(f)), f


if __name__ == '__main__':
    parts, f = build()
    for k, v in parts.items():
        bb = v.bounding_box()
        print(k, 'tris', v.num_tri(), 'genus', v.genus(), 'vol cm3 %.1f' % (v.volume() / 1000),
              'bbox', [round(b, 2) for b in bb])
