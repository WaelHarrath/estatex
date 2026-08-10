# ---- base ----
FROM node:24-alpine AS base
WORKDIR /app

# ---- deps + build ----
FROM base AS build
COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --workspaces
RUN npm run build -w @estatex/core
RUN npm run build -w @estatex/web

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
