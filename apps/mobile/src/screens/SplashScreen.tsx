import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandLogo } from '../components/common/BrandLogo';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * Brand Splash Screen (trilingual + theme-aware)
 */
export const SplashScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();
  const containerBg = isDark ? '#070B19' : DS.colors.navyDeep;

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* Subtle decorative glowing arcs */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <View style={styles.centerBlock}>
        <BrandLogo size={88} darkSurface />
        <Text style={styles.subtitle}>{strings.splash.tagline}</Text>
      </View>

      <View style={styles.footerBlock}>
        <Text style={[styles.tagline, { color: colors.primarySoft }]}>{strings.splash.loadingLibrary}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  glowTopRight: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    fontWeight: '500',
    maxWidth: 280,
  },
  footerBlock: {
    paddingBottom: 16,
  },
  tagline: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
