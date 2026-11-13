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
  const [scopeType, setScopeType] = useState<'ALL_GRADE' | 'SINGLE_SUBJECT'>('ALL_GRADE');
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
    const subjectParam = scopeType === 'SINGLE_SUBJECT' ? selectedSubjectId : undefined;
    webApi
      .getPricingPlans(selectedGradeId, subjectParam)
      .then((plans) => {
        if (Array.isArray(plans) && plans.length > 0) {
          setPricingPlans(plans);
        }
      })
      .catch(() => {});
  }, [selectedGradeId, selectedSubjectId, scopeType]);

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

  const selectedSubKey =
    scopeType === 'SINGLE_SUBJECT'
      ? canonicalSubjectKey(activeSubject?.code || activeSubject?.id || selectedSubjectId)
      : null;

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
        'Ushbu sinf uchun faol yoki kutilayotgan so‘rov allaqachon mavjud.',
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
        subjectId: scopeType === 'SINGLE_SUBJECT' && activeSubject?.id ? activeSubject.id : undefined,
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
          bg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case AccessRequestStatus.REJECTED:
        return {
          label: strings.requests.statusRejected,
          bg: 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        };
      default:
        return {
          label: strings.requests.statusPending,
          bg: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {strings.requests.headerTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {strings.requests.headerSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#1A243E] transition-all flex items-center gap-2 shadow-soft"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>{strings.common.refresh}</span>
        </button>
      </div>

      {/* Active Subscriptions Banner */}
      {mySubscriptions.length > 0 && (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-200" />
            <h3 className="font-extrabold text-base sm:text-lg">
              {strings.requests.activeSubscriptionsTitle} ({mySubscriptions.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySubscriptions.map((sub, i) => (
              <div
                key={sub.id || i}
                className="rounded-2xl p-4 bg-white/10 backdrop-blur-sm border border-white/20"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">{formatGrade(sub.gradeId)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400 text-slate-900">
                    Faol
                  </span>
                </div>
                <p className="text-xs opacity-90 truncate">
                  {sub.subjectName ? formatSubject(sub.subjectName, sub.subjectId) : 'Barcha fanlar'}
                </p>
                {sub.expiresAt && (
                  <p className="text-[11px] opacity-75 mt-2">
                    Amal qilish muddati: {formatDate(sub.expiresAt)}
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
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft">
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{strings.requests.newRequestTitle}</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Grade Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-[#19233C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#2D3B5C] hover:border-indigo-300'
                      }`}
                    >
                      {formatGrade(g.gradeNumber || g.id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Access Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                2. {strings.requests.scopeLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setScopeType('ALL_GRADE')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    scopeType === 'ALL_GRADE'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-[#2D3B5C] bg-slate-50 dark:bg-[#19233C] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-extrabold">{strings.requests.scopeAllGrade}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    1–11-sinfning barcha darslik va metodikalariga to‘liq kirish
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScopeType('SINGLE_SUBJECT')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    scopeType === 'SINGLE_SUBJECT'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-[#2D3B5C] bg-slate-50 dark:bg-[#19233C] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="text-xs font-extrabold">{strings.requests.scopeSingleSubject}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Faqat o‘zingiz dars beradigan muayyan bitta fan uchun
                  </p>
                </button>
              </div>

              {scopeType === 'SINGLE_SUBJECT' && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
                  {subjects.map((sub) => {
                    const active = selectedSubjectId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubjectId(sub.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-[#19233C] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#2D3B5C]'
                        }`}
                      >
                        <span>{sub.icon || '📘'}</span>
                        <span>{formatSubject(sub.name, sub.id)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Duration Plans (3 Cards) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
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
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-[#2D3B5C] bg-slate-50 dark:bg-[#19233C]'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          {plan.badge}
                        </span>
                      )}
                      <p className="text-xs font-black text-slate-900 dark:text-white mb-1">
                        {plan.label}
                      </p>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {formatPriceUzs(plan.price)} {t('common.currencySom')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">{plan.duration}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Phone Number & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.requests.phoneLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder={strings.requests.phonePlaceholder}
                    required
                    className="w-full h-11 pl-10 pr-9 text-sm font-mono font-bold rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                  />
                  {isPhoneValid && (
                    <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  To‘lovni tasdiqlash uchun amaldagi O‘zbekiston telefon raqamingiz
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.requests.noteLabel}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={strings.requests.notePlaceholder}
                  className="w-full h-11 px-3.5 text-sm rounded-xl bg-slate-50 dark:bg-[#19233C] border border-slate-200 dark:border-[#2D3B5C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ixtiyoriy: to‘lov cheki yoki qo‘shimcha izoh
                </p>
              </div>
            </div>

            {/* Duplicate Protection Warning */}
            {(duplicatePendingRequest || duplicateApprovedSub) && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {duplicateApprovedSub
                      ? 'Sizda ushbu sinf uchun faol obuna mavjud!'
                      : 'Ushbu sinf uchun tasdiqlanishi kutilayotgan so‘rov yuborilgan.'}
                  </p>
                  <p className="mt-0.5 opacity-90">
                    Takroriy so‘rov yuborish talab etilmaydi. Administrator to‘lovni tasdiqlashi bilan kitoblaringiz ochiladi.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="text-xs">
                <span className="text-slate-400">Jami narx: </span>
                <span className="font-black text-lg text-slate-900 dark:text-white">
                  {formatPriceUzs(activePlanObj.priceUzs)} {t('common.currencySom')}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || !isPhoneValid || !!duplicatePendingRequest || !!duplicateApprovedSub}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-glow active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
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
          <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
              <Info className="w-4 h-4" />
              <span>{strings.requests.paymentBoxTitle}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {strings.requests.paymentBoxBody}
            </p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Savollaringiz bormi yoki tezkor tasdiqlash kerakmi?
              </p>
              <a
                href="https://t.me/ilmchi_support"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{strings.requests.telegramBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Requests History List */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{strings.requests.historyTitle}</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {myRequests.length} ta so‘rov
          </span>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {strings.requests.noHistory}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {myRequests.map((req) => {
              const meta = getStatusBadge(req.status);
              return (
                <div
                  key={req.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {formatGrade(req.gradeId)}
                      </span>
                      {req.subjectName && (
                        <span className="text-xs font-bold text-slate-500">
                          • {formatSubject(req.subjectName, req.subjectId)}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.bg}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>Tel: {req.phoneNumber}</span>
                      <span>•</span>
                      <span>{formatDate(req.createdAt)}</span>
                    </div>

                    {req.internalNote && (
                      <p className="text-[11px] text-slate-400 italic">
                        Izoh: {req.internalNote}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {formatPriceUzs(req.priceUzs)} {t('common.currencySom')}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">
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
