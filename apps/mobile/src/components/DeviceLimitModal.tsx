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
import { mobileApi } from '../services/api/mobileApi';

interface DeviceItem {
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
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDisconnect = async (deviceIdToRemove: string) => {
    setDisconnectingId(deviceIdToRemove);
    setErrorMsg(null);

    try {
      if (userId) {
        await mobileApi.disconnectDeviceByUserId(userId, deviceIdToRemove);
      } else {
        await mobileApi.disconnectDevice(deviceIdToRemove);
      }
      setDisconnectingId(null);
      onDeviceDisconnected(deviceIdToRemove);
    } catch (err: any) {
      setDisconnectingId(null);
      setErrorMsg(err.message || 'Qurilmani uzishda xatolik yuz berdi');
    }
  };

  const formatLastActive = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header Indicator */}
          <View style={styles.handleBar} />

          {/* Title Area */}
          <View style={styles.header}>
            <View style={styles.shieldIconCircle}>
              <Text style={styles.shieldIcon}>📱</Text>
            </View>
            <Text style={styles.title}>Qurilmalar Chegarasi (2/2)</Text>
            <Text style={styles.subtitle}>
              Sizning SmartTeacherBook hisobingiz allaqachon 2 ta qurilmada faol. Yangi qurilmadan kirish uchun
              avvalgi qurilmalardan birini hisobdan uzing:
            </Text>
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Device Cards */}
          <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
            {devices.map((device, idx) => (
              <View key={device.deviceId || idx} style={styles.deviceCard}>
                <View style={styles.deviceIconBox}>
                  <Text style={styles.deviceIcon}>
                    {device.platform === 'WEB' ? '💻' : '📱'}
                  </Text>
                </View>

                <View style={styles.deviceDetails}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceModelText}>
                      {device.deviceModel || 'Nomaʼlum qurilma'}
                    </Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Faol</Text>
                    </View>
                  </View>

                  <Text style={styles.deviceOsText}>
                    Tizim: {device.osVersion || 'Android'} • Platform: {device.platform || 'ANDROID'}
                  </Text>
                  <Text style={styles.lastActiveText}>
                    Oxirgi faollik: {formatLastActive(device.lastActiveAt)}
                  </Text>

                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={() => handleDisconnect(device.deviceId)}
                    disabled={disconnectingId === device.deviceId}
                    activeOpacity={0.8}
                  >
                    {disconnectingId === device.deviceId ? (
                      <ActivityIndicator color="#EF4444" size="small" />
                    ) : (
                      <Text style={styles.disconnectBtnText}>
                        🗑️ Ushbu qurilmani hisobdan uzish
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Bekor qilish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handleBar: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shieldIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2942',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceList: {
    marginVertical: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIcon: {
    fontSize: 22,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceModelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  deviceOsText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  lastActiveText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 10,
  },
  disconnectBtn: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
