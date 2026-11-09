#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <Arduino.h>
#include "sensors/Motion.h"
#include "sensors/Vitals.h"

// All functions are called only from the network task.

void mqttBegin(const String &username, const String &password);
void mqttUpdate(uint32_t now);   // reconnect + keepalive
bool mqttIsConnected();

// Publishes to devices/<DEVICE_ID>/measurements (JSON, ts in epoch ms)
bool mqttPublishMeasurement(const MotionSample &motion, const VitalsSample &vitals);

#endif
