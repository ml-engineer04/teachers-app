import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export interface MediaLibraryItem {
  id: string;
  type: 'AUDIO' | 'VIDEO';
  title: string;
  subtitle?: string;
  durationLabel?: string;
  durationSeconds?: number | null;
  pageNumber?: number;
  url?: string;
}

interface MediaLibraryDrawerProps {
  visible: boolean;
  onClose: () => void;
  mediaItems?: MediaLibraryItem[];
  onPlayMedia: (item: MediaLibraryItem) => void;
}

export const MediaLibraryDrawer: React.FC<MediaLibraryDrawerProps> = ({
  visible,
  onClose,
  mediaItems = [],
  onPlayMedia,
}) => {
  const { colors, isDark } = useTheme();
  const { strings } = useI18n();
  const [filter, setFilter] = useState<'ALL' | 'AUDIO' | 'VIDEO'>('ALL');

  const filtered = useMemo(() => {
    if (filter === 'ALL') return mediaItems;
    return mediaItems.filter((m) => m.type === filter);
  }, [mediaItems, filter]);

  const formatDur = (item: MediaLibraryItem) => {
    if (item.durationLabel) return item.durationLabel;
    if (item.durationSeconds && item.durationSeconds > 0) {
      const m = Math.floor(item.durationSeconds / 60);
      const s = item.durationSeconds % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    return item.type === 'VIDEO' ? 'Video' : 'Audio';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {strings.reader.mediaLibrary}
            </Text>
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

          <View style={[styles.filterRow, { backgroundColor: colors.surfaceAlt }]}>
            {(
              [
                { key: 'ALL', label: strings.reader.mediaTabAll },
                { key: 'AUDIO', label: strings.reader.mediaTabAudio },
                { key: 'VIDEO', label: strings.reader.mediaTabVideo },
              ] as const
            ).map((tab) => {
              const active = filter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterPill,
                    active && { backgroundColor: colors.primaryDark },
                  ]}
                  onPress={() => setFilter(tab.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: active ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {strings.reader.noMediaOnBook}
                </Text>
              </View>
            ) : (
              filtered.map((item) => {
                const isVideo = item.type === 'VIDEO';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.mediaCard, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => {
                      onClose();
                      onPlayMedia(item);
                    }}
                    activeOpacity={0.78}
                  >
                    <View
                      style={[
                        styles.mediaIconBox,
                        {
                          backgroundColor: isVideo
                            ? isDark
                              ? 'rgba(56, 189, 248, 0.18)'
                              : '#E0F2FE'
                            : colors.primarySoft,
                        },
                      ]}
                    >
                      {isVideo ? (
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path d="M8 5l11 7-11 7V5z" fill={colors.primaryText} />
                        </Svg>
                      ) : (
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M9 18V5l12-2v13"
                            stroke={colors.primaryText}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Circle cx={6} cy={18} r={2.5} fill={colors.primaryText} />
                        </Svg>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.mediaTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.mediaSub, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {formatDur(item)}
                        {item.subtitle ? ` • ${item.subtitle}` : ''}
                      </Text>
                    </View>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 6l6 6-6 6"
                        stroke={colors.primaryText}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.bottomCta, { backgroundColor: colors.primarySoft }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.bottomCtaText, { color: colors.primaryText }]}>
              {strings.common.close}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    maxHeight: 350,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  mediaIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mediaSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyBox: {
    borderRadius: 14,
    padding: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  bottomCta: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  bottomCtaText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
