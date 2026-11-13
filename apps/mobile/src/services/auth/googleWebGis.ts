import { Platform } from 'react-native';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string; select_by?: string }) => void;
            nonce?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            itp_support?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            },
          ) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_ID = 'google-gsi-client-script';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let loadPromise: Promise<void> | null = null;

export function generateOidcNonce(length = 24): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => charset[b % charset.length]).join('');
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += charset[Math.floor(Math.random() * charset.length)];
  }
  return out;
}

export function getWebGoogleClientId(): string {
  const raw = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  if (!raw || raw.includes('YOUR_GOOGLE') || raw.includes('your_google')) {
    return '';
  }
  return raw;
}

export async function loadGoogleGisScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  if (window.google?.accounts?.id) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Google autentifikatsiya skriptini yuklab bo‘lmadi.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    const timeout = setTimeout(() => {
      reject(new Error('Google xizmati bilan ulanish vaqti tugadi. Internet aloqasini tekshiring.'));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        reject(new Error('Google Identity Services obyektini yuklab bo‘lmadi.'));
      }
    };

    script.onerror = () => {
      clearTimeout(timeout);
      loadPromise = null;
      reject(new Error('Google Identity Services yuklanmadi (internet yoki brauzer cheklovi).'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function mountGoogleGisButton(params: {
  container: HTMLElement;
  nonce: string;
  locale?: string;
  width?: number;
  onCredential: (credential: string, nonce: string) => void;
  onError: (message: string) => void;
}): Promise<boolean> {
  if (Platform.OS !== 'web') return false;

  const clientId = getWebGoogleClientId();
  if (!clientId) {
    return false;
  }

  try {
    await loadGoogleGisScript();
    const gis = window.google?.accounts?.id;
    if (!gis) {
      params.onError('Google Identity Services tayyor emas.');
      return false;
    }

    gis.initialize({
      client_id: clientId,
      nonce: params.nonce,
      ux_mode: 'popup',
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (!response?.credential) {
          params.onError('Google orqali kirish bekor qilindi.');
          return;
        }
        params.onCredential(response.credential, params.nonce);
      },
    });

    params.container.innerHTML = '';
    gis.renderButton(params.container, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'left',
      width: params.width || 360,
      locale: params.locale || 'uz',
    });

    return true;
  } catch (err: any) {
    params.onError(err?.message || 'Google tugmasini yuklashda xatolik yuz berdi.');
    return false;
  }
}
