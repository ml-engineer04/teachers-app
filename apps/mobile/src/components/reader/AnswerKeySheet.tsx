import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
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
  onSwitchToTeachersBook,
}) => {
  const { colors } = useTheme();
  const { strings, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomImageVisible, setZoomImageVisible] = useState(false);

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
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.bulbEmoji}>💡</Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {strings.reader.answerKeysTitle}
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

          {/* Segmented Pill Toggle */}
          <View style={[styles.segmentRow, { backgroundColor: colors.surfaceAlt }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'STUDENT' && {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab('STUDENT')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'STUDENT' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {strings.grades.bookTypeStudent}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeTab === 'TEACHER' && {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab('TEACHER')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === 'TEACHER' ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {strings.grades.bookTypeTeacher}
              </Text>
            </TouchableOpacity>
          </View>

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

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {!!currentItem.imageUrl && (
              <TouchableOpacity
                style={[
                  styles.imageCard,
                  { borderColor: colors.border, backgroundColor: colors.surfaceAlt },
                ]}
                onPress={() => setZoomImageVisible(true)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: currentItem.imageUrl }}
                  style={styles.answerImage}
                  resizeMode="contain"
                />
                <View style={styles.zoomBadge}>
                  <Text style={styles.zoomBadgeText}>🔍 {strings.reader.openAnswers}</Text>
                </View>
              </TouchableOpacity>
            )}

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
            ) : !currentItem.imageUrl ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {strings.reader.noAnswerKeys}
                </Text>
              </View>
            ) : null}

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
          </ScrollView>
        </View>
      </View>

      {!!currentItem.imageUrl && (
        <Modal
          visible={zoomImageVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomImageVisible(false)}
        >
          <View style={styles.zoomOverlay}>
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setZoomImageVisible(false)}
            >
              <Text style={styles.zoomCloseText}>✕ {strings.common.close}</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: currentItem.imageUrl }}
              style={styles.zoomFullImage}
              resizeMode="contain"
            />
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
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 22,
    padding: 18,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
    borderWidth: 1,
  },
  header: {
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
  bulbEmoji: {
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    gap: 4,
    marginBottom: 14,
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
    fontWeight: '700',
  },
  exChipsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  exChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  exChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  exerciseMeta: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 12,
  },
  bodyScroll: {
    maxHeight: 340,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  answerCapsule: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
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
  imageCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
  },
  answerImage: {
    width: '100%',
    height: 160,
  },
  zoomBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomBadgeText: {
    fontSize: 11,
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
  },
  methodCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 55, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 42,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
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
    height: '80%',
  },
});
