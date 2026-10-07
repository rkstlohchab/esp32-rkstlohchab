# Enclosure revision 2 — jumper wire space

**Outer size: 96.4 × 168.4 × 94.0 mm (width × height × depth).**
Internal cavity: 92 × 164 × 90 mm. Previous case: 62.4 × 128.4 × 66 mm.
Dimensions exclude antennas and the projecting joystick cap.

This revision retains the 400-point breadboard and allows Dupont connectors
on all header modules, including NRF24, CC1101, GPS and IR. The original
solder-only assumption for those modules has been removed. This repository distributes revision 2 only.

## Files

| File | Use |
|---|---|
| `stl/enclosure_back_tub.stl` | Print back down; support the SD shelf above the battery |
| `stl/enclosure_front_plate.stl` | Print face down |
| `enclosure.html` | Interactive assembly, exploded view, drawings and STL downloads |
| `layout-v2.png` | Orthographic views; hatched areas reserve loose wire space |
| `layout.json` | Dimensions, placements, openings and wire budget |
| `build.py`, `src/` | Parametric design and clearance checks |

## Space for your wires

The design assumes **60 individual 20 cm wires plus five individual 40 cm
wires**, with insulation up to 2 mm diameter: 14 metres total.
At 30% wire / 70% free air, the estimated loose-wire volume is **146.6 cm³**.
Three dedicated bays provide **154.9 cm³**, in addition to connector and bend
envelopes. This is a packing estimate, not a simulated routed harness;
thicker wires, ribbon bundles or extra modules need more space.

| Reserved region | Clear size | Volume |
|---|---|---|
| Lower service-loop bay | 56 × 48 × 37 mm | 99.5 cm³ |
| Left routing corridor | 15 × 90 × 28 mm | 37.8 cm³ |
| Right routing corridor | 14 × 45 × 28 mm | 17.6 cm³ |

Each header allows **14 mm female housings plus 10 mm free space after the
housing**. Straight connectors also include their male header spacer.
The breadboard has a 24 mm plug-and-bend zone above its 8.5 mm body.
The PN532 model reserves both header banks, including SPI.

Put surplus wire into broad, loose loops in the lower bay. Use the side
corridors for front connections. Keep the lid lip, screws, joystick mechanism,
display glass and GPS patch clear. Fit module plugs before installing the
breadboard. Leave service slack for lifting the front plate. The lid should
seat freely; its screws must not compress wire bundles.

## Battery pocket: 4 mm longer

Nominal holder: 74.5 × 21.5 mm. Cell: 65 mm long, unchanged.
The end stop moves **4.0 mm**, giving **78.9 mm clear length**
(74.5 + 4.0 + 0.4 mm fit allowance). Two side rails give **21.9 mm clear width**.
The extra length is reserved in the collision model. Add a removable foam
shim if the existing shorter holder slides.

## Layout and ports

Breadboard underside: 46 mm above the inside back face. Jumper bend space
ends at 78.5 mm. Display PCB: 85 mm. The lower section holds the wire loops.
The display and joystick are centred on the removable front plate.

USB-C and microSD access remain on the bottom; SMA and IR openings are on top;
the switch is on the right. The back has the NFC target and BOOT/RST pinholes.
Use the **separate microSD reader**: the display's optional full-size SD socket
is now internal only.

PN532 uses SPI: switch 1 away from ON, switch 2 toward ON.
SCK → GPIO12, MOSI → GPIO11, MISO → GPIO42, SS → GPIO2.
SDA/SCL are not used in this mode. Viewer colors are suggested labels,
not a record of installed wire colors.

## Printing and assembly

Starting settings: 0.4 mm nozzle, 0.20 mm layers, 4 perimeters, 25% infill,
PLA or PETG. Inspect the slicer preview. The back tub's broad SD shelf needs
removable support beneath it; remove support before fitting the battery.
Other overhangs depend on your printer. STLs are already oriented on z=0.

Hardware: 4 × M2.5 × 8 countersunk lid screws, 4 × M3 × 6 display screws,
2 × M3 × 8 joystick screws, removable tape/foam for parts without screw mounts.
Print the front plate first to check the display and joystick fit.

1. Remove supports. Fit ESP32. Fit the TP4056 and holder mechanically if desired; keep the unverified battery circuit disconnected.
2. Fit PN532 on its pegs, GPS on its posts and patch beneath the top wall.
3. Fit radios, IR boards, microSD and switch. Connect their jumpers.
   Tape/foam secures boards without dedicated screw mounts.
4. Tape the breadboard onto its side ledges. Arrange loose wires in the lower
   bay and side corridors before fitting front connections.
5. Mount display and joystick on the plate, connect them, and lower the plate
   while watching the wiring. Close with four lid screws only when it seats freely.

## Verification and limits

The build rejects module/wall conflicts, printed solids blocking modules,
connectors, bends or reserved wire bays, shell mating interference, and
insufficient wire volume. PN532/GPS mounting holes are excluded from their
coarse boxes so the pegs can pass through. Both meshes must be valid connected
solids. Revision 2 passes these checks with **zero conflicts**.

This is digitally checked, not physically print-tested. Joystick and IR sizes
include estimates; several modules use listing dimensions and photo-derived
positions. Check your board variants, connector heights and holder dimensions.
The design includes the 15 parts listed in `layout.json`. A separate boost
converter has no dedicated mount or assumed footprint in this revision.

## Rebuild

```sh
pip install manifold3d numpy matplotlib
python3 build.py
python3 src/layout.py layout-v2.png
```

Parts: `src/parts.py`; placements and wire budget: `src/layout.py`;
printed mounts: `src/shell.py`. Rebuilding updates the STLs and viewer together.

## Electrical reference

Use the [current hardware guide](../hardware/README.md) for electrical connections. Battery, charger and switch models are mechanical provisions; the verified build is USB powered.
