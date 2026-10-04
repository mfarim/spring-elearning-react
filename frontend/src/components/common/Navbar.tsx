import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, UserCheck, ShieldAlert, BookOpen, Menu, X } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileOpen }) => {
  const { user, logout, stopImpersonate } = useAuthStore();

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.roles.includes('ROLE_ADMIN')) {
      return (
        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
          Admin
        </span>
      );
    }
    if (user.roles.includes('ROLE_TEACHER')) {
      return (
        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
          Guru
        </span>
      );
    }
    return (
      <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-200">
        Siswa
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
      {user?.impersonatedBy && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium animate-pulse">
          <div className="flex items-center space-x-2 truncate">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">
              Mode Login As: <strong>{user.name}</strong> ({user.email})
            </span>
          </div>
          <button
            onClick={() => stopImpersonate()}
            className="bg-white text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs flex items-center shrink-0 ml-2 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Keluar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="-m-2 p-2 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg md:hidden transition"
            aria-label="Toggle mobile menu"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="h-5 w-px bg-gray-200 md:hidden" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-none">
                Spring E-Learning
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
                Learning Management & CBT System
              </p>
            </div>
          </div>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-3 pr-2 sm:pr-4 border-r border-gray-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-gray-800 leading-tight">
                {user?.name}
              </div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            {getRoleBadge()}
          </div>

          <button
            onClick={logout}
            title="Keluar dari Aplikasi"
            className="flex items-center space-x-1.5 text-sm text-gray-600 hover:text-rose-600 transition px-2.5 sm:px-3 py-2 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};

