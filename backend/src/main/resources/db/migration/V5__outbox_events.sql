-- V5: transactional outbox for events that leave the application (exam result e-mails via Pub/Sub).
--
-- The event row is written in the same transaction as the change it describes, so a committed grade
-- always has its event and a rolled-back grade never does. OutboxRelay publishes pending rows later.

CREATE TABLE outbox_events (
    id           BIGSERIAL    PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    aggregate_id BIGINT       NOT NULL,
    payload      TEXT         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    attempts     INT          NOT NULL DEFAULT 0,
    last_error   VARCHAR(500),
    -- One event per type and aggregate: an attempt's result is announced once.
    CONSTRAINT uq_outbox_event UNIQUE (event_type, aggregate_id)
);

-- The relay only ever looks for unpublished rows.
CREATE INDEX idx_outbox_events_pending ON outbox_events (id) WHERE published_at IS NULL;
