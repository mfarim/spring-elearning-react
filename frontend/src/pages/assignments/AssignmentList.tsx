import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Assignment, Subject, Classroom, ApiResponse } from '../../types';
import {
  MessageSquareShare,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  X,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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
    description: '',
    instructions: '',
    maxScore: 100,
    dueDate: '',
    allowLateSubmission: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [aRes, sRes, cRes] = await Promise.all([
        api.get<ApiResponse<Assignment[]>>('/assignments'),
        api.get<ApiResponse<Subject[]>>('/subjects'),
        api.get<ApiResponse<Classroom[]>>('/classrooms'),
      ]);
      setAssignments(aRes.data.data);
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
        description: form.description,
        instructions: form.instructions,
        maxScore: Number(form.maxScore),
        dueDate: form.dueDate,
        allowLateSubmission: form.allowLateSubmission,
        status: 'published',
      };

      await api.post('/assignments', payload);
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this assignment?')) {
      await api.delete(`/assignments/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tugas & PR Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">Kumpulkan tugas, terima penilaian guru, dan ikuti forum diskusi</p>
        </div>

        {(isAdmin || isTeacher) && (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tugas Baru</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <MessageSquareShare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">No assignments currently active</p>
          <p className="text-xs mt-1 text-slate-400">Instructors can create assignments for enrolled classes here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {a.subjectName}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Max: {a.maxScore} poin</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{a.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description || 'Tidak ada deskripsi.'}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Kelas: <strong>{a.classroomName}</strong></span>
                  <div className="flex items-center space-x-1 text-amber-700 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Batas: {new Date(a.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/assignments/${a.id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Detail & Pengumpulan</span>
                </Link>

                <div className="flex items-center space-x-2">
                  {a.hasSubmitted && (
                    <span className="inline-flex items-center text-xs text-emerald-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Submitted {a.studentScore !== null && a.studentScore !== undefined ? `(${a.studentScore}/${a.maxScore})` : ''}
                    </span>
                  )}

                  {(isAdmin || isTeacher) && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Assignment</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tugas Mandiri 1: Pemrograman Berorientasi Objek"
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
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classroom</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={100}
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Task instructions and guidelines..."
                />
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
                  Publikasikan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
