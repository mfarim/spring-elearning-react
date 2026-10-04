import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import type { GradeReportResponse, ApiResponse } from '../../types';
import {
  Award,
  BookMarked,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';

export const Grades: React.FC = () => {
  const [report, setReport] = useState<GradeReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        const res = await api.get<ApiResponse<GradeReportResponse>>('/student/grades');
        setReport(res.data.data);
      } catch (e) {
        console.error('Failed to load grade report', e);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading academic report card...</div>;
  }

  if (!report) {
    return <div className="p-12 text-center text-slate-500">No grades data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Grades & Progress</h2>
        <p className="text-xs text-slate-500 mt-1">
          Detailed performance breakdown across CBT examinations and course assignments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#059669] to-[#064e3b] rounded-3xl p-6 text-white shadow-xl shadow-emerald-700/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Rata-Rata Nilai (GPA)</p>
            <h3 className="text-4xl font-extrabold mt-1">{report.overallGpa} / 100</h3>
            <p className="text-xs text-emerald-200 mt-1">{report.studentName} • {report.classroomName}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ujian Selesai</p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{report.totalCompletedExams}</h3>
            <p className="text-xs text-slate-400 mt-1">Sesi ujian diselesaikan</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ujian Lulus</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{report.totalPassedExams}</h3>
            <p className="text-xs text-slate-400 mt-1">Di atas batas KKM</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Subject Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <BookMarked className="w-5 h-5 text-emerald-600" />
            <span>Rincian Nilai per Mata Pelajaran</span>
          </h3>
        </div>

        {report.subjects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Belum ada mata pelajaran terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[650px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">SKS</th>
                  <th className="px-6 py-4">Rata Ujian CBT</th>
                  <th className="px-6 py-4">Rata Tugas</th>
                  <th className="px-6 py-4">Nilai Akhir</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.subjects.map((sub) => (
                  <tr key={sub.subjectId} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{sub.subjectName}</div>
                      <div className="text-xs font-mono text-slate-400">{sub.subjectCode}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{sub.credits} SKS</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{sub.avgExamScore} / 100</div>
                      <div className="text-[11px] text-slate-400">{sub.totalExams} ujian diikuti</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{sub.avgAssignmentScore} / 100</div>
                      <div className="text-[11px] text-slate-400">{sub.totalAssignments} tugas diserahkan</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-base text-emerald-600">
                      {sub.overallScore > 0 ? `${sub.overallScore}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sub.overallScore >= 75 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase border border-emerald-200">
                          Lulus
                        </span>
                      ) : sub.overallScore > 0 ? (
                        <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase border border-rose-200">
                          Remedial
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada nilai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
