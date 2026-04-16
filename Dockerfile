FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run db:generate && npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Script ligero de sincronización de esquema (usa PrismaClient, no el CLI)
# Usa el cliente generado en el builder stage (binario Linux Alpine correcto)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY db/scripts/db-sync.cjs ./db-sync.cjs

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
