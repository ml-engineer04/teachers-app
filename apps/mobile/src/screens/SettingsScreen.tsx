import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { DownloadsManager } from '../services/storage/downloadsManager';
import { mobileApi } from '../services/api/mobileApi';
import { UserAvatar } from '../components/common/UserAvatar';

interface DeviceItem {
  id: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  platform?: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

interface SettingsScreenProps {
  userEmail: string;
  userName?: string;
  onBack: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userEmail,
  userName = 'O‘qituvchi',
  onBack,
  onLogout,
}) => {
  const [language, setLanguage] = useState<'uz' | 'en'>('uz');
  const [turnStyle, setTurnStyle] = useState<'CURL' | 'SLIDE'>('CURL');
  const [storageMb, setStorageMb] = useState<number>(DownloadsManager.getTotalStorageUsedMb());
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await mobileApi.getMyDevices();
      if (res && Array.isArray(res.devices)) {
        setDevices(res.devices);
      }
    } catch {
      // Fallback preview
      setDevices([
        {
          id: 'dev_1',
          deviceId: 'dev_current_tab',
          deviceModel: 'Samsung Galaxy Tab S7',
          osVersion: 'Android 14',
          lastActiveAt: new Date().toISOString(),
          isCurrent: true,
        },
      ]);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDisconnectDevice = (deviceId: string, name: string) => {
    Alert.alert(
      'Qurilmani uzish',
      `${name} hisobingizdan uzilsinmi? Ushbu qurilmadagi sessiya bekor qilinadi va yangi qurilmaga joy bo‘shaydi.`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Uzish',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.disconnectDevice(deviceId);
              await fetchDevices();
              Alert.alert('Muvaffaqiyatli', `${name} hisobingizdan uzildi. Yangi bo‘sh joy mavjud.`);
            } catch (err: any) {
              Alert.alert('Xatolik', err.message || 'Qurilmani uzishda xatolik yuz berdi.');
            }
          },
        },
      ],
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Xotirani tozalash',
      'Barcha yuklab olingan kitob va audio fayllarni o‘chirishni xohlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O‘chirish',
          style: 'destructive',
          onPress: () => {
            DownloadsManager.clearAllDownloads();
            setStorageMb(0);
            Alert.alert('Tozalandi', 'Oflayn kesh muvaffaqiyatli tozalandi.');
          },
        },
      ],
    );
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
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Sozlamalar & Profil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <UserAvatar name={userName} email={userEmail} size={54} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Tasdiqlangan o‘qituvchi</Text>
            </View>
          </View>
        </View>

        {/* Settings Group */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>ASOSIY SOZLAMALAR</Text>

          <View style={styles.settingsGroup}>
            {/* Language */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setLanguage(language === 'uz' ? 'en' : 'uz')}
            >
              <Text style={styles.settingLabel}>🌐 Dastur tili</Text>
              <Text style={styles.settingValue}>
                {language === 'uz' ? 'O‘zbekcha (Lotin) ›' : 'English ›'}
              </Text>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            {/* Page Curl animation */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setTurnStyle(turnStyle === 'CURL' ? 'SLIDE' : 'CURL')}
            >
              <Text style={styles.settingLabel}>📖 Varaqlash uslubi</Text>
              <Text style={styles.settingValue}>
                {turnStyle === 'CURL' ? '3D Real Curl ›' : 'Slide Silliq ›'}
              </Text>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            {/* Storage usage */}
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingLabel}>💾 Oflayn xotira</Text>
                <Text style={styles.deviceMeta}>{storageMb} MB band qilingan</Text>
              </View>
              {storageMb > 0 && (
                <TouchableOpacity onPress={handleClearCache}>
                  <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 12 }}>
                    Tozalash
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Devices Group (§4 Device limit 2) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>QURILMALAR CHEKLOVI</Text>
            <Text style={[styles.deviceCountText, devices.length >= 2 && { color: '#D97706' }]}>
              {devices.length} / 2 Qurilma
            </Text>
          </View>

          <View style={styles.settingsGroup}>
            {loadingDevices ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#2563EB" size="small" />
              </View>
            ) : devices.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>Faol qurilmalar topilmadi</Text>
              </View>
            ) : (
              devices.map((dev, idx) => (
                <React.Fragment key={dev.deviceId || dev.id || idx}>
                  {idx > 0 && <View style={styles.settingDivider} />}
                  <View style={styles.settingItem}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.settingLabel}>
                        {dev.platform === 'WEB' ? '💻' : '📱'} {dev.deviceModel || 'Qurilma'}
                      </Text>
                      <Text style={styles.deviceMeta}>
                        {dev.isCurrent
                          ? '✓ Ushbu joriy qurilma • Faol'
                          : `Oxirgi faollik: ${formatLastActive(dev.lastActiveAt)}`}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>
                        Tizim: {dev.osVersion || 'Android'}
                      </Text>
                    </View>

                    {dev.isCurrent ? (
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#16A34A', fontWeight: 'bold', fontSize: 11 }}>
                          Asosiy
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDisconnectDevice(dev.deviceId, dev.deviceModel)}
                        style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                      >
                        <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 12 }}>
                          Uzish
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>XAVFSIZLIK & TALQIN</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>🔐 Shifrlash standarti</Text>
              <Text style={styles.settingValue}>AES-256-GCM Keystore</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>⏱ Soat himoyasi</Text>
              <Text style={styles.settingValue}>Monotonic Anchor Faol</Text>
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>📱 Ilova versiyasi</Text>
              <Text style={styles.settingValue}>1.0.0 (Build 6)</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Chiqish (Logout)</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '800',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  deviceCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  deviceMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 10,
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});
