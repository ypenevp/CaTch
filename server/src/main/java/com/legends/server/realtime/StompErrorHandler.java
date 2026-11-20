package com.legends.server.realtime;

import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

// sends "Authentication required" in the ERROR frame, so the client knows to refresh its token
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    @Override
    public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> clientMessage, Throwable ex) {
        if (isAuthenticationError(ex)) {
            StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.ERROR);
            accessor.setMessage(StompAuthenticationException.MESSAGE);
            accessor.setLeaveMutable(true);
            return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        }
        return super.handleClientMessageProcessingError(clientMessage, ex);
    }

    private boolean isAuthenticationError(Throwable ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause() == cause ? null : cause.getCause()) {
            if (cause instanceof StompAuthenticationException) {
                return true;
            }
        }
        return false;
    }
}
