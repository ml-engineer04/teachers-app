import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

interface AudioPlayerModalProps {
  visible: boolean;
  trackTitle: string;
  unitLabel: string;
  durationSeconds?: number;
  onClose: () => void;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  visible,
  trackTitle,
  unitLabel,
  durationSeconds = 150,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(24);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  useEffect(() => {
    let timer: any;
    if (visible && isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => (prev >= durationSeconds ? 0 : prev + 1));
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [visible, isPlaying, playbackSpeed, durationSeconds]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSkip = (delta: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(durationSeconds, prev + delta)));
  };

  const toggleSpeed = () => {
    if (playbackSpeed === 1.0) setPlaybackSpeed(1.2);
    else if (playbackSpeed === 1.2) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(0.8);
    else setPlaybackSpeed(1.0);
  };

  const progressPercent = Math.min(100, (currentTime / durationSeconds) * 100);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Top Pill Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.badge}>{unitLabel}</Text>
              <Text style={styles.title}>{trackTitle}</Text>
              <Text style={styles.decryptedNote}>
                🔒 RAM-da dekodlangan • AES-256-GCM
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrubber Progress Bar */}
          <View style={styles.scrubberContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              <View style={[styles.scrubberThumb, { left: `${progressPercent}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>-{formatTime(durationSeconds - currentTime)}</Text>
            </View>
          </View>

          {/* Controls Bar */}
          <View style={styles.controlsRow}>
            {/* Speed Button */}
            <TouchableOpacity style={styles.speedButton} onPress={toggleSpeed}>
              <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>

            {/* Skip -10s */}
            <TouchableOpacity style={styles.skipButton} onPress={() => handleSkip(-10)}>
              <Text style={styles.skipText}>-10s</Text>
            </TouchableOpacity>

            {/* Play / Pause Primary Button */}
            <TouchableOpacity
              style={styles.playPauseBtn}
              activeOpacity={0.85}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <Text style={styles.playPauseIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>

            {/* Skip +10s */}
            <TouchableOpacity style={styles.skipButton} onPress={() => handleSkip(10)}>
              <Text style={styles.skipText}>+10s</Text>
            </TouchableOpacity>

            {/* Repeat button */}
            <TouchableOpacity
              style={styles.repeatButton}
              onPress={() => setCurrentTime(0)}
            >
              <Text style={styles.repeatText}>↺</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  decryptedNote: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  scrubberContainer: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    marginLeft: -7,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  speedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  playPauseBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playPauseIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  repeatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
  },
});
