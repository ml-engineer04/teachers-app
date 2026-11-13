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
  const envVal =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_WEB_CLIENT_ID) ||
    '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com';
  return String(envVal).trim();
}

export async function loadGoogleGisScript(): Promise<void> {
  if (typeof document === 'undefined') return;

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
      reject(new Error('Google xizmati bilan ulanish vaqti tugadi.'));
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
      reject(new Error('Google Identity Services yuklanmadi.'));
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
  onError?: (message: string) => void;
}): Promise<boolean> {
  const clientId = getWebGoogleClientId();
  if (!clientId) {
    params.onError?.('Google Client ID topilmadi.');
    return false;
  }

  try {
    await loadGoogleGisScript();
    if (!window.google?.accounts?.id) {
      params.onError?.('Google Identity Services yuklanmadi.');
      return false;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: params.nonce,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (res) => {
        if (res.credential) {
          params.onCredential(res.credential, params.nonce);
        } else {
          params.onError?.('Google orqali autentifikatsiya qilinmadi.');
        }
      },
    });

    params.container.innerHTML = '';
    window.google.accounts.id.renderButton(params.container, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'signin_with',
      logo_alignment: 'left',
      width: params.width || 340,
      locale: params.locale || 'uz',
    });

    return true;
  } catch (err: any) {
    params.onError?.(err?.message || 'Google tugmasini yaratishda xatolik yuz berdi.');
    return false;
  }
}
