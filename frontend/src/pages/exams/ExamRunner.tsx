import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import type { ExamStartResponse, ApiResponse, AttemptStatus, Exam } from '../../types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize2,
  Check,
  Award,
  CloudOff,
  Hourglass,
  RefreshCw,
} from 'lucide-react';
// tNow reads the current language when called: used in listeners and timers that keep an old render's closure.
import { useI18n, t as tNow } from '../../i18n';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { createAnswerSaver, type AnswerSaver, type SaveState } from './answerSaver';

/** A typed answer (essay, short answer) is sent after this pause in typing, not on every keystroke. */
const ESSAY_SAVE_DELAY_MS = 1000;
/** The server closes the attempt at this number of violations. */
const MAX_VIOLATIONS = 5;
/** Pause between tries when the final submit cannot reach the server. */
const SUBMIT_RETRY_MS = 3000;
/** A save or submit that gets no answer for this long counts as failed, so it can be retried. */
const REQUEST_TIMEOUT_MS = 15000;
/** When time is up, answers still waiting get this long before the attempt is submitted anyway. */
const FINAL_FLUSH_WAIT_MS = 5000;

interface SubmitResult {
  attemptId: number;
  status: AttemptStatus;
  /** Left out when the exam does not show results to students. */
  score?: number;
  passed?: boolean;
  resultHidden?: boolean;
}

/** Why the attempt ended: the student submitted, time ran out, too many violations, or the server closed it. */
type FinishReason = 'manual' | 'timeout' | 'violations' | 'closed';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const ExamRunner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [session, setSession] = useState<ExamStartResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save state: "saved" on screen always means the server has the answer.
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [unsavedIds, setUnsavedIds] = useState<number[]>([]);

  // Submit / Finish states
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoFinishing, setAutoFinishing] = useState<FinishReason | null>(null);
  const [submittedResult, setSubmittedResult] = useState<SubmitResult | null>(null);
  const [finishReason, setFinishReason] = useState<FinishReason>('manual');
  const [lostAnswers, setLostAnswers] = useState(0);

  // Refs: read by timers and listeners, which must not act on an old render's state.
  const attemptIdRef = useRef<number | null>(null);
  const saverRef = useRef<AnswerSaver | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      saverRef.current?.stop();
    };
  }, []);

  /** Asks the server to close the attempt and shows the result. Resolves false when the request failed. */
  const finishAttempt = useCallback(async (reason: FinishReason): Promise<boolean> => {
    const attemptId = attemptIdRef.current;
    if (!attemptId || finishedRef.current || submittingRef.current) return false;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post<ApiResponse<SubmitResult>>(`/exams/attempts/${attemptId}/submit`, null, {
        timeout: REQUEST_TIMEOUT_MS,
      });
      finishedRef.current = true;
      saverRef.current?.stop();
      if (!mountedRef.current) return true;
      setFinishReason(reason);
      setSubmittedResult(res.data.data);
      setSubmitConfirmOpen(false);
      setAutoFinishing(null);
      return true;
    } catch (err: any) {
      if (mountedRef.current) setSubmitError(err.response?.data?.message || tNow('examRunner.submitFailed'));
      return false;
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, []);

  /** The attempt is over (time, violations, closed by the server): keep asking until the result arrives. */
  const autoFinish = useCallback(
    async (reason: FinishReason) => {
      if (finishedRef.current) return;
      setAutoFinishing(reason);
      setSubmitConfirmOpen(false);
      while (mountedRef.current && !finishedRef.current) {
        const done = await finishAttempt(reason);
        if (done) return;
        await wait(SUBMIT_RETRY_MS);
      }
    },
    [finishAttempt]
  );

  useEffect(() => {
    let cancelled = false;

    const startExam = async () => {
      try {
        setLoading(true);
        const res = await api.post<ApiResponse<ExamStartResponse>>(`/exams/${id}/start`);
        if (cancelled) return;
        const data = res.data.data;
        attemptIdRef.current = data.attemptId;
        deadlineRef.current = Date.now() + data.remainingSeconds * 1000;
        finishedRef.current = false;

        saverRef.current?.stop();
        saverRef.current = createAnswerSaver({
          send: async (questionId, answerText) => {
            await api.post(
              `/exams/attempts/${data.attemptId}/answer`,
              { questionId, answerText },
              { timeout: REQUEST_TIMEOUT_MS }
            );
          },
          // 409 means "attempt closed" or a short-lived conflict; ask the server which one before giving up.
          isAttemptClosed: async (sendError) => {
            if ((sendError as { response?: { status?: number } })?.response?.status !== 409) return false;
            const examRes = await api.get<ApiResponse<Exam>>(`/exams/${id}`, { timeout: REQUEST_TIMEOUT_MS });
            const status = examRes.data.data.studentAttemptStatus;
            return !!status && status !== 'in_progress';
          },
          onChange: (state, unsavedQuestionIds) => {
            if (!mountedRef.current) return;
            setSaveState(state);
            setUnsavedIds(unsavedQuestionIds);
          },
          onAttemptClosed: (lost) => {
            if (mountedRef.current) setLostAnswers(lost);
            void autoFinish('closed');
          },
        });

        setSession(data);
        setSecondsLeft(data.remainingSeconds);

        // Prepopulate existing answers
        const initialAnswers: Record<number, string> = {};
        data.questions.forEach((q) => {
          if (q.studentAnswer) {
            initialAnswers[q.id] = q.studentAnswer;
          }
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.message || tNow('examRunner.startFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startExam();
    return () => {
      cancelled = true;
    };
  }, [id, autoFinish]);

  // Anti-Cheat: Tab Switch & Visibility Detection
  useEffect(() => {
    if (!session || submittedResult) return;

    const handleVisibilityChange = () => {
      const attemptId = attemptIdRef.current;
      if (!document.hidden || !attemptId || finishedRef.current) return;
      api
        .post(`/exams/attempts/${attemptId}/violation`, { reason: 'TAB_SWITCH_OR_MINIMIZED' })
        .then((res) => {
          const count = res.data.data.violations;
          setViolations(count);
          // The server has already closed the attempt at this point; fetch the result.
          if (count >= MAX_VIOLATIONS) void autoFinish('violations');
        })
        .catch(() => {});
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [session, submittedResult, autoFinish]);

  // Timer Countdown: measured against the deadline, so a throttled background tab cannot fall behind.
  useEffect(() => {
    if (!session || submittedResult) return;

    let timer = 0;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        setAutoFinishing('timeout');
        void (async () => {
          // Last chance for answers still waiting; a stalled request must not hold up the submit.
          await Promise.race([saverRef.current?.flush(), wait(FINAL_FLUSH_WAIT_MS)]);
          await autoFinish('timeout');
        })();
      }
    };
    timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, [session, submittedResult, autoFinish]);

  // Unsaved answers: retry as soon as the connection is back, and warn before the page is closed.
  useEffect(() => {
    if (unsavedIds.length === 0 || submittedResult) return;

    const handleOnline = () => {
      void saverRef.current?.flush();
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedIds.length, submittedResult]);

  const handleAnswer = (questionId: number, value: string, delayMs = 0) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saverRef.current?.queue(questionId, value, delayMs);
  };

  const flushAnswers = () => {
    void saverRef.current?.flush();
  };

  const goToQuestion = (index: number) => {
    // Leaving a question sends what was typed there without waiting for the typing pause.
    flushAnswers();
    setCurrentIndex(index);
  };

  const openSubmitConfirm = () => {
    flushAnswers();
    setSubmitError(null);
    setSubmitConfirmOpen(true);
  };

  const handleSubmitExam = async () => {
    setSubmitError(null);
    const saver = saverRef.current;
    const allSaved = saver ? await saver.flush() : true;
    if (finishedRef.current) return;
    if (!allSaved) {
      // Never submit over answers the server does not have yet.
      setSubmitError(t('examRunner.unsavedBlocksSubmit', { count: saver?.unsavedCount() ?? 0 }));
      return;
    }
    await finishAttempt('manual');
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide">{t('examRunner.preparing')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <LanguageSwitcher className="absolute top-4 right-4" />
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold">{t('examRunner.accessRestricted')}</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={() => navigate('/exams')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            {t('examRunner.returnToList')}
          </button>
        </div>
      </div>
    );
  }

  if (submittedResult) {
    const awaitingGrading = submittedResult.status === 'needs_grading';
    // The teacher has not released the scores of this exam (its "show result" setting is off).
    const resultHidden = submittedResult.resultHidden === true;
    const resultTitle =
      finishReason === 'timeout'
        ? t('examRunner.timeUpTitle')
        : finishReason === 'violations'
        ? t('examRunner.autoSubmittedTitle')
        : finishReason === 'closed'
        ? t('examRunner.closedTitle')
        : t('examRunner.submittedTitle');
    const resultText =
      finishReason === 'timeout'
        ? t('examRunner.timeUpText')
        : finishReason === 'violations'
        ? t('examRunner.maxViolations')
        : finishReason === 'closed'
        ? t('examRunner.closedText')
        : t('examRunner.submittedText');

    return (
      <div className="relative min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <LanguageSwitcher className="absolute top-4 right-4" />
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-6 shadow-2xl">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
              awaitingGrading ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {awaitingGrading ? <Hourglass className="w-8 h-8" /> : <Award className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{resultTitle}</h2>
            <p className="text-sm text-slate-300 mt-1">{resultText}</p>
          </div>

          {lostAnswers > 0 && (
            <p role="alert" className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3">
              {t('examRunner.lostAnswers', { count: lostAnswers })}
            </p>
          )}

          {awaitingGrading ? (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="text-base font-bold text-amber-300">{t('examRunner.pendingGradingTitle')}</div>
              <p className="text-sm text-slate-300">
                {resultHidden ? t('examRunner.pendingGradingHiddenText') : t('examRunner.pendingGradingText')}
              </p>
              {!resultHidden && (
                <div className="text-sm text-slate-400">
                  {t('examRunner.provisionalScore')}: <strong className="text-slate-200">{submittedResult.score ?? 0} / 100</strong>
                </div>
              )}
            </div>
          ) : resultHidden ? (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="text-base font-bold text-slate-100">{t('examRunner.resultHiddenTitle')}</div>
              <p className="text-sm text-slate-300">{t('examRunner.resultHiddenText')}</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
              <div className="text-xs text-slate-400">{t('examRunner.finalScore')}</div>
              <div className="text-4xl font-extrabold text-emerald-400">{submittedResult.score ?? 0} / 100</div>
              <div className="text-xs font-semibold">
                {t('examRunner.statusLabel')}{' '}
                <span className={submittedResult.passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {submittedResult.passed ? t('examRunner.passed') : t('examRunner.notPassed')}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/exams')}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm transition cursor-pointer"
          >
            {t('examRunner.backToExams')}
          </button>
        </div>
      </div>
    );
  }

  if (!session || !session.questions || session.questions.length === 0) {
    return null;
  }

  const currentQ = session.questions[currentIndex];
  const isAnswered = (questionId: number) => answers[questionId] !== undefined && answers[questionId] !== '';
  const answeredTotal = session.questions.filter((q) => isAnswered(q.id)).length;
  const unsavedCount = unsavedIds.length;
  const currentUnsaved = unsavedIds.includes(currentQ.id);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">
      {/* Top Proctoring Header */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-emerald-600/30">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">{session.examTitle}</h1>
            <div className="flex items-center space-x-2 sm:space-x-3 text-xs text-slate-400 mt-0.5">
              <span>{t('examRunner.activeSession')}</span>
              <span>•</span>
              <span
                aria-live="polite"
                className={`font-medium ${
                  saveState === 'error' ? 'text-amber-300' : saveState === 'saving' ? 'text-slate-300' : 'text-emerald-400'
                }`}
              >
                {saveState === 'error'
                  ? t('examRunner.unsavedCount', { count: unsavedCount })
                  : saveState === 'saving'
                  ? t('examRunner.saving')
                  : t('examRunner.allSaved')}
              </span>
            </div>
          </div>
        </div>

        {/* Timer & Fullscreen Controls */}
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold shadow-xs ${
              secondsLeft < 300
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-emerald-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(secondsLeft)}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={t('examRunner.toggleFullscreen')}
            aria-label={t('examRunner.toggleFullscreen')}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Unsaved answers: shown until the server has confirmed every answer */}
      {saveState === 'error' && (
        <div
          role="alert"
          className="bg-amber-400 text-slate-900 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 shrink-0" />
            <span>{t('examRunner.saveFailedBanner', { count: unsavedCount })}</span>
          </span>
          <button
            type="button"
            onClick={flushAnswers}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('examRunner.retryNow')}</span>
          </button>
        </div>
      )}

      {/* Proctoring Warning Banner */}
      {violations > 0 && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-center space-x-2 text-xs font-bold animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {t('examRunner.securityAlert', { count: violations })}
          </span>
        </div>
      )}

      {/* Main Examination Area */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6">
        {/* Left Side: Question Display */}
        <div className="flex-1 flex flex-col justify-between bg-slate-800/60 border border-slate-700/60 rounded-3xl p-5 sm:p-8 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-6">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {t('examRunner.questionOf', { current: currentIndex + 1, total: session.questions.length })}
              </span>
              <div className="flex items-center space-x-2">
                {currentUnsaved ? (
                  saveState === 'error' ? (
                    <span className="text-xs text-amber-300 flex items-center space-x-1">
                      <CloudOff className="w-3.5 h-3.5" />
                      <span>{t('examRunner.notSaved')}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">{t('examRunner.saving')}</span>
                  )
                ) : isAnswered(currentQ.id) ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('examRunner.saved')}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="text-base font-medium text-slate-100 leading-relaxed whitespace-pre-wrap mb-8">
              {currentQ.questionText}
            </div>

            {/* Answer Options */}
            {currentQ.questionType === 'multiple_choice' && currentQ.options && (
              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isSelected = answers[currentQ.id] === opt || answers[currentQ.id] === letter;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleAnswer(currentQ.id, opt)}
                      className={`w-full text-left p-4 rounded-2xl border transition duration-150 flex items-center space-x-4 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500 font-semibold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-700 border border-slate-600 text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ.questionType === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['Benar', 'Salah'].map((val) => {
                  const isSelected = answers[currentQ.id] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAnswer(currentQ.id, val)}
                      className={`p-6 rounded-2xl border text-center font-bold text-base transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      {val === 'Benar' ? t('examRunner.trueLabel') : t('examRunner.falseLabel')}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ.questionType === 'short_answer' && (
              <div>
                <label htmlFor={`short-${currentQ.id}`} className="block text-xs font-semibold text-slate-400 mb-2">
                  {t('examRunner.shortAnswerLabel')}
                </label>
                <input
                  id={`short-${currentQ.id}`}
                  type="text"
                  autoComplete="off"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value, ESSAY_SAVE_DELAY_MS)}
                  onBlur={flushAnswers}
                  placeholder={t('examRunner.shortAnswerPlaceholder')}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                />
              </div>
            )}

            {currentQ.questionType === 'essay' && (
              <div>
                <label htmlFor={`essay-${currentQ.id}`} className="block text-xs font-semibold text-slate-400 mb-2">
                  {t('examRunner.essayLabel')}
                </label>
                <textarea
                  id={`essay-${currentQ.id}`}
                  rows={6}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value, ESSAY_SAVE_DELAY_MS)}
                  onBlur={flushAnswers}
                  placeholder={t('examRunner.essayPlaceholder')}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                />
              </div>
            )}
          </div>

          {/* Bottom Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-700/80 mt-8">
            <button
              onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-medium px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t('examRunner.previous')}</span>
            </button>

            {currentIndex < session.questions.length - 1 ? (
              <button
                onClick={() => goToQuestion(Math.min(session.questions.length - 1, currentIndex + 1))}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>{t('examRunner.nextQuestion')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={openSubmitConfirm}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{t('examRunner.finishAndSubmit')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Number Palette Grid */}
        <div className="w-full lg:w-72 bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {t('examRunner.questionNav')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('examRunner.answeredLabel')} <strong>{answeredTotal}</strong> / {session.questions.length}
            </p>

            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-4 gap-2.5 max-h-[300px] lg:max-h-[420px] overflow-y-auto pr-1">
              {session.questions.map((q, idx) => {
                const answered = isAnswered(q.id);
                const isCurrent = idx === currentIndex;
                const unsaved = unsavedIds.includes(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    title={unsaved ? t('examRunner.notSaved') : undefined}
                    className={`h-10 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-emerald-400 bg-emerald-600 text-white shadow-md'
                        : unsaved
                        ? 'bg-amber-500/20 border border-amber-400/70 text-amber-200'
                        : answered
                        ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-700/50 border border-slate-600/60 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={openSubmitConfirm}
            className="w-full bg-slate-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl text-xs transition shadow-xs cursor-pointer mt-6"
          >
            {t('examRunner.submitAll')}
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitConfirmOpen && !autoFinishing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">{t('examRunner.confirmTitle')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('examRunner.confirmText', { answered: answeredTotal, total: session.questions.length })}
            </p>

            {submitError && (
              <p role="alert" className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-xl p-3">
                {submitError}
              </p>
            )}

            <div className="flex space-x-3 pt-4 border-t border-slate-700">
              <button
                onClick={() => setSubmitConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {t('examRunner.keepReviewing')}
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-60"
              >
                {submitting ? t('examRunner.submitting') : t('examRunner.submitNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attempt is over (time, violations, closed by the server): block the screen until the result arrives */}
      {autoFinishing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-bold text-white">
              {autoFinishing === 'timeout'
                ? t('examRunner.timeUpTitle')
                : autoFinishing === 'violations'
                ? t('examRunner.autoSubmittedTitle')
                : t('examRunner.closedTitle')}
            </h3>
            <p className="text-sm text-slate-300">{t('examRunner.autoSubmitting')}</p>
            {submitError && <p className="text-xs text-amber-300">{submitError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
