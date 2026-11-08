import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

interface VideoPlayerModalProps {
  visible: boolean;
  videoTitle: string;
  unitLabel: string;
  durationSeconds?: number;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoTitle,
  unitLabel,
  durationSeconds = 310,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.badge}>{unitLabel}</Text>
              <Text style={styles.title}>{videoTitle}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 16:9 Video Canvas Frame */}
          <View style={styles.videoFrame}>
            {/* Visual preview simulating grammar explanation video */}
            <View style={styles.videoBackground}>
              <Text style={styles.videoWatermark}>🔒 AES-256-GCM RAM DECRYPTED</Text>
              <Text style={styles.videoIllustration}>🎬 Video Lesson: Conditionals & Grammar Focus</Text>
            </View>

            {/* Center Play Overlay */}
            <TouchableOpacity
              style={styles.playOverlay}
              activeOpacity={0.8}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>

            {/* Bottom Scrubber */}
            <View style={styles.bottomBar}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '38%' }]} />
              </View>
              <View style={styles.timeInfo}>
                <Text style={styles.timeText}>01:58 / 05:10</Text>
                <Text style={styles.hdText}>1080p HD</Text>
              </View>
            </View>
          </View>

          {/* Lesson Notes */}
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Darslik Bo‘yicha Izoh:</Text>
            <Text style={styles.notesText}>
              Ushbu video darsda 11-sinf o‘quvchilari uchun Conditionals Type 3 qoidalari interaktiv animatsiyalar bilan tushuntirilgan.
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#CBD5E1',
  },
  videoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    opacity: 0.85,
    padding: 20,
  },
  videoWatermark: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.6,
    letterSpacing: 1,
    marginBottom: 8,
  },
  videoIllustration: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  playOverlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  hdText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '800',
  },
  notesBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 16,
  },
});
