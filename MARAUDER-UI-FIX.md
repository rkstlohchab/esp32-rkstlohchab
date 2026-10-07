# Marauder joystick boot / blank menu fix

The MULTIBOARD_S3 profile enabled HAS_SCREEN but omitted HAS_FULL_SCREEN.
The title rendered while the menu row renderer was compiled out. Its Flipper
RGB configuration also claimed joystick GPIO4/5/6, and backlight claimed
PN532 GPIO42.

Changes: enable menu rendering; disable the incompatible LED output;
initialize DIV joystick/calibrated touch; debounce input and require release
of the boot click; keep other SPI slaves deselected; use SD FSPI12/13/11 CS10;
suppress PWM for the hardwired backlight.

Verification: Arduino CLI build passed for ESP32-S3 N16R8 (87% application
partition, 48% static RAM). Flashed via /dev/cu.usbmodem101 with esptool hash
verification. User tested joystick-held boot and confirmed: **“Menu appears
and joystick works.”** Normal DIV boot reached `[boot] ready`. A subsequent
brightness guard removes calls to unattached PWM; menu behavior is unchanged.
No radio attack or full module regression tests were performed for this fix.

Boot normally for DIV. Hold joystick click while resetting for Marauder,
then release. Up/down moves selection, click/right opens, left goes back.
Restart to switch modes.

Follow-up: joystick navigation now redraws only the old/new selection rows.
Scrolling onto another page repaints its rows without clearing the TFT or
redrawing the banner/status bar. Persistently selected items retain their
highlight. This addresses the full-screen blink reported after the first fix.
Compiled and flashed with hash verification. A host harness exercising the
actual navigation block passed row-only redraw, wraparound, pagination,
persistent selections, settings rows, click and root Back checks.
User then confirmed the flashed follow-up: **“Yes, the screen is steady.”**

Status legend: CH is Wi-Fi channel; D is internal DRAM usage; a red SD icon
means no card is mounted. The side tick marks divide up/select/down touch zones.
