# Build and flash

Target: **ESP32-S3 N16R8** (16 MB flash, 8 MB OPI PSRAM), TPM408-2.8 ILI9341 + XPT2046, KY-023 joystick.

## Quick firmware download

Use the current files in [`firmware/`](../firmware/README.md). They were compiled from this repository's branded firmware snapshot. The old upstream web flasher and bundled board binaries are not the current N16R8 build.

## Build prerequisites

Install Arduino IDE / Arduino CLI and the **Espressif ESP32 core 2.0.10**. Core 3.x is not validated for this code. Open [`ESP32-DIV/ESP32-DIV.ino`](../ESP32-DIV/ESP32-DIV.ino).

Known versions used on the build machine:

| Library | Version |
|---|---|
| NimBLE-Arduino | 1.4.3 |
| ArduinoJson | 6.21.5 |
| arduinoFFT | 1.6.2 |
| TFT_eSPI | 2.5.43, with the required patch below |
| SmartRC-CC1101-Driver-Lib | 2.5.7, with the local fixes below |

Other sketch dependencies: Adafruit PN532, Adafruit BusIO, RF24, IRremoteESP8266, rc-switch, XPT2046_Touchscreen, ESP32Ping, EspSoftwareSerial, MicroNMEA, LinkedList, AsyncTCP, and the PCF8574 library for profiles that use it. Install these in your Arduino sketchbook libraries directory. This dependency set was used on the local build machine; a fresh-machine dependency installation has not been exercised by this documentation update.

### Required local library configuration

1. Apply both files from [`tft_espi-patch/`](../tft_espi-patch/README.md) to TFT_eSPI 2.5.43: `User_Setup.h` and `TFT_Drivers/ILI9341_Rotation.h`. They configure GPIO15/47/48, CS39, DC9, RESET8, touch CS45 and the TPM408 panel's axis-swapped rotation/RGB order.
2. In SmartRC-CC1101-Driver-Lib 2.5.7, avoid compiling duplicate `ELECHOUSE_CC1101_SRC_JT_DRV.*` implementations. The tested library has these stored under `jamtool_unused/`. Its `ELECHOUSE_CC1101_SRC_DRV.cpp` also declares the file-local flag as `static bool spi = 0;` to avoid collision with TFT_eSPI.
3. The tested ESP32 core uses a `platform.local.txt` overlay that prepends `-zmuldefs` to its existing `compiler.c.elf.libs.*` values. This permits the sketch's SDK symbol overrides and the merged implementations to link. Preserve the core's existing link libraries when applying it; do not replace the list with just that flag. [`Libraries/platform.txt`](../Libraries/platform.txt) is an upstream reference, not a replacement for arbitrary core versions.

These are external library/core edits; cloning this repository alone does not apply them. Reapply the display patch after library updates. `BoardConfig.h` and the TFT_eSPI configuration must agree.

## Board settings

| Setting | Value |
|---|---|
| Board | ESP32S3 Dev Module |
| USB CDC On Boot | Enabled |
| USB Mode | Hardware CDC and JTAG |
| CPU | 240 MHz |
| Flash mode | QIO, 80 MHz |
| Flash size | 16 MB |
| PSRAM | OPI PSRAM |
| Partition scheme | 16M Flash (3MB APP/9.9MB FATFS) |

```sh
arduino-cli compile \
  --fqbn 'esp32:esp32:esp32s3:PSRAM=opi,FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,CDCOnBoot=cdc,FlashMode=qio,CPUFreq=240,USBMode=hwcdc' \
  --output-dir build/firmware ESP32-DIV
```

Latest checked result (2026-10-08): application **2,724,621 bytes / 3,145,728**; static RAM **159,604 bytes / 327,680**. The selected partition layout has two 3 MB app slots, but this is not evidence of a working wireless OTA flow.

## Flash precompiled binaries

Verify `firmware/SHA256SUMS.txt` first. Install esptool compatible with the following v4 command syntax. From the repository root, replace `YOUR_SERIAL_PORT` with the connected ESP32's port:

```sh
python3 -m esptool --chip esp32s3 --port YOUR_SERIAL_PORT --baud 460800 \
  write_flash --flash_mode qio --flash_freq 80m --flash_size 16MB \
  0x0000 firmware/ESP32-DIV.ino.bootloader.bin \
  0x8000 firmware/ESP32-DIV.ino.partitions.bin \
  0xe000 firmware/boot_app0.bin \
  0x10000 firmware/ESP32-DIV.ino.bin
```

This writes the bootloader, partition table, OTA selection data and application. It can replace firmware and change the partition layout; back up any device data you need first. The application `.bin` alone is not a complete first-flash package.

Alternatively, build in Arduino IDE with the settings above and use Upload. If manual BOOT/RESET was needed to enter download mode, press RESET after flashing. Open Serial Monitor at 115200 baud.

## Boot and bring-up

- Normal reset: primary UI.
- Hold joystick click during reset, then release: alternate full-screen UI.
- Joystick up/down selects; click/right opens; left returns. Restart to switch modes.
- Calibrate touch in the primary UI for your own panel; stored calibration can differ between panels.
- Mount a FAT32/FAT16 microSD card and test create/read/delete before relying on saved data.

See the [hardware guide](../hardware/README.md) and [verification record](STATUS.md) for the distinction between a wired module and a tested feature.
