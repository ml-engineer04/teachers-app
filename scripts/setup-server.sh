#!/usr/bin/env bash
set -e

# ==============================================================================
# Ilmçi (ilmchi.uz) — New Ubuntu Server Initial Setup Script
# Recommended OS: Ubuntu 22.04 LTS / Ubuntu 24.04 LTS (4GB RAM, 80GB SSD)
# ==============================================================================

echo "🌟 [Ilmçi Setup] Initializing Ubuntu Server Setup..."

# 1. Update OS packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx postgresql postgresql-contrib ufw certbot python3-certbot-nginx

# 2. Install Node.js 20.x LTS
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 20.x LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# 3. Install PNPM and PM2 globally
sudo npm install -g pnpm pm2

# 4. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 5. Nginx Configuration
echo "🌐 Configuring Nginx..."
if [ -f "/var/www/ilmchi/infrastructure/nginx/ilmchi.conf" ]; then
  sudo cp /var/www/ilmchi/infrastructure/nginx/ilmchi.conf /etc/nginx/sites-available/ilmchi.conf
  sudo ln -sf /etc/nginx/sites-available/ilmchi.conf /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "✅ [Ilmçi Setup] Server packages and firewall setup complete!"
echo "👉 Next steps:"
echo "1. Configure PostgreSQL user & database (ilmchi_db)"
echo "2. Set up /var/www/ilmchi/.env from .env.example"
echo "3. Run /var/www/ilmchi/scripts/deploy.sh"
echo "4. Issue SSL: sudo certbot --nginx -d ilmchi.uz -d www.ilmchi.uz -d admin.ilmchi.uz -d api.ilmchi.uz"
