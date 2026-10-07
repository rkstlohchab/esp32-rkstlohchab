"""Component specs for the ESP32-S3 handheld.

Every part is described in its OWN local frame:
  - the PCB lies in the local XY plane, bottom face at z=0, top (component)
    face at z=t;
  - local x runs along the part's long axis, starting at the edge named in
    each spec's comment.

`SPECS` holds the numbers. The 3D viewer builds the detailed meshes from the
same dict (exported to layout.json), so the render and the clearance check
always agree. `boxes(part)` turns a spec into axis-aligned local boxes
tagged by kind:

  body    solid part (PCB, chips, connectors)
  dupont  a plugged female Dupont housing (14 mm) - solid, must not collide
  bend    room for the wire to bend out of a housing - soft, may be shared
  port    connector volume that passes into / through a wall (allowed)

Source tags: DRAWING = manufacturer dimension drawing, PHOTO = scaled from a
photo against a known size, LISTING = seller spec, EST = estimate, measure.
"""

PITCH = 2.54
HOUSING = 14.0          # female Dupont housing length
BEND = 10.0             # free space after each plug for a gentle wire turn
PLASTIC = 2.54          # male header spacer height
PIN_OUT = 6.0           # male pin length beyond the spacer
TAIL = 1.4              # solder tail on the far side of the PCB

SPECS = {
    # YD-ESP32-S3 N16R8 (VCC-GND Studio DevKitC-1 clone). x=0 at the USB end.
    # DRAWING: mischianti YD-ESP32-S3-Metric.pdf (57.15 x 27.94, rows 25.40,
    # end pin 1.91, module overhang to 63.39). Parts positions scaled from it.
    'esp32': dict(
        src='DRAWING', L=57.15, W=27.94, t=1.6, color='#101317',
        rows=[1.27, 26.67], pin0=1.91, npins=22,
        # pin labels, index 0 = pin at x=pin0 (USB end)
        row_y26=['GND', '5Vin', '14', '13', '12', '11', '10', '9', '46', '3',
                 '8', '18', '17', '16', '15', '7', '6', '5', '4', 'RST',
                 '3V3', '3V3'],
        row_y1=['GND', 'GND', '19', '20', '21', '47', '48', '45', '0', '35',
                '36', '37', '38', '39', '40', '41', '42', '2', '1', 'RX',
                'TX', 'GND'],
        usb=[dict(y=19.84, name='USB (native)'), dict(y=8.10, name='COM (CH343P)')],
        usb_w=8.94, usb_l=7.35, usb_h=3.26, usb_over=0.4,
        module=dict(x0=37.89, x1=63.39, y0=4.97, y1=22.97, pcb=0.8, can_h=2.3,
                    can_x0=38.6, can_x1=56.2),
        buttons=[dict(name='RST', x=33.75, y=8.74), dict(name='BOOT', x=28.65, y=8.74)],
        btn=dict(lx=3.0, ly=4.0, h=1.5, cap_d=1.6, cap_h=0.9),
        rgb=dict(x=18.25, y=18.94, s=5.0, h=1.6),
        ldo=dict(x=28.85, y=18.2, lx=3.5, ly=6.5, h=1.8),
        caps=[dict(x=34.15, y=18.5), dict(x=23.55, y=18.5)],
        ch343=dict(x=13.75, y=7.24, lx=4.9, ly=3.9, h=1.5),
        leds=[dict(x=20.55, y=10.84, c='#ff3b30'), dict(x=20.55, y=8.14, c='#34c759'),
              dict(x=20.55, y=5.54, c='#34c759')],
        diodes=[dict(x=13.35, y=21.64), dict(x=13.35, y=19.04), dict(x=13.35, y=16.54)],
    ),
    # 2.8" TPM408 = MSP2807 layout. x across (50), y along (86), y=0 at the
    # 14-pin header edge, glass on +z. DRAWING: lcdwiki MSP2807_Size.pdf.
    'display': dict(
        src='DRAWING', L=50.0, W=86.0, t=1.6, color='#b3121f',
        holes=[[3.0, 6.92], [47.0, 6.92], [3.0, 83.0], [47.0, 83.0]], hole_d=3.2, pad_d=4.7,
        glass=dict(x0=0.0, x1=50.0, y0=10.4, y1=79.6), tape=0.5, lcd=2.3, tp=1.2,
        va=dict(x0=2.4, x1=47.6, y0=18.15, y1=77.6),
        aa=dict(x0=3.4, x1=46.6, y0=19.1, y1=76.7),
        hdr=dict(y=2.0, x0=8.49, n=14), hdr_tail=2.39, hdr_tip=7.18,
        hdr_labels=['VCC', 'GND', 'CS', 'RESET', 'DC', 'SDI', 'SCK', 'LED',
                    'SDO', 'T_CLK', 'T_CS', 'T_DIN', 'T_DO', 'T_IRQ'],
        j4=dict(y=84.1, x0=21.19, n=4), smd_max=2.2,
        # full-size SD socket on the back, card enters from the left edge (x=0).
        # Position from the MSP2807 back view (socket ends 20.6 in from the edge).
        sd=dict(x0=0.5, x1=20.6, y0=30.0, y1=61.0, h=2.2),
        sd_card=dict(w=24.0, l=32.0, t=2.1, y=45.5, x_in=20.1),
        backparts=[dict(n='U1', x=40.0, y=12.5, lx=5.0, ly=4.4, h=1.1),
                   dict(n='U2', x=35.5, y=25.0, lx=2.9, ly=1.6, h=1.1),
                   dict(n='Q1', x=33.0, y=17.5, lx=2.9, ly=1.6, h=1.1)],
    ),
    # KY-023 joystick. x=0 at the 5-pin (right-angle) header edge.
    # LISTING: 34 x 26 x 32 (Mantech). Stick/hole positions: EST, measure.
    'joystick': dict(
        src='LISTING+EST', L=34.0, W=26.0, t=1.6, color='#111418',
        holes=[[3.0, 3.0], [3.0, 23.0], [31.0, 3.0], [31.0, 23.0]], hole_d=3.2,
        pins_x=1.6, pins_y=[7.92, 10.46, 13.0, 15.54, 18.08],
        pin_labels=['GND', '+5V', 'VRx', 'VRy', 'SW'],
        stick=[19.0, 13.0], frame=16.5, frame_h=11.0, dome_d=13.0, dome_top=13.5,
        stem_d=4.6, skirt_d=26.0, skirt_rim=15.7, top_d=21.0, cap_top=30.4,
    ),
    # NRF24L01+ PA/LNA. x=0 at the 2x4 header end, SMA at +x.
    # LISTING: 41 x 15.5 (HandsOn MDU1087 drawing photo); SMA per photo.
    'nrf24': dict(
        src='LISTING', L=41.0, W=15.5, t=1.2, color='#15181c',
        hdr_x=[1.9, 4.44], hdr_y=[11.56, 9.02, 6.48, 3.94],
        pin_labels=[['GND', 'CE', 'SCK', 'MISO'], ['VCC', 'CSN', 'MOSI', 'IRQ']],
        sma=dict(bx0=34.8, bx1=41.2, bh=6.4, axis_z=4.4, bar_x1=49.8, d=6.35),
        holes=[[38.6, 1.5], [38.6, 14.0]], hole_d=1.8,
    ),
    # Ebyte E07-M1101D-SMA (CC1101 433 MHz). x=0 at the header end.
    # DRAWING: Ebyte datasheet p.5 (15.0 x 30.0 x 1.20, pins 3.70/2.54,
    # GND holes 10.0 from SMA end, SMA 9.60 past the edge, 6.20 wide).
    'cc1101': dict(
        src='DRAWING', L=30.0, W=15.0, t=1.2, color='#1b3a2a',
        hdr_x=[1.6, 4.14], hdr_y=[11.3, 8.76, 6.22, 3.68],
        pin_labels=[['GND', 'GDO0', 'SCK', 'MISO'], ['VCC', 'CSN', 'MOSI', 'GDO2']],
        holes=[[20.0, 2.7], [20.0, 12.3]], hole_d=3.0, pad_d=4.2,
        can=dict(x0=9.0, x1=16.0, y0=4.0, y1=11.0, h=1.6),
        sma=dict(body_x1=34.0, bar_x1=39.6, body_w=6.2, d=6.35),
    ),
    # PN532 NFC V3 (Elechouse). x across 42.7, y along 40.4, y=0 bottom.
    # DRAWING size (42.7 x 40.4 x 4); feature positions PHOTO-scaled.
    'pn532': dict(
        src='DRAWING+PHOTO', L=42.7, W=40.4, t=1.6, color='#d8262b',
        holes=[[7.4, 33.0], [35.0, 8.9]], hole_d=3.0,
        i2c_x=6.2, i2c_y=[24.7, 22.2, 19.7, 17.2], i2c_labels=['GND', 'VCC', 'SDA', 'SCL'],
        spi_y=34.0, spi_x0=15.2, spi_labels=['SCK', 'MISO', 'MOSI', 'SS', 'VCC', 'GND', 'IRQ', 'RSTO'],
        chip=dict(x=25.5, y=22.2, s=6.0, h=0.9), xtal=dict(x=24.0, y=31.0),
        dip=dict(x=10.5, y=8.0, lx=6.0, ly=4.5, h=1.8), band_in=1.6, band_w=3.2,
    ),
    # MicroSD SPI reader (74LVC125A + AMS1117). x=0 at the card-slot end.
    # PHOTO: Components101 46 x 24 incl. right-angle pins.
    'sdcard': dict(
        src='PHOTO', L=42.0, W=24.0, t=1.6, color='#1d4fa8',
        holes=[[2.2, 2.2], [2.2, 21.8], [40.0, 2.2], [40.0, 21.8]], hole_d=2.2,
        hdr_x=37.8, hdr_y=[18.35, 15.81, 13.27, 10.73, 8.19, 5.65],
        pin_labels=['CS', 'SCK', 'MOSI', 'MISO', 'VCC', 'GND'], pin_out=46.0,
        socket=dict(x0=0.4, x1=15.4, y0=4.3, y1=19.7, h=1.85),
        lvc=dict(x=27.0, y=18.0, lx=5.0, ly=4.4, h=1.1),
        ldo=dict(x=28.0, y=5.8, lx=6.5, ly=3.5, h=1.8),
    ),
    # KY-005 IR LED module. x=0 at the LED edge, header (right-angle) at +x.
    'ir_tx': dict(
        src='LISTING', L=18.5, W=15.0, t=1.6, color='#111418',
        pins_x=16.6, pins_y=[10.04, 7.5, 4.96], pin_labels=['-', 'VCC', 'S'],
        led=dict(d=5.0, len=8.6, flange=5.8, x0=-9.2, x1=-0.6, axis_z=4.2, lead_x=3.6),
        holes=[[3.2, 2.6], [3.2, 12.4]], hole_d=3.0,
    ),
    # KY-022 IR receiver (VS1838B). x=0 at the header edge.
    'ir_rx': dict(
        src='EST', L=18.5, W=15.0, t=1.6, color='#111418',
        pins_x=1.9, pins_y=[4.96, 7.5, 10.04], pin_labels=['S', 'VCC', '-'],
        rx=dict(x=11.5, y=7.5, w=6.1, h=7.1, d=5.1, legs=2.6),
        holes=[[15.8, 2.6], [15.8, 12.4]], hole_d=3.0,
    ),
    # GY-GPS6MV2 (u-blox NEO-6M). x across 26, y along 36, y=0 = U.FL end.
    # LISTING: 36 x 26, 4+1 holes 3 mm (Digipurk / Cytron photos).
    'gps': dict(
        src='LISTING', L=26.0, W=36.0, t=1.6, color='#1c3f8c',
        holes=[[3.0, 3.0], [23.0, 3.0], [3.0, 33.0], [23.0, 33.0], [13.0, 3.0]], hole_d=3.0,
        hdr_y=33.2, hdr_x=[9.19, 11.73, 14.27, 16.81], pin_labels=['VCC', 'RX', 'TX', 'GND'],
        neo=dict(x=13.0, y=17.5, lx=12.2, ly=16.0, h=2.4),
        batt=dict(x=5.5, y=28.5, d=6.8, h=2.1), ufl=dict(x=19.0, y=5.5),
    ),
    # Ceramic patch antenna for the GPS (25 x 25 kit version).
    'gps_ant': dict(src='LISTING', L=25.0, W=25.0, t=1.0, color='#2d6b3a',
                    ceramic=4.0, feed=[12.5, 15.0]),
    # 1x18650 open holder with wire leads + Orion 18650/22 cell.
    'battery': dict(src='LISTING+DATASHEET', L=74.5, W=21.5, t=17.7, color='#141414',
                    cell_d=18.5, cell_l=65.0, floor=1.0),
    # TP4056 USB-C charger + DW01A protection. x=0 at the USB-C end.
    'tp4056': dict(
        src='LISTING', L=29.0, W=17.3, t=1.6, color='#1d4fa8',
        usb_w=8.94, usb_l=7.35, usb_h=3.26, usb_over=0.6,
        pads=[dict(n='OUT+', y=15.3), dict(n='B+', y=11.2), dict(n='B-', y=6.1), dict(n='OUT-', y=2.0)],
        ics=[dict(n='TP4056', x=13.0, y=8.65, lx=4.9, ly=6.0, h=1.5),
             dict(n='DW01A', x=21.0, y=12.8, lx=2.9, ly=2.8, h=1.1),
             dict(n='8205A', x=21.5, y=5.0, lx=3.0, ly=4.4, h=1.1)],
    ),
    # 400-tie-point half breadboard (user's board): 30 columns x 10 rows
    # (a-e | 0.3" channel | f-j) + 2 power buses per long side.
    # LISTING: 83.5 x 54.5 x 8.5 mm. x along 83.5, y across 54.5.
    'breadboard': dict(src='LISTING', L=83.5, W=54.5, t=8.5, color='#f3f2ec', cols=30,
                       col_x0=4.9, row_y=[13.28, 15.82, 18.36, 20.9, 23.44, 31.06, 33.6, 36.14, 38.68, 41.22],
                       rail_y=[4.2, 6.74, 47.76, 50.3], rails=['-', '+', '-', '+']),
    # SS12D00 slide switch (add one: TP4056 OUT+ -> switch -> ESP32 5Vin).
    'switch': dict(src='LISTING', L=8.5, W=3.7, t=3.9, color='#1a1a1a', knob=[1.5, 1.5, 3.0], travel=2.0),
}


def B(x0, y0, z0, x1, y1, z1):
    return (min(x0, x1), min(y0, y1), min(z0, z1), max(x0, x1), max(y0, y1), max(z0, z1))


def straight_header(pts, t, side, dupont=True, tag='hdr'):
    """Male header, pins normal to the PCB. side=-1: plastic+pins under the
    PCB (z<0); side=+1: on the component side."""
    out = []
    h = PITCH / 2
    base = 0.0 if side < 0 else t
    tail = t + TAIL if side < 0 else -TAIL
    for (x, y) in pts:
        out.append((tag, 'body', B(x - h, y - h, base, x + h, y + h, base + side * PLASTIC)))
        out.append((tag + '_pin', 'body', B(x - .32, y - .32, tail, x + .32, y + .32,
                                            base + side * (PLASTIC + PIN_OUT))))
    if dupont == 'solder' and pts:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        z0 = base + side * (PLASTIC + PIN_OUT)
        out.append((tag + '_joint', 'bend', B(min(xs) - h - 1, min(ys) - h - 1, z0,
                                              max(xs) + h + 1, max(ys) + h + 1, z0 + side * BEND)))
    elif dupont and pts:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        z0 = base + side * PLASTIC
        z1 = z0 + side * HOUSING
        out.append((tag + '_dupont', 'dupont', B(min(xs) - h, min(ys) - h, z0, max(xs) + h, max(ys) + h, z1)))
        out.append((tag + '_bend', 'bend', B(min(xs) - h - 1, min(ys) - h - 1, z1,
                                             max(xs) + h + 1, max(ys) + h + 1, z1 + side * BEND)))
    return out


def right_angle_header(xe, ys, t, direction, dupont=True, tag='hdr'):
    """Right-angle header on the component side; pins leave the board edge at
    x=xe going in `direction` (-1 = towards -x, +1 = towards +x)."""
    out = []
    h = PITCH / 2
    zc = t + 1.27
    for y in ys:
        out.append((tag, 'body', B(xe - direction * 2.6, y - h, t, xe, y + h, t + PLASTIC)))
        out.append((tag + '_pin', 'body', B(xe, y - .32, zc - .32, xe + direction * PIN_OUT, y + .32, zc + .32)))
    if dupont == 'solder' and ys:
        x0 = xe + direction * PIN_OUT
        out.append((tag + '_joint', 'bend', B(x0, min(ys) - h - 1, zc - h - 1, x0 + direction * BEND,
                                              max(ys) + h + 1, zc + h + 1)))
    elif dupont and ys:
        x0 = xe + direction * 0.2
        x1 = x0 + direction * HOUSING
        out.append((tag + '_dupont', 'dupont', B(x0, min(ys) - h, zc - h, x1, max(ys) + h, zc + h)))
        out.append((tag + '_bend', 'bend', B(x1, min(ys) - h - 1, zc - h - 1, x1 + direction * BEND,
                                             max(ys) + h + 1, zc + h + 1)))
    return out


def boxes(pid, spec, opts=None):
    """Local boxes for one part. opts can switch Dupont allowances off."""
    s = spec
    o = opts or {}
    L, W, t = s['L'], s['W'], s['t']
    pcb = [('pcb', 'body', B(0, 0, 0, L, W, t))]
    if pid == 'esp32':
        out = list(pcb)
        m = s['module']
        out.append(('module', 'body', B(m['x0'], m['y0'], t, m['x1'], m['y1'], t + m['pcb'] + m['can_h'])))
        for u in s['usb']:
            out.append(('usb', 'port', B(-s['usb_over'], u['y'] - s['usb_w'] / 2, t,
                                         s['usb_l'] - s['usb_over'], u['y'] + s['usb_w'] / 2, t + s['usb_h'])))
        for b in s['buttons']:
            out.append(('btn', 'body', B(b['x'] - 1.5, b['y'] - 2, t, b['x'] + 1.5, b['y'] + 2, t + 2.4)))
        out.append(('rgb', 'body', B(s['rgb']['x'] - 2.5, s['rgb']['y'] - 2.5, t, s['rgb']['x'] + 2.5,
                                     s['rgb']['y'] + 2.5, t + 1.6)))
        pts = [(s['pin0'] + i * PITCH, y) for y in s['rows'] for i in range(s['npins'])]
        for y in s['rows']:
            row = [(s['pin0'] + i * PITCH, y) for i in range(s['npins'])]
            out += straight_header(row, t, -1, dupont=o.get('dupont', True), tag='hdr_y%d' % round(y))
        return out
    if pid == 'display':
        g = s['glass']
        out = list(pcb)
        out.append(('glass', 'body', B(g['x0'], g['y0'], t, g['x1'], g['y1'], t + s['tape'] + s['lcd'] + s['tp'])))
        out.append(('backparts', 'body', B(4, 8, -s['smd_max'], 46, 80, 0)))
        out.append(('sd', 'body', B(s['sd']['x0'], s['sd']['y0'], -s['sd']['h'], s['sd']['x1'], s['sd']['y1'], 0)))
        c = s['sd_card']   # the card itself, pushed home; sticks out past the board edge
        out.append(('sd_card', 'port', B(c['x_in'] - c['l'], c['y'] - c['w'] / 2, -0.05 - c['t'], c['x_in'], c['y'] + c['w'] / 2, -0.05)))
        hx = [s['hdr']['x0'] + i * PITCH for i in range(s['hdr']['n'])]
        out += straight_header([(x, s['hdr']['y']) for x in hx], t, -1, dupont=o.get('dupont', True), tag='hdr')
        return out
    if pid == 'joystick':
        sx, sy = s['stick']
        out = list(pcb)
        f = s['frame'] / 2
        out.append(('gimbal', 'body', B(sx - f - 3.5, sy - f, t, sx + f + 3.5, sy + f + 3.5, t + s['frame_h'])))
        out.append(('dome', 'port', B(sx - 6.5, sy - 6.5, t + s['frame_h'], sx + 6.5, sy + 6.5, t + s['dome_top'])))
        r = s['skirt_d'] / 2
        out.append(('cap', 'port', B(sx - r, sy - r, t + s['skirt_rim'] - 3, sx + r, sy + r, t + s['cap_top'])))
        out.append(('tails', 'body', B(0.5, 2, -TAIL, 33.5, 24, 0)))
        out += right_angle_header(0.0, s['pins_y'], t, -1, dupont=o.get('dupont', True), tag='hdr')
        return out
    if pid == 'nrf24':
        m = s['sma']
        out = list(pcb)
        out.append(('parts', 'body', B(8, 1.5, t, 34, 14, t + 1.6)))
        out.append(('sma_body', 'body', B(m['bx0'], W / 2 - 3.2, t, m['bx1'], W / 2 + 3.2, t + m['bh'])))
        out.append(('sma_barrel', 'port', B(m['bx1'], W / 2 - m['d'] / 2, m['axis_z'] - m['d'] / 2,
                                            m['bar_x1'], W / 2 + m['d'] / 2, m['axis_z'] + m['d'] / 2)))
        pts = [(x, y) for x in s['hdr_x'] for y in s['hdr_y']]
        out += straight_header(pts, t, -1, dupont=o.get('dupont', True))
        return out
    if pid == 'cc1101':
        m = s['sma']
        out = list(pcb)
        c = s['can']
        out.append(('can', 'body', B(c['x0'], c['y0'], t, c['x1'], c['y1'], t + c['h'])))
        out.append(('sma_body', 'body', B(L - 3, W / 2 - 3.1, t / 2 - 3.1, m['body_x1'], W / 2 + 3.1, t / 2 + 3.1)))
        out.append(('sma_barrel', 'port', B(m['body_x1'], W / 2 - m['d'] / 2, t / 2 - m['d'] / 2,
                                            m['bar_x1'], W / 2 + m['d'] / 2, t / 2 + m['d'] / 2)))
        pts = [(x, y) for x in s['hdr_x'] for y in s['hdr_y']]
        out += straight_header(pts, t, -1, dupont=o.get('dupont', True))
        return out
    if pid == 'pn532':
        out = list(pcb)
        out.append(('parts', 'body', B(8, 5, t, 36, 36, t + 1.8)))
        pts = [(s['i2c_x'], y) for y in s['i2c_y']]
        out += straight_header(pts, t, +1, dupont=o.get('dupont', True), tag='i2c')
        pts = [(s['spi_x0'] + i * PITCH, s['spi_y']) for i in range(len(s['spi_labels']))]
        out += straight_header(pts, t, +1, dupont=o.get('dupont', True), tag='spi')
        return out
    if pid == 'sdcard':
        so = s['socket']
        out = list(pcb)
        out.append(('socket', 'body', B(so['x0'], so['y0'], t, so['x1'], so['y1'], t + so['h'])))
        out.append(('card', 'port', B(-2.5, so['y0'] + 2.2, t + 0.3, so['x0'], so['y1'] - 2.2, t + 1.3)))
        out.append(('parts', 'body', B(20, 2, t, 32, 21, t + 1.8)))
        out.append(('tails', 'body', B(36, 4, -TAIL, 39.5, 20, 0)))
        out += right_angle_header(s['hdr_x'] + 2.6, s['hdr_y'], t, +1, dupont=o.get('dupont', True), tag='hdr')
        return out
    if pid == 'ir_tx':
        led = s['led']
        out = list(pcb)
        out.append(('led', 'port', B(led['x0'], W / 2 - led['flange'] / 2, led['axis_z'] - led['flange'] / 2,
                                     led['x1'], W / 2 + led['flange'] / 2, led['axis_z'] + led['flange'] / 2)))
        out.append(('leads', 'body', B(led['x1'], W / 2 - 1.8, t, led['lead_x'] + 0.6, W / 2 + 1.8, led['axis_z'])))
        out += right_angle_header(L - 0.2, s['pins_y'], t, +1, dupont=o.get('dupont', True), tag='hdr')
        return out
    if pid == 'ir_rx':
        r = s['rx']
        out = list(pcb)
        out.append(('rx', 'port', B(r['x'] - r['d'] / 2 - 0.4, r['y'] - r['w'] / 2 - 0.4, t + r['legs'],
                                    r['x'] + r['d'] / 2 + 0.4, r['y'] + r['w'] / 2 + 0.4, t + r['legs'] + r['h'])))
        out += right_angle_header(0.2, s['pins_y'], t, -1, dupont=o.get('dupont', True), tag='hdr')
        return out
    if pid == 'gps':
        out = list(pcb)
        out.append(('parts', 'body', B(2, 2, t, 24, 32, t + 2.4)))
        pts = [(x, s['hdr_y']) for x in s['hdr_x']]
        out += straight_header(pts, t, -1, dupont=o.get('dupont', True))
        return out
    if pid == 'gps_ant':
        return [('patch', 'body', B(0, 0, -1.2, L, W, t + s['ceramic']))]
    if pid == 'battery':
        # open holder: low side walls, tall end walls, round cell on top
        zc = s['floor'] + s['cell_d'] / 2
        r = s['cell_d'] / 2
        cx0, cx1 = (L - s['cell_l']) / 2, (L + s['cell_l']) / 2
        out = [('holder', 'body', B(0, 0, 0, L, W, 13.5)),
               ('end_a', 'body', B(0, 0, 0, 3.2, W, t)), ('end_b', 'body', B(L - 3.2, 0, 0, L, W, t))]
        for hw in (4.6, 7.5):
            top = zc + (r * r - hw * hw) ** 0.5
            out.append(('cell', 'body', B(cx0, W / 2 - hw, 0, cx1, W / 2 + hw, top + 0.2)))
        if o.get('extra_length', 0):
            out.append(('holder_extension', 'bend', B(L, 0, 0, L + o['extra_length'], W, t)))
        return out
    if pid == 'tp4056':
        out = list(pcb)
        out.append(('usb', 'port', B(-s['usb_over'], W / 2 - s['usb_w'] / 2, t, s['usb_l'] - s['usb_over'],
                                     W / 2 + s['usb_w'] / 2, t + s['usb_h'])))
        out.append(('parts', 'body', B(9, 1.5, t, 25, 16, t + 1.6)))
        out.append(('wires', 'bend', B(25, 0, t, L + 4, W, t + 3)))
        return out
    if pid == 'breadboard':
        # plugged male jumpers stand 14 mm proud, then need room to bend
        return [('bb', 'body', B(0, 0, 0, L, W, t)),
                ('jumpers', 'dupont', B(3.6, 2.9, t, L - 3.6, W - 2.9, t + HOUSING)),
                ('jumper_bend', 'bend', B(3.6, 2.9, t + HOUSING, L - 3.6, W - 2.9, t + HOUSING + BEND))]
    if pid == 'switch':
        k = s['knob']
        return [('sw', 'body', B(0, 0, 0, L, W, t)),
                ('knob', 'port', B(L / 2 - 2.0, W / 2 - k[1] / 2, t, L / 2 + 2.0, W / 2 + k[1] / 2, t + k[2])),
                ('legs', 'body', B(1, 0.5, -3.5, L - 1, W - 0.5, 0))]
    return list(pcb)
