import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { secureStorage } from '../services/storage/secureStorage';
import { UserAvatar } from '../components/common/UserAvatar';

interface PinLockScreenProps {
  userEmail: string;
  userName?: string;
  onUnlockSuccess: () => void;
  onResetPin: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  userEmail,
  userName = 'O‘qituvchi',
  onUnlockSuccess,
  onResetPin,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const handleKeyPress = async (digit: string) => {
    if (verifying || pin.length >= 4) return;

    setErrorMsg(null);
    const newPin = pin + digit;
    setPin(newPin);

    // When 4 digits are completed, verify immediately
    if (newPin.length === 4) {
      setVerifying(true);
      const isValid = await secureStorage.verifyPinCode(newPin);
      setVerifying(false);

      if (isValid) {
        onUnlockSuccess();
      } else {
        setErrorMsg('Noto‘g‘ri PIN kod! Qaytadan kiriting.');
        setTimeout(() => {
          setPin('');
        }, 400);
      }
    }
  };

  const handleDelete = () => {
    if (verifying || pin.length === 0) return;
    setErrorMsg(null);
    setPin(pin.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.appBrandRow}>
          <Text style={styles.brandEmoji}>📚</Text>
          <Text style={styles.brandTitle}>SmartTeacherBook</Text>
        </View>
      </View>

      {/* Main Center Area */}
      <View style={styles.centerContent}>
        {/* User Badge */}
        <UserAvatar name={userName} email={userEmail} size={68} style={{ marginBottom: 12 }} />

        <Text style={styles.welcomeText}>Xush kelibsiz, {userName}!</Text>
        {userEmail ? <Text style={styles.emailText}>{userEmail}</Text> : null}

        <Text style={styles.pinInstruction}>Ilovaga kirish uchun 4 xonali PIN kodni tering</Text>

        {/* 4 Circular PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            const isError = !!errorMsg;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isFilled && styles.dotFilled,
                  isError && styles.dotError,
                ]}
              />
            );
          })}
        </View>

        {/* Error Alert */}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : (
          <View style={{ height: 26 }} />
        )}

        {verifying && (
          <View style={{ height: 20, marginBottom: 10 }}>
            <ActivityIndicator size="small" color="#0F2942" />
          </View>
        )}
      </View>

      {/* Numeric Keypad (NumPad) */}
      <View style={styles.keypad}>
        {/* Row 1 */}
        <View style={styles.keypadRow}>
          {['1', '2', '3'].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2 */}
        <View style={styles.keypadRow}>
          {['4', '5', '6'].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 3 */}
        <View style={styles.keypadRow}>
          {['7', '8', '9'].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(num)}
              activeOpacity={0.7}
            >
              <Text style={styles.keyNumberText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 4: Empty space, '0', Backspace */}
        <View style={styles.keypadRow}>
          <View style={styles.keyBtnEmpty} />

          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.keyNumberText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteKeyText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot PIN / Reset Account Option */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={onResetPin} activeOpacity={0.7} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>PIN kodni unutdingizmi? / Boshqa hisob bilan kirish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#0F2942',
    letterSpacing: -0.3,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F2942',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  pinInstruction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 20,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
  errorBox: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 12,
    marginBottom: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    width: 72,
    height: 72,
  },
  keyNumberText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F2942',
  },
  deleteKeyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#64748B',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'center',
  },
});
