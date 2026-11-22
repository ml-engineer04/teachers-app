import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessRequest,
  AccessRequestStatus,
  Grade,
  SubscriptionPlan,
} from '@smartteacherbook/shared';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Send,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { webApi } from '../../services/api/webApi';
import { notify } from '../../utils/notify';
import {
  formatUzPhone,
  isValidUzPhone,
  UZ_PHONE_MAX_LENGTH,
  UZ_PHONE_PREFIX,
} from '../../utils/uzPhone';

function formatPriceUzs(amount?: number): string {
  const num = Number(amount || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const PlansAndRequestsView: React.FC = () => {
  const { t, strings, language, formatGrade, formatSubject } = useI18n();

  const [selectedGradeId, setSelectedGradeId] = useState<number>(5);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sub_eng');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SubscriptionPlan.THREE_MONTHS);
  const [phone, setPhone] = useState<string>(UZ_PHONE_PREFIX);
  const [note, setNote] = useState<string>('');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<AccessRequest[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<AccessRequest | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [gradesData, subjectsData, reqsData, subsData] = await Promise.all([
        webApi.getGrades().catch(() => []),
        webApi.getSubjects().catch(() => []),
        webApi.getMyRequests().catch(() => []),
        webApi.getMySubscriptions().catch(() => []),
      ]);

      const sortedGrades = (gradesData || []).sort((a, b) => a.gradeNumber - b.gradeNumber);
      setGrades(sortedGrades);
      setSubjects(subjectsData || []);
      setMyRequests(reqsData || []);
      setMySubscriptions(subsData || []);

      if (sortedGrades.length > 0 && !sortedGrades.some((g) => g.id === selectedGradeId)) {
        setSelectedGradeId(sortedGrades[0].id);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedGradeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch dynamic pricing when grade or subject changes
  useEffect(() => {
    webApi
      .getPricingPlans(selectedGradeId, selectedSubjectId)
      .then((plans) => {
        if (Array.isArray(plans) && plans.length > 0) {
          setPricingPlans(plans);
        }
      })
      .catch(() => {});
  }, [selectedGradeId, selectedSubjectId]);

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

  const selectedSubKey = canonicalSubjectKey(activeSubject?.code || activeSubject?.id || selectedSubjectId);

  // Duplicate checks
  const duplicatePendingRequest = myRequests.find((r) => {
    if (Number(r.gradeId) !== Number(selectedGradeId)) return false;
    const reqKey = canonicalSubjectKey((r as any).subjectId || r.subjectName);
    if (selectedSubKey && reqKey && reqKey !== selectedSubKey) return false;
    return (
      r.status === AccessRequestStatus.PENDING ||
      r.status === AccessRequestStatus.AWAITING_PAYMENT
    );
  });

  const duplicateApprovedSub = mySubscriptions.find((s) => {
    if (Number(s.gradeId) !== Number(selectedGradeId)) return false;
    if (s.isActive === false) return false;
    if (new Date(s.expiresAt).getTime() <= Date.now()) return false;
    const subKey = canonicalSubjectKey(s.subjectId);
    return !selectedSubKey || !subKey || subKey === selectedSubKey;
  });

  const activePlanObj = useMemo(() => {
    const found = pricingPlans.find((p) => p.id === selectedPlan);
    if (found) return found;
    return {
      id: selectedPlan,
      name:
        selectedPlan === SubscriptionPlan.YEARLY
          ? t('landing.pricingYearly')
          : selectedPlan === SubscriptionPlan.MONTHLY
          ? t('landing.pricingMonthly')
          : t('landing.pricingThreeMonths'),
      priceUzs:
        selectedPlan === SubscriptionPlan.YEARLY
          ? 712000
          : selectedPlan === SubscriptionPlan.MONTHLY
          ? 89000
          : 222000,
      durationDays:
        selectedPlan === SubscriptionPlan.YEARLY
          ? 365
          : selectedPlan === SubscriptionPlan.MONTHLY
          ? 30
          : 90,
    };
  }, [pricingPlans, selectedPlan, t]);

  const handlePhoneChange = (val: string) => {
    const formatted = formatUzPhone(val);
    setPhone(formatted.slice(0, UZ_PHONE_MAX_LENGTH));
  };

  const isPhoneValid = isValidUzPhone(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicatePendingRequest || duplicateApprovedSub) {
      notify.warning(
        'Uşbu sinf uçun faol yoki kutilayotgan sörov allaqaçon mavjud.',
        t('common.warning'),
      );
      return;
    }

    if (!isPhoneValid) {
      notify.warning(strings.requests.phoneError, t('common.warning'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await webApi.createAccessRequest({
        gradeId: selectedGradeId,
        subjectId: activeSubject?.id || selectedSubjectId,
        plan: selectedPlan,
        phoneNumber: phone.trim(),
      });

      setSubmittedSuccess(created);
      notify.success(strings.requests.submitSuccess, t('common.success'));
      const refreshed = await webApi.getMyRequests();
      setMyRequests(refreshed || []);
    } catch (err: any) {
      notify.error(err?.message || strings.common.unknownError, t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AccessRequestStatus) => {
    switch (status) {
      case AccessRequestStatus.PAID_APPROVED:
        return {
          label: strings.requests.statusApproved,
          bg: 'bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border-[#0F6E56]/30',
        };
      case AccessRequestStatus.REJECTED:
        return {
          label: strings.requests.statusRejected,
          bg: 'bg-[#FCEBEA] dark:bg-[#3A1B1D] text-[#B3322A] dark:text-[#F0857A] border-[#B3322A]/30',
        };
      default:
        return {
          label: strings.requests.statusPending,
          bg: 'bg-[#FDF3E1] dark:bg-[#3A2B10] text-[#8A5A0B] dark:text-[#F0B95B] border-[#8A5A0B]/30',
        };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';
      return `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
            {strings.requests.headerTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#7A8299] dark:text-[#8B93AD] mt-1">
            {strings.requests.headerSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] text-[#7A8299] dark:text-[#8B93AD] text-xs font-bold hover:bg-[#F0F3FB] dark:hover:bg-[#1C2236] hover:text-[#1B2238] dark:hover:text-[#E9ECF7] transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#7A8299] dark:text-[#8B93AD]" />
          <span>{strings.common.refresh}</span>
        </button>
      </div>

      {/* Active Subscriptions Banner */}
      {mySubscriptions.length > 0 && (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-[#2A4FB8] to-[#0E7C70] text-white shadow-[0_8px_24px_-4px_rgba(14,124,112,0.25)]">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-white/90" />
            <h3 className="font-extrabold text-base sm:text-lg">
              {strings.requests.activeSubscriptionsTitle} ({mySubscriptions.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySubscriptions.map((sub, i) => (
              <div
                key={sub.id || i}
                className="rounded-2xl p-4 bg-white/15 backdrop-blur-sm border border-white/25"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">{formatGrade(sub.gradeId)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1B2238]">
                    {strings.settings?.statusActive || 'Faol'}
                  </span>
                </div>
                <p className="text-xs opacity-90 truncate">
                  {sub.subjectName ? formatSubject(sub.subjectName, sub.subjectId) : t('common.allSubjects')}
                </p>
                {sub.expiresAt && (
                  <p className="text-[11px] opacity-75 mt-2">
                    {strings.settings?.expiresDate || 'Amal qiliş muddati'}: {formatDate(sub.expiresAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Request Form & Guide Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm">
          <h2 className="text-xl font-black text-[#1B2238] dark:text-[#E9ECF7] mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#2A4FB8] dark:text-[#4F72EE]" />
            <span>{strings.requests.newRequestTitle}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Grade Selector */}
            <div>
              <label className="block text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] uppercase tracking-wider mb-2">
                1. {strings.requests.gradeLabel}
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {grades.map((g) => {
                  const active = selectedGradeId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGradeId(g.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                        active
                          ? 'bg-[#2A4FB8] text-white border-transparent shadow-sm'
                          : 'bg-[#EEF1F8] dark:bg-[#10152A] text-[#7A8299] dark:text-[#8B93AD] border-[#E6E9F2] dark:border-[#262C42] hover:border-[#2A4FB8]/40 hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
                      }`}
                    >
                      {formatGrade(g.gradeNumber || g.id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Select Subject */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] uppercase tracking-wider">
                  2. {strings.requests.selectSubject || 'Fanni tanlang'}
                </label>
                <span className="text-[11px] text-[#1D3A8F] dark:text-[#B3C4FA] font-extrabold bg-[#E8EDFB] dark:bg-[#1E2A55] px-2.5 py-0.5 rounded-full border border-[#C9D6F5] dark:border-[#34478C]">
                  {strings.requests.singleSubjectOnly || 'Faqat bitta tanlangan fan uçun'}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
                {subjects.map((sub) => {
                  const active = selectedSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubjectId(sub.id)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 flex items-center gap-2 ${
                        active
                          ? 'bg-[#2A4FB8] text-white border-transparent shadow-md shadow-[#2A4FB8]/20 scale-[1.02]'
                          : 'bg-[#EEF1F8] dark:bg-[#10152A] text-[#7A8299] dark:text-[#8B93AD] border-[#E6E9F2] dark:border-[#262C42] hover:border-[#2A4FB8]/40 hover:text-[#1B2238] dark:hover:text-[#E9ECF7]'
                      }`}
                    >
                      <span className="text-sm">{sub.icon || '📘'}</span>
                      <span>{formatSubject(sub.name, sub.id)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] mt-1">
                {strings.requests.subjectNotice || 'Har bir fan uçun alohida obuna amal qiladi.'} {strings.requests.selectedSubjectPrompt || 'Siz tanlagan fan:'} <strong className="text-[#1B2238] dark:text-[#E9ECF7]">{formatGrade(selectedGradeId)} • {formatSubject(activeSubject?.name, activeSubject?.id)}</strong>
              </p>
            </div>

            {/* 3. Duration Plans (3 Cards) */}
            <div>
              <label className="block text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] uppercase tracking-wider mb-2">
                3. {strings.requests.planLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: SubscriptionPlan.MONTHLY,
                    label: t('landing.pricingMonthly'),
                    duration: '30 kun',
                    badge: '',
                    price: pricingPlans.find((p) => p.id === 'MONTHLY')?.priceUzs ?? 89000,
                  },
                  {
                    id: SubscriptionPlan.THREE_MONTHS,
                    label: t('landing.pricingThreeMonths'),
                    duration: '90 kun',
                    badge: t('landing.pricingPopularBadge'),
                    price: pricingPlans.find((p) => p.id === 'THREE_MONTHS')?.priceUzs ?? 222000,
                  },
                  {
                    id: SubscriptionPlan.YEARLY,
                    label: t('landing.pricingYearly'),
                    duration: '365 kun',
                    badge: t('landing.pricingBestValueBadge'),
                    price: pricingPlans.find((p) => p.id === 'YEARLY')?.priceUzs ?? 712000,
                  },
                ].map((plan) => {
                  const active = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${
                        active
                          ? 'border-[#2A4FB8] dark:border-[#4F72EE] bg-[#EEF2FD] dark:bg-[#182252] ring-2 ring-[#2A4FB8]/20 dark:ring-[#4F72EE]/20'
                          : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#FFFFFF] dark:bg-[#171C2E] hover:border-[#2A4FB8]/40'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-[#2A4FB8] to-[#0E7C70] text-white shadow-sm">
                          {plan.badge}
                        </span>
                      )}
                      <p className="text-xs font-black text-[#1B2238] dark:text-[#E9ECF7] mb-1">
                        {plan.label}
                      </p>
                      <p className="text-lg font-black text-[#2A4FB8] dark:text-[#8FA8F7]">
                        {formatPriceUzs(plan.price)} {t('common.currencySom')}
                      </p>
                      <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] mt-1">{plan.duration}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Phone Number & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] mb-1">
                  {strings.requests.phoneLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-[#7A8299] dark:text-[#8B93AD]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder={strings.requests.phonePlaceholder}
                    required
                    className="w-full h-11 pl-10 pr-9 text-sm font-mono font-bold rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/30 dark:focus:ring-[#4F72EE]/30 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5]"
                  />
                  {isPhoneValid && (
                    <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-[#0F6E56] dark:text-[#5FD1AC]" />
                  )}
                </div>
                <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {strings.requests.phoneHint || 'Tölovni tasdiqlaş uçun amaldagi Özbekiston telefon raqamingiz'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] mb-1">
                  {strings.requests.noteLabel}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={strings.requests.notePlaceholder}
                  className="w-full h-11 px-3.5 text-sm rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42] text-[#1B2238] dark:text-[#E9ECF7] focus:outline-none focus:ring-2 focus:ring-[#2A4FB8]/30 dark:focus:ring-[#4F72EE]/30 focus:border-[#2A4FB8] dark:focus:border-[#4F72EE] transition-all placeholder:text-[#9AA1B5]"
                />
                <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] mt-1">
                  {strings.requests.noteHint || 'Ixtiyoriy: tölov çeki yoki qöşimça izoh'}
                </p>
              </div>
            </div>

            {/* Duplicate Protection Warning */}
            {(duplicatePendingRequest || duplicateApprovedSub) && (
              <div className="p-4 rounded-2xl bg-[#FDF3E1] dark:bg-[#3A2B10] border border-[#8A5A0B]/30 dark:border-[#F0B95B]/30 flex items-start gap-3 text-xs text-[#8A5A0B] dark:text-[#F0B95B]">
                <AlertTriangle className="w-5 h-5 shrink-0 text-[#8A5A0B] dark:text-[#F0B95B] mt-0.5" />
                <div>
                  <p className="font-bold">
                    {duplicateApprovedSub
                      ? (strings.requests.activeSubscriptionNotice || 'Sizda uşbu fan uçun faol obuna mavjud!')
                      : (strings.requests.pendingRequestNotice || 'Uşbu fan uçun tasdiqlanişi kutilayotgan sörov yuborilgan.')}
                  </p>
                  <p className="mt-0.5 opacity-90">
                    {strings.requests.noDuplicateNeeded || 'Takroriy sörov yuboriş talab etilmaydi. Administrator tölovni tasdiqlaşi bilan kitoblaringiz oçiladi.'}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="text-xs">
                <span className="text-[#7A8299] dark:text-[#8B93AD]">{strings.common?.totalPrice || 'Jami narx'}: </span>
                <span className="font-black text-lg text-[#1B2238] dark:text-[#E9ECF7]">
                  {formatPriceUzs(activePlanObj.priceUzs)} {t('common.currencySom')}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || !isPhoneValid || !!duplicatePendingRequest || !!duplicateApprovedSub}
                className="px-8 py-3.5 rounded-2xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-sm shadow-md shadow-[#2A4FB8]/25 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{strings.requests.submitBtn}</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info & Telegram Support (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl p-6 sm:p-7 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-[#2A4FB8] dark:text-[#8FA8F7] font-extrabold text-sm">
              <Info className="w-4 h-4" />
              <span>{strings.requests.paymentBoxTitle}</span>
            </div>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] leading-relaxed">
              {strings.requests.paymentBoxBody}
            </p>

            <div className="pt-2 border-t border-[#E6E9F2] dark:border-[#262C42]">
              <p className="text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] mb-2">
                {strings.requests.helpTitle || 'Savollaringiz bormi yoki tezkor tasdiqlaş kerakmi?'}
              </p>
              <a
                href="https://t.me/ilmchi_support"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] hover:bg-[#C9D6F5] dark:hover:bg-[#34478C] text-[#1D3A8F] dark:text-[#B3C4FA] border border-[#C9D6F5] dark:border-[#34478C] text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{strings.requests.telegramBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Requests History List */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-[#1B2238] dark:text-[#E9ECF7] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#2A4FB8] dark:text-[#4F72EE]" />
            <span>{strings.requests.historyTitle}</span>
          </h3>
          <span className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD]">
            {t('requests.requestsCount', { count: myRequests.length }) || `${myRequests.length} ta sörov`}
          </span>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7A8299] dark:text-[#8B93AD]">
            {strings.requests.noHistory}
          </div>
        ) : (
          <div className="divide-y divide-[#E6E9F2] dark:divide-[#262C42]">
            {myRequests.map((req) => {
              const meta = getStatusBadge(req.status);
              return (
                <div
                  key={req.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F0F3FB] dark:hover:bg-[#1C2236] transition-colors rounded-xl px-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#1B2238] dark:text-[#E9ECF7]">
                        {formatGrade(req.gradeId)}
                      </span>
                      {req.subjectName && (
                        <span className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD]">
                          • {formatSubject(req.subjectName, req.subjectId)}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.bg}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#7A8299] dark:text-[#8B93AD]">
                      <span>Tel: {req.phoneNumber}</span>
                      <span>•</span>
                      <span>{formatDate(req.createdAt)}</span>
                    </div>

                    {req.internalNote && (
                      <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] italic">
                        Izoh: {req.internalNote}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-[#1B2238] dark:text-[#E9ECF7]">
                      {formatPriceUzs(req.priceUzs)} {t('common.currencySom')}
                    </p>
                    <p className="text-[11px] text-[#7A8299] dark:text-[#8B93AD] capitalize">
                      {req.plan.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
