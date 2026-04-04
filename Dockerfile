# ---- Build stage ----
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend package files — run `npm install --no-workspaces` in backend/ after
# changing package.json, then commit package-lock.json (npm ci fails if they drift).
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy shared directory (backend imports from ../shared/)
COPY shared /app/shared

# Copy backend source code
COPY backend /app/backend

# Build NestJS
RUN npx nest build

# ---- Production stage ----
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app/backend

# Production deps (lockfile must match package.json — see builder stage comment)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy built output from builder
COPY --from=builder /app/backend/dist ./dist

# Copy shared (needed at runtime for imports)
COPY --from=builder /app/shared /app/shared

# Expose port
EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend/src/main.js"]
