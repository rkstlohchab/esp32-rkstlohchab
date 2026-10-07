#pragma once

/* =====================================================================
   Navigation input abstraction.

   ESP32-DIV reads its 5-way keypad through a PCF8574 I2C port expander.
   A bare DevKit has no expander, but it does have an analog joystick, and
   the feature code only ever calls three methods on that object:

       pcf.begin(addr)   pcf.pinMode(pin, mode)   pcf.digitalRead(pin)

   So JoystickNav implements exactly those three and maps the virtual
   PCF8574 port numbers (BTN_UP/DOWN/LEFT/RIGHT/SELECT) onto the joystick's
   two ADC axes and its click. Every feature keeps working unmodified.

   Set USE_JOYSTICK_NAV in BoardConfig.h to select this backend.
   ===================================================================== */

#include <Arduino.h>

#if defined(USE_JOYSTICK_NAV) && USE_JOYSTICK_NAV

#ifndef JOY_X_PIN
#error "USE_JOYSTICK_NAV needs JOY_X_PIN / JOY_Y_PIN / JOY_SW_PIN in BoardConfig.h"
#endif

#ifndef JOY_DEADZONE
#define JOY_DEADZONE 700
#endif

/* Virtual port numbers, matching shared.h's BTN_* for this board. */
#ifndef BTN_UP
#define BTN_UP       7
#define BTN_DOWN     5
#define BTN_LEFT     3
#define BTN_RIGHT    4
#define BTN_SELECT   6
#endif

class JoystickNav {
public:
  explicit JoystickNav(uint8_t /*addr*/ = 0x20) {}

  /* Samples the resting position so an off-centre stick still reads true.
     Returns true so the caller's auto-detect loop treats input as present. */
  bool begin(uint8_t /*addr*/ = 0x20) {
    ::pinMode(JOY_SW_PIN, INPUT_PULLUP);
    long sx = 0, sy = 0;
    for (uint8_t i = 0; i < 16; i++) {
      sx += ::analogRead(JOY_X_PIN);
      sy += ::analogRead(JOY_Y_PIN);
      delay(2);
    }
    _cx = (int)(sx / 16);
    _cy = (int)(sy / 16);
    _ready = true;
    return true;
  }

  /* The features declare each button INPUT_PULLUP. Nothing to configure
     here — the ADC pins need no mode and SW is set up in begin(). */
  void pinMode(uint8_t /*pin*/, uint8_t /*mode*/) {
    if (!_ready) begin();
  }

  /* Active LOW, matching the INPUT_PULLUP switches this replaces. */
  int digitalRead(uint8_t pin) {
    if (!_ready) begin();
    sample();
    switch (pin) {
      case BTN_LEFT:   return (_x < _cx - JOY_DEADZONE) ? LOW : HIGH;
      case BTN_RIGHT:  return (_x > _cx + JOY_DEADZONE) ? LOW : HIGH;
      case BTN_UP:     return (_y < _cy - JOY_DEADZONE) ? LOW : HIGH;
      case BTN_DOWN:   return (_y > _cy + JOY_DEADZONE) ? LOW : HIGH;
      case BTN_SELECT: return _sw;
      default:         return HIGH;   /* unmapped port: never pressed */
    }
  }

private:
  /* One ADC sweep per 10ms serves all five reads in a poll cycle, so a
     feature reading 5 buttons does not pay for 15 conversions. */
  void sample() {
    unsigned long now = millis();
    if (now - _last < 10) return;
    _last = now;
    _x  = ::analogRead(JOY_X_PIN);
    _y  = ::analogRead(JOY_Y_PIN);
    _sw = ::digitalRead(JOY_SW_PIN);
  }

  int _cx = 2048, _cy = 2048;
  int _x = 2048, _y = 2048, _sw = HIGH;
  unsigned long _last = 0;
  bool _ready = false;
};

typedef JoystickNav NavExpander;

#else   /* stock hardware: the real I2C port expander */

#include <PCF8574.h>
typedef PCF8574 NavExpander;

#endif
