import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import type { ExamStartResponse, ApiResponse } from '../../types';
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
} from 'lucide-react';

export const ExamRunner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ExamStartResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit / Finish states
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  const attemptIdRef = useRef<number | null>(null);

  useEffect(() => {
    const startExam = async () => {
      try {
        setLoading(true);
        const res = await api.post<ApiResponse<ExamStartResponse>>(`/exams/${id}/start`);
        const data = res.data.data;
        setSession(data);
        attemptIdRef.current = data.attemptId;
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
        setError(err.response?.data?.message || 'Failed to start examination session');
      } finally {
        setLoading(false);
      }
    };

    startExam();
  }, [id]);

  // Anti-Cheat: Tab Switch & Visibility Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptIdRef.current && !submittedResult) {
        api.post(`/exams/attempts/${attemptIdRef.current}/violation`, {
          reason: 'TAB_SWITCH_OR_MINIMIZED',
        }).then((res) => {
          const count = res.data.data.violations;
          setViolations(count);
          if (count >= 5) {
            alert('Maximum security violations reached (5). Your exam is being automatically submitted.');
            handleSubmitExam();
          }
        }).catch(() => {});
      }
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
  }, [submittedResult]);

  // Timer Countdown
  useEffect(() => {
    if (secondsLeft <= 0 || submittedResult) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, submittedResult]);

  const handleSelectOption = async (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    if (session?.attemptId) {
      setSaving(true);
      try {
        await api.post(`/exams/attempts/${session.attemptId}/answer`, {
          questionId,
          answerText: value,
        });
      } catch (e) {
        console.error('Failed to autosave answer', e);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSubmitExam = async () => {
    if (!session?.attemptId) return;

    try {
      setLoading(true);
      const res = await api.post(`/exams/attempts/${session.attemptId}/submit`);
      setSubmittedResult(res.data.data);
      setSubmitConfirmOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit exam');
    } finally {
      setLoading(false);
    }
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
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold tracking-wide">Initializing secure CBT exam runner...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={() => navigate('/exams')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            Return to Exam List
          </button>
        </div>
      </div>
    );
  }

  if (submittedResult) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Examination Submitted!</h2>
            <p className="text-xs text-slate-400 mt-1">Your responses have been processed.</p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60 space-y-3">
            <div className="text-xs text-slate-400">Final Score</div>
            <div className="text-4xl font-extrabold text-indigo-400">{submittedResult.score} / 100</div>
            <div className="text-xs font-semibold">
              Status:{' '}
              <span className={submittedResult.passed ? 'text-emerald-400' : 'text-rose-400'}>
                {submittedResult.passed ? 'PASSED (LULUS)' : 'DID NOT PASS (TIDAK LULUS)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/exams')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session || !session.questions || session.questions.length === 0) {
    return null;
  }

  const currentQ = session.questions[currentIndex];
  const answeredTotal = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">
      {/* Top Proctoring Header */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-indigo-600/30">
            CBT
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{session.examTitle}</h1>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
              <span>Candidate Active</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Autosave Connected</span>
            </div>
          </div>
        </div>

        {/* Timer & Fullscreen Controls */}
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold shadow-xs ${
              secondsLeft < 300
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-indigo-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(secondsLeft)}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Lock"
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Proctoring Warning Banner */}
      {violations > 0 && (
        <div className="bg-rose-600 text-white px-6 py-2.5 flex items-center justify-center space-x-2 text-xs font-bold animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Security Alert: {violations}/5 Warnings recorded. Leaving the exam tab will automatically submit your test!
          </span>
        </div>
      )}

      {/* Main Examination Area */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full p-6 gap-6">
        {/* Left Side: Question Display */}
        <div className="flex-1 flex flex-col justify-between bg-slate-800/60 border border-slate-700/60 rounded-3xl p-8 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-6">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Question {currentIndex + 1} of {session.questions.length}
              </span>
              <div className="flex items-center space-x-2">
                {saving ? (
                  <span className="text-xs text-slate-400">Saving...</span>
                ) : (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved in cloud</span>
                  </span>
                )}
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
                      onClick={() => handleSelectOption(currentQ.id, opt)}
                      className={`w-full text-left p-4 rounded-2xl border transition duration-150 flex items-center space-x-4 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500 font-semibold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
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
                      onClick={() => handleSelectOption(currentQ.id, val)}
                      className={`p-6 rounded-2xl border text-center font-bold text-base transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQ.questionType === 'essay' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Write your explanation / answer:</label>
                <textarea
                  rows={6}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>
            )}
          </div>

          {/* Bottom Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-700/80 mt-8">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-medium px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < session.questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(session.questions.length - 1, prev + 1))}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-indigo-600/25 transition cursor-pointer"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setSubmitConfirmOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Finish & Submit Exam</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Number Palette Grid */}
        <div className="w-72 bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Question Navigator
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Answered: <strong>{answeredTotal}</strong> / {session.questions.length}
            </p>

            <div className="grid grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {session.questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white shadow-md'
                        : isAnswered
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
            onClick={() => setSubmitConfirmOpen(true)}
            className="w-full bg-slate-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl text-xs transition shadow-xs cursor-pointer mt-6"
          >
            Submit All Responses
          </button>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Confirm Submission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You have answered <strong>{answeredTotal}</strong> out of{' '}
              <strong>{session.questions.length}</strong> questions. Once submitted, your answers cannot be changed.
            </p>

            <div className="flex space-x-3 pt-4 border-t border-slate-700">
              <button
                onClick={() => setSubmitConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Keep Reviewing
              </button>
              <button
                onClick={handleSubmitExam}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
