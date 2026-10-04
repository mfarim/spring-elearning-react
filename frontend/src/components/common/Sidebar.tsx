import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  GraduationCap,
  BookMarked,
  Users,
  UserCheck,
  FileCheck2,
  FileText,
  MessageSquareShare,
  Bell,
  Award,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Main Menu</div>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navClass}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </NavLink>
          </nav>
        </div>

        {isAdmin && (
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Academic & Users</div>
            <nav className="space-y-1">
              <NavLink to="/classrooms" className={navClass}>
                <GraduationCap className="w-5 h-5" />
                <span>Classrooms</span>
              </NavLink>
              <NavLink to="/subjects" className={navClass}>
                <BookMarked className="w-5 h-5" />
                <span>Subjects</span>
              </NavLink>
              <NavLink to="/teachers" className={navClass}>
                <UserCheck className="w-5 h-5" />
                <span>Teachers</span>
              </NavLink>
              <NavLink to="/students" className={navClass}>
                <Users className="w-5 h-5" />
                <span>Students</span>
              </NavLink>
              <NavLink to="/announcements" className={navClass}>
                <Bell className="w-5 h-5" />
                <span>Announcements</span>
              </NavLink>
            </nav>
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-4 mb-2">Learning & CBT</div>
          <nav className="space-y-1">
            <NavLink to="/exams" className={navClass}>
              <FileCheck2 className="w-5 h-5" />
              <span>{isTeacher || isAdmin ? 'CBT Exam & Questions' : 'My Exams'}</span>
            </NavLink>
            <NavLink to="/materials" className={navClass}>
              <FileText className="w-5 h-5" />
              <span>Learning Materials</span>
            </NavLink>
            <NavLink to="/assignments" className={navClass}>
              <MessageSquareShare className="w-5 h-5" />
              <span>Assignments</span>
            </NavLink>
            {!isAdmin && !isTeacher && (
              <NavLink to="/grades" className={navClass}>
                <Award className="w-5 h-5" />
                <span>Grades & Report</span>
              </NavLink>
            )}
          </nav>
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-500">
        <div className="font-semibold text-slate-700">EduPulse v1.0.0</div>
        <p className="mt-0.5">Spring Boot 3.4 + React 19 Monorepo</p>
      </div>
    </aside>
  );
};
