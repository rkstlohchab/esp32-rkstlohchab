"""Validate pin-map.csv against firmware and render the module connection diagram."""
from pathlib import Path
import csv
import html
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def defines(path):
    return dict(re.findall(r'^\s*#define\s+(\w+)\s+([\w-]+)', path.read_text(), re.M))


def main():
    macros = defines(ROOT / 'ESP32-DIV/BoardConfig.h')
    def resolve(name):
        visited = set()
        while not name.lstrip('-').isdigit():
            if name in visited or name not in macros:
                raise ValueError('Unknown or circular macro: ' + name)
            visited.add(name)
            name = macros[name]
        return int(name)

    with (HERE / 'pin-map.csv').open(newline='') as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        assert resolve(row['firmware_macro']) == int(row['esp32_gpio']), row
    display_macros = defines(ROOT / 'tft_espi-patch/User_Setup.h')
    for patch, board in [('TFT_MOSI','TFT_MOSI_PIN'), ('TFT_MISO','TFT_MISO_PIN'),
                         ('TFT_SCLK','TFT_SCLK_PIN'), ('TFT_CS','TFT_CS_PIN'),
                         ('TFT_DC','TFT_DC_PIN'), ('TFT_RST','TFT_RST_PIN'),
                         ('TOUCH_CS','XPT2046_CS')]:
        assert int(display_macros[patch]) == resolve(board), patch

    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="2200" viewBox="0 0 1400 2200" role="img" aria-labelledby="title desc">',
           '<title id="title">esp32-rkstlohchab current module wiring</title>',
           '<desc id="desc">GPIO connections for the ESP32-S3 N16R8 bench build, with shared nets repeated by module. Power constraints are listed separately.</desc>',
           '<style>text{font-family:Arial,sans-serif;fill:#213444}.title{font-size:32px;font-weight:700}.heading{font-size:20px;font-weight:700}.body{font-size:16px}.small{font-size:14px}.pin{font-size:16px;font-family:monospace}.muted{fill:#536978}</style>',
           '<rect width="1400" height="2200" fill="#f5f8fa"/>']
    def text(x,y,s,cls='body',anchor='start'):
        out.append(f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{html.escape(s)}</text>')
    def rect(x,y,w,h,fill,stroke='#cfdae0'):
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}"/>')
    text(48,55,'esp32-rkstlohchab', 'title')
    text(48,85,'Module connection schematic · ESP32-S3 N16R8 · current configuration · 2026-10-08','body')
    text(48,112,'Shared signals route via breadboard rows S1–S6 below; all other signal connections use dedicated direct jumpers.','small')
    shared_rows = {str(gpio): 'S'+str(i+1) for i,gpio in enumerate([11,12,13,15,47,48])}
    rect(505,145,390,1035,'#e7f0f5','#8ba4b4')
    text(700,180,'ESP32-S3 N16R8','heading','middle')
    text(700,205,'16 MB flash · 8 MB OPI PSRAM','small','middle')
    groups = [
        ('TFT ILI9341', 'TPM408-2.8 display', 'left', 245, '#087e8b'),
        ('Touch XPT2046', 'Touch shares display SPI', 'left', 495, '#087e8b'),
        ('Joystick', 'KY-023 · active-low click', 'left', 725, '#9b6500'),
        ('NRF24L01+', 'One PA/LNA radio; IRQ open', 'left', 910, '#6f55a5'),
        ('MicroSD', 'Separate SPI reader', 'right', 245, '#287d48'),
        ('CC1101', 'GDO2 remains unconnected', 'right', 465, '#287d48'),
        ('PN532', 'SPI · SW1 OFF / SW2 ON', 'right', 695, '#bc5c22'),
        ('GPS NEO-6M', '9600 baud · module RX open', 'right', 895, '#2968aa'),
        ('IR receiver', 'KY-022 · test pending', 'right', 1020, '#96526d'),
        ('IR transmitter', 'KY-005 · test pending', 'right', 1130, '#96526d'),
    ]
    for module, subtitle, side, y, color in groups:
        pins = [row for row in rows if row['module'] == module]
        x = 40 if side == 'left' else 1050
        rect(x,y-36,310,78+len(pins)*25,'#ffffff')
        text(x+16,y-10,module,'heading')
        text(x+16,y+13,subtitle,'small')
        for i,row in enumerate(pins):
            py=y+43+i*25
            gpio=row['esp32_gpio']
            gpio_label = 'GPIO'+gpio + (' · '+shared_rows[gpio] if gpio in shared_rows else '')
            if side == 'left':
                text(x+16,py,row['module_pin'],'pin')
                out.append(f'<path d="M350 {py-5} H505" stroke="{color}" stroke-width="2" fill="none"/>')
                text(521,py,gpio_label,'pin')
                ends=(350,505)
            else:
                text(x+16,py,row['module_pin'],'pin')
                out.append(f'<path d="M895 {py-5} H1050" stroke="{color}" stroke-width="2" fill="none"/>')
                text(878,py,gpio_label,'pin','end')
                ends=(895,1050)
            for px in ends:
                out.append(f'<circle cx="{px}" cy="{py-5}" r="3" fill="{color}"/>')
    text(700,1100,'Reserved: USB GPIO19/20','small','middle')
    text(700,1125,'Flash 26–32 · PSRAM 33–37','small','middle')
    text(700,1150,'RGB LED disabled on GPIO48','small','middle')
    # Physical split points: one isolated five-hole strip per shared signal net.
    rect(40,1220,1320,680,'#ffffff')
    text(60,1260,'BREADBOARD · 400-point power distribution and shared signal splits','heading')
    text(60,1288,'S1–S6 are suggested isolated row labels, not fixed printed row numbers. One ESP32 jumper feeds each row.','small')
    text(60,1314,'Shared GPIO labels in the module diagram above refer to these same six rows.','small')
    rect(350,1340,340,470,'#f0f3ee','#afbab2')
    text(520,1370,'BREADBOARD SIGNAL ROWS','small','middle')
    for i,gpio in enumerate([11,12,13,15,47,48]):
        y=1410+i*66
        label='S'+str(i+1)
        color='#287d48' if gpio in (11,12,13) else '#087e8b'
        text(60,y+6,'ESP32 GPIO'+str(gpio),'pin')
        out.append(f'<path d="M220 {y} H395" stroke="{color}" stroke-width="2"/>')
        text(370,y-14,label,'small')
        out.append(f'<path d="M395 {y} H635" stroke="{color}" stroke-width="3"/>')
        for j in range(5):
            out.append(f'<circle cx="{395+j*60}" cy="{y}" r="7" fill="white" stroke="{color}" stroke-width="2"/>')
        out.append(f'<path d="M635 {y} H720" stroke="{color}" stroke-width="2"/>')
        endpoints=[row for row in rows if int(row['esp32_gpio']) == gpio]
        short_names={'TFT ILI9341':'TFT','Touch XPT2046':'Touch','MicroSD':'SD'}
        destinations=' + '.join(short_names.get(row['module'],row['module'])+' '+row['module_pin'] for row in endpoints)
        text(740,y+6,destinations,'small')
    text(60,1838,'POWER RAILS: ESP32 GND → common GND rail; ESP32 3V3 → separate labelled 3V3 rail.','body')
    text(60,1866,'Keep every S-row isolated. Never bridge 3V3 and 5V. Check split power-rail continuity. Dedicated signals can bypass the breadboard.','small')
    rect(40,1940,1320,215,'#ffffff')
    text(60,1972,'POWER AND UNCONNECTED SIGNALS','heading')
    for y,s in [(2000,'USB powers the tested build. All module grounds connect to common GND through the breadboard rails.'),
                (2028,'3V3: joystick, NRF24, CC1101, TFT backlight; PN532 supply follows the documented 3V3 plan. Add 10–47 µF near NRF24.'),
                (2056,'TFT VCC / SD / GPS / IR supply: confirm the exact breakout rating; MCU signal levels must be 3.3 V compatible.'),
                (2084,'Leave GPS RX, NRF24 IRQ, and CC1101 GDO2 open. Touch IRQ46 is wired but polled. GPIO45/46 are strapping pins.'),
                (2112,'Battery / TP4056 / switch are mechanical provisions only; no verified regulated battery power schematic is included.'),
                (2140,'Sources: ESP32-DIV/BoardConfig.h · tft_espi-patch/User_Setup.h · hardware/pin-map.csv. See hardware/README.md.')]:
        text(60,y,s,'small')
    out.append('</svg>')
    (HERE / 'wiring.svg').write_text('\n'.join(out)+'\n')
    print(f'Validated {len(rows)} signal connections and 7 display patch pins; wrote hardware/wiring.svg')


if __name__ == '__main__':
    main()
