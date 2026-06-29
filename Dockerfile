# --- Stage 1: dependencies ---
# Install all deps (including devDeps) so we can build + run Prisma generate.
FROM node:22-bookworm-slim AS deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Stage 2: build ---
# Compile Next.js with `output: "standalone"`, generate the Prisma client,
# and run the TTS asset manifest check. The standalone output copies only
# the runtime + traced server / client bundles into .next/standalone.
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_MOCK=1
WORKDIR /app
COPY tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.* ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
COPY public ./public
RUN pnpm exec prisma generate
RUN pnpm build

# --- Stage 3: runner ---
# Minimal runtime image. Carries the standalone server + static + public
# assets. The DB is mounted at runtime (SQLite file or Postgres URL).
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

# Non-root user.
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + traced node_modules. The Next.js standalone output
# already traces `@prisma/client` + the generated client + the query engine
# binary into standalone/node_modules/.pnpm/.../node_modules/@prisma/client
# + .prisma/client, so we don't need to copy them separately.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Prisma schema (needed for `prisma migrate deploy` at container start;
# @prisma/client + the engine binary are already in standalone/node_modules).
COPY --from=build --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]