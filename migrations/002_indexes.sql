-- +goose Up
ALTER TABLE bookings
    ADD CONSTRAINT bookings_no_overlap_active
        EXCLUDE USING gist (
        tstzrange(start_at, end_at, '[)') WITH &&
        )
        WHERE (status = 'active');

CREATE INDEX IF NOT EXISTS bookings_start_at_idx
    ON bookings (start_at);

CREATE INDEX IF NOT EXISTS bookings_status_start_at_idx
    ON bookings (status, start_at);

-- +goose Down
DROP INDEX IF EXISTS bookings_status_start_at_idx;
DROP INDEX IF EXISTS bookings_start_at_idx;

ALTER TABLE bookings
    DROP CONSTRAINT IF EXISTS bookings_no_overlap_active;
