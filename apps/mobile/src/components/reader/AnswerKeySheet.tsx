import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ImageStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { pdfPageToBookDisplay } from '@smartteacherbook/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export interface AnswerItem {
  id?: string;
  exerciseLabel: string;
  teacherPageNumber: number;
  solutionText: string;
  methodologyNotes?: string;
  imageUrl?: string;
  answerImages?: string[];
  transcriptText?: string;
  transcriptImages?: string[];
  targetMediaId?: string;
  targetMediaTitle?: string;
  targetMediaUrl?: string;
  targetTeacherBookId?: string;
}

interface AnswerKeySheetProps {
  visible: boolean;
  onClose: () => void;
  pageNumber: number;
  totalPages?: number;
  contentStartPdfPage?: number;
  exerciseLabel: string;
  teacherPageNumber: number;
  solutionText: string;
  methodologyNotes?: string;
  imageUrl?: string;
  items?: AnswerItem[];
  selectedHotspotId?: string | null;
  onSwitchToTeachersBook?: (teacherPage: number) => void;
}

export const AnswerKeySheet: React.FC<AnswerKeySheetProps> = ({
  visible,
  onClose,
  pageNumber,
  totalPages = 100,
  contentStartPdfPage = 1,
  exerciseLabel,
  teacherPageNumber,
  solutionText,
  methodologyNotes,
  imageUrl,
  items = [],
  selectedHotspotId,
  onSwitchToTeachersBook,
}) => {
  const { colors } = useTheme();
  const { strings, t } = useI18n();

  // Active Tab: Answers vs Listening Transcript
  const [activeTab, setActiveTab] = useState<'ANSWERS' | 'TRANSCRIPT'>('ANSWERS');
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (selectedHotspotId && items.length > 0) {
      const idx = items.findIndex((it) => it.id === selectedHotspotId);
      if (idx !== -1) return idx;
    }
    return 0;
  });

  useEffect(() => {
    if (selectedHotspotId && items.length > 0) {
      const idx = items.findIndex((it) => it.id === selectedHotspotId);
      if (idx !== -1) {
        setSelectedIndex(idx);
        return;
      }
    }
    setSelectedIndex((prev) => (prev < items.length ? prev : 0));
  }, [selectedHotspotId, items, visible]);

  // Transcript font size scaler (A- / A+)
  const [transcriptFontSize, setTranscriptFontSize] = useState<number>(15);

  // Fullscreen Zoom image modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const pageDisplayInfo = pdfPageToBookDisplay(pageNumber, totalPages, contentStartPdfPage);
  const displayPageLabel = pageDisplayInfo.isFrontMatter
    ? `${strings.common.introShort} ${pageDisplayInfo.frontMatterIndex}`
    : `${strings.common.page} ${pageDisplayInfo.bookPage ?? pageNumber}`;

  const currentItem: AnswerItem =
    items.length > 0 && items[selectedIndex]
      ? items[selectedIndex]
      : {
          exerciseLabel,
          teacherPageNumber,
          solutionText,
          methodologyNotes,
          imageUrl,
          answerImages: imageUrl ? [imageUrl] : [],
        };

  const parsedPills = useMemo(() => {
    const raw = (currentItem.solutionText || '').trim();
    if (!raw) return [];
    const tokens: Array<{ num: string; ans: string }> = [];
    const parts = raw.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^(\d+)\s*[.):\-–]\s*(.+)$/);
      if (m && m[2].length <= 24) {
        tokens.push({ num: m[1], ans: m[2].trim() });
      }
    }
    return tokens.length >= 2 ? tokens : [];
  }, [currentItem.solutionText]);

  // Combined answer images
  const answerImagesList = useMemo(() => {
    if (currentItem.answerImages && currentItem.answerImages.length > 0) {
      return currentItem.answerImages;
    }
    return currentItem.imageUrl ? [currentItem.imageUrl] : [];
  }, [currentItem.answerImages, currentItem.imageUrl]);

  const transcriptImagesList = currentItem.transcriptImages || [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              shadowColor: colors.borderStrong,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.bulbEmoji}>💡</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {strings.reader.answerKeysTitle}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6l12 12"
                  stroke={colors.textSecondary}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Toggle: [ 🔑 Javoblar ] and [ 📜 Transkript ] */}
          <View style={[styles.segmentRow, { backgroundColor: colors.surfaceAlt }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'ANSWERS' && {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab('ANSWERS')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'ANSWERS' ? colors.primaryText : colors.textSecondary },
                ]}
              >
                🔑 {strings.reader.answerKeysTitle}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'TRANSCRIPT' && {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab('TRANSCRIPT')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'TRANSCRIPT' ? colors.primaryText : colors.textSecondary },
                ]}
              >
                📜 Transkript
              </Text>
            </TouchableOpacity>
          </View>

          {/* Multiple Exercise Switcher Chips */}
          {items.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.exChipsRow}
            >
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={[
                    styles.exChip,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    selectedIndex === idx && {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedIndex(idx)}
                >
                  <Text
                    style={[
                      styles.exChipText,
                      { color: selectedIndex === idx ? colors.primaryText : colors.textMuted },
                    ]}
                  >
                    {item.exerciseLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={[styles.exerciseMeta, { color: colors.textPrimary }]}>
            {currentItem.exerciseLabel || strings.reader.openAnswers} • {displayPageLabel}
          </Text>

          {/* Scrollable Body Content */}
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* ========================================================= */}
            {/* TAB 1: ANSWERS                                             */}
            {/* ========================================================= */}
            {activeTab === 'ANSWERS' && (
              <>
                {/* Answer Images Gallery (Single or Multiple) */}
                {answerImagesList.length > 0 && (
                  <View style={styles.galleryWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {answerImagesList.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.imageCard,
                            { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                          ]}
                          onPress={() => setZoomImageUrl(uri)}
                          activeOpacity={0.9}
                        >
                          <Image source={{ uri }} style={styles.answerImage} resizeMode="contain" />
                          <View style={styles.zoomBadge}>
                            <Text style={styles.zoomBadgeText}>🔍 #{idx + 1}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Parsed Smart Pills */}
                {parsedPills.length > 0 ? (
                  <View style={styles.pillsRow}>
                    {parsedPills.map((p, idx) => (
                      <View
                        key={`${p.num}-${idx}`}
                        style={[
                          styles.answerCapsule,
                          { backgroundColor: colors.cardBg, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.capsuleText, { color: colors.textPrimary }]}>
                          {p.num}. {p.ans}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : !!currentItem.solutionText ? (
                  <View
                    style={[
                      styles.textKeyCard,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.textKeyValue, { color: colors.textPrimary }]}>
                      {currentItem.solutionText}
                    </Text>
                  </View>
                ) : answerImagesList.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {strings.reader.noAnswerKeys}
                    </Text>
                  </View>
                ) : null}

                {/* Teacher's Methodology Notes & Page Jump */}
                <View
                  style={[
                    styles.methodCard,
                    { backgroundColor: colors.primarySoft, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.methodHeader}>
                      <Text style={styles.starIcon}>⭐</Text>
                      <Text style={[styles.methodTitle, { color: colors.textPrimary }]}>
                        {strings.grades.bookTypeTeacher}
                      </Text>
                    </View>
                    <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                      {currentItem.methodologyNotes || strings.common.noData}
                    </Text>
                  </View>

                  {onSwitchToTeachersBook && (
                    <TouchableOpacity
                      style={[
                        styles.miniPageThumb,
                        { backgroundColor: colors.surface, borderColor: colors.borderStrong },
                      ]}
                      onPress={() => {
                        onClose();
                        onSwitchToTeachersBook(currentItem.teacherPageNumber || pageNumber);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.thumbLineBold} />
                      <View style={[styles.thumbLine, { backgroundColor: colors.border }]} />
                      <View style={[styles.thumbLineShort, { backgroundColor: colors.borderStrong }]} />
                      <Text style={[styles.thumbPageNum, { color: colors.primaryText }]}>
                        {t('common.pageShort')} {currentItem.teacherPageNumber || pageNumber}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* ========================================================= */}
            {/* TAB 2: TRANSCRIPT                                          */}
            {/* ========================================================= */}
            {activeTab === 'TRANSCRIPT' && (
              <View style={styles.transcriptWrap}>
                {/* Font Size Scaler Controls */}
                <View style={[styles.fontSizeBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[styles.fontSizeLabel, { color: colors.textSecondary }]}>
                    🎧 Audio Transkript Matni:
                  </Text>
                  <View style={styles.fontButtonsRow}>
                    <TouchableOpacity
                      style={[styles.fontBtn, { backgroundColor: colors.cardBg }]}
                      onPress={() => setTranscriptFontSize((s) => Math.max(12, s - 2))}
                    >
                      <Text style={[styles.fontBtnText, { color: colors.textPrimary }]}>A-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.fontSizeIndicator, { color: colors.primaryText }]}>
                      {transcriptFontSize}px
                    </Text>
                    <TouchableOpacity
                      style={[styles.fontBtn, { backgroundColor: colors.cardBg }]}
                      onPress={() => setTranscriptFontSize((s) => Math.min(26, s + 2))}
                    >
                      <Text style={[styles.fontBtnText, { color: colors.textPrimary }]}>A+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Transcript Text */}
                {!!currentItem.transcriptText ? (
                  <View
                    style={[
                      styles.transcriptCard,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.transcriptBody,
                        { fontSize: transcriptFontSize, color: colors.textPrimary },
                      ]}
                    >
                      {currentItem.transcriptText}
                    </Text>
                  </View>
                ) : transcriptImagesList.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Ushbu mashq uchun audio transkript kiritilmagan.
                    </Text>
                  </View>
                ) : null}

                {/* Transcript Images Gallery */}
                {transcriptImagesList.length > 0 && (
                  <View style={styles.galleryWrap}>
                    <Text style={[styles.galleryTitle, { color: colors.textSecondary }]}>
                      Transkript Skrinshotlari ({transcriptImagesList.length} ta):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                      {transcriptImagesList.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.imageCard,
                            { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                          ]}
                          onPress={() => setZoomImageUrl(uri)}
                          activeOpacity={0.9}
                        >
                          <Image source={{ uri }} style={styles.answerImage} resizeMode="contain" />
                          <View style={styles.zoomBadge}>
                            <Text style={styles.zoomBadgeText}>🔍 #{idx + 1}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ================================================================= */}
      {/* FULLSCREEN LIGHTBOX ZOOM MODAL (Mayda yozuvlarni kattalashtirish)  */}
      {/* ================================================================= */}
      {!!zoomImageUrl && (
        <Modal
          visible={!!zoomImageUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomImageUrl(null)}
        >
          <View style={styles.zoomOverlay}>
            <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomImageUrl(null)}>
              <Text style={styles.zoomCloseText}>✕ {strings.common.close}</Text>
            </TouchableOpacity>
            <Image source={{ uri: zoomImageUrl }} style={styles.zoomFullImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '84%',
    borderRadius: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulbEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  exChipsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  exChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  exChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  exerciseMeta: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  bodyScroll: {
    maxHeight: 380,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  answerCapsule: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  capsuleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  textKeyCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  textKeyValue: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  galleryWrap: {
    marginBottom: 12,
  },
  galleryTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  imageCard: {
    width: 240,
    height: 150,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
  },
  answerImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  zoomBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  methodCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starIcon: {
    fontSize: 14,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  methodText: {
    fontSize: 12,
    lineHeight: 17,
  },
  miniPageThumb: {
    width: 58,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbLineBold: {
    height: 5,
    borderRadius: 2,
    backgroundColor: '#93C5FD',
    width: '90%',
  },
  thumbLine: {
    height: 3,
    borderRadius: 1.5,
    width: '100%',
  },
  thumbLineShort: {
    height: 3,
    borderRadius: 1.5,
    width: '65%',
  },
  thumbPageNum: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'right',
  },
  transcriptWrap: {
    marginVertical: 4,
  },
  fontSizeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  fontSizeLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  fontButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fontBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fontBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fontSizeIndicator: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
  transcriptCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  transcriptBody: {
    fontWeight: '500',
    lineHeight: 22,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 55, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  zoomCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  zoomFullImage: {
    width: '100%',
    height: '82%',
  } as ImageStyle,
});
