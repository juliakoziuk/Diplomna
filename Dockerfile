# One image, one service: the NestJS backend also serves the built React frontend
# (from /app/public), so the app lives on a single domain and the httpOnly session
# cookies work without any cross-site setup.
#
# Build context is the repository root:  docker build -t anchorproof .

# ---- 1. frontend (depends on the local verification-sdk package) ----
FROM node:20-bookworm-slim AS frontend
WORKDIR /app

COPY verification-sdk/package*.json verification-sdk/tsconfig.json ./verification-sdk/
RUN cd verification-sdk && npm ci
COPY verification-sdk/src ./verification-sdk/src
RUN cd verification-sdk && npm run build

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
# No VITE_API_URL: the browser talks to the same origin that served the page
RUN cd frontend && npm run build

# ---- 2. backend ----
FROM node:20-bookworm-slim AS backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

# ---- 3. runtime ----
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend /app/backend/dist ./dist
COPY backend/migrations ./migrations
COPY backend/scripts/migrate.js ./scripts/migrate.js
COPY backend/public ./public
COPY --from=frontend /app/frontend/dist/ ./public/

USER node
EXPOSE 3000
# Migrations are idempotent (tracked in "_Migration"), so running them on every start is safe
CMD ["sh", "-c", "node scripts/migrate.js && node dist/main"]
