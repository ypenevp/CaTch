package com.legends.server.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

 public record RegisterRequest (
    @NotBlank
    @Size(min = 2, max = 30)
    String username,

    @NotBlank
    @Email
    String email,

    @NotBlank
    @Size(min = 8, max = 20)
    String password
 ){}

