# Verification and current limits

Documentation snapshot: **2026-10-08**. Earlier observations below come from the local hardware bring-up notes; they were not all repeated in this update.

| Area | Evidence | Remaining work |
|---|---|---|
| Latest branded firmware | Arduino CLI build passes: 2,724,621 bytes (86% of app slot), 159,604 bytes static RAM (48%) | Flash and run this exact snapshot |
| Branding | Startup logos removed; splash/About/serial text uses `rkstlohchab`; scan export branding updated | Check on actual display |
| Deauther frame buffer | Existing Div implementation retained; write beyond byte 25 fixed; host frame check passed AddressSanitizer and UndefinedBehaviorSanitizer | No radio/deauthentication hardware test performed |
| Primary UI | Earlier normal boot, display, calibrated touch and joystick verified | Full feature regression |
| Alternate UI | User confirmed menu appears, joystick works, and row redraw remains steady after earlier fixes | Full screen/menu regression |
| NRF24 | Earlier chip-connected check and raw SPI register round-trips passed | RF range and feature testing |
| CC1101 | Earlier SPI part/version read passed (part 0x00, version 0x14) | End-to-end RF receive/transmit testing |
| PN532 | 2026-10-05 SPI firmware query returned 0x32010607 on two boots after selecting SPI mode | NFC tag read/write and supported tag variants |
| GPS | 7,799 bytes / 282 valid NMEA lines in 47 seconds at 9600 baud after common GND was connected | Outdoor satellite fix and logged coordinates |
| Separate microSD reader | Wired to CS10, MOSI11, SCK12, MISO13; no card during latest recorded probe | Card mount and file read/write |
| IR RX/TX | GPIO14/38 configured | Electrical and functional tests |
| Battery circuit | Disconnected during electrical checks; case contains mounting provisions | Specify and validate a regulated power path |
| Enclosure revision 2 | Parametric build checks solid validity, clearances, shell mating and wire volume | Physical print and fit test against exact module variants |

The no-card-detect configuration can print a card-detected message without a usable card. Treat successful mount and file read/write as the actual storage test.

The pin map does not promise simultaneous operation of all SPI features; firmware changes ownership of shared resources. The second/third NRF24 sockets are not fitted, and the second radio's placeholder pins conflict with IR.

The enclosure is 96.4 × 168.4 × 94.0 mm and is based on a YD-style DevKit/module dimension model. It includes estimated dimensions for some parts and a loose-wire packing allowance. A separate boost converter has no dedicated mount. Inspect the slicer and print the front plate first to check display/joystick fit.

The repository was republished with a fresh root commit under `esp32-rkstlohchab`. Required third-party license notices remain. Removing Git branch/tag history does not recall external clones or guarantee removal of GitHub's cached old commit URLs.
