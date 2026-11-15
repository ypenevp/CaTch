package com.legends.server.ai.event;

import com.legends.server.ai.dto.response.AiAnalysisResponse;

public record AiAnalysisSavedEvent(
        AiAnalysisResponse analysis
) {
}
