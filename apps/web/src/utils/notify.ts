export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

type ToastListener = (msg: ToastMessage) => void;

const listeners = new Set<ToastListener>();

export function subscribeToasts(cb: ToastListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function showToast(
  message: string,
  options?: { type?: ToastType; title?: string; durationMs?: number },
): void {
  const toast: ToastMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: options?.type || 'info',
    title: options?.title,
    message,
    durationMs: options?.durationMs ?? 3800,
  };
  listeners.forEach((cb) => cb(toast));
}

export const notify = {
  success: (message: string, title?: string) => showToast(message, { type: 'success', title }),
  error: (message: string, title?: string) => showToast(message, { type: 'error', title }),
  warning: (message: string, title?: string) => showToast(message, { type: 'warning', title }),
  info: (message: string, title?: string) => showToast(message, { type: 'info', title }),
};
