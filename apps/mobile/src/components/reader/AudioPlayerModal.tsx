import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notify } from '../../services/notifications/notificationService';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  trackTitle: string;
  trackSubtitle?: string;
  trackUrl?: string;
  onOpenTranscript?: () => void;
  hasTranscript?: boolean;
}

const SPEEDS = [1.0, 1.25, 1.5, 0.8];

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  visible,
  onClose,
  trackTitle,
  trackSubtitle,
  trackUrl,
  onOpenTranscript,
  hasTranscript = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(120);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [trackBarWidth, setTrackBarWidth] = useState(110);
  const [usingRealAudio, setUsingRealAudio] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const lastSecRef = useRef(-1);
  const lastDurRef = useRef(-1);
  const isPlayingRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const { colors, isDark } = useTheme();
  const screen = Dimensions.get('window');

  // Smooth vertical/horizontal glide responder if teacher wants to reposition the pill
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffsetRef = useRef({ x: 0, y: 0 });

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    lastSecRef.current = -1;
    lastDurRef.current = -1;
    isPlayingRef.current = false;
    setUsingRealAudio(false);
  }, []);

  const currentSpeed = SPEEDS[speedIndex] || 1.0;

  useEffect(() => {
    let cancelled = false;

    const initAudio = async () => {
      await unloadSound();
      if (!visible) {
        setIsPlaying(false);
        return;
      }

      if (!trackUrl) {
        setPositionSec(0);
        setDurationSec(120);
        setIsPlaying(true);
        return;
      }

      setPositionSec(0);
      setLoadingAudio(true);
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        }).catch(() => {});

        const { sound } = await Audio.Sound.createAsync(
          { uri: trackUrl },
          { shouldPlay: true, rate: currentSpeed, shouldCorrectPitch: true, isMuted },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            const curSec = Math.floor((status.positionMillis || 0) / 1000);
            if (curSec !== lastSecRef.current) {
              lastSecRef.current = curSec;
              setPositionSec(curSec);
            }
            if (status.durationMillis) {
              const durSec = Math.max(1, Math.floor(status.durationMillis / 1000));
              if (durSec !== lastDurRef.current) {
                lastDurRef.current = durSec;
                setDurationSec(durSec);
              }
            }
            if (status.isPlaying !== isPlayingRef.current) {
              isPlayingRef.current = status.isPlaying;
              setIsPlaying(status.isPlaying);
            }
            if (status.didJustFinish) {
              isPlayingRef.current = false;
              lastSecRef.current = 0;
              setIsPlaying(false);
              setPositionSec(0);
            }
          },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        setUsingRealAudio(true);
      } catch {
        if (!cancelled) {
          setUsingRealAudio(false);
          setIsPlaying(true);
        }
      } finally {
        if (!cancelled) setLoadingAudio(false);
      }
    };

    initAudio();
    return () => {
      cancelled = true;
      unloadSound();
    };
  }, [visible, trackUrl, unloadSound]);

  // Simulation timer if real audio fails or is mock
  useEffect(() => {
    if (!visible || usingRealAudio || !isPlaying) return;
    const interval = setInterval(() => {
      setPositionSec((prev) => (prev + 1 >= durationSec ? 0 : prev + 1));
    }, 1000 / currentSpeed);
    return () => clearInterval(interval);
  }, [visible, usingRealAudio, isPlaying, currentSpeed, durationSec]);

  const togglePlay = async () => {
    if (soundRef.current && usingRealAudio) {
      try {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          isPlayingRef.current = false;
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          isPlayingRef.current = true;
          setIsPlaying(true);
        }
      } catch {}
    } else {
      setIsPlaying((prev) => {
        isPlayingRef.current = !prev;
        return !prev;
      });
    }
  };

  const seekBy = async (deltaSec: number) => {
    const nextSec = Math.max(0, Math.min(durationSec, positionSec + deltaSec));
    lastSecRef.current = nextSec;
    setPositionSec(nextSec);
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setPositionAsync(nextSec * 1000);
      } catch {}
    }
  };

  const seekToRatio = async (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const nextSec = Math.round(clamped * durationSec);
    lastSecRef.current = nextSec;
    setPositionSec(nextSec);
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setPositionAsync(nextSec * 1000);
      } catch {}
    }
  };

  const cycleSpeed = async () => {
    const nextIdx = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(nextIdx);
    const nextSpeed = SPEEDS[nextIdx];
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setRateAsync(nextSpeed, true);
      } catch {}
    }
  };

  const toggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setIsMutedAsync(next);
      } catch {}
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = durationSec > 0 ? Math.min(100, (positionSec / durationSec) * 100) : 0;

  // Touch drag gesture responder so teacher can drag the capsule anywhere
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
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
          x: Math.max(-screen.width * 0.4, Math.min(screen.width * 0.4, lastOffsetRef.current.x + gesture.dx)),
          y: Math.max(-screen.height * 0.7, Math.min(0, lastOffsetRef.current.y + gesture.dy)),
        };
        pan.flattenOffset();
        pan.setValue({ x: lastOffsetRef.current.x, y: lastOffsetRef.current.y });
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          bottom: Math.max(58, insets.bottom + 48),
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: isDark ? 'rgba(30, 34, 42, 0.96)' : 'rgba(251, 251, 249, 0.98)',
            borderColor: isDark ? 'rgba(53, 59, 71, 0.8)' : colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Play / Pause circular button */}
        <TouchableOpacity
          style={styles.playPauseBtn}
          onPress={togglePlay}
          activeOpacity={0.82}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {loadingAudio ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isPlaying ? (
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="#FFFFFF" />
            </Svg>
          ) : (
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 2 }}>
              <Path d="M5 3l14 9-14 9V3z" fill="#FFFFFF" />
            </Svg>
          )}
        </TouchableOpacity>

        {/* -5s Skip */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => seekBy(-5)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M1 4v6h6M3.51 15a9 9 0 102.13-9.36L1 10"
              stroke={isDark ? '#CBD5E1' : colors.textSecondary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.skipSecLabel, { color: isDark ? '#9AA3B0' : colors.textSecondary }]}>5</Text>
        </TouchableOpacity>

        {/* +5s Skip */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => seekBy(5)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M23 4v6h-6M20.49 15a9 9 0 11-2.13-9.36L23 10"
              stroke={isDark ? '#CBD5E1' : colors.textSecondary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.skipSecLabel, { color: isDark ? '#9AA3B0' : colors.textSecondary }]}>5</Text>
        </TouchableOpacity>

        {/* Scrubber & Time */}
        <View style={styles.scrubberRow}>
          <Text style={[styles.timeMono, { color: isDark ? '#9AA3B0' : colors.textPrimary }]}>{formatTime(positionSec)}</Text>
          <Pressable
            style={styles.trackTouchArea}
            onLayout={(e) => setTrackBarWidth(e.nativeEvent.layout.width || 110)}
            onPress={(e) => seekToRatio(e.nativeEvent.locationX / (trackBarWidth || 1))}
          >
            <View style={[styles.trackBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.12)' }]}>
              <View style={[styles.trackFill, { width: `${progressPct}%` }]} />
              <View style={[styles.trackThumb, { left: `${progressPct}%` }]} />
            </View>
          </Pressable>
          <Text style={[styles.timeMono, { color: colors.textSecondary }]}>{formatTime(durationSec)}</Text>
        </View>

        {/* Speed toggle pill */}
        <TouchableOpacity
          style={[styles.speedPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}
          onPress={cycleSpeed}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.speedText, { color: colors.textPrimary }]}>{currentSpeed}x</Text>
        </TouchableOpacity>

        {/* Transcript Pill Button matching Web */}
        {hasTranscript && onOpenTranscript && (
          <TouchableOpacity
            style={[
              styles.transcriptPill,
              {
                backgroundColor: isDark ? 'rgba(14, 124, 112, 0.25)' : '#E6F6F4',
                borderColor: isDark ? 'rgba(14, 124, 112, 0.45)' : 'rgba(14, 124, 112, 0.3)',
              },
            ]}
            onPress={onOpenTranscript}
            activeOpacity={0.78}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                stroke={isDark ? '#5ED3C4' : '#0E7C70'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                stroke={isDark ? '#5ED3C4' : '#0E7C70'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={[styles.transcriptText, { color: isDark ? '#5ED3C4' : '#0E7C70' }]}>
              {language === 'ru' ? 'Транскрипт' : language === 'en' ? 'Transcript' : 'Transkript'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Mute button */}
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={toggleMute}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {isMuted ? (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"
                stroke="#FB7185"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path
                d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"
                stroke={isDark ? '#CBD5E1' : colors.textSecondary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </TouchableOpacity>

        {/* Close (X) button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path
              d="M18 6L6 18M6 6l12 12"
              stroke={isDark ? '#CBD5E1' : colors.textSecondary}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 58,
    left: 8,
    right: 8,
    zIndex: 90,
    alignItems: 'center',
  },
  capsule: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 34, 42, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(53, 59, 71, 0.8)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
      } as any,
    }),
  },
  playPauseBtn: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#0E7C70',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  skipBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 2,
  },
  skipSecLabel: {
    position: 'absolute',
    fontSize: 7.5,
    fontWeight: '800',
    color: '#9AA3B0',
    top: 5,
  },
  scrubberRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 3,
  },
  timeMono: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#9AA3B0',
    minWidth: 26,
    textAlign: 'center',
  },
  trackTouchArea: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  trackBg: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    position: 'relative',
  },
  trackFill: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#0E7C70',
  },
  trackThumb: {
    position: 'absolute',
    top: -3.5,
    marginLeft: -5,
    width: 10.5,
    height: 10.5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0E7C70',
  },
  speedPill: {
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 2,
  },
  speedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  transcriptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#E6F6F4',
    borderWidth: 1,
    borderColor: 'rgba(14, 124, 112, 0.3)',
    marginHorizontal: 2,
  },
  transcriptText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0E7C70',
  },
  muteBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
