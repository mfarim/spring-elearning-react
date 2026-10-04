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
  X,
} from 'lucide-react';

interface SidebarProps {
  closeMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ closeMobileMenu }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes('ROLE_ADMIN');
  const isTeacher = user?.roles.includes('ROLE_TEACHER');

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
      isActive
        ? 'bg-white text-emerald-700 shadow-sm font-semibold'
        : 'text-emerald-100 hover:bg-white/10 font-medium'
    }`;

  const getRoleLabel = () => {
    if (isAdmin) return 'Administrator';
    if (isTeacher) return 'Guru Pengajar';
    return 'Siswa';
  };

  return (
    <aside className="flex grow flex-col h-full overflow-y-auto bg-gradient-to-b from-[#059669] to-[#065f46] text-white select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Spring E-Learning Logo"
            className="w-9 h-9 rounded-xl object-cover shadow-xs border border-white/20"
          />
          <span className="text-base font-bold text-white tracking-tight">
            Spring E-Learning
          </span>
        </div>
        {closeMobileMenu && (
          <button
            type="button"
            onClick={closeMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {/* Main Menu */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">
            Menu Utama
          </p>
          <div className="space-y-0.5">
            <NavLink to="/dashboard" onClick={closeMobileMenu} className={navClass}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </NavLink>
          </div>
        </div>

        {/* Admin Management */}
        {isAdmin && (
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">
              Manajemen & User
            </p>
            <div className="space-y-0.5">
              <NavLink to="/teachers" onClick={closeMobileMenu} className={navClass}>
                <UserCheck className="w-5 h-5" />
                <span>Guru</span>
              </NavLink>
              <NavLink to="/students" onClick={closeMobileMenu} className={navClass}>
                <Users className="w-5 h-5" />
                <span>Siswa</span>
              </NavLink>
              <NavLink to="/classrooms" onClick={closeMobileMenu} className={navClass}>
                <GraduationCap className="w-5 h-5" />
                <span>Kelas</span>
              </NavLink>
              <NavLink to="/subjects" onClick={closeMobileMenu} className={navClass}>
                <BookMarked className="w-5 h-5" />
                <span>Mata Pelajaran</span>
              </NavLink>
              <NavLink to="/announcements" onClick={closeMobileMenu} className={navClass}>
                <Bell className="w-5 h-5" />
                <span>Pengumuman</span>
              </NavLink>
            </div>
          </div>
        )}

        {/* Academic & Learning CBT */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300/60">
            Akademik & CBT
          </p>
          <div className="space-y-0.5">
            <NavLink to="/exams" onClick={closeMobileMenu} className={navClass}>
              <FileCheck2 className="w-5 h-5" />
              <span>{isTeacher || isAdmin ? 'Ujian & CBT' : 'Ujian Saya'}</span>
            </NavLink>
            <NavLink to="/materials" onClick={closeMobileMenu} className={navClass}>
              <FileText className="w-5 h-5" />
              <span>Materi Belajar</span>
            </NavLink>
            <NavLink to="/assignments" onClick={closeMobileMenu} className={navClass}>
              <MessageSquareShare className="w-5 h-5" />
              <span>Tugas & Forum</span>
            </NavLink>
            {!isAdmin && !isTeacher && (
              <NavLink to="/grades" onClick={closeMobileMenu} className={navClass}>
                <Award className="w-5 h-5" />
                <span>Nilai & Rapor</span>
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* User Info footer */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white text-xs font-bold shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-emerald-200 truncate">{getRoleLabel()}</p>
          </div>
        </div>
        <p className="text-[10px] text-emerald-300/40 text-center mt-2">
          Spring Boot + React • v1.0.0
        </p>
      </div>
    </aside>
  );
};

