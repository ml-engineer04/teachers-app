FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm@12.16.1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @smartteacherbook/shared build
RUN pnpm --filter @smartteacherbook/admin build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
