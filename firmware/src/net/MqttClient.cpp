#include "MqttClient.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include <secrets.h>

static WiFiClient wifiClient;
static PubSubClient client(wifiClient);
static String topic;
static uint32_t lastAttempt = 0;
static bool ntpStarted = false;

void mqttBegin() {
    topic = String("devices/") + DEVICE_ID + "/measurements";
    client.setServer(MQTT_HOST, MQTT_PORT);
    client.setBufferSize(384);
    client.setKeepAlive(15);
    lastAttempt = 0;
}

void mqttUpdate(uint32_t now) {
    if (WiFi.status() != WL_CONNECTED) return;

    if (!ntpStarted) {
        configTime(0, 0, "pool.ntp.org", "time.google.com");
        ntpStarted = true;
    }

    if (client.connected()) {
        client.loop();
        return;
    }

    if (lastAttempt != 0 && static_cast<uint32_t>(now - lastAttempt) < 5000) return;
    lastAttempt = now ? now : 1;

    if (client.connect(DEVICE_ID)) {
        Serial.println("MQTT connected");
    } else {
        Serial.print("MQTT connect failed, rc=");
        Serial.println(client.state());
    }
}

bool mqttIsConnected() { return client.connected(); }

bool mqttPublishMeasurement(float ax, float ay, float az, float gx, float gy, float gz) {
    if (!client.connected()) return false;

    char buf[256];
    const time_t nowSec = time(nullptr);
    int n;
    if (nowSec > 1700000000) {  // clock synced via NTP
        n = snprintf(buf, sizeof(buf),
                     "{\"ts\":%lld,\"deviceId\":\"%s\",\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,"
                     "\"gyroX\":%.2f,\"gyroY\":%.2f,\"gyroZ\":%.2f}",
                     static_cast<long long>(nowSec) * 1000LL, DEVICE_ID, ax, ay, az, gx, gy, gz);
    } else {  // no ts → the server uses the receive time
        n = snprintf(buf, sizeof(buf),
                     "{\"deviceId\":\"%s\",\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,"
                     "\"gyroX\":%.2f,\"gyroY\":%.2f,\"gyroZ\":%.2f}",
                     DEVICE_ID, ax, ay, az, gx, gy, gz);
    }
    return n > 0 && client.publish(topic.c_str(), buf);
}
