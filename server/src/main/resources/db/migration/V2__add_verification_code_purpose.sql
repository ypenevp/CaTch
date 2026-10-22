ALTER TABLE verification_codes
    ADD COLUMN purpose VARCHAR(50);

UPDATE verification_codes
SET purpose = 'EMAIL_VERIFICATION'
WHERE purpose IS NULL;

ALTER TABLE verification_codes
    ALTER COLUMN purpose SET NOT NULL;

ALTER TABLE verification_codes
DROP CONSTRAINT IF EXISTS verification_codes_user_id_key;

ALTER TABLE verification_codes
    ADD CONSTRAINT uk_verification_codes_user_purpose
        UNIQUE (user_id, purpose);

ALTER TABLE verification_codes
    ADD CONSTRAINT chk_verification_codes_purpose
        CHECK (purpose IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET'));