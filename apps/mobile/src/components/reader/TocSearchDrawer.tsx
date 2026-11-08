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

interface TocItem {
  id: string;
  title: string;
  unit: string;
  pageNumber: number;
}

interface TocSearchDrawerProps {
  visible: boolean;
  currentPage: number;
  onClose: () => void;
  onSelectPage: (page: number) => void;
}

export const TocSearchDrawer: React.FC<TocSearchDrawerProps> = ({
  visible,
  currentPage,
  onClose,
  onSelectPage,
}) => {
  const [activeTab, setActiveTab] = useState<'TOC' | 'SEARCH'>('TOC');
  const [searchQuery, setSearchQuery] = useState('');

  const tocItems: TocItem[] = [
    { id: '1', unit: 'Unit 1', title: 'Technology, Science & Digital Classrooms', pageNumber: 1 },
    { id: '2', unit: 'Unit 1', title: 'Vocabulary Practice & Phrasal Verbs', pageNumber: 2 },
    { id: '3', unit: 'Unit 2', title: 'Global Ecosystems & Environmental Solutions', pageNumber: 3 },
    { id: '4', unit: 'Unit 2', title: 'Grammar Focus: Conditionals Type 3', pageNumber: 4 },
    { id: '5', unit: 'Unit 3', title: 'Arts, Architecture & World Heritage', pageNumber: 5 },
    { id: '6', unit: 'Unit 3', title: 'Communicative Fluency & Speaking Tasks', pageNumber: 6 },
  ];

  const searchResults = searchQuery
    ? tocItems.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.unit.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerCard}>
          {/* Top Handle */}
          <View style={styles.handle} />

          {/* Tab Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'TOC' && styles.tabButtonActive]}
              onPress={() => setActiveTab('TOC')}
            >
              <Text style={[styles.tabText, activeTab === 'TOC' && styles.tabTextActive]}>
                📑 Mundarija (TOC)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'SEARCH' && styles.tabButtonActive]}
              onPress={() => setActiveTab('SEARCH')}
            >
              <Text style={[styles.tabText, activeTab === 'SEARCH' && styles.tabTextActive]}>
                🔍 Matn Qidirish
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: TOC */}
          {activeTab === 'TOC' && (
            <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
              {tocItems.map((item) => {
                const isCurrent = item.pageNumber === currentPage;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.tocItemCard, isCurrent && styles.tocItemCardActive]}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectPage(item.pageNumber);
                      onClose();
                    }}
                  >
                    <View style={styles.tocLeft}>
                      <Text style={styles.tocUnitBadge}>{item.unit}</Text>
                      <Text style={styles.tocTitle}>{item.title}</Text>
                    </View>

                    <View style={[styles.pageNumberPill, isCurrent && styles.pageNumberPillActive]}>
                      <Text style={[styles.pageNumberText, isCurrent && styles.pageNumberTextActive]}>
                        p. {item.pageNumber}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* TAB 2: SEARCH */}
          {activeTab === 'SEARCH' && (
            <View style={styles.searchSection}>
              <View style={styles.searchBar}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="So‘z yoki mavzuni kiriting..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={{ color: '#94A3B8', fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
                {searchQuery.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    Darslik matni bo‘yicha to‘liq matnli indeks orqali qidiring (masalan: "Technology", "Grammar", "Ecosystems").
                  </Text>
                ) : searchResults.length === 0 ? (
                  <Text style={styles.emptyHint}>Hech qanday natija topilmadi.</Text>
                ) : (
                  searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.tocItemCard}
                      onPress={() => {
                        onSelectPage(item.pageNumber);
                        onClose();
                      }}
                    >
                      <View style={styles.tocLeft}>
                        <Text style={styles.tocUnitBadge}>{item.unit}</Text>
                        <Text style={styles.tocTitle}>{item.title}</Text>
                      </View>
                      <View style={styles.pageNumberPill}>
                        <Text style={styles.pageNumberText}>p. {item.pageNumber}</Text>
                      </View>
                    </TouchableOpacity>
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
  listWrap: {
    flex: 1,
  },
  tocItemCard: {
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
  tocItemCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  tocLeft: {
    flex: 1,
    marginRight: 12,
  },
  tocUnitBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  tocTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  pageNumberPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  pageNumberPillActive: {
    backgroundColor: '#2563EB',
  },
  pageNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
  searchSection: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
