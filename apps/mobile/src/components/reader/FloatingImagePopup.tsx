import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';

export interface FloatingImagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string | null;
  type?: 'ANSWER' | 'TRANSCRIPT';
  initialOffset?: { x: number; y: number };
}

export const FloatingImagePopup: React.FC<FloatingImagePopupProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  imageUrl,
  type = 'ANSWER',
  initialOffset = { x: 0, y: 0 },
}) => {
  const { language } = useI18n();
  const { colors, isDark } = useTheme();
  const screen = Dimensions.get('window');

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1.33);

  // Position animated value for smooth dragging with zero screen lock
  const pan = useRef(new Animated.ValueXY({ x: 16 + (initialOffset.x || 0), y: 76 + (initialOffset.y || 0) })).current;
  const lastOffsetRef = useRef({ x: 16 + (initialOffset.x || 0), y: 76 + (initialOffset.y || 0) });

  // Measure image aspect ratio when imageUrl changes
  useEffect(() => {
    if (!isOpen || !imageUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    Image.getSize(
      imageUrl,
      (w, h) => {
        if (w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
        setLoading(false);
      },
      () => {
        setHasError(true);
        setLoading(false);
      },
    );
  }, [isOpen, imageUrl]);

  // PanResponder for smooth, zero-latency touch dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastOffsetRef.current.x,
          y: lastOffsetRef.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        lastOffsetRef.current = {
          x: Math.max(8, Math.min(screen.width - 120, lastOffsetRef.current.x + gesture.dx)),
          y: Math.max(40, Math.min(screen.height - 140, lastOffsetRef.current.y + gesture.dy)),
        };
        pan.flattenOffset();
        pan.setValue({ x: lastOffsetRef.current.x, y: lastOffsetRef.current.y });
      },
    }),
  ).current;

  if (!isOpen) return null;

  // Sizing calculations matching ~0.30vw / 0.35vh compact snug fit from web
  const baseW = isExpanded ? Math.min(screen.width - 24, 480) : Math.min(screen.width * 0.72, 320);
  const calculatedImgH = Math.max(90, Math.min(isExpanded ? screen.height * 0.62 : screen.height * 0.38, Math.round(baseW / aspectRatio)));

  const badgeText =
    badge ||
    (type === 'TRANSCRIPT'
      ? language === 'ru'
        ? 'Аудио транскрипт'
        : language === 'en'
          ? 'Audio Transcript'
          : 'Audio transkript'
      : language === 'ru'
        ? 'Ответы'
        : language === 'en'
          ? 'Answer Key'
          : 'Javoblar');

  const badgeBg = type === 'TRANSCRIPT' ? 'rgba(109, 63, 209, 0.22)' : 'rgba(21, 128, 61, 0.22)';
  const badgeBorder = type === 'TRANSCRIPT' ? 'rgba(109, 63, 209, 0.45)' : 'rgba(21, 128, 61, 0.45)';
  const badgeTextColor = type === 'TRANSCRIPT' ? '#B69CFF' : '#4ADE80';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: baseW,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(21, 24, 30, 0.97)' : 'rgba(251, 251, 249, 0.98)',
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        {/* Drag handle header bar */}
        <View style={styles.headerBar} {...panResponder.panHandlers}>
          <View
            style={[
              styles.dragPillIndicator,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' },
            ]}
          />

          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: badgeBg, borderColor: badgeBorder },
              ]}
            >
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>
                {badgeText}
              </Text>
            </View>

            <View style={{ flex: 1, marginHorizontal: 8 }}>
              {title && (
                <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>

            {/* Expand / Minimize Toggle */}
            <TouchableOpacity
              style={[
                styles.headerIconBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
              onPress={() => setIsExpanded((p) => !p)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                {isExpanded ? (
                  <Path
                    d="M4 14h6v6m10-10h-6V4m0 6l7-7M4 20l7-7"
                    stroke={isDark ? '#E2E8F0' : colors.textPrimary}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <Path
                    d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                    stroke={isDark ? '#E2E8F0' : colors.textPrimary}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </TouchableOpacity>

            {/* Close (X) button */}
            <TouchableOpacity
              style={[
                styles.headerIconBtn,
                {
                  marginLeft: 4,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={isDark ? '#E2E8F0' : colors.textPrimary}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Stage */}
        <View
          style={[
            styles.imageStage,
            { height: calculatedImgH, backgroundColor: isDark ? '#15181E' : '#F4F5F2' },
          ]}
        >
          {loading && (
            <View style={styles.stateCenter}>
              <ActivityIndicator size="small" color="#5B93FA" />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                {language === 'ru' ? 'Загрузка...' : language === 'en' ? 'Loading...' : 'Yuklanmoqda...'}
              </Text>
            </View>
          )}

          {hasError ? (
            <View style={styles.stateCenter}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>🖼️</Text>
              <Text style={styles.errorText}>
                {language === 'ru'
                  ? 'Не удалось загрузить изображение'
                  : language === 'en'
                    ? 'Failed to load image'
                    : 'Rasmni yuklab bo‘lmadi'}
              </Text>
            </View>
          ) : imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.imageContent}
              resizeMode="contain"
              fadeDuration={0}
            />
          ) : (
            <View style={styles.stateCenter}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>📋</Text>
              <Text style={styles.errorText}>
                {language === 'ru'
                  ? 'Изображение не прикреплено'
                  : language === 'en'
                    ? 'No image attached'
                    : 'Rasm biriktirilmagan'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
      } as any,
    }),
  },
  headerBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dragPillIndicator: {
    width: 28,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  headerIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageStage: {
    width: '100%',
    backgroundColor: '#15181E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContent: {
    width: '100%',
    height: '100%',
  },
  stateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  errorText: {
    color: '#9AA3B0',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
