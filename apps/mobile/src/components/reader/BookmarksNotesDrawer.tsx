import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface Bookmark {
  id: string;
  pageNumber: number;
  title: string;
  createdAt: string;
}

interface Note {
  id: string;
  pageNumber: number;
  text: string;
  createdAt: string;
}

interface BookmarksNotesDrawerProps {
  visible: boolean;
  currentPage: number;
  onClose: () => void;
  onSelectPage: (page: number) => void;
}

export const BookmarksNotesDrawer: React.FC<BookmarksNotesDrawerProps> = ({
  visible,
  currentPage,
  onClose,
  onSelectPage,
}) => {
  const [activeTab, setActiveTab] = useState<'BOOKMARKS' | 'NOTES'>('BOOKMARKS');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { id: 'bm_1', pageNumber: 2, title: 'Digital Classrooms & Vocabulary', createdAt: 'Kecha' },
    { id: 'bm_2', pageNumber: 4, title: 'Grammar Conditionals Rule', createdAt: 'Bugun' },
  ]);

  const [notes, setNotes] = useState<Note[]>([
    {
      id: 'nt_1',
      pageNumber: 2,
      text: '3-mashq bo‘yicha o‘quvchilarni 4 kishilik guruhga bo‘lib, audio yozuvni 2 marta eshittirish kerak.',
      createdAt: 'Bugun, 09:30',
    },
  ]);

  const [newNoteText, setNewNoteText] = useState('');

  const isCurrentBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  const toggleBookmarkCurrentPage = () => {
    if (isCurrentBookmarked) {
      setBookmarks((prev) => prev.filter((b) => b.pageNumber !== currentPage));
    } else {
      setBookmarks((prev) => [
        ...prev,
        {
          id: `bm_${Date.now()}`,
          pageNumber: currentPage,
          title: `${currentPage}-sahifa xatcho‘pi`,
          createdAt: 'Hozir',
        },
      ]);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: `nt_${Date.now()}`,
        pageNumber: currentPage,
        text: newNoteText.trim(),
        createdAt: 'Hozir',
      },
    ]);
    setNewNoteText('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerCard}>
          {/* Top Handle */}
          <View style={styles.handle} />

          {/* Tab Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'BOOKMARKS' && styles.tabButtonActive]}
              onPress={() => setActiveTab('BOOKMARKS')}
            >
              <Text style={[styles.tabText, activeTab === 'BOOKMARKS' && styles.tabTextActive]}>
                🔖 Xatcho‘plar ({bookmarks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'NOTES' && styles.tabButtonActive]}
              onPress={() => setActiveTab('NOTES')}
            >
              <Text style={[styles.tabText, activeTab === 'NOTES' && styles.tabTextActive]}>
                📝 Qaydlar ({notes.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: BOOKMARKS */}
          {activeTab === 'BOOKMARKS' && (
            <View style={{ flex: 1 }}>
              {/* Add/remove for current page */}
              <TouchableOpacity
                style={[styles.addBookmarkBtn, isCurrentBookmarked && styles.addBookmarkBtnActive]}
                onPress={toggleBookmarkCurrentPage}
              >
                <Text style={styles.addBookmarkIcon}>{isCurrentBookmarked ? '★' : '☆'}</Text>
                <Text style={styles.addBookmarkText}>
                  {isCurrentBookmarked
                    ? `${currentPage}-sahifani xatcho‘plardan o‘chirish`
                    : `Hozirgi (${currentPage}-sahifa)ni xatcho‘plarga qo‘shish`}
                </Text>
              </TouchableOpacity>

              <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
                {bookmarks.length === 0 ? (
                  <Text style={styles.emptyHint}>Hali hech qanday xatcho‘p saqlanmagan.</Text>
                ) : (
                  bookmarks.map((bm) => (
                    <TouchableOpacity
                      key={bm.id}
                      style={styles.itemCard}
                      onPress={() => {
                        onSelectPage(bm.pageNumber);
                        onClose();
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{bm.title}</Text>
                        <Text style={styles.itemMeta}>Qo‘shilgan: {bm.createdAt}</Text>
                      </View>
                      <View style={styles.pageBadge}>
                        <Text style={styles.pageBadgeText}>p. {bm.pageNumber}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* TAB 2: NOTES */}
          {activeTab === 'NOTES' && (
            <View style={{ flex: 1 }}>
              {/* Add Note Input */}
              <View style={styles.noteInputCard}>
                <Text style={styles.noteInputTitle}>
                  {currentPage}-sahifa uchun o‘qituvchi eslatmasi:
                </Text>
                <TextInput
                  style={styles.noteTextInput}
                  placeholder="Dars rejasi yoki metodik eslatma..."
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity
                  style={styles.saveNoteBtn}
                  onPress={handleAddNote}
                  disabled={!newNoteText.trim()}
                >
                  <Text style={styles.saveNoteBtnText}>Qaydni Saqlash</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
                {notes.length === 0 ? (
                  <Text style={styles.emptyHint}>Hali hech qanday qayd yozilmagan.</Text>
                ) : (
                  notes.map((nt) => (
                    <View key={nt.id} style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <Text style={styles.notePageBadge}>{nt.pageNumber}-sahifa</Text>
                        <TouchableOpacity onPress={() => handleDeleteNote(nt.id)}>
                          <Text style={styles.deleteText}>O‘chirish</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.noteText}>{nt.text}</Text>
                      <Text style={styles.noteDate}>{nt.createdAt}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '75%',
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  addBookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  addBookmarkBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  addBookmarkIcon: {
    fontSize: 16,
    color: '#2563EB',
    marginRight: 8,
  },
  addBookmarkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  listWrap: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  pageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  pageBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  emptyHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 30,
  },
  noteInputCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  noteInputTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  noteTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 8,
    minHeight: 50,
  },
  saveNoteBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notePageBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deleteText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  noteDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
});
