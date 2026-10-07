# Contributing to esp32-rkstlohchab

Open issues and pull requests at https://github.com/rkstlohchab/esp32-rkstlohchab.

1. Read [hardware](hardware/README.md), [build instructions](docs/BUILD.md), and [current status](docs/STATUS.md).
2. Fork and clone the repository, then create a branch for one focused change.
3. Keep board GPIO overrides in `ESP32-DIV/BoardConfig.h`; update `hardware/pin-map.csv` and regenerate `hardware/wiring.svg` when changing assignments.
4. Build for the documented N16R8 target. Record exactly which hardware tests were run; compilation alone does not validate radio, NFC, GPS or storage behavior.
5. For enclosure changes, rebuild from `enclosure/build.py`, rerun its checks, and update printable files and the viewer together.
6. Preserve incorporated license notices. Do not commit credentials, card dumps, personal captures, or local build caches.

Include the board variant, firmware commit, reproduction steps and relevant serial output when reporting a bug.
