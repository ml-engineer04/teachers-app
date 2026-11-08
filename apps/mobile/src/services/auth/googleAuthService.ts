import { Platform } from 'react-native';
import { mobileApi, ApiError } from '../api/mobileApi';
import { secureStorage } from '../storage/secureStorage';
import { AuthTokensResponse } from '@smartteacherbook/shared';

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com';

export interface GoogleAuthResult {
  success: boolean;
  tokens?: AuthTokensResponse;
  deviceLimitExceeded?: boolean;
  activeDevices?: Array<{
    id: string;
    deviceId: string;
    deviceModel: string;
    osVersion: string;
    lastActiveAt: string;
    isCurrent: boolean;
  }>;
  userId?: string;
  errorMessage?: string;
}

class GoogleAuthService {
  private isConfigured = false;

  constructor() {
    this.configureGoogleSignIn();
  }

  private configureGoogleSignIn() {
    if (Platform.OS === 'web') return;

    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: true,
        scopes: ['profile', 'email'],
      });
      this.isConfigured = true;
    } catch (err: any) {
      console.warn('Google Sign-In native module configuration notice:', err.message);
    }
  }

  /**
   * Section 9: Triggers native Google Sign-In prompt and exchanges official ID token with NestJS backend.
   */
  async signIn(testAccountEmail?: string, testAccountName?: string): Promise<GoogleAuthResult> {
    try {
      let idToken: string = '';

      // 1. Native Google Sign-In on Android & iOS
      if (Platform.OS !== 'web' && this.isConfigured) {
        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');

          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

          const response = await GoogleSignin.signIn();

          // Handle v17 response structure
          if (response && response.type === 'cancelled') {
            return {
              success: false,
              errorMessage: 'Tizimga kirish bekor qilindi.',
            };
          }

          if (response && response.type === 'success' && response.data) {
            idToken = response.data.idToken || '';
          } else if (response && response.idToken) {
            idToken = response.idToken;
          }
        } catch (nativeErr: any) {
          console.warn('Native Google Sign-In encountered an error:', nativeErr);

          if (nativeErr.code === 'SIGN_IN_CANCELLED' || nativeErr.message?.includes('SIGN_IN_CANCELLED')) {
            return {
              success: false,
              errorMessage: 'Tizimga kirish bekor qilindi.',
            };
          }

          if (nativeErr.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
            return {
              success: false,
              errorMessage: 'Qurilmangizda Google Play xizmatlari yangilanishi lozim.',
            };
          }

          return {
            success: false,
            errorMessage: nativeErr.message || 'Google orqali kirishda xatolik yuz berdi.',
          };
        }
      }

      // Web development fallback
      if (!idToken && Platform.OS === 'web' && testAccountEmail) {
        idToken = this.createDevWebToken(testAccountEmail, testAccountName);
      }

      if (!idToken) {
        return {
          success: false,
          errorMessage: 'Google ID Token olinmadi. Qaytadan urinib ko‘ring.',
        };
      }

      // 2. Hardware / Installation Identification
      const deviceId = await secureStorage.getOrCreateDeviceId();
      const deviceModel =
        Platform.OS === 'android'
          ? 'Android Device'
          : Platform.OS === 'ios'
          ? 'Apple iPad'
          : 'Web Browser';

      const osVersion = Platform.OS === 'android' ? `Android ${Platform.Version || '14'}` : Platform.OS;

      // 3. Send verified Google ID token to SmartTeacherBook backend
      const authResponse = await mobileApi.googleSignInWithDto({
        idToken,
        deviceId,
        deviceModel,
        osVersion,
        appVersion: '1.0.0',
        platform: Platform.OS.toUpperCase(),
      });

      // 4. Securely store application tokens
      await secureStorage.saveTokens(authResponse.accessToken, authResponse.refreshToken);
      await secureStorage.saveUserProfile(authResponse.user);

      return {
        success: true,
        tokens: authResponse,
      };
    } catch (err: any) {
      console.error('Google Sign-In backend verification failed:', err);

      const apiErr = err as ApiError;
      if (
        apiErr.status === 403 &&
        (apiErr.data?.code === 'DEVICE_LIMIT_EXCEEDED' || apiErr.data?.devices)
      ) {
        return {
          success: false,
          deviceLimitExceeded: true,
          activeDevices: apiErr.data.devices || [],
          userId: apiErr.data.userId,
          errorMessage: apiErr.data.message || 'Hisob allaqachon 2 ta qurilmada faol.',
        };
      }

      return {
        success: false,
        errorMessage: err.message || 'Google orqali kirishda xatolik yuz berdi.',
      };
    }
  }

  /**
   * Section 18: Sign out and revoke session on backend.
   */
  async signOut(deviceId?: string): Promise<void> {
    const currentDeviceId = deviceId || (await secureStorage.getOrCreateDeviceId());
    try {
      await mobileApi.logout(currentDeviceId);
    } catch {}

    if (Platform.OS !== 'web' && this.isConfigured) {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch {}
    }

    await secureStorage.clearAuthTokens();
  }

  private createDevWebToken(email: string, name?: string): string {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      name?.trim() ||
      cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const toBase64Url = (str: string) => {
      let b64 = '';
      if (typeof btoa !== 'undefined') {
        b64 = btoa(unescape(encodeURIComponent(str)));
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let i = 0;
        while (i < str.length) {
          const c1 = str.charCodeAt(i++);
          const c2 = str.charCodeAt(i++);
          const c3 = str.charCodeAt(i++);
          b64 += chars.charAt(c1 >> 2);
          b64 += chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
          b64 += isNaN(c2) ? '=' : chars.charAt(((c2 & 15) << 2) | (c3 >> 6));
          b64 += isNaN(c3) ? '=' : chars.charAt(c3 & 63);
        }
      }
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const header = toBase64Url(JSON.stringify({ alg: 'RS256', kid: 'google-key-01' }));
    const payload = toBase64Url(
      JSON.stringify({
        iss: 'accounts.google.com',
        sub: `google_sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        email_verified: true,
        name: cleanName,
        picture: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
        aud: WEB_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      }),
    );
    const sig = toBase64Url('dev_mock_sig');
    return `${header}.${payload}.${sig}`;
  }
}

export const googleAuthService = new GoogleAuthService();
