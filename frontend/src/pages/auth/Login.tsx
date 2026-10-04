import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Eye,
  EyeOff,
  CheckCircle2,
  MonitorCheck,
  Smartphone,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email atau password yang Anda masukkan salah');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel — Emerald Branding (Companion to laravel-elearning) */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#059669] to-[#064e3b] relative overflow-hidden select-none">
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Spring E-Learning Logo"
              className="w-11 h-11 rounded-xl object-cover shadow-sm border border-white/20"
            />
            <div>
              <span className="text-xl font-bold text-white tracking-tight">
                Spring E-Learning
              </span>
              <p className="text-[11px] text-emerald-200">Spring Boot & React CBT</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="my-auto py-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span className="text-xs font-medium text-white/90">
                Platform E-Learning & CBT Terintegrasi
              </span>
            </div>

            <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Selamat Datang<br />Kembali!
            </h1>
            <p className="text-base text-emerald-100 mb-8 max-w-md leading-relaxed">
              Kelola pembelajaran, materi akademik, dan ujian CBT sekolah Anda dengan
              mudah, aman, dan efisien.
            </p>

            {/* Stats */}
            <div className="flex gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/10 flex-1">
                <p className="text-2xl font-bold text-white">100+</p>
                <p className="text-xs text-emerald-200">Sekolah Mitra</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/10 flex-1">
                <p className="text-2xl font-bold text-white">50K+</p>
                <p className="text-xs text-emerald-200">Siswa Aktif</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/10 flex-1">
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-xs text-emerald-200">CBT Uptime</p>
              </div>
            </div>

            {/* Feature bullets */}
            <div className="space-y-3.5 text-sm text-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                </div>
                <span>Dashboard analitik real-time & manajemen kelas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <MonitorCheck className="w-4 h-4 text-emerald-200" />
                </div>
                <span>Ujian CBT aman dengan anti-cheat proctoring & timer</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-emerald-200" />
                </div>
                <span>Responsif untuk smartphone, tablet, dan desktop</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-emerald-300/60">
            © 2026 Spring E-Learning. All rights reserved.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full pointer-events-none" />
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile brand header (shown on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo.png"
              alt="Spring E-Learning Logo"
              className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-md shadow-emerald-600/20 object-cover"
            />
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Spring E-Learning</h2>
            <p className="text-xs text-gray-500 mt-1">Platform E-Learning & CBT Sekolah</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Masuk ke Akun Anda
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Silakan masukkan email dan password untuk mengakses portal.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@elearning.com"
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition placeholder:text-gray-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl pl-11 pr-11 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition placeholder:text-gray-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
              <span className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer">
                Lupa kata sandi?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-xs transition duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials matching laravel-elearning style */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="text-xs font-semibold text-gray-600 mb-3 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1.5">
              <span>Pilih Akun Demo Cepat:</span>
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@sekolah.id', 'password')}
                className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 py-2.5 px-2 text-xs font-medium text-gray-700 hover:text-emerald-700 transition cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('budi@sekolah.id', 'password')}
                className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 py-2.5 px-2 text-xs font-medium text-gray-700 hover:text-emerald-700 transition cursor-pointer"
              >
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>Guru</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('andi.pratama1@siswa.id', 'password')}
                className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 py-2.5 px-2 text-xs font-medium text-gray-700 hover:text-emerald-700 transition cursor-pointer"
              >
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <span>Siswa</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center">
              Koneksi terenkripsi Spring Boot Security & JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

