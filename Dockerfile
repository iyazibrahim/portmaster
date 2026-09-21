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
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/utils-app.ts ./src/lib/utils-app.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-srs-mvp1.ts ./scripts/apply-srs-mvp1.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/data/photos && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 43127
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
