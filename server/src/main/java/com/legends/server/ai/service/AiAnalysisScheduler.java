package com.legends.server.ai.service;

import com.legends.server.ai.dto.response.AiAnalysisResponse;
import com.legends.server.ai.dto.response.FallDetectionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

@Component
public class AiAnalysisScheduler {

    private static final Logger log = LoggerFactory.getLogger(AiAnalysisScheduler.class);

    private final AiAnalysisService analysisService;
    private final FallDetectionClient fallDetectionClient;
    private boolean aiServerAvailable = true;

    public AiAnalysisScheduler(AiAnalysisService analysisService, FallDetectionClient fallDetectionClient) {
        this.analysisService = analysisService;
        this.fallDetectionClient = fallDetectionClient;
    }

    // the AI request runs between two short transactions, so no database connection is held while waiting for it
    @Scheduled(fixedDelayString = "${app.ai.analysis-interval-ms}")
    public void analyzeActiveDevices() {
        for (Long deviceId : analysisService.getActiveDeviceIds()) {
            try {
                Optional<AnalysisWindow> window = analysisService.prepareWindow(deviceId);
                if (window.isEmpty()) {
                    continue;
                }

                FallDetectionResponse response = fallDetectionClient.analyze(window.get().request());
                AiAnalysisResponse analysis = analysisService.save(window.get(), response);

                if (!aiServerAvailable) {
                    log.info("AI server is reachable again");
                    aiServerAvailable = true;
                }
                if (analysis.fallDetected()) {
                    log.warn("Fall detected for device {} with probability {}",
                            analysis.deviceId(), analysis.fallProbability());
                }
            } catch (RestClientException exception) {
                if (aiServerAvailable) {
                    log.warn("AI server request failed, analyses are paused: {}", exception.getMessage());
                    aiServerAvailable = false;
                }
                return;
            } catch (Exception exception) {
                log.error("Failed to analyze measurements of device {}", deviceId, exception);
            }
        }
    }
}
