package com.legends.server.device.dto.response;

import java.time.Instant;
import java.util.List;

public record DeviceStatisticsResponse(
        String deviceId,
        Instant from,
        Instant to,
        int bucketSeconds,
        Summary heartRate,
        Summary spo2,
        List<Point> points
) {
    public record Summary(
            Double min,
            Double average,
            Double max,
            int samples
    ) {
    }

    public record Point(
            Instant start,
            Instant end,
            Double heartRateAverage,
            Double spo2Average,
            int heartRateSamples,
            int spo2Samples
    ) {
    }
}
