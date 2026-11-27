import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Exam, ExamType, Subject, Classroom, Teacher, ApiResponse } from '../../types';
import { apiErrorMessage } from '../../utils/errors';
import {
  FileCheck2,
  Plus,
  Play,
  MonitorPlay,
  Clock,
  Calendar,
  CheckCircle,
  X,
  FileQuestion,
  Hourglass,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n, type MessageKey } from '../../i18n';

const EXAM_TYPE_LABELS: Record<ExamType, MessageKey> = {
  quiz: 'examList.typeQuiz',
  uts: 'examList.typeUts',
  uas: 'examList.typeUas',
  praktik: 'examList.typePraktik',
  tryout: 'examList.typeTryout',
};
const EXAM_TYPES = Object.keys(EXAM_TYPE_LABELS) as ExamType[];

const EMPTY_FORM = {
  title: '',
  subjectId: '',
  classroomId: '',
  teacherId: '',
  type: 'quiz' as ExamType,
  durationMinutes: 60,
  passingScore: 75,
  startAt: '',
  endAt: '',
  shuffleQuestions: true,
  shuffleOptions: true,
  showResult: true,
  allowRetry: false,
  description: '',
};

/** "2026-12-01T07:00:00" from the API to the "2026-12-01T07:00" a datetime-local input expects. */
const toDateTimeInput = (value: string) => value.slice(0, 16);

export const ExamList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  // Only an admin picks the owning teacher; a teacher always owns the exams they create.
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // null = the modal creates a new exam; otherwise it edits this one.
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { t, locale } = useI18n();
  const statusLabel = (status: string) =>
    status === 'published'
      ? t('examList.statusPublished')
      : status === 'archived'
      ? t('examList.statusArchived')
      : t('examList.statusDraft');
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const [form, setForm] = useState(EMPTY_FORM);

  /** Changes form fields. A message about the previous values no longer applies, so it is cleared. */
  const updateForm = (patch: Partial<typeof EMPTY_FORM>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormError(null);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [eRes, sRes, cRes] = await Promise.all([
        api.get<ApiResponse<Exam[]>>('/exams'),
        api.get<ApiResponse<Subject[]>>('/subjects'),
        api.get<ApiResponse<Classroom[]>>('/classrooms'),
      ]);
      setExams(eRes.data.data);
      setSubjects(sRes.data.data);
      setClassrooms(cRes.data.data);
      if (isAdmin) {
        const tRes = await api.get<ApiResponse<Teacher[]>>('/teachers');
        setTeachers(tRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /** The same schedule rules the server enforces, checked first so the form can say what to fix. */
  const scheduleError = (): string | null => {
    const start = new Date(form.startAt).getTime();
    const end = new Date(form.endAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return null; // left to the required fields
    if (end <= start) return t('examList.endBeforeStart');
    const windowMinutes = Math.floor((end - start) / 60000);
    if (Number(form.durationMinutes) > windowMinutes) {
      return t('examList.durationTooLong', { duration: Number(form.durationMinutes), window: windowMinutes });
    }
    return null;
  };

  const openCreateModal = () => {
    setEditingExam(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setForm({
      title: exam.title,
      subjectId: String(exam.subjectId),
      classroomId: String(exam.classroomId),
      teacherId: '',
      type: exam.type,
      durationMinutes: exam.durationMinutes,
      passingScore: exam.passingScore,
      startAt: toDateTimeInput(exam.startAt),
      endAt: toDateTimeInput(exam.endAt),
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
      showResult: exam.showResult,
      allowRetry: exam.allowRetry,
      description: exam.description || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidSchedule = scheduleError();
    if (invalidSchedule) {
      setFormError(invalidSchedule);
      return;
    }
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        subjectId: Number(form.subjectId),
        classroomId: Number(form.classroomId),
        // The owner is chosen when an admin creates the exam; editing keeps the owner.
        teacherId: isAdmin && !editingExam && form.teacherId ? Number(form.teacherId) : undefined,
        type: form.type,
        durationMinutes: Number(form.durationMinutes),
        passingScore: Number(form.passingScore),
        startAt: form.startAt,
        endAt: form.endAt,
        shuffleQuestions: form.shuffleQuestions,
        shuffleOptions: form.shuffleOptions,
        showResult: form.showResult,
        allowRetry: form.allowRetry,
        description: form.description,
        // Editing never changes whether the exam is published; that is the status button on the card.
        status: editingExam ? editingExam.status : 'published',
      };

      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, payload);
      } else {
        await api.post('/exams', payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(apiErrorMessage(err, editingExam ? t('examList.updateFailed') : t('examList.createFailed')));
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    await api.patch(`/exams/${id}/status?status=${nextStatus}`);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('examList.title')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('examList.subtitle')}</p>
        </div>

        {(isAdmin || isTeacher) && (
          <button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('examList.createButton')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">{t('examList.loading')}</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <FileCheck2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">{t('examList.emptyTitle')}</p>
          <p className="text-xs mt-1 text-slate-400">{t('examList.emptyText')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {exam.subjectName}
                  </span>
                  {(isAdmin || isTeacher) ? (
                    <button
                      onClick={() => handleToggleStatus(exam.id, exam.status)}
                      title={t('examList.toggleStatusTitle')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase cursor-pointer transition ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {statusLabel(exam.status)}
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {statusLabel(exam.status)}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{exam.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {EXAM_TYPE_LABELS[exam.type] ? t(EXAM_TYPE_LABELS[exam.type]) : exam.type} | {t('examList.classLabel')} <strong>{exam.classroomName}</strong> | {t('examList.passingLabel')} <strong>{exam.passingScore}%</strong>
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{t('examList.durationMinutes', { count: exam.durationMinutes })}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <FileQuestion className="w-4 h-4 text-slate-400" />
                    <span>{exam.totalQuestions === 1 ? t('examList.questionOne') : t('examList.questionCount', { count: exam.totalQuestions })}</span>
                  </div>
                  <div className="col-span-2 flex items-center space-x-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(exam.startAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                      {' - '}
                      {new Date(exam.endAt).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {isAdmin || isTeacher ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(exam)}
                      title={t('examList.editExam')}
                      aria-label={t('examList.editExam')}
                      className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/exams/${exam.id}/questions`}
                      className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl text-xs transition"
                    >
                      {t('examList.questionsButton', { count: exam.totalQuestions })}
                    </Link>
                    <Link
                      to={`/exams/${exam.id}/monitor`}
                      className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1"
                    >
                      <MonitorPlay className="w-3.5 h-3.5 mr-1" />
                      <span>{t('examList.liveMonitor')}</span>
                    </Link>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    {exam.studentAttemptStatus === 'needs_grading' ? (
                      <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-800">
                        <Hourglass className="w-4 h-4 shrink-0" />
                        <span>{t('examList.awaitingGrading')}</span>
                      </div>
                    ) : exam.studentAttemptStatus === 'submitted' || exam.studentAttemptStatus === 'force_finished' ? (
                      <div className="w-full flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{t('examList.alreadySubmitted')}</span>
                      </div>
                    ) : exam.studentAttemptStatus === 'completed' ? (
                      <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>{t('examList.score', { score: exam.studentScore ?? 0 })}</span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            exam.studentPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {exam.studentPassed ? t('examList.passed') : t('examList.remedial')}
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={`/exams/${exam.id}/runner`}
                        className="w-full text-center bg-gradient-to-r from-[#059669] to-[#065f46] hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-700/20 transition flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{exam.studentAttemptStatus === 'in_progress' ? t('examList.continueExam') : t('examList.startExam')}</span>
                      </Link>
                    )}
                    {/* Finished, and the teacher allows another attempt: starting again creates a new attempt. */}
                    {exam.allowRetry && exam.studentAttemptStatus && exam.studentAttemptStatus !== 'in_progress' && (
                      <Link
                        to={`/exams/${exam.id}/runner`}
                        className="w-full text-center border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{t('examList.retryExam')}</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Exam Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingExam ? t('examList.editModalTitle') : t('examList.modalTitle')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('examList.examTitle')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('examList.examTitlePlaceholder')}
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.subject')}</label>
                  <select
                    required
                    value={form.subjectId}
                    onChange={(e) => updateForm({ subjectId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('examList.chooseSubject')}</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.targetClass')}</label>
                  <select
                    required
                    value={form.classroomId}
                    onChange={(e) => updateForm({ classroomId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('examList.chooseClass')}</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isAdmin && !editingExam && (
                <div>
                  <label htmlFor="exam-owner-teacher" className="block font-semibold text-slate-700 mb-1">
                    {t('examList.ownerTeacher')}
                  </label>
                  <select
                    id="exam-owner-teacher"
                    required
                    value={form.teacherId}
                    onChange={(e) => updateForm({ teacherId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('examList.chooseTeacher')}</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="exam-type" className="block font-semibold text-slate-700 mb-1">
                  {t('examList.examType')}
                </label>
                <select
                  id="exam-type"
                  value={form.type}
                  onChange={(e) => updateForm({ type: e.target.value as ExamType })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {EXAM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(EXAM_TYPE_LABELS[type])}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.duration')}</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={240}
                    value={form.durationMinutes}
                    onChange={(e) => updateForm({ durationMinutes: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.passingScore')}</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={form.passingScore}
                    onChange={(e) => updateForm({ passingScore: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.startTime')}</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startAt}
                    onChange={(e) => updateForm({ startAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.endTime')}</label>
                  <input
                    type="datetime-local"
                    required
                    min={form.startAt || undefined}
                    value={form.endAt}
                    onChange={(e) => updateForm({ endAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shuffleQuestions}
                    onChange={(e) => updateForm({ shuffleQuestions: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('examList.shuffleQuestions')}</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shuffleOptions}
                    onChange={(e) => updateForm({ shuffleOptions: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('examList.shuffleOptions')}</span>
                </label>
                <label className="col-span-2 flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowRetry}
                    onChange={(e) => updateForm({ allowRetry: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('examList.allowRetry')}</span>
                </label>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer transition"
                >
                  {editingExam ? t('examList.saveChanges') : t('examList.createAndPublish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
