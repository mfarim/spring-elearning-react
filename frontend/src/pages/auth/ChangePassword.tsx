import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // BCrypt limit

export const ChangePassword: React.FC = () => {
  const { user, changePassword, logout } = useAuthStore();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forced = !!user?.mustChangePassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_LENGTH || newPassword.length > MAX_LENGTH) {
      setError(`Password baru harus ${MIN_LENGTH}–${MAX_LENGTH} karakter.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const data = err.response?.data;
      const fieldErrors = data?.data && typeof data.data === 'object' ? Object.values(data.data).join(' ') : '';
      setError(fieldErrors || data?.message || 'Gagal mengganti password. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const inputType = showPasswords ? 'text' : 'password';
  const inputClass =
    'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ganti Password</h1>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        {forced && (
          <div className="mb-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Akun Anda masih memakai password default atau password yang dibuat admin. Demi keamanan,
              silakan buat password baru sebelum melanjutkan.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-semibold text-gray-700 mb-1">
              Password saat ini
            </label>
            <input
              id="currentPassword"
              type={inputType}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold text-gray-700 mb-1">
              Password baru
            </label>
            <input
              id="newPassword"
              type={inputType}
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-gray-400">Minimal {MIN_LENGTH} karakter.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">
              Ulangi password baru
            </label>
            <input
              id="confirmPassword"
              type={inputType}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 cursor-pointer"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPasswords ? 'Sembunyikan password' : 'Tampilkan password'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-xs">
          {forced ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-gray-500 hover:text-emerald-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
          )}
          <button type="button" onClick={logout} className="text-gray-500 hover:text-rose-600 cursor-pointer">
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
