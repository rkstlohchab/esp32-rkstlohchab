# ESP32-DIV — port to ESP32-S3 DevKitC-1 N16R8

Upstream ESP32-DIV **V2** targets an **ESP32-S3-WROOM-1U-N16** (confirmed in
`Schematic/v2/main-BOM.xls`): 16 MB flash, **no PSRAM**. With no PSRAM die in the
module, GPIO 33–37 are free, so upstream routes the display + touch bus there.

This board is an **ESP32-S3 N16R8**: 16 MB flash **plus 8 MB octal PSRAM**. Octal
PSRAM is bonded to GPIO 33–37 *inside the module*, so those pins cannot be used as
GPIO while PSRAM is enabled. The port moves the display bus off those pins and keeps
the full 8 MB PSRAM.

**Status: RUNNING on hardware with display + touch + joystick (2026-09-24).** The
TPM408-2.8 panel renders portrait, touch is calibrated, and the joystick drives the
menus. Firmware ~2.76 MB (87% of the 3 MB app partition) with the built-in IR
database. Display wiring and quirks are documented in `tft_espi-patch/` and the
project memory; see the pin map below for the current schema.

---

## Build settings (Arduino IDE)

Board: **ESP32S3 Dev Module**

| Setting | Value |
|---|---|
| USB CDC On Boot | **Enabled** — the DevKit has no CP2102; serial rides native USB |
| PSRAM | **OPI PSRAM** |
| Flash Size | 16MB (128Mb) |
| Flash Mode | QIO 80MHz |
| Partition Scheme | 16M Flash (3MB APP/9.9MB FATFS) |
| CPU Frequency | 240MHz |
| Upload Speed | 921600 |
| USB Mode | Hardware CDC and JTAG |

Open `esp32-div/ESP32-DIV/ESP32-DIV.ino`. `BoardConfig.h` already selects this board.

Verified via arduino-cli with:
`esp32:esp32:esp32s3:PSRAM=opi,FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,CDCOnBoot=cdc,FlashMode=qio,CPUFreq=240,USBMode=hwcdc`

---

## What was changed, and why

The design goal was **all board differences in one place**. Every pin in
`shared.h` is `#ifndef`-guarded, so `BoardConfig.h` overrides them without touching
upstream sources. Upstream files carry only two tiny, marked edits; every original
is saved next to it as `.upstream`/`.orig`/`.stock`.

### 1. `ESP32-DIV/BoardConfig.h` — rewritten (upstream saved as `.upstream`)
The whole port lives here: joystick nav, moved display/touch bus, verified NRF24
pins, PN532-over-SPI, and placeholder pins for unfitted modules. Fully commented.

### 2. `ESP32-DIV/NavInput.h` — new
`JoystickNav` implements the three methods the feature code calls on the PCF8574
(`begin` / `pinMode` / `digitalRead`) and maps the 5-way keypad onto the KY-023's
two ADC axes + click. `typedef … NavExpander` picks joystick or real PCF8574. No
feature file changes; the object is still called `pcf`.

### 3. `ESP32-DIV/shared.h` — 3 marked edits (upstream saved as `.upstream`)
- `#include "NavInput.h"` after `BoardConfig.h`.
- `SD_NO_CARD_DETECT` guard so a card-detect-less breakout skips the `SD_CD` read.
- `TFT_CS_PIN` / `TFT_DC_PIN` / `TFT_RST_PIN` made overridable.

### 4. `pcf` object type: `PCF8574` → `NavExpander`
Six declaration sites (`bleconfig.h`, `config.h`, `wificonfig.h`, `subconfig.h`,
`ducky.cpp`, `ESP32-DIV.ino`). `ESP32-DIV.ino` also guards `#include <PCF8574.h>`.

### 5. `TFT_eSPI/User_Setup.h` — display pins + speed (stock saved as `.div-v2-stock`)
MISO/MOSI/SCLK → the shared SD bus (13/11/12); CS/DC/RST → 39/40/41;
`SPI_FREQUENCY` 27 MHz → 20 MHz (those pins have the parasitic PSRAM die on them).

### 6. `SmartRC-CC1101-Driver-Lib` — two library bugs
- `ELECHOUSE_CC1101_SRC_JT_DRV.*` moved to `jamtool_unused/` — the library shipped
  two full copies of the class, colliding on every symbol. The sketch never uses
  the JT variant. (originals in that subfolder)
- `bool spi` → `static bool spi` in `ELECHOUSE_CC1101_SRC_DRV.cpp` — collided with
  TFT_eSPI's global `spi`. (original saved as `.orig`)

### 7. `~/Library/Arduino15/.../2.0.10/platform.local.txt` — new
Prepends `-zmuldefs` to the linker libs so the sketch's
`ieee80211_raw_frame_sanity_check()` override replaces the WiFi SDK's copy (raw
frame injection). This is exactly what upstream's bundled `platform.txt` does. An
overlay file, so the stock `platform.txt` is untouched; delete to revert.

---

## Library versions (pinned — newer majors break this code)

| Library | Version | Why pinned |
|---|---|---|
| esp32 core | 2.0.10 | ESP32-DIV target; 3.x changed the APIs |
| NimBLE-Arduino | 1.4.x | code uses `NimBLEAdvertisedDeviceCallbacks` (1.x API) |
| ArduinoJson | 6.21.x | code uses `StaticJsonDocument` (6.x API) |
| arduinoFFT | 1.6.x | code uses `arduinoFFT` type + `FFTSUB` (2.x renamed) |
| Adafruit PN532, IRremoteESP8266, rc-switch, XPT2046_Touchscreen | latest | fine |
| RF24, TFT_eSPI, SmartRC-CC1101 | bundled | from the repo |

---

## Pin map (this board)

Rewired 2026-09-23 onto a dedicated display bus (see `BoardConfig.h`, the source of
truth). **3V3 and GND are distributed through the breadboard**, so every module's
power comes off the breadboard rails, not the ESP32 directly.

### Connected and verified now

| GPIO | Function | Notes |
|---|---|---|
| 4 / 5 / 6 | Joystick VRX / VRY / SW | direct to ESP32; SW also = Marauder-boot hold |
| 15 | TFT SDI **+** touch T_DIN | shared display data-in (MOSI) |
| 47 | TFT SCK **+** touch T_CLK | shared display clock |
| 48 | TFT SDO **+** touch T_DO | shared display data-out (MISO) |
| 39 | TFT CS | USB-safe pin (moved off GPIO20) |
| 9 | TFT DC | |
| 8 | TFT RST | |
| 45 | Touch T_CS | rides the shared display bus |
| 46 | Touch T_IRQ | strap pin — pull to enter flash mode |
| 3V3 | Display backlight (LED) | LED tied directly to 3V3; GPIO42 is PN532 MISO |

GPIO 48 doubles as the onboard WS2812; it is disabled in firmware
(`BOARD_NO_STATUS_RGB`) because it is now the display MISO line.

**NRF24L01+ and CC1101 added 2026-09-24 — SPI verified** (boot self-test read the
CC1101 version register and the NRF24 chip-connected check, both OK):

| GPIO | Function | Notes |
|---|---|---|
| 7 / 16 / 17 / 18 / 21 | NRF24 CSN / CE / SCK / MOSI / MISO | own SPI bus; add a 10µF cap at the module |
| 12 / 11 / 13 | CC1101 SCK / MOSI / MISO | shares the (still empty) SD bus |
| 40 | CC1101 CS | PN532 has its own CS on GPIO2 |
| 1 | CC1101 GDO0 (SubGHz data) | single async data line for both RX and TX |

CC1101 **GDO2 is left unconnected** (not needed for OOK). Firmware points every
SubGHz data macro (`SUBGHZ_RX_PIN`, `SUBGHZ_TX_PIN`, `RX_PIN`, `TX_PIN`,
`CC1101_GDO0`, `CC1101_GDO2`) at GPIO1 to match this wiring. The unfitted 3rd
NRF24's placeholder pins were moved off GPIO1/2 to free UART0 pins 43/44.

### Newly connected, verification pending (2026-09-30)

| GPIO | Function | Test result |
|---|---|---|
| 10 / 11 / 12 / 13 | MicroSD CS / MOSI / SCLK / MISO | Reader wired; no card inserted, so no card probe or read/write test possible. The boot message `SD Card detected` is an assumption when no card-detect pin exists. |
| 2 / 11 / 12 / 42 | PN532 CS / MOSI / SCLK / MISO | SPI communication verified on 2026-10-05 after setting SW1 OFF / SW2 ON. Firmware query returned `0x32010607` (PN532 version 1.6) on two boots. Previously both switches were OFF (UART mode), explaining the failed SPI probes. MISO is dedicated GPIO42; card reading remains to be tested. |
| 41 | GPS UART RX (module TX) | Verified after connecting GPS GND to the shared ground bus: 7,799 bytes and 282 valid NMEA lines in 47 seconds at 9600 baud. Module RX is left open; firmware's TX placeholder is GPIO0. |
| 14 / 38 | IR RX / TX | Firmware assignments; electrical function not tested in this session. These pins overlap the unfitted NRF24 #2 placeholders. |

The 18650 and boost circuit are disconnected; the board was USB powered during
these checks. A temporary diagnostic also read CC1101 part `0x00`, version `0x14`,
NRF24 status `0x0E`, and changing joystick ADC values. The diagnostic was
replaced by the merged firmware with PN532 CS corrected to GPIO2, and that build
reached `[boot] ready` over USB serial.

### Conflicts to resolve before adding the overlapped parts

| Pins | Shared between |
|---|---|
| 38 | NRF24 #2 CSN **and** IR TX |
| 14 | NRF24 #2 CE **and** IR RX |

Free pins for reassigning: **3, 43, 44** (43/44 are the unused UART0 pins on this
native-USB board). Never use 19/20 (USB), 26–32 (flash), 33–37 (octal PSRAM).

The PN532 shares SPI clock GPIO12 and MOSI GPIO11 with the CC1101 and SD reader,
but now has dedicated MISO GPIO42 and CS GPIO2. CC1101 and SD continue sharing
MISO GPIO13 with separate CS pins 40 and 10.

---

## Rebuild / revert

Rebuild: open the sketch, apply the settings above, Upload. `platform.local.txt`
and the library edits persist in the Arduino folders.

Revert any piece:
```
# board config / shared.h
cp ESP32-DIV/BoardConfig.h.upstream ESP32-DIV/BoardConfig.h
cp ESP32-DIV/shared.h.upstream      ESP32-DIV/shared.h
# TFT display config
cp ~/Documents/Arduino/libraries/TFT_eSPI/User_Setup.h.div-v2-stock \
   ~/Documents/Arduino/libraries/TFT_eSPI/User_Setup.h
# CC1101 spi symbol
cp ~/Documents/Arduino/libraries/SmartRC-CC1101-Driver-Lib/ELECHOUSE_CC1101_SRC_DRV.cpp.orig \
   ~/Documents/Arduino/libraries/SmartRC-CC1101-Driver-Lib/ELECHOUSE_CC1101_SRC_DRV.cpp
# linker overlay
rm ~/Library/Arduino15/packages/esp32/hardware/esp32/2.0.10/platform.local.txt
```
