# 🚀 Ilmçi Platform — Ishlab Chiqarishga (Production) Chiqarish Qo‘llanmasi

Ushbu qo‘llanma **Ilmçi** ta’lim platformasini (Veb platforma, Admin panel, Backend API va Mobil ilova) tanlangan **2 slices (4 GB RAM, 80 GB SSD, 4000 GB Bandwidth)** VPS serveriga joylashtirish va sozlash bo‘yicha to‘liq ko‘rsatmalarni o‘z ichiga oladi.

---

## 1. Server Parametrlari va Quvvat Tahlili

* **Server konfiguratsiyasi:** 2 Slices VPS
* **Operativ xotira (RAM):** 4 GB
* **Doimiy xotira (Disk):** 80 GB SSD / NVMe
* **Oylik Trafik (Bandwidth):** 4000 GB (4 TB)
* **Tavsiya etilgan OT:** Ubuntu 22.04 LTS yoki Ubuntu 24.04 LTS

### Resurslar Taqsimoti:
| Xizmat | RAM sarfi | Vazifasi |
| :--- | :--- | :--- |
| **Linux OS & System** | ~250 MB | Operatsion tizim yadrosi va xavfsizlik |
| **Nginx Web Server** | ~40 MB | Statik fayllar (Veb + Admin) va SSL Reverse Proxy |
| **NestJS API (Node.js/PM2)** | ~300 MB | REST API, JWT sessiyalar, PDF render, audio oqimi |
| **PostgreSQL Ma’lumotlar bazasi** | ~250 MB | Foydalanuvchilar, darsliklar, obunalar va jurnallar |
| **Bo‘sh qoladigan zaxira RAM** | **~3.1 GB** | Katta yangilanishlar va birdaniga ko‘p so‘rovlar uchun |

> [!NOTE]
> Ushbu server konfiguratsiyasi dastlabki 10 ta o‘qituvchi bilan test qilishdan tortib, **100–300 tagacha doimiy faol o‘qituvchilarga** barqaror xizmat ko‘rsatish quvvatiga ega.

---

## 2. Domen va Subdomen Marshrutizatsiyasi

Loyihamizda Teacher Web va Admin Panel yagona port orqali integratsiya qilingan:
* **Asosiy portal (O‘qituvchilar):** `https://ilmchi.uz` (yoki `https://www.ilmchi.uz`)
* **Admin portali:** `https://admin.ilmchi.uz`
* **Backend API:** `https://api.ilmchi.uz/api/v1`

---

## 3. Serverni Dastlabki Sozlash (Step-by-step)

### 3.1. Kerakli paketlarni o‘rnatish
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git nginx postgresql postgresql-contrib ufw

# Node.js 20.x LTS o‘rnatish
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm pm2
```

### 3.2. PostgreSQL ma’lumotlar bazasini yaratish
```bash
sudo -u postgres psql
CREATE DATABASE ilmchi_db;
CREATE USER ilmchi_admin WITH ENCRYPTED PASSWORD 'KUCHLI_PAROL_BU_YERGA';
GRANT ALL PRIVILEGES ON DATABASE ilmchi_db TO ilmchi_admin;
\q
```

---

## 4. Loyihani Serverga Yuklash va Yig‘ish (Build)

```bash
cd /var/www
git clone git@github.com:ml-engineer04/teachers-app.git ilmchi
cd ilmchi

# Paketlarni o‘rnatish
pnpm install --frozen-lockfile

# Prisma migratsiya
cd apps/api
npx prisma generate
npx prisma migrate deploy
cd ../..

# Web va API ni build qilish
pnpm build
```

---

## 5. PM2 orqali Backendni Ishga Tushirish

Loyihaning ildiz papkasida `ecosystem.config.js` faylini yarating:
```javascript
module.exports = {
  apps: [
    {
      name: 'ilmchi-api',
      cwd: '/var/www/ilmchi/apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_URL: 'postgresql://ilmchi_admin:KUCHLI_PAROL@localhost:5432/ilmchi_db?schema=public',
        JWT_SECRET: 'PROD_MAXFIY_JWT_KEY_MIN_32_CHARACTERS',
        CORS_ORIGINS: 'https://ilmchi.uz,https://admin.ilmchi.uz',
      },
    },
  ],
};
```

Ishga tushirish:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 6. Nginx Konfiguratsiyasi (Subdomenlar bilan)

`/etc/nginx/sites-available/ilmchi.conf` faylini yarating:

```nginx
# 1. API - api.ilmchi.uz
server {
    server_name api.ilmchi.uz;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 250M;
    }
}

# 2. Web & Admin - ilmchi.uz & admin.ilmchi.uz
server {
    server_name ilmchi.uz www.ilmchi.uz admin.ilmchi.uz;
    root /var/www/ilmchi/apps/web/dist;
    index index.html;

    client_max_body_size 250M;

    # Statik fayllarni kesh qilish
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # SPA marshrutizatsiya
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Faollashtirish va SSL (HTTPS) sertifikatini olish:
```bash
sudo ln -s /etc/nginx/sites-available/ilmchi.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Bepul SSL sertifikati (Certbot Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ilmchi.uz -d www.ilmchi.uz -d admin.ilmchi.uz -d api.ilmchi.uz
```

---

## 7. Mobil Ilova (.apk) Tarqatish

Ustozlar ilovani yuklab olishi uchun:
1. `apps/mobile` papkasida `.apk` build qilinadi:
   ```bash
   eas build --platform android --profile preview --local
   ```
2. Hosil bo‘lgan `ilmchi.apk` fayli `/var/www/ilmchi/apps/web/dist/downloads/ilmchi.apk` manziliga joylanadi.
3. Ustozlar `https://ilmchi.uz/downloads/ilmchi.apk` havolasi orqali to‘g‘ridan-to‘g‘ri telefoniga yuklab oladilar.

---

## 8. Xulosa va Xavfsizlik

* **UFW Firewall:** Faqat 22 (SSH), 80 (HTTP) va 443 (HTTPS) portlarini ochiq qoldiring.
* **Ma’lumotlar bazasi zaxira nusxasi (Backup):** Har kuni avtomatik zaxira nusxa olish uchun `cron` o‘rnatiladi.
* **2 Slices (4 GB RAM)** serveri ushbu arxitekturada xotirjam, tez va uzluksiz ishlaydi!
