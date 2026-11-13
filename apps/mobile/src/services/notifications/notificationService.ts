export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  durationMs: number;
  createdAt: number;
}

type Listener = (items: AppNotification[]) => void;

const MAX_VISIBLE_NOTIFICATIONS = 3;
const DEDUP_WINDOW_MS = 1600;

class NotificationManager {
  private items: AppNotification[] = [];
  private listeners = new Set<Listener>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = [...this.items];
    this.listeners.forEach((listener) => listener(snapshot));
  }

  show(
    type: NotificationType,
    title: string,
    message?: string,
    durationMs?: number,
  ): string {
    const cleanTitle = (title || '').trim() || 'Bildirishnoma';
    const cleanMessage = message?.trim() || undefined;
    const now = Date.now();

    // Prevent identical notification bursts on repeated retries/offline calls
    const duplicate = this.items.find(
      (item) =>
        item.type === type &&
        item.title === cleanTitle &&
        item.message === cleanMessage &&
        now - item.createdAt < DEDUP_WINDOW_MS,
    );
    if (duplicate) {
      return duplicate.id;
    }

    const ttl = durationMs ?? (type === 'error' || type === 'warning' ? 4800 : 3600);
    const id = `ntf_${now}_${Math.random().toString(36).slice(2, 7)}`;

    const nextItem: AppNotification = {
      id,
      type,
      title: cleanTitle,
      message: cleanMessage,
      durationMs: ttl,
      createdAt: now,
    };

    // Keep most recent items first and enforce visible cap
    const next = [nextItem, ...this.items].slice(0, MAX_VISIBLE_NOTIFICATIONS);
    const removed = this.items.filter((old) => !next.some((k) => k.id === old.id));
    removed.forEach((r) => this.clearTimer(r.id));

    this.items = next;
    this.emit();

    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, ttl);
      this.timers.set(id, timer);
    }

    return id;
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    const filtered = this.items.filter((item) => item.id !== id);
    if (filtered.length !== this.items.length) {
      this.items = filtered;
      this.emit();
    }
  }

  clear(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.items = [];
    this.emit();
  }

  private clearTimer(id: string): void {
    const existing = this.timers.get(id);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(id);
    }
  }

  success(title: string, message?: string, durationMs?: number): string {
    return this.show('success', title, message, durationMs);
  }

  error(title: string, message?: string, durationMs?: number): string {
    return this.show('error', title, message, durationMs);
  }

  warning(title: string, message?: string, durationMs?: number): string {
    return this.show('warning', title, message, durationMs);
  }

  info(title: string, message?: string, durationMs?: number): string {
    return this.show('info', title, message, durationMs);
  }
}

export const notify = new NotificationManager();
