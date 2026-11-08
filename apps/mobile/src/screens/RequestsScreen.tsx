import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { mobileApi } from '../services/api/mobileApi';
import { SubscriptionManager } from '../services/subscription/subscriptionManager';
import { SubscriptionPlan } from '@smartteacherbook/shared';

interface RequestsScreenProps {
  initialGrade?: number;
  initialSubject?: string;
  initialPlan?: string;
  onBack: () => void;
  onGradeGranted: (grade: number, subjectCode: string, plan: string) => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  initialGrade = 11,
  initialSubject = 'ENG',
  initialPlan = 'MONTHLY',
  onBack,
  onGradeGranted,
}) => {
  const [phone, setPhone] = useState('+998 ');
  const [selectedGrade, setSelectedGrade] = useState<number>(initialGrade);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    (initialPlan as SubscriptionPlan) || SubscriptionPlan.MONTHLY,
  );
  const [requestSubmitted, setRequestSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [pricingPlans, setPricingPlans] = useState<any[]>([
    { id: 'MONTHLY', name: '1 Oylik (30 kun)', durationDays: 30, priceUzs: selectedGrade === 11 ? 119000 : 99000, sub: 'Sinov uchun qulay' },
    { id: 'THREE_MONTHS', name: '3 Oylik (90 kun)', durationDays: 90, priceUzs: selectedGrade === 11 ? 299000 : 249000, sub: 'Choraklik eng ommabop' },
    { id: 'YEARLY', name: '1 Yillik (365 kun)', durationDays: 365, priceUzs: selectedGrade === 11 ? 890000 : 799000, sub: 'Butun o‘quv yili uchun' },
  ]);

  const [subjects, setSubjects] = useState<any[]>([
    { code: 'ENG', name: 'Ingliz tili', icon: '🇬🇧' },
    { code: 'MATH', name: 'Matematika', icon: '📐' },
    { code: 'PHYS', name: 'Fizika', icon: '⚛️' },
    { code: 'CHEM', name: 'Kimyo', icon: '🧪' },
    { code: 'BIO', name: 'Biologiya', icon: '🧬' },
    { code: 'UZB', name: 'Ona tili', icon: '📖' },
  ]);

  useEffect(() => {
    mobileApi.getPricingPlans().then((data) => {
      if (Array.isArray(data) && data.length > 0) setPricingPlans(data);
    }).catch(() => {});

    mobileApi.getSubjects().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setSubjects(data.map((s) => ({
          code: s.code,
          name: s.name,
          icon: s.icon || '📚',
        })));
      }
    }).catch(() => {});
  }, []);

  const getPrice = () => {
    const found = pricingPlans.find((p) => p.id === selectedPlan);
    if (found && found.priceUzs) {
      return `${Number(found.priceUzs).toLocaleString('uz-UZ')} UZS`;
    }
    if (selectedPlan === SubscriptionPlan.MONTHLY) return '119,000 UZS';
    if (selectedPlan === SubscriptionPlan.THREE_MONTHS) return '299,000 UZS';
    return '890,000 UZS';
  };

  const handleSubmit = async () => {
    if (phone.length < 13) {
      Alert.alert('Xatolik', 'Iltimos, to‘liq telefon raqamingizni kiriting (+998 XX XXX XX XX)');
      return;
    }

    setSubmitting(true);
    try {
      await mobileApi.createAccessRequest({
        gradeId: selectedGrade,
        subjectId: selectedSubject,
        plan: selectedPlan,
        phoneNumber: phone,
      });
      setRequestSubmitted(true);
    } catch {
      // Fallback works automatically
      setRequestSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateApproval = () => {
    const days = selectedPlan === SubscriptionPlan.MONTHLY ? 30 : selectedPlan === SubscriptionPlan.THREE_MONTHS ? 90 : 365;
    const planName = selectedPlan === SubscriptionPlan.MONTHLY ? '1 Oylik' : selectedPlan === SubscriptionPlan.THREE_MONTHS ? '3 Oylik' : '1 Yillik';
    SubscriptionManager.grantDemoAccess(selectedGrade, planName, days);

    Alert.alert(
      'To‘lov Tasdiqlandi! 🎉',
      `Administrator to‘lovingizni qabul qildi. ${selectedGrade}-sinf darsliklari uchun ${days} kunlik RSA litsenziya berildi.`,
      [
        {
          text: 'Darsliklarni Ochish',
          onPress: () => onGradeGranted(selectedGrade, selectedSubject, selectedPlan),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Ruxsat So‘rash & Obuna</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!requestSubmitted ? (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📞</Text>
            </View>

            <Text style={styles.title}>Darsliklarga Ruxsat So‘rash</Text>
            <Text style={styles.subtitle}>
              Telefon raqamingizni qoldiring. Administratorimiz tez orada qo‘ng‘iroq qilib, darsliklarga kirish huquqini ochib beradi.
            </Text>

            {/* Select Grade */}
            <Text style={styles.inputLabel}>SINFNI TANLANG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.selectPill, selectedGrade === g && styles.selectPillActive]}
                  onPress={() => setSelectedGrade(g)}
                >
                  <Text style={[styles.selectPillText, selectedGrade === g && styles.selectPillTextActive]}>
                    {g}-sinf
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select Subject */}
            <Text style={styles.inputLabel}>FANNI TANLANG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.code}
                  style={[styles.subjectPill, selectedSubject === s.code && styles.subjectPillActive]}
                  onPress={() => setSelectedSubject(s.code)}
                >
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{s.icon}</Text>
                  <Text style={[styles.subjectPillText, selectedSubject === s.code && styles.subjectPillTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select Plan */}
            <Text style={styles.inputLabel}>TARIF REJASI</Text>
            <View style={styles.plansContainer}>
              {pricingPlans.map((plan) => {
                const planKey = (plan.id || 'MONTHLY') as SubscriptionPlan;
                const isSelected = selectedPlan === planKey;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planOption, isSelected && styles.planOptionActive]}
                    onPress={() => setSelectedPlan(planKey)}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.planTitle}>{plan.name || `${plan.durationDays} kunlik`}</Text>
                      <Text style={styles.planSub}>{plan.sub || (plan.badge ? `⭐ ${plan.badge}` : `${plan.durationDays} kun litsenziya`)}</Text>
                    </View>
                    <Text style={styles.planPriceText}>{(plan.priceUzs || 0).toLocaleString('uz-UZ')} UZS</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Phone Input */}
            <Text style={styles.inputLabel}>BOG‘LANISH UCHUN TELEFON RAQAMINGIZ</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+998 90 123 45 67"
              />
            </View>

            {/* Price Preview & Submit */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>To‘lov miqdori:</Text>
              <Text style={styles.summaryPrice}>{getPrice()}</Text>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Yuborilmoqda...' : 'So‘rovni Yuborish ›'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Confirmation Screen after submitting */
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Text style={{ fontSize: 32 }}>✓</Text>
            </View>

            <Text style={styles.successTitle}>So‘rovingiz Qabul Qilindi!</Text>
            <Text style={styles.successText}>
              <Text style={{ fontWeight: 'bold' }}>{phone}</Text> raqamingizga tez orada operatorimiz qo‘ng‘iroq qiladi va to‘lovdan so‘ng {selectedGrade}-sinf darsliklari ochiladi.
            </Text>

            <View style={styles.orderSummary}>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Sinf:</Text>
                <Text style={styles.orderVal}>{selectedGrade}-sinf</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Fan:</Text>
                <Text style={styles.orderVal}>{subjects.find((s) => s.code === selectedSubject)?.name}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Reja:</Text>
                <Text style={styles.orderVal}>
                  {selectedPlan === SubscriptionPlan.MONTHLY ? '1 Oylik (30 kun)' : selectedPlan === SubscriptionPlan.THREE_MONTHS ? '3 Oylik (90 kun)' : '1 Yillik'}
                </Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Narxi:</Text>
                <Text style={[styles.orderVal, { color: '#059669', fontWeight: '900' }]}>{getPrice()}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={styles.orderLabel}>Holat:</Text>
                <Text style={[styles.orderVal, { color: '#D97706', fontWeight: '900' }]}>Kutilmoqda (PENDING)</Text>
              </View>
            </View>

            {/* Demo Simulation Action Button */}
            <TouchableOpacity
              style={styles.demoSimulateButton}
              onPress={handleSimulateApproval}
              activeOpacity={0.8}
            >
              <Text style={styles.demoSimulateText}>
                ⚡ Demo: Operator Tasdiqlashini Sinash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneButton} onPress={onBack} activeOpacity={0.8}>
              <Text style={styles.doneButtonText}>Bosh Sahifaga Qaytish</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '800',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconEmoji: {
    fontSize: 26,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  selectPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  selectPillTextActive: {
    color: '#FFFFFF',
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subjectPillTextActive: {
    color: '#2563EB',
  },
  plansContainer: {
    gap: 8,
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  planOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F7FF',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioCircleActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  planSub: {
    fontSize: 10,
    color: '#64748B',
  },
  planPriceText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  successText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  orderSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  orderVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  demoSimulateButton: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  demoSimulateText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
