import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Svg, { Path, Rect } from 'react-native-svg';
import { notify } from '../../services/notifications/notificationService';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface AudioPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  trackTitle: string;
  trackSubtitle?: string;
  trackUrl?: string;
}

const SPEEDS = [0.8, 1.0, 1.2, 1.5];

/**
 * 1-to-1 Floating White Card matching Image 2 (Audio):
 * - Header: Headphones icon + "Audio" + close "×"
 * - Track row: Circular lavender waveform icon + Unit title + subtitle
 * - Scrubber bar + "00:45" / "02:30"
 * - Controls: -10s circle | Big Indigo Play/Pause | +10s circle | "Tezlik: 1.0x ⌄"
 * - Footer: "🔒 AES-256 Encrypted"
 */
export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  visible,
  onClose,
  trackTitle,
  trackSubtitle = 'Track 1 • Listening',
  trackUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [positionSec, setPositionSec] = useState(45);
  const [durationSec, setDurationSec] = useState(150);
  const [speed, setSpeed] = useState(1.0);
  const [trackBarWidth, setTrackBarWidth] = useState(260);
  const [usingRealAudio, setUsingRealAudio] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const { colors } = useTheme();
  const { strings, language } = useI18n();
  const speedText = language === 'ru' ? 'Скорость:' : language === 'en' ? 'Speed:' : 'Tezlik:';

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setUsingRealAudio(false);
  }, []);

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
        setDurationSec(150);
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
          { shouldPlay: true, rate: speed, shouldCorrectPitch: true },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            setPositionSec(Math.floor((status.positionMillis || 0) / 1000));
            if (status.durationMillis) {
              setDurationSec(Math.max(1, Math.floor(status.durationMillis / 1000)));
            }
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
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
          notify.warning(
            strings.common.warning,
            strings.reader.mediaLoadFailed,
          );
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

  useEffect(() => {
    if (!visible || usingRealAudio || !isPlaying) return;
    const interval = setInterval(() => {
      setPositionSec((prev) => (prev + 1 >= durationSec ? 0 : prev + 1));
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [visible, usingRealAudio, isPlaying, speed, durationSec]);

  const togglePlay = async () => {
    if (soundRef.current && usingRealAudio) {
      try {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      } catch {}
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const seekBy = async (deltaSec: number) => {
    const nextSec = Math.max(0, Math.min(durationSec, positionSec + deltaSec));
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
    setPositionSec(nextSec);
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setPositionAsync(nextSec * 1000);
      } catch {}
    }
  };

  const cycleSpeed = async () => {
    const idx = SPEEDS.indexOf(speed);
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(nextSpeed);
    if (soundRef.current && usingRealAudio) {
      try {
        await soundRef.current.setRateAsync(nextSpeed, true);
      } catch {}
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPct = durationSec > 0 ? Math.min(100, (positionSec / durationSec) * 100) : 0;

  const isLocalOffline =
    Boolean(trackUrl) &&
    (trackUrl!.startsWith('file:') || trackUrl!.startsWith('blob:'));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 18v-6a9 9 0 0118 0v6"
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
                  fill={colors.primary}
                />
              </Svg>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {strings.reader.audioPlayerTitle}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={onClose}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={colors.textSecondary}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Artwork Circle + Title Row */}
          <View style={styles.trackRow}>
            <View style={[styles.waveCircle, { backgroundColor: colors.primarySoft }]}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Rect x={3} y={10} width={2.4} height={4} rx={1.2} fill={colors.primary} />
                <Rect x={7.5} y={6} width={2.4} height={12} rx={1.2} fill={colors.primary} />
                <Rect x={12} y={4} width={2.4} height={16} rx={1.2} fill={colors.primary} />
                <Rect x={16.5} y={7} width={2.4} height={10} rx={1.2} fill={colors.primary} />
                <Rect x={20} y={10} width={2} height={4} rx={1} fill={colors.primary} opacity={0.6} />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {trackTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {trackSubtitle}
              </Text>
            </View>
          </View>

          {/* Progress Scrubber */}
          <View style={styles.scrubberWrap}>
            <Pressable
              style={styles.trackTouchArea}
              onLayout={(e) => setTrackBarWidth(e.nativeEvent.layout.width || 260)}
              onPress={(e) => seekToRatio(e.nativeEvent.locationX / trackBarWidth)}
            >
              <View style={[styles.trackBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${progressPct}%`, backgroundColor: colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.trackThumb,
                    {
                      left: `${progressPct}%`,
                      backgroundColor: colors.primaryDark,
                      borderColor: colors.surface,
                    },
                  ]}
                />
              </View>
            </Pressable>
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(positionSec)}
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(durationSec)}
              </Text>
            </View>
          </View>

          {/* Transport Controls Row + Speed Pill */}
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => seekBy(-10)}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5"
                  stroke={colors.textPrimary}
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.skipInsideText, { color: colors.textPrimary }]}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.playBtn,
                { backgroundColor: colors.primaryDark, shadowColor: colors.primary },
              ]}
              onPress={togglePlay}
              activeOpacity={0.85}
            >
              {loadingAudio ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : isPlaying ? (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M8 5v14M16 5v14"
                    stroke={colors.onPrimary}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                </Svg>
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path d="M7 5l12 7-12 7V5z" fill={colors.onPrimary} />
                </Svg>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={() => seekBy(10)}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 5V2l5 4-5 4V7a5 5 0 105 5"
                  stroke={colors.textPrimary}
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[styles.skipInsideText, { color: colors.textPrimary }]}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.speedChip,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={cycleSpeed}
              activeOpacity={0.8}
            >
              <Text style={[styles.speedLabel, { color: colors.textMuted }]}>{speedText}</Text>
              <Text style={[styles.speedVal, { color: colors.textPrimary }]}>
                {speed.toFixed(1)}x ⌄
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Status */}
          <View style={styles.footerRow}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
                stroke={isLocalOffline ? colors.accent : colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {isLocalOffline ? strings.reader.offlineMediaReady : 'AES-256 Encrypted'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  waveCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  scrubberWrap: {
    marginBottom: 14,
  },
  trackTouchArea: {
    paddingVertical: 8,
  },
  trackBg: {
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  trackThumb: {
    position: 'absolute',
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 16,
  },
  skipBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  skipInsideText: {
    position: 'absolute',
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 3,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  speedChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
  speedVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
});
