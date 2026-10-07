#pragma once
/* Built-in Universal Controller database, generated from Flipper-IRDB (CC0)
   by tools/irdb_gen.py into ir_db_data.cpp — regenerate, don't hand-edit.

   Buttons are stored the way Flipper stores them (protocol + address +
   command, or raw timings) and turned into IR frames at send time using
   Flipper's own frame layouts and timings (lib/infrared/encoder_decoder). */
#include <stdint.h>

namespace IrDb {

enum Proto : uint8_t {
  NEC = 1, NECext, NEC42, NEC42ext, Samsung32, RC5, RC5X, RC6,
  SIRC, SIRC15, SIRC20, Kaseikyo, RCA, Pioneer, Raw,
};

/* Parsed: Flipper address/command. Raw: address = offset into kRaw,
   command = number of timings, khz = carrier. */
struct Sig { uint32_t address; uint16_t command; uint8_t proto; uint8_t khz; };

/* keyMask bit n = IRUniversalController::KeyId n; the Sigs for the set bits
   are stored in bit order starting at kSigs[firstSig]. */
struct Remote {
  const char* name;
  const char* brand;
  uint16_t firstSig;
  uint16_t keyMask;
  uint8_t category;
};

extern const char kSourceVersion[];
extern const char* const kCategories[];
extern const uint8_t kCategoryCount;
extern const Sig kSigs[];
extern const uint16_t kRaw[];
extern const Remote kRemotes[];
extern const uint16_t kRemoteCount;

inline const char* protoName(uint8_t p) {
  static const char* const names[] = {
    "?", "NEC", "NECext", "NEC42", "NEC42ext", "Samsung32", "RC5", "RC5X", "RC6",
    "SIRC", "SIRC15", "SIRC20", "Kaseikyo", "RCA", "Pioneer", "RAW"};
  return p <= Raw ? names[p] : "?";
}

/* Pulse-distance / pulse-width protocols, sent LSB first like Flipper's
   infrared_common_encode_pdwm. footer = Flipper's trailing stop mark. */
struct Timing {
  uint16_t hdrMark, hdrSpace, oneMark, oneSpace, zeroMark, zeroSpace, footer;
  uint32_t gap;       // minimum silence after a frame
  uint32_t mesgtime;  // frame start-to-start period (0 = gap only)
  uint8_t khz, repeat;  // repeat = extra frames (Flipper min repeat count - 1)
};

inline const Timing* timingFor(uint8_t p) {
  static const Timing nec      = {9000, 4500, 560, 1690, 560, 560, 560, 40000, 110000, 38, 0};
  static const Timing samsung  = {4500, 4500, 550, 1650, 550, 550, 550, 46000, 0, 38, 0};
  static const Timing kaseikyo = {3456, 1728, 432, 1296, 432, 432, 432, 40000, 130000, 38, 0};
  static const Timing rca      = {4000, 4000, 500, 2000, 500, 1000, 500, 8000, 0, 38, 0};
  static const Timing pioneer  = {8500, 4225, 500, 1500, 500, 500, 500, 26000, 0, 40, 1};
  static const Timing sirc     = {2400, 600, 1200, 600, 600, 600, 0, 10000, 45000, 40, 2};
  switch (p) {
    case NEC: case NECext: case NEC42: case NEC42ext: return &nec;
    case Samsung32: return &samsung;
    case Kaseikyo:  return &kaseikyo;
    case RCA:       return &rca;
    case Pioneer:   return &pioneer;
    case SIRC: case SIRC15: case SIRC20: return &sirc;
    default: return nullptr;
  }
}

/* Frame value in on-air order (bit 0 sent first), per Flipper's encoders. */
inline bool frameFor(const Sig& s, uint64_t& data, uint16_t& nbits) {
  const uint64_t a = s.address, c = s.command;
  switch (s.proto) {
    case NEC:
      data = (a & 0xFF) | ((~a & 0xFF) << 8) | ((c & 0xFF) << 16) | ((~c & 0xFF) << 24);
      nbits = 32; return true;
    case NECext:
      data = (a & 0xFFFF) | ((c & 0xFFFF) << 16);
      nbits = 32; return true;
    case NEC42:
      data = (a & 0x1FFF) | ((~a & 0x1FFF) << 13) | ((c & 0xFF) << 26) | ((~c & 0xFF) << 34);
      nbits = 42; return true;
    case NEC42ext:
      data = (a & 0x3FFFFFF) | ((c & 0xFFFF) << 26);
      nbits = 42; return true;
    case Samsung32:
      data = (a & 0xFF) | ((a & 0xFF) << 8) | ((c & 0xFF) << 16) | ((~c & 0xFF) << 24);
      nbits = 32; return true;
    case Kaseikyo: {
      const uint16_t vendor = (a >> 8) & 0xFFFF;
      uint8_t b[6];
      b[0] = vendor & 0xFF;
      b[1] = vendor >> 8;
      uint8_t vp = b[0] ^ b[1];
      vp = (vp & 0xF) ^ (vp >> 4);
      b[2] = (vp & 0xF) | (((a >> 4) & 0xF) << 4);
      b[3] = (a & 0xF) | ((c & 0xF) << 4);
      b[4] = (((a >> 24) & 3) << 6) | ((c >> 4) & 0x3F);
      b[5] = b[2] ^ b[3] ^ b[4];
      data = 0;
      for (int i = 5; i >= 0; i--) data = (data << 8) | b[i];
      nbits = 48; return true;
    }
    case RCA:
      data = (a & 0xF) | ((c & 0xFF) << 4) | ((~a & 0xF) << 12) | ((~c & 0xFF) << 16);
      nbits = 24; return true;
    case Pioneer:  // Flipper sends a 33rd (zero) bit before the stop mark.
      data = (a & 0xFF) | ((~a & 0xFF) << 8) | ((c & 0xFF) << 16) | ((~c & 0xFF) << 24);
      nbits = 33; return true;
    case SIRC:
      data = (c & 0x7F) | ((a & 0x1F) << 7);   nbits = 12; return true;
    case SIRC15:
      data = (c & 0x7F) | ((a & 0xFF) << 7);   nbits = 15; return true;
    case SIRC20:
      data = (c & 0x7F) | ((a & 0x1FFF) << 7); nbits = 20; return true;
    default:
      return false;  // RC5/RC5X/RC6 are bi-phase; Raw is sent as timings.
  }
}

}  // namespace IrDb
