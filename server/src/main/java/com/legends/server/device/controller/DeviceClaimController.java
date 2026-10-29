package com.legends.server.device.controller;

import com.legends.server.device.dto.request.ClaimDeviceRequest;
import com.legends.server.device.dto.response.DeviceClaimResponse;
import com.legends.server.device.service.claim.DeviceClaimService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/device-claims")
public class DeviceClaimController {

    private final DeviceClaimService claimService;

    public DeviceClaimController(DeviceClaimService claimService) {
        this.claimService = claimService;
    }

    @PostMapping("/claim")
    public ResponseEntity<DeviceClaimResponse> claim(@Valid @RequestBody ClaimDeviceRequest request) {
        DeviceClaimResponse response = claimService.claim(request);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
