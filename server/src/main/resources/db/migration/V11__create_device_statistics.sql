CREATE TABLE device_statistics (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    bucket_start TIMESTAMP WITH TIME ZONE NOT NULL,
    heart_rate_min INTEGER,
    heart_rate_max INTEGER,
    heart_rate_sum BIGINT,
    heart_rate_sample_count INTEGER NOT NULL DEFAULT 0,
    spo2_min DOUBLE PRECISION,
    spo2_max DOUBLE PRECISION,
    spo2_sum DOUBLE PRECISION,
    spo2_sample_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_device_statistics_device
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT uq_device_statistics_device_bucket
        UNIQUE (device_id, bucket_start),
    CONSTRAINT chk_device_statistics_heart_rate_count
        CHECK (heart_rate_sample_count >= 0),
    CONSTRAINT chk_device_statistics_spo2_count
        CHECK (spo2_sample_count >= 0)
);

CREATE INDEX idx_device_statistics_device_bucket
    ON device_statistics (device_id, bucket_start);
