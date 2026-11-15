package com.legends.server.device.service.statistics;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class DeviceStatisticsRetentionService {

    private final DeviceStatisticsService statisticsService;

    public DeviceStatisticsRetentionService(DeviceStatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @Scheduled(cron = "0 * * * * *")
    public void deleteStatisticsOutsideRetentionWindow() {
        statisticsService.deleteOlderThanRetention();
    }
}
