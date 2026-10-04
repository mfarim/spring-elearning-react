import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import type { Announcement, ApiResponse } from '../../types';
import {
  GraduationCap,
  BookMarked,
  FileCheck2,
  MessageSquareShare,
  Users,
  Clock,
  ArrowRight,
  BookOpen,
  Bell,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState({
    classrooms: 0,
    subjects: 0,
    students: 0,
    exams: 0,
    materials: 0,
    assignments: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [examsRes, materialsRes, assignmentsRes, annRes] = await Promise.all([
          api.get('/exams').catch(() => ({ data: { data: [] } })),
          api.get('/materials').catch(() => ({ data: { data: [] } })),
          api.get('/assignments').catch(() => ({ data: { data: [] } })),
          api.get<ApiResponse<Announcement[]>>('/announcements').catch(() => ({ data: { data: [] } })),
        ]);

        setAnnouncements(annRes.data.data?.slice(0, 3) || []);

        let classroomsCount = 0;
        let subjectsCount = 0;
        let studentsCount = 0;

        if (isAdmin) {
          const [crRes, subRes, stRes] = await Promise.all([
            api.get('/classrooms').catch(() => ({ data: { data: [] } })),
            api.get('/subjects').catch(() => ({ data: { data: [] } })),
            api.get('/students').catch(() => ({ data: { data: [] } })),
          ]);
          classroomsCount = crRes.data.data?.length || 0;
          subjectsCount = subRes.data.data?.length || 0;
          studentsCount = stRes.data.data?.length || 0;
        }

        setStats({
          classrooms: classroomsCount,
          subjects: subjectsCount,
          students: studentsCount,
          exams: examsRes.data.data?.length || 0,
          materials: materialsRes.data.data?.length || 0,
          assignments: assignmentsRes.data.data?.length || 0,
        });
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      }
    };

    fetchDashboardData();
  }, [isAdmin]);

  return (
    <div className="space-y-8">
      {/* Announcements Noticeboard */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3.5 shadow-xs"
            >
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-amber-900">{a.title}</h4>
                  <span className="text-[11px] text-amber-700/80">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">{a.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#059669] to-[#064e3b] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 border border-white/20 mb-4">
            Tahun Ajaran 2026/2027
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {user?.name}!
          </h2>
          <p className="mt-2 text-emerald-100/90 text-sm leading-relaxed">
            {isAdmin
              ? 'Kelola kurikulum akademik, supervisi guru & siswa, publikasikan pengumuman, dan pantau operasional ujian CBT sekolah.'
              : isTeacher
              ? 'Rancang ujian CBT interaktif, kelola bank soal, periksa jawaban siswa, dan unggah materi pembelajaran.'
              : 'Akses materi pembelajaran kelas, ikuti ujian CBT terjadwal dengan sistem anti-cheat, dan kumpulkan tugas.'}
          </p>
        </div>
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {isAdmin && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Kelas</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.classrooms}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <BookMarked className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Mata Pelajaran</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.subjects}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Siswa Terdaftar</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.students}</h3>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Ujian CBT</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.exams}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Materi Pelajaran</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.materials}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <MessageSquareShare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Tugas Aktif</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.assignments}</h3>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Navigasi Cepat</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Link
            to="/exams"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="mt-4 text-base font-bold text-slate-800">
              {isTeacher || isAdmin ? 'Manajemen Ujian CBT' : 'Ikuti Ujian CBT'}
            </h4>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {isTeacher || isAdmin
                ? 'Buat bank soal, atur jadwal ujian, dan buka ruang monitoring live ujian siswa.'
                : 'Bergabung ke sesi ujian CBT dengan pengawasan anti-cheat dan autosave otomatis.'}
            </p>
          </Link>

          <Link
            to="/materials"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="mt-4 text-base font-bold text-slate-800">Materi Pelajaran</h4>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Akses silabus digital, modul bacaan, dan materi pembelajaran interaktif.
            </p>
          </Link>

          {!isAdmin && !isTeacher ? (
            <Link
              to="/grades"
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-800">Rapor & Nilai Akademik</h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Lihat riwayat nilai tugas, ujian CBT, dan transkrip rapor hasil belajar Anda.
              </p>
            </Link>
          ) : (
            <Link
              to="/assignments"
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-800">Tugas & Diskusi</h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Kumpulkan file tugas, beri penilaian siswa, dan berdiskusi di forum kelas.
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
