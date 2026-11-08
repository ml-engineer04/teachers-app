import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WatermarkOverlayProps {
  userEmail: string;
  deviceId: string;
}

/**
 * Spec §7 Content Protection
 * Subtle dynamic watermark overlay rendered across the reader
 * at low opacity (12%) to discourage photo-sharing of textbook contents.
 */
export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ userEmail, deviceId }) => {
  const shortDevice = deviceId.substring(0, 8);
  const watermarkText = `${userEmail} • ${shortDevice}`;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <View key={idx} style={styles.watermarkCell}>
            <Text style={styles.watermarkText}>{watermarkText}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'space-around',
  },
  watermarkCell: {
    transform: [{ rotate: '-25deg' }],
    opacity: 0.12, // Spec §7: Subtle low opacity
    padding: 20,
  },
  watermarkText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2942',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
