import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';

interface AnswerKeySheetProps {
  visible: boolean;
  exerciseLabel: string;
  studentPageNumber: number;
  teacherPageNumber: number;
  answerContent: string;
  notes?: string;
  imageUrl?: string;
  onClose: () => void;
  onJumpToTeacherPage?: (teacherPage: number) => void;
}

export const AnswerKeySheet: React.FC<AnswerKeySheetProps> = ({
  visible,
  exerciseLabel,
  studentPageNumber,
  teacherPageNumber,
  answerContent,
  notes,
  imageUrl,
  onClose,
  onJumpToTeacherPage,
}) => {
  const [isFullScreenPreview, setIsFullScreenPreview] = React.useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          {/* Top Pill Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.teacherBadge}>O‘QITUVCHI KITOBI (TEACHER'S BOOK)</Text>
                <Text style={styles.pageBadge}>Sahifa {teacherPageNumber}</Text>
              </View>
              <Text style={styles.exerciseTitle}>
                {exerciseLabel || 'Mashq Javoblari'}
              </Text>
              <Text style={styles.linkedSub}>
                Bog‘langan sahifa: Student's Book p. {studentPageNumber}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Answer Key Content */}
          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* If Teacher uploaded a Screenshot Image of the answer key */}
            {imageUrl ? (
              <View style={styles.screenshotBox}>
                <View style={styles.screenshotHeaderRow}>
                  <Text style={styles.sectionLabelWhite}>📸 RASMIY JAVOBLAR SKRINSHOTI:</Text>
                  <TouchableOpacity
                    onPress={() => setIsFullScreenPreview(true)}
                    style={styles.expandBadge}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.expandText}>Kattalashtirish 🔍</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsFullScreenPreview(true)}
                  style={styles.screenshotImageWrap}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.screenshotImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <Text style={styles.tapToZoomHint}>Rasmni to‘liq hajmda ochish uchun ustiga bosing</Text>
              </View>
            ) : null}

            {/* Answer Text Content */}
            {answerContent ? (
              <View style={styles.answersBox}>
                <Text style={styles.sectionLabel}>RASMIY JAVOBLAR KALITI:</Text>
                <Text style={styles.answerText}>
                  {answerContent}
                </Text>
              </View>
            ) : null}

            {/* Methodology Notes */}
            {notes ? (
              <View style={styles.methodologyBox}>
                <Text style={styles.methodologyLabel}>METODIK KO‘RSATMA & TAHLIL:</Text>
                <Text style={styles.methodologyText}>
                  {notes}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.85}
              onPress={onClose}
            >
              <Text style={styles.doneBtnText}>Darslikka Qaytish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Fullscreen Screenshot Zoom Modal */}
      {imageUrl && (
        <Modal
          visible={isFullScreenPreview}
          transparent
          animationType="fade"
          onRequestClose={() => setIsFullScreenPreview(false)}
        >
          <View style={styles.fullscreenOverlay}>
            <View style={styles.fullscreenTopBar}>
              <Text style={styles.fullscreenTitle}>
                {exerciseLabel} — Skrinshot
              </Text>
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={() => setIsFullScreenPreview(false)}
              >
                <Text style={styles.fullscreenCloseBtnText}>✕ Yopish</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenImageWrap}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
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
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  teacherBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pageBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  linkedSub: {
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
  scrollBody: {
    marginBottom: 16,
  },
  screenshotBox: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  screenshotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabelWhite: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  expandBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38BDF8',
  },
  screenshotImageWrap: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  tapToZoomHint: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  fullscreenTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fullscreenCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fullscreenCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  answersBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 22,
  },
  methodologyBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  methodologyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  methodologyText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  actionsRow: {
    paddingTop: 4,
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
