import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { LearningMaterial, ApiResponse } from '../../types';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Download,
  Calendar,
  User,
  Users,
  CheckCircle2,
} from 'lucide-react';

export const MaterialDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const [material, setMaterial] = useState<LearningMaterial | null>(null);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMaterial = async () => {
      try {
        setLoading(true);
        const res = await api.get<ApiResponse<LearningMaterial>>(`/materials/${id}`);
        setMaterial(res.data.data);

        // Record student view automatically
        if (!isAdmin && !isTeacher) {
          api.post(`/materials/${id}/views`).catch(() => {});
        } else {
          // If teacher or admin, load viewers list
          api.get<ApiResponse<any[]>>(`/materials/${id}/viewers`)
            .then((r) => setViewers(r.data.data))
            .catch(() => {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadMaterial();
  }, [id, isAdmin, isTeacher]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading module...</div>;
  }

  if (!material) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Material not found.</p>
        <Link to="/materials" className="text-emerald-600 hover:text-emerald-700 font-semibold mt-2 inline-block">
          Back to Materials
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/materials"
        className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to materials</span>
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
              {material.subjectName}
            </span>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Eye className="w-4 h-4" />
              <span>{material.totalViews} views</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">{material.title}</h2>
          <p className="text-sm text-slate-600 mt-2">{material.description}</p>

          <div className="flex items-center flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4 text-slate-400" />
              <span>Guru Pengampu: <strong>{material.teacherName}</strong></span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Kelas: <strong>{material.classroomName || 'Semua Kelas'}</strong></span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Dipublikasikan: {new Date(material.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {material.content && (
          <div className="prose prose-slate max-w-none pt-4 border-t border-slate-100 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {material.content}
          </div>
        )}

        {/* Attachment download */}
        {material.fileUrl && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Berkas Lampiran ({material.type})</p>
                <p className="text-xs text-slate-500">Unduh atau buka modul silabus pembelajaran</p>
              </div>
            </div>
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Buka Dokumen</span>
            </a>
          </div>
        )}
      </div>

      {/* Teacher / Admin Analytics: Viewers Table */}
      {(isAdmin || isTeacher) && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Student Reading Activity ({viewers.length} Completed)</span>
            </h3>
          </div>

          {viewers.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No students have accessed this material yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {viewers.map((v) => (
                <div key={v.studentId} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{v.studentName}</span>
                    <span className="font-mono text-slate-400 ml-2">({v.nis})</span>
                  </div>
                  <div className="text-slate-400">
                    {new Date(v.viewedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
