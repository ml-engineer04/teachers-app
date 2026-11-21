#!/usr/bin/env bash
set -e

echo "=================================================="
echo "🚀 Ilmchi Mobile: Docker orqali APK yig'ish"
echo "=================================================="

# 1. Native android papkasi mavjudligini tekshirish
if [ ! -d "apps/mobile/android" ]; then
  echo "📦 Native Android loyihasi generatsiya qilinmoqda..."
  cd apps/mobile && npx expo prebuild --platform android --no-install && cd ../..
fi

# 2. Docker imijini yaratish
echo "🐳 Docker builder imiji tayyorlanmoqda..."
docker build -t ilmchi-android-builder -f apps/mobile/Dockerfile.android .

# 3. APK ni yig'ish va dist-apk papkasiga chiqarish
mkdir -p dist-apk
echo "⚙️  Gradle assembleRelease ishga tushmoqda..."
docker run --rm \
  -v "$(pwd)":/workspace \
  -v "${HOME}/.gradle":/root/.gradle \
  ilmchi-android-builder

echo ""
echo "=================================================="
echo "🎉 APK muvaffaqiyatli tayyorlandi!"
echo "📂 Fayl joylashuvi: dist-apk/"
ls -lh dist-apk/*.apk 2>/dev/null || true
echo "=================================================="
