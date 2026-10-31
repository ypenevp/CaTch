#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <Arduino.h>

void mqttBegin(const String &username, const String &password);
void mqttUpdate(uint32_t now);  // reconnect + keepalive; call on every loop()
bool mqttIsConnected();

// Publishes to devices/<DEVICE_ID>/measurements (JSON, ts in epoch ms).
bool mqttPublishMeasurement(float ax, float ay, float az, float gx, float gy, float gz);

#endif
