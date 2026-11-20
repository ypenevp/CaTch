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

    logPrintf("MQTT", "Broker %s:%d (no username/password), topic %s", MQTT_HOST, MQTT_PORT, topic.c_str());
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

    if (wasConnected) {
        logPrintf("MQTT", "Connection lost, state %d", client.state());
        wasConnected = false;
    }

    if (lastAttempt != 0 && (uint32_t)(now - lastAttempt) < MQTT_RECONNECT_INTERVAL_MS) {
        return;
    }
    lastAttempt = (now == 0) ? 1 : now;

    // The broker allows anonymous clients; DEVICE_ID is the MQTT client id
    logPrintf("MQTT", "Connecting to %s:%d as %s", MQTT_HOST, MQTT_PORT, DEVICE_ID);
    if (client.connect(DEVICE_ID)) {
        wasConnected = true;
        logPrintf("MQTT", "Connected");
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

    // deviceId must match the topic: the backend drops messages where they differ
    char payload[MQTT_PAYLOAD_SIZE];
    time_t nowSec = time(NULL);
    int length;
    if (nowSec > NTP_SYNCED_AFTER_EPOCH) {
        length = snprintf(payload, sizeof(payload),
                          "{\"ts\":%lld,\"deviceId\":\"%s\","
                          "\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,"
                          "\"gyroX\":%.2f,\"gyroY\":%.2f,\"gyroZ\":%.2f,"
                          "\"heartRate\":%d,\"spo2\":%.1f}",
                          (long long)nowSec * 1000LL, DEVICE_ID,
                          motion.ax, motion.ay, motion.az, motion.gx, motion.gy, motion.gz,
                          vitals.heartRate, vitals.spo2);
    } else {
        // No NTP time yet: without ts the server uses the receive time
        length = snprintf(payload, sizeof(payload),
                          "{\"deviceId\":\"%s\","
                          "\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,"
                          "\"gyroX\":%.2f,\"gyroY\":%.2f,\"gyroZ\":%.2f,"
                          "\"heartRate\":%d,\"spo2\":%.1f}",
                          DEVICE_ID,
                          motion.ax, motion.ay, motion.az, motion.gx, motion.gy, motion.gz,
                          vitals.heartRate, vitals.spo2);
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
