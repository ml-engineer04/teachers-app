# ILMCHI MOBILE — AUDIT, ARCHITECTURE & PRODUCTION FIX REPORT

**Date:** November 22, 2026  
**Target Application:** ILMCHI Mobile (`apps/mobile`)  
**Stack:** React Native 0.76.5, Expo SDK 52, TypeScript, Android API 28–35 (Release APK)  
**Security & DRM:** Hardware Keystore AES-256-GCM, RSA-2048, Monotonic Clock, Strict 2-Device Concurrency  
**Test Suite Status:** 69/69 Passing (100%)  

---

## 1. EXECUTIVE SUMMARY

The ILMCHI mobile application provides offline-first, DRM-protected educational textbook and multimedia learning tools for teachers and students across Uzbekistan. While the web frontend and Expo development environment demonstrate complete functionality, the installed standalone Android release APK exhibits specific cross-environment discrepancies, UI layout overflows, authentication failures, and hotspot content retrieval issues.

This report documents the architectural root causes across six critical production issues and four systemic performance bottlenecks, establishing a non-destructive, surgical implementation plan that preserves 100% of the existing security architecture, offline encryption, and database structures.

---

## 2. DETAILED AUDIT & ROOT CAUSE ANALYSIS

### Issue 1: Screen Overflow & System UI Layout

#### 1. Problem Description
On physical Android devices, multiple screens (Home, Grade Detail, Requests, Welcome, Login, Settings, Reader) overlap device status bars, display cutouts (notches/punch holes), and bottom system navigation (gesture navigation bar and 3-button navigation bar). Interactive elements like back buttons, header titles, and bottom navigation tabs are either cut off or occluded behind Android system chrome.

#### 2. Root Cause
- **Ineffective Safe Area Implementation:** Screens throughout `apps/mobile/src/screens/` import `SafeAreaView` from the standard `'react-native'` package. In React Native, the built-in `SafeAreaView` only functions on iOS and evaluates to a standard `View` on Android.
- **Missing Root Provider:** While `react-native-safe-area-context` (`v4.12.0`) is installed in `package.json`, `SafeAreaProvider` is never mounted at the application root in `apps/mobile/App.tsx`.
- **Hardcoded Bottom Nav Padding:** `apps/mobile/src/components/BottomNavigationDock.tsx` hardcodes bottom padding:
  ```typescript
  paddingBottom: Platform.OS === 'ios' ? 24 : 10
  ```
  On Android devices with 3-button or gesture navigation, system navigation bar insets range from 24dp to 48dp, causing system navigation to directly overlap tab labels and touch hit-slops.
- **Unconstrained ScrollView Containers:** Containers lack bottom inset offsets in `contentContainerStyle`, causing the last list items to remain hidden behind the floating bottom dock.

#### 3. Affected Files
- `apps/mobile/App.tsx`
- `apps/mobile/src/components/BottomNavigationDock.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/GradeDetailScreen.tsx`
- `apps/mobile/src/screens/RequestsScreen.tsx`
- `apps/mobile/src/screens/SettingsScreen.tsx`
- `apps/mobile/src/screens/WelcomeScreen.tsx`
- `apps/mobile/src/screens/PinLockScreen.tsx`

#### 4. Proposed Solution
1. Wrap the entire application tree in `App.tsx` with `<SafeAreaProvider>` from `react-native-safe-area-context`.
2. Migrate all screen containers from `SafeAreaView` (`react-native`) to `useSafeAreaInsets` or `SafeAreaView` from `react-native-safe-area-context`.
3. In `BottomNavigationDock.tsx`, inject `useSafeAreaInsets()` dynamically:
   ```typescript
   paddingBottom: Math.max(insets.bottom, 10)
   ```
4. Add `paddingBottom: 80 + insets.bottom` to scrollable containers across Home, Grade Detail, and Requests screens so content is never occluded by the dock.

#### 5. Risk Level & Dependencies
- **Risk:** Low (standard React Native best practice).
- **Dependencies:** `react-native-safe-area-context` already installed.

---

### Issue 2: Book Reader Layout & Safe Navigation

#### 2.1 Problem Description
In `ReaderScreen.tsx`, the top navigation bar (page indicators, search, drawing tools, bookmarks, audio list) collides with the Android status bar and camera punch-hole. The bottom navigation bar (page slider, next/previous buttons, table of contents trigger) overlaps the Android gesture bar. The PDF stage can become misaligned when toolbars are toggled, and annotation sheets can overflow the view.

#### 2.2 Root Cause
- `ReaderScreen.tsx` manually computes dimensions via `Dimensions.get('window')` without factoring in dynamic safe area insets for Android status bars and gesture bars.
- The top header container lacks top padding matching `insets.top`, causing toolbar icons to render under the hardware status bar.
- The bottom reader controls container lacks bottom padding matching `insets.bottom`, positioning page jump buttons directly over the system home indicator.
- The modal drawers (`AnswerKeySheet`, `AudioPlaylistSheet`, `BookmarkSheet`, `NoteSheet`) do not incorporate dynamic inset bounds.

#### 2.3 Affected Files
- `apps/mobile/src/screens/ReaderScreen.tsx`
- `apps/mobile/src/components/AnswerKeySheet.tsx`
- `apps/mobile/src/components/AudioPlaylistSheet.tsx`

#### 2.4 Proposed Solution
1. Consume `useSafeAreaInsets()` in `ReaderScreen.tsx`.
2. Apply `paddingTop: Math.max(insets.top, 12)` to the top reader header.
3. Apply `paddingBottom: Math.max(insets.bottom, 12)` to the bottom reader controls container.
4. Bound `PinchZoomView` and `HotspotLayer` within the calculated available height (`screenHeight - headerHeight - footerHeight - insets.top - insets.bottom`).
5. Ensure modal bottom sheets dynamically adapt their sheet heights and internal scroll padding based on `insets.bottom`.

#### 2.5 Risk Level & Dependencies
- **Risk:** Low. Preserves all page navigation, SVG marker scaling, audio player alignment, and zoom logic.
- **Dependencies:** Validated against existing Reader unit tests (Test 12 & 14).

---

### Issue 3: Admin Panel Visual Hotspot Editor Data Not Displaying in APK

#### 3.1 Problem Description
Hotspots configured in the admin panel Visual Hotspot Editor (answers, audio references, interactive questions) appear correctly in the Web application and in Expo development builds. In the standalone Android release APK, answers do not appear, audio files do not appear or fail to play, and clicking hotspots results in missing data or error alerts.

#### 3.2 Root Cause Analysis
Four compounding factors cause this breakdown in production release builds:
1. **Android Cleartext (HTTP) Blocking:**
   - Production Android API 28+ enforces network security policy rejecting non-HTTPS traffic by default.
   - `apps/mobile/android/app/src/main/AndroidManifest.xml` lacks `android:usesCleartextTraffic="true"`.
   - When connecting to local/staging HTTP servers or media servers without SSL, all network requests for hotspots, media bundles, and audio streams are silently rejected at the Android OS socket level.
2. **Localhost & Hardcoded Web Origin in Hotspot Payloads:**
   - Visual Hotspot Editor on Web frequently saves media URLs pointing to `http://localhost:4000/api/v1/...` or relative paths `/api/v1/...`.
   - In a release APK on a physical Android device, `localhost` resolves to the phone itself (`127.0.0.1`), where no API server is running.
   - In `mobileApi.ts`, `resolveAssetUrl` only replaced `http://localhost:4000`. It did not replace `127.0.0.1`, alternative ports, or relative URLs in nested arrays (`answerImages`, `transcriptImages`).
3. **Strict Type Equality Mismatch on Page Number:**
   - In `ReaderScreen.tsx`, hotspot filtering uses strict equality:
     ```typescript
     const getHotspotsForPage = (pageNum: number) => {
       return hotspots.filter(h => h.pageNumber === pageNum);
     };
     ```
   - When the backend or cached JSON stores `pageNumber` as a string (`"9"`) or from form inputs, `"9" === 9` evaluates to `false`, causing all hotspots for that page to vanish.
4. **Silent Empty Fallbacks in Network Interceptors:**
   - In `mobileApi.ts`, `getBookHotspots`, `getMedia`, `getAnswerMappings`, and `getAnswerKeys` caught errors and silently returned `[]` with only a console log, masking backend connection and serialization failures.
5. **Answer Hotspot Modal Routing:**
   - When pressing an answer hotspot in `ReaderScreen.tsx`, if the answer key has text (`solutionText`) rather than an image URL, the code triggered `FloatingImagePopup` with an empty URI, showing "Rasm mavjud emas" (Image unavailable) while failing to open `AnswerKeySheet`.

#### 3.3 Affected Files
- `apps/mobile/android/app/src/main/AndroidManifest.xml`
- `apps/mobile/src/services/api/mobileApi.ts`
- `apps/mobile/src/screens/ReaderScreen.tsx`
- `apps/mobile/src/components/AnswerKeySheet.tsx`
- `apps/mobile/src/components/FloatingImagePopup.tsx`

#### 3.4 Proposed Solution
1. Add `android:usesCleartextTraffic="true"` to `AndroidManifest.xml` to allow communication with staging/LAN servers.
2. Upgrade `resolveAssetUrl` in `mobileApi.ts` to comprehensively normalize all host variations (`localhost`, `127.0.0.1`, `10.0.2.2`, relative `/api/v1/...`) to the configured `API_ORIGIN`. Recursively sanitize nested asset arrays (`answerImages`, `transcriptImages`).
3. Normalize page comparisons using `Number(h.pageNumber) === pageNum` in `ReaderScreen.tsx`.
4. Fix the answer hotspot tap handler in `ReaderScreen.tsx` to detect whether the answer is image-based or text/key-based, and properly launch `AnswerKeySheet` or `FloatingImagePopup` accordingly.
5. Add fallback to offline cached answer mappings and hotspots when network requests encounter transient connectivity issues.

#### 3.5 Risk Level & Dependencies
- **Risk:** Low-Medium. Thorough test coverage required to ensure offline cache consistency.

---

### Issue 4: Google Authentication in Release APK ("Google Client ID sozlanmagan")

#### 4.1 Problem Description
In the installed Android APK, tapping "Google bilan kirish" displays the error:
`"Google Client ID sozlanmagan. Iltimos, sozlamalarni tekshiring."`

#### 4.2 Root Cause
- In `apps/mobile/src/services/auth/googleWebGis.ts`, `getWebGoogleClientId()` was implemented as:
  ```typescript
  export function getWebGoogleClientId(): string {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
  }
  ```
- In production Gradle builds (generating standalone APKs), `process.env.EXPO_PUBLIC_*` variables are not automatically bundled unless explicitly declared in `app.json` `extra` configuration or baked into the bundle at build time.
- In `googleAuthService.ts`:
  ```typescript
  if (!webClientId) {
    console.warn('[GoogleAuth] Web Client ID not configured');
    return false;
  }
  ```
  Because `webClientId` is empty, initialization aborted and `signIn()` threw the error:
  `"Google Client ID sozlanmagan. Iltimos, sozlamalarni tekshiring."`
- The production Google Web Client ID (`541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com`) was present in `.env` and `apps/web/src/pages/AuthPage.tsx` but was missing from `app.json`.

#### 4.3 Affected Files
- `apps/mobile/app.json`
- `apps/mobile/src/services/auth/googleWebGis.ts`
- `apps/mobile/src/services/auth/googleAuthService.ts`

#### 4.4 Proposed Solution
1. In `apps/mobile/app.json`, declare under `expo.extra`:
   ```json
   "extra": {
     "googleWebClientId": "541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com",
     "googleAndroidClientId": "541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com"
   }
   ```
2. In `googleWebGis.ts`, enhance `getWebGoogleClientId()` to resolve across all viable sources:
   - `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `Constants.expoConfig?.extra?.googleWebClientId`
   - Fallback production client ID constant.
3. Ensure `googleAuthService.ts` correctly verifies initialization and returns clear diagnostic feedback if a network or device error occurs.

#### 4.5 Risk Level & Dependencies
- **Risk:** Low. Preserves existing backend session token verification, 2-device concurrency, and JWT exchange.

---

### Issue 5: Back Button Position Consistency

#### 5.1 Problem Description
Across authentication and secondary screens (Welcome, Login, Register, Forgot Password, PIN Lock, Settings), back buttons appear at inconsistent top offsets, often overlapping the status bar or notch, and exhibit small touch targets (<40dp) making them difficult to tap reliably.

#### 5.2 Root Cause
- Screen headers use arbitrary hardcoded values like `marginTop: 20` or `top: 16` instead of deriving their position from `insets.top`.
- Touch hit-slops and button container dimensions vary between 32dp and 48dp across screens.

#### 5.3 Affected Files
- `apps/mobile/src/screens/WelcomeScreen.tsx`
- `apps/mobile/src/screens/PinLockScreen.tsx`
- `apps/mobile/src/screens/SettingsScreen.tsx`
- Shared navigation header components.

#### 5.4 Proposed Solution
1. Standardize back button layout using a unified pattern:
   - Container `paddingTop: Math.max(insets.top, 16)`.
   - Standard minimum touch hit-box of 44×44dp (`hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`).
   - Consistent horizontal alignment (`paddingHorizontal: 16` or `20`).
2. Apply this pattern across all authentication screens and settings.

#### 5.5 Risk Level & Dependencies
- **Risk:** Low. Pure layout improvement.

---

### Issue 6: Application Logo & Launcher Icons Missing in Installed APK

#### 6.1 Problem Description
After installing the Android APK, the app launcher icon displays the default generic Expo icon or blank placeholder, and brand logos within the application fail to render consistently in release builds.

#### 6.2 Root Cause
- `apps/mobile/assets/icon.png`, `apps/mobile/assets/adaptive-icon.png`, and `apps/mobile/assets/splash.png` were the default Expo starter icons.
- In `apps/mobile/android/app/src/main/res/mipmap-*/`, the launcher icons (`ic_launcher.webp`, `ic_launcher_round.webp`, `ic_launcher_foreground.webp`) were generated from the default template.
- The authentic Ilmchi brand vector exists in `apps/web/public/logo.svg` and `apps/mobile/assets/brand/logo-dark.png` / `logo-light.png` (`#10b981` emerald brand identity).

#### 6.3 Affected Files
- `apps/mobile/app.json`
- `apps/mobile/assets/icon.png`
- `apps/mobile/assets/adaptive-icon.png`
- `apps/mobile/assets/splash.png`
- `apps/mobile/android/app/src/main/res/mipmap-*`
- `apps/mobile/src/components/BrandLogo.tsx`

#### 6.4 Proposed Solution
1. Render high-resolution PNG assets from the authentic Ilmchi brand logo for `icon.png` (1024×1024), `adaptive-icon.png` (1024×1024 with transparent padding), and `splash.png`.
2. Generate all Android launcher mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) for standard, round, and foreground adaptive icons.
3. Configure `app.json` with the exact icon paths, `#0f172a` splash background, and `#ffffff` adaptive background.
4. Verify `BrandLogo.tsx` reliably handles image source resolution across development and release modes.

#### 6.5 Risk Level & Dependencies
- **Risk:** Low. Pure asset and resource update.

---

### Additional Performance Optimizations (From Audit)

To resolve the systemic UI thread frame drops and touch latency identified during the performance audit, the following surgical optimizations will be included:
1. **Remove Global Touch Interceptor in `App.tsx`:** Remove `onMoveShouldSetResponderCapture={() => false}` from root container, restoring native scrolling performance across lists and PDF reader.
2. **Windowed PDF Page Rendering in `ReaderScreen.tsx`:** Limit active page views to `currentPage ± 2` rather than rendering 100+ pages simultaneously.
3. **Context Memoization:** Memoize context values in `ThemeProvider.tsx` and `I18nProvider.tsx` using `useMemo` to eliminate cascading re-renders across the entire component tree.
4. **Zero-Latency Tab Switching in `BottomNavigationDock.tsx`:** Switch active screen tab immediately on user tap without awaiting asynchronous subscription checks.

---

## 3. IMPLEMENTATION ROADMAP & EXECUTION ORDER

| Step | Scope | Target Files | Verification Method |
|---|---|---|---|
| **Step 1** | Safe Area & Global Layout (Issues 1 & 5) | `App.tsx`, `BottomNavigationDock.tsx`, `HomeScreen.tsx`, `GradeDetailScreen.tsx`, `RequestsScreen.tsx`, `WelcomeScreen.tsx`, `PinLockScreen.tsx`, `SettingsScreen.tsx` | Layout inspection, inset verification, TypeScript check |
| **Step 2** | Book Reader Layout (Issue 2) | `ReaderScreen.tsx`, `AnswerKeySheet.tsx`, `AudioPlaylistSheet.tsx` | Run reader tests (12 & 14), verify viewport geometry |
| **Step 3** | Hotspot Editor Data, Answers & Audio (Issue 3) | `AndroidManifest.xml`, `mobileApi.ts`, `ReaderScreen.tsx`, `AnswerKeySheet.tsx` | Media resolution unit tests, cleartext manifest flag verification |
| **Step 4** | Google Authentication in APK (Issue 4) | `app.json`, `googleWebGis.ts`, `googleAuthService.ts` | Run Google Auth security suite (Test 7), client ID resolution |
| **Step 5** | Android App Icon & Logo (Issue 6) | `assets/*`, `android/app/src/main/res/mipmap-*`, `app.json`, `BrandLogo.tsx` | Asset file integrity, density checks |
| **Step 6** | Systemic Performance Optimizations | `App.tsx`, `ReaderScreen.tsx`, `ThemeProvider.tsx`, `I18nProvider.tsx`, `BottomNavigationDock.tsx` | Run full test suite `pnpm test` |
| **Step 7** | Full Build & Release APK Verification | `scripts/build-apk-docker.sh` | Successful Gradle build, release APK in `dist-apk/` |

---

## 4. CONCLUSION & READINESS

This plan directly addresses all reported symptoms while maintaining strict backward compatibility with existing backend APIs, offline databases, and cryptographic guarantees. Upon approval, Phase 3 implementation will proceed according to the ordered roadmap.
