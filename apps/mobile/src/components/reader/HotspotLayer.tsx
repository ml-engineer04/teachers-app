import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Hotspot, HotspotType } from '@smartteacherbook/shared';

interface HotspotLayerProps {
  hotspots: Hotspot[];
  pageWidth: number;
  pageHeight: number;
  onHotspotPress: (hotspot: Hotspot) => void;
}

/**
 * Spec §3 & §8 Hotspot Rendering Layer
 * Overlays normalized hotspot rectangles over pre-rendered page image.
 * Renders audio, video, internal page, and Teacher's Book answer keys.
 */
export const HotspotLayer: React.FC<HotspotLayerProps> = ({
  hotspots,
  pageWidth,
  pageHeight,
  onHotspotPress,
}) => {
  return (
    <View style={[styles.container, { width: pageWidth, height: pageHeight }]} pointerEvents="box-none">
      {hotspots.map((h) => {
        const left = h.rect.x * pageWidth;
        const top = h.rect.y * pageHeight;
        const width = h.rect.w * pageWidth;
        const height = h.rect.h * pageHeight;

        const isAudio = h.type === HotspotType.AUDIO;
        const isVideo = h.type === HotspotType.VIDEO;
        const isAnswer = h.type === HotspotType.ANSWER_LINK;

        return (
          <TouchableOpacity
            key={h.id}
            activeOpacity={0.7}
            style={[
              styles.hotspotTouch,
              { left, top, width, height },
              isAudio && styles.audioBadge,
              isVideo && styles.videoBadge,
              isAnswer && styles.answerBadge,
            ]}
            onPress={() => onHotspotPress(h)}
          >
            <View style={styles.badgeContent}>
              <Text style={styles.badgeLabel} numberOfLines={1} ellipsizeMode="tail">
                {isAudio && '🎧 Audio'}
                {isVideo && '🎬 Video'}
                {isAnswer && '💡 Javoblar (Kalit)'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hotspotTouch: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  audioBadge: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  videoBadge: {
    borderColor: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  answerBadge: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeContent: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F2942',
  },
});
