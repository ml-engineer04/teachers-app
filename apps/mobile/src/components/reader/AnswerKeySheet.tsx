import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface AnswerKeySheetProps {
  visible: boolean;
  exerciseLabel: string;
  studentPageNumber: number;
  teacherPageNumber: number;
  answerContent: string;
  notes?: string;
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
  onClose,
  onJumpToTeacherPage,
}) => {
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
                <span style={styles.teacherBadge}>O‘QITUVCHI KITOBI (TEACHER'S BOOK)</span>
                <span style={styles.pageBadge}>Sahifa {teacherPageNumber}</span>
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
            <View style={styles.answersBox}>
              <Text style={styles.sectionLabel}>RASMIY JAVOBLAR KALITI:</Text>
              <Text style={styles.answerText}>
                {answerContent ||
                  '1. True — Artificial intelligence transforms interactive language lessons.\n2. False — Teachers maintain vital mentorship and communication roles.\n3. Not Given — Specific curriculum budget not stated.\n4. Paired dialogue practice promotes student confidence.'}
              </Text>
            </View>

            {/* Methodology Notes */}
            <View style={styles.methodologyBox}>
              <Text style={styles.methodologyLabel}>METODIK KO‘RSATMA & TAHLIL:</Text>
              <Text style={styles.methodologyText}>
                {notes ||
                  'Ushbu mashqda o‘quvchilar ko‘pincha passiv va aktiv zamon qo‘llanishida xatolikka yo‘l qo‘yadilar. 3-savol bo‘yicha sinfda juftlik muhokamasini o‘tkazish tavsiya etiladi.'}
              </Text>
            </View>
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
