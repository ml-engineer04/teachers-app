import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  bookPageToPdfPage,
  getBookContentTotalPages,
  pdfPageToBookDisplay,
} from '@smartteacherbook/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export interface TocEntry {
  id: string;
  unit?: string;
  title: string;
  pageNumber: number;
  endPageNumber?: number;
  subtitle?: string;
}

interface TocSearchDrawerProps {
  visible: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  contentStartPdfPage?: number;
  onSelectPage: (page: number) => void;
  tocItems?: TocEntry[];
}

/**
 * Floating Card (Contents / Mundarija / Содержание):
 * Displays admin-defined Units + Go-to-Page jumper mapped with contentStartPdfPage.
 */
export const TocSearchDrawer: React.FC<TocSearchDrawerProps> = ({
  visible,
  onClose,
  totalPages,
  currentPage,
  contentStartPdfPage = 1,
  onSelectPage,
  tocItems,
}) => {
  const { colors } = useTheme();
  const { strings, t } = useI18n();
  const [pageInput, setPageInput] = useState('');
  const [jumpMode, setJumpMode] = useState(false);

  const contentTotal = getBookContentTotalPages(totalPages, contentStartPdfPage);

  useEffect(() => {
    if (visible) {
      setJumpMode(false);
    }
  }, [visible]);

  const effectiveToc = useMemo(() => {
    if (!tocItems || tocItems.length === 0) return [];
    return [...tocItems].sort((a, b) => a.pageNumber - b.pageNumber);
  }, [tocItems]);

  const activeUnitIndex = useMemo(() => {
    let matchIdx = 0;
    effectiveToc.forEach((item, idx) => {
      if (currentPage >= item.pageNumber) matchIdx = idx;
    });
    return matchIdx;
  }, [effectiveToc, currentPage]);

  const formatPdfPageShort = (pdfPage: number) => {
    const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
    if (info.isFrontMatter) {
      return `${strings.common.introShort} ${info.frontMatterIndex}`;
    }
    return String(info.bookPage ?? pdfPage);
  };

  const handleGoToInputPage = () => {
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= Math.max(1, contentTotal)) {
      const targetPdf = bookPageToPdfPage(num, totalPages, contentStartPdfPage);
      onSelectPage(targetPdf);
      setPageInput('');
      setJumpMode(false);
      onClose();
    }
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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                  stroke={colors.primary}
                  strokeWidth={2.3}
                  strokeLinecap="round"
                />
              </Svg>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {strings.reader.tocTitle}
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

          {/* Unit List */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {effectiveToc.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {strings.reader.noToc}
                </Text>
              </View>
            ) : (
              effectiveToc.map((item, idx) => {
                const isSelected = idx === activeUnitIndex;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.unitRow,
                      isSelected && { backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => {
                      onSelectPage(Math.min(Math.max(1, item.pageNumber), Math.max(1, totalPages)));
                      onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    {isSelected ? (
                      <View style={[styles.activeLeftBar, { backgroundColor: colors.primaryDark }]} />
                    ) : (
                      <View style={styles.inactiveLeftSpace} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.unitTitle,
                          { color: isSelected ? colors.textPrimary : colors.textSecondary },
                          isSelected && styles.unitTitleActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.unitPageNum,
                        { color: isSelected ? colors.primaryDark : colors.textMuted },
                        isSelected && styles.unitPageNumActive,
                      ]}
                    >
                      {item.endPageNumber
                        ? `${formatPdfPageShort(item.pageNumber)}–${formatPdfPageShort(item.endPageNumber)}`
                        : formatPdfPageShort(item.pageNumber)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Bottom "Go to page" CTA / Inline Jump Bar */}
          {jumpMode ? (
            <View style={styles.jumpRow}>
              <TextInput
                style={[
                  styles.jumpInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.borderStrong,
                    color: colors.textPrimary,
                  },
                ]}
                value={pageInput}
                onChangeText={(txt) => setPageInput(txt.replace(/\D/g, ''))}
                placeholder={`1–${Math.max(1, contentTotal)}`}
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                autoFocus
                onSubmitEditing={handleGoToInputPage}
              />
              <TouchableOpacity
                style={[styles.jumpConfirmBtn, { backgroundColor: colors.primaryDark }]}
                onPress={handleGoToInputPage}
              >
                <Text style={[styles.jumpConfirmText, { color: colors.onPrimary }]}>
                  {strings.reader.goToPage}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.bottomPillBtn, { backgroundColor: colors.primarySoft }]}
              onPress={() => setJumpMode(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.bottomPillText, { color: colors.textPrimary }]}>
                {t('reader.jumpToPagePlaceholder').replace('...', '')} (1–{Math.max(1, contentTotal)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 280,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeLeftBar: {
    width: 3.5,
    height: 22,
    borderRadius: 2,
    marginRight: 12,
  },
  inactiveLeftSpace: {
    width: 15.5,
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitTitleActive: {
    fontWeight: '800',
  },
  unitPageNum: {
    fontSize: 13.5,
    fontWeight: '700',
    marginLeft: 10,
  },
  unitPageNumActive: {
    fontWeight: '800',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  bottomPillBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bottomPillText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  jumpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  jumpInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  jumpConfirmBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  jumpConfirmText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
