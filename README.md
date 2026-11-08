# SmartTeacherBook

> **Android e-textbook app for teachers (React Native) + NestJS backend + Admin web panel**
> **Holati:** Phase 0–5 To'liq Yakunlandi | Ishlab Chiqarishga Tayyor (Production Ready)

---

## Umumiy Tavsif (Overview)

SmartTeacherBook — O‘zbekiston maktab o‘qituvchilari uchun 1-11 sinf Student's Book, Teacher's Book va Workbook darsliklarini, sahifalarga biriktirilgan audio (Listening) va video darsliklarni, hamda mashq javoblarini (Answer Keys) yagona ilovada birlashtiruvchi professional raqamli darslik platformasi.

O‘qituvchi o‘zi dars beradigan sinf uchun obunani faollashtiradi (30 kun, 90 kun yoki 1 yil), kerakli darsliklar to‘plamini telefoniga yuklab oladi va sinfda yoki internet umuman yo‘q joylarda **100% offlayn** foydalanadi.

---

## Monorepo Arxitekturasi

```text
smartteacherbook/
│
├── apps/
│   ├── mobile/         # React Native (Android SDK 35, Min SDK 24, com.smartteacherbook.app, v1.0.0 Build 6)
│   ├── admin/          # React + Vite + TypeScript (KPIs, Sales Desk, Ingestion, QA, Release Hub)
│   └── api/            # NestJS API, PostgreSQL Prisma ORM, RSA Signer, S3 Ingestion, SES Mailer
│
├── packages/
│   └── shared/         # Shared DTOs, Enums, Constants, i18n (UZ, EN)
│
├── tests/              # 23 ta avtomatlashtirilgan xavfsizlik va offline QA testlari (100% PASS)
│
├── infrastructure/     # Docker, PostgreSQL backup/restore, Dockerized Android builder
│   ├── docker/         # docker-compose.prod.yml, Dockerfile.android-builder
│   └── scripts/        # backup-database.sh, restore-database.sh, build-android-docker.sh
│
├── docs/
│   ├── architecture/   # ARCHITECTURE.md, UI/UX Dizayn hujjati
│   ├── deployment/     # AWS_DEPLOYMENT_GUIDE.md (EC2, S3, SES, RDS)
│   ├── store/          # Google Play STORE_LISTING.md, PRIVACY_POLICY.md, DATA_SAFETY.md, CHECKLIST.md
│   └── handover/       # OPERATIONS_MANUAL.md (Ekspluatatsiya qo'llanmasi)
│
├── docker-compose.yml  # Mahalliy ishlab chiqish konteynerlari
└── package.json        # Unified scripts & test runner
```

---

## Tezkor Ishga Tushirish (Quick Start)

### 1. Barcha paketlarni o'rnatish va shared paketni yig'ish:
```bash
pnpm install
pnpm build:shared
```

### 2. Xavfsizlik & QA Test Paketini Ishga Tushirish:
```bash
pnpm test
# 23/23 ta test 100% muvaffaqiyat bilan o'tadi (Anti-clock tampering, Keystore, RSA, Offline mode)
```

### 3. Jonli Serverlarni Ishga Tushirish:
- **Admin Panel & Release Hub**: `http://localhost:5173`
- **Mobil Ilova Web Simulyatori**: `http://localhost:8081`
- **NestJS REST API & Swagger**: `http://localhost:4000/api/docs`

---

## Ishlab Chiqarish Paketlarini Yig'ish (Production Release)

### 1. Docker Orqali Android APK va AAB Yig'ish (Zero Setup):
Hech qanday mahalliy Java yoki Android SDK o'rnatmasdan, konteyner ichida to'liq imzolangan release paketlarini olish:
```bash
./infrastructure/scripts/build-android-docker.sh
# Chiqish fayllari: apps/mobile/build/outputs/ (smartteacherbook-v1.0.0.apk va .aab)
```

### 2. Ma'lumotlar Bazasini Zaxiralash (Backup):
```bash
./infrastructure/scripts/backup-database.sh
# Gzip arxiv: /var/backups/smartteacherbook/stb_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Falokatdan Tiklash (Disaster Recovery):
```bash
./infrastructure/scripts/restore-database.sh /path/to/stb_backup.sql.gz
```

---

## Google Play Console Hujjatlari
- [Do'kon Tavsifi va Metadatalar](docs/store/STORE_LISTING.md)
- [Maxfiylik Siyosati (Privacy Policy)](docs/store/PRIVACY_POLICY.md)
- [Data Safety Deklaratsiyasi](docs/store/DATA_SAFETY.md)
- [Google Play Chiqarish Cheklisti](docs/store/GOOGLE_PLAY_CHECKLIST.md)
- [Ekspluatatsiya va Admin Qo'llanmasi](docs/handover/OPERATIONS_MANUAL.md)
