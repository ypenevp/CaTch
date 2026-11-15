package com.legends.server.ai.service;

import com.legends.server.ai.dto.request.FallDetectionRequest;
import com.legends.server.ai.dto.response.FallDetectionResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class FallDetectionClient {

    private final RestClient aiRestClient;

    public FallDetectionClient(RestClient aiRestClient) {
        this.aiRestClient = aiRestClient;
    }

    public FallDetectionResponse analyze(FallDetectionRequest request) {
        FallDetectionResponse response = aiRestClient.post()
                .uri("/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(FallDetectionResponse.class);

        if (response == null
                || response.activity() == null
                || response.fallDetected() == null
                || response.fallProbability() == null) {
            throw new RestClientException("AI server returned an incomplete analysis");
        }
        return response;
    }
}
