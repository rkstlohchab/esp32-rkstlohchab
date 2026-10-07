"""Build the illustrated one-sheet wiring guide from the checked netlist and enclosure specs."""
from pathlib import Path
from collections import Counter
import csv
import html
import runpy
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
SPECS=runpy.run_path(str(ROOT/'enclosure/src/parts.py'))['SPECS']
with (ROOT/'hardware/pin-map.csv').open(newline='') as f: ROWS=list(csv.DictReader(f))
COUNTS=Counter(r['esp32_gpio'] for r in ROWS)
W,H=2800,2680
O=[]
C={'11':'#127c61','12':'#a57814','13':'#2675a6','15':'#0c8792','47':'#c26a28','48':'#8055a0'}
NAMES={'Joystick':'KY-023 joystick','TFT ILI9341':'TFT','Touch XPT2046':'Touch','NRF24L01+':'NRF24L01+','MicroSD':'MicroSD','CC1101':'CC1101','PN532':'PN532','GPS NEO-6M':'GPS NEO-6M','IR receiver':'IR receiver','IR transmitter':'IR transmitter'}

def text(x,y,s,size=22,color='#213748',weight=400,anchor='start',mono=False):
    font='ui-monospace,Menlo,monospace' if mono else 'Arial,Helvetica,sans-serif'
    O.append(f'<text x="{x}" y="{y}" font-family="{font}" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{html.escape(str(s))}</text>')

def rect(x,y,w,h,fill='#fff',stroke='none',rx=14):
    O.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>')

def line(x1,y1,x2,y2,c='#405caf',sw=3):
    O.append(f'<path d="M{x1} {y1} H{x2}" fill="none" stroke="{c}" stroke-width="{sw}"/>') if y1==y2 else O.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{c}" stroke-width="{sw}"/>')

def path(d,c,sw=3): O.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{sw}" stroke-linejoin="round"/>')
def circle(x,y,r,fill,stroke='none',sw=1): O.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def board(key,x,y,bw,bh):
    """Recognizable top-view illustration using the enclosure's dimensions and features."""
    s=SPECS[key];L=s['L'];V=s['W'];ext=13 if key in ('esp32','nrf24','cc1101') else 0
    scale=min(bw/(L+ext),bh/V);ox=x+(bw-(L+ext)*scale)/2;oy=y+(bh-V*scale)/2
    O.append(f'<g transform="translate({ox},{oy}) scale({scale})">')
    rect(0,0,L,V,s['color'],'#13212c',1.5)
    for hx,hy in s.get('holes',[]):circle(hx,hy,s.get('pad_d',s.get('hole_d',2)+1)/2,'#bda775');circle(hx,hy,s.get('hole_d',2)/2,'#eef2ef')
    def pin(px,py):rect(px-.65,py-.65,1.3,1.3,'#e2bd66','none',.15)
    if key=='esp32':
        for row in s['rows']:
            for i in range(s['npins']):pin(s['pin0']+i*2.54,row)
        m=s['module'];rect(m['can_x0'],m['y0'],m['can_x1']-m['can_x0'],m['y1']-m['y0'],'#b8c2c7','#798892',.8)
        rect(56.2,4.97,7.19,18,'#242e2f','none',.4)
        for yy in [7,11,15,19]:line(57,yy,62,yy,'#b9a360',.6)
        for u in s['usb']:rect(-.4,u['y']-4.47,7.35,8.94,'#b8c2c7','#7d888f',1)
        for b in s['buttons']:rect(b['x']-1.5,b['y']-2,3,4,'#899396','none',.4);circle(b['x'],b['y'],.8,'#20282c')
        rect(12,5,5,4,'#293238','none',.4)
    elif key=='display':
        g=s['glass'];rect(g['x0'],g['y0'],g['x1']-g['x0'],g['y1']-g['y0'],'#c1c5ca','none',.8)
        a=s['aa'];rect(a['x0'],a['y0'],a['x1']-a['x0'],a['y1']-a['y0'],'#132936','none',.5)
        text(25,42,'rkstlohchab',4,'#5cd1d0',700,'middle')
        for i in range(14):pin(s['hdr']['x0']+i*2.54,s['hdr']['y'])
    elif key=='joystick':
        for py in s['pins_y']:pin(s['pins_x'],py)
        rect(10,4,18,18,'#aeb8bc','none',1);circle(19,13,10.5,'#2b3036','#56636b',.6);circle(19,13,7.5,'#151b21')
    elif key in ('nrf24','cc1101'):
        for px in s['hdr_x']:
            for py in s['hdr_y']:pin(px,py)
        if key=='cc1101':rect(9,4,7,7,'#b9c2c5','#66737a',.7)
        else:rect(13,4.5,6,6,'#292f35','#6f797f',.4)
        rect(L-6,V/2-3.1,10,6.2,'#d5ae55','#99792f',.4);rect(L+4,V/2-2.5,5,5,'#c59c41','none',.3)
    elif key=='pn532':
        for inset in [2,3.3,4.6]:rect(inset,inset,L-2*inset,V-2*inset,'none','#e8ad67',1.2)
        rect(22.5,19.2,6,6,'#212c32','none',.4)
        for i in range(8):pin(s['spi_x0']+i*2.54,s['spi_y'])
        d=s['dip'];rect(d['x']-3,d['y']-2.25,6,4.5,'#a01218','none',.3)
        rect(d['x']-2,d['y']+.3,1.4,1.5,'white','none',.1);rect(d['x']+.3,d['y']-1.8,1.4,1.5,'white','none',.1)
    elif key=='sdcard':
        a=s['socket'];rect(a['x0'],a['y0'],a['x1']-a['x0'],a['y1']-a['y0'],'#b8c0c4','#7a8b94',1)
        rect(25,15.8,5,4.4,'#232b33','none',.3);rect(24.75,4,6.5,3.5,'#232b33','none',.3)
        for py in s['hdr_y']:pin(s['hdr_x'],py)
    elif key=='gps':
        a=s['neo'];rect(a['x']-a['lx']/2,a['y']-a['ly']/2,a['lx'],a['ly'],'#c1c7c9','#697d89',1)
        text(13,18,'NEO-6M',2,'#324854',700,'middle');circle(5.5,28.5,3.4,'#bfc8c9')
        for px in s['hdr_x']:pin(px,s['hdr_y'])
    elif key in ('ir_tx','ir_rx'):
        for py in s['pins_y']:pin(s['pins_x'],py)
        if key=='ir_tx':circle(4,7.5,3.5,'#cee1e7','#9dafb6',.5)
        else:rect(9,4.5,6,6,'#aebac3','#657982',.6);circle(11,7.5,2.5,'#26323c')
    O.append('</g>')


def main():
    # Reuse the exact board/display checks before producing any new artifact.
    runpy.run_path(str(ROOT/'hardware/generate_wiring.py'),run_name='__main__')
    O.extend([f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">','<title id="title">Illustrated ESP32-S3 wiring: shared breadboard nets and direct component pins</title>','<desc id="desc">One-sheet wiring guide using enclosure component models and the verified firmware GPIO map. Six shared GPIO feeds branch from labelled breadboard rows; all 21 dedicated signals connect directly to ESP32 GPIOs.</desc>'])
    rect(0,0,W,H,'#edf2f3',rx=0);rect(0,0,W,180,'#142d3d',rx=0)
    text(55,65,'esp32-rkstlohchab',44,'#fff',700)
    text(55,112,'FINAL WIRING GUIDE  /  ESP32-S3 N16R8',26,'#bbd7e1',600)
    text(55,150,'Component illustrations from the enclosure design · GPIO connections checked against firmware · 08 OCT 2026',21,'#a9c7d1')
    text(2140,65,'SHARED → BREADBOARD',22,'#73d4bb',700)
    text(2140,106,'DEDICATED → ESP32',22,'#aabaff',700)
    text(2140,147,'POWER → LABELLED RAILS',22,'#ffc2a9',700)
    # Shared net panel.
    rect(35,210,1335,1365,'#fff','#d7e0e4')
    text(65,255,'01',27,'#128066',700);text(125,255,'Shared signals through the breadboard',29,weight=700)
    text(65,293,'One GPIO feed per row. Separate wires from that row reach the component pins.',21)
    rect(65,325,180,1205,'#e8eff3','#cad8df');board('esp32',78,345,155,95)
    text(155,471,'ESP32-S3',24,weight=700,anchor='middle');text(155,502,'N16R8',21,anchor='middle')
    rect(415,325,410,1205,'#f4f1e7','#d2cbbb')
    text(620,373,'400-POINT',24,weight=700,anchor='middle');text(620,406,'BREADBOARD',26,weight=700,anchor='middle')
    text(620,441,'Six isolated five-hole strips',20,anchor='middle')
    for i,g in enumerate(['11','12','13','15','47','48']):
        y=570+i*175;co=C[g];label=f'S{i+1}';ends=[r for r in ROWS if r['esp32_gpio']==g]
        text(225,y+7,'GPIO'+g,22,anchor='end',mono=True);line(245,y,455,y,co,4);circle(245,y,5,co)
        text(620,y-67,label+'  /  GPIO'+g,25,co,700,'middle')
        rect(440,y-22,360,44,'#e6e0cd','#c7c0ac',8);line(455,y,785,y,co,4)
        for j in range(5):circle(455+j*82.5,y,9,'#fff',co,2)
        for j,r in enumerate(ends):
            sx=537.5+j*82.5;ey=y+(j-(len(ends)-1)/2)*52
            path(f'M{sx} {y} V{ey} H970',co,3);circle(sx,y,5,co)
            rect(970,ey-22,370,44,'#f3f7f7','#d9e4e5',7);circle(970,ey,5,co)
            text(985,ey+7,NAMES[r['module']]+' · '+r['module_pin'],20,mono=True)
    text(65,1550,'S1–S6 are chosen row labels. Never join the six strips together.',20,'#576d79')
    # Direct GPIO panel; thumbnails retain the colors and proportions in enclosure specs.
    rect(1400,210,1365,2040,'#fff','#d7e0e4')
    text(1430,255,'02',27,'#405caf',700);text(1490,255,'Dedicated signals directly to ESP32',29,weight=700)
    text(1430,293,'These 21 signal wires bypass the breadboard. Every endpoint is labelled.',21)
    rect(1430,325,225,1875,'#e8eff3','#cad8df');board('esp32',1453,342,180,95)
    text(1542,471,'ESP32 GPIO',24,weight=700,anchor='middle')
    groups=[('joystick',['Joystick'],'KY-023 joystick','GND → common rail · +5V-labelled VCC → 3V3'),
            ('display',['TFT ILI9341','Touch XPT2046'],'TPM408-2.8 · TFT + touch','Six shared signal pins appear in panel 01'),
            ('nrf24',['NRF24L01+'],'NRF24L01+ PA/LNA','VCC → 3V3 · GND → rail · IRQ open'),
            ('sdcard',['MicroSD'],'Separate microSD reader','Shared: MOSI11 / SCK12 / MISO13'),
            ('cc1101',['CC1101'],'CC1101 E07-M1101D-SMA','Shared: MOSI11 / SCK12 / MISO13 · GDO2 open'),
            ('pn532',['PN532'],'PN532 NFC V3 · SPI','Shared: MOSI11 / SCK12 · SW1 OFF / SW2 ON'),
            ('gps',['GPS NEO-6M'],'NEO-6M GPS','Module TX → MCU RX · GPS RX open'),
            ('ir_rx',['IR receiver'],'KY-022 IR receiver','S / OUT is the signal pin'),
            ('ir_tx',['IR transmitter'],'KY-005 IR transmitter','S is the signal pin')]
    y=520
    for key,mods,title,note in groups:
        pins=[r for r in ROWS if r['module'] in mods and COUNTS[r['esp32_gpio']]==1]
        h=95+len(pins)*34
        rect(1990,y-26,740,h,'#f6f8fa','#dde4e8',12)
        text(2010,y+3,title,25,weight=700)
        for i,r in enumerate(pins):
            py=y+39+i*34
            text(1633,py+7,'GPIO'+r['esp32_gpio'],23,anchor='end',mono=True)
            line(1655,py,1990,py,'#405caf',3);circle(1655,py,5,'#405caf');circle(1990,py,5,'#405caf')
            pin=r['module_pin']
            if key=='cc1101' and pin=='CS':pin='CSN / CS'
            text(2010,py+7,pin,23,mono=True)
        board(key,2390,y+20,305,h-78)
        text(2010,y+h-45,note,18,'#536b79')
        y+=h+15
    assert y<2240,y
    # Power panel includes exact known supplies, without guessing breakout ratings.
    rect(35,1605,1335,445,'#fff','#d7e0e4')
    text(65,1650,'03',27,'#ac503d',700);text(125,1650,'Breadboard power rails',29,weight=700)
    text(65,1690,'Common GND for every fitted module. Keep the 3V3 and 5V rails separate.',21)
    for py,label,co in [(1750,'GND','#394e5b'),(1840,'3V3','#be4d39')]:
        text(65,py+8,'ESP32 '+label,22,mono=True);line(230,py,395,py,co,4)
        rect(395,py-25,320,50,'#f4f1e7','#d2cbbb',8);line(410,py,695,py,co,4)
        for j in range(8):circle(410+j*40,py,4,'#fff',co,1.5)
        line(695,py,755,py,co,4)
    text(775,1758,'GND of all nine module PCBs',23)
    text(775,1824,'Joystick / NRF24 / CC1101 VCC',21)
    text(775,1854,'TFT LED / PN532 VCC (documented plan)',21)
    text(65,1912,'TFT VCC, SD, GPS and IR VCC depend on the exact breakout supply rating.',21)
    text(65,1948,'Check those inputs before wiring. All ESP32-facing signals must be 3.3 V compatible.',20)
    text(65,1991,'Battery / TP4056 power path is unverified. The tested build uses USB power.',20,'#795346')
    # Assembly reference notes.
    rect(35,2280,2730,350,'#142d3d')
    text(65,2328,'PIN AND ASSEMBLY NOTES',26,'#fff',700)
    notes=[
        ('Use the pin labels, not these drawing positions.','Illustrations follow enclosure shapes and colors; wiring ports are arranged for readability.'),
        ('TFT + XPT2046 are one PCB.','The signal blocks share the panel GND. Its optional full-size SD socket is not the separate reader.'),
        ('PN532 SPI: switch 1 OFF, switch 2 ON.','Our OFF/OFF mistake selected UART and caused failed SPI probes. MISO is dedicated GPIO42.'),
        ('Reserve USB19/20 and flash/PSRAM26–37.','GPIO48 RGB is disabled. Touch45/46 are strapping pins. NRF24 #2 is absent; IR14/38 stay dedicated.'),
        ('Open pins: GPS RX, NRF24 IRQ, CC1101 GDO2.','GPS TX goes to GPIO41; reconnecting common GND fixed our NMEA communication problem.')]
    for i,(a,b) in enumerate(notes):
        yy=2370+i*45;text(65,yy,a,21,'#d6eef1',700);text(975,yy,b,20,'#bad0d9')
    text(65,2603,'Sources: hardware/pin-map.csv + ESP32-DIV/BoardConfig.h + enclosure/src/parts.py · rkstlohchab',18,'#8fb4c3')
    O.append('</svg>');dest=ROOT/'hardware/wiring-poster.svg';dest.write_text('\n'.join(O)+'\n');ET.parse(dest)
    print('Illustrated poster written:',dest)

def export_png():
    """Render with an installed Chromium browser; SVG remains the editable source."""
    import shutil
    import subprocess
    import tempfile
    browsers=[shutil.which(name) for name in ('chromium','chromium-browser','google-chrome')]
    browsers.append('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    browser=next((p for p in browsers if p and Path(p).is_file()),None)
    if not browser:
        raise SystemExit('PNG export needs Chrome or Chromium. The SVG was generated successfully.')
    with tempfile.TemporaryDirectory(prefix='rkstlohchab-poster-') as tmp:
        tmp=Path(tmp);preview=tmp/'poster.png'
        args=[browser,'--headless','--disable-gpu','--hide-scrollbars','--no-first-run',
              '--user-data-dir='+str(tmp/'profile'),'--screenshot='+str(preview),
              f'--window-size={W},{H}',(ROOT/'hardware/wiring-poster.svg').as_uri()]
        try:
            subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=20)
        except subprocess.TimeoutExpired:
            # Some Chrome builds keep background processes alive after writing the screenshot.
            pass
        if not preview.is_file():
            raise SystemExit('Browser did not produce the PNG; inspect the SVG or browser setup.')
        shutil.copyfile(preview,ROOT/'hardware/wiring-poster.png')
    print('PNG exported:',ROOT/'hardware/wiring-poster.png')


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--png',action='store_true',help='Also render the SVG to PNG using Chrome/Chromium')
    args=parser.parse_args()
    main()
    if args.png:export_png()

