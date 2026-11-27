package com.elearning.common.outbox;

/** Sends an outbox event to a message broker. Throwing means "try again later". */
public interface EventPublisher {

    void publish(OutboxEvent event) throws Exception;
}
