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

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = () => {
    if (!email || !email.includes('@')) {
      setError('Iltimos, to‘g‘ri email manzil kiriting / Please enter a valid email');
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
      setError('6 xonali kodni kiriting / Enter 6-digit code');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Decorative Ambient Circles (§11 Design) */}
      <View style={[styles.bgCircle, styles.circleTopLeft]} />
      <View style={[styles.bgCircle, styles.circleBottomRight]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        {/* Soft Glass / Neumorphic Main Login Card */}
        <View style={styles.card}>
          {/* Demo Logo Icon Placeholder */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>📖</Text>
            </View>
          </View>

          {/* App Title */}
          <Text style={styles.title}>SmartTeacherBook</Text>

          {/* School Tagline (§11 Design) */}
          <Text style={styles.tagline}>TEACH • INSPIRE • GROW</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {step === 'EMAIL'
              ? 'Kirish yoki ro‘yxatdan o‘tish uchun emailingizni kiriting'
              : `${email} manziliga yuborilgan 6 xonali tasdiqlash kodini kiriting`}
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {step === 'EMAIL' ? (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>EMAIL MANZILI</Text>
              <TextInput
                style={styles.input}
                placeholder="teacher@school.uz"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={styles.pillButton}
                activeOpacity={0.85}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F2942" />
                ) : (
                  <>
                    <Text style={styles.pillButtonText}>Kodni yuborish</Text>
                    <Text style={styles.pillButtonArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>TASDIQLASH KODI (6 XONA)</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />

              <TouchableOpacity
                style={styles.pillButton}
                activeOpacity={0.85}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0F2942" />
                ) : (
                  <>
                    <Text style={styles.pillButtonText}>Tasdiqlash & Kirish</Text>
                    <Text style={styles.pillButtonArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep('EMAIL')}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>Emailni o‘zgartirish</Text>
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
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  circleTopLeft: {
    width: 240,
    height: 240,
    backgroundColor: '#DBEAFE',
    top: -60,
    left: -60,
    opacity: 0.7,
  },
  circleBottomRight: {
    width: 280,
    height: 280,
    backgroundColor: '#FEF3C7',
    bottom: -80,
    right: -80,
    opacity: 0.6,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 32, // Spec §11: 24-32px rounded corners
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
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
    backgroundColor: '#0F2942',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F2942',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2942',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B', // Warm school yellow accent
    letterSpacing: 2.5,
    marginTop: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputSection: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F2942',
    fontWeight: '500',
    marginBottom: 20,
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
    borderRadius: 9999, // Big pill-shaped button
    backgroundColor: '#F59E0B', // Warm yellow accent
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
  },
  pillButtonText: {
    color: '#0F2942',
    fontSize: 15,
    fontWeight: '800',
  },
  pillButtonArrow: {
    color: '#0F2942',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
});
