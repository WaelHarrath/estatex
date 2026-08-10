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
RUN npm run build -w @estatex/socket

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/socket/dist ./apps/socket/dist
COPY --from=build /app/apps/socket/package.json ./apps/socket/package.json
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
WORKDIR /app/apps/socket
EXPOSE 3001
CMD ["node", "dist/index.js"]
