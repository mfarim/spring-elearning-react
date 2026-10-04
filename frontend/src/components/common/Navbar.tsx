import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, UserCheck, ShieldAlert, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, stopImpersonate } = useAuthStore();

  const getRoleBadge = () => {
    if (!user) return null;
    if (user.roles.includes('ROLE_ADMIN')) {
      return <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-200">Admin</span>;
    }
    if (user.roles.includes('ROLE_TEACHER')) {
      return <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">Teacher</span>;
    }
    return <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">Student</span>;
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {user?.impersonatedBy && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium animate-pulse">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5" />
            <span>
              Impersonation Active: Viewing system as <strong>{user.name}</strong> ({user.email})
            </span>
          </div>
          <button
            onClick={() => stopImpersonate()}
            className="bg-white text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 mr-1" />
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">EduPulse CBT & LMS</h1>
            <p className="text-xs text-slate-500 mt-0.5">Enterprise Learning & Computer Based Test</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 pr-4 border-r border-slate-200">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.email}</div>
            </div>
            {getRoleBadge()}
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center space-x-1.5 text-sm text-slate-600 hover:text-rose-600 transition px-3 py-2 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
