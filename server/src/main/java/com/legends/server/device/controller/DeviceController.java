package com.legends.server.device.controller;

import com.legends.server.device.dto.request.DeviceActivationRequest;
import com.legends.server.device.dto.request.DeviceRegisterRequest;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.service.DeviceService;
import com.legends.server.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/device")
public class DeviceController {
    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }
    @PostMapping("/register")
    public ResponseEntity<DeviceResponse> register(@Valid @RequestBody DeviceRegisterRequest request, @CurrentUser Long currentUserId) {
        DeviceResponse response = deviceService.registerDevice(request, currentUserId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(response.id()).toUri();
        return ResponseEntity.status(HttpStatus.CREATED).location(location).body(response);
    }

    @PostMapping("/activate")
    public ResponseEntity<Void> activate(@Valid @RequestBody DeviceActivationRequest request) {
        deviceService.activateDevice(request.deviceCodeId());
        return ResponseEntity.status(HttpStatus.OK).build();
    }

    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceResponse> getDevice(@PathVariable String deviceId, @CurrentUser Long currentUserId) {
        DeviceResponse response = deviceService.getDevice(deviceId, currentUserId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<Page<DeviceResponse>> getMyDevices(@CurrentUser Long currentUserId, @PageableDefault(size = 5, sort = "activatedOn", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<DeviceResponse> response = deviceService.getMyDevices(currentUserId, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }


}
