/**
 * Sends exam answers to the server one at a time and keeps every answer that has not been confirmed yet.
 *
 * A failed request is never dropped: the answer stays queued, the state becomes "error" and the save is
 * retried with growing pauses until it succeeds. The exam screen shows the state, so "saved" on screen always
 * means the server has the answer.
 *
 * Plain TypeScript without React, so the rules can be tested on their own.
 */

/** saved = nothing waiting; saving = waiting to be sent or on its way; error = last try failed, retry scheduled. */
export type SaveState = 'saved' | 'saving' | 'error';

export interface AnswerSaverOptions {
  /** Stores one answer on the server. Rejects when the answer was not stored. */
  send: (questionId: number, answerText: string) => Promise<void>;
  /**
   * Asked after a failed send. Resolve true when the attempt no longer accepts answers (time ran out, closed by
   * the server), so retrying is pointless; false for anything that may pass on a retry (offline, rate limit, 5xx).
   */
  isAttemptClosed: (error: unknown) => Promise<boolean>;
  /** Called on every change with the state and the ids of the questions whose answer is not stored yet. */
  onChange: (state: SaveState, unsavedQuestionIds: number[]) => void;
  /** Called once when the attempt turns out to be closed; lostAnswers = answers that could not be stored. */
  onAttemptClosed: (lostAnswers: number) => void;
  /** Pauses before retry 1, 2, 3, ...; the last value repeats. */
  retryDelaysMs?: number[];
}

export interface AnswerSaver {
  /**
   * Remembers the answer. With delayMs it is sent once no newer answer for it arrived for that long (typed
   * answers); without, it is sent right away.
   */
  queue: (questionId: number, answerText: string, delayMs?: number) => void;
  /** Sends everything that is waiting right now, delayed answers included. Resolves true when nothing is left unsaved. */
  flush: () => Promise<boolean>;
  unsavedCount: () => number;
  /** Cancels timers and ignores further calls (exam submitted, page left). */
  stop: () => void;
}

interface PendingAnswer {
  text: string;
  /** Not sent before this time (ms since epoch), so typing does not produce one request per keystroke. */
  dueAt: number;
}

const DEFAULT_RETRY_DELAYS_MS = [2000, 4000, 8000, 15000];

export function createAnswerSaver(options: AnswerSaverOptions): AnswerSaver {
  const retryDelays = options.retryDelaysMs?.length ? options.retryDelaysMs : DEFAULT_RETRY_DELAYS_MS;

  /** Latest unsaved answer per question. A newer answer replaces an older one that was never sent. */
  const pending = new Map<number, PendingAnswer>();
  let running: Promise<boolean> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let failedTries = 0;
  let stopped = false;

  const emit = (state: SaveState) => options.onChange(state, Array.from(pending.keys()));

  const clearDebounceTimer = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const stop = () => {
    stopped = true;
    clearDebounceTimer();
    clearRetryTimer();
  };

  const nextDue = (): [number, PendingAnswer] | null => {
    const now = Date.now();
    for (const entry of pending) {
      if (entry[1].dueAt <= now) return entry;
    }
    return null;
  };

  const scheduleRetry = () => {
    const delay = retryDelays[Math.min(failedTries, retryDelays.length - 1)];
    failedTries += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void run();
    }, delay);
  };

  const sendDue = async (): Promise<boolean> => {
    emit('saving');
    while (!stopped) {
      const due = nextDue();
      if (!due) break;
      const [questionId, answer] = due;
      try {
        await options.send(questionId, answer.text);
      } catch (error) {
        if (stopped) return false;
        let closed = false;
        try {
          closed = await options.isAttemptClosed(error);
        } catch {
          closed = false;
        }
        if (stopped) return false;
        if (closed) {
          const lostAnswers = pending.size;
          stop();
          pending.clear();
          options.onAttemptClosed(lostAnswers);
          return false;
        }
        emit('error');
        scheduleRetry();
        return false;
      }
      // Keep the entry when the answer changed again while this request was on its way.
      if (pending.get(questionId)?.text === answer.text) pending.delete(questionId);
      failedTries = 0;
      if (!stopped) emit(pending.size > 0 ? 'saving' : 'saved');
    }
    return pending.size === 0;
  };

  /** Sends the answers that are due. One sender at a time: a running loop also picks up answers queued meanwhile. */
  function run(): Promise<boolean> {
    if (stopped) return Promise.resolve(pending.size === 0);
    if (running) return running;
    clearRetryTimer();
    if (!nextDue()) return Promise.resolve(pending.size === 0);

    const current = sendDue();
    running = current;
    const release = () => {
      if (running === current) running = null;
    };
    void current.then(release, release);
    return current;
  }

  const flush = (): Promise<boolean> => {
    if (stopped) return Promise.resolve(pending.size === 0);
    clearDebounceTimer();
    for (const answer of pending.values()) answer.dueAt = 0;
    return run();
  };

  const queue = (questionId: number, answerText: string, delayMs = 0) => {
    if (stopped) return;
    pending.set(questionId, { text: answerText, dueAt: delayMs > 0 ? Date.now() + delayMs : 0 });
    if (delayMs > 0) {
      // Still typing: restart the wait, and do not hide an error that is already showing.
      clearDebounceTimer();
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void run();
      }, delayMs);
      emit(retryTimer === null ? 'saving' : 'error');
      return;
    }
    void run();
  };

  return { queue, flush, unsavedCount: () => pending.size, stop };
}
