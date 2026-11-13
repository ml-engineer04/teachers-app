import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  BackHandler,
  RefreshControl,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import type { AppLanguage } from '../services/storage/appPreferences';
import { UserAvatar } from '../components/common/UserAvatar';
import { mobileApi } from '../services/api/mobileApi';
import { secureStorage } from '../services/storage/secureStorage';
import { DownloadsManager, DownloadedItem } from '../services/storage/downloadsManager';
import { SubscriptionManager } from '../services/subscription/subscriptionManager';
import { notify } from '../services/notifications/notificationService';

interface SettingsScreenProps {
  userName: string;
  userEmail: string;
  photoUrl?: string;
  onBack?: () => void;
  onOpenReader?: (book: {
    id: string;
    title: string;
    gradeId: number;
    subjectId: string;
    totalPages: number;
    contentStartPdfPage?: number;
    type?: string;
  }) => void;
  onProfileUpdated?: (updated: { name: string; photoUrl?: string }) => void;
  onOpenRequests?: (gradeId?: number, subjectId?: string) => void;
  onResetPin?: () => void;
  onLogout: () => void;
}

const LANGUAGE_CHOICES: Array<{ code: AppLanguage; label: string; badge: string }> = [
  { code: 'uz', label: 'O‘zbek', badge: 'UZ' },
  { code: 'ru', label: 'Русский', badge: 'RU' },
  { code: 'en', label: 'English', badge: 'EN' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userName,
  userEmail,
  photoUrl,
  onBack,
  onOpenReader,
  onProfileUpdated,
  onOpenRequests,
  onResetPin,
  onLogout,
}) => {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const { language, setLanguage, strings, t, formatGrade } = useI18n();

  const [displayName, setDisplayName] = useState(userName || strings.common.userFallback);
  const [storageMb, setStorageMb] = useState<number>(0);
  const [downloads, setDownloads] = useState<DownloadedItem[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState(userName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [confirmClearAllOffline, setConfirmClearAllOffline] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [confirmDisconnectDevice, setConfirmDisconnectDevice] = useState<any | null>(null);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSavedMsg, setPinSavedMsg] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmLogoutOpen) {
        setConfirmLogoutOpen(false);
        return true;
      }
      if (confirmClearAllOffline) {
        setConfirmClearAllOffline(false);
        return true;
      }
      if (confirmDisconnectDevice) {
        setConfirmDisconnectDevice(null);
        return true;
      }
      if (editProfileOpen) {
        setEditProfileOpen(false);
        return true;
      }
      if (offlineModalOpen) {
        setOfflineModalOpen(false);
        return true;
      }
      if (securityModalOpen) {
        setSecurityModalOpen(false);
        return true;
      }
      if (devicesModalOpen) {
        setDevicesModalOpen(false);
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    confirmLogoutOpen,
    confirmClearAllOffline,
    confirmDisconnectDevice,
    editProfileOpen,
    offlineModalOpen,
    securityModalOpen,
    devicesModalOpen,
    onBack,
  ]);

  useEffect(() => {
    setDisplayName(userName || strings.common.userFallback);
    setEditNameInput(userName || '');
  }, [userName, strings.common.userFallback]);

  const refreshLocalState = useCallback(async () => {
    await DownloadsManager.init().catch(() => {});
    setStorageMb(DownloadsManager.getTotalStorageUsedMb());
    setDownloads(DownloadsManager.getAllDownloadedBundles());
  }, []);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await mobileApi.getMyDevices();
      const list = Array.isArray(res) ? res : res?.devices || [];
      setDevices(list);
    } catch (err: any) {
      setDevices([]);
      if (err && !err.isNetworkError) {
        notify.warning(strings.common.warning, err?.message || strings.common.noData);
      }
    } finally {
      setLoadingDevices(false);
    }
  }, [strings.common.noData, strings.common.warning]);

  useEffect(() => {
    refreshLocalState();
    loadDevices();
  }, [refreshLocalState, loadDevices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        SubscriptionManager.syncFromBackend().catch(() => {}),
        refreshLocalState(),
        loadDevices(),
        mobileApi
          .getProfile()
          .then((remote) => {
            const remoteUser = remote?.user || remote;
            if (remoteUser?.fullName) {
              setDisplayName(remoteUser.fullName);
              setEditNameInput(remoteUser.fullName);
              onProfileUpdated?.({
                name: remoteUser.fullName,
                photoUrl: remoteUser.avatarUrl,
              });
            }
          })
          .catch(() => {}),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshLocalState, loadDevices, onProfileUpdated]);

  const handleSaveProfile = async () => {
    const trimmed = editNameInput.trim();
    if (trimmed.length < 2) {
      notify.warning(strings.common.warning, strings.settings.namePlaceholder);
      return;
    }
    setSavingProfile(true);
    try {
      await mobileApi.updateProfile(trimmed);
      const existing = (await secureStorage.getUserProfile()) || {};
      await secureStorage.saveUserProfile({
        ...existing,
        fullName: trimmed,
        name: trimmed,
        email: userEmail,
      });
      setDisplayName(trimmed);
      onProfileUpdated?.({ name: trimmed, photoUrl });
      setEditProfileOpen(false);
      notify.success(strings.common.success, strings.settings.profileSaved);
    } catch (err: any) {
      setDisplayName(trimmed);
      onProfileUpdated?.({ name: trimmed, photoUrl });
      setEditProfileOpen(false);
      notify.info(strings.common.info, err?.message || strings.settings.profileSaved);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNewPin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      notify.warning(strings.common.warning, strings.pin.setupSubtitle);
      return;
    }
    await secureStorage.savePinCode(newPin);
    setNewPin('');
    setPinSavedMsg(strings.pin.pinSaved);
    notify.success(strings.common.success, strings.pin.pinSaved);
    setTimeout(() => setPinSavedMsg(''), 2500);
  };

  const handleDisconnectConfirmed = async () => {
    if (!confirmDisconnectDevice) return;
    try {
      const targetId = confirmDisconnectDevice.deviceId || confirmDisconnectDevice.id;
      await mobileApi.disconnectDevice(targetId);
      setConfirmDisconnectDevice(null);
      notify.success(strings.common.success, strings.settings.deviceRemovedToast);
      await loadDevices();
    } catch (err: any) {
      notify.error(strings.common.error, err?.message || strings.common.unknownError);
    }
  };

  const handleLogoutConfirmed = async () => {
    setConfirmLogoutOpen(false);
    try {
      const devId = await secureStorage.getOrCreateDeviceId();
      await mobileApi.logout(devId);
    } catch {}
    SubscriptionManager.clearCache();
    onLogout();
  };

  const localeTag = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          {onBack && (
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={onBack}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.textPrimary}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {strings.settings.headerTitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => setSecurityModalOpen(true)}
          accessibilityLabel={strings.settings.securityTitle}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <UserAvatar name={displayName} email={userEmail} photoUrl={photoUrl} size={60} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text
              style={[styles.profileEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {userEmail}
            </Text>
            <View style={styles.verifiedBadgeRow}>
              <View style={[styles.verifiedDot, { backgroundColor: colors.accent }]}>
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 13l4 4L19 7"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={[styles.verifiedText, { color: colors.accent }]}>
                {strings.settings.accountCardTitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditNameInput(displayName);
                setEditProfileOpen(true);
              }}
              style={[styles.editProfileLink, { backgroundColor: colors.primarySoft }]}
            >
              <Text style={[styles.editProfileLinkText, { color: colors.primaryText }]}>
                {strings.settings.editProfileBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Central Appearance (Light / Dark) & Language Card */}
        <View
          style={[
            styles.prefCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Theme Mode Switcher */}
          <View style={styles.prefSection}>
            <View style={styles.prefHeader}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Text style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {strings.settings.appearanceTitle}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {strings.settings.appearanceDesc}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.segmentedTrack,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  themeMode === 'light' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: themeMode === 'light' ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  ☀️ {strings.settings.themeLight}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  themeMode === 'dark' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    { color: themeMode === 'dark' ? colors.onPrimary : colors.textSecondary },
                  ]}
                >
                  🌙 {strings.settings.themeDark}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.fullDivider, { backgroundColor: colors.border }]} />

          {/* Language Switcher (UZ / RU / EN) */}
          <View style={styles.prefSection}>
            <View style={styles.prefHeader}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={9} stroke={colors.primary} strokeWidth={2} />
                  <Path
                    d="M3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 000 18M12 3a13.5 13.5 0 010 18"
                    stroke={colors.primary}
                    strokeWidth={1.7}
                  />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {strings.settings.languageTitle}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {strings.settings.languageDesc}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.segmentedTrack,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              {LANGUAGE_CHOICES.map((item) => {
                const active = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.segmentBtn, active && { backgroundColor: colors.primary }]}
                    onPress={() => setLanguage(item.code)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        { color: active ? colors.onPrimary : colors.textSecondary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* System Settings Menu Card */}
        <View
          style={[
            styles.menuCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          {/* Offline Mode */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              refreshLocalState();
              setOfflineModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {strings.settings.offlineTitle}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {t('settings.offlineSummary', {
                    count: downloads.length,
                    size: `${storageMb} MB`,
                  })}
                </Text>
              </View>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 6l6 6-6 6"
                stroke={colors.textMuted}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Security */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setSecurityModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x={5}
                    y={11}
                    width={14}
                    height={10}
                    rx={2.5}
                    stroke={colors.primary}
                    strokeWidth={2}
                  />
                  <Path
                    d="M8 11V7a4 4 0 118 0v4"
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {strings.settings.securityTitle}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {strings.settings.autoLockLabel}: {strings.settings.autoLockValue}
                </Text>
              </View>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 6l6 6-6 6"
                stroke={colors.textMuted}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Connected Devices */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              loadDevices();
              setDevicesModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: colors.primarySoft }]}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x={3}
                    y={4}
                    width={18}
                    height={12}
                    rx={2}
                    stroke={colors.primary}
                    strokeWidth={2}
                  />
                  <Path
                    d="M2 20h20"
                    stroke={colors.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  {strings.settings.devicesTitle}
                </Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  {devices.length}/2
                </Text>
              </View>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 6l6 6-6 6"
                stroke={colors.textMuted}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            { backgroundColor: colors.cardBg, borderColor: colors.danger + '55' },
          ]}
          onPress={() => setConfirmLogoutOpen(true)}
          activeOpacity={0.85}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
              stroke={colors.danger}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.logoutBtnText, { color: colors.danger }]}>
            {strings.settings.logoutBtn}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          {strings.settings.versionLabel}: 2.1 • {strings.common.appName}
        </Text>
      </ScrollView>

      {/* Modal 1: Edit Profile */}
      <Modal
        visible={editProfileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {strings.settings.editProfileTitle}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {strings.settings.nameLabel}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={editNameInput}
              onChangeText={setEditNameInput}
              placeholder={strings.settings.namePlaceholder}
              placeholderTextColor={colors.placeholder}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setEditProfileOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  {strings.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                    {strings.common.save}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Offline Bundles */}
      <Modal
        visible={offlineModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOfflineModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {strings.settings.offlineTitle}
              </Text>
              <TouchableOpacity onPress={() => setOfflineModalOpen(false)}>
                <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {t('settings.offlineSummary', {
                count: downloads.length,
                size: `${storageMb} MB`,
              })}
            </Text>

            {downloads.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {strings.settings.offlineEmpty}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 240 }}>
                {downloads.map((d) => (
                  <View
                    key={d.bookId || d.key}
                    style={[styles.listRowItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listRowTitle, { color: colors.textPrimary }]}>
                        {d.title}
                      </Text>
                      <Text style={[styles.listRowSub, { color: colors.textSecondary }]}>
                        {formatGrade(d.gradeId)} •{' '}
                        {Math.max(1, Math.round(d.sizeBytes / (1024 * 1024)))} MB •{' '}
                        {strings.common.offlineMode}
                      </Text>
                    </View>
                    <View style={styles.offlineRowActions}>
                      {onOpenReader && (
                        <TouchableOpacity
                          style={[styles.openChip, { backgroundColor: colors.primarySoft }]}
                          onPress={async () => {
                            const { allowed, access } = await SubscriptionManager.checkBookAccess({
                              bookId: d.bookId,
                              gradeId: d.gradeId || 11,
                              subjectId: d.subjectId || d.subjectCode,
                            });
                            if (!allowed) {
                              setOfflineModalOpen(false);
                              notify.error(
                                access.status === 'EXPIRED'
                                  ? strings.modals.expiredTitle
                                  : strings.common.locked,
                                strings.modals.expiredDesc,
                              );
                              onOpenRequests?.(d.gradeId, d.subjectId || d.subjectCode);
                              return;
                            }
                            setOfflineModalOpen(false);
                            onOpenReader({
                              id: d.bookId,
                              title: d.title,
                              gradeId: d.gradeId,
                              subjectId: d.subjectId || d.subjectCode || 'sub_eng',
                              totalPages: d.totalPages || 6,
                              contentStartPdfPage: d.contentStartPdfPage,
                              type: d.bookType,
                            });
                          }}
                        >
                          <Text style={[styles.openChipText, { color: colors.primaryText }]}>
                            {strings.home.openBook}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.deleteChip, { backgroundColor: colors.dangerSoft }]}
                        onPress={async () => {
                          await DownloadsManager.deleteBundle(d.gradeId, d.subjectCode, d.bookId);
                          await refreshLocalState();
                          notify.info(strings.common.info, strings.grades.offlineDeleted);
                        }}
                      >
                        <Text style={[styles.deleteChipText, { color: colors.danger }]}>
                          {strings.settings.deleteOneBtn}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {downloads.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.logoutBtn,
                  {
                    marginTop: 14,
                    backgroundColor: colors.cardBg,
                    borderColor: colors.danger + '55',
                  },
                ]}
                onPress={() => setConfirmClearAllOffline(true)}
              >
                <Text style={[styles.logoutBtnText, { color: colors.danger }]}>
                  {strings.settings.clearAllBtn}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal 2b: Confirm Clear All Offline Downloads */}
      <Modal
        visible={confirmClearAllOffline}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmClearAllOffline(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {strings.settings.clearAllConfirmTitle}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {strings.settings.clearAllConfirmDesc}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setConfirmClearAllOffline(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  {strings.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.danger }]}
                onPress={async () => {
                  setConfirmClearAllOffline(false);
                  await DownloadsManager.clearAllDownloads();
                  await refreshLocalState();
                  notify.success(strings.common.success, strings.settings.offlineClearedToast);
                }}
              >
                <Text style={styles.modalSaveText}>{strings.common.delete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Security & PIN */}
      <Modal
        visible={securityModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSecurityModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {strings.settings.securityTitle}
              </Text>
              <TouchableOpacity onPress={() => setSecurityModalOpen(false)}>
                <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.secInfoRow, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.secInfoTitle, { color: colors.primaryText }]}>
                🔒 {strings.settings.securityTitle}
              </Text>
              <Text style={[styles.secInfoSub, { color: colors.textSecondary }]}>
                {strings.pin.securityHint}
              </Text>
            </View>

            <Text style={[styles.modalSub, { marginTop: 12, marginBottom: 6, color: colors.textSecondary }]}>
              {strings.settings.pinChangeBtn}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
            {!!pinSavedMsg && (
              <Text style={[styles.pinSuccessText, { color: colors.accent }]}>{pinSavedMsg}</Text>
            )}

            <View style={styles.modalActions}>
              {onResetPin && (
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => {
                    setSecurityModalOpen(false);
                    onResetPin();
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                    {strings.common.delete} PIN
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveNewPin}
              >
                <Text style={[styles.modalSaveText, { color: colors.onPrimary }]}>
                  {strings.common.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 4: Connected Devices */}
      <Modal
        visible={devicesModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDevicesModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {strings.settings.devicesTitle} ({devices.length}/2)
              </Text>
              <TouchableOpacity onPress={() => setDevicesModalOpen(false)}>
                <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {strings.modals.deviceLimitDesc}
            </Text>

            {loadingDevices ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : devices.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {strings.settings.devicesEmpty}
                </Text>
              </View>
            ) : (
              devices.map((dev, idx) => (
                <View
                  key={dev.id || dev.deviceId || idx}
                  style={[styles.listRowItem, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listRowTitle, { color: colors.textPrimary }]}>
                      {dev.deviceModel || 'Device'}{' '}
                      {dev.isCurrent ? `(${strings.settings.currentDeviceBadge})` : ''}
                    </Text>
                    <Text style={[styles.listRowSub, { color: colors.textSecondary }]}>
                      {dev.platform || dev.osVersion || 'OS'} •{' '}
                      {dev.lastActiveAt
                        ? new Date(dev.lastActiveAt).toLocaleDateString(localeTag)
                        : strings.common.active}
                    </Text>
                  </View>
                  {!dev.isCurrent && (
                    <TouchableOpacity
                      style={[styles.deleteChip, { backgroundColor: colors.dangerSoft }]}
                      onPress={() => setConfirmDisconnectDevice(dev)}
                    >
                      <Text style={[styles.deleteChipText, { color: colors.danger }]}>
                        {strings.settings.removeDeviceBtn}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            <TouchableOpacity
              style={[
                styles.modalCancelBtn,
                { marginTop: 14, width: '100%', flex: undefined, backgroundColor: colors.surfaceAlt },
              ]}
              onPress={() => setDevicesModalOpen(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                {strings.common.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 5: Confirm Disconnect Device */}
      <Modal
        visible={!!confirmDisconnectDevice}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDisconnectDevice(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {strings.settings.removeDeviceBtn}?
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {confirmDisconnectDevice?.deviceModel || 'Device'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setConfirmDisconnectDevice(null)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  {strings.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.danger }]}
                onPress={handleDisconnectConfirmed}
              >
                <Text style={styles.modalSaveText}>{strings.settings.removeDeviceBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 6: Confirm Logout */}
      <Modal
        visible={confirmLogoutOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLogoutOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {strings.settings.logoutConfirmTitle}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {strings.settings.logoutConfirmDesc}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setConfirmLogoutOpen(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  {strings.common.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.danger }]}
                onPress={handleLogoutConfirmed}
              >
                <Text style={styles.modalSaveText}>{strings.settings.logoutBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    borderRadius: DS.radius.lg,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editProfileLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editProfileLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  prefCard: {
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  prefSection: {
    padding: 14,
    gap: 12,
  },
  prefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  fullDivider: {
    height: 1,
  },
  menuCard: {
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 66,
  },
  logoutBtn: {
    marginTop: 18,
    borderRadius: DS.radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: DS.radius.xl,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  closeX: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyBox: {
    borderRadius: 12,
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  listRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  listRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  offlineRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secInfoRow: {
    padding: 12,
    borderRadius: 12,
  },
  secInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  secInfoSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  pinSuccessText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
});
