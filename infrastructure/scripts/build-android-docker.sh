#!/usr/bin/env bash
set -e

# ==============================================================================
# SmartTeacherBook — Dockerized Android Release Builder
# Produces signed APK and AAB inside container without requiring local Java/SDK.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/apps/mobile/build/outputs"

mkdir -p "$OUTPUT_DIR"

echo "=========================================================="
echo "🐳 Building SmartTeacherBook Android Release via Docker"
echo "   Output Destination: $OUTPUT_DIR"
echo "=========================================================="

IMAGE_NAME="smartteacherbook-builder:latest"

# 1. Build builder image
echo "🔨 Building Docker builder image..."
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/infrastructure/docker/Dockerfile.android-builder" "$ROOT_DIR"

# 2. Run container with output mount
echo "🚀 Running builder container..."
docker run --rm \
  -v "$OUTPUT_DIR:/workspace/apps/mobile/build/outputs" \
  "$IMAGE_NAME"

echo "=========================================================="
echo "✅ Build completed successfully!"
echo "   Check $OUTPUT_DIR for .apk and .aab files."
echo "=========================================================="
