import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Universal pulsing Shimmer Skeleton component
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.38)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.38,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const baseBg = isDark ? '#272C36' : '#ECEEEA';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseBg,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Pre-composed Skeleton for the Active Subscription Hero Banner
 */
export const HeroBannerSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: isDark ? '#1E222A' : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.heroRow}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Skeleton width={110} height={12} borderRadius={6} style={{ marginBottom: 10 }} />
          <Skeleton width="80%" height={22} borderRadius={8} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={14} borderRadius={6} />
        </View>
        <Skeleton width={68} height={28} borderRadius={14} />
      </View>
      <View style={{ marginTop: 20 }}>
        <Skeleton width="100%" height={8} borderRadius={4} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width={80} height={12} borderRadius={6} />
          <Skeleton width={50} height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
};

/**
 * Pre-composed Skeleton for Continue Reading Progress Card
 */
export const ContinueReadingSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.continueCard,
        {
          backgroundColor: isDark ? '#1E222A' : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Skeleton width={52} height={68} borderRadius={8} style={{ marginRight: 14 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Skeleton width={90} height={11} borderRadius={5} style={{ marginBottom: 6 }} />
        <Skeleton width="75%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} borderRadius={5} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={5} borderRadius={3} />
      </View>
    </View>
  );
};

/**
 * Pre-composed Skeleton for Grades Pills
 */
export const GradesRowSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View style={styles.gradesRow}>
      {Array.from({ length: count }, (_, idx) => (
        <Skeleton key={idx} width={64} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      ))}
    </View>
  );
};

/**
 * Pre-composed Skeleton for Textbook Card (Single or Grid item)
 */
export const BookCardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.bookCard,
        {
          backgroundColor: isDark ? '#1E222A' : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Skeleton width={68} height={92} borderRadius={8} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
        <View>
          <Skeleton width={70} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="85%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
          <Skeleton width="55%" height={12} borderRadius={5} />
        </View>
        <Skeleton width={90} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

/**
 * Pre-composed Skeleton for Full Textbook Page in Reader
 */
export const ReaderPageSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.readerPage,
        {
          backgroundColor: isDark ? '#15181E' : '#FFFFFF',
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.readerHeaderRow}>
        <Skeleton width={120} height={14} borderRadius={7} />
        <Skeleton width={44} height={14} borderRadius={7} />
      </View>
      <View style={styles.readerBodyLines}>
        <Skeleton width="90%" height={15} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="95%" height={15} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="75%" height={15} borderRadius={6} style={{ marginBottom: 24 }} />

        {/* Large illustration placeholder */}
        <Skeleton width="100%" height={160} borderRadius={12} style={{ marginBottom: 24 }} />

        <Skeleton width="92%" height={15} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="88%" height={15} borderRadius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="60%" height={15} borderRadius={6} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  continueCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  gradesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  readerPage: {
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginTop: 20,
  },
  readerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  readerBodyLines: {
    width: '100%',
  },
});
