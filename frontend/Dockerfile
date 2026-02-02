# ============================================
# Frontend Dockerfile - Next.js
# Multi-stage build for development and production
# ============================================

# ============================================
# Base stage
# ============================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ============================================
# Development stage
# ============================================
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ============================================
# Build stage
# ============================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
