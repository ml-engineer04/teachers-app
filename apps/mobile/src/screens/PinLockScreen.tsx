import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '../services/storage/secureStorage';
import { notify } from '../services/notifications/notificationService';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

const BiometricIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M12 2C6.48 2 2 6.48 2 12c0 2.17.7 4.19 1.9 5.86l1.46-1.46A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.6-.47 3.09-1.28 4.34l1.46 1.46A9.93 9.93 0 0022 12c0-5.52-4.48-10-10-10z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M12 6c-3.31 0-6 2.69-6 6 0 1.29.41 2.49 1.11 3.47l1.45-1.45A3.96 3.96 0 018 12c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .74-.2 1.43-.55 2.02l1.45 1.45A5.95 5.95 0 0018 12c0-3.31-2.69-6-6-6z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M8.5 19c1.07.63 2.31 1 3.5 1s2.43-.37 3.5-1"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

interface PinLockScreenProps {
  userEmail: string;
  userName?: string;
  photoUrl?: string;
  onUnlockSuccess: () => void;
  onResetPin: () => void;
}

type PinMode = 'LOADING' | 'VERIFY' | 'CREATE' | 'CONFIRM';

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  onUnlockSuccess,
  onResetPin,
}) => {
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();

  const [mode, setMode] = useState<PinMode>('LOADING');
  const [pin, setPin] = useState<string>('');
  const [draftPin, setDraftPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);

  const promptBiometricAuth = useCallback(async () => {
    try {
      setBiometricLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: strings.pin.biometricPrompt,
        cancelLabel: strings.pin.enterTitle,
        disableDeviceFallback: true,
      });
      setBiometricLoading(false);

      if (result.success) {
        notify.success(strings.common.success, strings.pin.biometricSuccess);
        onUnlockSuccess();
      }
    } catch {
      setBiometricLoading(false);
    }
  }, [strings.pin.biometricPrompt, strings.pin.enterTitle, strings.pin.biometricSuccess, strings.common.success, onUnlockSuccess]);

  useEffect(() => {
    let active = true;
    secureStorage
      .hasPinCode()
      .then(async (hasPin) => {
        if (!active) return;
        setMode(hasPin ? 'VERIFY' : 'CREATE');

        if (hasPin) {
          const hasHw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
          const isEnrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
          const enabled = await secureStorage.isBiometricEnabled().catch(() => true);

          if (active && hasHw && isEnrolled && enabled) {
            setBiometricsAvailable(true);
            setTimeout(() => {
              if (active) promptBiometricAuth();
            }, 350);
          }
        }
      })
      .catch(() => {
        if (active) setMode('CREATE');
      });
    return () => {
      active = false;
    };
  }, [promptBiometricAuth]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'CONFIRM') {
        setMode('CREATE');
        setDraftPin('');
        setPin('');
        setErrorMsg(null);
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [mode]);

  const handleKeyPress = async (digit: string) => {
    if (verifying || mode === 'LOADING' || pin.length >= 4) return;

    setErrorMsg(null);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (mode === 'VERIFY') {
        setVerifying(true);
        const valid = await secureStorage.verifyPinCode(newPin);
        setVerifying(false);

        if (valid) {
          onUnlockSuccess();
        } else {
          setErrorMsg(strings.pin.wrongPin);
          setPin('');
        }
      } else if (mode === 'CREATE') {
        setDraftPin(newPin);
        setPin('');
        setMode('CONFIRM');
      } else if (mode === 'CONFIRM') {
        if (newPin === draftPin) {
          setVerifying(true);
          await secureStorage.savePinCode(newPin);
          setVerifying(false);
          notify.success(strings.common.success, strings.pin.pinSaved);
          onUnlockSuccess();
        } else {
          setErrorMsg(strings.pin.mismatchPin);
          setPin('');
          setMode('CREATE');
          setDraftPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setErrorMsg(null);
      setPin(pin.slice(0, -1));
    }
  };

  const titleLabel =
    mode === 'CREATE'
      ? strings.pin.setupTitle
      : mode === 'CONFIRM'
      ? strings.pin.confirmTitle
      : mode === 'VERIFY'
      ? strings.pin.enterTitle
      : strings.common.loading;

  const subtitleLabel =
    mode === 'CREATE'
      ? strings.pin.setupSubtitle
      : mode === 'CONFIRM'
      ? strings.pin.confirmSubtitle
      : mode === 'VERIFY'
      ? strings.pin.enterSubtitle
      : strings.common.loading;

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header / Back Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={[styles.topBackBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            if (mode === 'CONFIRM') {
              setMode('CREATE');
              setDraftPin('');
              setPin('');
            } else {
              onResetPin();
            }
          }}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18l-6-6 6-6"
              stroke={colors.textPrimary}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Center Icon, Title, Subtitle, and PIN Dots */}
      <View style={styles.centerContent}>
        <View style={[styles.lockIconBox, { backgroundColor: colors.accentSoft }]}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Rect x="5" y="11" width="14" height="10" rx="2" stroke={colors.primary} strokeWidth={2} />
            <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>

        <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>{titleLabel}</Text>
        <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>{subtitleLabel}</Text>

        {/* 4 Circular PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            const isError = Boolean(errorMsg);
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isError
                      ? colors.danger
                      : isFilled
                      ? colors.primary
                      : isDark
                      ? '#262C42'
                      : '#DCE5F8',
                  },
                ]}
              />
            );
          })}
        </View>

        {errorMsg ? (
          <View style={[styles.errorPill, { backgroundColor: colors.dangerSoft }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
          </View>
        ) : (
          <View style={{ height: 26 }} />
        )}

        {(verifying || biometricLoading) && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 2 }} />
        )}
      </View>

      {/* Number Keypad with Rounded Card Buttons */}
      <View style={styles.keypad}>
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
                  styles.keyBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleKeyPress(num)}
                activeOpacity={0.65}
              >
                <Text style={[styles.keyNumberText, { color: colors.textPrimary }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.keypadRow}>
          {biometricsAvailable && mode === 'VERIFY' ? (
            <TouchableOpacity
              style={[
                styles.keyBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={promptBiometricAuth}
              activeOpacity={0.7}
              accessibilityLabel={strings.pin.biometricButton}
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <BiometricIcon color={colors.primary} size={24} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.keyBtnEmpty} />
          )}

          <TouchableOpacity
            style={[
              styles.keyBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.65}
          >
            <Text style={[styles.keyNumberText, { color: colors.textPrimary }]}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.keyBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={handleDelete}
            activeOpacity={0.65}
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
                stroke={colors.textPrimary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M18 9l-6 6M12 9l6 6"
                stroke={colors.textPrimary}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot PIN / Reset option */}
      <TouchableOpacity style={styles.forgotBtn} onPress={onResetPin} activeOpacity={0.75}>
        <Text style={[styles.forgotText, { color: colors.primary }]}>
          {strings.pin.forgotPinLogout}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  lockIconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 22,
    marginBottom: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  errorPill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  keypad: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  keyBtnEmpty: {
    flex: 1,
    height: 58,
  },
  keyNumberText: {
    fontSize: 22,
    fontWeight: '700',
  },
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
