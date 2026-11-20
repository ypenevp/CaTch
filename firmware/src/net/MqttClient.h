#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <Arduino.h>

void mqttBegin(const String &username, const String &password);
void mqttUpdate(uint32_t now);  // reconnect + keepalive; call on every loop()
bool mqttIsConnected();

// Publishes to devices/<DEVICE_ID>/measurements (JSON, ts in epoch ms).
// steps = steps since power-on, bootId = random id of this power-on; the
// backend adds only the difference to the previous message to the day's total.
bool mqttPublishMeasurement(float ax, float ay, float az, float gx, float gy, float gz,
                            uint32_t steps, uint32_t bootId);

#endif
