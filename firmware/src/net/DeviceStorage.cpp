#include "DeviceStorage.h"
#include <Preferences.h>

static const char *NS = "catch";

bool loadDeviceConfig(DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(NS, true)) return false;

    config.ssid = prefs.getString("ssid", "");
    config.wifiPassword = prefs.getString("wpass", "");
    prefs.end();

    return config.ssid.length() > 0;
}

bool saveDeviceConfig(const DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(NS, false)) return false;

    prefs.putString("ssid", config.ssid);
    prefs.putString("wpass", config.wifiPassword);
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
