"""Where every part sits inside the case, plus a clearance checker.

World frame (mm), device held upright looking at the screen:
  x -> right, y -> up, z -> towards you.
  Origin = inner back-bottom-left corner of the cavity:
  x in [0, W], y in [0, H], z in [0, D]; z=0 is the inside face of the
  back cover, z=D the inside face of the front plate.

A placement maps a part's local axes onto world axes, e.g.
  rot=('+y', '+x', '-z')  -> local x runs up, local y runs right and the
  component side faces the back cover. `at` is where the local origin lands.
"""
import itertools
import numpy as np

from parts import SPECS, boxes

W, H, D = 92.0, 164.0, 90.0         # cavity size; jumper harness revision 2
WALL, BACK, FRONT = 2.2, 2.0, 2.0    # side walls, back cover, front plate
BATTERY_EXTRA_LENGTH = 4.0
# Clear volumes for loose service loops, separate from plug/bend envelopes.
WIRE_BAYS = [
    dict(name='Lower service loops', b=(18, 6, 35, 74, 54, 72)),
    dict(name='Left routing corridor', b=(1, 40, 50, 16, 130, 78)),
    dict(name='Right routing corridor', b=(76, 65, 50, 90, 110, 78)),
]
WIRE_BUDGET = dict(short_count=60, short_length_mm=200, long_count=5,
                   long_length_mm=400, wire_diameter_mm=2.0, packing_fraction=0.30)

AX = {'+x': (1, 0, 0), '-x': (-1, 0, 0), '+y': (0, 1, 0),
      '-y': (0, -1, 0), '+z': (0, 0, 1), '-z': (0, 0, -1)}


def rot(r):
    m = np.array([AX[r[0]], AX[r[1]], AX[r[2]]], dtype=float).T
    assert abs(np.linalg.det(m) - 1) < 1e-9, ('left-handed rotation', r)
    return m


# name, spec id, rotation, local-origin position, options.
# Three decks, with 14 mm Dupont housings + 10 mm bend clearance on all
# header modules. TP4056 keeps its existing solder-pad leads.
S = dict(dupont='solder')
PLACEMENTS = [
    # --- back deck (on the back cover) ---------------------------------------
    dict(id='esp32', spec='esp32', rot=('+y', '+x', '-z'), at=(6.0, 0.6, 7.1),
         note='USB-C end on the bottom wall. Parts face the back cover (BOOT/RST pinholes line up), '
              'pins face the front for Dupont jumpers.'),
    dict(id='battery', spec='battery', rot=('+y', '-x', '+z'), at=(83.0, 4.0, 0.0),
         opts=dict(extra_length=BATTERY_EXTRA_LENGTH),
         note='Beside the ESP32 on the back cover, held by a side rail and four end stops.'),
    dict(id='tp4056', spec='tp4056', rot=('+y', '+z', '+x'), at=(43.0, 0.6, 0.5), opts=S,
         note='Stands on edge in a printed channel between the ESP32 and the cell; USB-C out the bottom.'),
    dict(id='pn532', spec='pn532', rot=('+y', '-x', '+z'), at=(48.0, 76.0, 1.6),
         note='On two pegs on the back cover, upper half: tap cards on the back, top half. '
              'SPI header faces the front; space reserved for plugs on both headers. SW1 OFF / SW2 ON.'),
    dict(id='nrf24', spec='nrf24', rot=('+y', '-x', '+z'), at=(18.0, H - 41.7, 30.0),
         note='SMA through top wall. Dupont plugs face the back cover.'),
    dict(id='cc1101', spec='cc1101', rot=('+y', '-x', '+z'), at=(38.0, H - 33.0, 34.0),
         note='SMA body sits 1 mm into a wall pocket so enough thread shows for the antenna.'),
    dict(id='gps', spec='gps', rot=('-x', '-y', '+z'), at=(88.0, 153.0, 34.0),
         note='On two posts with pegs; U.FL end next to the patch.'),
    dict(id='gps_ant', spec='gps_ant', rot=('+x', '-z', '+y'), at=(61.0, H - 6.2, 39.0),
         note='Ceramic patch faces the top wall (sky), resting on a printed block.'),
    dict(id='ir_tx', spec='ir_tx', rot=('-y', '+x', '+z'), at=(3.0, H - 8.4, 41.0),
         note='LED pokes 0.8 mm into its hole in the top wall.'),
    dict(id='ir_rx', spec='ir_rx', rot=('+y', '-x', '+z'), at=(56.0, H - 20.0, 34.0),
         note='Lens faces the top wall, under a 7 mm window.'),
    dict(id='sdcard', spec='sdcard', rot=('+y', '-x', '+z'), at=(88.0, 0.5, 26.0),
         note='Card slot on the bottom wall; rides on a wall gusset and a post above the cell.'),
    dict(id='switch', spec='switch', rot=('+y', '+z', '+x'), at=(W - 3.9, 8.0, 40.0),
         note='Power switch opening on right side; electrical power circuit must match fitted regulator.'),
    # --- middle deck ------------------------------------------------------------
    dict(id='breadboard', spec='breadboard', rot=('+y', '-x', '+z'), at=(73.25, 75.0, 46.0),
         note='Your 400-point board, holes facing the screen. Peel the backing and stick it onto the '
              'two wall ledges. 14 mm housings plus 10 mm free bend space above it.'),
    # --- front deck (hangs from the front plate) -------------------------------
    dict(id='display', spec='display', rot=('+x', '+y', '+z'), at=(21.0, 56.0, D - 5.0),
         note='Glass sits in a 0.6 mm pocket; 4 standoffs, M3 x 6 screws. Header at the bottom. '
              'Use the separate bottom microSD reader; display SD socket is internal only.'),
    dict(id='joystick', spec='joystick', rot=('+x', '+y', '+z'), at=(27.0, 12.0, D - 13.8),
         note='Two standoffs on the header side plus two snap hooks at the far corners.'),
]

SOFT_PAIRS = {('bend', 'bend')}


def world_boxes(p):
    spec = SPECS[p['spec']]
    R = rot(p['rot'])
    T = np.array(p['at'], dtype=float)
    out = []
    for name, kind, b in boxes(p['spec'], spec, p.get('opts')):
        c = np.array(list(itertools.product([b[0], b[3]], [b[1], b[4]], [b[2], b[5]])))
        w = c @ R.T + T
        out.append((name, kind, tuple(np.r_[w.min(0), w.max(0)])))
    return out


def overlap(a, b, eps=0.05):
    return all(a[i] < b[i + 3] - eps and b[i] < a[i + 3] - eps for i in range(3))


def check(placements=PLACEMENTS, verbose=True):
    wb = {p['id']: world_boxes(p) for p in placements}
    problems = []
    ids = list(wb)
    for i, j in itertools.combinations(range(len(ids)), 2):
        for na, ka, a in wb[ids[i]]:
            for nb, kb, b in wb[ids[j]]:
                if tuple(sorted((ka, kb))) in SOFT_PAIRS:
                    continue
                if overlap(a, b):
                    depth = min(min(a[k + 3], b[k + 3]) - max(a[k], b[k]) for k in range(3))
                    problems.append((ids[i], na, ids[j], nb, round(depth, 2)))
    cav = (0, 0, 0, W, H, D)
    for bay in WIRE_BAYS:
        for pid, bl in wb.items():
            for n, k, b in bl:
                if overlap(bay['b'], b):
                    problems.append((bay['name'], 'WIRE SPACE', pid, n))
    for pid, bl in wb.items():
        for n, k, b in bl:
            if k == 'port':
                continue
            if (pid == 'display' and n == 'glass') or n.startswith('sma'):
                continue  # these sit in wall pockets on purpose
            for ax in range(3):
                lo = b[ax] - cav[ax]
                hi = cav[ax + 3] - b[ax + 3]
                if lo < -0.05 or hi < -0.05:
                    problems.append((pid, n, 'WALL', 'xyz'[ax], round(min(lo, hi), 2)))
    if verbose:
        for pr in problems:
            print('  CONFLICT', pr)
        print('checked %d parts: %d conflicts' % (len(wb), len(problems)))
    return problems, wb


def plot(wb, path):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import Rectangle
    colors = {}
    cyc = plt.rcParams['axes.prop_cycle'].by_key()['color']
    views = [('front (x-y)', 0, 1), ('side (z-y)', 2, 1), ('top (x-z)', 0, 2)]
    fig, axs = plt.subplots(1, 3, figsize=(20, 11), gridspec_kw=dict(width_ratios=[W, D, W]))
    for ax, (title, a, b) in zip(axs, views):
        ax.add_patch(Rectangle((0, 0), [W, H, D][a], [W, H, D][b], fill=False, lw=2))
        for k, (pid, bl) in enumerate(wb.items()):
            col = colors.setdefault(pid, cyc[len(colors) % len(cyc)])
            for n, kind, bx in bl:
                ls = {'body': '-', 'dupont': '--', 'bend': ':', 'port': '-.'}[kind]
                ax.add_patch(Rectangle((bx[a], bx[b]), bx[a + 3] - bx[a], bx[b + 3] - bx[b],
                                       fill=kind == 'body', alpha=.25 if kind == 'body' else 1,
                                       ec=col, fc=col, ls=ls, lw=.8))
        for bay in WIRE_BAYS:
            bx = bay['b']
            ax.add_patch(Rectangle((bx[a], bx[b]), bx[a + 3] - bx[a], bx[b + 3] - bx[b],
                                   fill=False, ec='#008477', ls='--', lw=1.5, hatch='//', alpha=.4))
        ax.set_title(title)
        ax.set_aspect('equal')
        ax.set_xlim(-8, [W, H, D][a] + 8)
        ax.set_ylim(-8, [W, H, D][b] + 8)
        ax.grid(alpha=.3)
    handles = [Rectangle((0, 0), 1, 1, color=c, alpha=.5) for c in colors.values()]
    fig.legend(handles, list(colors), loc='lower center', ncol=8)
    fig.savefig(path, dpi=70, bbox_inches='tight')


if __name__ == '__main__':
    import sys
    probs, wb = check()
    plot(wb, sys.argv[1] if len(sys.argv) > 1 else 'layout.png')
