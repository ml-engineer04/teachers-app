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
        <h1 className="text-2xl sm:text-3xl font-black text-[#1B2238] dark:text-[#E9ECF7] tracking-tight">
          {strings.settings?.headerTitle || 'Sozlamalar'}
        </h1>
        <p className="text-xs sm:text-sm text-[#7A8299] dark:text-[#8B93AD] mt-1">
          {strings.settings?.headerSubtitle || 'Profil, köriniş, til va 2 ta qurilma xavfsizligi'}
        </p>
      </div>

      {/* =========================================================================
          1. Personal Profile Card
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#E6E9F2] dark:border-[#262C42]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2A4FB8] to-[#1C3375] text-white flex items-center justify-center font-black text-2xl shadow-[0_6px_20px_-4px_rgba(42,79,184,0.35)]">
              {(currentUser?.fullName || currentUser?.email || 'O')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                  {currentUser?.fullName || strings.settings?.noNameProvided || 'Ism kiritilmagan'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border border-[#0F6E56]/30">
                  <CheckCircle2 className="w-3 h-3 text-[#0F6E56] dark:text-[#5FD1AC]" />
                  {strings.settings?.verifiedTeacher || 'Tasdiqlangan öqituvçi'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#7A8299] dark:text-[#8B93AD] mt-0.5">
                {currentUser?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] hover:bg-[#E8EDFB] dark:hover:bg-[#1E2A55] text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7] border border-[#E6E9F2] dark:border-[#262C42] font-bold text-xs transition-colors self-start sm:self-auto"
          >
            <Edit3 className="w-4 h-4" />
            <span>{strings.settings?.editProfileBtn || 'Profilni tahrirlaş'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-[#8B93AD] block mb-1">
              {strings.settings?.emailLabel || 'Elektron poçta'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#1B2238] dark:text-[#E9ECF7] break-all">
              {currentUser?.email || '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-[#8B93AD] block mb-1">
              {strings.settings?.phoneLabel || 'Telefon raqami'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#1B2238] dark:text-[#E9ECF7]">
              {currentUser?.phoneNumber || '+998 ••••••••'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#EEF1F8] dark:bg-[#10152A] border border-[#E6E9F2] dark:border-[#262C42]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A8299] dark:text-[#8B93AD] block mb-1">
              {strings.settings?.accountTypeLabel || 'Hisob turi'}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ilmçi Pro
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Active Tariffs & Subscriptions (Ulangan Tariflar va Obunalar)
      ========================================================================= */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E9F2] dark:border-[#262C42]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.settings?.subscriptionsTitle || 'Ulangan tariflar va obunalar'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA]">
                  {t('settings.subscriptionsCount', { count: subscriptions.length }) || `${subscriptions.length} ta obuna`}
                </span>
              </div>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-0.5">
                {strings.settings?.subscriptionsDesc || 'Siz faollashtirgan fanlar, ularning amal qiliş muddati va qolgan vaqt'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSubscriptions}
            disabled={loadingSubscriptions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A] text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSubscriptions ? 'animate-spin' : ''}`} />
            <span>{strings.settings?.refreshBtn || 'Yangilaş'}</span>
          </button>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-[#7A8299] dark:text-[#8B93AD]">
              {strings.settings?.noSubscriptions || 'Hozirça sizda faol ulangan tariflar mavjud emas.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard/plans')}
              className="px-5 py-2.5 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white font-bold text-xs shadow-md shadow-[#2A4FB8]/25 active:scale-95 transition-all inline-flex items-center gap-1.5"
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
                      ? 'bg-[#FDF3E1] dark:bg-[#3A2B10] border-[#8A5A0B]/30 dark:border-[#F0B95B]/30 ring-1 ring-[#8A5A0B]/20'
                      : isExpired
                      ? 'bg-[#FCEBEA] dark:bg-[#3A1B1D] border-[#B3322A]/30 dark:border-[#F0857A]/30 opacity-80'
                      : 'bg-[#EEF1F8] dark:bg-[#10152A] border-[#E6E9F2] dark:border-[#262C42]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{subj?.icon || '📘'}</span>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#1B2238] dark:text-[#E9ECF7]">
                          {formatGrade(sub.gradeId)} • {subj?.name || sub.subjectId || 'Fan darsligi'}
                        </h4>
                      </div>
                      <p className="text-[11px] font-semibold text-[#2A4FB8] dark:text-[#8FA8F7] mt-1">
                        {planTitle}
                      </p>
                    </div>

                    {isExpired ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FCEBEA] dark:bg-[#3A1B1D] text-[#B3322A] dark:text-[#F0857A] border border-[#B3322A]/30">
                        Tugagan
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FDF3E1] dark:bg-[#3A2B10] text-[#8A5A0B] dark:text-[#F0B95B] border border-[#8A5A0B]/30 animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#8A5A0B] dark:text-[#F0B95B]" />
                        Tugamoqda
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border border-[#0F6E56]/30">
                        Faol
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E6E9F2] dark:border-[#262C42]">
                    <div>
                      <span className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] block">{strings.settings?.startDate || 'Boşlangan sana'}</span>
                      <span className="font-semibold text-[#7A8299] dark:text-[#8B93AD]">
                        {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString('uz-UZ') : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7A8299] dark:text-[#8B93AD] block">{strings.settings?.expiresDate || 'Amal qiliş muddati'}</span>
                      <span className="font-semibold text-[#7A8299] dark:text-[#8B93AD]">
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('uz-UZ') : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      {isExpired ? (
                        <span className="text-xs font-bold text-[#B3322A] dark:text-[#F0857A]">{strings.settings?.expiredNotice || 'Muddati ötib ketgan'}</span>
                      ) : isExpiringSoon ? (
                        <span className="text-xs font-black text-[#8A5A0B] dark:text-[#F0B95B] flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#8A5A0B] dark:text-[#F0B95B]" />
                          {daysLeft <= 0 ? (strings.settings?.todayLastDay || 'Bugun sönggi kun!') : (t('settings.daysRemaining', { days: daysLeft }) || `${daysLeft} kun qoldi`)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#0F6E56] dark:text-[#5FD1AC] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0F6E56] dark:text-[#5FD1AC]" />
                          {t('settings.daysRemaining', { days: daysLeft }) || `${daysLeft} kun qoldi`}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/plans')}
                      className="px-3 py-1.5 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] hover:bg-[#D4E2FA] dark:hover:bg-[#283870] text-[#1D3A8F] dark:text-[#B3C4FA] text-xs font-bold border border-[#C9D6F5] dark:border-[#34478C] transition-all flex items-center gap-1"
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
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.settings?.devicesLimitTitle || 'Ulangan qurilmalar (Maksimal 2 ta)'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA]">
                  {devices.length} / 2
                </span>
              </div>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
                {strings.settings?.devicesLimitDesc || 'Xavfsizlik talabiga köra bir vaqtning özida faqat 2 ta qurilmada kiriş ruxsat etiladi'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchDevices}
            disabled={loadingDevices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A] text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
            <span>{strings.settings?.refreshBtn || 'Yangilaş'}</span>
          </button>
        </div>

        {/* Warning Banner if 2 devices reached */}
        {devices.length >= 2 && (
          <div className="p-4 rounded-2xl bg-[#FDF3E1] dark:bg-[#3A2B10] border border-[#8A5A0B]/30 dark:border-[#F0B95B]/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#8A5A0B] dark:text-[#F0B95B] shrink-0 mt-0.5" />
            <div className="text-xs text-[#8A5A0B] dark:text-[#F0B95B] leading-relaxed">
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
                    ? 'border-[#2A4FB8]/40 dark:border-[#4F72EE]/40 bg-[#EEF2FD] dark:bg-[#182252] ring-1 ring-[#2A4FB8]/20'
                    : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        dev.isCurrent
                          ? 'bg-[#2A4FB8] dark:bg-[#4F72EE] text-white'
                          : 'bg-[#E4E9F7] dark:bg-[#262C42] text-[#7A8299] dark:text-[#8B93AD]'
                      }`}
                    >
                      {isWeb ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                          {dev.deviceModel || strings.settings?.unknownDevice || 'Noma’lum qurilma'}
                        </h4>
                        {dev.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border border-[#0F6E56]/30">
                            Shu qurilma
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-0.5">
                        {dev.platform || (isWeb ? 'Web Browser' : 'Android')} • OS {dev.osVersion || '—'}
                      </p>
                    </div>
                  </div>

                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeviceToDisconnect(dev)}
                      className="p-2 text-[#B3322A] dark:text-[#F0857A] hover:bg-[#FCEBEA] dark:hover:bg-[#3A1B1D] rounded-xl transition-colors"
                      title={strings.settings?.disconnectDeviceBtn || "Tizimdan uziş"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E9F2] dark:border-[#262C42] flex items-center justify-between text-[11px] text-[#7A8299] dark:text-[#8B93AD]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDeviceTime(dev.lastActiveAt)}
                  </span>
                  {!dev.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeviceToDisconnect(dev)}
                      className="text-[#B3322A] dark:text-[#F0857A] hover:underline font-bold text-xs"
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
        <div className="rounded-3xl p-6 sm:p-7 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                {strings.settings?.appearanceTitle || 'Taşqi köriniş (Mavzu)'}
              </h3>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
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
                  ? 'border-[#2A4FB8] bg-[#EEF2FD] text-[#1B2238] ring-2 ring-[#2A4FB8]/30'
                  : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-[#7A8299] dark:text-[#8B93AD]'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-xs font-bold block">{strings.settings?.themeLight || 'Kunduzgi (Light)'}</span>
                <span className="text-[10px] text-[#7A8299] dark:text-[#8B93AD]">{strings.settings?.themeLightDesc || 'Yorqin interfeys'}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isDark) toggleTheme();
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                isDark
                  ? 'border-[#4F72EE] bg-[#182252] text-[#E9ECF7] ring-2 ring-[#4F72EE]/30'
                  : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-[#7A8299] dark:text-[#8B93AD]'
              }`}
            >
              <Moon className="w-5 h-5 text-[#8FA8F7]" />
              <div>
                <span className="text-xs font-bold block">{strings.settings?.themeDark || 'Tungi (Dark)'}</span>
                <span className="text-[10px] text-[#7A8299] dark:text-[#8B93AD]">{strings.settings?.themeDarkDesc || 'Közni çarçatmaydi'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="rounded-3xl p-6 sm:p-7 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                {strings.settings?.languageTitle || 'Ilova tili'}
              </h3>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
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
                    ? 'border-[#2A4FB8] dark:border-[#4F72EE] bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#1D3A8F] dark:text-[#B3C4FA] font-bold ring-2 ring-[#2A4FB8]/30'
                    : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#E8EDFB]/50 dark:hover:bg-[#1E2A55]/40'
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
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] dark:bg-[#1E2A55] text-[#2A4FB8] dark:text-[#8FA8F7] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                  {strings.settings?.pinCardTitle || 'SmartBoard 4-raqamli PIN himoyasi'}
                </h3>
                {hasPin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#E3F5EE] dark:bg-[#12332B] text-[#0F6E56] dark:text-[#5FD1AC] border border-[#0F6E56]/30">
                    Faol
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
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
                  className="px-4 py-2 rounded-xl bg-[#EEF1F8] dark:bg-[#10152A] hover:bg-[#E8EDFB] dark:hover:bg-[#1E2A55] text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] border border-[#E6E9F2] dark:border-[#262C42] transition-colors"
                >
                  {strings.settings?.pinChangeBtn || 'PIN kodni almaştiriş'}
                </button>
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="px-4 py-2 rounded-xl border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-[#B3322A] dark:text-[#F0857A] hover:bg-[#FCEBEA] dark:hover:bg-[#3A1B1D] text-xs font-bold transition-colors"
                >
                  {strings.settings?.pinRemoveBtn || 'Olib taşlaş'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white text-xs font-bold shadow-md shadow-[#2A4FB8]/25 transition-colors"
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
      <div className="rounded-3xl p-6 sm:p-8 bg-[#FCEBEA] dark:bg-[#3A1B1D] border border-[#B3322A]/30 dark:border-[#F0857A]/30 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#B3322A] dark:text-[#F0857A]">
              {strings.settings?.logoutSectionTitle || 'Tizimdan çiqiş'}
            </h3>
            <p className="text-xs text-[#B3322A]/80 dark:text-[#F0857A]/80 mt-0.5">
              {strings.settings?.logoutSectionDesc || 'Joriy brauzerdan yoki birdaniga barça 2 ta ulangan qurilmalardan çiqiş'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#B3322A]/30 dark:border-[#F0857A]/30 text-[#B3322A] dark:text-[#F0857A] hover:bg-[#FCEBEA] dark:hover:bg-[#3A1B1D] text-xs font-bold transition-colors"
            >
              {strings.settings?.logoutCurrentBtn || 'Şu qurilmadan çiqiş'}
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#FFFFFF] dark:bg-[#171C2E] rounded-3xl p-6 shadow-2xl border border-[#E6E9F2] dark:border-[#262C42]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E9F2] dark:border-[#262C42]">
              <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                {strings.settings?.editProfileTitle || 'Profil ma’lumotlarini tahrirlaş'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-1 rounded-lg text-[#7A8299] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] block mb-1">
                  {strings.settings?.nameLabel || 'Ism familiya'}
                </label>
                <input
                  type="text"
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  placeholder={strings.settings?.namePlaceholder || "Masalan: Sardor Alimov"}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-xs text-[#1B2238] dark:text-[#E9ECF7] placeholder-[#9AA1B5] dark:placeholder-[#69718C] focus:outline-none focus:border-[#2A4FB8] dark:focus:border-[#4F72EE]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] block mb-1">
                  {strings.settings?.emailImmutable || 'Email (Özgarmas)'}
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] bg-[#E4E9F7] dark:bg-[#262C42] text-xs text-[#7A8299] dark:text-[#8B93AD] cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
                >
                  {strings.settings?.cancelBtn || 'Bekor qiliş'}
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !fullNameDraft.trim()}
                  className="px-5 py-2 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-md shadow-[#2A4FB8]/25"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#FFFFFF] dark:bg-[#171C2E] rounded-3xl p-6 shadow-2xl border border-[#E6E9F2] dark:border-[#262C42]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E9F2] dark:border-[#262C42]">
              <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                {strings.settings?.pinModalTitle || '4-raqamli PIN kod örnatiş'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1 rounded-lg text-[#7A8299] hover:text-[#1B2238] dark:hover:text-[#E9ECF7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] block mb-1">
                  {strings.settings?.pinNewInputLabel || 'Yangi PIN kod (4 ta raqam)'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-[#1B2238] dark:text-[#E9ECF7] placeholder-[#9AA1B5] dark:placeholder-[#69718C] focus:outline-none focus:border-[#2A4FB8] dark:focus:border-[#4F72EE]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] block mb-1">
                  {strings.settings?.pinConfirmInputLabel || 'PIN kodni tasdiqlang'}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-xl border border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A] text-[#1B2238] dark:text-[#E9ECF7] placeholder-[#9AA1B5] dark:placeholder-[#69718C] focus:outline-none focus:border-[#2A4FB8] dark:focus:border-[#4F72EE]"
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-[#B3322A] dark:text-[#F0857A]">
                  {pinError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
                >
                  {strings.settings?.cancelBtn || 'Bekor qiliş'}
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="px-5 py-2 rounded-xl bg-[#2A4FB8] hover:bg-[#234399] dark:bg-[#4F72EE] dark:hover:bg-[#6384F1] text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-md shadow-[#2A4FB8]/25"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#FFFFFF] dark:bg-[#171C2E] rounded-3xl p-6 shadow-2xl border border-[#E6E9F2] dark:border-[#262C42] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FCEBEA] dark:bg-[#3A1B1D] text-[#B3322A] dark:text-[#F0857A] flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                {strings.settings?.disconnectConfirmTitle || 'Qurilmani uzişni tasdiqlaysizmi?'}
              </h3>
              <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-1 leading-relaxed">
                {t('settings.disconnectConfirmDesc', { model: deviceToDisconnect.deviceModel }) || `“${deviceToDisconnect.deviceModel}” qurilmasi akkauntingizdan uziladi va uning darsliklarga kirişi töxtatiladi.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToDisconnect(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="px-5 py-2 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#FFFFFF] dark:bg-[#171C2E] rounded-3xl p-6 shadow-2xl border border-[#E6E9F2] dark:border-[#262C42] space-y-4">
            <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
              {strings.settings?.logoutSectionTitle || 'Tizimdan çiqiş'}
            </h3>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] leading-relaxed">
              {strings.settings?.logoutCurrentConfirmDesc || 'Haqiqatan ham şu brauzerdagi sessiyangizdan çiqmoqçimisiz?'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="px-5 py-2 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold transition-colors"
              >
                {strings.settings?.confirmLogoutAction || 'Çiqiş'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#FFFFFF] dark:bg-[#171C2E] rounded-3xl p-6 shadow-2xl border border-[#E6E9F2] dark:border-[#262C42] space-y-4">
            <h3 className="text-base font-bold text-[#1B2238] dark:text-[#E9ECF7]">
              {strings.settings?.logoutAllBtn || 'Barça qurilmalardan çiqiş'}
            </h3>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] leading-relaxed">
              {strings.settings?.logoutAllConfirmDesc || 'Barça ulangan 2 ta qurilma (kompyuter, smartfon, sinf doskasi)dagi barça faol sessiyalar bekor qilinadi.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutAllConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
              >
                {strings.settings?.cancelBtn || 'Bekor qiliş'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutAllConfirm(false);
                  await logoutAll();
                }}
                className="px-5 py-2 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold transition-colors"
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
