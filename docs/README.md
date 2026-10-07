# Documentation

- [Current hardware schematic and connections](../hardware/README.md)
- [Breadboard shared pins and direct ESP32 jumpers](../hardware/BREADBOARD.md)
- [Component list](../hardware/components.csv)
- [GPIO pin map](../hardware/pin-map.csv)
- [Build and flash](BUILD.md)
- [Verification and limitations](STATUS.md)
- [3D design, assembly and printing](../enclosure/README.md)
- [Firmware downloads](../firmware/README.md)

To open the interactive 3D assembly, run `python3 -m http.server 8000` from the repository root and visit `http://localhost:8000/enclosure/enclosure.html`. The viewer currently loads Three.js and fonts from CDNs, so internet access is needed. GitHub's file preview displays the HTML source rather than running the viewer.

`PORT.md`, `MERGE.md`, and `MARAUDER-UI-FIX.md` at the repository root are retained as historical notes, not the current wiring reference.

See [assembly mistakes and fixes](../docs/ASSEMBLY-MISTAKES.md), especially the PN532 mode switches and GPS common ground.
