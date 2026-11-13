import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { BrandLogo } from '../components/common/BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, isDark } = useTheme();
  const { strings, t } = useI18n();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = () => {
    if (!email || !email.includes('@')) {
      setError(strings.auth.invalidEmail);
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 600);
  };

  const handleVerifyCode = () => {
    if (code.length < 6) {
      setError(strings.auth.codePlaceholder);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email);
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.bgCircle,
          styles.circleTopLeft,
          { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.22)' : '#DBEAFE' },
        ]}
      />
      <View
        style={[
          styles.bgCircle,
          styles.circleBottomRight,
          { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7' },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <BrandLogo size={54} variant="mark" />
          </View>

          <Text style={[styles.tagline, { color: colors.warning }]}>{strings.welcome.badge}</Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'EMAIL'
              ? strings.auth.loginSubtitle
              : t('auth.verifySubtitle', { email })}
          </Text>

          {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}

          {step === 'EMAIL' ? (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{strings.auth.emailLabel}</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder={strings.auth.emailPlaceholder}
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={[styles.pillButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[styles.pillButtonText, { color: colors.onPrimary }]}>
                      {strings.auth.sendCodeButton}
                    </Text>
                    <Text style={[styles.pillButtonArrow, { color: colors.onPrimary }]}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{strings.auth.codeLabel}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.otpInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder={strings.auth.codePlaceholder}
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />

              <TouchableOpacity
                style={[styles.pillButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                activeOpacity={0.85}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[styles.pillButtonText, { color: colors.onPrimary }]}>
                      {strings.auth.verifyButton}
                    </Text>
                    <Text style={[styles.pillButtonArrow, { color: colors.onPrimary }]}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('EMAIL')} style={styles.backButton}>
                <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
                  {strings.common.back}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circleTopLeft: {
    width: 240,
    height: 240,
    top: -60,
    left: -60,
    opacity: 0.7,
  },
  circleBottomRight: {
    width: 280,
    height: 280,
    bottom: -80,
    right: -80,
    opacity: 0.6,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 8,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginTop: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputSection: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 14.5,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 18,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
  },
  pillButton: {
    width: '100%',
    height: 54,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  pillButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  pillButtonArrow: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
});
