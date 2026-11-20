package com.legends.server.device.service.statistics;

import com.legends.server.config.device.DeviceProperties;
import com.legends.server.device.dto.response.DeviceStatisticsResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import com.legends.server.device.entity.DeviceStatistics;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.device.repository.DeviceStatisticsRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class DeviceStatisticsService {

    private static final int MIN_HEART_RATE = 20;
    private static final int MAX_HEART_RATE = 250;
    private static final double MIN_SPO2 = 0.0;
    private static final double MAX_SPO2 = 100.0;

    private final DeviceRepository deviceRepository;
    private final DeviceStatisticsRepository statisticsRepository;
    private final DeviceProperties properties;

    public DeviceStatisticsService(
            DeviceRepository deviceRepository,
            DeviceStatisticsRepository statisticsRepository,
            DeviceProperties properties
    ) {
        this.deviceRepository = deviceRepository;
        this.statisticsRepository = statisticsRepository;
        this.properties = properties;
    }

    @Transactional
    public void updateFromMeasurement(Device device, DeviceMeasurement measurement) {
        Instant bucketStart = calculateBucketStart(measurement.getMeasuredAt());
        DeviceStatistics statistics = statisticsRepository
                .findByDeviceAndBucketStart(device, bucketStart)
                .orElseGet(() -> newStatistics(device, bucketStart));

        if (isValidHeartRate(measurement.getHeartRate())) {
            updateHeartRate(statistics, measurement.getHeartRate());
        }
        if (isValidSpo2(measurement.getSpo2())) {
            updateSpo2(statistics, measurement.getSpo2());
        }

        statisticsRepository.save(statistics);
    }

    @Transactional(readOnly = true)
    public DeviceStatisticsResponse getStatistics(String deviceId, Long userId, Integer requestedMinutes) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        if (device.getStatus() != DeviceStatus.ACTIVE) {
            throw new ResourceNotFoundException("Device not found");
        }

        int minutes = requestedMinutes == null
                ? properties.statisticsDefaultWindowMinutes()
                : requestedMinutes;
        if (minutes < 1 || minutes > properties.statisticsMaxWindowMinutes()) {
            throw new IllegalArgumentException("Statistics window is outside the allowed range");
        }

        Instant to = Instant.now();
        Instant from = to.minus(minutes, ChronoUnit.MINUTES);
        List<DeviceStatistics> statistics = statisticsRepository
                .findAllByDeviceAndBucketStartBetweenOrderByBucketStartAsc(device, from, to);

        return new DeviceStatisticsResponse(
                deviceId,
                from,
                to,
                properties.statisticsBucketSeconds(),
                summaryHeartRate(statistics),
                summarySpo2(statistics),
                statistics.stream().map(this::toPoint).toList()
        );
    }

    @Transactional
    public void deleteOlderThanRetention() {
        Instant cutoff = Instant.now()
                .minus(properties.statisticsRetentionMinutes(), ChronoUnit.MINUTES);
        statisticsRepository.deleteOlderThan(cutoff);
    }

    private DeviceStatistics newStatistics(Device device, Instant bucketStart) {
        DeviceStatistics statistics = new DeviceStatistics();
        statistics.setDevice(device);
        statistics.setBucketStart(bucketStart);
        return statistics;
    }

    private void updateHeartRate(DeviceStatistics statistics, Integer heartRate) {
        statistics.setHeartRateMin(statistics.getHeartRateMin() == null
                ? heartRate
                : Math.min(statistics.getHeartRateMin(), heartRate));
        statistics.setHeartRateMax(statistics.getHeartRateMax() == null
                ? heartRate
                : Math.max(statistics.getHeartRateMax(), heartRate));
        statistics.setHeartRateSum((statistics.getHeartRateSum() == null
                ? 0L
                : statistics.getHeartRateSum()) + heartRate);
        statistics.setHeartRateSampleCount(statistics.getHeartRateSampleCount() + 1);
    }

    private void updateSpo2(DeviceStatistics statistics, Double spo2) {
        statistics.setSpo2Min(statistics.getSpo2Min() == null
                ? spo2
                : Math.min(statistics.getSpo2Min(), spo2));
        statistics.setSpo2Max(statistics.getSpo2Max() == null
                ? spo2
                : Math.max(statistics.getSpo2Max(), spo2));
        statistics.setSpo2Sum((statistics.getSpo2Sum() == null
                ? 0.0
                : statistics.getSpo2Sum()) + spo2);
        statistics.setSpo2SampleCount(statistics.getSpo2SampleCount() + 1);
    }

    private Instant calculateBucketStart(Instant measuredAt) {
        long epochSeconds = measuredAt.getEpochSecond();
        long bucketSeconds = properties.statisticsBucketSeconds();
        return Instant.ofEpochSecond(
                Math.floorDiv(epochSeconds, bucketSeconds) * bucketSeconds
        );
    }

    private DeviceStatisticsResponse.Point toPoint(DeviceStatistics statistics) {
        Instant end = statistics.getBucketStart()
                .plus(properties.statisticsBucketSeconds(), ChronoUnit.SECONDS);
        return new DeviceStatisticsResponse.Point(
                statistics.getBucketStart(),
                end,
                average(statistics.getHeartRateSum(), statistics.getHeartRateSampleCount()),
                average(statistics.getSpo2Sum(), statistics.getSpo2SampleCount()),
                statistics.getHeartRateSampleCount(),
                statistics.getSpo2SampleCount()
        );
    }

    private DeviceStatisticsResponse.Summary summaryHeartRate(List<DeviceStatistics> statistics) {
        Integer min = statistics.stream()
                .map(DeviceStatistics::getHeartRateMin)
                .filter(value -> value != null)
                .min(Integer::compareTo)
                .orElse(null);
        Integer max = statistics.stream()
                .map(DeviceStatistics::getHeartRateMax)
                .filter(value -> value != null)
                .max(Integer::compareTo)
                .orElse(null);
        long sum = statistics.stream()
                .map(DeviceStatistics::getHeartRateSum)
                .filter(value -> value != null)
                .mapToLong(Long::longValue)
                .sum();
        int count = statistics.stream()
                .mapToInt(DeviceStatistics::getHeartRateSampleCount)
                .sum();
        return new DeviceStatisticsResponse.Summary(
                min == null ? null : min.doubleValue(),
                average(sum, count),
                max == null ? null : max.doubleValue(),
                count
        );
    }

    private DeviceStatisticsResponse.Summary summarySpo2(List<DeviceStatistics> statistics) {
        Double min = statistics.stream()
                .map(DeviceStatistics::getSpo2Min)
                .filter(value -> value != null)
                .min(Double::compareTo)
                .orElse(null);
        Double max = statistics.stream()
                .map(DeviceStatistics::getSpo2Max)
                .filter(value -> value != null)
                .max(Double::compareTo)
                .orElse(null);
        double sum = statistics.stream()
                .map(DeviceStatistics::getSpo2Sum)
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();
        int count = statistics.stream()
                .mapToInt(DeviceStatistics::getSpo2SampleCount)
                .sum();
        return new DeviceStatisticsResponse.Summary(min, average(sum, count), max, count);
    }

    private Double average(Number sum, int count) {
        return count == 0 ? null : sum.doubleValue() / count;
    }

    private boolean isValidHeartRate(Integer heartRate) {
        return heartRate != null
                && heartRate >= MIN_HEART_RATE
                && heartRate <= MAX_HEART_RATE;
    }

    private boolean isValidSpo2(Double spo2) {
        return spo2 != null
                && !spo2.isNaN()
                && !spo2.isInfinite()
                && spo2 >= MIN_SPO2
                && spo2 <= MAX_SPO2;
    }
}
