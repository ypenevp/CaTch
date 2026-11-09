#ifndef LOG_H
#define LOG_H

#include <Arduino.h>

// Serial logging shared by loop() (core 1) and the network task (core 0).
// Every line looks like:  [   12345 ms] [WIFI] Connected, IP 192.168.1.20
void logBegin(uint32_t baudRate);
void logPrintf(const char *tag, const char *format, ...);

#endif
