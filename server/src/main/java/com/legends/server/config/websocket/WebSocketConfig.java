package com.legends.server.config.websocket;

import com.legends.server.realtime.DeviceTopics;
import com.legends.server.realtime.StompAuthInterceptor;
import com.legends.server.realtime.StompErrorHandler;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final long HEARTBEAT_MS = 10_000;

    private final StompAuthInterceptor stompAuthInterceptor;
    private final TaskScheduler messageBrokerTaskScheduler;

    public WebSocketConfig(
            StompAuthInterceptor stompAuthInterceptor,
            @Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler messageBrokerTaskScheduler
    ) {
        this.stompAuthInterceptor = stompAuthInterceptor;
        this.messageBrokerTaskScheduler = messageBrokerTaskScheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(DeviceTopics.ENDPOINT).setAllowedOriginPatterns("*");
        registry.setErrorHandler(new StompErrorHandler());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker(DeviceTopics.BROKER_PREFIX)
                .setHeartbeatValue(new long[]{HEARTBEAT_MS, HEARTBEAT_MS})
                .setTaskScheduler(messageBrokerTaskScheduler);
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthInterceptor);
    }
}
