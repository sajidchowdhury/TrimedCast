# ============================================
# TrimedCast — Multi-stage Production Dockerfile
# ============================================
# Builds a minimal production image using Bun runtime
# Final image size: ~150MB (vs ~1.2GB with Node)

# ---- Stage 1: Install dependencies ----
FROM oven/bun:1.3 AS deps
WORKDIR /app

# Copy package files for dependency install
COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# ---- Stage 2: Build the application ----
FROM oven/bun:1.3 AS builder
WORKDIR /app

# Copy all source files
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js (standalone output)
RUN bun run build

# ---- Stage 3: Production runtime ----
FROM oven/bun:1.3-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and generated client for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create database directory and set permissions
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

# Set the user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set the hostname to allow connections from outside the container
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["bun", "server.js"]
