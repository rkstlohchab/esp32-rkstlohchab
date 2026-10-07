# TFT_eSPI patch for this build

The firmware only displays correctly with these two files dropped into the
Arduino **TFT_eSPI 2.5.43** library (`~/Documents/Arduino/libraries/TFT_eSPI/`),
overwriting the originals:

| File | Why |
|---|---|
| `User_Setup.h` | Pins for the dedicated display bus (MOSI 15, SCLK 47, MISO 48, CS 39, DC 9, RST 8, touch CS 45), `ILI9341_NATIVE_LANDSCAPE_PANEL`, and `TFT_RGB_ORDER TFT_RGB` |
| `TFT_Drivers/ILI9341_Rotation.h` | Axis-swapped rotations for the TPM408-2.8 panel, whose glass is scanned 320x240 |

Without them the UI draws rotated 90° with 80 rows of noise, and red/blue are
swapped. After copying, delete the build cache's `libraries/TFT_eSPI` folder
so the headers are recompiled.

Re-apply after any TFT_eSPI update or reinstall.
