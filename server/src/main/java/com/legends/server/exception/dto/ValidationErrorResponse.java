package com.legends.server.exception.dto;

import java.time.Instant;
import java.util.Map;

public record ValidationErrorResponse(

        int status,
        String error,
        String message,
        Map<String, String> fieldErrors,
        Instant timestamp,
        String path
) {}
