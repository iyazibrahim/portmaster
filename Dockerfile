# syntax=docker/dockerfile:1

# --- single full install (avoid parallel npm ci OOM on small VPS) ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Prod modules derived from deps (no second full install)
FROM deps AS prod-deps
RUN npm prune --omit=dev

# --- build Next.js (standalone) ---
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL=postgresql://tiangpass:tiangpass@postgres:5432/tiangpass
ARG AUTH_SECRET=build-time-placeholder
ARG APP_URL=http://localhost:43127
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV APP_URL=$APP_URL
# Keep heap under ~1.5G so a 4GB VPS can build while Postgres/OS still fit
ARG NODE_MAX_OLD_SPACE_SIZE=1536
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}
# Cap webpack/Next parallelism to reduce peak RSS
ENV NEXT_CPU_COUNT=1
RUN npm run build -- --webpack

# --- production runner ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=43127
ENV HOSTNAME=0.0.0.0
# Runtime heap cap (~512MB) for 4GB hosts
ENV NODE_OPTIONS=--max-old-space-size=512

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# standalone output omits public/; must sit next to server.js for static + brand assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN test -f ./public/brand/tiangpass-logo.png \
 && test -f ./public/brand/tiangpass-scene-brush.png \
 && test -f ./public/icons/icon-192.png \
 && test -f ./public/icons/icon-512.png

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/utils-app.ts ./src/lib/utils-app.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-srs-mvp1.ts ./scripts/apply-srs-mvp1.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/ensure-demo-ops.ts ./scripts/ensure-demo-ops.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/data/photos && chown -R nextjs:nodejs /app/data \
 && chmod +x ./docker-entrypoint.sh

# Entrypoint starts as root to chown the photos volume, then drops to nextjs.
USER root
EXPOSE 43127
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
