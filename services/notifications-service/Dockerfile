FROM node:20-alpine AS builder

WORKDIR /app
COPY services/notifications-service/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S fusion && adduser -S fusion -G fusion

COPY --from=builder /app/node_modules ./node_modules
COPY services/notifications-service/server.js ./server.js
COPY services/notifications-service/package.json ./package.json

USER fusion
EXPOSE 8004

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8004/health/live || exit 1

CMD ["node", "server.js"]
