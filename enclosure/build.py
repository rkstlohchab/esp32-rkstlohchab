"""Build the printable enclosure and the 3D viewer.

    python3 build.py            # needs: pip install manifold3d numpy

Writes
  stl/enclosure_back_tub.stl    print back-down; supports under SD shelf
  stl/enclosure_front_plate.stl print face-down, no supports
  layout.json                   every part's pose + spec + every opening
  enclosure.html                interactive viewer (all data inlined)
and prints the clearance report (must say 0 conflicts).
"""
import base64
import datetime
import json
import math
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'src'))

import layout as L          # noqa: E402
import shell as S           # noqa: E402
from parts import SPECS     # noqa: E402

NAMES = {
    'esp32': 'YD-ESP32-S3 N16R8', 'battery': '18650 cell + holder', 'tp4056': 'TP4056 USB-C charger',
    'pn532': 'PN532 NFC V3', 'display': '2.8" TPM408 touch TFT', 'joystick': 'KY-023 joystick',
    'nrf24': 'NRF24L01+ PA/LNA', 'cc1101': 'CC1101 E07-M1101D-SMA', 'gps_ant': 'GPS ceramic patch',
    'gps': 'NEO-6M GPS (GY-GPS6MV2)', 'ir_tx': 'IR LED (KY-005)', 'ir_rx': 'IR receiver (KY-022)',
    'sdcard': 'MicroSD reader', 'breadboard': '400-point breadboard', 'switch': 'Power switch SS12D00',
}
CATS = {
    'esp32': 'core', 'sdcard': 'core', 'display': 'ui', 'joystick': 'ui', 'nrf24': 'radio', 'cc1101': 'radio',
    'pn532': 'sense', 'gps': 'sense', 'gps_ant': 'sense', 'ir_tx': 'sense', 'ir_rx': 'sense',
    'battery': 'power', 'tp4056': 'power', 'switch': 'power', 'breadboard': 'wire',
}


def write_stl(man, path):
    m = man.to_mesh()
    v = np.asarray(m.vert_properties, dtype=np.float32)[:, :3]
    t = np.asarray(m.tri_verts, dtype=np.int64)
    tri = v[t]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    rec = np.zeros(len(t), dtype=[('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')])
    rec['n'], rec['v'] = n, tri
    with open(path, 'wb') as fh:
        fh.write(b'ESP32-S3 handheld enclosure, mm'.ljust(80, b' '))
        fh.write(struct.pack('<I', len(t)))
        fh.write(rec.tobytes())
    return v, t


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def main():
    probs, wb = L.check()
    if probs:
        sys.exit('layout has conflicts - fix before printing')
    shells, feats = S.build()
    # Check printable solids too: empty space in the parts layout alone
    # does not guarantee that a support or screw lug leaves room for wires.
    for name, man in shells.items():
        if str(man.status()) != 'Error.NoError' or len(man.decompose()) != 1:
            sys.exit(f'{name}: invalid or disconnected printable solid')
        for pid, bl in wb.items():
            for label, kind, b in bl:
                if kind in ('dupont', 'bend'):
                    volume = (man ^ S.cube(*b)).volume()
                    if volume > 0.05:
                        sys.exit(f'{name} blocks {pid}/{label}: {volume:.2f} mm3')
                elif kind == 'body':
                    solid = S.cube(*b)
                    # Coarse board/component boxes include the mounting holes.
                    # Remove those real holes before testing their locating pegs.
                    if pid in ('pn532', 'gps'):
                        for hx, hy in SPECS[pid]['holes']:
                            c = S.wpt(pid, (hx, hy, 0))
                            solid -= S.cyl_z(c[0], c[1], b[2] - 1, b[5] + 1,
                                             SPECS[pid]['hole_d'] / 2)
                    volume = (man ^ solid).volume()
                    if volume > 0.05:
                        sys.exit(f'{name} blocks solid {pid}/{label}: {volume:.2f} mm3')
        for bay in L.WIRE_BAYS:
            if (man ^ S.cube(*bay['b'])).volume() > 0.05:
                sys.exit(f'{name} intrudes into wire bay: {bay["name"]}')
    if (shells['tub'] ^ shells['front']).volume() > 0.05:
        sys.exit('front and tub interfere')
    wire_volume = sum(math.prod(bay['b'][i + 3] - bay['b'][i] for i in range(3))
                      for bay in L.WIRE_BAYS)
    budget = dict(L.WIRE_BUDGET)
    wire_length = budget['short_count'] * budget['short_length_mm'] + budget['long_count'] * budget['long_length_mm']
    needed = wire_length * math.pi * (budget['wire_diameter_mm'] / 2)**2 / budget['packing_fraction']
    if wire_volume < needed:
        sys.exit('insufficient reserved wire volume')
    budget.update(reserved_cm3=round(wire_volume / 1000, 2), required_cm3=round(needed / 1000, 2))
    print('shell/plug/bend/wire checks passed; reserved %.1f cm3, estimated need %.1f cm3' % (wire_volume / 1000, needed / 1000))
    os.makedirs(os.path.join(HERE, 'stl'), exist_ok=True)
    meshes = {}
    files = {'tub': 'enclosure_back_tub.stl', 'front': 'enclosure_front_plate.stl'}
    for k, man in shells.items():
        bb = man.bounding_box()
        # print orientation: tub back-down, front plate face-down, both sitting on z=0
        if k == 'front':
            xf = dict(flip=True, ysum=bb[1] + bb[4], ztop=bb[5])
            printed = man.rotate((180, 0, 0)).translate((0, bb[1] + bb[4], bb[5]))
        else:
            xf = dict(flip=False, dz=-bb[2])
            printed = man.translate((0, 0, -bb[2]))
        write_stl(printed, os.path.join(HERE, 'stl', files[k]))
        m = man.to_mesh()
        v = np.asarray(m.vert_properties, dtype=np.float32)[:, :3]
        t = np.asarray(m.tri_verts, dtype=np.int64)
        meshes[k] = dict(file=files[k], tris=int(len(t)), volume_cm3=round(man.volume() / 1000, 2), print_xf=xf,
                         bbox=[round(x, 2) for x in bb], pos=b64(v.astype('<f4')), idx=b64(t.astype('<u4')))
        print('%-6s %6d tris  %5.1f cm3  -> stl/%s' % (k, len(t), man.volume() / 1000, files[k]))

    parts = []
    for p in L.PLACEMENTS:
        bl = wb[p['id']]
        body = [b for n, k, b in bl if k in ('body', 'port')]
        lo = np.min([b[:3] for b in body], 0)
        hi = np.max([b[3:] for b in body], 0)
        opts = p.get('opts') or {}
        parts.append(dict(id=p['id'], spec=p['spec'], name=NAMES[p['id']], cat=CATS[p['id']],
                          R=L.rot(p['rot']).tolist(), at=list(p['at']), note=p['note'],
                          wiring='solder' if opts.get('dupont') == 'solder' else ('dupont' if any(k == 'dupont' for n, k, b in bl) else 'none'),
                          bbox=[round(float(x), 2) for x in np.r_[lo, hi]],
                          keepouts=[dict(n=n, k=k, b=[round(float(x), 2) for x in b]) for n, k, b in bl
                                    if k in ('dupont', 'bend')]))
    outer = [L.W + 2 * L.WALL, L.H + 2 * L.WALL, L.D + L.BACK + L.FRONT]
    data = dict(
        generated=datetime.date.today().isoformat(),
        revision=2, wire_bays=L.WIRE_BAYS, wire_budget=budget,
        cavity=dict(W=L.W, H=L.H, D=L.D), walls=dict(side=L.WALL, back=L.BACK, front=L.FRONT),
        outer=[round(x, 1) for x in outer], radii=dict(outer=S.RO, inner=S.RI), lugs=S.LUGS, lug_r=S.LUG_R,
        specs=SPECS, parts=parts, features=feats, meshes=meshes,
    )
    slim = {k: v for k, v in data.items() if k != 'meshes'}
    slim['meshes'] = {k: {kk: vv for kk, vv in m.items() if kk not in ('pos', 'idx')} for k, m in meshes.items()}
    with open(os.path.join(HERE, 'layout.json'), 'w') as fh:
        json.dump(slim, fh, indent=1)
    tpl = open(os.path.join(HERE, 'src', 'viewer.html')).read()
    js = '\n'.join(open(os.path.join(HERE, 'src', n)).read() for n in ('viewer_core.js', 'viewer_parts.js', 'viewer_ui.js'))
    html = tpl.replace('/*__ENCLOSURE_DATA__*/', 'window.ENCLOSURE=' + json.dumps(data, separators=(',', ':')) + ';')
    html = html.replace('/*__JS__*/', js)
    with open(os.path.join(HERE, 'enclosure.html'), 'w') as fh:
        fh.write(html)
    print('outer %.1f x %.1f x %.1f mm  ->  enclosure.html (%d KB)' % (*outer, len(html) // 1024))


if __name__ == '__main__':
    main()
