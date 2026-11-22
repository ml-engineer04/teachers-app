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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1220]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#7A8299] dark:text-[#8B93AD] hover:text-[#1B2238] dark:hover:text-[#E9ECF7] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A] transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF3E1] dark:bg-[#3A2B10] text-[#8A5A0B] dark:text-[#F0B95B] flex items-center justify-center shrink-0 border border-[#8A5A0B]/30 dark:border-[#F0B95B]/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#1B2238] dark:text-[#E9ECF7]">
              {t('modals.deviceLimitTitle')} (2/2)
            </h3>
            <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-0.5">
              Xavfsizlik qoidasi: bitta hisobdan bir vaqtda 2 tagaça qurilma ulanişi mumkin
            </p>
          </div>
        </div>

        <p className="text-sm text-[#1B2238] dark:text-[#E9ECF7] leading-relaxed mb-6">
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
                    ? 'border-[#B3322A] dark:border-[#F0857A]/70 bg-[#FCEBEA]/60 dark:bg-[#3A1B1D]/40'
                    : 'border-[#E6E9F2] dark:border-[#262C42] bg-[#EEF1F8] dark:bg-[#10152A]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] dark:bg-[#171C2E] border border-[#E6E9F2] dark:border-[#262C42] flex items-center justify-center text-[#7A8299] dark:text-[#8B93AD] shrink-0 mt-0.5">
                      {isWeb ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1B2238] dark:text-[#E9ECF7]">
                        {device.deviceModel || 'Noma‘lum qurilma'}
                      </p>
                      <p className="text-xs text-[#7A8299] dark:text-[#8B93AD] mt-0.5">
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
                      className="px-3 py-1.5 rounded-xl border border-[#B3322A]/30 text-[#B3322A] dark:text-[#F0857A] text-xs font-bold hover:bg-[#FCEBEA] dark:hover:bg-[#3A1B1D] transition-colors flex items-center gap-1.5 shrink-0"
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
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#7A8299] dark:text-[#8B93AD] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(device.deviceId)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white text-xs font-bold shadow-sm flex items-center gap-1"
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
        <div className="pt-4 border-t border-[#E6E9F2] dark:border-[#262C42] flex items-center justify-between">
          <span className="text-xs text-[#7A8299] dark:text-[#8B93AD]">
            Biror qurilmani uzsangiz, yangi joy darhol oçiladi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#1B2238] dark:text-[#E9ECF7] hover:bg-[#EEF1F8] dark:hover:bg-[#10152A]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
