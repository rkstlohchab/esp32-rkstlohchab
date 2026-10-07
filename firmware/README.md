# Current N16R8 firmware

Built 2026-10-08 from the branded source in this snapshot, using ESP32 core 2.0.10 and the settings in the [build guide](../docs/BUILD.md).

| File | Flash offset | Purpose |
|---|---|---|
| [ESP32-DIV.ino.bootloader.bin](ESP32-DIV.ino.bootloader.bin) | 0x0000 | ESP32-S3 bootloader |
| [ESP32-DIV.ino.partitions.bin](ESP32-DIV.ino.partitions.bin) | 0x8000 | 16 MB flash partition table, two 3 MB app slots |
| [boot_app0.bin](boot_app0.bin) | 0xe000 | Initial OTA selection data |
| [ESP32-DIV.ino.bin](ESP32-DIV.ino.bin) | 0x10000 | Application |

[SHA-256 checksums](SHA256SUMS.txt). Verify from this directory with `shasum -a 256 -c SHA256SUMS.txt` (macOS) or `sha256sum -c SHA256SUMS.txt` (Linux).

Application: 2,724,621 bytes (86% of slot). Static RAM: 159,604 bytes (48%). Compile and a host frame-bounds check passed; this exact branded snapshot has **not been flashed or hardware-tested**. These binaries target the documented N16R8 configuration, not stock ESP32-DIV PCB variants.

See the [complete flash command](../docs/BUILD.md#flash-precompiled-binaries); the application binary alone is not the first-flash package.
