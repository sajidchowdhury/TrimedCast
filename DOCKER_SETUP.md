# TrimedCast — Local Setup Guide with Docker

> **Clone → Configure → Run — That's it.**

This guide walks you through running the complete TrimedCast system on your local machine using Docker. No Node.js, Bun, or any other runtime needs to be installed — Docker handles everything.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start (3 Commands)](#2-quick-start-3-commands)
3. [Step-by-Step Setup](#3-step-by-step-setup)
4. [Configuration Options](#4-configuration-options)
5. [Running in Development Mode](#5-running-in-development-mode)
6. [Accessing the Application](#6-accessing-the-application)
7. [Database Management](#7-database-management)
8. [Troubleshooting](#8-troubleshooting)
9. [Production Deployment Notes](#9-production-deployment-notes)
10. [Architecture Overview](#10-architecture-overview)

---

## 1. Prerequisites

You need **only two things** installed on your machine:

| Software | Minimum Version | Download |
|----------|----------------|----------|
| **Docker** | 24.0+ | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

### Verify Installation

```bash
docker --version       # Should show 24.x or higher
docker compose version # Should show v2.x or higher
git --version          # Should show 2.30+
```

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 cores | 4 cores |
| Disk | 2 GB free | 5 GB free |
| OS | Linux, macOS, Windows (WSL2) | Linux/macOS |

---

## 2. Quick Start (3 Commands)

```bash
# 1. Clone the repository
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast

# 2. Build and start (production mode)
docker compose up --build -d

# 3. Open in browser
# → http://localhost:3000
```

**That's it.** The application will be running at `http://localhost:3000`.

The first build takes ~3-5 minutes (downloading base image + installing dependencies + building). Subsequent starts take ~5 seconds.

---

## 3. Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/sajidchowdhury/TrimedCast.git
cd TrimedCast
```

### Step 2: Configure Environment (Optional)

The `docker-compose.yml` already has sensible defaults. For production use, create a `.env` file:

```bash
# Create .env file for production secrets
cat > .env << 'EOF'
# NextAuth secret — generate a new one for production!
# Run: openssl rand -base64 32
NEXTAUTH_SECRET=trimedcast-secret-change-me-in-production

# Public URL of your deployment
NEXTAUTH_URL=http://localhost:3000
EOF
```

> **Important:** For any public deployment, generate a real secret:
> ```bash
> openssl rand -base64 32
> ```

### Step 3: Build and Start

```bash
# Build the Docker image and start the container
docker compose up --build -d
```

You'll see output like:
```
[+] Building 45.2s (12/12) FINISHED
[+] Running 2/2
 ✔ Network trimedcast-network  Created
 ✔ Container trimedcast-app    Started
```

### Step 4: Verify It's Running

```bash
# Check container status
docker compose ps

# Expected output:
# NAME              STATUS          PORTS
# trimedcast-app    Up (healthy)    0.0.0.0:3000->3000/tcp
```

### Step 5: View Logs (Optional)

```bash
# Follow application logs
docker compose logs -f

# Or just see the last 50 lines
docker compose logs --tail 50
```

### Step 6: Open in Browser

Navigate to: **http://localhost:3000**

You'll see the TrimedCast Product Catalog & Inventory Intelligence Dashboard with Session 28 badge.

---

## 4. Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `DATABASE_URL` | `file:/app/db/trimedcast.db` | SQLite database path (inside container) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public URL for auth callbacks |
| `NEXTAUTH_SECRET` | `trimedcast-secret-change-me-in-production` | Secret for JWT signing |

### Changing the Port

If port 3000 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Access via http://localhost:8080
```

### Using PostgreSQL Instead of SQLite

For production, you may want PostgreSQL. Add this to `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: trimedcast-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: trimedcast
      POSTGRES_USER: trimedcast
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - trimedcast-pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - trimedcast-network

  trimedcast:
    environment:
      - DATABASE_URL=postgresql://trimedcast:${DB_PASSWORD:-changeme}@postgres:5432/trimedcast
    depends_on:
      - postgres

volumes:
  trimedcast-pgdata:
```

And update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 5. Running in Development Mode

Development mode gives you **hot-reload** — changes to source code are reflected immediately without rebuilding.

```bash
# Start in development mode
docker compose -f docker-compose.dev.yml up --build
```

**Key differences from production mode:**

| Feature | Production | Development |
|---------|-----------|-------------|
| Hot-reload | ❌ | ✅ |
| Source mounted | ❌ | ✅ |
| Build optimization | ✅ | ❌ |
| Dev dependencies | ❌ | ✅ |
| Image size | ~150MB | ~800MB |
| Start time | ~5s | ~15s |

**Workflow:**
1. Edit files in your local `src/` directory
2. Changes are automatically reflected in the container
3. Fast Refresh updates the browser instantly
4. No need to rebuild the Docker image

---

## 6. Accessing the Application

### Main Application
- **URL**: http://localhost:3000
- **Default page**: Product Catalog & Inventory Intelligence Dashboard

### Available Dashboards (via code changes)
The application shows one dashboard at a time in `src/app/page.tsx`. All 15 modules are built and available:

| Module | Import Path | Description |
|--------|-----------|-------------|
| Product Catalog | `@/components/catalog/catalog-dashboard` | Current default (Session 28) |
| Procurement | `@/components/procurement/procurement-dashboard` | Supplier scorecards & RFQ |
| Finance | `@/components/finance/finance-dashboard` | Cost intelligence & FX risk |
| Warehouse | `@/components/warehouse/warehouse-dashboard` | Logistics & shipments |
| Admin | `@/components/admin/admin-dashboard` | Multi-tenant management |
| Sales Orders | `@/components/sales-orders/so-dashboard` | Order lifecycle |
| Import Wizard | `@/components/import-wizard/import-dashboard` | Data upload |
| Forecast Results | `@/components/forecast-results/forecast-dashboard` | Demand forecasting |
| Overview | `@/components/overview/overview-dashboard` | Control tower |

To switch dashboards, edit `src/app/page.tsx` and change the import.

---

## 7. Database Management

### Where is the Database?

The SQLite database is stored in a **Docker volume** named `trimedcast-db` (production) or `trimedcast-dev-db` (development).

### View Volume Location

```bash
# Find the volume on your host filesystem
docker volume inspect trimedcast_trimedcast-db
```

### Reset the Database

```bash
# Stop the container
docker compose down

# Remove the database volume
docker volume rm trimedcast_trimedcast-db

# Start fresh (will create a new empty database)
docker compose up -d
```

### Run Prisma Commands

```bash
# Push schema changes to database
docker compose exec trimedcast bunx prisma db push --accept-data-loss

# Generate Prisma client
docker compose exec trimedcast bunx prisma generate

# Open Prisma Studio (database GUI)
docker compose exec trimedcast bunx prisma studio
# Then open http://localhost:5555
```

### Backup the Database

```bash
# Copy database from container to local machine
docker compose exec trimedcat cp /app/db/trimedcast.db ./backup.db

# Or use docker cp
docker cp trimedcast-app:/app/db/trimedcast.db ./backup-$(date +%Y%m%d).db
```

### Restore from Backup

```bash
# Copy local backup into container
docker cp ./backup.db trimedcast-app:/app/db/trimedcast.db

# Restart the container
docker compose restart
```

---

## 8. Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker compose logs

# Common issues:
# 1. Port 3000 already in use → change the port mapping
# 2. Out of memory → increase Docker Desktop memory to 4GB+
# 3. Build fails → try a clean build: docker compose build --no-cache
```

### Build fails with "out of memory"

```bash
# Increase Node.js memory during build
DOCKER_BUILDKIT=1 docker compose build --build-arg NODE_OPTIONS="--max-old-space-size=4096"
```

### Page returns 500 error

```bash
# Check if the database exists
docker compose exec trimedcast ls -la /app/db/

# If empty, push the schema
docker compose exec trimedcast bunx prisma db push --accept-data-loss
```

### Container is "unhealthy"

```bash
# Check the health check details
docker inspect trimedcast-app --format='{{json .State.Health}}' | jq

# Manually test if the app responds
docker compose exec trimedcast curl -f http://localhost:3000/
```

### Clean everything and start fresh

```bash
# Stop containers
docker compose down

# Remove all volumes, images, and containers for this project
docker compose down -v --rmi all

# Rebuild from scratch
docker compose up --build -d
```

### View resource usage

```bash
# CPU and memory usage
docker stats trimedcast-app

# Disk usage
docker system df
```

---

## 9. Production Deployment Notes

### Security Checklist

- [ ] Generate a unique `NEXTAUTH_SECRET` with `openssl rand -base64 32`
- [ ] Change `NEXTAUTH_URL` to your actual domain
- [ ] Enable the Caddy reverse proxy for HTTPS (uncomment in docker-compose.yml)
- [ ] Switch to PostgreSQL for production database
- [ ] Set up regular database backups
- [ ] Configure firewall rules (only expose ports 80/443)
- [ ] Review and restrict CORS settings

### Performance Tuning

```yaml
# In docker-compose.yml, add resource limits
services:
  trimedcast:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Scaling (Multiple Instances)

```yaml
# Run multiple app instances behind a load balancer
services:
  trimedcast:
    deploy:
      replicas: 3
    # Remove fixed container_name when using replicas
```

### CI/CD Integration

```bash
# Build the image once in CI
docker build -t trimedcast:latest .

# Push to a registry
docker tag trimedcast:latest your-registry/trimedcast:latest
docker push your-registry/trimedcast:latest

# Pull and run on production server
docker pull your-registry/trimedcast:latest
docker compose up -d
```

---

## 10. Architecture Overview

### Docker Container Architecture

```
┌─────────────────────────────────────────────────┐
│                Your Local Machine                │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         Docker Engine                       │  │
│  │                                             │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │   trimedcast-app (Port 3000)         │  │  │
│  │  │                                      │  │  │
│  │  │   ┌────────────────────────────────┐ │  │  │
│  │  │   │   Next.js 16 (Standalone)     │ │  │  │
│  │  │   │   - App Router                │ │  │  │
│  │  │   │   - SSR + API Routes          │ │  │  │
│  │  │   │   - 258 UI Components         │ │  │  │
│  │  │   │   - 16 Zustand Stores         │ │  │  │
│  │  │   │   - 175 API Endpoints         │ │  │  │
│  │  │   └────────────────────────────────┘ │  │  │
│  │  │                                      │  │  │
│  │  │   ┌────────────────────────────────┐ │  │  │
│  │  │   │   Prisma ORM                  │ │  │  │
│  │  │   │   - SQLite Database            │ │  │  │
│  │  │   │   - /app/db/trimedcast.db      │ │  │  │
│  │  │   └────────────────────────────────┘ │  │  │
│  │  │                                      │  │  │
│  │  │   Runtime: Bun 1.3                   │  │  │
│  │  │   OS: Debian Slim                    │  │  │
│  │  │   User: nextjs (non-root)            │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                             │  │
│  │  Volumes:                                   │  │
│  │  - trimedcast-db → /app/db (persistent)    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Browser → http://localhost:3000                 │
└─────────────────────────────────────────────────┘
```

### Build Stages

```
Stage 1: deps      → Install production dependencies only
Stage 2: builder   → Build Next.js standalone output
Stage 3: runner    → Minimal runtime image (Bun slim + standalone build)
```

### File Structure (Docker-related)

```
TrimedCast/
├── Dockerfile              # Production build (multi-stage)
├── Dockerfile.dev          # Development build (hot-reload)
├── docker-compose.yml      # Production compose config
├── docker-compose.dev.yml  # Development compose config
├── .dockerignore           # Files excluded from build context
├── Caddyfile.prod          # Production reverse proxy config
└── DOCKER_SETUP.md         # This guide
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker compose up --build -d` | Build and start (production) |
| `docker compose up -d` | Start without rebuild |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop and remove containers + volumes |
| `docker compose logs -f` | Follow logs |
| `docker compose ps` | Check status |
| `docker compose restart` | Restart |
| `docker compose exec trimedcast sh` | Shell into container |
| `docker compose build --no-cache` | Clean rebuild |
| `docker compose -f docker-compose.dev.yml up --build` | Development mode |

---

*TrimedCast — ডকারে চালান, ব্যবসা বুদ্ধিমত্তা পান*
*(Run in Docker, Gain Business Intelligence)*
