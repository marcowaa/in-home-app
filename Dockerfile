# نظام المندوبين - إدارة الشحن والتوصيل
# Multi-stage Dockerfile for production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm install --ignore-scripts=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install production dependencies only + drizzle-kit for schema push
RUN npm install --omit=dev --ignore-scripts=false && \
  npm install drizzle-kit tsx

# Copy built dist folder from builder (contains compiled server and client)
COPY --from=builder /app/dist ./dist

# Copy drizzle config and schema for schema push at startup
COPY drizzle.config.ts ./
COPY shared ./shared
COPY tsconfig.json ./

# Copy startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the application port
EXPOSE 5000

# Health check (increased start_period to allow schema push)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/settings || exit 1

# Start with entrypoint that runs schema push then app
CMD ["./docker-entrypoint.sh"]
