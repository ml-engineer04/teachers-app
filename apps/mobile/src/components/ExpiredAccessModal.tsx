import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';

interface ExpiredAccessModalProps {
  visible: boolean;
  gradeNumber: number;
  subjectName?: string;
  isExpired?: boolean;
  onClose: () => void;
  onRequestAccess: () => void;
}

export const ExpiredAccessModal: React.FC<ExpiredAccessModalProps> = ({
  visible,
  gradeNumber,
  subjectName = 'Darsliklar',
  isExpired = false,
  onClose,
  onRequestAccess,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Padlock Visual Icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.lockEmoji}>🔒</Text>
          </View>

          <Text style={styles.title}>
            {isExpired ? 'Obuna Muddati Tugagan' : 'Darslik Qulflangan'}
          </Text>

          <Text style={styles.gradeSubtitle}>
            {gradeNumber}-sinf {subjectName}
          </Text>

          <Text style={styles.description}>
            {isExpired
              ? 'Ushbu sinf darsliklaridan oflayn foydalanish muddati tugagan. Darsliklar qurilmangizda saqlanadi, qayta ochish uchun obunani yangilang.'
              : 'Ushbu sinf darsliklaridan to‘liq foydalanish va audio/videolarni yuklash uchun telefon orqali savdo bo‘limimizga so‘rov qoldiring.'}
          </Text>

          {/* Pricing reminder */}
          <View style={styles.priceRow}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceDuration}>1 Oylik</Text>
              <Text style={styles.priceAmount}>119,000 UZS</Text>
            </View>
            <View style={[styles.priceBadge, styles.priceBadgeAccent]}>
              <Text style={styles.priceDuration}>3 Oylik (Tejamkor)</Text>
              <Text style={styles.priceAmount}>299,000 UZS</Text>
            </View>
          </View>

          {/* CTA Buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => {
              onClose();
              onRequestAccess();
            }}
          >
            <Text style={styles.primaryButtonText}>
              📞 Ruxsat So‘rash / Obunani Ochish
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Keyinroq</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  lockEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
  },
  gradeSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 20,
  },
  priceBadge: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceBadgeAccent: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  priceDuration: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceAmount: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 2,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
});
