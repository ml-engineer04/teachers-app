import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  KeyRound,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { webApi } from '../../services/api/webApi';
import { notify } from '../../utils/notify';
import { generateOidcNonce, mountGoogleGisButton } from '../../services/auth/googleWebGis';
import { DeviceLimitModal, ActiveDevice } from './DeviceLimitModal';
import { BrandLogo } from '../common/BrandLogo';

export type AuthModalView =
  | 'LOGIN'
  | 'REGISTER'
  | 'VERIFY_EMAIL'
  | 'FORGOT_PASSWORD'
  | 'RESET_PASSWORD';

interface AuthModalProps {
  isOpen: boolean;
  initialView?: AuthModalView;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialView = 'LOGIN',
  onClose,
  onSuccess,
}) => {
  const { t, strings } = useI18n();
  const { loginWithTokens } = useAuth();

  const [view, setView] = useState<AuthModalView>(initialView);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend code countdown
  const [resendCooldown, setResendCooldown] = useState(0);

  // Device limit modal state
  const [deviceLimitOpen, setDeviceLimitOpen] = useState(false);
  const [activeDevices, setActiveDevices] = useState<ActiveDevice[]>([]);
  const [evictUserId, setEvictUserId] = useState<string | undefined>();
  const [evictGoogleIdToken, setEvictGoogleIdToken] = useState<string | undefined>();

  const googleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMessage(null);
    }
  }, [isOpen, initialView]);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Mount Google GIS Button
  useEffect(() => {
    if (!isOpen || (view !== 'LOGIN' && view !== 'REGISTER')) return;

    let mounted = true;
    const setupGoogle = async () => {
      if (!googleContainerRef.current) return;
      const nonce = generateOidcNonce();

      await mountGoogleGisButton({
        container: googleContainerRef.current,
        nonce,
        width: 340,
        onCredential: async (credential, usedNonce) => {
          if (!mounted) return;
          setLoading(true);
          setErrorMessage(null);
          try {
            const meta = webApi.getDeviceMeta();
            const tokens = await webApi.googleSignInWithDto({
              idToken: credential,
              nonce: usedNonce,
              ...meta,
            });
            await loginWithTokens(tokens);
            notify.success('Google orqali tizimga muvaffaqiyatli kirildi!', t('common.success'));
            onClose();
            onSuccess?.();
          } catch (err: any) {
            handleAuthError(err, { googleIdToken: credential });
          } finally {
            if (mounted) setLoading(false);
          }
        },
        onError: (msg) => {
          // Non-blocking Google init error
        },
      });
    };

    const timer = setTimeout(setupGoogle, 150);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, view]);

  if (!isOpen) return null;

  const handleAuthError = (err: any, extra?: { googleIdToken?: string }) => {
    const errorData = err?.data || {};
    const errMsg = err?.message || strings.common.unknownError;

    if (err?.status === 403 && (errMsg.includes('DEVICE_LIMIT_EXCEEDED') || errorData.activeDevices)) {
      setActiveDevices(errorData.activeDevices || []);
      setEvictUserId(errorData.userId);
      setEvictGoogleIdToken(extra?.googleIdToken);
      setDeviceLimitOpen(true);
      return;
    }

    setErrorMessage(errMsg);
    notify.error(errMsg, t('common.error'));
  };

  // Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage(strings.auth.fillAllFields);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const tokens = await webApi.loginWithEmail(email.trim(), password);
      await loginWithTokens(tokens);
      notify.success('Xush kelibsiz! Tizimga muvaffaqiyatli kirdingiz.', t('common.success'));
      onClose();
      onSuccess?.();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage(strings.auth.fillAllFields);
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Parol kamida 6 ta belgidan iborat bo‘lishi kerak');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await webApi.registerWithEmail({
        email: email.trim(),
        password,
        fullName: fullName.trim() || undefined,
      });

      if (res.requiresVerification) {
        notify.info(`${email} manziliga 6 xonali tasdiqlash kodi yuborildi!`, 'Emailni tasdiqlang');
        setView('VERIFY_EMAIL');
        setResendCooldown(60);
      } else {
        const tokens = await webApi.loginWithEmail(email.trim(), password);
        await loginWithTokens(tokens);
        notify.success('Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi!', t('common.success'));
        onClose();
        onSuccess?.();
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Verify Email OTP
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setErrorMessage(strings.auth.codePlaceholder);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const tokens = await webApi.verifyEmail(email.trim(), code.trim());
      await loginWithTokens(tokens);
      notify.success('Email muvaffaqiyatli tasdiqlandi!', t('common.success'));
      onClose();
      onSuccess?.();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    try {
      await webApi.resendEmailVerification(email.trim());
      setResendCooldown(60);
      notify.info('Yangi tasdiqlash kodi emailingizga qayta yuborildi.', 'Kod yuborildi');
    } catch (err: any) {
      notify.error(err?.message || 'Kodni yuborishda xatolik yuz berdi.');
    }
  };

  // Submit Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage(strings.auth.invalidEmail);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await webApi.forgotPassword(email.trim());
      notify.info('Parolni tiklash kodi emailingizga yuborildi.', 'Kod yuborildi');
      setView('RESET_PASSWORD');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6 || !newPassword.trim()) {
      setErrorMessage(strings.auth.fillAllFields);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await webApi.resetPassword(email.trim(), code.trim(), newPassword);
      notify.success('Parol muvaffaqiyatli yangilandi! Endi yangi parol bilan kiring.', t('common.success'));
      setView('LOGIN');
      setPassword('');
      setCode('');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#121A2D] border border-slate-200 dark:border-[#23304E] shadow-2xl p-6 sm:p-8 overflow-hidden">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* View: LOGIN or REGISTER */}
          {(view === 'LOGIN' || view === 'REGISTER') && (
            <div>
              <div className="flex justify-center mb-5">
                <BrandLogo size={36} />
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-6 border border-slate-200/80 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    view === 'LOGIN'
                      ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {strings.auth.loginTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('REGISTER');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    view === 'REGISTER'
                      ? 'bg-white dark:bg-[#121A2D] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {strings.auth.registerTab}
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {view === 'LOGIN' ? strings.auth.loginTitle : strings.auth.registerTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {view === 'LOGIN' ? strings.auth.loginSubtitle : strings.auth.registerSubtitle}
                </p>
              </div>

              {/* Error Alert Box */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={view === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3.5">
                {view === 'REGISTER' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {strings.auth.fullNameLabel}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={strings.auth.fullNamePlaceholder}
                        className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {strings.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={strings.auth.emailPlaceholder}
                      required
                      autoComplete="email"
                      className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {strings.auth.passwordLabel}
                    </label>
                    {view === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setView('FORGOT_PASSWORD');
                          setErrorMessage(null);
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {strings.auth.forgotLink}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={strings.auth.passwordPlaceholder}
                      required
                      className="w-full h-11 pl-10 pr-11 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-glow active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{view === 'LOGIN' ? strings.auth.loginButton : strings.auth.registerButton}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] font-bold uppercase">
                  <span className="bg-white dark:bg-[#121A2D] px-3 text-slate-400">
                    {strings.auth.orDivider}
                  </span>
                </div>
              </div>

              {/* Google Button Container */}
              <div className="flex justify-center w-full min-h-[44px]">
                <div ref={googleContainerRef} className="w-full flex justify-center" />
              </div>
            </div>
          )}

          {/* View: VERIFY_EMAIL */}
          {view === 'VERIFY_EMAIL' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {strings.auth.verifyTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {email} manziliga yuborilgan 6 xonali tasdiqlash kodini kiriting
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {strings.auth.codeLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-12 text-center text-xl font-mono tracking-widest font-black rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.verifyButton}</span>}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  >
                    {strings.common.back}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    {resendCooldown > 0
                      ? `${strings.auth.resendCodeButton} (${resendCooldown}s)`
                      : strings.auth.resendCodeButton}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* View: FORGOT_PASSWORD */}
          {view === 'FORGOT_PASSWORD' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {strings.auth.forgotTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {strings.auth.forgotSubtitle}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {strings.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={strings.auth.emailPlaceholder}
                      required
                      className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.sendCodeButton}</span>}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                  >
                    {strings.auth.backToLogin}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* View: RESET_PASSWORD */}
          {view === 'RESET_PASSWORD' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {strings.auth.resetTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {strings.auth.resetSubtitle}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {strings.auth.codeLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-11 text-center font-mono text-base font-bold rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {strings.auth.newPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={strings.auth.newPasswordPlaceholder}
                    required
                    className="w-full h-11 px-4 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.resetButton}</span>}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600"
                  >
                    {strings.auth.backToLogin}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 2-Device Limit Modal */}
      <DeviceLimitModal
        isOpen={deviceLimitOpen}
        devices={activeDevices}
        userId={evictUserId}
        googleIdToken={evictGoogleIdToken}
        onClose={() => setDeviceLimitOpen(false)}
        onDeviceEvicted={() => {
          setDeviceLimitOpen(false);
          // If we had a pending form, retry automatically
          if (password) {
            handleLogin({ preventDefault: () => {} } as any);
          }
        }}
      />
    </>
  );
};
