# Google Play Console Ishga Tushirish Cheklisti (Launch Checklist)

SmartTeacherBook ilovasini Google Play Console ga joylashtirish va muvaffaqiyatli moderatsiyadan o'tkazish bo'yicha qadam-baqadam yo'riqnoma:

---

## 1. Dastlabki Texnik Tekshiruv (Technical Readiness)
- [x] **Package Name**: `com.smartteacherbook.app` (Yagona va o'zgarmas).
- [x] **Version Code**: `6` (Google Play talablariga mos).
- [x] **Version Name**: `1.0.0`.
- [x] **Min SDK**: `24` (Android 7.0 Nougat va undan yuqori qurilmalarni 98%+ qamrab oladi).
- [x] **Target SDK**: `35` (Google Play 2025/2026 eng so'nggi API talabi).
- [x] **Compile SDK**: `35`.
- [x] **App Bundle (AAB)**: Google Play talabi bo'yicha ishlab chiqildi (`buildType: "app-bundle"`).
- [x] **Keystore**: RSA-2048 xavfsiz kalit bilan imzolandi.
- [x] **FLAG_SECURE**: Skrinshot va noqonuniy ekran yozuvlariga qarshi himoyalangan.
- [x] **ProGuard / R8**: Shrink resources va code obfuscation faollashtirilgan.

---

## 2. Google Play Console Sozlamalari (Store Setup)
- [ ] **App Integrity (Play App Signing)**:
  - Google Play avtomatik kalit boshqaruvini faollashtiring.
- [ ] **Data Safety Bo'limi**:
  - `docs/store/DATA_SAFETY.md` dagi tayyor javoblarni nusxalab kiriting.
- [ ] **Privacy Policy Havolasi**:
  - `https://smartteacherbook.uz/privacy` havolasini kiriting.
- [ ] **Target Audience**:
  - "18 and over" (Faqat o'qituvchilar).
- [ ] **Store Listing**:
  - `docs/store/STORE_LISTING.md` dagi O'zbek va Ingliz tillaridagi tavsiflarni joylang.
  - 512x512 App Icon va 1024x500 Feature Graphic rasmlarini yuklang.
  - Kamida 4 ta telefon va 1 ta planshet skrinshotini joylang.

---

## 3. Moderatsiya uchun Test Hisobi (App Access Credentials)
Google Play tekshiruvchilari (reviewers) ilovani sinab ko'rishlari uchun maxsus test hisobini taqdim eting:
- **Kirish turi**: Telefon raqami yoki Test Google Akkaunt.
- **Login**: `reviewer@smartteacherbook.uz`
- **Parol / Kod**: `123456`
- **Faollashtirilgan sinflar**: 10-sinf (Student's Book, Teacher's Book, Workbook, 3 ta audio trek, 1 ta video darslik va mashq javoblari yuklab olingan holatda taqdim etiladi).

---

## 4. Chiqarish Bosqichlari (Release Tracks)
1. **Internal Testing**:
   - Dastlabki `.aab` faylini yuklang va ichki test guruhi (5-10 kishi) orqali tekshiring.
2. **Closed Testing (Alpha/Beta)**:
   - 20 nafar haqiqiy maktab o'qituvchisiga 14 kunlik sinov imkoniyatini bering.
3. **Production Rollout**:
   - Bosqichma-bosqich tarqatish (Staged Rollout):
     - 1-kun: 10%
     - 2-kun: 25%
     - 3-kun: 50%
     - 5-kun: 100% to'liq nashr.
