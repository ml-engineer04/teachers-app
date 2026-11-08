import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface MediaLibraryItem {
  id: string;
  type: 'AUDIO' | 'VIDEO';
  title: string;
  unit: string;
  duration: string;
  size: string;
}

interface MediaLibraryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onPlayMedia: (item: MediaLibraryItem) => void;
}

export const MediaLibraryDrawer: React.FC<MediaLibraryDrawerProps> = ({
  visible,
  onClose,
  onPlayMedia,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'AUDIO' | 'VIDEO'>('ALL');

  const mediaList: MediaLibraryItem[] = [
    {
      id: 'm1',
      type: 'AUDIO',
      title: 'Unit 1: Track 1 — Listening Comprehension',
      unit: 'Unit 1 (p. 2)',
      duration: '02:30',
      size: '3.2 MB',
    },
    {
      id: 'm2',
      type: 'AUDIO',
      title: 'Unit 1: Track 2 — Vocabulary & Pronunciation',
      unit: 'Unit 1 (p. 3)',
      duration: '01:45',
      size: '2.4 MB',
    },
    {
      id: 'm3',
      type: 'VIDEO',
      title: 'Unit 1: Grammar Focus — Conditionals Type 3',
      unit: 'Unit 1 (p. 4)',
      duration: '05:10',
      size: '15.4 MB',
    },
    {
      id: 'm4',
      type: 'AUDIO',
      title: 'Unit 2: Track 3 — Ecosystems & Biodiversity',
      unit: 'Unit 2 (p. 5)',
      duration: '03:15',
      size: '4.1 MB',
    },
    {
      id: 'm5',
      type: 'VIDEO',
      title: 'Unit 2: Speaking Masterclass — Debates & Arguments',
      unit: 'Unit 2 (p. 6)',
      duration: '06:40',
      size: '22.0 MB',
    },
  ];

  const filtered = filterType === 'ALL' ? mediaList : mediaList.filter((m) => m.type === filterType);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerCard}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <div>
              <Text style={styles.title}>Media Kutubxona (Listening & Video)</Text>
              <Text style={styles.sub}>
                Barcha audio va videolar qurilmada AES-256 bilan shifrlangan
              </Text>
            </div>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['ALL', 'AUDIO', 'VIDEO'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.filterPill, filterType === t && styles.filterPillActive]}
                onPress={() => setFilterType(t)}
              >
                <Text style={[styles.filterPillText, filterType === t && styles.filterPillTextActive]}>
                  {t === 'ALL' ? 'Barchasi' : t === 'AUDIO' ? '🎧 Audio Treklar' : '🎬 Video Darslar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Media List */}
          <ScrollView style={styles.listWrap} showsVerticalScrollIndicator={false}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaItemCard}
                activeOpacity={0.7}
                onPress={() => {
                  onPlayMedia(item);
                  onClose();
                }}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: item.type === 'AUDIO' ? '#EFF6FF' : '#FEF2F2' },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{item.type === 'AUDIO' ? '🎧' : '🎬'}</Text>
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>
                    {item.unit} • {item.duration} • {item.size}
                  </Text>
                </View>

                <View style={styles.playMiniBtn}>
                  <Text style={styles.playMiniIcon}>▶</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  sub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listWrap: {
    flex: 1,
  },
  mediaItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  playMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playMiniIcon: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2,
  },
});
