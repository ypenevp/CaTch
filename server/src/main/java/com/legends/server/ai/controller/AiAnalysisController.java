package com.legends.server.ai.controller;

import com.legends.server.ai.dto.response.AiAnalysisResponse;
import com.legends.server.ai.service.AiAnalysisService;
import com.legends.server.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/devices/{deviceId}/analyses")
public class AiAnalysisController {

    private final AiAnalysisService analysisService;

    public AiAnalysisController(AiAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping
    public ResponseEntity<Page<AiAnalysisResponse>> getAnalyses(@PathVariable String deviceId, @RequestParam(defaultValue = "false") boolean fallsOnly, @CurrentUser Long userId, @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AiAnalysisResponse> response = analysisService.getAnalyses(deviceId, userId, fallsOnly, pageable);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @GetMapping("/latest")
    public ResponseEntity<AiAnalysisResponse> getLatestAnalysis(@PathVariable String deviceId, @CurrentUser Long userId) {
        AiAnalysisResponse response = analysisService.getLatestAnalysis(deviceId, userId);
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }
}
