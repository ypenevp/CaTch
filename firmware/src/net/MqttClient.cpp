#include "net/MqttClient.h"

#include <WiFi.h>
#include <PubSubClient.h>
#include <time.h>
#include "secrets.h"
#include "config.h"
#include "core/Log.h"

#define MQTT_PAYLOAD_SIZE 320
#define NTP_SYNCED_AFTER_EPOCH 1700000000

static WiFiClient wifiClient;
static PubSubClient client(wifiClient);
static String topic;
static uint32_t lastAttempt = 0;
static bool ntpStarted = false;
static bool wasConnected = false;
static uint32_t publishedCount = 0;

static void onMessage(char *messageTopic, byte *payload, unsigned int length) {
    logPrintf("MQTT", "Received on %s (%u bytes): %.*s", messageTopic, length, (int)length, (const char *)payload);
}

void mqttBegin() {
    topic = String("devices/") + DEVICE_ID + "/measurements";

    client.setServer(MQTT_HOST, MQTT_PORT);
    client.setBufferSize(MQTT_BUFFER_SIZE);
    client.setKeepAlive(MQTT_KEEPALIVE_S);
    client.setSocketTimeout(MQTT_SOCKET_TIMEOUT_S);
    client.setCallback(onMessage);
    lastAttempt = 0;

    logPrintf("MQTT", "Broker %s:%d, topic %s", MQTT_HOST, MQTT_PORT, topic.c_str());
}

void mqttUpdate(uint32_t now) {
    if (WiFi.status() != WL_CONNECTED) {
        if (wasConnected) {
            logPrintf("MQTT", "Disconnected (Wi-Fi lost)");
            wasConnected = false;
        }
        return;
    }

    if (!ntpStarted) {
        configTime(0, 0, "pool.ntp.org", "time.google.com");
        ntpStarted = true;
        logPrintf("MQTT", "NTP time sync started");
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
        logPrintf("MQTT", "Connect failed, state %d, retry in %d ms", client.state(), MQTT_RECONNECT_INTERVAL_MS);
    }
}

bool mqttIsConnected() {
    return client.connected();
}

bool mqttPublishMeasurement(const MotionSample &motion, const VitalsSample &vitals) {
    if (!client.connected()) {
        return false;
    }

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

    if (length <= 0 || length >= (int)sizeof(payload)) {
        logPrintf("MQTT", "Payload does not fit in %d bytes", MQTT_PAYLOAD_SIZE);
        return false;
    }

    bool sent = client.publish(topic.c_str(), payload);
    if (sent) {
        publishedCount++;
        logPrintf("MQTT", "Sent #%lu to %s: %s", (unsigned long)publishedCount, topic.c_str(), payload);
    } else {
        logPrintf("MQTT", "Publish failed, state %d", client.state());
    }
    return sent;
}
