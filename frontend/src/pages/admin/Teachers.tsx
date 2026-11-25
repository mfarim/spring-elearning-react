import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Teacher, ApiResponse } from '../../types';
import { Plus, Trash2, UserCheck, ShieldAlert, X } from 'lucide-react';
import { useI18n } from '../../i18n';

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { impersonate } = useAuthStore();
  const { t } = useI18n();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    nip: '',
    phone: '',
    address: '',
  });

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<Teacher[]>>('/teachers');
      setTeachers(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teachers', form);
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', nip: '', phone: '', address: '' });
      loadTeachers();
    } catch (err: any) {
      alert(err.response?.data?.message || t('teachers.createFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('teachers.confirmDelete'))) {
      await api.delete(`/teachers/${id}`);
      loadTeachers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('teachers.title')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('teachers.subtitle')}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('teachers.addTeacher')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{t('teachers.loading')}</div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-medium">{t('teachers.emptyTitle')}</p>
            <p className="text-xs mt-1 text-slate-400">{t('teachers.emptyHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">{t('teachers.colName')}</th>
                  <th className="px-6 py-4">NIP</th>
                  <th className="px-6 py-4">{t('common.email')}</th>
                  <th className="px-6 py-4">{t('teachers.colPhone')}</th>
                  <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{teacher.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{teacher.nip}</td>
                    <td className="px-6 py-4 text-slate-600">{teacher.email}</td>
                    <td className="px-6 py-4 text-slate-600">{teacher.phone || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => impersonate(teacher.userId)}
                        title={t('teachers.loginAsTitle')}
                        className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-200 transition cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 mr-0.5" />
                        <span>{t('teachers.loginAs')}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title={t('teachers.deleteTitle')}
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
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t('teachers.modalTitle')}</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('teachers.fullName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('teachers.namePlaceholder')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('teachers.nip')}</label>
                  <input
                    type="text"
                    required
                    placeholder="198501012010011001"
                    value={form.nip}
                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('teachers.phone')}</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('teachers.emailAddress')}</label>
                  <input
                    type="email"
                    required
                    placeholder={t('teachers.emailPlaceholder')}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('teachers.initialPassword')}</label>
                  <input
                    type="password"
                    placeholder={t('teachers.passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('teachers.address')}</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('teachers.addressPlaceholder')}
                />
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
                  {t('teachers.saveTeacher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
