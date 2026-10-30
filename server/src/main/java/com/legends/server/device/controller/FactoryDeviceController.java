package com.legends.server.device.controller;

import com.legends.server.device.dto.request.RegisterFactoryDeviceRequest;
import com.legends.server.device.dto.response.FactoryDeviceResponse;
import com.legends.server.device.service.factory.FactoryDeviceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/factory/devices")
@PreAuthorize("hasRole('FACTORY')")
public class FactoryDeviceController {

    private final FactoryDeviceService factoryDeviceService;

    public FactoryDeviceController(FactoryDeviceService factoryDeviceService) {
        this.factoryDeviceService = factoryDeviceService;
    }

    @PostMapping
    public ResponseEntity<FactoryDeviceResponse> register(@Valid @RequestBody RegisterFactoryDeviceRequest request) {
        FactoryDeviceResponse response = factoryDeviceService.register(request);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
