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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? 'border-emerald-200 dark:border-emerald-500/30 bg-white/95 dark:bg-[#121A2D]/95 text-emerald-900 dark:text-emerald-200'
            : toast.type === 'error'
            ? 'border-red-200 dark:border-red-500/30 bg-white/95 dark:bg-[#121A2D]/95 text-red-900 dark:text-red-200'
            : toast.type === 'warning'
            ? 'border-amber-200 dark:border-amber-500/30 bg-white/95 dark:bg-[#121A2D]/95 text-amber-900 dark:text-amber-200'
            : 'border-indigo-200 dark:border-indigo-500/30 bg-white/95 dark:bg-[#121A2D]/95 text-slate-900 dark:text-slate-100';

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
            ? 'text-emerald-600 dark:text-emerald-400'
            : toast.type === 'error'
            ? 'text-red-600 dark:text-red-400'
            : toast.type === 'warning'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-indigo-600 dark:text-indigo-400';

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
