package com.legends.server.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest (
        @NotBlank
        String username,

        @NotBlank
        String password
){}
