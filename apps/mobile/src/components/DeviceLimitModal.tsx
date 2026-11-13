import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { mobileApi } from '../services/api/mobileApi';
import { notify } from '../services/notifications/notificationService';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

export interface DeviceItem {
  id: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  platform?: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

interface DeviceLimitModalProps {
  visible: boolean;
  devices: DeviceItem[];
  userId?: string;
  onClose: () => void;
  onDeviceDisconnected: (freedDeviceId: string) => void;
}

export const DeviceLimitModal: React.FC<DeviceLimitModalProps> = ({
  visible,
  devices,
  userId,
  onClose,
  onDeviceDisconnected,
}) => {
  const { colors } = useTheme();
  const { strings, language } = useI18n();
  const [confirmDevice, setConfirmDevice] = useState<DeviceItem | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirmDisconnect = async () => {
    if (!confirmDevice) return;
    const targetId = confirmDevice.deviceId || confirmDevice.id;
    setDisconnectingId(targetId);
    setErrorMsg(null);

    try {
      if (userId) {
        await mobileApi.disconnectDeviceByUserId(userId, targetId);
      } else {
        await mobileApi.disconnectDevice(targetId);
      }
      setDisconnectingId(null);
      setConfirmDevice(null);
      notify.success(strings.common.success, strings.settings.deviceRemovedToast);
      onDeviceDisconnected(targetId);
    } catch (err: any) {
      const msg = err?.message || strings.common.unknownError;
      setDisconnectingId(null);
      setErrorMsg(msg);
      notify.error(strings.common.error, msg);
    }
  };

  const formatLastActive = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';
      return `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoString;
    }
  };

  const handleCancelAll = () => {
    setConfirmDevice(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancelAll}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        {!confirmDevice ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleCancelAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={[styles.heroIconWrap, { backgroundColor: colors.primarySoft }]}>
              <Svg width={68} height={68} viewBox="0 0 64 64" fill="none">
                <Rect x="10" y="14" width="44" height="28" rx="4" fill="#93C5FD" stroke="#2563EB" strokeWidth="2.5" />
                <Path d="M4 44H60L56 50H8L4 44Z" fill="#60A5FA" stroke="#2563EB" strokeWidth="2" />
                <Path
                  d="M44 26C44 26 52 28.5 52 35C52 41 44 45 44 45C44 45 36 41 36 35C36 28.5 44 26 44 26Z"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <Path d="M41 35.5L43 37.5L47.5 33" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              </Svg>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {strings.modals.deviceLimitTitle} ({devices.length}/2)
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {strings.modals.deviceLimitDesc}
            </Text>

            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
              {devices.map((device, idx) => (
                <View
                  key={device.deviceId || idx}
                  style={[
                    styles.deviceRow,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.deviceIconBox,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={styles.deviceEmoji}>
                      {device.platform === 'WEB' ? '💻' : '📱'}
                    </Text>
                  </View>

                  <View style={styles.deviceInfo}>
                    <Text style={[styles.deviceModel, { color: colors.textPrimary }]} numberOfLines={1}>
                      {device.deviceModel || strings.settings.devicesTitle}
                    </Text>
                    <Text style={[styles.deviceMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {device.osVersion || 'Android'} • {formatLastActive(device.lastActiveAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.evictPillBtn, { backgroundColor: colors.dangerSoft }]}
                    onPress={() => {
                      setErrorMsg(null);
                      setConfirmDevice(device);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.evictPillText, { color: colors.danger }]}>
                      {strings.settings.removeDeviceBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelGrayBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={handleCancelAll}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelGrayText, { color: colors.textPrimary }]}>
                {strings.modals.deviceLimitCancel}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setConfirmDevice(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>

            <View style={[styles.heroIconWrap, { backgroundColor: colors.primarySoft }]}>
              <Svg width={68} height={68} viewBox="0 0 64 64" fill="none">
                <Rect x="12" y="14" width="40" height="28" rx="4" fill="#4F46E5" />
                <Path d="M6 44H58L54 50H10L6 44Z" fill="#6366F1" />
                <Circle cx="32" cy="28" r="8" fill="#E0E7FF" opacity="0.25" />
                <Path d="M27 23L37 33M37 23L27 33" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
              </Svg>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {strings.settings.removeDeviceBtn}?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {confirmDevice.deviceModel}
              </Text>
            </Text>

            {errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {errorMsg}</Text>
              </View>
            )}

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.cancelGrayBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setConfirmDevice(null)}
                disabled={!!disconnectingId}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelGrayText, { color: colors.textPrimary }]}>
                  {strings.common.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmPrimaryBtn, { backgroundColor: colors.primaryDark }]}
                onPress={handleConfirmDisconnect}
                disabled={!!disconnectingId}
                activeOpacity={0.85}
              >
                {disconnectingId ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={[styles.confirmPrimaryText, { color: colors.onPrimary }]}>
                    {strings.common.ok}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  errorBox: {
    width: '100%',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  deviceList: {
    width: '100%',
    maxHeight: 220,
    marginBottom: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  deviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  deviceEmoji: {
    fontSize: 20,
  },
  deviceInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  deviceModel: {
    fontSize: 14,
    fontWeight: '700',
  },
  deviceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  evictPillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
  },
  evictPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelGrayBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelGrayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmActions: {
    width: '100%',
    gap: 10,
  },
  confirmPrimaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 5,
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
