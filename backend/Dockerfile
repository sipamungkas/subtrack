# ============================================
# Subnudge Backend - Dockerfile
# Multi-stage build for optimized production image
# ============================================

# Stage 1: Build the application
FROM oven/bun:1.2-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Build the application
RUN bun build src/index.ts --outdir dist --target bun

# Stage 2: Production image
FROM oven/bun:1.2-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S subnudge -u 1001 -G nodejs

# Copy all node_modules from builder (needed for drizzle-kit migrations)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json for reference
COPY package.json ./

# Copy drizzle config and migrations (needed for db:migrate)
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY --from=builder /app/src/db ./src/db
COPY drizzle ./drizzle

# Copy startup script
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

# Set ownership to non-root user
RUN chown -R subnudge:nodejs /app

# Switch to non-root user
USER subnudge

# Expose port
EXPOSE 3000

# Environment variables (these should be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Health check (use 127.0.0.1 to force IPv4, alpine wget defaults to IPv6)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start the application (runs migrations first, then starts server)
CMD ["./scripts/start.sh"]
