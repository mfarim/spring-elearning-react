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
import { useI18n } from '../../i18n';

export const MaterialsList: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const { user } = useAuthStore();
  const { t } = useI18n();
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
      alert(err.response?.data?.message || t('materialsList.createFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t('materialsList.confirmDelete'))) {
      await api.delete(`/materials/${id}`);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('materialsList.title')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('materialsList.subtitle')}</p>
        </div>

        {(isAdmin || isTeacher) && (
          <button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('materialsList.uploadButton')}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">{t('materialsList.loading')}</div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-medium">{t('materialsList.emptyTitle')}</p>
          <p className="text-xs mt-1 text-slate-400">{t('materialsList.emptyText')}</p>
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
                    <span>{t('materialsList.views', { count: m.totalViews })}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{m.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.description || t('materialsList.noDescription')}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{t('materialsList.classLabel')} <strong>{m.classroomName || t('materialsList.allClasses')}</strong></span>
                  <span>{t('materialsList.byLabel')} <strong>{m.teacherName}</strong></span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to={`/materials/${m.id}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('materialsList.openMaterial')}</span>
                </Link>

                <div className="flex items-center space-x-2">
                  {m.hasViewed && (
                    <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {t('materialsList.completed')}
                    </span>
                  )}
                  {(isAdmin || isTeacher) && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      title={t('materialsList.deleteTitle')}
                      aria-label={t('materialsList.deleteTitle')}
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
              aria-label={t('common.close')}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{t('materialsList.modalTitle')}</h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldTitle')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('materialsList.fieldTitlePlaceholder')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldSubject')}</label>
                  <select
                    required
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('materialsList.chooseSubject')}</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldClassroom')}</label>
                  <select
                    value={form.classroomId}
                    onChange={(e) => setForm({ ...form, classroomId: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">{t('materialsList.allClassrooms')}</option>
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
                  <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldType')}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="PDF">{t('materialsList.typePdf')}</option>
                    <option value="ARTICLE">{t('materialsList.typeArticle')}</option>
                    <option value="VIDEO">{t('materialsList.typeVideo')}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldFile')}</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldDescription')}</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('materialsList.fieldDescriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('materialsList.fieldContent')}</label>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('materialsList.fieldContentPlaceholder')}
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
                  {t('materialsList.publishButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
