import { Platform } from 'react-native';
import { GoogleAuthDto } from '@smartteacherbook/shared';
import { mobileApi } from '../api/mobileApi';
import { secureStorage } from '../storage/secureStorage';
import { generateOidcNonce, getWebGoogleClientId } from './googleWebGis';

let GoogleSigninModule: any = null;
let statusCodes: any = {};

if (Platform.OS !== 'web') {
  try {
    const pkg = require('@react-native-google-signin/google-signin');
    GoogleSigninModule = pkg.GoogleSignin;
    statusCodes = pkg.statusCodes || {};
  } catch {
    console.warn('GoogleSignin native module unavailable; Web GIS handles browser auth.');
  }
}

export interface GoogleAuthOutcome {
  success: boolean;
  cancelled?: boolean;
  user?: any;
  subscription?: any;
  deviceLimitExceeded?: boolean;
  conflictingDevices?: any[];
  userId?: string;
  lastIdToken?: string;
  requiresAccountLinking?: boolean;
  linkToken?: string;
  linkingEmail?: string;
  linkingHasPassword?: boolean;
  errorMessage?: string;
}

class GoogleAuthService {
  private configured = false;

  isGoogleClientConfigured(): boolean {
    if (Platform.OS === 'web') {
      return Boolean(getWebGoogleClientId());
    }
    return Boolean(getWebGoogleClientId() || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  }

  configure() {
    if (this.configured) return;
    if (Platform.OS !== 'web' && GoogleSigninModule) {
      const webClientId = getWebGoogleClientId();
      if (!webClientId) {
        console.warn('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured.');
        return;
      }
      GoogleSigninModule.configure({
        webClientId,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
        offlineAccess: true,
        scopes: ['openid', 'profile', 'email'],
      });
      this.configured = true;
    }
  }

  async signInWithCredential(params: {
    idToken?: string;
    authorizationCode?: string;
    redirectUri?: string;
    codeVerifier?: string;
    nonce?: string;
  }): Promise<GoogleAuthOutcome> {
    try {
      const meta = await mobileApi.getDeviceMeta();
      const dto: GoogleAuthDto = {
        idToken: params.idToken,
        authorizationCode: params.authorizationCode,
        redirectUri: params.redirectUri,
        codeVerifier: params.codeVerifier,
        nonce: params.nonce,
        deviceId: meta.deviceId,
        deviceModel: meta.deviceModel,
        osVersion: meta.osVersion,
        appVersion: meta.appVersion,
        platform: meta.platform as any,
      };

      const res = await mobileApi.googleSignInWithDto(dto);
      await this.persistSessionResponse(res);

      return {
        success: true,
        user: res.user,
        subscription: res.subscription,
      };
    } catch (err: any) {
      if (err?.isNetworkError) {
        return {
          success: false,
          errorMessage: 'Internet aloqasi mavjud emas. Tarmoqni tekshirib qayta urinib ko‘ring.',
        };
      }

      if (err?.status === 403 && err?.data?.code === 'DEVICE_LIMIT_EXCEEDED') {
        return {
          success: false,
          deviceLimitExceeded: true,
          conflictingDevices: err.data.devices || [],
          userId: err.data.userId,
          lastIdToken: params.idToken,
          errorMessage: err.message,
        };
      }

      if (err?.status === 409 && err?.data?.code === 'ACCOUNT_LINKING_REQUIRED') {
        return {
          success: false,
          requiresAccountLinking: true,
          linkToken: err.data.linkToken,
          linkingEmail: err.data.email,
          linkingHasPassword: Boolean(err.data.hasPassword),
          errorMessage:
            err.data.message ||
            'Ushbu email bilan avval hisob yaratilgan. Google bilan bog‘lash uchun hisob egasi ekanligingizni tasdiqlang.',
        };
      }

      return {
        success: false,
        errorMessage: err?.message || 'Google orqali autentifikatsiyadan o‘tib bo‘lmadi.',
      };
    }
  }

  async signInWithGoogle(): Promise<GoogleAuthOutcome> {
    if (Platform.OS === 'web') {
      return {
        success: false,
        errorMessage: this.isGoogleClientConfigured()
          ? 'Google bilan kirish uchun rasmiy Google tugmasini bosing.'
          : 'Google Sign-In hali sozlanmagan (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID kiritilmagan). Email va parol orqali kirishingiz mumkin.',
      };
    }

    if (!GoogleSigninModule) {
      return {
        success: false,
        errorMessage: 'Ushbu qurilmada Google Sign-In moduli mavjud emas. Email va parol orqali kiring.',
      };
    }

    this.configure();
    if (!this.configured) {
      return {
        success: false,
        errorMessage: 'Google Client ID sozlanmagan. Iltimos, sozlamalarni tekshiring.',
      };
    }

    try {
      await GoogleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const nonce = generateOidcNonce();
      const userInfo = await GoogleSigninModule.signIn();

      if (userInfo?.type === 'cancelled') {
        return {
          success: false,
          cancelled: true,
          errorMessage: 'Google orqali kirish bekor qilindi.',
        };
      }

      const idToken = userInfo?.data?.idToken || userInfo?.idToken;
      if (!idToken) {
        return {
          success: false,
          errorMessage: 'Google autentifikatsiya tokeni olinmadi. Qaytadan urinib ko‘ring.',
        };
      }

      // Only pass nonce if native SDK bound it; native SDK does not always expose nonce param before v13
      return await this.signInWithCredential({
        idToken,
        authorizationCode: userInfo?.data?.serverAuthCode || undefined,
        nonce: undefined,
      });
    } catch (error: any) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === '12501') {
        return {
          success: false,
          cancelled: true,
          errorMessage: 'Google orqali kirish bekor qilindi.',
        };
      }
      if (error?.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          errorMessage: 'Google autentifikatsiyasi allaqachon bajarilmoqda.',
        };
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          errorMessage: 'Google Play xizmatlari mavjud emas yoki yangilashni talab qiladi.',
        };
      }
      return {
        success: false,
        errorMessage: error?.message || 'Google orqali kirishda xatolik yuz berdi.',
      };
    }
  }

  async persistSessionResponse(res: {
    accessToken: string;
    refreshToken: string;
    user: any;
  }) {
    await secureStorage.saveTokens(res.accessToken, res.refreshToken);
    await secureStorage.saveUserProfile(res.user);
  }

  async signOut() {
    try {
      const deviceId = await secureStorage.getOrCreateDeviceId();
      await mobileApi.logout(deviceId);
    } catch {
      await secureStorage.clearAuthTokens();
    }

    if (Platform.OS !== 'web' && GoogleSigninModule) {
      try {
        await GoogleSigninModule.signOut();
      } catch {}
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.google?.accounts?.id?.disableAutoSelect();
      } catch {}
    }
  }
}

export const googleAuthService = new GoogleAuthService();
