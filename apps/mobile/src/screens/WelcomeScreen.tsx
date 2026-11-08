import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { mobileApi } from '../services/api/mobileApi';
import { googleAuthService } from '../services/auth/googleAuthService';
import { secureStorage } from '../services/storage/secureStorage';
import { DeviceLimitModal } from '../components/DeviceLimitModal';

interface WelcomeScreenProps {
  onGoogleSignIn: (user: { email: string; name: string; avatar: string }) => void;
}

// Official Google 'G' 4-color Vector Logo
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

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoogleSignIn }) => {
  const [language, setLanguage] = useState<'uz' | 'en'>('uz');

  // Multi-step authentication flow:
  // 1. INPUT_EMAIL: Enter Gmail
  // 2. INPUT_CODE: Enter 6-digit OTP from email
  // 3. SET_PIN: Create 4-digit PIN for subsequent logins
  // 4. CONFIRM_PIN: Confirm the 4-digit PIN
  const [step, setStep] = useState<'INPUT_EMAIL' | 'INPUT_CODE' | 'SET_PIN' | 'CONFIRM_PIN'>(
    'INPUT_EMAIL'
  );

  // Email OTP state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // 4-Digit PIN Creation state
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Authenticated user holding state (before PIN setup completes)
  const [pendingUser, setPendingUser] = useState<{
    email: string;
    name: string;
    avatar: string;
  } | null>(null);

  // Google OAuth loading state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [webGoogleModalVisible, setWebGoogleModalVisible] = useState(false);
  const [webEmailInput, setWebEmailInput] = useState('');
  const [webNameInput, setWebNameInput] = useState('');

  // Two-Device Limit state
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [conflictingDevices, setConflictingDevices] = useState<any[]>([]);
  const [pendingUserId, setPendingUserId] = useState<string | undefined>(undefined);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**
   * STEP 1: Send OTP to Gmail
   */
  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg(
        language === 'uz'
          ? 'Iltimos, to‘g‘ri Gmail elektron pochtangizni kiriting'
          : 'Please enter a valid Gmail address'
      );
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtpLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      await mobileApi.sendOtp(cleanEmail);
      setOtpLoading(false);
      setSuccessMsg(
        language === 'uz'
          ? `6 xonali tasdiqlash kodi ${cleanEmail} manziliga jo‘natildi!`
          : `Verification code sent to ${cleanEmail}!`
      );
      setStep('INPUT_CODE');
    } catch {
      setOtpLoading(false);
      setErrorMsg(
        language === 'uz'
          ? 'Tasdiqlash kodini yuborishda xatolik yuz berdi. Internetni tekshiring.'
          : 'Failed to send verification code. Check your network.'
      );
    }
  };

  /**
   * STEP 2: Verify 6-digit OTP Code
   */
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg(
        language === 'uz'
          ? '6 xonali tasdiqlash kodini to‘liq kiriting'
          : 'Please enter the 6-digit verification code'
      );
      return;
    }
    setErrorMsg(null);
    setOtpLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await mobileApi.verifyOtp(cleanEmail, otpCode.trim());
      setOtpLoading(false);

      if (res && res.user) {
        if (res.accessToken && res.refreshToken) {
          await secureStorage.saveTokens(res.accessToken, res.refreshToken);
          await secureStorage.saveUserProfile(res.user);
        }

        const userObj = {
          email: res.user.email,
          name: res.user.fullName || res.user.email.split('@')[0],
          avatar: '👩‍🏫',
        };

        // Check if device already has a 4-digit PIN code configured
        const hasPin = await secureStorage.hasPinCode();
        if (hasPin) {
          // Already configured, log in immediately
          onGoogleSignIn(userObj);
        } else {
          // First-time login: Prompt user to set a 4-digit PIN!
          setPendingUser(userObj);
          setStep('SET_PIN');
        }
      }
    } catch (err: any) {
      setOtpLoading(false);

      // Check if 2-Device Limit was exceeded
      if (err?.status === 403 && (err?.data?.code === 'DEVICE_LIMIT_EXCEEDED' || err?.data?.devices)) {
        setConflictingDevices(err.data.devices || []);
        setPendingUserId(err.data.userId);
        setLimitModalVisible(true);
        return;
      }

      setErrorMsg(
        language === 'uz'
          ? 'Kiritilgan tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan!'
          : 'Invalid or expired verification code!'
      );
    }
  };

  /**
   * STEP 3 & 4: 4-Digit PIN Setup
   */
  const handleNumPadPress = async (digit: string) => {
    setPinError(null);

    if (step === 'SET_PIN') {
      if (firstPin.length >= 4) return;
      const nextPin = firstPin + digit;
      setFirstPin(nextPin);

      if (nextPin.length === 4) {
        // Move to confirmation step after short pause
        setTimeout(() => {
          setStep('CONFIRM_PIN');
        }, 250);
      }
    } else if (step === 'CONFIRM_PIN') {
      if (confirmPin.length >= 4) return;
      const nextConfirm = confirmPin + digit;
      setConfirmPin(nextConfirm);

      if (nextConfirm.length === 4) {
        if (nextConfirm === firstPin) {
          // PIN Match! Save securely in hardware storage
          await secureStorage.savePinCode(firstPin);
          if (pendingUser) {
            onGoogleSignIn(pendingUser);
          }
        } else {
          setPinError(
            language === 'uz'
              ? 'PIN kodlar mos kelmadi! Qaytadan kiriting.'
              : 'PIN codes do not match! Please try again.'
          );
          setTimeout(() => {
            setFirstPin('');
            setConfirmPin('');
            setStep('SET_PIN');
          }, 600);
        }
      }
    }
  };

  const handleNumPadDelete = () => {
    setPinError(null);
    if (step === 'SET_PIN') {
      setFirstPin(firstPin.slice(0, -1));
    } else if (step === 'CONFIRM_PIN') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  /**
   * Google OAuth Handler
   */
  const handlePressGoogle = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (Platform.OS === 'web') {
      setWebGoogleModalVisible(true);
      return;
    }

    await executeGoogleAuth();
  };

  const executeGoogleAuth = async (userEmail?: string, userName?: string) => {
    setErrorMsg(null);
    setGoogleLoading(true);

    try {
      const result = await googleAuthService.signIn(userEmail, userName);
      setGoogleLoading(false);

      if (result.success && result.tokens) {
        setWebGoogleModalVisible(false);
        const userObj = {
          email: result.tokens.user.email,
          name: result.tokens.user.fullName || (userEmail ? userEmail.split('@')[0] : 'O‘qituvchi'),
          avatar: '👩‍🏫',
        };

        const hasPin = await secureStorage.hasPinCode();
        if (hasPin) {
          onGoogleSignIn(userObj);
        } else {
          // First-time login: Prompt user to set 4-digit PIN!
          setPendingUser(userObj);
          setStep('SET_PIN');
        }
        return;
      }

      if (result.deviceLimitExceeded) {
        setWebGoogleModalVisible(false);
        setConflictingDevices(result.activeDevices || []);
        setPendingUserId(result.userId);
        setLimitModalVisible(true);
        return;
      }

      if (result.errorMessage) {
        setErrorMsg(result.errorMessage);
      }
    } catch (err: any) {
      setGoogleLoading(false);
      setErrorMsg(
        err.message ||
          (language === 'uz' ? 'Google orqali kirishda xatolik yuz berdi' : 'Google sign-in failed')
      );
    }
  };

  const handleConfirmWebGoogleAuth = async () => {
    if (!webEmailInput || !webEmailInput.includes('@')) {
      setErrorMsg(
        language === 'uz'
          ? 'Iltimos, to‘g‘ri Gmail elektron pochtangizni kiriting'
          : 'Please enter a valid Gmail address'
      );
      return;
    }
    const cleanEmail = webEmailInput.trim().toLowerCase();
    const cleanName =
      webNameInput.trim() ||
      cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    await executeGoogleAuth(cleanEmail, cleanName);
  };

  const handleDeviceEvictedAndRetry = async () => {
    setLimitModalVisible(false);
    if (step === 'INPUT_CODE') {
      await handleVerifyOtp();
    } else {
      await executeGoogleAuth();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar: Brand + Language Toggle */}
      <View style={styles.topBar}>
        <View style={styles.appBrandRow}>
          <Text style={styles.brandEmoji}>📚</Text>
          <Text style={styles.brandTitle}>SmartTeacherBook</Text>
        </View>

        <View style={styles.langPill}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'uz' && styles.langBtnActive]}
            onPress={() => setLanguage('uz')}
          >
            <Text style={[styles.langBtnText, language === 'uz' && styles.langBtnTextActive]}>
              UZ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Decorative Header */}
        <View style={styles.heroSection}>
          <View style={styles.ringOuter} />
          <View style={styles.ringMiddle} />
          <View style={styles.ringInner} />

          <View style={styles.avatarCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>👩‍🏫</Text>
            </View>
            <View style={styles.floatingBadge}>
              <Text style={styles.floatingBadgeText}>✨ O‘qituvchi Portali</Text>
            </View>
          </View>
        </View>

        {/* Card: Authentication & PIN Setup */}
        <View style={styles.authCard}>
          {/* ========================================================================= */}
          {/* STAGE 1: ENTER GMAIL ADDRESS                                              */}
          {/* ========================================================================= */}
          {step === 'INPUT_EMAIL' && (
            <View>
              <Text style={styles.mainTitle}>
                {language === 'uz' ? 'O‘qituvchi Kabinetiga Kirish' : 'Teacher Portal Sign In'}
              </Text>
              <Text style={styles.mainSubtitle}>
                {language === 'uz'
                  ? 'Gmail pochtangizni kiriting — bir martalik tasdiqlash kodi yuboriladi'
                  : 'Enter your Gmail to receive a 6-digit verification code'}
              </Text>

              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>
                {language === 'uz' ? 'GMAIL ELEKTRON POCHTA' : 'GMAIL ADDRESS'}
              </Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="masalan: oqituvchi@gmail.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSendOtp}
                disabled={otpLoading}
                activeOpacity={0.85}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {language === 'uz' ? 'Tasdiqlash Kodini Olish →' : 'Send Verification Code →'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* OR Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{language === 'uz' ? 'YOKI' : 'OR'}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Alternative: Google Sign-In Button */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handlePressGoogle}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285F4" size="small" />
                ) : (
                  <View style={styles.googleBtnInner}>
                    <GoogleLogoIcon size={20} />
                    <Text style={styles.googleBtnText}>
                      {language === 'uz' ? 'Google hisobingiz bilan kirish' : 'Continue with Google'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: ENTER 6-DIGIT OTP CODE                                           */}
          {/* ========================================================================= */}
          {step === 'INPUT_CODE' && (
            <View>
              <Text style={styles.mainTitle}>
                {language === 'uz' ? 'Tasdiqlash Kodini Kiriting' : 'Enter Verification Code'}
              </Text>
              <Text style={styles.mainSubtitle}>
                {language === 'uz'
                  ? `6 xonali kod ${email} manziliga yuborildi`
                  : `6-digit code was sent to ${email}`}
              </Text>

              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
              )}

              {successMsg && (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>📩 {successMsg}</Text>
                </View>
              )}

              <View style={styles.codeSentHeader}>
                <Text style={styles.codeSentText}>
                  {language === 'uz' ? 'Pochta:' : 'Email:'}{' '}
                  <Text style={{ fontWeight: 'bold', color: '#0F2942' }}>{email}</Text>
                </Text>
                <TouchableOpacity onPress={() => setStep('INPUT_EMAIL')}>
                  <Text style={styles.changeEmailText}>
                    {language === 'uz' ? 'O‘zgartirish' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                {language === 'uz' ? '6 XONALI TASDIQLASH KODI' : '6-DIGIT VERIFICATION CODE'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.otpInput]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="••••••"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyOtp}
                disabled={otpLoading}
                activeOpacity={0.85}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {language === 'uz' ? 'Tizimga Kirish ✓' : 'Verify & Enter ✓'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOtp}
                disabled={otpLoading}
              >
                <Text style={styles.resendBtnText}>
                  {language === 'uz' ? 'Kodni qayta jo‘natish' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3 & 4: CREATE 4-DIGIT QUICK UNLOCK PIN CODE                         */}
          {/* ========================================================================= */}
          {(step === 'SET_PIN' || step === 'CONFIRM_PIN') && (
            <View style={styles.pinSetupSection}>
              <View style={styles.pinShieldBadge}>
                <Text style={styles.pinShieldIcon}>🔐</Text>
              </View>

              <Text style={styles.mainTitle}>
                {step === 'SET_PIN'
                  ? language === 'uz'
                    ? '4 xonali PIN kod o‘rnating'
                    : 'Create 4-Digit PIN'
                  : language === 'uz'
                  ? 'PIN kodni tasdiqlang'
                  : 'Confirm Your PIN'}
              </Text>

              <Text style={styles.mainSubtitle}>
                {step === 'SET_PIN'
                  ? language === 'uz'
                    ? 'Keyingi safar Gmail va kod kiritmasdan, ushbu 4 talik parol bilan tez kirasiz'
                    : 'Unlock quickly using this 4-digit code'
                  : language === 'uz'
                  ? 'O‘rnatilgan 4 xonali parolni qayta tering'
                  : 'Re-enter your 4-digit code'}
              </Text>

              {pinError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {pinError}</Text>
                </View>
              )}

              {/* 4 Dots */}
              <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((idx) => {
                  const currentLen = step === 'SET_PIN' ? firstPin.length : confirmPin.length;
                  const isFilled = currentLen > idx;
                  const isErr = !!pinError;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.dot,
                        isFilled && styles.dotFilled,
                        isErr && styles.dotError,
                      ]}
                    />
                  );
                })}
              </View>

              {/* NumPad Keyboard */}
              <View style={styles.keypad}>
                <View style={styles.keypadRow}>
                  {['1', '2', '3'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.keyBtn}
                      onPress={() => handleNumPadPress(num)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyNumberText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.keypadRow}>
                  {['4', '5', '6'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.keyBtn}
                      onPress={() => handleNumPadPress(num)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyNumberText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.keypadRow}>
                  {['7', '8', '9'].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.keyBtn}
                      onPress={() => handleNumPadPress(num)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyNumberText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.keypadRow}>
                  <View style={styles.keyBtnEmpty} />
                  <TouchableOpacity
                    style={styles.keyBtn}
                    onPress={() => handleNumPadPress('0')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.keyNumberText}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.keyBtn}
                    onPress={handleNumPadDelete}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteKeyText}>⌫</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Security Features Badges */}
          <View style={styles.securityRow}>
            <View style={styles.securityBadge}>
              <Text style={styles.securityBadgeText}>🔒 256-bit Shifrlangan</Text>
            </View>
            <View style={styles.securityBadge}>
              <Text style={styles.securityBadgeText}>📱 2 ta qurilma limiti</Text>
            </View>
          </View>

          {/* Footer Notice */}
          <Text style={styles.footerNotice}>
            {language === 'uz'
              ? 'Tizimga kirish orqali Foydalanish shartlari va Maxfiylik siyosatiga rozilik bildirasiz.'
              : 'By signing in, you agree to our Terms of Service and Privacy Policy.'}
          </Text>
        </View>
      </ScrollView>

      {/* Web Browser Google Sign-In Prompt Modal */}
      <Modal visible={webGoogleModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.googleIconBadge}>
                <GoogleLogoIcon size={24} />
              </View>
              <Text style={styles.modalTitle}>
                {language === 'uz' ? 'Google Hisobingiz' : 'Google Account'}
              </Text>
            </View>

            <Text style={styles.modalDesc}>
              {language === 'uz'
                ? 'SmartTeacherBook tizimiga kirish uchun o‘z Gmail elektron pochtangizni kiriting:'
                : 'Enter your Gmail address to sign in to SmartTeacherBook:'}
            </Text>

            <Text style={styles.fieldLabel}>
              {language === 'uz' ? 'GMAIL ELEKTRON POCHTA *' : 'GMAIL ADDRESS *'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={webEmailInput}
              onChangeText={setWebEmailInput}
              placeholder="masalan: oqituvchi@gmail.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
              {language === 'uz' ? 'ISM VA FAMILIYA (IXTIYORIY)' : 'FULL NAME (OPTIONAL)'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={webNameInput}
              onChangeText={setWebNameInput}
              placeholder="masalan: Nigora Karimova"
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setWebGoogleModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>
                  {language === 'uz' ? 'Bekor qilish' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleConfirmWebGoogleAuth}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitModalBtnText}>
                    {language === 'uz' ? 'Kirish →' : 'Sign In →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Two-Device Limit Resolution Modal */}
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
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  appBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandEmoji: {
    fontSize: 22,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F2942',
    letterSpacing: -0.3,
  },
  langPill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  langBtnActive: {
    backgroundColor: '#0F2942',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    opacity: 0.5,
  },
  ringMiddle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#93C5FD',
    opacity: 0.6,
  },
  ringInner: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: '#FDBA74',
    opacity: 0.7,
  },
  avatarCard: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  floatingBadge: {
    backgroundColor: '#0F2942',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: -8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2942',
    marginBottom: 14,
  },
  otpInput: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#0F2942',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  codeSentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeSentText: {
    fontSize: 11,
    color: '#64748B',
  },
  changeEmailText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  resendBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DADCE0',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  // PIN Setup Styles
  pinSetupSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pinShieldBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinShieldIcon: {
    fontSize: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  dotFilled: {
    borderColor: '#0F2942',
    backgroundColor: '#0F2942',
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 10,
    marginVertical: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keyBtnEmpty: {
    width: 66,
    height: 66,
  },
  keyNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F2942',
  },
  deleteKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#64748B',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  securityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  footerNotice: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  googleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F2942',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F2942',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitModalBtn: {
    backgroundColor: '#0F2942',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
