package com.legends.server.exception.custom;

public class VerificationResendTooSoonException extends RuntimeException {
    public VerificationResendTooSoonException(String message) {
        super(message);
    }
}
