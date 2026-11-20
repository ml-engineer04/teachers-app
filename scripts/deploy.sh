#!/usr/bin/env bash
set -e

# ==============================================================================
# Ilmçi (ilmchi.uz) Production Deploy Script
# ==============================================================================

echo "🚀 [Ilmçi Deploy] Starting production deployment..."

APP_DIR="/var/www/ilmchi"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
fi

# 1. Update source code
if [ -d ".git" ]; then
  echo "📥 [1/5] Pulling latest git changes..."
  git pull origin main || true
fi

# 2. Install dependencies
echo "📦 [2/5] Installing dependencies with PNPM..."
pnpm install

# 3. Database migrations (Prisma)
echo "🗄️ [3/5] Running Prisma generate & migrations..."
cd apps/api
npx prisma generate
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy || true
fi
cd ../..

# 4. Production Build
echo "⚙️ [4/5] Building all packages (Shared, API, Web)..."
pnpm build

# Ensure downloads folder exists for APK distribution
mkdir -p apps/web/dist/downloads

# 5. Reload Services
echo "🔄 [5/5] Reloading PM2 backend and Nginx..."
if command -v pm2 &> /dev/null; then
  pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

if command -v nginx &> /dev/null; then
  sudo nginx -t && sudo systemctl reload nginx || true
fi

echo "✅ [Ilmçi Deploy] Production deployment successfully completed!"
