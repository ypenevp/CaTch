package com.legends.server.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ResendVerificationCodeRequest(
        @NotBlank
        @Email
        @Size(max = 320)
        String email
) {
}
