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

export const ExamList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const { user } = useAuthStore();
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
      alert(err.response?.data?.message || 'Failed to create exam');
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ujian CBT (Computer-Based Test)</h2>
          <p className="text-xs text-slate-500 mt-1">Ujian online interaktif dengan proteksi anti-cheat dan telemetri langsung</p>
        </div>

        {(isAdmin || isTeacher) && (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian Baru</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading examinations...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <FileCheck2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">No examinations scheduled</p>
          <p className="text-xs mt-1 text-slate-400">Scheduled tests will appear here.</p>
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
                      title="Click to toggle status"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase cursor-pointer transition ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {exam.status}
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        exam.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {exam.status}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{exam.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Class: <strong>{exam.classroomName}</strong> | Passing: <strong>{exam.passingScore}%</strong>
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{exam.durationMinutes} Minutes</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <FileQuestion className="w-4 h-4 text-slate-400" />
                    <span>{exam.totalQuestions} Questions</span>
                  </div>
                  <div className="col-span-2 flex items-center space-x-1.5 text-[11px] text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(exam.startAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      {' - '}
                      {new Date(exam.endAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
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
                      Soal ({exam.totalQuestions})
                    </Link>
                    <Link
                      to={`/exams/${exam.id}/monitor`}
                      className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center space-x-1"
                    >
                      <MonitorPlay className="w-3.5 h-3.5 mr-1" />
                      <span>Live Monitor</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {exam.studentAttemptStatus === 'completed' ? (
                      <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Nilai: {exam.studentScore ?? 0}/100</span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            exam.studentPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {exam.studentPassed ? 'LULUS' : 'REMIDI'}
                        </span>
                      </div>
                    ) : (
                      <Link
                        to={`/exams/${exam.id}/runner`}
                        className="w-full text-center bg-gradient-to-r from-[#059669] to-[#065f46] hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-emerald-700/20 transition flex items-center justify-center space-x-2"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{exam.studentAttemptStatus === 'in_progress' ? 'Lanjutkan Ujian' : 'Mulai Ujian CBT'}</span>
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
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create CBT Examination</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Penilaian Akhir Semester Ganjil 2026"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    required
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Class</label>
                  <select
                    required
                    value={form.classroomId}
                    onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Choose Classroom --</option>
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
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Passing Score (%)</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startAt}
                    onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
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
                  <span>Randomize Questions</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shuffleOptions}
                    onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Randomize Options</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer transition"
                >
                  Buat & Publikasikan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
