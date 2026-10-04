import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { LearningMaterial, Subject, Classroom, ApiResponse } from '../../types';
import {
  BookOpen,
  Plus,
  Trash2,
  Eye,
  FileText,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MaterialsList: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
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
    type: 'PDF',
    description: '',
    content: '',
    fileUrl: '',
    published: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mRes, sRes, cRes] = await Promise.all([
        api.get<ApiResponse<LearningMaterial[]>>('/materials'),
        api.get<ApiResponse<Subject[]>>('/subjects'),
        api.get<ApiResponse<Classroom[]>>('/classrooms'),
      ]);
      setMaterials(mRes.data.data);
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
      const formData = new FormData();
      const payload = {
        title: form.title,
        subjectId: Number(form.subjectId),
        classroomId: form.classroomId ? Number(form.classroomId) : null,
        type: form.type,
        description: form.description,
        content: form.content,
        fileUrl: form.fileUrl,
        published: form.published,
      };

      formData.append(
        'data',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.post('/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setModalOpen(false);
      setSelectedFile(null);
      setForm({
        title: '',
        subjectId: '',
        classroomId: '',
        type: 'PDF',
        description: '',
        content: '',
        fileUrl: '',
        published: true,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create material');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this learning material?')) {
      await api.delete(`/materials/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Materi Pembelajaran</h2>
          <p className="text-xs text-slate-500 mt-1">Modul silabus digital, panduan bacaan, dan berkas materi kuliah</p>
        </div>

        {(isAdmin || isTeacher) && (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Materi</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading learning materials...</div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">No learning materials published yet</p>
          <p className="text-xs mt-1 text-slate-400">Instructors can publish course readings and modules here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {m.subjectName}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{m.totalViews} dilihat</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{m.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description || 'Tidak ada deskripsi.'}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Kelas: <strong>{m.classroomName || 'Semua'}</strong></span>
                  <span>Oleh: <strong>{m.teacherName}</strong></span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/materials/${m.id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buka Materi</span>
                </Link>

                <div className="flex items-center space-x-2">
                  {m.hasViewed && (
                    <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Completed
                    </span>
                  )}
                  {(isAdmin || isTeacher) && (
                    <button
                      onClick={() => handleDelete(m.id)}
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

      {/* Upload Material Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Publish Learning Material</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bab 1: Persamaan Linier dan Kuadrat"
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
                  <label className="block font-semibold text-slate-700 mb-1">Target Classroom</label>
                  <select
                    value={form.classroomId}
                    onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">All Classrooms</option>
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
                  <label className="block font-semibold text-slate-700 mb-1">Content Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="ARTICLE">Article / Text</option>
                    <option value="VIDEO">Video Link</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attachment File</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Summary Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Short description of the topic..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Content</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Markdown or lecture text..."
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
                  Publikasikan Materi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
