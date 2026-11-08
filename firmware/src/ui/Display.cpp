#include "Display.h"
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <math.h>

namespace {
constexpr int16_t SCREEN_WIDTH = 128;
constexpr int16_t SCREEN_HEIGHT = 64;
constexpr uint8_t OLED_RESET = -1;
constexpr uint32_t REFRESH_MS = 180;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool available = false;
uint8_t oledAddress = 0;
constexpr uint8_t SCREEN_COUNT = 4;
uint8_t selectedScreen = 0;
bool menuOpen = true;
bool soundEnabled = true;
uint32_t lastRefresh = 0;

const char *shortBleState(ProvState state) {
    switch (state) {
        case ProvState::WaitingConfirmation: return "REQUEST";
        case ProvState::Confirmed: return "CONFIRMED";
        case ProvState::WifiConnecting: return "WIFI SETUP";
        case ProvState::Claiming: return "REGISTERING";
        case ProvState::Done: return "COMPLETE";
        default: return "ADVERTISING";
    }
}

void header(const char *right) {
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.print(F("CaTch"));
    display.setCursor(77, 0);
    display.print(right);
    display.drawLine(0, 11, 127, 11, SSD1306_WHITE);
}

void footer(const char *hint) {
    display.drawLine(0, 54, 127, 54, SSD1306_WHITE);
    display.setCursor(0, 57);
    display.print(hint);
}

void centered(const char *text, uint8_t size, int16_t y) {
    display.setTextSize(size);
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(text, 0, y, &x1, &y1, &w, &h);
    display.setCursor((SCREEN_WIDTH - w) / 2, y);
    display.print(text);
}

void drawHome(bool running, bool wifi, bool mqtt, bool mpu) {
    header(running ? (wifi ? "ONLINE" : "OFFLINE") : "SETUP");
    if (!running) {
        centered("READY", 2, 19);
        centered("Waiting for BLE", 1, 40);
        footer("NEXT: MENU  SEL: MENU");
    } else {
        display.setCursor(0, 17); display.print(F("WiFi"));
        display.setCursor(76, 17); display.print(wifi ? F("CONNECTED") : F("WAITING"));
        display.setCursor(0, 29); display.print(F("MQTT"));
        display.setCursor(76, 29); display.print(mqtt ? F("CONNECTED") : F("OFFLINE"));
        display.setCursor(0, 41); display.print(F("MPU6050"));
        display.setCursor(76, 41); display.print(mpu ? F("READY") : F("SEARCHING"));
        footer("NEXT: MENU  SEL: MENU");
    }
}

void drawSensor(const MotionData *motion, bool mpuReady) {
    header("SENSOR");
    if (!mpuReady || motion == nullptr) {
        centered("SENSOR OFFLINE", 1, 27);
        centered("Check I2C wiring", 1, 40);
    } else {
        const float ax = motion->ax / 16384.0f;
        const float ay = motion->ay / 16384.0f;
        const float az = motion->az / 16384.0f;
        const float gx = motion->gx / 131.0f;
        const float gy = motion->gy / 131.0f;
        const float gz = motion->gz / 131.0f;
        char line[24];
        snprintf(line, sizeof(line), "AX %+.2f AY %+.2f", ax, ay);
        display.setCursor(0, 15); display.print(line);
        snprintf(line, sizeof(line), "AZ %+.2f GX %+.0f", az, gx);
        display.setCursor(0, 28); display.print(line);
        snprintf(line, sizeof(line), "GY %+.0f GZ %+.0f", gy, gz);
        display.setCursor(0, 41); display.print(line);
    }
    footer("NEXT: MENU  SEL: MENU");
}

void drawConnections(bool running, ProvState ble, bool wifi, bool mqtt) {
    header("LINKS");
    display.setCursor(0, 16); display.print(F("BLE  "));
    if (running) display.print(F("OFF"));
    else display.print(shortBleState(ble));
    display.setCursor(0, 29); display.print(F("WiFi "));
    display.print(running ? (wifi ? F("CONNECTED") : F("CONNECTING")) : F("--"));
    display.setCursor(0, 42); display.print(F("MQTT "));
    display.print(running ? (mqtt ? F("CONNECTED") : F("OFFLINE")) : F("--"));
    footer("NEXT: MENU  SEL: MENU");
}

void drawSettings() {
    header("SETTINGS");
    display.setCursor(0, 22);
    display.print(F("Sound: "));
    display.print(soundEnabled ? F("ON") : F("OFF"));
    display.setCursor(0, 38);
    display.print(F("SELECT toggles sound"));
    footer("NEXT: MENU  SEL: TOGGLE");
}

void drawMenu() {
    header("MENU");
    const char *items[] = {"HOME", "SENSOR", "CONNECTIONS", "SETTINGS"};
    for (uint8_t i = 0; i < SCREEN_COUNT; ++i) {
        const int16_t y = 15 + i * 10;
        if (i == selectedScreen) {
            display.fillRect(0, y - 1, SCREEN_WIDTH, 9, SSD1306_WHITE);
            display.setTextColor(SSD1306_BLACK);
        } else {
            display.setTextColor(SSD1306_WHITE);
        }
        display.setCursor(4, y);
        display.print(items[i]);
    }
    display.setTextColor(SSD1306_WHITE);
    footer("NEXT: MOVE  SEL: OPEN");
}

void drawBleAlert() {
    display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
    centered("BLE REQUEST", 1, 9);
    display.drawLine(0, 21, 127, 21, SSD1306_WHITE);
    centered("DEVICE CONNECTED", 1, 27);
    centered("Confirm connection?", 1, 39);
    centered("SEL: ACCEPT  NEXT: DENY", 1, 53);
}
}

void beginDisplay(uint8_t sdaPin, uint8_t sclPin) {
    // Wire is already initialized by beginMPU6050(); pins are kept in the
    // signature to document that OLED and MPU6050 share the same I2C bus.
    (void)sdaPin;
    (void)sclPin;

    const uint8_t candidates[] = {0x3C, 0x3D};
    for (uint8_t address : candidates) {
        Wire.beginTransmission(address);
        if (Wire.endTransmission() == 0) {
            if (display.begin(SSD1306_SWITCHCAPVCC, address)) {
                oledAddress = address;
                available = true;
                display.clearDisplay();
                display.setTextColor(SSD1306_WHITE);
                display.setTextSize(1);
                display.setCursor(0, 0);
                display.println(F("CaTch"));
                display.println(F("OLED initialized"));
                display.display();
                Serial.printf("OLED SSD1306 detected at I2C 0x%02X\n", address);
                return;
            }
        }
    }
    Serial.println(F("OLED not found at I2C 0x3C or 0x3D"));
}

bool displayAvailable() { return available; }
bool displaySoundEnabled() { return soundEnabled; }
uint8_t displayAddress() { return oledAddress; }

void displayNext() {
    if (menuOpen) {
        selectedScreen = (selectedScreen + 1) % SCREEN_COUNT;
    } else {
        menuOpen = true;
    }
}

void displaySelect() {
    if (menuOpen) {
        menuOpen = false;
    } else if (selectedScreen == 3) {
        soundEnabled = !soundEnabled;
    } else {
        menuOpen = true;
    }
}

void updateDisplay(uint32_t now, bool running, ProvState ble,
                   bool wifiConnected, bool mqttConnected,
                   bool mpuReady, const MotionData *motion) {
    if (!available || static_cast<uint32_t>(now - lastRefresh) < REFRESH_MS) return;
    lastRefresh = now;
    display.clearDisplay();

    if (!running && ble == ProvState::WaitingConfirmation) {
        drawBleAlert();
    } else {
        if (menuOpen) {
            drawMenu();
        } else {
            switch (selectedScreen) {
                case 0: drawHome(running, wifiConnected, mqttConnected, mpuReady); break;
                case 1: drawSensor(motion, mpuReady); break;
                case 2: drawConnections(running, ble, wifiConnected, mqttConnected); break;
                default: drawSettings(); break;
            }
        }
    }
    display.display();
}
