#include "core/Log.h"

#include <stdarg.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

#define LOG_LINE_SIZE 256

static SemaphoreHandle_t logMutex = NULL;

void logBegin(uint32_t baudRate) {
    Serial.begin(baudRate);
    if (logMutex == NULL) {
        logMutex = xSemaphoreCreateMutex();
    }
}

void logPrintf(const char *tag, const char *format, ...) {
    char message[LOG_LINE_SIZE];

    va_list args;
    va_start(args, format);
    vsnprintf(message, sizeof(message), format, args);
    va_end(args);

    // The mutex keeps lines from both cores from mixing together
    if (logMutex != NULL) {
        xSemaphoreTake(logMutex, portMAX_DELAY);
    }
    Serial.printf("[%8lu ms] [%s] %s\n", (unsigned long)millis(), tag, message);
    if (logMutex != NULL) {
        xSemaphoreGive(logMutex);
    }
}
