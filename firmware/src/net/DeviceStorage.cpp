#include "DeviceStorage.h"
#include <Preferences.h>

static const char *NS = "catch";

bool loadDeviceConfig(DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(NS, true)) return false;

    config.ssid = prefs.getString("ssid", "");
    config.wifiPassword = prefs.getString("wpass", "");
    config.mqttUsername = prefs.getString("muser", "");
    config.mqttPassword = prefs.getString("mpass", "");
    prefs.end();

    return config.ssid.length() > 0 && config.mqttUsername.length() > 0;
}

bool saveDeviceConfig(const DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(NS, false)) return false;

    prefs.putString("ssid", config.ssid);
    prefs.putString("wpass", config.wifiPassword);
    prefs.putString("muser", config.mqttUsername);
    prefs.putString("mpass", config.mqttPassword);
    prefs.end();
    return true;
}

void clearDeviceConfig() {
    Preferences prefs;
    if (prefs.begin(NS, false)) {
        prefs.clear();
        prefs.end();
    }
}
