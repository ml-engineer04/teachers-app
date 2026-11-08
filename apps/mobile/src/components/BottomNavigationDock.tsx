import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export type BottomNavTab = 'HOME' | 'GRADE_DETAIL' | 'REQUESTS' | 'SETTINGS';

interface BottomNavigationDockProps {
  currentTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <View style={styles.dockContainer} pointerEvents="box-none">
      <View style={styles.floatingDock}>
        {/* Tab 1: Darsliklar (Home) */}
        {currentTab === 'HOME' ? (
          <View style={styles.dockActivePill}>
            <Text style={styles.dockActiveIcon}>📚</Text>
            <Text style={styles.dockActiveText}>Darsliklar</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dockIconBtn}
            onPress={() => onSelectTab('HOME')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockInactiveIcon}>📚</Text>
          </TouchableOpacity>
        )}

        {/* Tab 2: Sinflar (Grade Detail / Catalog) */}
        {currentTab === 'GRADE_DETAIL' ? (
          <View style={styles.dockActivePill}>
            <Text style={styles.dockActiveIcon}>📖</Text>
            <Text style={styles.dockActiveText}>Sinflar</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dockIconBtn}
            onPress={() => onSelectTab('GRADE_DETAIL')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockInactiveIcon}>📖</Text>
          </TouchableOpacity>
        )}

        {/* Tab 3: Obuna & Tariflar (Requests) */}
        {currentTab === 'REQUESTS' ? (
          <View style={styles.dockActivePill}>
            <Text style={styles.dockActiveIcon}>👑</Text>
            <Text style={styles.dockActiveText}>Obuna</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dockIconBtn}
            onPress={() => onSelectTab('REQUESTS')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockInactiveIcon}>👑</Text>
          </TouchableOpacity>
        )}

        {/* Tab 4: Sozlamalar & Profil (Settings) */}
        {currentTab === 'SETTINGS' ? (
          <View style={styles.dockActivePill}>
            <Text style={styles.dockActiveIcon}>⚙️</Text>
            <Text style={styles.dockActiveText}>Sozlamalar</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.dockIconBtn}
            onPress={() => onSelectTab('SETTINGS')}
            activeOpacity={0.7}
          >
            <Text style={styles.dockInactiveIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dockActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#26344F',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dockActiveIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  dockActiveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  dockIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockInactiveIcon: {
    fontSize: 18,
    opacity: 0.75,
  },
});
