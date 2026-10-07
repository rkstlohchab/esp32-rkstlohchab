# Current hardware and wiring

Snapshot: **2026-10-08**. Electrical pin assignments come from [`ESP32-DIV/BoardConfig.h`](../ESP32-DIV/BoardConfig.h), checked against the configured display patch and the latest local bring-up notes. This is the final documented **module connection schematic for the current bench configuration**, not a new custom PCB design.

- [Connection schematic / pin diagram](wiring.svg)
- [Breadboard shared rows and direct jumpers](BREADBOARD.md)
- [Machine-readable pin map](pin-map.csv)
- [Component list / bill of materials](components.csv)
- [3D enclosure and assembly](../enclosure/README.md)
- [Verification record](../docs/STATUS.md)

![Wiring](wiring.svg)

## Signal connections

| Module | Module pins → ESP32-S3 GPIO |
|---|---|
| KY-023 joystick | VRX → 4; VRY → 5; SW → 6 |
| ILI9341 TFT | SDI/MOSI → 15; SCK → 47; SDO/MISO → 48; CS → 39; DC → 9; RESET → 8 |
| XPT2046 touch | T_DIN → 15; T_CLK → 47; T_DO → 48; T_CS → 45; T_IRQ → 46 |
| NRF24L01+ (one radio) | CSN → 7; CE → 16; SCK → 17; MOSI → 18; MISO → 21; IRQ unconnected |
| Separate microSD reader | CS → 10; MOSI/DI → 11; SCK/CLK → 12; MISO/DO → 13 |
| CC1101 | CS → 40; MOSI → 11; SCK → 12; MISO → 13; GDO0 → 1; GDO2 unconnected |
| PN532 in SPI mode | SS/CS → 2; MOSI → 11; SCK → 12; MISO → 42; SDA/SCL not used |
| GPS NEO-6M | TX → 41; RX unconnected; UART 9600 baud |
| IR receiver | OUT → 14 |
| IR transmitter | Signal → 38 |

Touch IRQ is wired but touch is polled. The GPS TX output connects to the MCU's RX input; `GPS_UART_TX=0` is an unused firmware placeholder, **not a connection to make**. Likewise, `CC1101_GDO2=1` is a software alias for the single GDO0 data path; it does not mean physically join GDO2 to GPIO1.

## SPI wiring groups

| Group | SCK | MOSI | MISO | Individual selects |
|---|---|---|---|---|
| Display + touch | 47 | 15 | 48 | TFT 39; touch 45 |
| Storage / SubGHz | 12 | 11 | 13 | SD 10; CC1101 40 |
| PN532 software SPI | 12 (shared) | 11 (shared) | **42 (dedicated)** | PN532 2 |
| NRF24 wiring | 17 | 18 | 21 | CSN 7; CE 16 |

These are wiring groups, not a claim of four independent hardware SPI controllers. Firmware reclaims shared SPI resources when changing features. Never join PN532 MISO42 to the storage MISO13 net. Modules sharing clock/MOSI need their own chip selects, with inactive devices deselected.

## Power connections

The current tested build is **USB powered**. Distribute supply and GND using breadboard rails; all module grounds connect to ESP32 GND.

| Module | Power connection / constraint |
|---|---|
| Joystick | VCC pin marked `+5V` is connected to **3V3** so VRX/VRY stay within ESP32 input levels |
| TFT backlight LED | **3V3**, hardwired; no MCU backlight PWM pin |
| NRF24L01+ | **3V3 only**; 10–47 µF capacitor close to VCC/GND |
| CC1101 | **3V3**, with common GND |
| PN532 V3 | 3V3 supply in the documented plan; SPI switch mode on the tested module: SW1 OFF, SW2 ON |
| TFT module VCC, SD reader, GPS, IR modules | Check the exact breakout's regulator and supply rating. All MCU-facing signals must be 3.3 V compatible. The notes do not establish one universal VCC for every breakout variant |

The SD reader's VCC depends on its regulator and level shifting; use 5 V only for a breakout designed for that input. A bare 3.3 V card interface needs 3V3. Do not infer VCC from the signal wiring diagram.

The 18650, TP4056 and power switch are present in the **mechanical** design but were disconnected in the latest electrical checks. There is no verified battery-to-ESP32 regulated power schematic in this project. Do not connect a Li-ion cell directly to 3V3 or assume the case's battery pocket defines a complete power circuit.

## Pins intentionally unavailable or unconnected

- GPIO19/20 are reserved for native USB.
- GPIO26–32 and GPIO33–37 are reserved by flash and octal PSRAM on this N16R8 configuration.
- GPIO48 is display MISO; firmware disables the onboard RGB LED.
- GPIO0 is BOOT; leave GPS RX disconnected rather than wiring the unused TX placeholder.
- GPIO45/46 are boot strapping pins used by this existing touch wiring. Preserve the tested reset levels; do not treat them as generic extra outputs.
- NRF24 radios #2/#3, buzzer, PCF8574, and battery ADC are not fitted/enabled. NRF24 #2 placeholders overlap IR14/38 and must be reassigned before adding that radio.
- NRF24 IRQ and CC1101 GDO2 remain open.

GPIO numbers are signal labels, not physical header positions. Match the printed GPIO labels on your exact DevKit board. Legacy `PCB/` and `Schematic/` files describe upstream boards and do not override this pin map.

## Rebuild the pin diagram

```sh
python3 hardware/generate_wiring.py
```

The generator reads `pin-map.csv`, checks every GPIO against the board configuration, and writes `wiring.svg`. Update the firmware configuration and CSV together when wiring changes.
