# SmartTeacherBook — Google Cloud OAuth 2.0 & OIDC Sozlash Yo‘riqnomasi

Ushbu qo‘llanma **SmartTeacherBook** loyihasida Google Sign-In (`Google Identity Services` / `OAuth 2.0` / `OpenID Connect`) tizimini **Development** va **Production** muhitlariga xavfsiz ulash tartibini tushuntiradi.

---

## 1. Google Cloud Project yaratish

1. [Google Cloud Console](https://console.cloud.google.com/) sahifasiga kiring.
2. Yuqori chap burchakdagi loyiha menyusidan **New Project** tugmasini bosing.
3. Loyiha nomi: `SmartTeacherBook` (yoki `smartteacherbook-prod`).
4. **Create** ni bosing va yangi loyihani tanlang.

---

## 2. Google Auth Platform (Branding & Audience) ni sozlash

1. Chap menyudan **Google Auth Platform** (yoki **APIs & Services -> OAuth consent screen**) bo‘limiga o‘ting.
2. **Overview -> Get started** (yoki **User Type: External**) ni tanlang.
3. Ilova ma’lumotlari:
   - **App name**: `SmartTeacherBook`
   - **User support email**: rasmiy admin Gmail/domeningiz (masalan, `support@smartteacherbook.uz`)
   - **App logo**: SmartTeacherBook logotipini yuklang (120×120 PNG/JPG).
   - **Audience**: Production uchun **External** -> **Publish App** (yoki test davrida **Testing** holatida Test Users ga kerakli Gmail larni qo‘shing).
4. **Data Access / Scopes** ga faqat quyidagi OpenID Connect scope larni qo‘shing (ortiqcha ruxsat so‘ramang):
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

---

## 3. Authorized Domains kiritish (Production)

Google Auth Platform -> **Branding -> Authorized domains** bo‘limiga ilova ishlaydigan asosiy domeningizni qo‘shing:
- Masalan: `smartteacherbook.uz`
- API subdomeni (`api.smartteacherbook.uz`) va Web ilova (`app.smartteacherbook.uz`) shu ildiz domenga kiradi.

---

## 4. OAuth Client ID larini yaratish

SmartTeacherBook uchta platformada ishlashi mumkin (`Web`, `Android`, `iOS`). Barcha client ID lar **bitta Google Cloud loyiha** ichida yaratilishi kerak!

### 4.1. Web Client ID (Expo Web + Backend Verifier + Android `webClientId`)

**Google Auth Platform -> Clients -> Create Client -> Web application**

- **Name**: `SmartTeacherBook Web Client`
- **Authorized JavaScript origins**:
  - Development:
    - `http://localhost:8081`
    - `http://127.0.0.1:8081`
    - `http://localhost:5173` (Admin panel uchun kerak bo‘lsa)
  - Production:
    - `https://app.smartteacherbook.uz`
    - `https://smartteacherbook.uz`
- **Authorized redirect URIs**:
  - Development:
    - `http://localhost:8081`
    - `http://localhost:4000/api/v1/auth/google/callback` (agar authorization code redirect ishlatilsa)
    - `postmessage` (popup flow uchun)
  - Production:
    - `https://app.smartteacherbook.uz`
    - `https://api.smartteacherbook.uz/api/v1/auth/google/callback`

Yaratilgan **Client ID** (`...apps.googleusercontent.com`) va **Client Secret** ni saqlab oling.

> **MUHIM XAVFSIZLIK QOIDASI**: `GOOGLE_CLIENT_SECRET` **faqat NestJS backend (`.env` / server secrets)** da saqlanadi! Frontend (`apps/mobile`, `apps/admin`) fayllariga va GitHub repository ga **hech qachon** joylanmaydi.

### 4.2. Android OAuth Client ID (Android ilova uchun)

**Create Client -> Android**
- **Package name**: `com.smartteacherbook.app` (`apps/mobile/app.json` -> `expo.android.package`)
- **SHA-1 certificate fingerprint**:
  - Debug keystore:
    ```bash
    keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
    ```
  - Release / Google Play App Signing SHA-1 ni ham alohida Android client sifatida qo‘shing.
- Eslatma: `@react-native-google-signin/google-signin` ID token qaytarishi uchun ilovada `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ga **Web Client ID** beriladi (`Android Client ID` esa SHA-1 imzosini tasdiqlaydi).

### 4.3. iOS OAuth Client ID (iOS ilova uchun)

**Create Client -> iOS**
- **Bundle ID**: `com.smartteacherbook.app` (`apps/mobile/app.json` -> `expo.ios.bundleIdentifier`)
- Olingan iOS Client ID ni `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` va `GOOGLE_IOS_CLIENT_ID` ga qo‘ying.

---

## 5. Environment Variables (`.env`) ni ulash

Loyihada barcha haqiqiy `.env` fayllar `.gitignore` bilan himoyalangan (`.env.example` faqat namuna uchun):

### 5.1. Backend (`apps/api/.env` yoki ildiz `.env`)

```env
NODE_ENV="development"

# Google OAuth / OIDC Backend Verification (GoogleTokenVerifierService)
GOOGLE_CLIENT_ID="1234567890-webclientid.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret-backend-only"
GOOGLE_WEB_CLIENT_ID="1234567890-webclientid.apps.googleusercontent.com"
GOOGLE_ANDROID_CLIENT_ID=""
GOOGLE_IOS_CLIENT_ID=""

# JWT Signing Secrets (min 32+ tasodifiy belgi)
JWT_SECRET="replace-with-random-64-char-hex-secret"
JWT_ACCESS_SECRET="replace-with-same-or-dedicated-64-char-hex-secret"
JWT_REFRESH_SECRET="replace-with-separate-random-64-char-hex-secret"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="90d"
```

### 5.2. Frontend (`apps/mobile/.env`)

```env
EXPO_PUBLIC_API_URL="http://localhost:4000"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="1234567890-webclientid.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=""
```

> Eslatma: Frontend `EXPO_PUBLIC_*` o‘zgaruvchilarida **faqat ochiq Client ID** bo‘ladi — hech qachon `CLIENT_SECRET` yoki `JWT_*_SECRET` yozmang.

---

## 6. Development vs Production farqlari

| Parametr | Development | Production |
| :--- | :--- | :--- |
| Frontend Origin | `http://localhost:8081` | `https://app.smartteacherbook.uz` (HTTPS shart) |
| Backend API URL | `http://localhost:4000` | `https://api.smartteacherbook.uz` (HTTPS shart) |
| JWT Secrets | Dev fallback faqat lokal rivojlantirish uchun | **Majburiy**: `JWT_SECRET` / `JWT_REFRESH_SECRET` bo‘lmasa server start bo‘lmaydi |
| `ALLOW_TEST_TOKEN_MOCKING` | O‘chirilgan (`false`) | Har doim bloklangan (`NODE_ENV=production` da e’tiborsiz qoldiriladi) |
| Email SMTP (`GMAIL_USER` / `GMAIL_APP_PASSWORD`) | Majburiy emas (lokal log fallback) | Haqiqiy OTP / tiklash / linking kodlari uchun sozlanadi |

---

## 7. Database Migratsiyasi (PostgreSQL + Prisma)

PostgreSQL ishlayotganda schema o‘zgarishlarini qo‘llash uchun:

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
```
