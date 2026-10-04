import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Classroom, Teacher, ApiResponse } from '../../types';
import { Plus, Trash2, Edit2, GraduationCap, X } from 'lucide-react';

export const Classrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const [form, setForm] = useState({
    name: '',
    level: 10,
    capacity: 32,
    academicYear: '2026/2027',
    homeroomTeacherId: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [crRes, tRes] = await Promise.all([
        api.get<ApiResponse<Classroom[]>>('/classrooms'),
        api.get<ApiResponse<Teacher[]>>('/teachers'),
      ]);
      setClassrooms(crRes.data.data);
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

  const openModal = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setForm({
        name: classroom.name,
        level: classroom.level,
        capacity: classroom.capacity,
        academicYear: classroom.academicYear,
        homeroomTeacherId: classroom.homeroomTeacherId ? String(classroom.homeroomTeacherId) : '',
      });
    } else {
      setEditingClassroom(null);
      setForm({
        name: '',
        level: 10,
        capacity: 32,
        academicYear: '2026/2027',
        homeroomTeacherId: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        level: Number(form.level),
        capacity: Number(form.capacity),
        academicYear: form.academicYear,
        homeroomTeacherId: form.homeroomTeacherId ? Number(form.homeroomTeacherId) : null,
      };

      if (editingClassroom) {
        await api.put(`/classrooms/${editingClassroom.id}`, payload);
      } else {
        await api.post('/classrooms', payload);
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save classroom');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this classroom?')) {
      await api.delete(`/classrooms/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Kelas</h2>
          <p className="text-xs text-slate-500 mt-1">Kelola rombongan belajar dan tentukan wali kelas</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat data kelas...</div>
        ) : classrooms.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">Belum ada kelas yang terdaftar</p>
            <p className="text-xs mt-1 text-slate-400">Klik "Tambah Kelas" untuk menambahkan kelas pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Nama Kelas</th>
                  <th className="px-6 py-4">Tingkat</th>
                  <th className="px-6 py-4">Kapasitas</th>
                  <th className="px-6 py-4">Tahun Ajaran</th>
                  <th className="px-6 py-4">Wali Kelas</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classrooms.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 text-slate-600">Kelas {c.level}</td>
                    <td className="px-6 py-4 text-slate-600">{c.capacity} siswa</td>
                    <td className="px-6 py-4 text-slate-600">{c.academicYear}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.homeroomTeacherName ? (
                        <span className="font-medium text-slate-800">{c.homeroomTeacherName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(c)}
                        className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                        title="Edit Kelas"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Kelas"
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

      {/* Add / Edit Modal */}
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
              {editingClassroom ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X MIPA 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat / Grade</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={12}
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kapasitas Siswa</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Wali Kelas</label>
                <select
                  value={form.homeroomTeacherId}
                  onChange={(e) => setForm({ ...form, homeroomTeacherId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
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
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
