# AWS Production & Staging Deployment Guide — SmartTeacherBook

This guide details how to deploy the **SmartTeacherBook** backend (NestJS API, PostgreSQL, Redis) and Admin Panel to AWS.

The architecture is designed so that you can start on an economical single EC2 instance using Docker Compose for staging/initial launch, and transition to a multi-AZ managed setup (AWS RDS, ElastiCache, ECS/Fargate, CloudFront) strictly via environment variables—with **zero code changes**.

---

## 1. Prerequisites & AWS Infrastructure Overview

| Component | Initial Setup (Cost-Effective) | Production Scale Setup |
|---|---|---|
| **Compute** | AWS EC2 (t4g.small or t3.medium, Ubuntu 24.04 LTS) | AWS ECS Fargate or EKS |
| **Database** | Dockerized PostgreSQL 16 (on EC2 NVMe/EBS) | AWS RDS PostgreSQL 16 Multi-AZ |
| **Cache/Queue** | Dockerized Redis 7 Alpine | AWS ElastiCache for Redis |
| **Object Storage**| AWS S3 (`smartteacherbook-content-prod`) | AWS S3 + AWS CloudFront CDN |
| **Email (Alerts)**| AWS SES (Simple Email Service) | AWS SES (Dedicated IP / Domain DKIM) |
| **SSL / TLS** | Let's Encrypt Certbot via Nginx Reverse Proxy | AWS Certificate Manager (ACM) + ALB |

---

## 2. Generating Cryptographic RSA License Keys

Before deploying, generate an RSA-2048 (or RSA-4096) keypair. The private key resides **only** on the backend server to sign offline access tokens. The public key is bundled into the Android mobile app.

```bash
# 1. Generate private key
openssl genpkey -algorithm RSA -out license_private_key.pem -pkeyopt rsa_keygen_bits:2048

# 2. Extract public key
openssl rsa -pubout -in license_private_key.pem -out license_public_key.pem
```

Store `license_private_key.pem` contents in the `LICENSE_PRIVATE_KEY_PEM` environment variable (or AWS Secrets Manager).

---

## 3. AWS S3 Bucket & CORS Configuration

1. Create an S3 Bucket: `smartteacherbook-content-prod` (Block all public access enabled).
2. Attach CORS Configuration to allow presigned uploads and Admin Panel WebP previews:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "https://admin.smartteacherbook.com",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

3. IAM Policy for API Instance:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::smartteacherbook-content-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 4. Environment Variables Checklist (.env)

Create `.env` on the server:

```env
# Application
NODE_ENV=production
PORT=4000
API_PUBLIC_URL=https://api.smartteacherbook.com
ADMIN_PANEL_URL=https://admin.smartteacherbook.com

# Database (PostgreSQL)
POSTGRES_USER=stb_prod_user
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
POSTGRES_DB=smartteacherbook_prod
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Secrets (min 32 chars)
JWT_ACCESS_SECRET=<64_CHAR_HEX_SECRET>
JWT_REFRESH_SECRET=<64_CHAR_HEX_SECRET>

# Asymmetric License Signer (RSA PEM format base64 or raw string)
LICENSE_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...-----END PRIVATE KEY-----"
LICENSE_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOC...-----END PUBLIC KEY-----"

# AWS S3 Storage
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=<YOUR_IAM_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_IAM_SECRET_KEY>
AWS_S3_BUCKET_NAME=smartteacherbook-content-prod

# AWS SES Email Alerts
SES_FROM_EMAIL=no-reply@smartteacherbook.com
ADMIN_ALERT_EMAILS=superadmin@smartteacherbook.com,sales@smartteacherbook.com
```

---

## 5. Deployment Commands (Single-Instance EC2)

```bash
# 1. Update OS & Install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git

# 2. Clone Repository
git clone https://github.com/your-org/smartteacherbook.git /opt/smartteacherbook
cd /opt/smartteacherbook

# 3. Copy Production .env
cp .env.example .env
nano .env  # fill in production secrets

# 4. Build and Start Services
docker compose up -d --build

# 5. Run Prisma Database Migrations & Seeds
docker compose exec api npx prisma migrate deploy
docker compose exec api npx ts-node prisma/seed.ts

# 6. Verify Services Status
docker compose ps
docker compose logs -f api
```

---

## 6. Nginx Reverse Proxy & SSL (Certbot)

Place an Nginx configuration in `/etc/nginx/sites-available/smartteacherbook`:

```nginx
server {
    server_name api.smartteacherbook.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name admin.smartteacherbook.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Issue SSL certificates with Let's Encrypt:
```bash
sudo certbot --nginx -d api.smartteacherbook.com -d admin.smartteacherbook.com
```

---

## 7. Zero-Downtime Migration to Larger Architecture

When scaling to tens of thousands of active teachers:

1. **Database**: Spin up an **AWS RDS PostgreSQL** instance, take a `pg_dump` of the EC2 database, restore to RDS, and update `DATABASE_URL` in `.env`.
2. **Caching & Queues**: Spin up an **AWS ElastiCache Redis** cluster, update `REDIS_HOST` in `.env`.
3. **Containers**: Move the Docker containers to **AWS ECS with Fargate**.
4. **Content Delivery**: Add **AWS CloudFront** in front of the S3 bucket to provide edge caching of WebP images and media across Central Asia.
