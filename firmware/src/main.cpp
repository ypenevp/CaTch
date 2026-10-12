#include <Arduino.h>
#include <Wire.h>
#include <secrets.h>

constexpr uint8_t MPU_ADDR = 0x68;  // AD0 low
constexpr int SDA_PIN = 8;
constexpr int SCL_PIN = 9;
constexpr int NEXT_PIN = 4;
constexpr int SELECT_PIN = 5;
constexpr uint32_t DEBOUNCE_MS = 35;

struct DebouncedButton {
  int pin;
  bool stablePressed;
  bool candidatePressed;
  uint32_t candidateSince;
};

DebouncedButton nextButton{NEXT_PIN, false, false, 0};
DebouncedButton selectButton{SELECT_PIN, false, false, 0};

bool mpuWrite(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool readMotion(int16_t &ax, int16_t &ay, int16_t &az,
                int16_t &gx, int16_t &gy, int16_t &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, static_cast<uint8_t>(14)) != 14) return false;

  int16_t values[7];
  for (int i = 0; i < 7; ++i) {
    uint8_t hi = Wire.read();
    uint8_t lo = Wire.read();
    values[i] = static_cast<int16_t>((static_cast<uint16_t>(hi) << 8) | lo);
  }
  ax = values[0]; ay = values[1]; az = values[2];
  gx = values[4]; gy = values[5]; gz = values[6];
  return true;
}

bool initializeMpu() {
  return mpuWrite(0x6B, 0x00) && mpuWrite(0x1C, 0x00) && mpuWrite(0x1B, 0x00);
}

// Called once for each debounced state change; pressed is true on press, false on release.
void onNext(bool pressed) {
  Serial.print("Next ");
  Serial.println(pressed ? "pressed" : "released");
}

void onSelect(bool pressed) {
  Serial.print("Select ");
  Serial.println(pressed ? "pressed" : "released");
}

void updateButton(DebouncedButton &button, void (*onChange)(bool), uint32_t now) {
  const bool rawPressed = (digitalRead(button.pin) == LOW);  // INPUT_PULLUP: active-low
  if (rawPressed != button.candidatePressed) {
    button.candidatePressed = rawPressed;
    button.candidateSince = now;
  }
  if (button.candidatePressed != button.stablePressed &&
      static_cast<uint32_t>(now - button.candidateSince) >= DEBOUNCE_MS) {
    button.stablePressed = button.candidatePressed;
    onChange(button.stablePressed);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(NEXT_PIN, INPUT_PULLUP);
  pinMode(SELECT_PIN, INPUT_PULLUP);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000);
  delay(100);
  Serial.println("MPU6050 and Next/Select buttons starting...");
}

void loop() {
  const uint32_t now = millis();
  updateButton(nextButton, onNext, now);
  updateButton(selectButton, onSelect, now);

  static bool initialized = false;
  if (!initialized) {
    initialized = initializeMpu();
    if (!initialized) {
      Serial.println("MPU6050 init/I2C error; retrying");
      delay(1000);
      return;
    }
    Serial.println("MPU6050 ready (I2C 0x68)");
  }

  static uint32_t lastMotionPrint = 0;
  if (static_cast<uint32_t>(now - lastMotionPrint) < 100) return;
  lastMotionPrint = now;

  int16_t ax, ay, az, gx, gy, gz;
  if (!readMotion(ax, ay, az, gx, gy, gz)) {
    Serial.println("MPU6050 read error; reinitializing");
    initialized = false;
    return;
  }

  Serial.print("Accel [g]: ");
  Serial.print(ax / 16384.0f, 3); Serial.print(", ");
  Serial.print(ay / 16384.0f, 3); Serial.print(", ");
  Serial.print(az / 16384.0f, 3);
  Serial.print(" | Gyro [deg/s]: ");
  Serial.print(gx / 131.0f, 2); Serial.print(", ");
  Serial.print(gy / 131.0f, 2); Serial.print(", ");
  Serial.println(gz / 131.0f, 2);
}
