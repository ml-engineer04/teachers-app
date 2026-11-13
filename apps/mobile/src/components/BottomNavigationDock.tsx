import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

export type BottomNavTab = 'HOME' | 'GRADE_DETAIL' | 'REQUESTS' | 'SETTINGS';

interface BottomNavigationDockProps {
  currentTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { colors } = useTheme();
  const { strings } = useI18n();

  const renderIcon = (tab: BottomNavTab, active: boolean) => {
    const color = active ? colors.primaryText : colors.textMuted;
    const strokeWidth = active ? 2.3 : 1.9;
    const fillSoft = active ? colors.primarySoft : 'none';

    if (tab === 'HOME') {
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
            fill={fillSoft}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    if (tab === 'GRADE_DETAIL') {
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            fill={fillSoft}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    if (tab === 'REQUESTS') {
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="3"
            fill={fillSoft}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path d="M2 10h20" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    }

    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle
          cx="12"
          cy="12"
          r="3"
          fill={fillSoft}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <Path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  };

  const items: Array<{ key: BottomNavTab; label: string }> = [
    { key: 'HOME', label: strings.nav.home },
    { key: 'GRADE_DETAIL', label: strings.nav.grades },
    { key: 'REQUESTS', label: strings.nav.requests },
    { key: 'SETTINGS', label: strings.nav.settings },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.dockBg,
          borderTopColor: colors.border,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {items.map((item) => {
        const active = currentTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tabBtn}
            onPress={() => onSelectTab(item.key)}
            activeOpacity={0.7}
          >
            {renderIcon(item.key, active)}
            <Text
              style={[
                styles.tabLabel,
                { color: active ? colors.primaryText : colors.textMuted },
                active && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {active && <View style={[styles.activeDot, { backgroundColor: colors.primaryText }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
});
