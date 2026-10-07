#pragma once

/* =====================================================================
   ESP32-S3 DevKitC-1  N16R8  — bare DevKit port
   =====================================================================

   Upstream ESP32-DIV V2 targets an ESP32-S3-WROOM-1U-N16: 16MB flash and
   NO PSRAM. That is why its stock pin map puts the display and touch bus on
   GPIO 35/36/37 — with no PSRAM die in the package those pins are free.

   This board is an N16R8: 16MB flash plus 8MB *octal* PSRAM. Octal PSRAM is
   bonded to GPIO 33-37 inside the module, so those five pins do not exist as
   GPIO here. Keeping the 8MB means the display bus must move.

   Everything below is an override of an #ifndef in shared.h, which includes
   this file first. Upstream sources stay untouched except for two small,
   clearly marked edits (see PORT.md).

   Build with PSRAM = OPI PSRAM. See PORT.md for the full IDE settings.
   ===================================================================== */

/* Keep the V2 target: it selects BOARD_HAS_ESP32S3 and the S3 code paths.
   Only the pin assignments differ. */
#define BOARD_ESP32_DIV_V2

#define ESP32DIV_BOARD_NAME "S3 DevKit N16R8"

/* ---------------------------------------------------------------------
   Input: the KY-023 analog joystick stands in for the PCF8574 keypad.
   JoystickNav.h exposes the same pinMode/digitalRead API the features
   already call, so no feature code changes. Verified working on 4/5/6.
   --------------------------------------------------------------------- */
#define HAS_PCF8574_BUTTONS 1
#define USE_JOYSTICK_NAV    1

#define JOY_X_PIN   4     /* VRX — ADC1_CH3 */
#define JOY_Y_PIN   5     /* VRY — ADC1_CH4 */
#define JOY_SW_PIN  6     /* SW  — INPUT_PULLUP */

/* Deflection from centre before a direction latches (12-bit ADC). */
#define JOY_DEADZONE 700

/* ---------------------------------------------------------------------
   Shared SPI bus — SD + display + touch + CC1101 + PN532
   These three are this board's verified MicroSD wiring. Every other
   device on this bus adds only its own chip select.
   --------------------------------------------------------------------- */
#define SD_MOSI  11
#define SD_SCLK  12
#define SD_MISO  13
#define SD_CS    10

/* The generic MicroSD breakout has no card-detect switch. This makes
   shared.h skip SD_CD entirely, so utils.cpp takes its "assume present"
   path instead of reading a floating pin. */
#define SD_NO_CARD_DETECT 1

/* ---------------------------------------------------------------------
   Display + touch (ILI9341 + XPT2046) — moved off the PSRAM pins.
   MOSI/SCLK/MISO are the shared bus above; these are the control lines.
   TFT_eSPI needs matching values in its own User_Setup.h — PORT.md
   documents the edit, and it is already applied.
   --------------------------------------------------------------------- */
/* REWIRE 2026-09-23: display + touch moved onto their OWN SPI bus.
   TFT/Touch:  MOSI=15  SCLK=47  MISO=48 (these three live in TFT_eSPI's
   User_Setup.h; the control lines below must match it). */
#define TFT_MOSI_PIN    15
#define TFT_SCLK_PIN    47
#define TFT_MISO_PIN    48
#define TFT_CS_PIN      39   /* REWIRE: TFT CS on 39 (USB-safe; moved off GPIO20 = native USB D+) */
#define TFT_DC_PIN       9   /* REWIRE: was 40 */
#define TFT_RST_PIN      8   /* REWIRE: was 41 */
/* TPM408-2.8 bench panel (see ILI9341_NATIVE_LANDSCAPE_PANEL in TFT_eSPI's
   User_Setup.h): 0 = portrait, pin header at the bottom; 2 = header at top. */
#define TFT_ROTATION     0
#define BACKLIGHT_PIN   -1   /* LED is hard-wired to 3V3. GPIO42 is now PN532 MISO. */

/* GPIO48 is now the TFT/Touch MISO line, so the onboard WS2812 status LED
   cannot be used. This disables the neopixelWrite() calls in ESP32-DIV.ino. */
#define BOARD_NO_STATUS_RGB 1

/* Touch rides the display's SPI bus via TFT_eSPI's getTouchRaw(), so it
   costs one chip select rather than a second bus. */
#define TOUCH_SHARES_TFT_SPI 1
#define XPT2046_CS   45          /* REWIRE: T_CS (was 38) */
#define XPT2046_MOSI TFT_MOSI_PIN /* REWIRE: touch shares the TFT bus (15/47/48), not SD */
#define XPT2046_MISO TFT_MISO_PIN
#define XPT2046_CLK  TFT_SCLK_PIN
#define XPT2046_IRQ  46          /* REWIRE: T_IRQ now wired to 46; still polled in shared-SPI mode */

/* ---------------------------------------------------------------------
   NRF24L01+ — this board's verified wiring on a SECOND SPI bus.
   Upstream V2 shares the SD bus; here the radio keeps its own pins, which
   avoids the classic problem of cheap SD modules not releasing MISO.
   Verified: register round-trip and TX_ADDR = E7 E7 E7 E7 E7.
   --------------------------------------------------------------------- */
#define NRF24_SPI_SCK  17
#define NRF24_SPI_MOSI 18
#define NRF24_SPI_MISO 21
#define NRF24_SPI_SS    7

#define CE_PIN_1   16
#define CSN_PIN_1   7

/* Radios 2 and 3 are not fitted. Their pins are deliberately shared with
   other absent peripherals (see the conflict table in PORT.md) — begin()
   simply returns false for a socket with no chip on it. Give them their
   own pins before soldering a second or third radio. */
#define CE_PIN_2   14
#define CSN_PIN_2  38   /* REWIRE: was 15 (now TFT MOSI); parked on freed pin 38 */
#define CE_PIN_3   43   /* REWIRE: was 1 (now CC1101 GDO0/SubGHz data); NRF24 #3 unfitted, parked on free UART0 pin */
#define CSN_PIN_3  44   /* REWIRE: was 2; NRF24 #3 unfitted, parked on free UART0 pin */

/* ---------------------------------------------------------------------
   PN532 NFC — SPI, not I2C.
   rfid.cpp constructs Adafruit_PN532 with the 4-argument software-SPI
   constructor, so these pins are bit-banged. SCK and MOSI are shared with
   the SD bus; MISO is dedicated to avoid SD-reader bus contention, and SS
   is dedicated. Set the module's DIP switches to SPI.
   Upstream V2 swaps MOSI/MISO because its PCB routes them crossed; a
   hand-wired module is straight through, so they are un-swapped here.
   --------------------------------------------------------------------- */
#define PN532_SCK  SD_SCLK
#define PN532_MISO 42       /* dedicated: PN532 MISO was moved off shared GPIO13 */
#define PN532_MOSI SD_MOSI
#define PN532_SS   2    /* PN532 SS is wired to GPIO2; GPIO40 belongs to CC1101 CS */

/* ---------------------------------------------------------------------
   CC1101 sub-GHz — fitted. Shares the SD bus, own chip select.
   --------------------------------------------------------------------- */
#define CC1101_SCK  SD_SCLK
#define CC1101_MISO SD_MISO
#define CC1101_MOSI SD_MOSI
#define CC1101_CS   40   /* REWIRE: was 8 (now TFT RESET); PN532 uses its own CS on GPIO2 */

/* ---------------------------------------------------------------------
   Absent peripherals. Pins below are placeholders chosen so nothing
   collides with hardware that is actually fitted. Reassign before
   connecting any of them — PORT.md lists which pairs overlap.
   --------------------------------------------------------------------- */
#define IR_RX_PIN  14      /* overlaps CE_PIN_2  */
#define IR_TX_PIN  38      /* REWIRE: was 15 (now TFT MOSI); parked on freed pin 38 */

/* CC1101 fitted 2026-09-24. GDO0 is wired to GPIO1 and is the single async
   data line for BOTH receive and transmit (RX and TX never run at once, so one
   pin serves both). GDO2 is left unconnected. All four data macros point at
   GPIO1; CC1101_GDO0/GDO2 (shared.h) default to SUBGHZ_TX/RX so they follow. */
#define SUBGHZ_RX_PIN 1    /* CC1101 GDO0 — RCSwitch receive */
#define SUBGHZ_TX_PIN 1    /* CC1101 GDO0 — RCSwitch transmit */
#define RX_PIN        1    /* CC1101 GDO0 — raw OOK read */
#define TX_PIN        1    /* CC1101 GDO0 — raw OOK / jam drive */
#define CC1101_GDO0   1    /* wired to MCU GPIO1 */
#define CC1101_GDO2   1    /* GDO2 pad unconnected; mode is overridden per RX/TX */

#define GPS_UART_RX  41    /* REWIRE: was 9 (now TFT DC); parked on freed pin 41 */
#define GPS_UART_TX   0    /* config out; GPIO0 is the BOOT strap, unused here */

/* ---------------------------------------------------------------------
   No buzzer on a bare DevKit. -1 disables it.
   REWIRE 2026-09-23: GPIO48 is now the TFT/Touch MISO line, so the onboard
   WS2812 status LED is disabled (BOARD_NO_STATUS_RGB above).
   --------------------------------------------------------------------- */
#define BUZZER_PIN -1

/* Battery voltage sensing for the RGB status LED. Disabled by default so a
   floating pin can't fake a reading. To enable: wire a 2:1 divider (e.g. two
   100k resistors) from BAT+ to GND, tap the middle to GPIO3, then uncomment: */
//#define BATTERY_ADC_PIN 3

/* Show the touch nav bar; with a joystick fitted it is still useful. */
#define TOUCH_BUTTON_CUE_ENABLED 1

/* Optional fixed PCF8574 address — irrelevant with USE_JOYSTICK_NAV. */
//#define pcf_ADDR 0x20

/* Touch mapping for the TPM408-2.8 bench panel at TFT_ROTATION 0, measured
   2026-09-23 from corner taps: raw X runs right-to-left, raw Y top-to-bottom.
   Rotation 3 inverts both, then Y is mapped TOUCH_Y_MAX (top) -> TOUCH_Y_MIN.
   Own profile id so a settings.json calibrated on a stock V2 is not applied. */
#define TOUCH_PROFILE_ID "S3_DEVKIT_TPM408"
#define TOUCH_ROTATION 3
#define TOUCH_X_MIN  233
#define TOUCH_X_MAX 3800
#define TOUCH_Y_MIN  313
#define TOUCH_Y_MAX 3917

#if !defined(BOARD_ESP32_DIV_V2) && !defined(BOARD_CYD) && !defined(BOARD_ESP32_DIV_V1)
#define BOARD_ESP32_DIV_V2
#endif
