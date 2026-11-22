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
    let resizeTimer: any = null;

    const setupGoogle = async () => {
      if (!googleContainerRef.current) return;
      const nonce = generateOidcNonce();

      // Dynamically calculate width to match available container width (Google GIS min: 200, max: 400)
      const containerW =
        googleContainerRef.current.clientWidth ||
        googleContainerRef.current.parentElement?.clientWidth;
      const fallbackW = typeof window !== 'undefined' ? window.innerWidth - 64 : 300;
      const targetWidth = Math.min(360, Math.max(200, Math.floor(containerW || fallbackW)));

      await mountGoogleGisButton({
        container: googleContainerRef.current,
        nonce,
        width: targetWidth,
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

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mounted) setupGoogle();
      }, 300);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
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
      notify.success('Xuş kelibsiz! Tizimga muvaffaqiyatli kirdingiz.', t('common.success'));
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
      setErrorMessage(strings.auth.passwordShort);
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
        notify.info(`${email} manziliga 6 xonali tasdiqlaş kodi yuborildi!`, 'Emailni tasdiqlaş');
        setView('VERIFY_EMAIL');
        setResendCooldown(60);
      } else {
        const tokens = await webApi.loginWithEmail(email.trim(), password);
        await loginWithTokens(tokens);
        notify.success('Röyxatdan ötiş muvaffaqiyatli yakunlandi!', t('common.success'));
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
      notify.info('Yangi tasdiqlaş kodi emailingizga qayta yuborildi.', 'Kod yuborildi');
    } catch (err: any) {
      notify.error(err?.message || 'Kodni yuborişda xatolik yuz berdi.');
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
      notify.info('Parolni tiklaş kodi emailingizga yuborildi.', 'Kod yuborildi');
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-[#0E1220]/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-md max-h-[94vh] overflow-y-auto rounded-3xl bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-2xl px-4 py-5 sm:p-8">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A] transition-colors"
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
              <div className="flex bg-[#EEF1F8] dark:bg-[#10152A] p-1 rounded-2xl mb-6 border border-[#E6E9F2] dark:border-[#262C42]">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    view === 'LOGIN'
                      ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#2A4FB8] dark:text-[#8FA8F7] shadow-sm'
                      : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
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
                      ? 'bg-[#FFFFFF] dark:bg-[#171C2E] text-[#2A4FB8] dark:text-[#8FA8F7] shadow-sm'
                      : 'text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
                  }`}
                >
                  {strings.auth.registerTab}
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
                  {view === 'LOGIN' ? strings.auth.loginTitle : strings.auth.registerTitle}
                </h3>
                <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {view === 'LOGIN' ? strings.auth.loginSubtitle : strings.auth.registerSubtitle}
                </p>
              </div>

              {/* Error Alert Box */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-[#FCEBEA] dark:bg-[#3A1B1D] border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-xs text-[#B3322A] dark:text-[#F0857A]">
                  {errorMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={view === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3.5">
                {view === 'REGISTER' && (
                  <div>
                    <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                      {strings.auth.fullNameLabel}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-[#7A8299] dark:text-[#8B93AD]" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={strings.auth.fullNamePlaceholder}
                        className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                    {strings.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#7A8299] dark:text-[#8B93AD]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={strings.auth.emailPlaceholder}
                      required
                      autoComplete="email"
                      className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                      {strings.auth.passwordLabel}
                    </label>
                    {view === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setView('FORGOT_PASSWORD');
                          setErrorMessage(null);
                        }}
                        className="text-xs font-bold text-[#2A4FB8] dark:text-[#8FA8F7] hover:underline"
                      >
                        {strings.auth.forgotLink}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#7A8299] dark:text-[#8B93AD]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={strings.auth.passwordPlaceholder}
                      required
                      className="w-full h-11 pl-10 pr-11 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                  <div className="w-full border-t border-[#E6E9F2] dark:border-[#262C42]" />
                </div>
                <div className="relative flex justify-center text-[11px] font-bold uppercase">
                  <span className="bg-[#FFFFFF] dark:bg-[#171C2E] px-3 text-[#7A8299] dark:text-[#8B93AD]">
                    {strings.auth.orDivider}
                  </span>
                </div>
              </div>

              {/* Google Button Container */}
              <div className="flex justify-center w-full min-h-[44px] overflow-hidden">
                <div
                  ref={googleContainerRef}
                  className="w-full flex justify-center [&>div]:!max-w-full [&_iframe]:!max-w-full"
                />
              </div>
            </div>
          )}

          {/* View: VERIFY_EMAIL */}
          {view === 'VERIFY_EMAIL' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.auth.verifyTitle}
                </h3>
                <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {email} manziliga yuborilgan 6 xonali tasdiqlaş kodini kiriting
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-[#FCEBEA] dark:bg-[#3A1B1D] border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-xs text-[#B3322A] dark:text-[#F0857A]">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                    {strings.auth.codeLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-12 text-center text-xl font-mono tracking-widest font-black rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full h-11 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.verifyButton}</span>}
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="font-semibold text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]"
                  >
                    {strings.common.back}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="font-bold text-[#2A4FB8] dark:text-[#8FA8F7] hover:underline disabled:opacity-50"
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
                <div className="w-12 h-12 rounded-2xl bg-[#FDF3E1] dark:bg-[#3A2B10] text-[#8A5A0B] dark:text-[#F0B95B] flex items-center justify-center mx-auto mb-3">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.auth.forgotTitle}
                </h3>
                <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {strings.auth.forgotSubtitle}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-[#FCEBEA] dark:bg-[#3A1B1D] border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-xs text-[#B3322A] dark:text-[#F0857A]">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                    {strings.auth.emailLabel}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#7A8299] dark:text-[#8B93AD]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={strings.auth.emailPlaceholder}
                      required
                      className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.sendCodeButton}</span>}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:text-[#2A4FB8] dark:hover:text-[#8FA8F7]"
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
                <div className="w-12 h-12 rounded-2xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.auth.resetTitle}
                </h3>
                <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {strings.auth.resetSubtitle}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-[#FCEBEA] dark:bg-[#3A1B1D] border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-xs text-[#B3322A] dark:text-[#F0857A]">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                    {strings.auth.codeLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full h-11 text-center font-mono text-base font-bold rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                    {strings.auth.newPasswordLabel}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={strings.auth.newPasswordPlaceholder}
                    required
                    className="w-full h-11 px-4 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/20 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5] dark:placeholder:text-[#69718C]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{strings.auth.resetButton}</span>}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setView('LOGIN')}
                    className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:text-[#2A4FB8] dark:hover:text-[#8FA8F7]"
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
