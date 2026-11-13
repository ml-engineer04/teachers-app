import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { mobileApi } from '../services/api/mobileApi';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

interface ExpiredAccessModalProps {
  visible: boolean;
  gradeNumber: number;
  subjectId?: string;
  subjectName?: string;
  isExpired?: boolean;
  onClose: () => void;
  onRequestAccess: () => void;
}

export const ExpiredAccessModal: React.FC<ExpiredAccessModalProps> = ({
  visible,
  gradeNumber,
  subjectId,
  subjectName,
  isExpired = false,
  onClose,
  onRequestAccess,
}) => {
  const { colors } = useTheme();
  const { strings, formatGrade, formatSubject, t } = useI18n();

  const [plans, setPlans] = useState<any[]>([
    { id: 'MONTHLY', durationMonths: 1, priceUzs: 119000 },
    { id: 'THREE_MONTHS', durationMonths: 3, priceUzs: 299000 },
  ]);

  useEffect(() => {
    if (visible) {
      mobileApi
        .getPricingPlans(gradeNumber, subjectId)
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data.slice(0, 2));
          }
        })
        .catch(() => {});
    }
  }, [visible, gradeNumber, subjectId]);

  const resolvedSubject = subjectName
    ? formatSubject(subjectName, subjectId)
    : strings.common.allSubjects;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningSoft }]}>
            <Text style={styles.lockEmoji}>🔒</Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isExpired ? strings.modals.expiredTitle : strings.grades.lockedBadge}
          </Text>

          <Text style={[styles.gradeSubtitle, { color: colors.primaryText }]}>
            {formatGrade(gradeNumber)} • {resolvedSubject}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {strings.modals.expiredDesc}
          </Text>

          <View style={styles.priceRow}>
            {plans.map((p, idx) => {
              const months = Number(p.durationMonths || (idx === 0 ? 1 : 3));
              return (
                <View
                  key={p.id || idx}
                  style={[
                    styles.priceBadge,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    idx === 1 && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.priceDuration, { color: colors.textSecondary }]}>
                    {t('common.months', { n: months })}
                  </Text>
                  <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>
                    {Number(p.priceUzs || 0).toLocaleString()} {strings.common.currencySom}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.requestBtn, { backgroundColor: colors.primaryDark }]}
            onPress={() => {
              onClose();
              onRequestAccess();
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.requestBtnText, { color: colors.onPrimary }]}>
              {strings.modals.expiredAction}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={[styles.laterBtnText, { color: colors.textMuted }]}>
              {strings.common.cancel}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  gradeSubtitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  priceBadge: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  priceDuration: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  priceAmount: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  requestBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  laterBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  laterBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
