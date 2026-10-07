#!/usr/bin/env python3
"""Generate ESP32-DIV/ir_db_data.cpp from a Flipper-IRDB checkout.

Flipper-IRDB (https://github.com/Lucaslhm/Flipper-IRDB) is CC0. Each .ir file
becomes one Universal Controller remote; its buttons are mapped onto the
controller's 12 keys and stored as Flipper protocol/address/command (or raw
timings), which ir.cpp encodes at send time.

  git clone --depth 1 https://github.com/Lucaslhm/Flipper-IRDB.git irdb
  python3 tools/irdb_gen.py irdb
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "ESP32-DIV", "ir_db_data.cpp")

# Must match IrDb::Proto in ir_db.h.
PROTOS = ["NEC", "NECext", "NEC42", "NEC42ext", "Samsung32", "RC5", "RC5X", "RC6",
          "SIRC", "SIRC15", "SIRC20", "Kaseikyo", "RCA", "Pioneer"]
PROTO_ID = {p: i + 1 for i, p in enumerate(PROTOS)}
RAW_ID = len(PROTOS) + 1
MAX_RAW_LEN = 1024

# Key order must match IRUniversalController::KeyId. First alias found wins,
# so preferred names come first (e.g. a real POWER beats a separate OFF).
KEYS = [
    ("Power", ["POWER", "PWR", "POWERTOGGLE", "ONOFF", "POWERONOFF", "STANDBY",
               "TOGGLE", "POWERON", "ON", "POWEROFF", "OFF"]),
    ("Mute", ["MUTE", "MUTING", "SOUNDMUTE", "AUDIOMUTE"]),
    ("VolUp", ["VOLUP", "VOLUMEUP", "VOLPLUS", "VOLUMEPLUS", "VUP"]),
    ("VolDn", ["VOLDN", "VOLDOWN", "VOLUMEDOWN", "VOLMINUS", "VOLUMEMINUS", "VDN", "VDOWN"]),
    ("ChUp", ["CHNEXT", "CHUP", "CHPLUS", "CHANNELUP", "CHANUP", "CHANNELPLUS",
              "PROGUP", "PROGPLUS", "PPLUS"]),
    ("ChDn", ["CHPREV", "CHDN", "CHDOWN", "CHMINUS", "CHANNELDOWN", "CHANDOWN",
              "CHANNELMINUS", "PROGDOWN", "PROGMINUS", "PMINUS"]),
    ("Up", ["UP", "ARROWUP", "CURSORUP", "NAVUP"]),
    ("Down", ["DOWN", "DN", "ARROWDOWN", "CURSORDOWN", "NAVDOWN"]),
    ("Left", ["LEFT", "ARROWLEFT", "CURSORLEFT", "NAVLEFT"]),
    ("Right", ["RIGHT", "ARROWRIGHT", "CURSORRIGHT", "NAVRIGHT"]),
    ("Ok", ["OK", "ENTER", "SELECT", "CONFIRM"]),
    ("Back", ["BACK", "RETURN", "EXIT"]),
]

# Shown first in Browse; everything else follows alphabetically.
CATEGORY_ORDER = ["TVs", "Projectors", "Digital_Signs", "Monitors", "Touchscreen_Displays",
                  "SoundBars", "Audio_and_Video_Receivers", "Speakers", "Streaming_Devices",
                  "Cable_Boxes", "DVB-T", "TV_Tuner", "Blu-Ray", "DVD_Players", "Consoles",
                  "ACs", "Fans", "Heaters", "Air_Purifiers", "LED_Lighting"]


def norm(name):
    s = name.upper().replace("+", "PLUS").replace("-", "MINUS")
    return re.sub(r"[^A-Z0-9]", "", s)


def parse_ir(path):
    sigs, cur = [], None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            k, v = (x.strip() for x in line.split(":", 1))
            k = k.lower()
            if k == "name":
                cur = {"name": v}
                sigs.append(cur)
            elif cur is not None:
                cur[k] = v
    return sigs


def le(hexstr):
    return sum(int(b, 16) << (8 * i) for i, b in enumerate(hexstr.split()))


def to_sig(s, raw_pool, raw_index):
    """Return (proto, khz, address, command) or None if unsupported."""
    if s.get("type") == "parsed":
        proto = PROTO_ID.get(s.get("protocol", ""))
        if not proto or "address" not in s or "command" not in s:
            return None
        return (proto, 0, le(s["address"]) & 0xFFFFFFFF, le(s["command"]) & 0xFFFF)
    if s.get("type") == "raw":
        try:
            data = [min(int(x), 65535) for x in s.get("data", "").split()]
            khz = int(round(int(s.get("frequency", "38000")) / 1000.0))
        except ValueError:
            return None
        if not data or len(data) > MAX_RAW_LEN or not 20 <= khz <= 100:
            return None
        key = tuple(data)
        if key not in raw_index:
            raw_index[key] = len(raw_pool)
            raw_pool.extend(data)
        return (RAW_ID, khz, raw_index[key], len(data))
    return None


def pretty(s):
    return s.replace("_", " ").strip()


def c_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    root = os.path.abspath(sys.argv[1])
    try:
        ver = subprocess.check_output(["git", "-C", root, "log", "-1", "--format=%h %cs"],
                                      text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        ver = "unknown"

    raw_pool, raw_index = [], {}
    remotes, seen = [], set()
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
        rel = os.path.relpath(dirpath, root)
        if rel == ".":
            continue
        parts = rel.split(os.sep)
        cat, brand = parts[0], (parts[1] if len(parts) > 1 else "Generic")
        for fn in sorted(files):
            if not fn.lower().endswith(".ir"):
                continue
            by_name = {}
            for s in parse_ir(os.path.join(dirpath, fn)):
                by_name.setdefault(norm(s["name"]), s)
            mask, sigs = 0, []
            for bit, (_, aliases) in enumerate(KEYS):
                for a in aliases:
                    if a in by_name:
                        sig = to_sig(by_name[a], raw_pool, raw_index)
                        if sig:
                            mask |= 1 << bit
                            sigs.append(sig)
                            break
            if not mask:
                continue
            dedup = (cat, brand.lower(), mask, tuple(sigs))
            if dedup in seen:
                continue
            seen.add(dedup)
            remotes.append({"cat": cat, "brand": pretty(brand), "name": pretty(fn[:-3]),
                            "mask": mask, "sigs": sigs})

    cats = sorted({r["cat"] for r in remotes},
                  key=lambda c: (CATEGORY_ORDER.index(c) if c in CATEGORY_ORDER
                                 else len(CATEGORY_ORDER), c.lower()))
    cat_id = {c: i for i, c in enumerate(cats)}
    remotes.sort(key=lambda r: (cat_id[r["cat"]], r["brand"].lower(), r["name"].lower()))

    all_sigs = []
    for r in remotes:
        r["first"] = len(all_sigs)
        all_sigs.extend(r["sigs"])
    assert len(all_sigs) < 65536 and len(remotes) < 65536 and len(cats) < 256

    o = []
    o.append("// GENERATED by tools/irdb_gen.py from Flipper-IRDB %s (CC0). Do not edit." % ver)
    o.append('#include "ir_db.h"\n\nnamespace IrDb {\n')
    o.append('const char kSourceVersion[] = "Flipper-IRDB %s";\n' % ver)
    o.append("const char* const kCategories[] = {")
    o.extend("  %s," % c_str(pretty(c)) for c in cats)
    o.append("};\nconst uint8_t kCategoryCount = %d;\n" % len(cats))
    o.append("const Sig kSigs[] = {")
    for p, khz, a, c in all_sigs:
        o.append("  {0x%XU, 0x%X, %d, %d}," % (a, c, p, khz))
    o.append("};\n")
    o.append("const uint16_t kRaw[] = {")
    for i in range(0, max(len(raw_pool), 1), 16):
        o.append("  " + ",".join(str(v) for v in (raw_pool[i:i + 16] or [0])) + ",")
    o.append("};\n")
    o.append("const Remote kRemotes[] = {")
    for r in remotes:
        o.append("  {%s, %s, %d, 0x%03X, %d}," % (c_str(r["name"]), c_str(r["brand"]),
                                                  r["first"], r["mask"], cat_id[r["cat"]]))
    o.append("};\nconst uint16_t kRemoteCount = %d;\n" % len(remotes))
    o.append("}  // namespace IrDb")
    with open(OUT, "w") as f:
        f.write("\n".join(o) + "\n")

    n_raw = sum(1 for s in all_sigs if s[0] == RAW_ID)
    size = len(remotes) * 16 + len(all_sigs) * 8 + len(raw_pool) * 2 + \
        sum(len(r["name"]) + 1 for r in remotes)
    print("IRDB %s: %d remotes, %d categories, %d keys (%d raw), raw pool %d values, "
          "~%d KB flash -> %s" % (ver, len(remotes), len(cats), len(all_sigs), n_raw,
                                  len(raw_pool), size // 1024, os.path.relpath(OUT)))


if __name__ == "__main__":
    main()
