# Multistage Dockerfile for NestJS API
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@12.16.1

# Copy monorepo configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Build shared package first
RUN pnpm --filter @smartteacherbook/shared build

# Generate Prisma Client & Build API
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@12.16.1

# Install graphicsmagick / pdftoppm / poppler-utils for PDF ingestion pipeline
RUN apk add --no-cache poppler-utils graphicsmagick ffmpeg

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --prod --filter @smartteacherbook/api...

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
