import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { pdfPageToBookDisplay } from '@smartteacherbook/shared';
import { useTheme } from '../../theme/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export interface BookmarkEntry {
  id?: string;
  pageNumber: number;
  title?: string;
}

export interface NoteEntry {
  id: string;
  pageNumber: number;
  text: string;
  createdAt?: string;
}

interface BookmarksNotesDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages?: number;
  contentStartPdfPage?: number;
  bookmarks: BookmarkEntry[];
  notes: NoteEntry[];
  initialTab?: 'BOOKMARKS' | 'NOTES';
  onSelectPage: (page: number) => void;
  onToggleBookmark: (page: number) => void;
  onAddNote: (page: number, text: string) => Promise<void> | void;
  onDeleteNote: (noteId: string) => Promise<void> | void;
}

export const BookmarksNotesDrawer: React.FC<BookmarksNotesDrawerProps> = ({
  visible,
  onClose,
  currentPage,
  totalPages = 100,
  contentStartPdfPage = 1,
  bookmarks,
  notes,
  initialTab = 'BOOKMARKS',
  onSelectPage,
  onToggleBookmark,
  onAddNote,
  onDeleteNote,
}) => {
  const { colors, isDark } = useTheme();
  const { strings, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'BOOKMARKS' | 'NOTES'>(initialTab);
  const [addingNote, setAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const badgePalette = [
    { bg: isDark ? 'rgba(129, 140, 248, 0.18)' : '#EEF2FF', icon: colors.primary },
    { bg: isDark ? 'rgba(251, 191, 36, 0.18)' : '#FEF3C7', icon: colors.warning },
    { bg: isDark ? 'rgba(52, 211, 153, 0.18)' : '#DCFCE7', icon: colors.accent },
  ];

  const formatPageBadge = (pdfPage: number) => {
    const info = pdfPageToBookDisplay(pdfPage, totalPages, contentStartPdfPage);
    if (info.isFrontMatter) {
      return `${strings.common.introShort} ${info.frontMatterIndex}`;
    }
    return `${info.bookPage ?? pdfPage}-${strings.common.pageShort}`;
  };

  const isCurrentBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  const handleCreateNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    await onAddNote(currentPage, trimmed);
    setNoteDraft('');
    setAddingNote(false);
    setActiveTab('NOTES');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header Switcher */}
          <View style={styles.topRow}>
            <View style={[styles.segmentBox, { backgroundColor: colors.surfaceAlt }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'BOOKMARKS' && [
                    styles.segmentBtnActive,
                    { backgroundColor: colors.cardBg, shadowColor: colors.shadowColor },
                  ],
                ]}
                onPress={() => setActiveTab('BOOKMARKS')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === 'BOOKMARKS' ? colors.primary : colors.textSecondary },
                    activeTab === 'BOOKMARKS' && styles.segmentTextActive,
                  ]}
                >
                  {t('reader.bookmarksTitle', { count: bookmarks.length })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'NOTES' && [
                    styles.segmentBtnActive,
                    { backgroundColor: colors.cardBg, shadowColor: colors.shadowColor },
                  ],
                ]}
                onPress={() => setActiveTab('NOTES')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === 'NOTES' ? colors.primary : colors.textSecondary },
                    activeTab === 'NOTES' && styles.segmentTextActive,
                  ]}
                >
                  {t('reader.notesTitle', { count: notes.length })}
                </Text>
              </TouchableOpacity>
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

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {activeTab === 'BOOKMARKS' ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.quickToggleCard,
                    { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
                  ]}
                  onPress={() => onToggleBookmark(currentPage)}
                >
                  <Text style={[styles.quickToggleText, { color: colors.primaryText }]}>
                    {isCurrentBookmarked
                      ? `✓ ${formatPageBadge(currentPage)} — ${strings.common.delete}`
                      : `+ ${formatPageBadge(currentPage)} — ${strings.reader.bookmark}`}
                  </Text>
                </TouchableOpacity>

                {bookmarks.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {strings.reader.noBookmarks}
                    </Text>
                  </View>
                ) : (
                  bookmarks.map((bm, idx) => {
                    const pal = badgePalette[idx % badgePalette.length];
                    return (
                      <TouchableOpacity
                        key={`${bm.pageNumber}-${idx}`}
                        style={[styles.cardRow, { backgroundColor: colors.surfaceAlt }]}
                        onPress={() => {
                          onSelectPage(bm.pageNumber);
                          onClose();
                        }}
                      >
                        <View style={[styles.bmIconBox, { backgroundColor: pal.bg }]}>
                          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                              fill={pal.icon}
                            />
                          </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                            {formatPageBadge(bm.pageNumber)}
                          </Text>
                          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {bm.title || strings.reader.bookmark}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.trashBtn}
                          onPress={() => onToggleBookmark(bm.pageNumber)}
                        >
                          <Text style={[styles.trashText, { color: colors.danger }]}>
                            {strings.common.delete}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            ) : (
              <>
                {addingNote && (
                  <View
                    style={[
                      styles.noteComposer,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
                    ]}
                  >
                    <Text style={[styles.composerLabel, { color: colors.primaryText }]}>
                      {formatPageBadge(currentPage)} — {strings.reader.notes}
                    </Text>
                    <TextInput
                      style={[
                        styles.noteInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      placeholder={strings.reader.addNotePlaceholder}
                      placeholderTextColor={colors.placeholder}
                      multiline
                      autoFocus
                    />
                    <View style={styles.composerActions}>
                      <TouchableOpacity
                        style={[styles.composerCancel, { backgroundColor: colors.cardBg }]}
                        onPress={() => setAddingNote(false)}
                      >
                        <Text style={[styles.composerCancelText, { color: colors.textSecondary }]}>
                          {strings.common.cancel}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.composerSave, { backgroundColor: colors.primaryDark }]}
                        onPress={handleCreateNote}
                      >
                        <Text style={[styles.composerSaveText, { color: colors.onPrimary }]}>
                          {strings.common.save}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {notes.length === 0 && !addingNote ? (
                  <View style={[styles.emptyBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {strings.reader.noNotes}
                    </Text>
                  </View>
                ) : (
                  notes.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[styles.noteCard, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => {
                        onSelectPage(n.pageNumber);
                        onClose();
                      }}
                    >
                      <View style={styles.noteTop}>
                        <View style={[styles.notePageBadge, { backgroundColor: colors.primarySoft }]}>
                          <Text style={[styles.notePageBadgeText, { color: colors.primaryText }]}>
                            {formatPageBadge(n.pageNumber)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => onDeleteNote(n.id)}>
                          <Text style={[styles.trashText, { color: colors.danger }]}>
                            {strings.common.delete}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.noteBody, { color: colors.textPrimary }]}>{n.text}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </ScrollView>

          {/* Bottom CTA */}
          <TouchableOpacity
            style={[
              styles.bottomCta,
              { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
            ]}
            onPress={() => {
              setActiveTab('NOTES');
              setAddingNote(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.bottomCtaText, { color: colors.primaryText }]}>
              + {strings.reader.saveNote}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  segmentBox: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 360,
  },
  quickToggleCard: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  quickToggleText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  bmIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  trashBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trashText: {
    fontSize: 12,
    fontWeight: '700',
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
  noteComposer: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  composerLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    minHeight: 74,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  composerCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  composerCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  composerSave: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
  },
  composerSaveText: {
    fontSize: 12,
    fontWeight: '800',
  },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  noteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notePageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  notePageBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  bottomCta: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  bottomCtaText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
