# Multi-stage Dockerfile for Fusion Web Operations Console & API Engine
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy source and build
COPY . .
RUN npm run build

# Production minimal runner stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S fusion && adduser -S fusion -G fusion

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV PORT=3000
ENV NODE_ENV=production
USER fusion
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/ready || exit 1

CMD ["node", "dist/server.cjs"]
