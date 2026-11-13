import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  AccessRequest,
  AccessRequestStatus,
  Grade,
  SubscriptionPlan,
} from '@smartteacherbook/shared';
import { DS } from '../theme/designSystem';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import { mobileApi } from '../services/api/mobileApi';
import { SubscriptionManager } from '../services/subscription/subscriptionManager';
import { OfflineScreen } from '../components/common/OfflineScreen';
import { notify } from '../services/notifications/notificationService';
import { offlineCatalogCache } from '../services/storage/offlineCatalogCache';
import {
  formatUzPhone,
  isValidUzPhone,
  UZ_PHONE_MAX_LENGTH,
  UZ_PHONE_PREFIX,
} from '../utils/uzPhone';

interface RequestsScreenProps {
  selectedGrade?: number;
  selectedSubjectCode?: string;
  initialPlan?: 'MONTHLY' | 'THREE_MONTHS' | 'YEARLY';
  onBack?: () => void;
  onRequestSubmittedAndApproved?: () => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  selectedGrade = 4,
  selectedSubjectCode,
  initialPlan = 'THREE_MONTHS',
  onBack,
  onRequestSubmittedAndApproved,
}) => {
  const { colors } = useTheme();
  const { language, strings, t, formatGrade, formatSubject } = useI18n();

  const [grade, setGrade] = useState<number>(selectedGrade);
  const [availableGrades, setAvailableGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sub_eng');
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    (SubscriptionPlan as any)[initialPlan] || SubscriptionPlan.THREE_MONTHS,
  );
  const [phone, setPhone] = useState<string>(UZ_PHONE_PREFIX);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [activeSubs, setActiveSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const [submittedInfo, setSubmittedInfo] = useState<{
    grade: number;
    subjectName: string;
    planName: string;
    priceUzs: number;
    phone: string;
  } | null>(null);

  useEffect(() => {
    setGrade(selectedGrade);
  }, [selectedGrade]);

  useEffect(() => {
    if (initialPlan && (SubscriptionPlan as any)[initialPlan]) {
      setSelectedPlan((SubscriptionPlan as any)[initialPlan]);
    }
  }, [initialPlan]);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const online = await mobileApi.checkConnectivity();
        if (!online) {
          setIsOffline(true);
          if (!silent) setLoading(false);
          return;
        }
        setIsOffline(false);

        const [gradesData, subList, myReqs] = await Promise.all([
          mobileApi.getGrades(),
          mobileApi.getSubjects(),
          mobileApi.getMyRequests(),
        ]);

        if (Array.isArray(gradesData)) {
          const sortedGrades = [...gradesData].sort((a, b) => a.gradeNumber - b.gradeNumber);
          setAvailableGrades(sortedGrades);
          offlineCatalogCache.saveGrades(sortedGrades);
          if (sortedGrades.length > 0 && !sortedGrades.some((g) => g.gradeNumber === grade)) {
            setGrade(sortedGrades[0].gradeNumber);
          }
        }

        setSubjects(subList);
        offlineCatalogCache.saveSubjects(subList);
        setRequests(myReqs || []);

        if (subList.length > 0) {
          if (selectedSubjectCode) {
            const match = subList.find(
              (s) =>
                s.code?.toUpperCase() === selectedSubjectCode.toUpperCase() ||
                s.id === selectedSubjectCode,
            );
            if (match) {
              setSelectedSubjectId(match.id);
            } else {
              setSelectedSubjectId(subList[0].id);
            }
          } else {
            setSelectedSubjectId((prev) =>
              subList.some((s) => s.id === prev) ? prev : subList[0].id,
            );
          }
        }

        const syncedSubs = await SubscriptionManager.syncFromBackend();
        setActiveSubs(syncedSubs.filter((a) => SubscriptionManager.isAccessValid(a)));
        if (myReqs?.some((r) => r.status === AccessRequestStatus.PAID_APPROVED)) {
          onRequestSubmittedAndApproved?.();
        }
      } catch (err: any) {
        if (err?.isNetworkError) {
          setIsOffline(true);
          notify.warning(strings.modals.offlineTitle, strings.modals.offlineDesc);
        } else {
          notify.error(strings.common.error, err?.message || strings.common.unknownError);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      selectedSubjectCode,
      onRequestSubmittedAndApproved,
      grade,
      strings.modals.offlineTitle,
      strings.modals.offlineDesc,
      strings.common.error,
      strings.common.unknownError,
    ],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    mobileApi
      .getPricingPlans(grade, selectedSubjectId || undefined)
      .then((planList) => {
        if (Array.isArray(planList) && planList.length > 0) {
          setPlans(planList);
        }
      })
      .catch(() => {});
    setRefreshing(false);
  }, [loadData, grade, selectedSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    mobileApi
      .getPricingPlans(grade, selectedSubjectId || undefined)
      .then((planList) => {
        if (Array.isArray(planList) && planList.length > 0) {
          setPlans(planList);
        }
      })
      .catch(() => {});
  }, [grade, selectedSubjectId]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const canonicalSubjectKey = (val?: string | null) =>
    (val || '')
      .trim()
      .toLowerCase()
      .replace(/^sub_/, '')
      .replace(/^english$/, 'eng')
      .replace(/^matematika$/, 'math')
      .replace(/^physics$/, 'phys')
      .replace(/^fizika$/, 'phys')
      .replace(/^ona tili$/, 'uzb');

  const selectedSubKey = canonicalSubjectKey(
    activeSubject?.code || activeSubject?.id || selectedSubjectId,
  );

  const duplicateRequest = requests.find((r) => {
    if (Number(r.gradeId) !== Number(grade)) return false;
    const reqKey = canonicalSubjectKey((r as any).subjectId || r.subjectName);
    if (selectedSubKey && reqKey && reqKey !== selectedSubKey) return false;
    return (
      r.status === AccessRequestStatus.PENDING ||
      r.status === AccessRequestStatus.AWAITING_PAYMENT ||
      r.status === AccessRequestStatus.PAID_APPROVED
    );
  });

  const duplicateActiveSub = activeSubs.find((s) => {
    if (Number(s.gradeId) !== Number(grade)) return false;
    const subKey = canonicalSubjectKey(s.subjectId);
    return !selectedSubKey || !subKey || subKey === selectedSubKey;
  });

  const localizedSubjectName = formatSubject(activeSubject?.name, activeSubject?.id);

  const duplicateBlockReason = duplicateActiveSub
    ? `${formatGrade(grade)} (${localizedSubjectName}) — ${strings.common.active}`
    : duplicateRequest
    ? duplicateRequest.status === AccessRequestStatus.PAID_APPROVED
      ? `${formatGrade(grade)} (${localizedSubjectName}) — ${strings.requests.statusApproved}`
      : `${formatGrade(grade)} (${localizedSubjectName}) — ${strings.requests.statusPending}`
    : null;

  const getPlanShortLabel = (planId: string) => {
    if (planId === 'MONTHLY') return t('common.months', { n: 1 });
    if (planId === 'THREE_MONTHS') return t('common.months', { n: 3 });
    if (planId === 'YEARLY') return t('common.months', { n: 12 });
    return planId;
  };

  const activePlanObj = plans.find((p) => p.id === selectedPlan) || {
    id: selectedPlan,
    name: getPlanShortLabel(selectedPlan),
    priceUzs: selectedPlan === 'YEARLY' ? 890000 : selectedPlan === 'MONTHLY' ? 119000 : 299000,
    durationDays: selectedPlan === 'YEARLY' ? 365 : selectedPlan === 'MONTHLY' ? 30 : 90,
  };

  const handleSubmit = async () => {
    if (duplicateBlockReason) {
      notify.warning(strings.common.warning, duplicateBlockReason);
      return;
    }

    const formattedPhone = formatUzPhone(phone);
    if (!isValidUzPhone(formattedPhone)) {
      notify.warning(strings.common.warning, strings.requests.phoneError);
      return;
    }

    setSubmitting(true);
    try {
      const created = await mobileApi.createAccessRequest({
        gradeId: grade,
        subjectId: activeSubject?.id || selectedSubjectId,
        plan: selectedPlan,
        phoneNumber: formattedPhone.trim(),
      });

      const refreshed = await mobileApi.getMyRequests();
      setRequests(refreshed || []);

      notify.success(strings.common.success, strings.requests.submitSuccess);
      setSubmittedInfo({
        grade,
        subjectName: formatSubject(created.subjectName || activeSubject?.name, activeSubject?.id),
        planName: getPlanShortLabel(selectedPlan),
        priceUzs: created.priceUzs || activePlanObj.priceUzs,
        phone: formattedPhone.trim(),
      });
    } catch (err: any) {
      if (err?.isNetworkError) {
        setIsOffline(true);
        notify.error(strings.modals.offlineTitle, strings.modals.offlineDesc);
      } else {
        notify.error(strings.common.error, err?.message || strings.common.unknownError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusMeta = (status: AccessRequestStatus) => {
    switch (status) {
      case AccessRequestStatus.PAID_APPROVED:
        return {
          label: `${strings.requests.statusApproved} ✅`,
          bg: colors.accentSoft,
          text: colors.accent,
        };
      case AccessRequestStatus.AWAITING_PAYMENT:
        return {
          label: strings.requests.statusPending,
          bg: colors.primarySoft,
          text: colors.primaryText,
        };
      case AccessRequestStatus.REJECTED:
        return {
          label: strings.requests.statusRejected,
          bg: colors.dangerSoft,
          text: colors.danger,
        };
      case AccessRequestStatus.EXPIRED:
        return {
          label: strings.modals.expiredTitle,
          bg: colors.surfaceAlt,
          text: colors.textMuted,
        };
      default:
        return {
          label: strings.requests.statusPending,
          bg: colors.warningSoft,
          text: colors.warning,
        };
    }
  };

  const localeTag = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';

  if (isOffline) {
    return <OfflineScreen onRetry={loadData} onContinueOffline={onBack} retrying={loading} />;
  }

  if (submittedInfo) {
    return (
      <View style={[styles.successScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.successHalo, { backgroundColor: colors.accentSoft }]}>
          <View style={[styles.successCircle, { backgroundColor: colors.accent }]}>
            <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 13l4 4L19 7"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </View>

        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
          {strings.requests.submitSuccess}
        </Text>
        <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
          {strings.requests.paymentBoxBody} ({submittedInfo.phone})
        </Text>

        <View
          style={[
            styles.summaryPillCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.summaryTop, { color: colors.textPrimary }]}>
            {formatGrade(submittedInfo.grade)} • {submittedInfo.subjectName}
          </Text>
          <Text style={[styles.summaryBottom, { color: colors.primaryText }]}>
            {submittedInfo.planName} • {submittedInfo.priceUzs.toLocaleString()}{' '}
            {strings.common.currencySom}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.successPrimaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setSubmittedInfo(null);
            if (onBack) onBack();
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.successPrimaryBtnText, { color: colors.onPrimary }]}>
            {strings.nav.home}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.successSecondaryBtn}
          onPress={() => {
            setSubmittedInfo(null);
            loadData();
          }}
          activeOpacity={0.75}
        >
          <Text style={[styles.successSecondaryBtnText, { color: colors.primaryText }]}>
            {strings.requests.historyTitle}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.headerLeft, { flex: 1 }]}>
          {onBack && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={onBack}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.textPrimary}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {strings.requests.headerTitle}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {strings.requests.headerSubtitle}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Step 1: Active Grades */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          1. {strings.requests.gradeLabel}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeStrip}
        >
          {availableGrades.length === 0 && !loading ? (
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{strings.common.noData}</Text>
          ) : (
            (availableGrades.length > 0
              ? availableGrades.map((g) => g.gradeNumber)
              : [grade]
            ).map((g) => {
              const active = grade === g;
              return (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.gradePill,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setGrade(g)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.gradePillText,
                      { color: active ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {formatGrade(g)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Step 2: Subjects */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          2. {strings.requests.subjectLabel}
        </Text>
        <View style={styles.subjectGrid}>
          {subjects.map((sub) => {
            const active = sub.id === selectedSubjectId;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[
                  styles.subjectChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedSubjectId(sub.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.subjectIcon}>{sub.icon || '📘'}</Text>
                <Text
                  style={[
                    styles.subjectName,
                    { color: active ? colors.primaryText : colors.textSecondary },
                  ]}
                >
                  {formatSubject(sub.name, sub.id)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 3: Pricing Plans */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          3. {strings.requests.planLabel}
        </Text>
        <View style={styles.planList}>
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isSelected ? colors.primarySoft : colors.cardBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.85}
              >
                <View style={styles.planLeft}>
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? colors.primary : colors.textMuted },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planTitleRow}>
                      <Text style={[styles.planTitle, { color: colors.textPrimary }]}>
                        {getPlanShortLabel(plan.id)}
                      </Text>
                    </View>
                    <Text style={[styles.planDesc, { color: colors.textSecondary }]}>
                      {plan.durationDays || 30} d.
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.planPrice,
                    { color: isSelected ? colors.primaryText : colors.textPrimary },
                  ]}
                >
                  {Number(plan.priceUzs || 0).toLocaleString()} {strings.common.currencySom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 4: Phone Input */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          4. {strings.requests.phoneLabel}
        </Text>
        <View
          style={[
            styles.phoneCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[
              styles.phoneInput,
              {
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={phone}
            onChangeText={(text) => setPhone(formatUzPhone(text))}
            placeholder={strings.requests.phonePlaceholder}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            maxLength={UZ_PHONE_MAX_LENGTH}
          />
          <Text style={[styles.phoneHint, { color: colors.textMuted }]}>
            {strings.requests.paymentBoxBody}
          </Text>
        </View>

        {duplicateBlockReason && (
          <View
            style={{
              backgroundColor: colors.warningSoft,
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '700' }}>
              ⚠️ {duplicateBlockReason}
            </Text>
          </View>
        )}

        {/* Submit CTA */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            (submitting || Boolean(duplicateBlockReason)) && { opacity: 0.55 },
          ]}
          onPress={handleSubmit}
          disabled={submitting || Boolean(duplicateBlockReason)}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.submitBtnText, { color: colors.onPrimary }]}>
              {duplicateBlockReason
                ? duplicateBlockReason
                : `${strings.requests.submitBtn} • ${Number(activePlanObj.priceUzs || 0).toLocaleString()} ${strings.common.currencySom}`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Requests History */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
            {strings.requests.historyTitle}
          </Text>
          <Text
            style={[
              styles.historyCount,
              { color: colors.primaryText, backgroundColor: colors.primarySoft },
            ]}
          >
            {requests.length}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : requests.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {strings.requests.noHistory}
            </Text>
          </View>
        ) : (
          requests.map((req) => {
            const st = getStatusMeta(req.status);
            return (
              <View
                key={req.id}
                style={[
                  styles.historyCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.border },
                ]}
              >
                <View style={styles.historyTop}>
                  <Text style={[styles.historyItemTitle, { color: colors.textPrimary }]}>
                    {formatGrade(req.gradeId)} •{' '}
                    {formatSubject(req.subjectName, (req as any).subjectId)}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.historyMetaRow}>
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {getPlanShortLabel(req.plan)} • {Number(req.priceUzs || 0).toLocaleString()}{' '}
                    {strings.common.currencySom}
                  </Text>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                    {new Date(req.createdAt).toLocaleDateString(localeTag)}
                  </Text>
                </View>
                {!!req.internalNote && (
                  <Text
                    style={[
                      styles.historyNote,
                      {
                        color: colors.textSecondary,
                        backgroundColor: colors.backgroundSecondary,
                      },
                    ]}
                  >
                    {strings.requests.adminCommentLabel} {req.internalNote}
                  </Text>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 12,
  },
  gradeStrip: {
    gap: 8,
    paddingBottom: 4,
  },
  gradePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  gradePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectIcon: {
    fontSize: 15,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
  },
  planList: {
    gap: 10,
  },
  planCard: {
    borderRadius: DS.radius.md,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  planLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  planDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  phoneCard: {
    borderRadius: DS.radius.md,
    padding: 14,
    borderWidth: 1,
  },
  phoneInput: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  phoneHint: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: 18,
    borderRadius: DS.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  historyCount: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  emptyBox: {
    borderRadius: DS.radius.md,
    padding: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  historyCard: {
    borderRadius: DS.radius.md,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  historyMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
  },
  historyNote: {
    fontSize: 12,
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
  },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successHalo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 20,
  },
  summaryPillCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: DS.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryTop: {
    fontSize: 15,
    fontWeight: '800',
  },
  summaryBottom: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  successPrimaryBtn: {
    width: '100%',
    maxWidth: 320,
    borderRadius: DS.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  successSecondaryBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  successSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
