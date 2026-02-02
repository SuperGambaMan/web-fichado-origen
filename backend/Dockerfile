# ============================================
# Backend Dockerfile - NestJS
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
EXPOSE 3001 9229
CMD ["npm", "run", "start:dev"]

# ============================================
# Build stage
# ============================================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ============================================
# Production stage
# ============================================
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
