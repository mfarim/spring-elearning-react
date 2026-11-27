package com.elearning.common.outbox;

import lombok.extern.slf4j.Slf4j;

/**
 * Local development: logs the event instead of sending it. The payload is not logged because it
 * contains the student's e-mail address.
 */
@Slf4j
public class LoggingEventPublisher implements EventPublisher {

    @Override
    public void publish(OutboxEvent event) {
        log.info("Outbox event {} ({} bytes) would be published", event.eventId(), event.getPayload().length());
    }
}
