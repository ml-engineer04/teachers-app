import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { subscribeToasts, ToastMessage } from '../../utils/notify';

export const NotificationHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = subscribeToasts((toast) => {
      setToasts((prev) => [...prev.slice(-3), toast]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.durationMs || 3800);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? 'border-[#0F6E56]/30 dark:border-[#5FD1AC]/30 bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 text-[#1B2238] dark:text-[#E9ECF7]'
            : toast.type === 'error'
            ? 'border-[#B3322A]/30 dark:border-[#F0857A]/30 bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 text-[#B3322A] dark:text-[#F0857A]'
            : toast.type === 'warning'
            ? 'border-[#8A5A0B]/30 dark:border-[#F0B95B]/30 bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 text-[#8A5A0B] dark:text-[#F0B95B]'
            : 'border-[#2A4FB8]/30 dark:border-[#4F72EE]/30 bg-[#FFFFFF]/95 dark:bg-[#171C2E]/95 text-[#1B2238] dark:text-[#E9ECF7]';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
            ? AlertCircle
            : toast.type === 'warning'
            ? AlertTriangle
            : Info;

        const iconColor =
          toast.type === 'success'
            ? 'text-[#0F6E56] dark:text-[#5FD1AC]'
            : toast.type === 'error'
            ? 'text-[#B3322A] dark:text-[#F0857A]'
            : toast.type === 'warning'
            ? 'text-[#8A5A0B] dark:text-[#F0B95B]'
            : 'text-[#2A4FB8] dark:text-[#8FA8F7]';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-elevated backdrop-blur-md transition-all ${styles}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {toast.title && <p className="text-sm font-bold leading-snug mb-0.5">{toast.title}</p>}
              <p className="text-xs sm:text-sm opacity-90 leading-snug break-words">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
