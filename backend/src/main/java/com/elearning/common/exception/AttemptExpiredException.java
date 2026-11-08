package com.elearning.common.exception;

/**
 * Thrown after an attempt whose time ran out has been finalized. Transactions declare
 * {@code noRollbackFor} this exception so the finalized result is committed even though the
 * client request (save answer, resume) is rejected. Mapped to 409 like other business-rule errors.
 */
public class AttemptExpiredException extends IllegalStateException {

    public AttemptExpiredException(String message) {
        super(message);
    }
}
