import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Hotspot, HotspotType } from '@smartteacherbook/shared';
import { computeHotspotBadgeLayout } from '../../utils/pageGeometry';

interface ExtendedHotspot extends Hotspot {
  label?: string;
  tooltipText?: string;
  appearanceStyle?: 'SOLID' | 'OUTLINE';
  size?: 'SM' | 'MD' | 'LG';
  noteText?: string;
  targetFile?: string;
}

interface HotspotLayerProps {
  hotspots: Hotspot[];
  pageWidth: number;
  pageHeight: number;
  onHotspotPress: (hotspot: Hotspot) => void;
}

/**
 * Interactive Icon-Only Hotspot Rendering Layer synced with Admin Visual Hotspot Editor:
 * Places clean compact circular icons (Audio, Video, Answer Key, Note) without dashed boxes or text clutter covering textbook words.
 */
export const HotspotLayer: React.FC<HotspotLayerProps> = ({
  hotspots,
  pageWidth,
  pageHeight,
  onHotspotPress,
}) => {
  return (
    <View
      style={[styles.container, { width: pageWidth, height: pageHeight, pointerEvents: 'box-none' }]}
    >
      {hotspots.map((raw) => {
        const h = raw as ExtendedHotspot;
        const { left, top, tapSize, badgeSize, iconSize } = computeHotspotBadgeLayout(
          h.rect,
          pageWidth,
          pageHeight,
          h.size,
        );

        const isAudio = h.type === HotspotType.AUDIO;
        const isVideo = h.type === HotspotType.VIDEO;
        const isAnswer = h.type === HotspotType.ANSWER_LINK;

        const isSolid = h.appearanceStyle !== 'OUTLINE';

        const accentColor = isAudio
          ? '#4F46E5'
          : isVideo
          ? '#2563EB'
          : isAnswer
          ? '#D97706'
          : '#059669';

        return (
          <TouchableOpacity
            key={h.id}
            activeOpacity={0.78}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={[
              styles.hotspotBox,
              {
                left,
                top,
                width: tapSize,
                height: tapSize,
              },
            ]}
            onPress={() => onHotspotPress(h)}
          >
            <View
              style={[
                styles.iconBadge,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  backgroundColor: isSolid ? accentColor : 'rgba(255, 255, 255, 0.96)',
                  borderColor: accentColor,
                },
              ]}
            >
              {isAudio ? (
                <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 18v-6a9 9 0 0118 0v6"
                    stroke={isSolid ? '#FFFFFF' : accentColor}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                  <Path
                    d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
                    fill={isSolid ? '#FFFFFF' : accentColor}
                  />
                </Svg>
              ) : isVideo ? (
                <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
                  <Path d="M8 5l11 7-11 7V5z" fill={isSolid ? '#FFFFFF' : accentColor} />
                </Svg>
              ) : isAnswer ? (
                <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.74V16a1 1 0 001 1h6a1 1 0 001-1v-1.26A7 7 0 0012 2z"
                    stroke={isSolid ? '#FFFFFF' : accentColor}
                    strokeWidth={2.1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : (
                <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    stroke={isSolid ? '#FFFFFF' : accentColor}
                    strokeWidth={2}
                  />
                  <Circle cx={9} cy={13} r={1} fill={isSolid ? '#FFFFFF' : accentColor} />
                </Svg>
              )}
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
    zIndex: 10,
  },
  hotspotBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBadge: {
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
});
