-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS bookings
(
    id            uuid PRIMARY KEY     DEFAULT gen_random_uuid(),

    start_at      timestamptz NOT NULL,
    end_at        timestamptz NOT NULL,

    client_name   text        NOT NULL,
    client_phone  text        NOT NULL,
    comment       text        NULL,

    status        text        NOT NULL DEFAULT 'active',

    created_at    timestamptz NOT NULL DEFAULT now(),
    cancelled_at  timestamptz NULL,
    cancel_reason text        NULL,

    CONSTRAINT bookings_time_valid CHECK (end_at > start_at),
    CONSTRAINT bookings_status_valid CHECK (status IN ('active', 'cancelled')),
    CONSTRAINT bookings_phone_valid CHECK (client_phone ~ '^\+7\d{10}$'),

    CONSTRAINT bookings_cancel_consistency CHECK (
        (status = 'active' AND cancelled_at IS NULL)
            OR
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        )
);

-- +goose Down
DROP TABLE IF EXISTS bookings;