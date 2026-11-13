import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Path, Rect } from 'react-native-svg';
import { notify } from '../../services/notifications/notificationService';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface VideoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoTitle: string;
  videoSubtitle?: string;
  videoUrl?: string;
  lessonNotes?: string;
}

/**
 * 1-to-1 Floating Card matching Image 2 (Video):
 * - Top 16:9 dark player with translucent "Video" header + close "×"
 * - Real <video> / expo-av when videoUrl present, else interactive HD preview
 * - Bottom white info strip with Title, Subtitle & "1080p ⌄" badge
 */
export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  onClose,
  videoTitle,
  videoSubtitle,
  videoUrl,
  lessonNotes,
}) => {
  const { colors } = useTheme();
  const { strings } = useI18n();
  const [isPlaying, setIsPlaying] = useState(true);
  const [positionSec, setPositionSec] = useState(12);
  const [quality, setQuality] = useState<'1080p' | '720p'>('1080p');
  const totalSec = 105; // 01:45 preview duration

  useEffect(() => {
    if (visible) {
      setIsPlaying(true);
      setPositionSec(12);
    }
  }, [visible, videoUrl]);

  useEffect(() => {
    if (!visible || videoUrl || !isPlaying) return;
    const timer = setInterval(() => {
      setPositionSec((prev) => (prev + 1 >= totalSec ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, videoUrl, isPlaying]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
          {/* Top 16:9 Dark Player Surface */}
          <View style={styles.playerBox}>
            {videoUrl ? (
              Platform.OS === 'web' ? (
                React.createElement('video', {
                  src: videoUrl,
                  controls: true,
                  autoPlay: true,
                  playsInline: true,
                  controlsList: 'nodownload',
                  onError: () =>
                    notify.error(
                      strings.common.error,
                      strings.reader.mediaLoadFailed,
                    ),
                  style: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#0B1437',
                    objectFit: 'contain',
                  },
                })
              ) : (
                <Video
                  source={{ uri: videoUrl }}
                  style={{ width: '100%', height: '100%' }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  onError={() =>
                    notify.error(
                      strings.common.error,
                      strings.reader.mediaLoadFailed,
                    )
                  }
                />
              )
            ) : (
              <View style={styles.previewCanvas}>
                {/* Subtle Ocean Gradient Feel */}
                <View style={styles.oceanOrb1} />
                <View style={styles.oceanOrb2} />

                {/* Center White Play Circle */}
                <TouchableOpacity
                  style={styles.centerPlayCircle}
                  onPress={() => setIsPlaying((p) => !p)}
                  activeOpacity={0.85}
                >
                  {isPlaying ? (
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M8 5v14M16 5v14"
                        stroke="#0F172A"
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                    </Svg>
                  ) : (
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                      <Path d="M8 5l11 7-11 7V5z" fill="#0F172A" />
                    </Svg>
                  )}
                </TouchableOpacity>

                {/* Bottom Controls Overlay */}
                <View style={styles.previewBottomBar}>
                  <TouchableOpacity onPress={() => setIsPlaying((p) => !p)}>
                    <Text style={styles.bottomGlyph}>{isPlaying ? '⏸' : '▶'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.previewTime}>
                    {formatTime(positionSec)} / {formatTime(totalSec)}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.bottomGlyph}>⛶</Text>
                  <Text style={styles.bottomGlyph}>⚙</Text>
                </View>
              </View>
            )}

            {/* Overlaid Top Bar inside Video (Image 2 style) */}
            <View style={styles.videoTopOverlay}>
              <View style={styles.videoBadgeLeft}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Rect x={2} y={6} width={14} height={12} rx={2.5} fill="#FFFFFF" />
                  <Path d="M16 10l5-3v10l-5-3v-4z" fill="#FFFFFF" />
                </Svg>
                <Text style={styles.videoHeaderLabel}>{strings.reader.videoPlayerTitle}</Text>
              </View>
              <TouchableOpacity style={styles.videoCloseBtn} onPress={onClose}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="#FFFFFF"
                    strokeWidth={2.3}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lower Metadata Card */}
          <View style={styles.lowerBody}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                {videoTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
                {lessonNotes || videoSubtitle || strings.reader.offlineMediaReady}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.qualityPill,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={() => setQuality((q) => (q === '1080p' ? '720p' : '1080p'))}
            >
              <Text style={[styles.qualityPillText, { color: colors.textPrimary }]}>{quality} ⌄</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  playerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0B1437',
    position: 'relative',
  },
  previewCanvas: {
    flex: 1,
    backgroundColor: '#0E2954',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  oceanOrb1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    top: -60,
    right: -40,
  },
  oceanOrb2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    bottom: -50,
    left: -30,
  },
  centerPlayCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  previewBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(11, 20, 55, 0.55)',
  },
  bottomGlyph: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewTime: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  videoTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(11, 20, 55, 0.35)',
  },
  videoBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  videoHeaderLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  videoCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowerBody: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  qualityPill: {
    backgroundColor: '#F1F5FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qualityPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
});
