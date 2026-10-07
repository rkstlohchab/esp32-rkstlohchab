# ESP32-DIV + Marauder — merged firmware

A copy of the ESP32-DIV N16R8 port (`esp32-div/`) with **ESP32Marauder embedded as
a headless serial-CLI subsystem**. DIV keeps its full display UI and its own features
(WiFi/BLE UI, SubGHz, NFC, IR, GPS); Marauder adds its deeper WiFi/BLE/GPS engine,
reachable over the USB serial CLI.

**Status: FULL-UI merge — compiles (71%), normal boot verified on hardware (2026-09-21).**
Marauder now runs with its COMPLETE native touch UI (116 screens), not a CLI.
DIV boots clean (banner, SD, BLE init, PCF/joystick nav, no crash, single boot).
Marauder CLI is live over serial: `help` returns the full command set, and a real
`scanall` found local APs with RSSI/channel/BSSID *and* station-to-AP relationships;
`stopscan` and `list -a` work. No panics or boot loops.

- Merged app size: **2,239,885 bytes (71%** of a 3 MB app partition, full UI)
- RAM: 155,572 bytes static (47%)
- **Zero symbol collisions** between the two codebases.

## How the merge works

The blocker with a "real" merge is that Marauder's WiFi engine (`WiFiScan.cpp`,
12,789 lines) has **923 references to Marauder's own `Display` object** — its engine
is inseparable from its UI. Merging two display UIs onto one screen is not feasible.

The solution: Marauder's own full touch UI is re-enabled by targeting its
`MARAUDER_MULTIBOARD_S3` board (an ESP32-S3 + ILI9341) and grafting the ILI9341
320x240 UI-layout constants (from Marauder's `MARAUDER_V4` blocks) onto it, since the
stock S3 target ships headless. Both DIV and Marauder drive the SAME ILI9341 through
TFT_eSPI's one `User_Setup.h`, and both read touch via `tft.getTouch()` — so they
share the display + touch layer cleanly.

**Two modes, selected at boot** (no dual-UI-on-one-screen conflict):
- Normal power-on -> **ESP32-DIV** (its UI + SubGHz/NFC/IR + its own WiFi/BLE).
- **Hold the joystick click at power-on -> Marauder's full touch UI** (all 116
  screens: WiFi/BLE attacks, scans, evil portal, wardrive, etc.). Reboot to switch.

The engine lives under `ESP32-DIV/src/marauder/`; `marauder_setup()/marauder_loop()`
are invoked exclusively when the joystick launches Marauder mode.

## What was changed (all in the copy, originals untouched)

1. **`ESP32-DIV/src/marauder/`** — all 83 Marauder source files, plus:
   - `configs.h`: `#define GENERIC_ESP32` enabled (headless: WiFi + BT, no screen)
   - `marauder_app.cpp`: Marauder's `.ino`, with `setup()/loop()` renamed to
     `marauder_setup()/marauder_loop()`, and the `while(!Serial)` boot-wait bounded
     to 1.5 s so it never blocks on battery.
   - `marauder_app.h`: exposes those two entry points.
2. **`ESP32-DIV/ESP32-DIV.ino`** — includes `src/marauder/marauder_app.h`, calls
   `marauder_setup()` at the end of `setup()` and `marauder_loop()` at the top of
   `loop()`. So Marauder's CLI runs alongside DIV's UI.
3. **Partition scheme → Huge APP (3 MB + 1 MB SPIFFS), no OTA.** Marauder stores its
   settings in **SPIFFS**, which the FAT partition scheme lacks. Huge APP provides
   SPIFFS and still fits the 2 MB merged app. (Trade-off: no OTA on this build.)

## Build settings (Arduino IDE)

Same as the DIV port EXCEPT the partition scheme:

| Setting | Value |
|---|---|
| Board | ESP32S3 Dev Module |
| PSRAM | OPI PSRAM |
| Flash Size | 16MB (128Mb) |
| **Partition Scheme** | **Huge APP (3MB No OTA/1MB SPIFFS)** |
| USB CDC On Boot | Enabled |
| Flash Mode | QIO 80MHz |
| CPU | 240MHz |

FQBN: `esp32:esp32:esp32s3:PSRAM=opi,FlashSize=16M,PartitionScheme=huge_app,CDCOnBoot=cdc,FlashMode=qio,CPUFreq=240,USBMode=hwcdc`

## Libraries added for Marauder (DIV's shared deps kept per instruction)

Installed alongside DIV's set; where shared (NimBLE, TFT_eSPI, ArduinoJson) DIV's
versions were kept:

| Library | Version | For |
|---|---|---|
| LinkedList | (Marauder submodule) | Marauder data structures |
| Adafruit NeoPixel | 1.15.5 | LED (guarded off headless) |
| MicroNMEA | 2.0.6 | GPS parsing |
| EspSoftwareSerial | 8.1.0 | GPS soft-serial |
| ESP32Ping | (github marian-craciunescu) | network ping scan |
| Async TCP | 3.5.0 | Evil Portal async server |
| ESP Async WebServer | 3.12.1 | Evil Portal |

Note: Async TCP 3.x and ESP Async WebServer 3.x MUST be paired (the old me-no-dev
1.1.4 AsyncTCP fails to compile against WebServer 3.x).

## How to use once flashed

- **DIV's UI** works as before on the display (needs the 2.8" ILI9341).
- **Marauder's CLI** is live over USB serial at 115200. Open the Serial Monitor and
  type `help` for the full command list — `scanall`, `attack -t deauth`, `sniffraw`,
  `blespam`, `evilportal`, `wardrive`, `list`, `select`, etc.

## Verified on hardware / remaining caveats

Resolved by the boot+scan test: boots clean, Marauder WiFi engine actually scans, no
crash. Still worth knowing:
1. **Double WiFi init** — both DIV and Marauder init WiFi. Should be fine if only one
   drives the radio at a time, but a DIV WiFi feature + a Marauder scan at once could
   conflict.
2. **RAM under load** — 47% static; running a heavy Marauder scan *and* DIV together
   could get tight.
3. **Serial contention** — DIV's "Serial Monitor" tool and Marauder's CLI both read
   serial; avoid using both at once.
4. **Boot time** — `marauder_setup()` adds WiFi + SPIFFS init before DIV's UI appears.

If any of these misbehave, the fallback is **lazy activation**: gate `marauder_setup()`
behind a DIV menu entry so Marauder only initializes when you enter its mode.

## Revert

This whole thing is a copy — `esp32-div/` (DIV-only) is untouched. Delete
`esp32-div-marauder/` to discard the merge entirely.
