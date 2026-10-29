package com.legends.server.device.controller;

import com.legends.server.device.dto.request.CreateDevicePairingRequest;
import com.legends.server.device.dto.response.DevicePairingResponse;
import com.legends.server.device.service.pairing.DevicePairingService;
import com.legends.server.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/device-pairings")
public class DevicePairingController {

    private final DevicePairingService pairingService;

    public DevicePairingController(DevicePairingService pairingService) {
        this.pairingService = pairingService;
    }

    @PostMapping
    public ResponseEntity<DevicePairingResponse> create(
            @Valid @RequestBody CreateDevicePairingRequest request,
            @CurrentUser Long userId
    ) {
        DevicePairingResponse response = pairingService.create(request, userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/{pairingId}")
    public ResponseEntity<DevicePairingResponse> get(
            @PathVariable UUID pairingId,
            @CurrentUser Long userId
    ) {
        DevicePairingResponse response = pairingService.get(pairingId, userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @DeleteMapping("/{pairingId}")
    public ResponseEntity<Void> cancel(
            @PathVariable UUID pairingId,
            @CurrentUser Long userId
    ) {
        pairingService.cancel(pairingId, userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
