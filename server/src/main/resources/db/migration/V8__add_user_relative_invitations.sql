ALTER TABLE user_relatives
    ADD COLUMN status VARCHAR(32),
    ADD COLUMN accepted_at TIMESTAMP(6) WITH TIME ZONE;

-- links created before invitations existed were never agreed to by the relative,
-- so they are kept as pending invitations instead of granting access
UPDATE user_relatives
SET status = 'PENDING';

ALTER TABLE user_relatives
    ALTER COLUMN status SET NOT NULL,
    ADD CONSTRAINT chk_user_relatives_status
        CHECK (status IN ('PENDING', 'ACCEPTED'));

-- the RELATIVE role is now granted by accepting an invitation, not at registration
UPDATE users
SET role = 'USER'
WHERE role = 'RELATIVE';
