import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { UserAvatar } from './common/UserAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SideMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
  activeGrade?: number;
  currentScreen: string;
  onNavigate: (screen: 'HOME' | 'GRADE_DETAIL' | 'READER' | 'REQUESTS' | 'SETTINGS') => void;
  onLogout: () => void;
}

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  visible,
  onClose,
  userName = 'O‘qituvchi',
  userEmail = '',
  activeGrade = 11,
  currentScreen,
  onNavigate,
  onLogout,
}) => {
  const [currentLang, setCurrentLang] = React.useState<'UZ' | 'EN'>('UZ');

  const menuItems: Array<{
    id: 'HOME' | 'GRADE_DETAIL' | 'READER' | 'REQUESTS' | 'SETTINGS';
    title: string;
    subtitle: string;
    icon: string;
    badge?: string;
  }> = [
    {
      id: 'HOME',
      title: 'Bosh Sahifa',
      subtitle: 'Dars jadvali va davom ettirish',
      icon: '🏠',
    },
    {
      id: 'GRADE_DETAIL',
      title: 'Sinflar & Darsliklar',
      subtitle: '1–11 sinf kitoblari va audio/video',
      icon: '📚',
      badge: '1–11',
    },
    {
      id: 'READER',
      title: 'Raqamli Kitobxon',
      subtitle: '3D varaqlash va mashq javoblari',
      icon: '📖',
      badge: '3D Curl',
    },
    {
      id: 'REQUESTS',
      title: 'Obuna & Savdo Stoli',
      subtitle: '1, 3 va 12 oylik darslik to‘plamlari',
      icon: '💳',
      badge: 'Faol',
    },
    {
      id: 'SETTINGS',
      title: 'Sozlamalar & Qurilmalar',
      subtitle: '2-qurilma nazorati va profil',
      icon: '⚙️',
    },
  ];

  const handleItemPress = (screen: 'HOME' | 'GRADE_DETAIL' | 'READER' | 'REQUESTS' | 'SETTINGS') => {
    onClose();
    setTimeout(() => {
      onNavigate(screen);
    }, 150);
  };

  const handleLogoutPress = () => {
    onClose();
    setTimeout(() => {
      onLogout();
    }, 150);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Dark Backdrop (Tap to close) */}
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sliding Side Drawer Sheet on the LEFT */}
        <SafeAreaView style={styles.drawerSheet}>
          <ScrollView
            contentContainerStyle={styles.drawerScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Header: User Profile Card */}
            <View style={styles.profileHeader}>
              <View style={styles.headerTopRow}>
                <UserAvatar name={userName} email={userEmail} size={50} />

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>

              <View style={styles.statusPill}>
                <View style={styles.greenPulse} />
                <Text style={styles.statusText}>
                  Faol Obuna • {activeGrade}-sinf (25 kun)
                </Text>
              </View>
            </View>

            {/* Language Quick Switcher */}
            <View style={styles.langBar}>
              <Text style={styles.langLabel}>Ilova Tili:</Text>
              <View style={styles.langToggleWrap}>
                <TouchableOpacity
                  style={[styles.langBtn, currentLang === 'UZ' && styles.langBtnActive]}
                  onPress={() => setCurrentLang('UZ')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langBtnText, currentLang === 'UZ' && styles.langBtnTextActive]}>
                    🇺🇿 O‘zbek
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.langBtn, currentLang === 'EN' && styles.langBtnActive]}
                  onPress={() => setCurrentLang('EN')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langBtnText, currentLang === 'EN' && styles.langBtnTextActive]}>
                    🇬🇧 English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Menu Items List */}
            <View style={styles.menuList}>
              <Text style={styles.menuSectionTitle}>ASOSIY MENYU</Text>

              {menuItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleItemPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconBox, isActive && styles.menuIconBoxActive]}>
                      <Text style={styles.menuEmoji}>{item.icon}</Text>
                    </View>

                    <View style={styles.menuTextBox}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.menuTitle, isActive && styles.menuTitleActive]}>
                          {item.title}
                        </Text>
                        {item.badge && (
                          <View style={styles.badgePill}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Security & Info Box */}
            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>🛡️ Xavfsizlik & Oflayn Rejim</Text>
              <Text style={styles.securityDesc}>
                Android Keystore AES-256-GCM apparat shifrlash faol. Darsliklar qurilmada 100% himoyalangan.
              </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogoutPress}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Akkauntdan Chiqish</Text>
            </TouchableOpacity>

            {/* Footer Version Info */}
            <View style={styles.footerInfo}>
              <Text style={styles.appTitle}>SmartTeacherBook</Text>
              <Text style={styles.versionText}>Versiya 1.0.0 (Build 6) • Android 15</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 100000,
  },
  drawerSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 310,
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    zIndex: 100001,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 30,
  },
  drawerScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  langToggleWrap: {
    flexDirection: 'row',
    gap: 4,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  langBtnActive: {
    backgroundColor: '#0F172A',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  menuList: {
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    marginBottom: 6,
  },
  menuItemActive: {
    backgroundColor: '#F1F5F9',
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuIconBoxActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuTextBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  menuTitleActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  badgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  securityBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  logoutIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  footerInfo: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  appTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  versionText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
