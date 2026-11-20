package com.legends.server.ai.service;

import com.legends.server.ai.repository.AiAnalysisRepository;
import com.legends.server.config.ai.AiProperties;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiAnalysisRetentionService {

    private final DeviceRepository deviceRepository;
    private final AiAnalysisRepository analysisRepository;
    private final AiProperties properties;

    public AiAnalysisRetentionService(
            DeviceRepository deviceRepository,
            AiAnalysisRepository analysisRepository,
            AiProperties properties
    ) {
        this.deviceRepository = deviceRepository;
        this.analysisRepository = analysisRepository;
        this.properties = properties;
    }

    // detected falls are kept, only analyses without a fall are trimmed
    @Scheduled(cron = "30 * * * * *")
    @Transactional
    public void deleteAnalysesOutsideRetentionWindow() {
        for (Device device : deviceRepository.findAllByStatus(DeviceStatus.ACTIVE)) {
            analysisRepository.deleteOlderThanRetention(
                    device.getId(),
                    properties.analysesRetentionCount()
            );
        }
    }
}
