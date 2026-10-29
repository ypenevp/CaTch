package com.legends.server.device.controller;

import com.legends.server.device.dto.response.DeviceMeasurementResponse;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.service.DeviceService;
import com.legends.server.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping("/my")
    public ResponseEntity<Page<DeviceResponse>> getMyDevices(
            @CurrentUser Long userId,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        Page<DeviceResponse> response = deviceService.getMyDevices(userId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceResponse> getDevice(
            @PathVariable String deviceId,
            @CurrentUser Long userId
    ) {
        DeviceResponse response = deviceService.getDevice(deviceId, userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/{deviceId}/measurements/latest")
    public ResponseEntity<DeviceMeasurementResponse> getLatestMeasurement(
            @PathVariable String deviceId,
            @CurrentUser Long userId
    ) {
        DeviceMeasurementResponse response =
                deviceService.getLatestMeasurement(deviceId, userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/{deviceId}/measurements")
    public ResponseEntity<Page<DeviceMeasurementResponse>> getMeasurements(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "120") int limit,
            @CurrentUser Long userId
    ) {
        Page<DeviceMeasurementResponse> response =
                deviceService.getMeasurements(deviceId, userId, limit);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
