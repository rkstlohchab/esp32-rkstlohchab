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

    render(rows)
    print(f'Validated {len(rows)} signal connections and 7 display patch pins; wrote hardware/wiring.svg')


def render(rows):
    # Shared nets have exactly one ESP32-to-breadboard wire. Every component
    # branch starts at its own hole on that connected breadboard strip.
    width, height = 1600, 4140
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
           '<title id="title">ESP32 wiring through breadboard shared rows and dedicated direct jumpers</title>',
           '<desc id="desc">Six ESP32 GPIO wires feed six isolated breadboard strips. Separate wires from each strip reach labelled component pins. Dedicated signals connect component pins directly to the ESP32. Components repeated across sections are the same physical modules.</desc>',
           '<style>text{font-family:Arial,sans-serif;fill:#213444}.title{font-size:32px;font-weight:700}.heading{font-size:21px;font-weight:700}.body{font-size:18px}.small{font-size:15px}.pin{font-size:18px;font-family:monospace}</style>',
           f'<rect width="{width}" height="{height}" fill="#f5f8fa"/>']
    def text(x,y,value,cls='body',anchor='start'):
        out.append(f'<text x="{x}" y="{y}" class="{cls}" text-anchor="{anchor}">{html.escape(str(value))}</text>')
    def rect(x,y,w,h,fill='#ffffff',stroke='#cfdae0'):
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}"/>')
    def wire(path,color='#087e8b'):
        out.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="2.5"/>')
    def dot(x,y,color):
        out.append(f'<circle cx="{x}" cy="{y}" r="4" fill="{color}"/>')
    text(40,52,'esp32-rkstlohchab · actual connection paths','title')
    text(40,85,'ESP32-S3 N16R8 · GPIO-labelled schematic · 2026-10-08','body')
    text(40,116,'Each shared component wire ends on the breadboard. Only dedicated signal wires connect directly to the ESP32.','small')
    text(40,143,'Component names repeated in different sections refer to pins on the SAME physical module. Layout is schematic, not to scale.','small')
    rect(40,185,260,2820,'#e7f0f5','#8ba4b4')
    text(170,220,'ESP32-S3','heading','middle')
    text(170,249,'N16R8 DevKit','body','middle')
    text(170,278,'GPIO labels, not','small','middle')
    text(170,300,'header positions','small','middle')
    text(420,215,'SHARED SIGNALS: ESP32 → BREADBOARD → COMPONENT PINS','heading')
    rect(420,255,480,1095,'#f0f3ee','#afbab2')
    text(660,292,'BREADBOARD · 400-point','heading','middle')
    text(660,321,'Six isolated connected five-hole strips','small','middle')
    text(660,344,'S1–S6 are suggested row labels','small','middle')
    for index,gpio in enumerate([11,12,13,15,47,48]):
        y=430+index*170
        label=f'S{index+1}'
        color='#287d48' if gpio in (11,12,13) else '#087e8b'
        endpoints=[row for row in rows if int(row['esp32_gpio'])==gpio]
        text(275,y+6,f'GPIO{gpio}','pin','end')
        wire(f'M300 {y} H470',color)
        dot(300,y,color)
        text(660,y-65,f'{label} · GPIO{gpio}','heading','middle')
        rect(450,y-18,420,36,'#e3e9de','#afbab2')
        wire(f'M470 {y} H850',color)
        for j in range(5):
            out.append(f'<circle cx="{470+j*95}" cy="{y}" r="7" fill="white" stroke="{color}" stroke-width="2"/>')
        for j,row in enumerate(endpoints):
            tap=565+j*95
            target=y+(j-(len(endpoints)-1)/2)*46
            wire(f'M{tap} {y} V{target} H1100',color)
            dot(tap,y,color)
            rect(1100,target-19,450,38)
            text(1116,target+6,row['module']+' · '+row['module_pin'],'pin')
            dot(1100,target,color)
    text(420,1380,'Keep S1–S6 electrically separate. Every dot on a strip is connected; crossing wires elsewhere are not junctions.','small')
    text(420,1410,'PN532 MISO42 is dedicated. NRF24 SCK17/MOSI18/MISO21 are dedicated. Do not join them to these strips.','small')
    text(420,1470,'DEDICATED SIGNALS: COMPONENT PIN ↔ ESP32 GPIO','heading')
    text(420,1500,'These jumpers bypass the breadboard. Each line below has one module pin and one ESP32 pin.','small')
    y=1550
    modules=list(dict.fromkeys(row['module'] for row in rows))
    for module in modules:
        pins=[row for row in rows if row['module']==module and
              sum(other['esp32_gpio']==row['esp32_gpio'] for other in rows)==1]
        if not pins:
            continue
        rect(1100,y-25,450,52+len(pins)*31)
        text(1116,y+1,module,'heading')
        for index,row in enumerate(pins):
            py=y+33+index*31
            text(275,py+6,'GPIO'+row['esp32_gpio'],'pin','end')
            wire(f'M300 {py} H1100','#6f55a5')
            text(1116,py+6,row['module_pin'],'pin')
            dot(300,py,'#6f55a5');dot(1100,py,'#6f55a5')
        y+=78+len(pins)*31
    # The same breadboard also distributes ground and known 3V3 supplies.
    text(420,3050,'BREADBOARD POWER RAILS · INDIVIDUAL COMPONENT POWER PINS','heading')
    rect(420,3080,480,760,'#f0f3ee','#afbab2')
    text(660,3120,'COMMON GND RAIL','heading','middle')
    wire('M650 3160 V3500','#374957')
    text(40,3166,'ESP32 GND','pin')
    wire('M200 3160 H650','#374957')
    ground_modules=[module for module in modules if module != 'Touch XPT2046']
    for index,module in enumerate(ground_modules):
        py=3160+index*36
        wire(f'M650 {py} H1100','#374957')
        dot(650,py,'#374957')
        rect(1100,py-16,450,32)
        text(1116,py+6,('TFT / touch panel' if module == 'TFT ILI9341' else module)+' · GND','pin')
    text(660,3570,'3V3 RAIL','heading','middle')
    wire('M650 3610 V3790','#c2413b')
    text(40,3616,'ESP32 3V3','pin')
    wire('M200 3610 H650','#c2413b')
    supplies=['Joystick · VCC (+5V silkscreen)', 'NRF24L01+ · VCC',
              'CC1101 · VCC', 'TFT ILI9341 · LED backlight',
              'PN532 · VCC (documented plan)']
    for index,label in enumerate(supplies):
        py=3610+index*40
        wire(f'M650 {py} H1100','#c2413b')
        dot(650,py,'#c2413b')
        rect(1100,py-16,450,32)
        text(1116,py+6,label,'pin')
    text(40,3890,'TFT module VCC, SD reader, GPS and IR VCC: verify your exact breakout supply rating; not assumed to share one voltage.','small')
    text(40,3920,'Touch and TFT are on the same panel PCB. The diagram labels their signal blocks separately; connect the panel common GND.','small')
    text(40,3950,'Leave GPS RX, NRF24 IRQ and CC1101 GDO2 open. Touch IRQ46 is wired but polled. Touch GPIO45/46 are strapping pins.','small')
    text(40,3980,'USB19/20, flash26–32 and PSRAM33–37 are reserved. RGB on GPIO48 is disabled. Battery circuit remains unverified/disconnected.','small')
    text(40,4010,'Breadboard rails may be split; check continuity. Never bridge 3V3 and 5V. GPIO labels identify signals, not physical header positions.','small')
    text(40,4040,'Source: BoardConfig.h + pin-map.csv. See hardware/BREADBOARD.md and docs/ASSEMBLY-MISTAKES.md.','small')
    out.append('</svg>')
    (HERE/'wiring.svg').write_text('\n'.join(out)+'\n')


if __name__ == '__main__':
    main()
