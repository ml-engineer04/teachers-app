import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
  BackHandler,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import Svg, { Path, Rect, Circle, Polygon } from 'react-native-svg';
import { mobileApi } from '../services/api/mobileApi';
import { googleAuthService, GoogleAuthOutcome } from '../services/auth/googleAuthService';
import {
  generateOidcNonce,
  mountGoogleGisButton,
} from '../services/auth/googleWebGis';
import { secureStorage } from '../services/storage/secureStorage';
import { DeviceLimitModal } from '../components/DeviceLimitModal';
import { BrandLogo } from '../components/common/BrandLogo';
import { OfflineScreen } from '../components/common/OfflineScreen';
import { notify } from '../services/notifications/notificationService';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import type { AppLanguage } from '../services/storage/appPreferences';

interface WelcomeScreenProps {
  onGoogleSignIn: (user: { email: string; name: string; avatar?: string; photoUrl?: string }) => void;
}

type AuthStep =
  | 'INPUT_EMAIL'
  | 'INPUT_CODE'
  | 'FORGOT_PASSWORD'
  | 'LINK_GOOGLE'
  | 'SET_PIN'
  | 'CONFIRM_PIN';

type AuthMode = 'LOGIN' | 'REGISTER';
type VerificationPurpose = 'EMAIL_VERIFY' | 'OTP_LOGIN';
type RetryAction = 'LOGIN' | 'VERIFY_CODE' | 'LINK_GOOGLE' | 'GOOGLE_NATIVE' | null;

const GoogleLogoIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.35 24 12 24z"
    />
    <Path
      fill="#FBBC05"
      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.98 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
    />
  </Svg>
);

const HeroSceneIllustration = ({ dark = false }: { dark?: boolean }) => (
  <Svg width="100%" height={126} viewBox="0 0 300 130" fill="none">
    <Circle
      cx="60"
      cy="40"
      r="30"
      fill={dark ? 'rgba(99, 102, 241, 0.18)' : '#DBEAFE'}
      opacity="0.8"
    />
    <Circle
      cx="245"
      cy="36"
      r="24"
      fill={dark ? 'rgba(129, 140, 248, 0.16)' : '#E0E7FF'}
      opacity="0.85"
    />
    <Rect
      x="75"
      y="54"
      width="150"
      height="58"
      rx="8"
      fill={dark ? '#19233C' : '#FFFFFF'}
      stroke={dark ? '#334368' : '#C7D2FE'}
      strokeWidth="1.5"
    />
    <Polygon
      points="150,24 232,54 68,54"
      fill={dark ? '#25335E' : '#E0E7FF'}
      stroke={dark ? '#6366F1' : '#818CF8'}
      strokeWidth="1.5"
    />
    <Rect x="136" y="74" width="28" height="38" rx="6" fill={dark ? '#5558EC' : '#4F46E5'} />
    <Rect x="92" y="68" width="24" height="18" rx="4" fill={dark ? '#25335E' : '#DBEAFE'} />
    <Rect x="184" y="68" width="24" height="18" rx="4" fill={dark ? '#25335E' : '#DBEAFE'} />
    <Circle
      cx="44"
      cy="72"
      r="18"
      fill={dark ? '#1E294D' : '#EEF2FF'}
      stroke={dark ? '#3B4C7A' : '#C7D2FE'}
      strokeWidth="1.5"
    />
    <Path d="M38 69L48 64V76L38 81V69Z" fill={dark ? '#A5B4FC' : '#4F46E5'} />
    <Circle
      cx="256"
      cy="72"
      r="18"
      fill={dark ? 'rgba(251, 191, 36, 0.16)' : '#FEF3C7'}
      stroke={dark ? 'rgba(251, 191, 36, 0.4)' : '#FDE68A'}
      strokeWidth="1.5"
    />
    <Polygon points="256,64 265,69 256,74 247,69" fill={dark ? '#FBBF24' : '#D97706'} />
    <Rect x="252" y="73" width="8" height="4" rx="2" fill="#F59E0B" />
  </Svg>
);

const tr = (lang: AppLanguage, uz: string, ru: string, en: string) =>
  lang === 'ru' ? ru : lang === 'en' ? en : uz;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoogleSignIn }) => {
  const { colors, isDark } = useTheme();
  const { language, setLanguage, strings, t } = useI18n();
  const [step, setStep] = useState<AuthStep>('INPUT_EMAIL');
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [verificationPurpose, setVerificationPurpose] = useState<VerificationPurpose>('EMAIL_VERIFY');

  // Credentials & form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Forgot / Reset password state
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);

  // Google account linking state (Scenario C)
  const [linkingToken, setLinkingToken] = useState<string | null>(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const [linkingHasPassword, setLinkingHasPassword] = useState(true);
  const [linkingMethod, setLinkingMethod] = useState<'PASSWORD' | 'CODE'>('PASSWORD');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [linkingCode, setLinkingCode] = useState('');
  const [linkingCodeSent, setLinkingCodeSent] = useState(false);

  // 6-box OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedOtpIdx, setFocusedOtpIdx] = useState<number | null>(null);
  const [resendSeconds, setResendSeconds] = useState(45);

  // PIN creation state
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Pending authenticated user before PIN step completes
  const [pendingUser, setPendingUser] = useState<{
    email: string;
    name: string;
    avatar?: string;
    photoUrl?: string;
  } | null>(null);

  // Loading & feedback state
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (errorMsg) notify.error(strings.common.error, errorMsg);
  }, [errorMsg, strings.common.error]);

  useEffect(() => {
    if (successMsg) notify.success(strings.common.success, successMsg);
  }, [successMsg, strings.common.success]);

  // Device limit & offline state
  const [limitModalVisible, setLimitModalVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (limitModalVisible) {
        setLimitModalVisible(false);
        return true;
      }
      if (step !== 'INPUT_EMAIL') {
        setStep('INPUT_EMAIL');
        return true;
      }
      if (authMode === 'REGISTER') {
        setAuthMode('LOGIN');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [limitModalVisible, step, authMode]);
  const [conflictingDevices, setConflictingDevices] = useState<any[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | undefined>(undefined);
  const [lastRetryAction, setLastRetryAction] = useState<RetryAction>(null);
  const [isOfflineError, setIsOfflineError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    setIsOfflineError(false);
    await mobileApi.checkConnectivity().catch(() => false);
    setRefreshing(false);
  };

  // Web GIS button mounting
  const gisContainerRef = useRef<any>(null);
  const googleConfigured = googleAuthService.isGoogleClientConfigured();
  const [gisMounted, setGisMounted] = useState(false);

  const completeAuthenticatedSession = async (res: {
    accessToken: string;
    refreshToken: string;
    user: any;
  }) => {
    await googleAuthService.persistSessionResponse(res);
    const userObj = {
      email: res.user.email,
      name: res.user.fullName || res.user.email.split('@')[0],
      avatar: '',
      photoUrl: res.user.avatarUrl || undefined,
    };

    const hasPin = await secureStorage.hasPinCode();
    if (hasPin) {
      onGoogleSignIn(userObj);
    } else {
      setPendingUser(userObj);
      setStep('SET_PIN');
    }
  };

  const handleGoogleOutcome = async (outcome: GoogleAuthOutcome) => {
    setGoogleLoading(false);

    if (outcome.success && outcome.user) {
      const userObj = {
        email: outcome.user.email,
        name: outcome.user.fullName || outcome.user.email.split('@')[0],
        avatar: '',
        photoUrl: outcome.user.avatarUrl || undefined,
      };
      const hasPin = await secureStorage.hasPinCode();
      if (hasPin) {
        onGoogleSignIn(userObj);
      } else {
        setPendingUser(userObj);
        setStep('SET_PIN');
      }
      return;
    }

    if (outcome.deviceLimitExceeded) {
      setLastRetryAction('GOOGLE_NATIVE');
      setConflictingDevices(outcome.conflictingDevices || []);
      setPendingUserId(outcome.userId);
      setLimitModalVisible(true);
      return;
    }

    if (outcome.requiresAccountLinking && outcome.linkToken) {
      setLinkingToken(outcome.linkToken);
      setLinkingEmail(outcome.linkingEmail || '');
      const hasPwd = Boolean(outcome.linkingHasPassword);
      setLinkingHasPassword(hasPwd);
      setLinkingMethod(hasPwd ? 'PASSWORD' : 'CODE');
      setLinkingPassword('');
      setLinkingCode('');
      setLinkingCodeSent(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      setStep('LINK_GOOGLE');
      return;
    }

    if (outcome.errorMessage) {
      setErrorMsg(outcome.errorMessage);
    }
  };

  const handleWebCredentialRef = useRef<(cred: string, nonce: string) => void>(() => {});
  handleWebCredentialRef.current = async (credential: string, nonce: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    const outcome = await googleAuthService.signInWithCredential({
      idToken: credential,
      nonce,
    });
    await handleGoogleOutcome(outcome);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || step !== 'INPUT_EMAIL' || authMode !== 'LOGIN' || !googleConfigured) {
      setGisMounted(false);
      return;
    }

    let cancelled = false;
    const mount = async () => {
      const el = gisContainerRef.current as HTMLElement | null;
      if (!el || typeof HTMLElement === 'undefined' || !(el instanceof HTMLElement)) {
        return;
      }
      const nonce = generateOidcNonce();
      const ok = await mountGoogleGisButton({
        container: el,
        nonce,
        locale: language,
        width: 360,
        onCredential: (credential, usedNonce) => {
          if (!cancelled) {
            handleWebCredentialRef.current(credential, usedNonce);
          }
        },
        onError: (msg) => {
          if (!cancelled) {
            setErrorMsg(msg);
          }
        },
      });
      if (!cancelled) {
        setGisMounted(ok);
      }
    };

    mount();
    return () => {
      cancelled = true;
    };
  }, [step, authMode, googleConfigured, language]);

  // Countdown timer for 6-digit verification resend
  useEffect(() => {
    if (step !== 'INPUT_CODE' || resendSeconds <= 0) return;
    const t = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [step, resendSeconds]);

  const formatTimer = (secs: number) => {
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleApiError = (err: any, fallbackMsg: string, retryAction: RetryAction = null) => {
    if (err?.isNetworkError) {
      setIsOfflineError(true);
      notify.error(strings.modals.offlineTitle, strings.modals.offlineDesc);
      return;
    }
    if (err?.status === 403 && (err?.data?.code === 'DEVICE_LIMIT_EXCEEDED' || err?.data?.devices)) {
      setLastRetryAction(retryAction);
      setConflictingDevices(err.data.devices || []);
      setPendingUserId(err.data.userId);
      setLimitModalVisible(true);
      return;
    }
    setErrorMsg(err?.message || fallbackMsg);
  };

  // ---------------------------------------------------------------------------
  // Email + Password Login
  // ---------------------------------------------------------------------------
  const handleEmailLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg(strings.auth.invalidEmail);
      return;
    }
    if (!password) {
      setErrorMsg(strings.auth.fillAllFields);
      return;
    }

    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.loginWithEmail(cleanEmail, password);
      setAuthLoading(false);
      await completeAuthenticatedSession(res);
    } catch (err: any) {
      setAuthLoading(false);
      if (err?.status === 403 && err?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationPurpose('EMAIL_VERIFY');
        setOtpDigits(['', '', '', '', '', '']);
        setResendSeconds(45);
        await mobileApi.resendEmailVerification(cleanEmail).catch(() => {});
        setSuccessMsg(
          tr(
            language,
            'Emailingiz hali tasdiqlanmagan. Pochtadagi 6 xonali kodni kiriting.',
            'Email ещё не подтверждён. Введите 6-значный код из письма.',
            'Email not verified yet. Enter the 6-digit code sent to your inbox.',
          ),
        );
        setStep('INPUT_CODE');
        return;
      }
      handleApiError(
        err,
        tr(
          language,
          'Email yoki parol noto‘g‘ri.',
          'Неверный email или пароль.',
          'Invalid email or password.',
        ),
        'LOGIN',
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Email + Password Registration
  // ---------------------------------------------------------------------------
  const handleEmailRegister = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg(strings.auth.invalidEmail);
      return;
    }
    if (!password || password.length < 8) {
      setErrorMsg(
        tr(
          language,
          'Parol kamida 8 ta belgidan iborat bo‘lishi kerak',
          'Пароль должен содержать минимум 8 символов',
          'Password must be at least 8 characters',
        ),
      );
      return;
    }

    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.registerWithEmail({
        email: cleanEmail,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setAuthLoading(false);
      setVerificationPurpose('EMAIL_VERIFY');
      setOtpDigits(['', '', '', '', '', '']);
      setResendSeconds(45);
      setSuccessMsg(res.message);
      setStep('INPUT_CODE');
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Ro‘yxatdan o‘tishda xatolik yuz berdi.',
          'Ошибка при регистрации.',
          'Registration failed.',
        ),
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Email OTP Send / Resend & Verify (Both EMAIL_VERIFY and OTP_LOGIN)
  // ---------------------------------------------------------------------------
  const handleSendCode = async (overridePurpose?: VerificationPurpose) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg(strings.auth.invalidEmail);
      return;
    }

    const activePurpose = overridePurpose || verificationPurpose;
    clearFeedback();
    setAuthLoading(true);
    setIsOfflineError(false);

    try {
      if (activePurpose === 'EMAIL_VERIFY') {
        await mobileApi.resendEmailVerification(cleanEmail);
      } else {
        await mobileApi.sendOtp(cleanEmail);
      }
      setAuthLoading(false);
      setOtpDigits(['', '', '', '', '', '']);
      setResendSeconds(45);
      setStep('INPUT_CODE');
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Tasdiqlash kodini yuborishda xatolik yuz berdi.',
          'Не удалось отправить код подтверждения.',
          'Failed to send verification code.',
        ),
      );
    }
  };

  const handleOtpBoxChange = (idx: number, val: string) => {
    clearFeedback();
    const cleaned = val.replace(/[^0-9]/g, '');

    if (cleaned.length >= 6) {
      const arr = cleaned.slice(0, 6).split('');
      setOtpDigits(arr);
      otpInputRefs.current[5]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[idx] = cleaned.slice(-1);
    setOtpDigits(next);

    if (cleaned && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (idx: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const next = [...otpDigits];
      next[idx - 1] = '';
      setOtpDigits(next);
      otpInputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg(
        tr(
          language,
          '6 xonali tasdiqlash kodini to‘liq kiriting',
          'Введите 6-значный код подтверждения полностью',
          'Please enter all 6 verification digits',
        ),
      );
      return;
    }

    clearFeedback();
    setAuthLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res =
        verificationPurpose === 'EMAIL_VERIFY'
          ? await mobileApi.verifyEmail(cleanEmail, code)
          : await mobileApi.verifyOtp(cleanEmail, code);

      setAuthLoading(false);
      if (res && res.user) {
        await completeAuthenticatedSession(res);
      }
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Kiritilgan tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan!',
          'Неверный или просроченный код подтверждения!',
          'Invalid or expired verification code!',
        ),
        'VERIFY_CODE',
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Forgot / Reset Password Flow
  // ---------------------------------------------------------------------------
  const handleSendResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg(strings.auth.invalidEmail);
      return;
    }
    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.forgotPassword(cleanEmail);
      setAuthLoading(false);
      setResetCodeSent(true);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Parolni tiklash kodini yuborishda xatolik yuz berdi.',
          'Не удалось отправить код сброса пароля.',
          'Failed to send password reset code.',
        ),
      );
    }
  };

  const handleResetPasswordSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (resetCode.trim().length !== 6) {
      setErrorMsg(
        tr(language, '6 xonali kodni kiriting', 'Введите 6-значный код', 'Enter the 6-digit code'),
      );
      return;
    }
    if (resetNewPassword.length < 8) {
      setErrorMsg(
        tr(
          language,
          'Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak',
          'Новый пароль должен содержать минимум 8 символов',
          'New password must be at least 8 characters',
        ),
      );
      return;
    }

    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.resetPassword(cleanEmail, resetCode.trim(), resetNewPassword);
      setAuthLoading(false);
      setResetCode('');
      setResetNewPassword('');
      setResetCodeSent(false);
      setPassword('');
      setAuthMode('LOGIN');
      setStep('INPUT_EMAIL');
      setSuccessMsg(res.message);
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Parolni yangilashda xatolik yuz berdi.',
          'Ошибка при обновлении пароля.',
          'Failed to update password.',
        ),
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Verified Google Account Linking (Scenario C)
  // ---------------------------------------------------------------------------
  const handleSendGoogleLinkCode = async () => {
    if (!linkingToken) return;
    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.sendGoogleLinkCode(linkingToken);
      setAuthLoading(false);
      setLinkingCodeSent(true);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Bog‘lash kodini yuborishda xatolik yuz berdi.',
          'Не удалось отправить код привязки.',
          'Failed to send linking code.',
        ),
      );
    }
  };

  const handleConfirmLinkGoogle = async () => {
    if (!linkingToken) return;
    if (linkingMethod === 'PASSWORD' && !linkingPassword) {
      setErrorMsg(
        tr(
          language,
          'Joriy parolingizni kiriting',
          'Введите текущий пароль',
          'Enter your existing password',
        ),
      );
      return;
    }
    if (linkingMethod === 'CODE' && linkingCode.trim().length !== 6) {
      setErrorMsg(
        tr(
          language,
          '6 xonali email kodni kiriting',
          'Введите 6-значный код из письма',
          'Enter the 6-digit email code',
        ),
      );
      return;
    }

    clearFeedback();
    setAuthLoading(true);
    try {
      const res = await mobileApi.linkGoogleAccount({
        linkToken: linkingToken,
        password: linkingMethod === 'PASSWORD' ? linkingPassword : undefined,
        otpCode: linkingMethod === 'CODE' ? linkingCode.trim() : undefined,
      });
      setAuthLoading(false);
      await completeAuthenticatedSession(res);
    } catch (err: any) {
      setAuthLoading(false);
      handleApiError(
        err,
        tr(
          language,
          'Hisobni tasdiqlab bo‘lmadi. Ma’lumotlarni tekshiring.',
          'Не удалось подтвердить владение аккаунтом.',
          'Could not verify account ownership.',
        ),
        'LINK_GOOGLE',
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Native Google Sign-In & Web fallback configuration notice
  // ---------------------------------------------------------------------------
  const handlePressGoogle = async () => {
    clearFeedback();
    if (!googleConfigured && Platform.OS === 'web') {
      setErrorMsg(strings.auth.googleNotConfigured);
      return;
    }

    setGoogleLoading(true);
    const outcome = await googleAuthService.signInWithGoogle();
    await handleGoogleOutcome(outcome);
  };

  // ---------------------------------------------------------------------------
  // 4-Digit App PIN Setup
  // ---------------------------------------------------------------------------
  const handlePinPadPress = async (digit: string) => {
    setPinError(null);
    if (step === 'SET_PIN') {
      if (firstPin.length >= 4) return;
      const next = firstPin + digit;
      setFirstPin(next);
      if (next.length === 4) {
        setTimeout(() => setStep('CONFIRM_PIN'), 220);
      }
    } else if (step === 'CONFIRM_PIN') {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          await secureStorage.savePinCode(firstPin);
          if (pendingUser) onGoogleSignIn(pendingUser);
        } else {
          setPinError(strings.pin.mismatchPin);
          setTimeout(() => {
            setFirstPin('');
            setConfirmPin('');
            setStep('SET_PIN');
          }, 600);
        }
      }
    }
  };

  const handlePinPadDelete = () => {
    setPinError(null);
    if (step === 'SET_PIN') setFirstPin(firstPin.slice(0, -1));
    else if (step === 'CONFIRM_PIN') setConfirmPin(confirmPin.slice(0, -1));
  };

  const handleDeviceEvictedAndRetry = async () => {
    setLimitModalVisible(false);
    if (lastRetryAction === 'LOGIN') await handleEmailLogin();
    else if (lastRetryAction === 'VERIFY_CODE') await handleVerifyCode();
    else if (lastRetryAction === 'LINK_GOOGLE') await handleConfirmLinkGoogle();
    else if (lastRetryAction === 'GOOGLE_NATIVE' && Platform.OS !== 'web') await handlePressGoogle();
  };

  if (isOfflineError) {
    return (
      <OfflineScreen
        language={language}
        retrying={authLoading}
        onRetry={async () => {
          setAuthLoading(true);
          const ok = await mobileApi.checkConnectivity();
          setAuthLoading(false);
          if (ok) setIsOfflineError(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Language Switcher Bar */}
      {step === 'INPUT_EMAIL' && authMode === 'LOGIN' && (
        <View style={styles.topLangBar}>
          <View
            style={[
              styles.langPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {(['uz', 'ru', 'en'] as const).map((langKey) => {
              const active = language === langKey;
              return (
                <TouchableOpacity
                  key={langKey}
                  style={[
                    styles.langBtn,
                    active && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setLanguage(langKey)}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      { color: active ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {langKey.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* =================================================================== */}
      {/* SCREEN 1: LOGIN / REGISTER / GOOGLE AUTH ENTRY                       */}
      {/* =================================================================== */}
      {step === 'INPUT_EMAIL' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, width: '100%' }}
        >
          <ScrollView
            contentContainerStyle={styles.welcomeScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {authMode === 'LOGIN' ? (
              <>
                <View style={[styles.brandCenter, { marginBottom: 16 }]}>
                  <BrandLogo size={56} withContainer darkSurface={isDark} />
                </View>

                <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
                  {strings.welcome.title}
                </Text>
                <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                  {strings.welcome.subtitle}
                </Text>

              {errorMsg && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
                </View>
              )}
              {successMsg && (
                <View
                  style={[
                    styles.successBox,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accent + '44',
                    },
                  ]}
                >
                  <Text style={[styles.successText, { color: colors.accent }]}>✅ {successMsg}</Text>
                </View>
              )}

              {/* Login: Email + Password */}
              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>✉️</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={email}
                  onChangeText={(t) => {
                    clearFeedback();
                    setEmail(t);
                  }}
                  placeholder={strings.auth.emailPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>🔒</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={(t) => {
                    clearFeedback();
                    setPassword(t);
                  }}
                  placeholder={strings.auth.passwordLabel}
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeToggleBtn}
                >
                  <Text style={styles.eyeToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => {
                    clearFeedback();
                    setResetCodeSent(false);
                    setStep('FORGOT_PASSWORD');
                  }}
                >
                  <Text style={[styles.forgotLink, { color: colors.primaryText }]}>
                    {strings.auth.forgotLink}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryPillBtn,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={handleEmailLogin}
                disabled={authLoading}
                activeOpacity={0.85}
              >
                {authLoading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryPillText, { color: colors.onPrimary }]}>
                    {strings.auth.loginButton}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                  {strings.auth.orDivider.toUpperCase()}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {Platform.OS === 'web' && googleConfigured ? (
                <View style={styles.gisHostOuter}>
                  <View ref={gisContainerRef} style={styles.gisHostInner} />
                  {!gisMounted && !googleLoading && (
                    <TouchableOpacity
                      style={[
                        styles.googlePillBtn,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={handlePressGoogle}
                      activeOpacity={0.85}
                    >
                      <View style={styles.googleInner}>
                        <GoogleLogoIcon size={18} />
                        <Text style={[styles.googlePillText, { color: colors.textPrimary }]}>
                          {strings.auth.googleButton}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {googleLoading && (
                    <View style={styles.googleLoadingRow}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={[styles.googleLoadingText, { color: colors.primary }]}>
                        {tr(
                          language,
                          'Google hisobingiz tekshirilmoqda...',
                          'Проверка аккаунта Google...',
                          'Verifying Google account...',
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.googlePillBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={handlePressGoogle}
                  disabled={googleLoading}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <View style={styles.googleInner}>
                      <GoogleLogoIcon size={18} />
                      <Text style={[styles.googlePillText, { color: colors.textPrimary }]}>
                        {strings.auth.googleButton}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.registerOutlineBtn,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primary + '44' },
                ]}
                onPress={() => {
                  clearFeedback();
                  setAuthMode('REGISTER');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.registerOutlineText, { color: colors.primaryText }]}>
                  {strings.welcome.createAccount}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.termsText, { color: colors.textMuted }]}>
                {tr(
                  language,
                  'Maxfiylik siyosati • Foydalanish shartlari',
                  'Политика конфиденциальности • Условия использования',
                  'Privacy Policy • Terms of Service',
                )}
              </Text>
            </>
          ) : (
            <>
              {/* Register View */}
              <View style={[styles.topBackBar, { marginBottom: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.backIconBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    clearFeedback();
                    setAuthMode('LOGIN');
                  }}
                >
                  <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
                </TouchableOpacity>
                <View style={styles.brandCenter}>
                  <BrandLogo size={38} withContainer darkSurface={isDark} />
                </View>
                <View style={{ width: 38 }} />
              </View>

              <Text style={[styles.welcomeTitle, { marginBottom: 4, color: colors.textPrimary }]}>
                {strings.auth.registerTitle}
              </Text>
              <Text style={[styles.welcomeSub, { marginBottom: 18, color: colors.textSecondary }]}>
                {strings.auth.registerSubtitle}
              </Text>

              {errorMsg && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
                </View>
              )}
              {successMsg && (
                <View
                  style={[
                    styles.successBox,
                    {
                      backgroundColor: colors.accentSoft,
                      borderColor: colors.accent + '44',
                    },
                  ]}
                >
                  <Text style={[styles.successText, { color: colors.accent }]}>✅ {successMsg}</Text>
                </View>
              )}

              <View style={styles.nameRow}>
                <View
                  style={[
                    styles.emailInputWrap,
                    styles.nameInputHalf,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.emailInput, { color: colors.textPrimary }]}
                    value={firstName}
                    onChangeText={(t) => {
                      clearFeedback();
                      setFirstName(t);
                    }}
                    placeholder={tr(language, 'Ism', 'Имя', 'First name')}
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
                <View
                  style={[
                    styles.emailInputWrap,
                    styles.nameInputHalf,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.emailInput, { color: colors.textPrimary }]}
                    value={lastName}
                    onChangeText={(t) => {
                      clearFeedback();
                      setLastName(t);
                    }}
                    placeholder={tr(language, 'Familiya', 'Фамилия', 'Last name')}
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>✉️</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={email}
                  onChangeText={(t) => {
                    clearFeedback();
                    setEmail(t);
                  }}
                  placeholder={strings.auth.emailPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>🔒</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={password}
                  onChangeText={(t) => {
                    clearFeedback();
                    setPassword(t);
                  }}
                  placeholder={tr(
                    language,
                    'Parol (kamida 8 ta belgi)',
                    'Пароль (минимум 8 символов)',
                    'Password (min 8 characters)',
                  )}
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeToggleBtn}
                >
                  <Text style={styles.eyeToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryPillBtn,
                  { marginTop: 6, backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={handleEmailRegister}
                disabled={authLoading}
                activeOpacity={0.85}
              >
                {authLoading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.primaryPillText, { color: colors.onPrimary }]}>
                    {strings.auth.registerButton}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchBackToLoginBtn}
                onPress={() => {
                  clearFeedback();
                  setAuthMode('LOGIN');
                }}
              >
                <Text style={[styles.switchBackToLoginText, { color: colors.primaryText }]}>
                  {strings.auth.haveAccountPrompt} {strings.auth.loginTab}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* =================================================================== */}
      {/* SCREEN 2: 6-DIGIT VERIFICATION CODE (EMAIL_VERIFY / OTP_LOGIN)       */}
      {/* =================================================================== */}
      {step === 'INPUT_CODE' && (
        <View
          style={[
            styles.otpContainer,
            { backgroundColor: colors.background },
            Platform.OS === 'web' ? ({ overflowY: 'auto' } as any) : null,
          ]}
        >
          <View style={styles.topBackBar}>
            <TouchableOpacity
              style={[
                styles.backIconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                clearFeedback();
                setStep('INPUT_EMAIL');
              }}
            >
              <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.otpCenter}>
            <View style={[styles.otpIconBadge, { backgroundColor: colors.primarySoft }]}>
              <Svg width={52} height={52} viewBox="0 0 64 64" fill="none">
                <Rect x="8" y="16" width="44" height="32" rx="6" fill="#4F46E5" />
                <Path
                  d="M10 18L30 33L50 18"
                  stroke="#FFFFFF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx="50" cy="44" r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                <Path
                  d="M46 44L49 47L55 41"
                  stroke="#FFFFFF"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {verificationPurpose === 'EMAIL_VERIFY'
                ? strings.auth.verifyTitle
                : strings.auth.codeLabel}
            </Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              {t('auth.verifySubtitle', { email })}
            </Text>

            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View
                style={[
                  styles.successBox,
                  { backgroundColor: colors.accentSoft, borderColor: colors.accent + '44' },
                ]}
              >
                <Text style={[styles.successText, { color: colors.accent }]}>✅ {successMsg}</Text>
              </View>
            )}

            <View style={styles.otpRow}>
              {otpDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  style={[
                    styles.otpDigitBox,
                    {
                      backgroundColor: digit ? colors.primarySoft : colors.surface,
                      borderColor:
                        focusedOtpIdx === idx || digit ? colors.primary : colors.border,
                      color: colors.textPrimary,
                    },
                    focusedOtpIdx === idx ? styles.otpDigitBoxFocused : null,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleOtpBoxChange(idx, val)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(idx, nativeEvent.key)}
                  onFocus={() => setFocusedOtpIdx(idx)}
                  onBlur={() => setFocusedOtpIdx((prev) => (prev === idx ? null : prev))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  textContentType="oneTimeCode"
                  returnKeyType={idx === 5 ? 'done' : 'next'}
                  onSubmitEditing={() => {
                    if (idx === 5) handleVerifyCode();
                  }}
                  maxLength={6}
                  selectTextOnFocus
                  autoFocus={idx === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              disabled={resendSeconds > 0 || authLoading}
              onPress={() => handleSendCode()}
              style={styles.resendWrap}
            >
              <Text
                style={[
                  styles.resendLink,
                  { color: resendSeconds > 0 ? colors.textSecondary : colors.primaryText },
                ]}
              >
                {resendSeconds > 0
                  ? `${strings.auth.resendCodeButton} (${formatTimer(resendSeconds)})`
                  : strings.auth.resendCodeButton}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryPillBtn,
                { width: '100%', backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
              onPress={handleVerifyCode}
              disabled={authLoading}
              activeOpacity={0.85}
            >
              {authLoading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.primaryPillText, { color: colors.onPrimary }]}>
                  {strings.auth.verifyButton}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                clearFeedback();
                setStep('INPUT_EMAIL');
              }}
              style={styles.changeEmailLink}
            >
              <Text style={[styles.changeEmailText, { color: colors.textSecondary }]}>
                {strings.auth.backToLogin}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* =================================================================== */}
      {/* SCREEN 3: FORGOT / RESET PASSWORD                                    */}
      {/* =================================================================== */}
      {step === 'FORGOT_PASSWORD' && (
        <ScrollView contentContainerStyle={styles.otpCenter} showsVerticalScrollIndicator={false}>
          <View style={styles.topBackBar}>
            <TouchableOpacity
              style={[
                styles.backIconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                clearFeedback();
                setResetCodeSent(false);
                setStep('INPUT_EMAIL');
              }}
            >
              <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.otpIconBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={{ fontSize: 32 }}>🔑</Text>
          </View>

          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {resetCodeSent ? strings.auth.resetTitle : strings.auth.forgotTitle}
          </Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            {resetCodeSent ? strings.auth.resetSubtitle : strings.auth.forgotSubtitle}
          </Text>

          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
            </View>
          )}
          {successMsg && (
            <View
              style={[
                styles.successBox,
                { backgroundColor: colors.accentSoft, borderColor: colors.accent + '44' },
              ]}
            >
              <Text style={[styles.successText, { color: colors.accent }]}>✅ {successMsg}</Text>
            </View>
          )}

          <View
            style={[
              styles.emailInputWrap,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <Text style={styles.emailIcon}>✉️</Text>
            <TextInput
              style={[styles.emailInput, { color: colors.textPrimary }]}
              value={email}
              onChangeText={(t) => {
                clearFeedback();
                setEmail(t);
              }}
              placeholder={strings.auth.emailPlaceholder}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!resetCodeSent}
            />
          </View>

          {resetCodeSent && (
            <>
              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>🔢</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={resetCode}
                  onChangeText={(t) => {
                    clearFeedback();
                    setResetCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                  }}
                  placeholder={strings.auth.codePlaceholder}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>🔒</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={resetNewPassword}
                  onChangeText={(t) => {
                    clearFeedback();
                    setResetNewPassword(t);
                  }}
                  placeholder={strings.auth.newPasswordPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showResetPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowResetPassword((p) => !p)}
                  style={styles.eyeToggleBtn}
                >
                  <Text style={styles.eyeToggleText}>{showResetPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.primaryPillBtn,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={resetCodeSent ? handleResetPasswordSubmit : handleSendResetCode}
            disabled={authLoading}
            activeOpacity={0.85}
          >
            {authLoading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryPillText, { color: colors.onPrimary }]}>
                {resetCodeSent ? strings.auth.resetButton : strings.auth.sendCodeButton}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* =================================================================== */}
      {/* SCREEN 4: SECURE GOOGLE ACCOUNT LINKING (SCENARIO C)                 */}
      {/* =================================================================== */}
      {step === 'LINK_GOOGLE' && (
        <ScrollView contentContainerStyle={styles.otpCenter} showsVerticalScrollIndicator={false}>
          <View style={styles.topBackBar}>
            <TouchableOpacity
              style={[
                styles.backIconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                clearFeedback();
                setLinkingToken(null);
                setStep('INPUT_EMAIL');
              }}
            >
              <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.otpIconBadge, { backgroundColor: colors.primarySoft }]}>
            <GoogleLogoIcon size={34} />
          </View>

          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {tr(
              language,
              'Hisobni xavfsiz bog‘lash',
              'Подтверждение владельца аккаунта',
              'Verify Account Ownership',
            )}
          </Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            {tr(
              language,
              `${linkingEmail} manzili tizimda mavjud. Google hisobini ulashdan oldin egasi ekanligingizni tasdiqlang.`,
              `${linkingEmail} уже зарегистрирован. Подтвердите владение аккаунтом перед привязкой Google.`,
              `${linkingEmail} already exists. Please prove account ownership before linking your Google account.`,
            )}
          </Text>

          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
            </View>
          )}
          {successMsg && (
            <View
              style={[
                styles.successBox,
                { backgroundColor: colors.accentSoft, borderColor: colors.accent + '44' },
              ]}
            >
              <Text style={[styles.successText, { color: colors.accent }]}>✅ {successMsg}</Text>
            </View>
          )}

          {linkingHasPassword && (
            <View
              style={[
                styles.authModeTabs,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.authModeTab,
                  linkingMethod === 'PASSWORD' && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  clearFeedback();
                  setLinkingMethod('PASSWORD');
                }}
              >
                <Text
                  style={[
                    styles.authModeTabText,
                    {
                      color:
                        linkingMethod === 'PASSWORD' ? colors.onPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  {tr(language, 'Parol orqali', 'Через пароль', 'With Password')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.authModeTab,
                  linkingMethod === 'CODE' && { backgroundColor: colors.primary },
                ]}
                onPress={() => {
                  clearFeedback();
                  setLinkingMethod('CODE');
                }}
              >
                <Text
                  style={[
                    styles.authModeTabText,
                    { color: linkingMethod === 'CODE' ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  {tr(language, 'Email kod bilan', 'Через код на email', 'With Email Code')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {linkingMethod === 'PASSWORD' && linkingHasPassword ? (
            <View
              style={[
                styles.emailInputWrap,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
              ]}
            >
              <Text style={styles.emailIcon}>🔒</Text>
              <TextInput
                style={[styles.emailInput, { color: colors.textPrimary }]}
                value={linkingPassword}
                onChangeText={(t) => {
                  clearFeedback();
                  setLinkingPassword(t);
                }}
                placeholder={tr(
                  language,
                  'Mavjud hisob paroli',
                  'Пароль от аккаунта',
                  'Existing account password',
                )}
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.googlePillBtn,
                  {
                    marginBottom: 12,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleSendGoogleLinkCode}
                disabled={authLoading}
              >
                <Text style={[styles.googlePillText, { color: colors.textPrimary }]}>
                  {linkingCodeSent ? strings.auth.resendCodeButton : strings.auth.sendCodeButton}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.emailInputWrap,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Text style={styles.emailIcon}>🔢</Text>
                <TextInput
                  style={[styles.emailInput, { color: colors.textPrimary }]}
                  value={linkingCode}
                  onChangeText={(t) => {
                    clearFeedback();
                    setLinkingCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                  }}
                  placeholder={strings.auth.codePlaceholder}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.primaryPillBtn,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={handleConfirmLinkGoogle}
            disabled={authLoading}
            activeOpacity={0.85}
          >
            {authLoading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.primaryPillText, { color: colors.onPrimary }]}>
                {tr(
                  language,
                  'Tasdiqlash va Google ulash',
                  'Подтвердить и привязать Google',
                  'Verify & Link Google',
                )}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* =================================================================== */}
      {/* SCREEN 5: PIN O'RNATISH (SET_PIN / CONFIRM_PIN)                      */}
      {/* =================================================================== */}
      {(step === 'SET_PIN' || step === 'CONFIRM_PIN') && (
        <View style={[styles.pinSetupContainer, { backgroundColor: colors.background }]}>
          <View style={styles.topBackBar}>
            <TouchableOpacity
              style={[
                styles.backIconBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                if (step === 'CONFIRM_PIN') {
                  setConfirmPin('');
                  setStep('SET_PIN');
                }
              }}
            >
              <Text style={[styles.backArrow, { color: colors.textPrimary }]}>‹</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pinHeaderCenter}>
            <View style={[styles.lockShieldBadge, { backgroundColor: colors.primarySoft }]}>
              <Svg width={48} height={48} viewBox="0 0 64 64" fill="none">
                <Path d="M32 6L52 14V30C52 44 43 54 32 58C21 54 12 44 12 30V14L32 6Z" fill="#4F46E5" />
                <Rect x="23" y="29" width="18" height="15" rx="3" fill="#FFFFFF" />
                <Path
                  d="M27 29V24C27 21.2 29.2 19 32 19C34.8 19 37 21.2 37 24V29"
                  stroke="#FFFFFF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <Circle cx="32" cy="36.5" r="2" fill="#4F46E5" />
              </Svg>
            </View>

            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {step === 'SET_PIN' ? strings.pin.setupTitle : strings.pin.confirmTitle}
            </Text>
            <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
              {step === 'SET_PIN' ? strings.pin.setupSubtitle : strings.pin.confirmSubtitle}
            </Text>

            {pinError && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {pinError}</Text>
              </View>
            )}

            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((i) => {
                const len = step === 'SET_PIN' ? firstPin.length : confirmPin.length;
                const filled = len > i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.pinDot,
                      { backgroundColor: colors.borderStrong },
                      filled && { backgroundColor: colors.primary, transform: [{ scale: 1.15 }] },
                      pinError ? { backgroundColor: colors.danger } : null,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.keypadWrap}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.keyBtnLight,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => handlePinPadPress(num)}
                    activeOpacity={0.65}
                  >
                    <Text style={[styles.keyTextLight, { color: colors.textPrimary }]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={styles.keypadRow}>
              <View style={styles.keyBtnEmpty} />
              <TouchableOpacity
                style={[
                  styles.keyBtnLight,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => handlePinPadPress('0')}
                activeOpacity={0.65}
              >
                <Text style={[styles.keyTextLight, { color: colors.textPrimary }]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.keyBtnLight,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={handlePinPadDelete}
                activeOpacity={0.65}
              >
                <Text style={[styles.keyDeleteLight, { color: colors.textSecondary }]}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 2-Device Limit Modal */}
      <DeviceLimitModal
        visible={limitModalVisible}
        devices={conflictingDevices}
        userId={pendingUserId}
        onClose={() => setLimitModalVisible(false)}
        onDeviceDisconnected={handleDeviceEvictedAndRetry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.bgLight,
  },
  welcomeScroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLangBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 10,
  },
  welcomeHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  brandCenter: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.navyDeep,
    marginTop: 6,
    lineHeight: 19,
  },
  brandTextBold: {
    fontSize: 16,
    fontWeight: '800',
    color: DS.colors.primary,
    lineHeight: 19,
  },
  langPill: {
    flexDirection: 'row',
    backgroundColor: DS.colors.white,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  langBtnActive: {
    backgroundColor: DS.colors.primary,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.colors.textSecondary,
  },
  langBtnTextActive: {
    color: DS.colors.white,
  },
  welcomeTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: DS.colors.navyDeep,
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 12.5,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  heroCard: {
    width: '100%',
    backgroundColor: DS.colors.white,
    borderRadius: DS.radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: DS.colors.primarySoft,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  authModeTabs: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: DS.colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: DS.colors.border,
    marginBottom: 12,
    gap: 4,
  },
  authModeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authModeTabActive: {
    backgroundColor: DS.colors.primary,
  },
  authModeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DS.colors.textSecondary,
  },
  authModeTabTextActive: {
    color: DS.colors.white,
  },
  nameRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  nameInputHalf: {
    flex: 1,
  },
  emailInputWrap: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.white,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: DS.colors.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 10,
  },
  emailIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '500',
    color: DS.colors.textPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eyeToggleBtn: {
    paddingLeft: 8,
    paddingVertical: 2,
  },
  eyeToggleText: {
    fontSize: 16,
  },
  forgotRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: -2,
    marginBottom: 10,
  },
  forgotLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  primaryPillBtn: {
    width: '100%',
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  primaryPillText: {
    color: DS.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11.5,
    color: DS.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  gisHostOuter: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  gisHostInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  googleLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  googleLoadingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: DS.colors.primary,
  },
  googlePillBtn: {
    width: '100%',
    backgroundColor: DS.colors.white,
    borderRadius: DS.radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  googleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googlePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  registerOutlineBtn: {
    width: '100%',
    backgroundColor: '#EEF2FF',
    borderRadius: DS.radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: DS.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  registerOutlineText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  switchBackToLoginBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  switchBackToLoginText: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  termsText: {
    fontSize: 11,
    color: DS.colors.textMuted,
    textAlign: 'center',
  },
  errorBox: {
    width: '100%',
    backgroundColor: DS.colors.dangerSoft,
    borderRadius: DS.radius.sm,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: DS.colors.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBox: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: DS.radius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  topBackBar: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.colors.white,
    borderWidth: 1,
    borderColor: DS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.textPrimary,
  },
  otpContainer: {
    flex: 1,
    backgroundColor: DS.colors.bgLight,
  },
  otpCenter: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: DS.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DS.colors.navyDeep,
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 13,
    color: DS.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 324,
    marginBottom: 20,
    gap: 8,
  },
  otpDigitBox: {
    width: 44,
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    height: 54,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: DS.colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DS.colors.border,
    textAlign: 'center',
    fontSize: 21,
    fontWeight: '800',
    color: DS.colors.navyDeep,
  },
  otpDigitBoxFocused: {
    borderColor: DS.colors.primary,
    borderWidth: 2,
    backgroundColor: DS.colors.white,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  otpDigitBoxFilled: {
    borderColor: DS.colors.primary,
    backgroundColor: DS.colors.primarySoft,
  },
  resendWrap: {
    marginBottom: 20,
    paddingVertical: 4,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.colors.primary,
    textDecorationLine: 'underline',
  },
  changeEmailLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  changeEmailText: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.colors.textSecondary,
  },
  pinSetupContainer: {
    flex: 1,
    backgroundColor: DS.colors.bgLight,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  pinHeaderCenter: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockShieldBadge: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: DS.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pinDotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
  },
  pinDotFilled: {
    backgroundColor: DS.colors.primary,
    transform: [{ scale: 1.15 }],
  },
  pinDotError: {
    backgroundColor: DS.colors.danger,
  },
  keypadWrap: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyBtnLight: {
    width: 72,
    height: 60,
    borderRadius: 16,
    backgroundColor: DS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.colors.border,
  },
  keyBtnEmpty: {
    width: 72,
    height: 60,
  },
  keyTextLight: {
    fontSize: 22,
    fontWeight: '700',
    color: DS.colors.navyDeep,
  },
  keyDeleteLight: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.textSecondary,
  },
});
