package com.legends.server.exception.custom;

public class InvalidMediaTypeException extends RuntimeException {
    public InvalidMediaTypeException(String message) {
        super(message);
    }
}
