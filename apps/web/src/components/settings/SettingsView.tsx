import React, { useState, useEffect } from 'react';
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
  const { t, language, setLanguage, strings } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const { user, refreshProfile, logout, logoutAll } = useAuth();
  const currentUser = user?.user || user;

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullNameDraft, setFullNameDraft] = useState(currentUser?.fullName || '');
  const [savingProfile, setSavingProfile] = useState(false);

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
      notify.warning("Ism familiyani kiriting");
      return;
    }
    setSavingProfile(true);
    try {
      await webApi.updateProfile(fullNameDraft.trim());
      await refreshProfile();
      notify.success("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
      setIsEditingProfile(false);
    } catch (err: any) {
      notify.error(err?.message || "Profilni yangilashda xatolik yuz berdi");
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
      notify.success("Qurilma muvaffaqiyatli uzildi.");
      setDeviceToDisconnect(null);
      await fetchDevices();
    } catch (err: any) {
      notify.error(err?.message || "Qurilmani uzishda xatolik yuz berdi");
    } finally {
      setDisconnecting(false);
    }
  };

  // Handle PIN Save
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError("PIN kod 4 ta raqamdan iborat bo'lishi kerak.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Kiritilgan PIN kodlar bir-biriga mos kelmadi.");
      return;
    }

    const hashed = await hashPinCode(newPin);
    webStorage.savePinHash(hashed);
    setHasPin(true);
    setIsPinModalOpen(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    notify.success("SmartBoard uchun 4 xonali PIN kod o'rnatildi!");
  };

  const handleRemovePin = () => {
    webStorage.clearPinHash();
    setHasPin(false);
    notify.info("PIN kod olib tashlandi.");
  };

  const formatDeviceTime = (isoString?: string) => {
    if (!isoString) return 'Yaqinda faol';
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
          {strings.settings?.headerSubtitle || 'Profil, tashqi ko‘rinish, til va 2 ta qurilma xavfsizligi'}
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
                  {currentUser?.fullName || 'Ism kiritilmagan'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Tasdiqlangan o‘qituvchi
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
            <span>Profilni tahrirlash</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Elektron pochta
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all">
              {currentUser?.email || '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Telefon raqami
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {currentUser?.phoneNumber || '+998 ••••••••'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Hisob turi
            </span>
            <span className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              ilmçi Pro
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Connected Devices Management (Strict 2-Device Limit)
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
                  Ulangan qurilmalar (Maksimal 2 ta)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {devices.length} / 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xavfsizlik talabiga ko‘ra bir vaqtning o‘zida faqat 2 ta qurilmada kirish ruxsat etiladi
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
            <span>Yangilash</span>
          </button>
        </div>

        {/* Warning Banner if 2 devices reached */}
        {devices.length >= 2 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-bold">2 ta qurilma chegarasi to‘ldi:</span> Yangi qurilmadan kirish uchun quyidagi ro‘yxatdan eski yoki foydalanilmayotgan qurilmani tizimdan uzishingiz kerak.
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
                          {dev.deviceModel || 'Noma‘lum qurilma'}
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
                      title="Qurilmani uzish"
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
                Tashqi ko‘rinish (Mavzu)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kunduzgi va tungi ko‘rinishni tanlang
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
                <span className="text-xs font-bold block">Kunduzgi (Light)</span>
                <span className="text-[10px] text-slate-400">Yorqin interfeys</span>
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
                <span className="text-xs font-bold block">Tungi (Dark)</span>
                <span className="text-[10px] text-slate-400">Ko‘zni charchatmaydi</span>
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
                Ilova tili
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Barcha menyu va darslik interfeysi tili
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[
              { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
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
                  SmartBoard 4-raqamli PIN himoyasi
                </h3>
                {hasPin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                    Faol
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinf doskasida darsdan so‘ng akkauntni tezkor qulflash va himoyalash
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
                  PIN kodni almashtirish
                </button>
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                >
                  Olib tashlash
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
              >
                PIN kod o‘rnatish
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
              Tizimdan chiqish
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Joriy brauzerdan yoki birdaniga barcha 2 ta ulangan qurilmalardan chiqish
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold transition-colors"
            >
              Shu qurilmadan chiqish
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Barcha qurilmalardan chiqish
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
                Profil ma’lumotlarini tahrirlash
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
                  Ism familiya
                </label>
                <input
                  type="text"
                  value={fullNameDraft}
                  onChange={(e) => setFullNameDraft(e.target.value)}
                  placeholder="Masalan: Sardor Alimov"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email (O‘zgarmas)
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
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !fullNameDraft.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {savingProfile ? 'Saqlanmoqda...' : 'Saqlash'}
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
                4-raqamli PIN kod o‘rnatish
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
                  Yangi PIN kod (4 ta raqam)
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
                  PIN kodni tasdiqlang
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
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  O‘rnatish
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
                Qurilmani uzishni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                “{deviceToDisconnect.deviceModel}” qurilmasi akkauntingizdan uziladi va uning darsliklarga kirishi to‘xtatiladi.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToDisconnect(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {disconnecting ? 'Uzilmoqda...' : 'Uzish'}
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
              Tizimdan chiqish
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Haqiqatan ham shu brauzerdagi sessiyangizdan chiqmoqchimisiz?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Chiqish
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#121A2D] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Barcha qurilmalardan chiqish
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Barcha ulangan 2 ta qurilma (kompyuter, smartfon, sinf doskasi)dagi barcha faol sessiyalar bekor qilinadi.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutAllConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutAllConfirm(false);
                  await logoutAll();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Barchasidan chiqish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
