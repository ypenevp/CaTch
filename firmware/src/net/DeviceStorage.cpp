#include "net/DeviceStorage.h"

#include <Preferences.h>
#include "core/Log.h"

#define STORAGE_NAMESPACE "catch"

bool loadDeviceConfig(DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, true)) {
        logPrintf("STORAGE", "No saved settings (namespace not found)");
        return false;
    }

    config.ssid = prefs.getString("ssid", "");
    config.wifiPassword = prefs.getString("wpass", "");
    prefs.end();

    return config.ssid.length() > 0;
}

bool saveDeviceConfig(const DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, false)) {
        logPrintf("STORAGE", "Could not open storage for writing");
        return false;
    }

    prefs.putString("ssid", config.ssid);
    prefs.putString("wpass", config.wifiPassword);
    prefs.end();
    logPrintf("STORAGE", "Settings saved (Wi-Fi \"%s\")", config.ssid.c_str());
    return true;
}

void clearDeviceConfig() {
    Preferences prefs;
    if (prefs.begin(STORAGE_NAMESPACE, false)) {
        prefs.clear();
        prefs.end();
        logPrintf("STORAGE", "Settings cleared");
    }
}
