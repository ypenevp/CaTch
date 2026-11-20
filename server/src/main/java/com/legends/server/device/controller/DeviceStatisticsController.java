package com.legends.server.device.controller;

import com.legends.server.device.dto.response.DeviceStatisticsResponse;
import com.legends.server.device.service.statistics.DeviceStatisticsService;
import com.legends.server.security.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/statistics")
public class DeviceStatisticsController {

    private final DeviceStatisticsService statisticsService;

    public DeviceStatisticsController(DeviceStatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @GetMapping
    public ResponseEntity<DeviceStatisticsResponse> getStatistics(
            @PathVariable String deviceId,
            @RequestParam(required = false) Integer minutes,
            @CurrentUser Long userId
    ) {
        return ResponseEntity.ok(statisticsService.getStatistics(deviceId, userId, minutes));
    }
}
