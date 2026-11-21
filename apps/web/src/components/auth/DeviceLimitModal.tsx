import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  AlertTriangle,
  X,
  Trash2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { webApi } from '../../services/api/webApi';
import { notify } from '../../utils/notify';

export interface ActiveDevice {
  id?: string;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  platform?: string;
  lastActiveAt?: string;
  isActive?: boolean;
}

interface DeviceLimitModalProps {
  isOpen: boolean;
  devices: ActiveDevice[];
  userId?: string;
  googleIdToken?: string;
  onClose: () => void;
  onDeviceEvicted: (freedDeviceId: string) => void;
}

export const DeviceLimitModal: React.FC<DeviceLimitModalProps> = ({
  isOpen,
  devices,
  userId,
  googleIdToken,
  onClose,
  onDeviceEvicted,
}) => {
  const { t, language } = useI18n();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [confirmDeviceId, setConfirmDeviceId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatLastActive = (iso?: string) => {
    if (!iso) return 'Yaqinda';
    try {
      const d = new Date(iso);
      const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';
      return `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return iso;
    }
  };

  const handleDisconnect = async (targetDeviceId: string) => {
    setDisconnectingId(targetDeviceId);
    try {
      if (googleIdToken) {
        await webApi.evictDeviceWithGoogleToken(googleIdToken, targetDeviceId);
      } else if (userId) {
        await webApi.disconnectDeviceByUserId(userId, targetDeviceId);
      } else {
        await webApi.disconnectDevice(targetDeviceId);
      }

      notify.success(
        'Eski qurilma muvaffaqiyatli uzildi. Endi joriy qurilmadan kirişingiz mumkin!',
        t('common.success'),
      );
      onDeviceEvicted(targetDeviceId);
    } catch (err: any) {
      notify.error(
        err?.message || 'Qurilmani uzişda xatolik yuz berdi.',
        t('common.error'),
      );
    } finally {
      setDisconnectingId(null);
      setConfirmDeviceId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#5B6672] dark:text-[#9AA3B0] hover:text-[#1F2933] dark:hover:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFFBEB] dark:bg-[#92400E]/30 text-[#B45309] dark:text-[#FBBF24] flex items-center justify-center shrink-0 border border-[#FCD34D]/60 dark:border-[#B45309]/50">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#142452] dark:text-[#E6E8EC]">
              {t('modals.deviceLimitTitle')} (2/2)
            </h3>
            <p className="text-xs text-[#5B6672] dark:text-[#9AA3B0] mt-0.5">
              Xavfsizlik qoidasi: bitta hisobdan bir vaqtda 2 tagaça qurilma ulanişi mumkin
            </p>
          </div>
        </div>

        <p className="text-sm text-[#1F2933] dark:text-[#E6E8EC] leading-relaxed mb-6">
          {t('modals.deviceLimitDesc')}
        </p>

        {/* Device List */}
        <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-1">
          {devices.map((device, idx) => {
            const isWeb =
              device.platform === 'WEB' ||
              (device.deviceModel && device.deviceModel.toLowerCase().includes('web'));
            const isTargeted = confirmDeviceId === device.deviceId;
            const isBusy = disconnectingId === device.deviceId;

            return (
              <div
                key={device.deviceId || idx}
                className={`rounded-2xl p-4 border transition-all ${
                  isTargeted
                    ? 'border-[#B91C1C] dark:border-[#B91C1C]/70 bg-red-50/60 dark:bg-red-950/30'
                    : 'border-[#D9DCD5] dark:border-[#353B47] bg-[#F4F5F2] dark:bg-[#15181E]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FBFBF9] dark:bg-[#1E222A] border border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-center text-[#5B6672] dark:text-[#9AA3B0] shrink-0 mt-0.5">
                      {isWeb ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1F2933] dark:text-[#E6E8EC]">
                        {device.deviceModel || 'Noma‘lum qurilma'}
                      </p>
                      <p className="text-xs text-[#5B6672] dark:text-[#9AA3B0] mt-0.5">
                        {device.osVersion || device.platform || 'Platform'} • Faollik:{' '}
                        {formatLastActive(device.lastActiveAt)}
                      </p>
                    </div>
                  </div>

                  {!isTargeted ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeviceId(device.deviceId)}
                      disabled={disconnectingId !== null}
                      className="px-3 py-1.5 rounded-xl border border-[#B91C1C]/30 text-[#B91C1C] dark:text-[#F87171] text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('settings.removeDeviceBtn')}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeviceId(null)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#5B6672] dark:text-[#9AA3B0] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36]"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(device.deviceId)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold shadow-sm flex items-center gap-1"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isBusy ? 'Öçirilmoqda...' : 'Tasdiqlaş'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-[#D9DCD5] dark:border-[#353B47] flex items-center justify-between">
          <span className="text-xs text-[#5B6672] dark:text-[#9AA3B0]">
            Biror qurilmani uzsangiz, yangi joy darhol oçiladi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#1F2933] dark:text-[#E6E8EC] hover:bg-[#ECEEEA] dark:hover:bg-[#272C36]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
