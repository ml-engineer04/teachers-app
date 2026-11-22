import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type BottomNavTab = 'HOME' | 'GRADE_DETAIL' | 'REQUESTS' | 'SETTINGS';

interface BottomNavigationDockProps {
  currentTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const BottomNavigationDock: React.FC<BottomNavigationDockProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();

  const prevTabRef = useRef<BottomNavTab>(currentTab);
  useEffect(() => {
    if (prevTabRef.current !== currentTab) {
      prevTabRef.current = currentTab;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [currentTab]);

  const handlePress = (tab: BottomNavTab) => {
    if (tab === currentTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSelectTab(tab);
  };

  const renderIcon = (tab: BottomNavTab, active: boolean) => {
    const iconColor = active ? colors.onPrimary : colors.textMuted;
    const strokeWidth = active ? 2.2 : 2.0;

    if (tab === 'HOME') {
      return (
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9.5z"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 21.5V14a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v7.5"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }

    if (tab === 'GRADE_DETAIL') {
      return (
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
          <Rect
            x="4"
            y="4"
            width="4"
            height="16"
            rx="1"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M4 8.5h4"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Rect
            x="9.5"
            y="4"
            width="4"
            height="16"
            rx="1"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 15.5h4"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Path
            d="M15 4.6l2.8-.7c.5-.1 1.1.2 1.2.7l3.2 13.2c.1.5-.2 1.1-.7 1.2l-2.8.7c-.5.1-1.1-.2-1.2-.7L14.3 5.8c-.1-.5.2-1.1.7-1.2z"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M15.5 9l3.5-.9"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    if (tab === 'REQUESTS') {
      return (
        <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2.5"
            y="5"
            width="19"
            height="14"
            rx="3"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2.5 10h19"
            stroke={iconColor}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M6.5 15h1.5"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Path
            d="M11 15h3"
            stroke={iconColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    }

    return (
      <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z"
          stroke={iconColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle
          cx="12"
          cy="12"
          r="3"
          stroke={iconColor}
          strokeWidth={strokeWidth}
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

  const safeBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 10);
  const activeBgColor = colors.primary;
  const dockBg = colors.card;
  const dockBorder = colors.border;

  return (
    <View
      style={[
        styles.outerWrapper,
        {
          backgroundColor: colors.background,
          paddingBottom: safeBottom,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: dockBg,
            borderColor: dockBorder,
            shadowColor: '#000000',
          },
        ]}
      >
        {items.map((item) => {
          const active = currentTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.tabBtn,
                active ? [styles.tabBtnActive, { backgroundColor: activeBgColor }] : styles.tabBtnInactive,
              ]}
              onPress={() => handlePress(item.key)}
              activeOpacity={active ? 0.9 : 0.6}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
            >
              {renderIcon(item.key, active)}
              {active && (
                <Text style={styles.activeLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtnInactive: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  activeLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
