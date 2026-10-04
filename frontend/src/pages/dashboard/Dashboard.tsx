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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-4">
            Academic Session 2026/2027
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-2 text-indigo-100/90 text-sm leading-relaxed">
            {isAdmin
              ? 'Manage academic curriculums, supervise teachers & students, post announcements, and oversee school-wide CBT operations.'
              : isTeacher
              ? 'Design interactive examinations, manage question banks, review student submissions, and host discussions.'
              : 'Access your classroom learning materials, take scheduled CBT examinations with secure anti-cheat, and submit assignments.'}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Classrooms</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.classrooms}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <BookMarked className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Subjects</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.subjects}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Registered Students</p>
                <h3 className="text-2xl font-bold text-slate-800">{stats.students}</h3>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">CBT Examinations</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.exams}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Learning Materials</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.materials}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <MessageSquareShare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Assignments</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.assignments}</h3>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/exams"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-md transition duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="mt-4 text-base font-bold text-slate-800">
              {isTeacher || isAdmin ? 'CBT Exam Management' : 'Take CBT Examinations'}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {isTeacher || isAdmin
                ? 'Create questions, manage schedules, and open live monitor rooms.'
                : 'Join live exam sessions with fullscreen proctoring and autosave.'}
            </p>
          </Link>

          <Link
            to="/materials"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-md transition duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
            <h4 className="mt-4 text-base font-bold text-slate-800">Learning Materials</h4>
            <p className="mt-1 text-xs text-slate-500">
              Access digital syllabus, textbooks, and interactive lecture modules.
            </p>
          </Link>

          {!isAdmin && !isTeacher ? (
            <Link
              to="/grades"
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-800">Grades & Academic Report</h4>
              <p className="mt-1 text-xs text-slate-500">
                View your complete gradebook, GPA, and subject breakdown.
              </p>
            </Link>
          ) : (
            <Link
              to="/assignments"
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-xs hover:shadow-md transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
              </div>
              <h4 className="mt-4 text-base font-bold text-slate-800">Assignments & Discussions</h4>
              <p className="mt-1 text-xs text-slate-500">
                Submit homework files, receive grades, and participate in classroom forums.
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
