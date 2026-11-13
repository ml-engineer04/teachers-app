import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/apiClient';
import { BrandLogo } from './BrandLogo';

interface AdminLoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string }) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Email va parolni kiriting');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await api.login(trimmedEmail, password);
      onLoginSuccess({
        email: res.admin?.email || trimmedEmail,
        name: res.admin?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin',
      });
    } catch (err: any) {
      const raw = String(err?.message || '');
      if (raw.includes('401') || raw.toLowerCase().includes('invalid')) {
        setErrorMsg("Email yoki parol noto'g'ri");
      } else {
        setErrorMsg("Server bilan bog'lanishda xatolik yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FF] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle decorative ambient blobs matching Mobile & Admin Portal */}
      <div className="pointer-events-none absolute -top-28 -left-24 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-24 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="w-full max-w-[430px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <BrandLogo size={46} darkSurface={false} subtitle="BOSHQARUV PORTALI" />
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-indigo-950/[0.05] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Tizimga kirish</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Davom etish uchun admin hisobingizni kiriting
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              Himoyalangan
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.uz"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Parol
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-900 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white font-bold text-sm shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <span>{loading ? 'Tekshirilmoqda...' : 'Admin panelga kirish'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] font-medium text-slate-400 mt-5">
          ilmçi • Raqamli Darsliklar Boshqaruvi
        </p>
      </div>
    </div>
  );
};
