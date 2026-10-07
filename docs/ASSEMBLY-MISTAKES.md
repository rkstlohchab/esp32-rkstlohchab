# Assembly mistakes and fixes from this build

These are recorded project problems, not a list of hypothetical faults. Current wiring is in the [connection diagram](../hardware/wiring.svg), [breadboard guide](../hardware/BREADBOARD.md), and [pin map](../hardware/pin-map.csv). A successful compile does not prove a module works electrically.

## PN532 NFC: the tiny mode switches were set incorrectly

The PN532 board has **two small mode switches**, often referred to as buttons. They select the communication interface; they are not scan/start buttons. Our firmware uses the four-argument Adafruit PN532 **software SPI** constructor.

We originally left **SW1 OFF / SW2 OFF**, which selected UART on the tested V3 module. SPI probes consequently failed even though the firmware was configured for SPI. After setting **SW1 OFF / SW2 ON**, the firmware query returned **0x32010607**, identifying PN532 firmware 1.6, on two boots (2026-10-05).

Power down before changing the mode. On our board, switch 1 is away from the printed `ON` side, and switch 2 is toward `ON`. Read the switch numbers and `ON` marking rather than relying on “up/down”: board orientation changes those directions. Check the mode table printed on your exact module if it differs.

Our final SPI connections are **SS/CS → GPIO2, MOSI → GPIO11, SCK → GPIO12, MISO → GPIO42**, plus the documented supply and common GND. SDA/SCL are not used for this SPI setup. An earlier firmware CS assignment did not match GPIO2 and was corrected. The PN532 MISO is dedicated GPIO42, not the SD/CC1101 MISO13 net. A version response confirms SPI communication; NFC tag reading/writing remains a separate test.

## GPS: missing common ground

The GPS stream became valid after its GND was connected to the shared ground bus. GPS TX alone was insufficient. The corrected wiring is **GPS TX → ESP32 GPIO41**, GPS GND → common GND, with the module supplied at its breakout's rated voltage. GPS RX stays open; the firmware's GPIO0 TX placeholder is not a wire to add.

After the ground fix, the diagnostic received **7,799 bytes and 282 valid NMEA lines in 47 seconds at 9600 baud**. Valid NMEA traffic is not the same as an outdoor satellite fix.

## Display: incompatible pin assignments and panel configuration

Earlier maps placed display pins on GPIO33–37, which are occupied by the N16R8 module's octal PSRAM. The display was moved to its current wiring. TFT CS was also moved off **GPIO20**, which belongs to native USB, to **GPIO39**.

The TPM408-2.8 panel needs our TFT_eSPI setup and rotation patch. Without them, the observed image was rotated by 90 degrees, had roughly 80 noisy rows, and showed swapped red/blue colors. Apply both files in [tft_espi-patch](../tft_espi-patch/README.md). Current TFT signals are MOSI15, SCK47, MISO48, CS39, DC9, RESET8; touch shares the three data/clock nets with CS45 and IRQ46.

The onboard RGB LED is disabled because GPIO48 is now display MISO. Backlight is hardwired to 3V3; GPIO42 is PN532 MISO and must not be driven as backlight PWM.

## Alternate UI: title showed but the menu did not

The embedded board profile enabled the screen but omitted full-screen menu rendering. It also enabled an incompatible RGB configuration on joystick GPIO4/5/6 and used PN532 GPIO42 for backlight.

The fix enabled menu rendering, removed those conflicting outputs, initialized calibrated DIV input, and required release of the joystick's boot click before menu navigation. Later row-only redraws fixed full-screen blinking. The user confirmed that the menu appeared, the joystick worked, and the screen was steady. See the retained [UI fix notes](../MARAUDER-UI-FIX.md).

## SD card: “detected” did not prove a working card

Our reader has no card-detect switch. The configured no-detect path can assume presence and print a detected message even without a usable card. There was no card inserted during the latest recorded diagnostic. Treat **successful mount plus create/read/delete** as the storage test, not the detected banner. Use FAT32/FAT16 and all four SPI signals, including MISO13.

The recorded evidence does **not** establish that we omitted MISO on this build; that is a wiring check, not a confirmed past mistake.

## Firmware deauther: one byte beyond the frame

The existing Div implementation wrote index 26 of a 26-byte buffer. The valid indices are 0–25. We corrected the reason bytes to indices 24 and 25 and retained the existing implementation. A host frame test passed address and undefined-behavior sanitizers; no radio test was performed for that fix.

## Old notes: conflicting pin maps

Early circuit notes described PN532 I2C, different display pins, and older enclosure dimensions. They are historical, not the final breadboard schematic. Current documents are generated/checked against `ESP32-DIV/BoardConfig.h`. On the breadboard, keep each shared net isolated: GPIO11, 12, 13, 15, 47 and 48 each get a separate connected strip. Do not merge unrelated pins just because they have the same SPI signal name.

## Evidence sources

The PN532/GPS results and final rewiring are recorded in [PORT.md](../PORT.md). UI fixes and user confirmations are recorded in [MARAUDER-UI-FIX.md](../MARAUDER-UI-FIX.md). The display behavior is recorded in the [TFT patch notes](../tft_espi-patch/README.md). Current test limits are summarized in [STATUS.md](STATUS.md).
