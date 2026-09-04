# Multi-stage production Dockerfile for Google Cloud Run
# Stage 1: Build frontend assets and bundle backend server
FROM node:20-slim AS builder
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source files and build
COPY . .
RUN npm run build

# Stage 2: Minimal, secure production runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist

# Security: Run as unprivileged node user
USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
