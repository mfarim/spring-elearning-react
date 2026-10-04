import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Announcement, ApiResponse } from '../../types';
import { Plus, Trash2, Edit2, Bell, X } from 'lucide-react';

export const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    target: 'all',
    published: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<Announcement[]>>('/announcements');
      setAnnouncements(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: Announcement) => {
    if (item) {
      setEditingItem(item);
      setForm({
        title: item.title,
        content: item.content,
        target: item.target,
        published: item.published,
      });
    } else {
      setEditingItem(null);
      setForm({
        title: '',
        content: '',
        target: 'all',
        published: true,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem.id}`, form);
      } else {
        await api.post('/announcements', form);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this announcement?')) {
      await api.delete(`/announcements/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Papan Pengumuman</h2>
          <p className="text-xs text-slate-500 mt-1">Publikasikan informasi resmi kepada guru dan siswa</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat pengumuman...</div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">Belum ada pengumuman yang dipublikasikan</p>
            <p className="text-xs mt-1 text-slate-400">Buat berita sekolah atau informasi jadwal ujian di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Judul</th>
                  <th className="px-6 py-4">Target Audiens</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {announcements.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div>{a.title}</div>
                      <div className="text-xs font-normal text-slate-500 line-clamp-1 mt-0.5">{a.content}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {a.target}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          a.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openModal(a)}
                        className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
                        title="Edit Pengumuman"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Pengumuman"
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
              {editingItem ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jadwal Ujian Akhir Semester Ganjil"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                <select
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="all">Everyone (All)</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="student">Students Only</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Announcement body text..."
                />
              </div>

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Publikasikan sekarang</span>
              </label>

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
                  Simpan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
