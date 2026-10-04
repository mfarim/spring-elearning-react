import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Subject, Teacher, ApiResponse } from '../../types';
import { Plus, Trash2, Edit2, BookMarked, X } from 'lucide-react';

export const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    teacherId: '',
    credits: 2,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, tRes] = await Promise.all([
        api.get<ApiResponse<Subject[]>>('/subjects'),
        api.get<ApiResponse<Teacher[]>>('/teachers'),
      ]);
      setSubjects(sRes.data.data);
      setTeachers(tRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setForm({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        teacherId: subject.teacherId ? String(subject.teacherId) : '',
        credits: subject.credits,
      });
    } else {
      setEditingSubject(null);
      setForm({
        name: '',
        code: '',
        description: '',
        teacherId: '',
        credits: 2,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description,
        teacherId: form.teacherId ? Number(form.teacherId) : null,
        credits: Number(form.credits),
      };

      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, payload);
      } else {
        await api.post('/subjects', payload);
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save subject');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      await api.delete(`/subjects/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Mata Pelajaran</h2>
          <p className="text-xs text-slate-500 mt-1">Daftar kurikulum, beban SKS, dan guru pengampu</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mapel</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat mata pelajaran...</div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BookMarked className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">Belum ada mata pelajaran</p>
            <p className="text-xs mt-1 text-slate-400">Klik "Tambah Mapel" untuk membuat kurikulum pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Nama Mata Pelajaran</th>
                  <th className="px-6 py-4">Beban SKS</th>
                  <th className="px-6 py-4">Guru Pengampu</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {s.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 text-slate-600">{s.credits} SKS</td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.teacherName ? (
                        <span className="font-medium text-slate-800">{s.teacherName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(s)}
                        className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                        title="Edit Mapel"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Mapel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MAT-10"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Beban SKS</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={6}
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Wajib"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guru Pengampu</label>
                <select
                  value={form.teacherId}
                  onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Silabus</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ringkasan kompetensi dasar dan tujuan pembelajaran..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
