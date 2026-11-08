import React, { useState } from 'react';
import { BookOpen, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/apiClient';

interface AdminLoginScreenProps {
  onLoginSuccess: (adminData: { email: string; name: string; role?: string }) => void;
}

export function AdminLoginScreen({ onLoginSuccess }: AdminLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      setIsLoading(false);
      onLoginSuccess({
        email: res.admin.email,
        name: res.admin.email === 'mlrahmonjon@gmail.com' ? 'Super Admin Rahmonjon' : 'Administrator',
        role: res.admin.role,
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Login yoki parol noto‘g‘ri! Iltimos, qayta urinib ko‘ring.');
    }
  };

  const handleFillSuperAdmin = () => {
    setEmail('mlrahmonjon@gmail.com');
    setPassword('Qriadmin7$');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Pastel Blurs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl relative z-10 animate-fadeIn">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartTeacherBook</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Boshqaruv Paneli (Admin Portal)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold animate-shake">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Admin Elektron Pochta
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mlrahmonjon@gmail.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Maxfiy Parol
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Qriadmin7$"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Kirilmoqda...' : 'Tizimga Kirish'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Super Admin Credentials Helper */}
        <div className="mt-6 pt-6 border-t border-slate-700/60">
          <button
            type="button"
            onClick={handleFillSuperAdmin}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-500/30 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>👑 Super Admin Bilan Kirish (1-bosishda)</span>
          </button>
          <div className="mt-3 text-center space-y-0.5">
            <p className="text-[11px] text-slate-400 font-mono">
              Super Admin: <span className="text-amber-400 font-bold">mlrahmonjon@gmail.com</span>
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Parol: <span className="text-emerald-400 font-bold">Qriadmin7$</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
