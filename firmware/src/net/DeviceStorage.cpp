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
    config.mqttUsername = prefs.getString("muser", "");
    config.mqttPassword = prefs.getString("mpass", "");
    prefs.end();

    bool complete = config.ssid.length() > 0 && config.mqttUsername.length() > 0;
    if (complete) {
        logPrintf("STORAGE", "Loaded settings: Wi-Fi \"%s\", MQTT user %s",
                  config.ssid.c_str(), config.mqttUsername.c_str());
    } else {
        logPrintf("STORAGE", "Saved settings are incomplete, pairing needed");
    }
    return complete;
}

bool saveDeviceConfig(const DeviceConfig &config) {
    Preferences prefs;
    if (!prefs.begin(STORAGE_NAMESPACE, false)) {
        logPrintf("STORAGE", "Could not open storage for writing");
        return false;
    }

    prefs.putString("ssid", config.ssid);
    prefs.putString("wpass", config.wifiPassword);
    prefs.putString("muser", config.mqttUsername);
    prefs.putString("mpass", config.mqttPassword);
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
