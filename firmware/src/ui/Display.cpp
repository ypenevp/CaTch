#include "ui/Display.h"

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"
#include "core/Log.h"

#define OLED_RESET_PIN -1
#define CHAR_WIDTH 6          // text size 1
#define HEADER_LINE_Y 11
#define FOOTER_LINE_Y 54
#define FOOTER_TEXT_Y 56
#define MENU_FIRST_Y 14
#define MENU_ROW_HEIGHT 8

#define SCREEN_HOME 0
#define SCREEN_VITALS 1
#define SCREEN_SENSOR 2
#define SCREEN_CONNECTIONS 3
#define SCREEN_SETTINGS 4
#define SCREEN_COUNT 5

static const char *SCREEN_NAMES[SCREEN_COUNT] = {"HOME", "VITALS", "SENSOR", "CONNECTIONS", "SETTINGS"};

static Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, OLED_RESET_PIN);
static bool available = false;
static uint8_t selectedScreen = SCREEN_HOME;
static bool menuOpen = false;
static bool redrawNow = true;
static uint32_t lastRefresh = 0;

// ---------- drawing helpers ----------

static void drawRightAligned(const char *text, int16_t y) {
    int16_t x = OLED_WIDTH - (int16_t)strlen(text) * CHAR_WIDTH;
    oled.setCursor(x < 0 ? 0 : x, y);
    oled.print(text);
}

static void drawCentered(const char *text, uint8_t size, int16_t y) {
    oled.setTextSize(size);
    int16_t x = (OLED_WIDTH - (int16_t)strlen(text) * CHAR_WIDTH * size) / 2;
    oled.setCursor(x < 0 ? 0 : x, y);
    oled.print(text);
    oled.setTextSize(1);
}

static void drawHeader(const char *right) {
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
    oled.setCursor(0, 0);
    oled.print("CaTch");
    drawRightAligned(right, 0);
    oled.drawLine(0, HEADER_LINE_Y, OLED_WIDTH - 1, HEADER_LINE_Y, SSD1306_WHITE);
}

static void drawFooter(const char *hint) {
    oled.drawLine(0, FOOTER_LINE_Y, OLED_WIDTH - 1, FOOTER_LINE_Y, SSD1306_WHITE);
    oled.setCursor(0, FOOTER_TEXT_Y);
    oled.print(hint);
}

static void drawRow(int16_t y, const char *label, const char *value) {
    oled.setCursor(0, y);
    oled.print(label);
    drawRightAligned(value, y);
}

// ---------- screens ----------

static void drawPairingRequest() {
    oled.drawRect(0, 0, OLED_WIDTH, OLED_HEIGHT, SSD1306_WHITE);
    drawCentered("PAIRING REQUEST", 1, 6);
    oled.drawLine(0, 17, OLED_WIDTH - 1, 17, SSD1306_WHITE);
    drawCentered("A phone wants to", 1, 23);
    drawCentered("connect. Allow it?", 1, 33);
    drawCentered("SEL:allow NEXT:deny", 1, 50);
}

static void drawPairingProgress(const DisplayData &data) {
    drawHeader("PAIRING");
    if (data.bleState == ProvState::Done) {
        drawCentered("PAIRED", 2, 20);
        drawCentered("Starting...", 1, 42);
        return;
    }
    const char *step = data.provisionStage == ProvisionStage::Claiming ? "Registering" : "Wi-Fi";
    drawCentered("Connecting", 1, 20);
    drawCentered(step, 2, 32);
}

static void drawMenu() {
    drawHeader("MENU");
    for (uint8_t i = 0; i < SCREEN_COUNT; i++) {
        int16_t y = MENU_FIRST_Y + i * MENU_ROW_HEIGHT;
        if (i == selectedScreen) {
            oled.fillRect(0, y - 1, OLED_WIDTH, MENU_ROW_HEIGHT, SSD1306_WHITE);
            oled.setTextColor(SSD1306_BLACK);
        } else {
            oled.setTextColor(SSD1306_WHITE);
        }
        oled.setCursor(4, y);
        oled.print(SCREEN_NAMES[i]);
    }
    oled.setTextColor(SSD1306_WHITE);
    drawFooter("NEXT:move SEL:open");
}

static void drawHome(const DisplayData &data) {
    if (!data.running) {
        drawHeader("SETUP");
        drawCentered("NOT PAIRED", 1, 16);
        drawCentered("Open the CaTch app", 1, 28);
        drawCentered("to add this device", 1, 38);
    } else {
        drawHeader(data.mqttConnected ? "ONLINE" : "OFFLINE");
        drawRow(16, "Wi-Fi", data.wifiConnected ? "CONNECTED" : "WAITING");
        drawRow(28, "Server", data.mqttConnected ? "CONNECTED" : "WAITING");
        drawRow(40, "Sensor", data.motionReady ? "READY" : "SEARCHING");
    }
    drawFooter("SEL/NEXT: menu");
}

static void drawVitals(const DisplayData &data) {
    drawHeader("VITALS");
    char value[12];

    oled.setCursor(0, 20);
    oled.print("Pulse");
    snprintf(value, sizeof(value), "%d", data.vitals.heartRate);
    oled.setTextSize(2);
    oled.setCursor(48, 15);
    oled.print(value);
    oled.setTextSize(1);
    oled.setCursor(98, 20);
    oled.print("bpm");

    oled.setCursor(0, 40);
    oled.print("SpO2");
    snprintf(value, sizeof(value), "%.0f", data.vitals.spo2);
    oled.setTextSize(2);
    oled.setCursor(48, 35);
    oled.print(value);
    oled.setTextSize(1);
    oled.setCursor(98, 40);
    oled.print("%");

    drawFooter(data.vitals.simulated ? "DEMO DATA  SEL: menu" : "SEL/NEXT: menu");
}

static void drawSensor(const DisplayData &data) {
    drawHeader("SENSOR");
    if (!data.motionReady || !data.hasMotion) {
        drawCentered("SENSOR OFFLINE", 1, 22);
        drawCentered("Check I2C wiring", 1, 36);
    } else {
        char line[24];
        snprintf(line, sizeof(line), "AX %+.2f AY %+.2f", data.motion.ax, data.motion.ay);
        oled.setCursor(0, 16);
        oled.print(line);
        snprintf(line, sizeof(line), "AZ %+.2f GX %+4.0f", data.motion.az, data.motion.gx);
        oled.setCursor(0, 28);
        oled.print(line);
        snprintf(line, sizeof(line), "GY %+4.0f GZ %+4.0f", data.motion.gy, data.motion.gz);
        oled.setCursor(0, 40);
        oled.print(line);
    }
    drawFooter("SEL/NEXT: menu");
}

static const char *shortBleState(ProvState state) {
    switch (state) {
        case ProvState::WaitingConfirmation: return "REQUEST";
        case ProvState::Confirmed:           return "CONFIRMED";
        case ProvState::WifiConnecting:      return "WI-FI";
        case ProvState::Claiming:            return "REGISTER";
        case ProvState::Done:                return "DONE";
        case ProvState::Idle:                return "WAITING";
    }
    return "WAITING";
}

static void drawConnections(const DisplayData &data) {
    drawHeader("LINKS");
    drawRow(16, "BLE", data.running ? "OFF" : shortBleState(data.bleState));
    drawRow(28, "Wi-Fi", data.wifiConnected ? "CONNECTED" : "--");
    drawRow(40, "MQTT", data.mqttConnected ? "CONNECTED" : "--");
    drawFooter("SEL/NEXT: menu");
}

static void drawSettings(const DisplayData &data) {
    drawHeader("SETTINGS");
    drawRow(22, "Sound", data.soundEnabled ? "ON" : "OFF");
    drawFooter("NEXT:back SEL:toggle");
}

// ---------- public API ----------

bool displayBegin() {
    uint8_t addresses[2] = {OLED_ADDRESS_PRIMARY, OLED_ADDRESS_SECONDARY};
    for (uint8_t i = 0; i < 2; i++) {
        Wire.beginTransmission(addresses[i]);
        if (Wire.endTransmission() != 0) {
            continue;
        }
        if (oled.begin(SSD1306_SWITCHCAPVCC, addresses[i])) {
            available = true;
            oled.clearDisplay();
            oled.setTextColor(SSD1306_WHITE);
            drawCentered("CaTch", 2, 18);
            drawCentered("starting...", 1, 40);
            oled.display();
            logPrintf("DISPLAY", "SSD1306 found at I2C 0x%02X", addresses[i]);
            return true;
        }
    }
    logPrintf("DISPLAY", "SSD1306 not found at 0x%02X or 0x%02X", OLED_ADDRESS_PRIMARY, OLED_ADDRESS_SECONDARY);
    return false;
}

bool displayAvailable() {
    return available;
}

DisplayAction displayNext() {
    if (menuOpen) {
        selectedScreen = (selectedScreen + 1) % SCREEN_COUNT;
        logPrintf("DISPLAY", "Menu: %s selected", SCREEN_NAMES[selectedScreen]);
    } else {
        menuOpen = true;
        logPrintf("DISPLAY", "Menu opened");
    }
    redrawNow = true;
    return DisplayAction::None;
}

DisplayAction displaySelect() {
    redrawNow = true;
    if (menuOpen) {
        menuOpen = false;
        logPrintf("DISPLAY", "Screen opened: %s", SCREEN_NAMES[selectedScreen]);
        return DisplayAction::None;
    }
    if (selectedScreen == SCREEN_SETTINGS) {
        return DisplayAction::ToggleSound;
    }
    menuOpen = true;
    logPrintf("DISPLAY", "Menu opened");
    return DisplayAction::None;
}

void displayUpdate(uint32_t now, const DisplayData &data) {
    if (!available) {
        return;
    }
    if (!redrawNow && (uint32_t)(now - lastRefresh) < DISPLAY_REFRESH_MS) {
        return;
    }
    redrawNow = false;
    lastRefresh = now;

    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);

    bool pairing = !data.running;
    bool pairingBusy = data.provisionStage == ProvisionStage::WifiConnecting ||
                       data.provisionStage == ProvisionStage::Claiming ||
                       data.bleState == ProvState::Done;

    if (pairing && data.bleState == ProvState::WaitingConfirmation) {
        drawPairingRequest();
    } else if (pairing && pairingBusy) {
        drawPairingProgress(data);
    } else if (menuOpen) {
        drawMenu();
    } else if (selectedScreen == SCREEN_HOME) {
        drawHome(data);
    } else if (selectedScreen == SCREEN_VITALS) {
        drawVitals(data);
    } else if (selectedScreen == SCREEN_SENSOR) {
        drawSensor(data);
    } else if (selectedScreen == SCREEN_CONNECTIONS) {
        drawConnections(data);
    } else {
        drawSettings(data);
    }

    oled.display();
}
