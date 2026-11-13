import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { UserAvatar } from './common/UserAvatar';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import type { AppLanguage } from '../services/storage/appPreferences';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SideMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  photoUrl?: string;
  activeGrade?: number;
  activeDaysRemaining?: number;
  currentScreen: string;
  onNavigate: (screen: 'HOME' | 'GRADE_DETAIL' | 'READER' | 'REQUESTS' | 'SETTINGS') => void;
  onLogout: () => void;
}

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  visible,
  onClose,
  userName,
  userEmail = '',
  photoUrl,
  activeGrade,
  activeDaysRemaining,
  currentScreen,
  onNavigate,
  onLogout,
}) => {
  const { colors, isDark } = useTheme();
  const { strings, language, setLanguage, formatGrade } = useI18n();

  const resolvedName = userName || strings.common.userFallback;

  const menuItems: Array<{
    id: 'HOME' | 'GRADE_DETAIL' | 'REQUESTS' | 'SETTINGS';
    title: string;
    subtitle: string;
    icon: string;
  }> = [
    {
      id: 'HOME',
      title: strings.nav.home,
      subtitle: strings.home.recommendedTitle,
      icon: '🏠',
    },
    {
      id: 'GRADE_DETAIL',
      title: strings.nav.grades,
      subtitle: strings.grades.headerSubtitle,
      icon: '📚',
    },
    {
      id: 'REQUESTS',
      title: strings.nav.requests,
      subtitle: strings.requests.headerSubtitle,
      icon: '💳',
    },
    {
      id: 'SETTINGS',
      title: strings.nav.settings,
      subtitle: strings.settings.headerSubtitle,
      icon: '⚙️',
    },
  ];

  const handleItemPress = (screen: 'HOME' | 'GRADE_DETAIL' | 'REQUESTS' | 'SETTINGS') => {
    onClose();
    setTimeout(() => onNavigate(screen), 120);
  };

  const handleLogoutPress = () => {
    onClose();
    setTimeout(() => onLogout(), 120);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={[styles.drawerSheet, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={styles.drawerScroll} showsVerticalScrollIndicator={false}>
            {/* Header Card */}
            <View
              style={[
                styles.profileHeader,
                { backgroundColor: isDark ? '#17224B' : '#1E293B' },
              ]}
            >
              <View style={styles.headerTopRow}>
                <UserAvatar name={resolvedName} email={userEmail} photoUrl={photoUrl} size={52} />
                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{resolvedName}</Text>
              {!!userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}

              <View style={styles.statusPill}>
                <View style={styles.greenDot} />
                <Text style={styles.statusText}>
                  {activeGrade
                    ? `${strings.home.activePlanBadge} • ${formatGrade(activeGrade)}${
                        activeDaysRemaining ? ` (${activeDaysRemaining} d)` : ''
                      }`
                    : strings.common.teacher}
                </Text>
              </View>
            </View>

            {/* 3-Way Language Switcher (UZ / RU / EN) */}
            <View style={[styles.langBar, { borderBottomColor: colors.border }]}>
              <Text style={[styles.langLabel, { color: colors.textSecondary }]}>
                {strings.drawer.language}:
              </Text>
              <View style={[styles.langToggleWrap, { backgroundColor: colors.surfaceAlt }]}>
                {(
                  [
                    { code: 'uz', label: 'O‘Z' },
                    { code: 'ru', label: 'РУ' },
                    { code: 'en', label: 'EN' },
                  ] as Array<{ code: AppLanguage; label: string }>
                ).map((item) => {
                  const active = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.langBtn,
                        active && { backgroundColor: colors.primaryDark },
                      ]}
                      onPress={() => setLanguage(item.code)}
                    >
                      <Text
                        style={[
                          styles.langBtnText,
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

            {/* Nav List */}
            <View style={styles.menuList}>
              <Text style={[styles.menuSectionTitle, { color: colors.textMuted }]}>
                {strings.drawer.navigation.toUpperCase()}
              </Text>
              {menuItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      isActive && { backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => handleItemPress(item.id)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.menuIconBox,
                        { backgroundColor: isActive ? colors.cardBg : colors.surfaceAlt },
                      ]}
                    >
                      <Text style={styles.menuEmoji}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuTextBox}>
                      <Text
                        style={[
                          styles.menuTitle,
                          { color: isActive ? colors.primaryText : colors.textPrimary },
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.menuSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Offline Notice */}
            <View
              style={[
                styles.securityBox,
                { backgroundColor: colors.primarySoft, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.securityTitle, { color: colors.primaryText }]}>
                🛡️ AES-256-GCM
              </Text>
              <Text style={[styles.securityDesc, { color: colors.textSecondary }]}>
                {strings.drawer.offlineNotice}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: colors.dangerSoft }]}
              onPress={handleLogoutPress}
              activeOpacity={0.8}
            >
              <Text style={[styles.logoutText, { color: colors.danger }]}>
                {strings.drawer.logout}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerInfo}>
              <Text style={[styles.appTitle, { color: colors.textPrimary }]}>
                {strings.common.appName}
              </Text>
              <Text style={[styles.versionText, { color: colors.textMuted }]}>
                v2.0
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropTouch: {
    flex: 1,
  },
  drawerSheet: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: Math.min(SCREEN_WIDTH * 0.82, 320),
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerScroll: {
    paddingBottom: 32,
  },
  profileHeader: {
    padding: 20,
    paddingTop: 28,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  langToggleWrap: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuList: {
    padding: 16,
  },
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  securityBox: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footerInfo: {
    marginTop: 18,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 10,
    marginTop: 2,
  },
});
