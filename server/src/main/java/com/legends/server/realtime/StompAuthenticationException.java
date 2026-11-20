package com.legends.server.realtime;

public class StompAuthenticationException extends RuntimeException {

    public static final String MESSAGE = "Authentication required";

    public StompAuthenticationException() {
        super(MESSAGE);
    }
}
