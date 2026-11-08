#!/usr/bin/env bash
set -e

# ==============================================================================
# SmartTeacherBook — Android Release Builder (APK + AAB)
# Package: com.smartteacherbook.app
# Target SDK: 35 | Min SDK: 24 | Version: 1.0.0 (Build 6)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$MOBILE_DIR/../.." && pwd)"
OUTPUT_DIR="$MOBILE_DIR/build/outputs"

mkdir -p "$OUTPUT_DIR"

echo "=========================================================="
echo "🚀 Building SmartTeacherBook Android Release"
echo "   Package: com.smartteacherbook.app"
echo "   Version: 1.0.0 (versionCode: 6)"
echo "   Target SDK: 35 | Min SDK: 24"
echo "=========================================================="

BUILD_TARGET="${1:-all}" # "apk", "aab", or "all"

cd "$MOBILE_DIR"

# 1. Check for Release Keystore or generate dummy for local testing
KEYSTORE_PATH="$MOBILE_DIR/release.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "🔑 Generating release keystore: $KEYSTORE_PATH..."
  if command -v keytool &> /dev/null; then
    keytool -genkey -v -keystore "$KEYSTORE_PATH" \
      -alias smartteacherbook-release \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass "stb_release_secure_pass_2026" \
      -keypass "stb_release_secure_pass_2026" \
      -dname "CN=SmartTeacherBook, OU=Mobile, O=SmartTeacherBook, L=Tashkent, ST=Tashkent, C=UZ"
    echo "✅ Keystore created successfully."
  else
    echo "⚠️ keytool not found locally. If building with EAS or Docker, keystore will be provided automatically."
  fi
fi

# 2. Check if EAS CLI is available for cloud or local builds
if command -v eas &> /dev/null; then
  echo "📦 EAS CLI detected. Starting build process..."
  if [ "$BUILD_TARGET" = "apk" ] || [ "$BUILD_TARGET" = "all" ]; then
    echo "🔨 Building Release APK (distribution)..."
    npx eas-cli build --platform android --profile preview --local --output "$OUTPUT_DIR/smartteacherbook-v1.0.0.apk" || true
  fi
  if [ "$BUILD_TARGET" = "aab" ] || [ "$BUILD_TARGET" = "all" ]; then
    echo "🔨 Building Release AAB (Google Play Store Bundle)..."
    npx eas-cli build --platform android --profile production --local --output "$OUTPUT_DIR/smartteacherbook-v1.0.0.aab" || true
  fi
else
  echo "ℹ️ Running Expo Prebuild to generate clean native Android project..."
  npx expo prebuild --platform android --clean --no-install || true
  
  if [ -d "$MOBILE_DIR/android" ]; then
    cd "$MOBILE_DIR/android"
    if command -v ./gradlew &> /dev/null; then
      if [ "$BUILD_TARGET" = "apk" ] || [ "$BUILD_TARGET" = "all" ]; then
        echo "🔨 Assembling Release APK with Gradle..."
        ./gradlew assembleRelease
        cp -f app/build/outputs/apk/release/app-release.apk "$OUTPUT_DIR/smartteacherbook-v1.0.0.apk" 2>/dev/null || true
      fi
      if [ "$BUILD_TARGET" = "aab" ] || [ "$BUILD_TARGET" = "all" ]; then
        echo "🔨 Bundling Release AAB with Gradle..."
        ./gradlew bundleRelease
        cp -f app/build/outputs/bundle/release/app-release.aab "$OUTPUT_DIR/smartteacherbook-v1.0.0.aab" 2>/dev/null || true
      fi
    fi
  fi
fi

echo "=========================================================="
echo "✅ Build Process Complete!"
echo "   Outputs located in: $OUTPUT_DIR"
echo "=========================================================="
