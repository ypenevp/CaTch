package com.legends.server.ai.service;

import com.legends.server.ai.dto.request.FallDetectionRecord;
import com.legends.server.ai.dto.request.FallDetectionRequest;
import com.legends.server.ai.dto.response.AiAnalysisResponse;
import com.legends.server.ai.dto.response.FallAssessmentResponse;
import com.legends.server.ai.dto.response.FallDetectionResponse;
import com.legends.server.ai.entity.AiAnalysis;
import com.legends.server.ai.repository.AiAnalysisRepository;
import com.legends.server.config.ai.AiProperties;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;

@Service
public class AiAnalysisService {

    private final AiAnalysisRepository analysisRepository;
    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository measurementRepository;
    private final AiProperties properties;

    public AiAnalysisService(
            AiAnalysisRepository analysisRepository,
            DeviceRepository deviceRepository,
            DeviceMeasurementRepository measurementRepository,
            AiProperties properties
    ) {
        this.analysisRepository = analysisRepository;
        this.deviceRepository = deviceRepository;
        this.measurementRepository = measurementRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public List<Long> getActiveDeviceIds() {
        return deviceRepository.findAllByStatus(DeviceStatus.ACTIVE)
                .stream()
                .map(Device::getId)
                .toList();
    }

    // empty when the device has no full, continuous window with enough measurements that were not analyzed yet
    @Transactional(readOnly = true)
    public Optional<AnalysisWindow> prepareWindow(Long deviceId) {
        Device device = deviceRepository.findById(deviceId).orElse(null);
        if (device == null || device.getStatus() != DeviceStatus.ACTIVE) {
            return Optional.empty();
        }

        List<DeviceMeasurement> measurements = measurementRepository
                .findAllByDeviceOrderByMeasuredAtDesc(
                        device,
                        PageRequest.of(0, properties.windowSize(), Sort.by(Sort.Direction.DESC, "id"))
                )
                .getContent()
                .reversed();

        if (measurements.size() < properties.windowSize()
                || !measurements.stream().allMatch(this::hasMotionData)) {
            return Optional.empty();
        }

        DeviceMeasurement first = measurements.getFirst();
        DeviceMeasurement last = measurements.getLast();

        Duration windowDuration = Duration.between(first.getReceivedAt(), last.getReceivedAt());
        if (windowDuration.compareTo(Duration.ofSeconds(properties.maxWindowSeconds())) > 0) {
            return Optional.empty();
        }

        Optional<AiAnalysis> previous = analysisRepository.findTopByDeviceOrderByIdDesc(device);
        if (previous.isPresent()) {
            long lastAnalyzedId = previous.get().getLastMeasurementId();
            long newMeasurements = measurements.stream()
                    .filter(measurement -> measurement.getId() > lastAnalyzedId)
                    .count();
            if (newMeasurements < properties.minNewMeasurements()) {
                return Optional.empty();
            }
        }

        OptionalDouble averageHeartRate = measurements.stream()
                .map(DeviceMeasurement::getHeartRate)
                .filter(heartRate -> heartRate != null && heartRate > 0)
                .mapToInt(Integer::intValue)
                .average();
        Integer heartRate = averageHeartRate.isPresent()
                ? (int) Math.round(averageHeartRate.getAsDouble())
                : null;

        FallDetectionRequest request = new FallDetectionRequest(
                measurements.stream().map(FallDetectionRecord::from).toList(),
                heartRate == null ? null : heartRate.doubleValue()
        );

        return Optional.of(new AnalysisWindow(
                device.getId(),
                request,
                heartRate,
                first.getMeasuredAt(),
                last.getMeasuredAt(),
                last.getId()
        ));
    }

    @Transactional
    public AiAnalysisResponse save(AnalysisWindow window, FallDetectionResponse response) {
        Device device = deviceRepository.findById(window.deviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        FallAssessmentResponse assessment = response.fallAssessment();

        AiAnalysis analysis = new AiAnalysis();
        analysis.setDevice(device);
        analysis.setActivity(response.activity());
        analysis.setFallDetected(response.fallDetected());
        analysis.setFallProbability(response.fallProbability());
        analysis.setFallCause(assessment == null ? null : assessment.cause());
        analysis.setFallReason(assessment == null ? null : assessment.reason());
        analysis.setHeartRate(window.heartRate());
        analysis.setWindowStartAt(window.windowStartAt());
        analysis.setWindowEndAt(window.windowEndAt());
        analysis.setLastMeasurementId(window.lastMeasurementId());

        return AiAnalysisResponse.from(analysisRepository.save(analysis));
    }

    @Transactional(readOnly = true)
    public Page<AiAnalysisResponse> getAnalyses(String deviceId, Long userId, boolean fallsOnly, Pageable pageable) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        Page<AiAnalysis> analyses = fallsOnly
                ? analysisRepository.findAllByDeviceAndFallDetectedTrue(device, pageable)
                : analysisRepository.findAllByDevice(device, pageable);
        return analyses.map(AiAnalysisResponse::from);
    }

    @Transactional(readOnly = true)
    public AiAnalysisResponse getLatestAnalysis(String deviceId, Long userId) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        return analysisRepository.findTopByDeviceOrderByIdDesc(device)
                .map(AiAnalysisResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Analysis not found"));
    }

    private boolean hasMotionData(DeviceMeasurement measurement) {
        return measurement.getAccelX() != null
                && measurement.getAccelY() != null
                && measurement.getAccelZ() != null
                && measurement.getGyroX() != null
                && measurement.getGyroY() != null
                && measurement.getGyroZ() != null;
    }
}
