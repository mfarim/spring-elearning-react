import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type {
  Assignment,
  Submission,
  Discussion,
  ApiResponse,
} from '../../types';
import {
  ArrowLeft,
  Clock,
  Send,
  UploadCloud,
  CheckCircle,
  MessageSquare,
  FileCheck,
  Download,
  Award,
} from 'lucide-react';

export const AssignmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  // Student submission form
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Teacher grading
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState(100);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Discussion comment
  const [commentText, setCommentText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [aRes, dRes] = await Promise.all([
        api.get<ApiResponse<Assignment>>(`/assignments/${id}`),
        api.get<ApiResponse<Discussion[]>>(`/assignments/${id}/discussions`),
      ]);
      setAssignment(aRes.data.data);
      setDiscussions(dRes.data.data);

      if (isAdmin || isTeacher) {
        const sRes = await api.get<ApiResponse<Submission[]>>(`/assignments/${id}/submissions`);
        setSubmissions(sRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      if (notes) formData.append('notes', notes);
      if (file) formData.append('file', file);

      await api.post(`/assignments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Assignment submitted successfully!');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    try {
      await api.post(`/assignments/submissions/${selectedSub.id}/grade`, {
        score: Number(gradeScore),
        feedback: gradeFeedback,
      });

      setGradeModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to grade submission');
    }
  };

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await api.post(`/assignments/${id}/discussions`, {
        message: commentText,
      });
      setCommentText('');
      loadData();
    } catch (err: any) {
      alert('Failed to post comment');
    }
  };

  if (loading && !assignment) {
    return <div className="p-8 text-center text-slate-500">Loading assignment details...</div>;
  }

  if (!assignment) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Assignment not found.</p>
        <Link to="/assignments" className="text-emerald-600 hover:text-emerald-700 font-semibold mt-2 inline-block">
          Back to Assignments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        to="/assignments"
        className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Assignments</span>
      </Link>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            {assignment.subjectName}
          </span>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Batas: {new Date(assignment.dueDate).toLocaleString()}</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">{assignment.title}</h2>
        <p className="text-sm text-slate-600">{assignment.description}</p>

        {assignment.instructions && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <strong className="block text-slate-900 font-bold mb-1">Task Instructions:</strong>
            <p className="whitespace-pre-wrap leading-relaxed">{assignment.instructions}</p>
          </div>
        )}
      </div>

      {/* Student: Submit Form */}
      {!isAdmin && !isTeacher && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span>Pengumpulan Tugas Saya</span>
          </h3>

          {assignment.hasSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Tugas Berhasil Dikumpulkan</span>
              </div>
              <p className="text-xs text-emerald-700">
                Diserahkan pada: {new Date(assignment.studentSubmittedAt || '').toLocaleString()}
              </p>
              {assignment.studentScore !== null && assignment.studentScore !== undefined && (
                <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-emerald-700" />
                  <span className="text-sm font-bold text-emerald-900">
                    Nilai: {assignment.studentScore} / {assignment.maxScore}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleStudentSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unggah Berkas / Dokumen Tugas</label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 transition">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk guru pengampu..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !file}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Mengunggah Berkas...' : 'Kumpulkan Tugas'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Teacher / Admin: Submissions Grading Table */}
      {(isAdmin || isTeacher) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Student Submissions ({submissions.length})
            </h3>
          </div>

          {submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Belum ada tugas yang dikumpulkan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Siswa</th>
                    <th className="px-6 py-4">Tanggal Pengumpulan</th>
                    <th className="px-6 py-4">Berkas</th>
                    <th className="px-6 py-4">Nilai</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{s.studentName}</div>
                        <div className="text-xs font-mono text-slate-400">NIS: {s.studentNis}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs">
                        {new Date(s.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {s.filePath ? (
                          <a
                            href={`/api/v1/files/${s.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 text-xs text-emerald-600 font-semibold hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {s.score !== null && s.score !== undefined ? (
                          <span className="font-bold text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {s.score} / {assignment.maxScore}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                            Belum Dinilai
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setGradeScore(s.score ?? 100);
                            setGradeFeedback(s.feedback || '');
                            setGradeModalOpen(true);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border border-emerald-200"
                        >
                          Beri Nilai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Classroom Discussion Board */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <span>Forum Diskusi Kelas ({discussions.length})</span>
        </h3>

        <form onSubmit={handlePostDiscussion} className="flex gap-3">
          <input
            type="text"
            required
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ajukan pertanyaan atau diskusikan tugas ini..."
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </form>

        <div className="divide-y divide-slate-100 space-y-4">
          {discussions.map((d) => (
            <div key={d.id} className="pt-4 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-800">{d.userName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">
                  {d.userRole}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(d.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{d.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grade Submission Modal */}
      {gradeModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Grade Submission: {selectedSub.studentName}
            </h3>

            <form onSubmit={handleGradeSubmission} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Score (0 - {assignment.maxScore})</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={assignment.maxScore}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructor Feedback</label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Suggestions, feedback, and rubric comments..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGradeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
