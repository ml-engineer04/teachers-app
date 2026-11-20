import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Subscription } from '@smartteacherbook/shared';
import {
  User,
  Shield,
  Smartphone,
  Laptop,
  Monitor,
  Moon,
  Sun,
  Globe,
  Lock,
  KeyRound,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  X,
  Check,
  Clock,
  Sparkles,
  CreditCard,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { webApi } from '../../services/api/webApi';
import { webStorage } from '../../services/storage/webStorage';
import { notify } from '../../utils/notify';
import { hashPinCode } from '../../utils/cryptoPin';

interface ActiveDevice {
  id: string;
  deviceId: string;
  deviceModel: string;
  osVersion: string;
  platform: string;
  lastActiveAt?: string;
  isCurrent?: boolean;
}

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage, strings, formatGrade } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const { user, refreshProfile, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  const currentUser = user?.user || user;

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState(currentUser?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscriptions & Tariffs State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Devices State
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceToDisconnect, setDeviceToDisconnect] = useState<ActiveDevice | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // PIN Code State
  const [hasPin, setHasPin] = useState<boolean>(() => Boolean(webStorage.getPinHash()));
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Logout Confirmation State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

  // Fetch Subscriptions
  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const [subs, subsList] = await Promise.all([
        webApi.getMySubscriptions().catch(() => []),
        webApi.getSubjects().catch(() => []),
      ]);
      setSubscriptions(subs || []);
      setSubjects(subsList || []);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Fetch Active Devices
  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await webApi.getMyDevices();
      const list = (res as any)?.devices || (Array.isArray(res) ? res : []);
      setDevices(list);
    } catch {
      // Fallback
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    if (currentUser?.fullName) {
      setFullNameDraft(currentUser.fullName);
    }
  }, [currentUser]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameDraft.trim()) {
      notify.warning(t("settings.nameRequired") || "Ism familiyani kiriting");
      return;
    }
    setSavingProfile(true);
    try {
      await webApi.updateProfile(fullNameDraft.trim());
      await refreshProfile();
      notify.success(t("settings.profileSaved") || "Profil ma’lumotlari muvaffaqiyatli saqlandi!");
      setIsEditingProfile(false);
    } catch (err: any) {
      notify.error(err?.message || t("settings.profileUpdateError") || "Profilni yangilaşda xatolik yuz berdi");
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Disconnect Device
  const handleConfirmDisconnect = async () => {
    if (!deviceToDisconnect) return;
    setDisconnecting(true);
    try {
      await webApi.disconnectDevice(deviceToDisconnect.deviceId || deviceToDisconnect.id);
      notify.success(t("settings.disconnectSuccess") || "Qurilma muvaffaqiyatli uzildi.");
      setDeviceToDisconnect(null);
      await fetchDevices();
    } catch (err: any) {
      notify.error(err?.message || t("settings.disconnectError") || "Qurilmani uzişda xatolik yuz berdi");
    } finally {
      setDisconnecting(false);
    }
  };

  // Handle PIN Save
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError(t("settings.pinDigitsError") || "PIN kod 4 ta raqamdan iborat bölişi kerak.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t("settings.pinMismatchError") || "Kiritilgan PIN kodlar bir-biriga mos kelmadi.");
      return;
    }

    const hashed = await hashPinCode(newPin);
    webStorage.savePinHash(hashed);
    setHasPin(true);
    setIsPinModalOpen(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    notify.success(t("settings.pinSuccessToast") || "SmartBoard uçun 4 xonali PIN kod örnatildi!");
  };

  const handleRemovePin = () => {
    webStorage.clearPinHash();
    setHasPin(false);
    notify.info(t("settings.pinRemovedToast") || "PIN kod olib taşlandi.");
  };

  const formatDeviceTime = (isoString?: string) => {
    if (!isoString) return strings.settings?.recentlyActive || 'Yaqinda faol';
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-5xl pb-16">
      {/* =========================================================================
          Header
      ========================================================================= */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {strings.settings?.headerTitle || 'Sozlamalar'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {strings.settings?.headerSubtitle || 'Profil, köriniş, til va 2 ta qurilma xavfsizligi'}
        </p>
      </div>

      {/* =========================================================================
          1. Personal Profile Card
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/20">
              {(currentUser?.fullName || currentUser?.email || 'O')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {currentUser?.fullName || strings.settings?.noNameProvided || 'Ism kiritilmagan'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  {strings.settings?.verifiedTeacher || 'Tasdiqlangan öqituvçi'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors self-start sm:self-auto"
          >
            <Edit3 className="w-4 h-4" />
            <span>{strings.settings?.editProfileBtn || 'Profilni tahrirlaş'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {strings.settings?.emailLabel || 'Elektron poçta'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all">
              {currentUser?.email || '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {strings.settings?.phoneLabel || 'Telefon raqami'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {currentUser?.phoneNumber || '+998 ••••••••'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {strings.settings?.accountTypeLabel || 'Hisob turi'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ilmçi Pro
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Active Tariffs & Subscriptions (Ulangan Tariflar va Obunalar)
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {strings.settings?.subscriptionsTitle || 'Ulangan tariflar va obunalar'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {t('settings.subscriptionsCount', { count: subscriptions.length }) || `${subscriptions.length} ta obuna`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {strings.settings?.subscriptionsDesc || 'Siz faollashtirgan fanlar, ularning amal qiliş muddati va qolgan vaqt'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSubscriptions}
            disabled={loadingSubscriptions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSubscriptions ? 'animate-spin' : ''}`} />
            <span>{strings.settings?.refreshBtn || 'Yangilaş'}</span>
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              {strings.settings?.noSubscriptions || 'Hozirça sizda faol ulangan tariflar mavjud emas.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/plans')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all inline-flex items-center gap-1.5"
            >
              <span>{strings.settings?.goToPlansBtn || 'Tariflar bölimiga ötiş va ulaniş'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => {
              const subj = subjects.find((s) => s.id === sub.subjectId || s.code === sub.subjectId);
              const now = Date.now();
              const expTime = new Date(sub.expiresAt).getTime();
              const isExpired = !isNaN(expTime) && expTime < now;
              const daysLeft = isNaN(expTime) ? 0 : Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
              const isExpiringSoon = !isExpired && daysLeft <= 3 && daysLeft >= 0;

              const planTitle =
                sub.plan === 'YEARLY'
                  ? strings.settings?.planYearly || '1 Yillik Obuna'
                  : sub.plan === 'THREE_MONTHS'
                  ? strings.settings?.planThreeMonths || '3 Oylik Obuna'
                  : strings.settings?.planMonthly || '1 Oylik Obuna';

              return (
                <div
                  key={sub.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isExpiringSoon
                      ? 'bg-amber-500/5 border-amber-300 dark:border-amber-600/60 ring-1 ring-amber-500/30'
                      : isExpired
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 opacity-80'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{subj?.icon || '📘'}</span>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {formatGrade(sub.gradeId)} • {subj?.name || sub.subjectId || 'Fan darsligi'}
                        </h4>
                      </div>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                        {planTitle}
                      </p>
                    </div>

                    {isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                        Tugagan
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/50 animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Tugamoqda
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Faol
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{strings.settings?.startDate || 'Boşlangan sana'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString('uz-UZ') : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{strings.settings?.expiresDate || 'Amal qiliş muddati'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('uz-UZ') : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      {isExpired ? (
                        <span className="text-xs font-bold text-red-500">{strings.settings?.expiredNotice || 'Muddati ötib ketgan'}</span>
                      ) : isExpiringSoon ? (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          {daysLeft <= 0 ? (strings.settings?.todayLastDay || 'Bugun sönggi kun!') : (t('settings.daysRemaining', { days: daysLeft }) || `${daysLeft} kun qoldi`)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {t('settings.daysRemaining', { days: daysLeft }) || `${daysLeft} kun qoldi`}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/plans')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all flex items-center gap-1"
                    >
                      <span>{isExpired || isExpiringSoon ? (strings.settings?.extendBtn || 'Uzaytiriş') : (strings.settings?.planDetailsBtn || 'Reja')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. Connected Devices Management (Strict 2-Device Limit)
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {strings.settings?.devicesLimitTitle || 'Ulangan qurilmalar (Maksimal 2 ta)'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {devices.length} / 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.settings?.devicesLimitDesc || 'Xavfsizlik talabiga köra bir vaqtning özida faqat 2 ta qurilmada kiriş ruxsat etiladi'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchDevices}
            disabled={loadingDevices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
            <span>{strings.settings?.refreshBtn || 'Yangilaş'}</span>
          </button>
        </div>

        {/* Warning Banner if 2 devices reached */}
        {devices.length >= 2 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold">{strings.settings?.devicesLimitWarningTitle || '2 ta qurilma çegarasi töldi:'}</span> {strings.settings?.devicesLimitWarningDesc || 'Yangi qurilmadan kiriş uçun quyidagi röyxatdan eski yoki foydalanilmayotgan qurilmani tizimdan uzişingiz kerak.'}
            </div>
          </div>
        )}

        {/* Device Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((dev) => {
            const isWeb =
              dev.platform === 'WEB' ||
              dev.deviceModel?.toLowerCase().includes('chrome') ||
              dev.deviceModel?.toLowerCase().includes('safari') ||
              dev.deviceModel?.toLowerCase().includes('firefox');

            return (
              <div
                key={dev.deviceId || dev.id}
                className={`p-5 rounded-2xl border transition-all ${
                  dev.isCurrent
                    ? 'border-indigo-400 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-400/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        dev.isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isWeb ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {dev.deviceModel || strings.settings?.unknownDevice || 'Noma’lum qurilma'}
                        </h4>
                        {dev.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                            Shu qurilma
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {dev.platform || (isWeb ? 'Web Browser' : 'Android')} • OS {dev.osVersion || '—'}
                      </p>
                    </div>
                  </div>

                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeviceToDisconnect(dev)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                      title={strings.settings?.disconnectDeviceBtn || "Tizimdan uziş"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDeviceTime(dev.lastActiveAt)}
                  </span>
                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeviceToDisconnect(dev)}
                      className="text-rose-600 hover:underline font-bold text-xs"
                    >
                      Tizimdan uzish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          3. Appearance (Theme) & Language (Localization)
      ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {strings.settings?.appearanceTitle || 'Taşqi köriniş (Mavzu)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.settings?.appearanceDesc || 'Kunduzgi va tungi körinişni tanlang'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (isDark) toggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                !isDark
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-xs font-bold block">{strings.settings?.themeLight || 'Kunduzgi (Light)'}</span>
                <span className="text-[10px] text-slate-400">{strings.settings?.themeLightDesc || 'Yorqin interfeys'}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isDark) toggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                isDark
                  ? 'border-indigo-500 bg-indigo-950/60 text-white ring-2 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs font-bold block">{strings.settings?.themeDark || 'Tungi (Dark)'}</span>
                <span className="text-[10px] text-slate-400">{strings.settings?.themeDarkDesc || 'Közni çarçatmaydi'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {strings.settings?.languageTitle || 'Ilova tili'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.settings?.languageDesc || 'Barça menyu va darslik interfeysi tili'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[
              { code: 'uz', label: 'Özbekça', flag: '🇺🇿' },
              { code: 'ru', label: 'Русский', flag: '🇷🇺' },
              { code: 'en', label: 'English', flag: '🇬🇧' },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code as any)}
                className={`p-3.5 rounded-2xl border text-center transition-all ${
                  language === item.code
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-xl block mb-1">{item.flag}</span>
                <span className="text-xs block">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. SmartBoard PIN Code Security
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#121A2D] border border-slate-200/90 dark:border-[#23304E] shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {strings.settings?.pinCardTitle || 'SmartBoard 4-raqamli PIN himoyasi'}
                </h3>
                {hasPin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                    Faol
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.settings?.pinCardDesc || 'Sinf doskasida darsdan söng akkauntni tezkor qulflaş va himoyalaş'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPin ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  {strings.settings?.pinChangeBtn || 'PIN kodni almaştiriş'}
                </button>
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                >
                  {strings.settings?.pinRemoveBtn || 'Olib taşlaş'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
              >
                {strings.settings?.pinSetupBtn || 'PIN kod örnatiş'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. Account Logout Actions
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-rose-950 dark:text-rose-200">
              {strings.settings?.logoutSectionTitle || 'Tizimdan çiqiş'}
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              {strings.settings?.logoutSectionDesc || 'Joriy brauzerdan yoki birdaniga barça 2 ta ulangan qurilmalardan çiqiş'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition-colors"
            >
              {strings.settings?.logoutCurrentBtn || 'Şu qurilmadan çiqiş'}
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              {strings.settings?.logoutAllBtn || 'Barça qurilmalardan çiqiş'}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: Edit Profile Modal
      ========================================================================= */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {strings.settings?.editProfileTitle || 'Profil ma’lumotlarini tahrirlaş'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {strings.settings?.nameLabel || 'Ism familiya'}
                </label>
                <input
                  type="text"
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  placeholder={strings.settings?.namePlaceholder || "Masalan: Sardor Alimov"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {strings.settings?.emailImmutable || 'Email (Özgarmas)'}
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {strings.settings?.cancelBtn || 'Bekor qiliş'}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !fullNameDraft.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {savingProfile ? (strings.settings?.savingBtn || 'Saqlanmoqda...') : (strings.settings?.saveBtn || 'Saqlaş')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: SmartBoard PIN Setup Modal
      ========================================================================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {strings.settings?.pinModalTitle || '4-raqamli PIN kod örnatiş'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {strings.settings?.pinNewInputLabel || 'Yangi PIN kod (4 ta raqam)'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {strings.settings?.pinConfirmInputLabel || 'PIN kodni tasdiqlang'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {pinError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {strings.settings?.cancelBtn || 'Bekor qiliş'}
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {strings.settings?.setBtn || 'Örnatiş'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: Disconnect Device Confirmation
      ========================================================================= */}
      {deviceToDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {strings.settings?.disconnectConfirmTitle || 'Qurilmani uzişni tasdiqlaysizmi?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.disconnectConfirmDesc', { model: deviceToDisconnect.deviceModel }) || `“${deviceToDisconnect.deviceModel}” qurilmasi akkauntingizdan uziladi va uning darsliklarga kirişi töxtatiladi.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToDisconnect(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {disconnecting ? (strings.settings?.disconnectingBtn || 'Uzilmoqda...') : (strings.settings?.disconnectActionBtn || 'Uziş')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: Logout Confirmations
      ========================================================================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {strings.settings?.logoutSectionTitle || 'Tizimdan çiqiş'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {strings.settings?.logoutCurrentConfirmDesc || 'Haqiqatan ham şu brauzerdagi sessiyangizdan çiqmoqçimisiz?'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {strings.settings?.confirmLogoutAction || 'Çiqiş'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {strings.settings?.logoutAllBtn || 'Barça qurilmalardan çiqiş'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {strings.settings?.logoutAllConfirmDesc || 'Barça ulangan 2 ta qurilma (kompyuter, smartfon, sinf doskasi)dagi barça faol sessiyalar bekor qilinadi.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutAllConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutAllConfirm(false);
                  await logoutAll();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {strings.settings?.confirmLogoutAllAction || 'Barçasidan çiqiş'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
