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
  imageUrl,
  initialOffset = { x: 0, y: 0 },
}) => {
  const { language } = useI18n();
  const { isDark } = useTheme();
  const screen = Dimensions.get('window');

  const [loading, setLoading] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1.33);

  // Position animated value for smooth dragging with zero screen lock
  const pan = useRef(
    new Animated.ValueXY({
      x: 16 + (initialOffset.x || 0),
      y: 76 + (initialOffset.y || 0),
    }),
  ).current;
  const lastOffsetRef = useRef({
    x: 16 + (initialOffset.x || 0),
    y: 76 + (initialOffset.y || 0),
  });

  const lastTapRef = useRef<number>(0);

  // Reset states and measure image dimensions when imageUrl changes or popup opens
  useEffect(() => {
    if (!isOpen || !imageUrl) {
      setLoading(false);
      setIsImageLoaded(false);
      return;
    }

    setLoading(true);
    setIsImageLoaded(false);
    setHasError(false);

    Image.getSize(
      imageUrl,
      (w, h) => {
        if (w > 0 && h > 0) {
          setAspectRatio(w / h);
        }
      },
      () => {
        setHasError(true);
        setLoading(false);
      },
    );
  }, [isOpen, imageUrl]);

  // PanResponder directly on the image card:
  // Touching ANYWHERE on the image lets the teacher drag it freely across the screen!
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => false,
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
          x: Math.max(8, Math.min(screen.width - 100, lastOffsetRef.current.x + gesture.dx)),
          y: Math.max(30, Math.min(screen.height - 100, lastOffsetRef.current.y + gesture.dy)),
        };
        pan.flattenOffset();
        pan.setValue({ x: lastOffsetRef.current.x, y: lastOffsetRef.current.y });

        // If finger barely moved (< 5px), treat as tap / double tap to toggle expand
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          const now = Date.now();
          if (now - lastTapRef.current < 320) {
            setIsExpanded((prev) => !prev);
          }
          lastTapRef.current = now;
        }
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        pan.setValue({ x: lastOffsetRef.current.x, y: lastOffsetRef.current.y });
      },
    }),
  ).current;

  if (!isOpen) return null;

  // Sizing calculations matching Web ~0.30vw / 0.35vh
  const baseW = isExpanded
    ? Math.min(screen.width - 24, 460)
    : Math.min(screen.width * 0.78, 330);

  const calculatedImgH = Math.max(
    80,
    Math.min(
      isExpanded ? screen.height * 0.68 : screen.height * 0.44,
      Math.round(baseW / (aspectRatio || 1.33)),
    ),
  );

  const cardHeight = isImageLoaded ? calculatedImgH : Math.max(150, Math.min(screen.height * 0.32, 200));

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
      {/* Action Buttons: sticking out on top right so they never block or cramp the image */}
      <View style={styles.topActionsRow}>
        {/* Fullscreen / Expand Toggle */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setIsExpanded((prev) => !prev)}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            {isExpanded ? (
              <Path
                d="M4 14h6v6m10-10h-6V4m0 6l7-7M4 20l7-7"
                stroke="#FFFFFF"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <Path
                d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                stroke="#FFFFFF"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </TouchableOpacity>

        {/* Close Button (X) */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onClose}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 6L6 18M6 6l12 12"
              stroke="#FFFFFF"
              strokeWidth={2.4}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Main Image Card: Touching ANYWHERE on the image allows dragging smoothly! */}
      <View
        style={[
          styles.imageCard,
          {
            height: cardHeight,
            backgroundColor: isDark ? '#1E222A' : '#FFFFFF',
            borderColor: isDark ? '#353B47' : '#D9DCD5',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Visible Loading State with spinner and label */}
        {(!isImageLoaded || loading) && !hasError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0E7C70" />
            <Text style={[styles.loadingLabel, { color: isDark ? '#9AA3B0' : '#5B6672' }]}>
              {language === 'ru'
                ? 'Загрузка ответа...'
                : language === 'en'
                  ? 'Loading answer...'
                  : 'Javob yuklanmoqda...'}
            </Text>
          </View>
        )}

        {/* Error State if image cannot be loaded */}
        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🖼️</Text>
            <Text style={[styles.errorText, { color: isDark ? '#9AA3B0' : '#5B6672' }]}>
              {language === 'ru'
                ? 'Не удалось загрузить изображение'
                : language === 'en'
                  ? 'Failed to load image'
                  : 'Rasmni yuklab bölmadi'}
            </Text>
          </View>
        ) : imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.imageContent,
              !isImageLoaded && styles.imageHidden,
            ]}
            resizeMode="contain"
            fadeDuration={120}
            onLoadStart={() => {
              setIsImageLoaded(false);
            }}
            onLoad={() => {
              setIsImageLoaded(true);
              setLoading(false);
            }}
            onError={() => {
              setHasError(true);
              setIsImageLoaded(true);
              setLoading(false);
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: isDark ? '#9AA3B0' : '#5B6672' }]}>
              {language === 'ru'
                ? 'Изображение не прикреплено'
                : language === 'en'
                  ? 'No image attached'
                  : 'Rasm biriktirilmagan'}
            </Text>
          </View>
        )}
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
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    paddingRight: 2,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  imageCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
      } as any,
    }),
  },
  imageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  imageHidden: {
    opacity: 0,
    position: 'absolute',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
});
