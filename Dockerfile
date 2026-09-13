# ══════════════════════════════════════════════════════════════
#  VOCAL MD — o singură imagine pentru web și pentru worker.
#  Se diferențiază prin comandă, nu prin build.
# ══════════════════════════════════════════════════════════════

FROM node:22-alpine AS base
# ffmpeg taie previzualizările; libc6-compat îi trebuie lui Next pe Alpine.
RUN apk add --no-cache ffmpeg libc6-compat
WORKDIR /app

# ─── dependențe ───
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─── build ───
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next validează configurarea la build; valorile reale vin la rulare.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── imaginea finală ───
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S vocal -u 1001

# Serverul standalone al lui Next, fără node_modules complet.
COPY --from=builder --chown=vocal:nodejs /app/.next/standalone ./
COPY --from=builder --chown=vocal:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=vocal:nodejs /app/public ./public

# Worker-ul și migrările rulează din sursă cu tsx, deci au nevoie de node_modules.
COPY --from=deps --chown=vocal:nodejs /app/node_modules ./node_modules
COPY --chown=vocal:nodejs src ./src
COPY --chown=vocal:nodejs drizzle ./drizzle
COPY --chown=vocal:nodejs package.json tsconfig.json drizzle.config.ts ./

# Fișierele audio stau pe un volum, nu în imagine.
RUN mkdir -p /data/audio && chown -R vocal:nodejs /data

USER vocal
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
