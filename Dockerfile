# syntax=docker/dockerfile:1

# --- deps: cached full install (for Next build) ---
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# --- production node_modules (app + boot scripts: postgres, drizzle, bcrypt) ---
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

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
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build -- --webpack

# --- production runner ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=43127
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone server files (server.js, .next, minimal layout)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Replace/overlay with full prod deps so boot scripts can `import 'postgres'`
# (Next standalone tracing omits packages only used by /scripts + seed)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package.json ./package.json

COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/utils-app.ts ./src/lib/utils-app.ts
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-srs-mvp1.ts ./scripts/apply-srs-mvp1.ts
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 43127
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
