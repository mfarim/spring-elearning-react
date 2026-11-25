import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Exam, Subject, Classroom, ApiResponse } from '../../types';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';

export const ExamList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    classroomId: '',
    type: 'quiz',
    durationMinutes: 60,
    passingScore: 75,
    startAt: '',
    endAt: '',
    shuffleQuestions: true,
    shuffleOptions: true,
    showResult: true,
    allowRetry: false,
    description: '',
  });

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        subjectId: Number(form.subjectId),
        classroomId: Number(form.classroomId),
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
        status: 'published',
      };

      await api.post('/exams', payload);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || t('examList.createFailed'));
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
            onClick={() => setModalOpen(true)}
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
                  {t('examList.classLabel')} <strong>{exam.classroomName}</strong> | {t('examList.passingLabel')} <strong>{exam.passingScore}%</strong>
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
                  <>
                    {exam.studentAttemptStatus === 'completed' ? (
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t('examList.modalTitle')}</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('examList.examTitle')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('examList.examTitlePlaceholder')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.subject')}</label>
                  <select
                    required
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.duration')}</label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={240}
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
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
                    onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })}
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
                    onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('examList.endTime')}</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shuffleQuestions}
                    onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('examList.shuffleQuestions')}</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shuffleOptions}
                    onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{t('examList.shuffleOptions')}</span>
                </label>
              </div>

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
                  {t('examList.createAndPublish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
