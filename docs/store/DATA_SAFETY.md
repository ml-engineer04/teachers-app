# Google Play Data Safety Questionnaire — SmartTeacherBook

Ushbu hujjat Google Play Console ning **Data Safety (Ma'lumotlar xavfsizligi)** bo'limini to'ldirish uchun rasmiy qo'llanma hisoblanadi.

---

## 1. Umumiy Savollar (Data Collection and Security)

| Savol | Javob | Izoh |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **Yes** | Hisob identifikatsiyasi va qurilma bog'lash uchun minimal ma'lumotlar. |
| **Is all user data collected by your app encrypted in transit?** | **Yes** | Barcha so'rovlar faqat HTTPS / TLS 1.3 orqali amalga oshiriladi. |
| **Do you provide a way for users to request that their data be deleted?** | **Yes** | Sozlamalar menyusi va rasmiy havola orqali hisobni o'chirish ta'minlangan. |

---

## 2. Yig'iladigan Ma'lumotlar Turlari (Data Types Breakdown)

### A. Shaxsiy Ma'lumotlar (Personal Info)
1. **Name (Ism)**:
   - *Yig'iladimi?* Ha (Google Sign-In).
   - *Uchinchi tomon bilan ulashiladimi?* Yo'q.
   - *Qayta ishlanadimi (Ephemeral)?* Yo'q, DB da saqlanadi.
   - *Foydalanuvchi o'chira oladimi?* Ha.
   - *Maqsad*: App functionality (Ilova funksionalligi — o'qituvchi profilida ko'rsatish).

2. **Email Address (Elektron pochta)**:
   - *Yig'iladimi?* Ha.
   - *Uchinchi tomon bilan ulashiladimi?* Yo'q.
   - *Maqsad*: App functionality, Account management.

3. **Phone Number (Telefon raqami)**:
   - *Yig'iladimi?* Ha (Savdo stoli orqali obuna rasmiylashtirishda ixtiyoriy).
   - *Uchinchi tomon bilan ulashiladimi?* Yo'q.
   - *Maqsad*: Account management & customer support.

### B. Qurilma Identifikatorlari (Device or other identifiers)
1. **Device ID (Hardware ID)**:
   - *Yig'iladimi?* Ha.
   - *Uchinchi tomon bilan ulashiladimi?* Yo'q.
   - *Maqsad*: Fraud prevention, security, and compliance (2 ta qurilma limitini ta'minlash va noqonuniy ko'chirishlarning oldini olish).

---

## 3. Bolalar Xavfsizligi (Target Audience and Content)

| Savol | Javob |
| :--- | :--- |
| **Target age group?** | **18 and over** (Ilova faqat maktab o‘qituvchilari va pedagoglar uchun mo‘ljallangan). |
| **Could the app unintentionally appeal to children under 13?** | **No** (Ilova professional o‘qituvchi darsliklari va metodik qo‘llanmalarini o‘z ichiga oladi). |
