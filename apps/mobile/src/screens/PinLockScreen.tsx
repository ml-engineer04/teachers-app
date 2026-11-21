import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '../services/storage/secureStorage';
import { UserAvatar } from '../components/common/UserAvatar';
import { notify } from '../services/notifications/notificationService';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

const BiometricIcon = ({ color, size = 26 }: { color: string; size?: number }) => (
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

/**
 * PIN Lock Screen (supports Light/Dark mode and uz/ru/en i18n)
 */
export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  userEmail,
  userName,
  photoUrl,
  onUnlockSuccess,
  onResetPin,
}) => {
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();
  const displayName = userName?.trim() || strings.common.userFallback;

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
            // Automatic biometric prompt on launch for instant unlock
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
      if (mode === 'CREATE') {
        setDraftPin(newPin);
        setTimeout(() => {
          setPin('');
          setMode('CONFIRM');
        }, 160);
        return;
      }

      if (mode === 'CONFIRM') {
        if (newPin !== draftPin) {
          setErrorMsg(strings.pin.mismatchPin);
          notify.error(strings.common.error, strings.pin.mismatchPin);
          setTimeout(() => {
            setPin('');
            setDraftPin('');
            setMode('CREATE');
          }, 420);
          return;
        }
        setVerifying(true);
        await secureStorage.savePinCode(newPin);
        setVerifying(false);
        notify.success(strings.common.success, strings.pin.pinSaved);
        onUnlockSuccess();
        return;
      }

      setVerifying(true);
      const isValid = await secureStorage.verifyPinCode(newPin);
      setVerifying(false);

      if (isValid) {
        onUnlockSuccess();
      } else {
        setErrorMsg(strings.pin.wrongPin);
        notify.error(strings.common.error, strings.pin.wrongPin);
        setTimeout(() => {
          setPin('');
        }, 420);
      }
    }
  };

  const handleDelete = () => {
    if (verifying || pin.length === 0) return;
    setErrorMsg(null);
    setPin(pin.slice(0, -1));
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.glowTop,
          { backgroundColor: isDark ? 'rgba(42, 79, 184, 0.22)' : 'rgba(42, 79, 184, 0.08)' },
        ]}
      />
      <View
        style={[
          styles.glowBottom,
          { backgroundColor: isDark ? 'rgba(14, 124, 112, 0.16)' : 'rgba(14, 124, 112, 0.08)' },
        ]}
      />

      <View style={styles.centerContent}>
        <View style={[styles.avatarRing, { borderColor: colors.primary + '55' }]}>
          <UserAvatar name={displayName} email={userEmail} photoUrl={photoUrl} size={74} />
        </View>

        <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{displayName}</Text>
        {userEmail ? (
          <Text style={[styles.userEmailText, { color: colors.primary }]}>{userEmail}</Text>
        ) : null}
        <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>{titleLabel}</Text>
        <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>{subtitleLabel}</Text>

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
                  { borderColor: colors.borderStrong },
                  isFilled && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                  },
                  isError && {
                    borderColor: colors.danger,
                    backgroundColor: colors.danger,
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
        ) : biometricsAvailable && mode === 'VERIFY' ? (
          <TouchableOpacity
            style={[
              styles.quickBiometricPill,
              { backgroundColor: colors.primarySoft, borderColor: colors.primary + '33' },
            ]}
            onPress={promptBiometricAuth}
            activeOpacity={0.75}
          >
            <BiometricIcon color={colors.primary} size={15} />
            <Text style={[styles.quickBiometricText, { color: colors.primary }]}>
              {strings.pin.biometricButton}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 28 }} />
        )}

        {(verifying || biometricLoading) && (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
        )}
      </View>

      {/* Translucent Circular NumPad */}
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
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    shadowColor: colors.shadowColor,
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
                  backgroundColor: colors.surface,
                  borderColor: colors.primary + '55',
                  shadowColor: colors.primary,
                },
              ]}
              onPress={promptBiometricAuth}
              activeOpacity={0.7}
              accessibilityLabel={strings.pin.biometricButton}
            >
              {biometricLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <BiometricIcon color={colors.primary} size={28} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.keyBtnGhost} />
          )}
          <TouchableOpacity
            style={[
              styles.keyBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
              },
            ]}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.65}
          >
            <Text style={[styles.keyNumberText, { color: colors.textPrimary }]}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keyBtnGhost} onPress={handleDelete} activeOpacity={0.65}>
            <Text style={[styles.deleteKeyText, { color: colors.textSecondary }]}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

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
    paddingBottom: 26,
    position: 'relative',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  centerContent: {
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 24,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 44,
    borderWidth: 2,
    marginBottom: 12,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  userEmailText: {
    fontSize: 13,
    marginTop: 3,
    marginBottom: 8,
    fontWeight: '600',
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  errorPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: DS.radius.pill,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickBiometricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    marginTop: 8,
  },
  quickBiometricText: {
    fontSize: 12,
    fontWeight: '700',
  },
  keypad: {
    paddingHorizontal: 42,
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  keyBtnGhost: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyNumberText: {
    fontSize: 24,
    fontWeight: '600',
  },
  biometricGlyph: {
    fontSize: 22,
    opacity: 0.65,
  },
  deleteKeyText: {
    fontSize: 22,
    fontWeight: '600',
  },
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
