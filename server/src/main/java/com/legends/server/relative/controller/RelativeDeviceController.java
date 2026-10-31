package com.legends.server.relative.controller;

import com.legends.server.device.dto.response.DeviceMeasurementResponse;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.dto.response.OwnedDeviceResponse;
import com.legends.server.relative.service.RelativeDeviceService;
import com.legends.server.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/relatives")
@PreAuthorize("hasRole('RELATIVE')")
public class RelativeDeviceController {

    private final RelativeDeviceService relativeDeviceService;

    public RelativeDeviceController(RelativeDeviceService relativeDeviceService) {
        this.relativeDeviceService = relativeDeviceService;
    }

    @GetMapping("/devices")
    public ResponseEntity<Page<OwnedDeviceResponse>> getAllDevices(@CurrentUser Long relativeId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<OwnedDeviceResponse> response = relativeDeviceService.getAllDevices(relativeId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/users/{userId}/devices")
    public ResponseEntity<Page<DeviceResponse>> getUserDevices(@PathVariable Long userId, @CurrentUser Long relativeId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<DeviceResponse> response = relativeDeviceService.getUserDevices(userId, relativeId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/users/{userId}/devices/{deviceId}")
    public ResponseEntity<DeviceResponse> getUserDevice(@PathVariable Long userId, @PathVariable String deviceId, @CurrentUser Long relativeId) {
        DeviceResponse response = relativeDeviceService.getUserDevice(userId, deviceId, relativeId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/users/{userId}/devices/{deviceId}/measurements/latest")
    public ResponseEntity<DeviceMeasurementResponse> getLatestMeasurement(@PathVariable Long userId, @PathVariable String deviceId, @CurrentUser Long relativeId) {
        DeviceMeasurementResponse response = relativeDeviceService.getLatestMeasurement(userId, deviceId, relativeId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/users/{userId}/devices/{deviceId}/measurements")
    public ResponseEntity<Page<DeviceMeasurementResponse>> getMeasurements(@PathVariable Long userId, @PathVariable String deviceId, @RequestParam(defaultValue = "120") int limit, @CurrentUser Long relativeId) {
        Page<DeviceMeasurementResponse> response = relativeDeviceService.getMeasurements(userId, deviceId, relativeId, limit);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
