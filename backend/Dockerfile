# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy prisma schema first (needed for generate)
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS
RUN npx nest build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend/src/main.js"]
